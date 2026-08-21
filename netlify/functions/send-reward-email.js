/**
 * Send reward-earned email when a member crosses a loyalty threshold.
 *
 * Uses Resend (resend.com) — chosen over Postmark because:
 *   - Single-dependency, fetch-based API (no npm install needed on Netlify)
 *   - Free tier covers early volume, simple domain verification
 *   - Clean JSON API, no SMTP config
 *
 * CONSENT GATE: sends ONLY when sms_consent = true on the contact record.
 * Every call is logged to reward_emails_sent with consent check outcome.
 *
 * Deduplication: one email per (contact, brand, reward) crossing.
 * Redeeming and re-crossing later can send again.
 *
 * Unsubscribe: HMAC-signed link opens a confirmation page (GET).
 * Consent flips only on the confirm button (POST). Original sms_consent_text
 * is never overwritten — opt-out is recorded as a separate audit row in
 * consent_changes, and sms_consent is set to false without touching
 * sms_consent_text or sms_consent_at.
 *
 * Env vars required: RESEND_API_KEY, UNSUB_HMAC_SECRET
 */

import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'node:crypto'

// --- HMAC helpers ---
function signUnsubParams(cid, bid, secret) {
  return createHmac('sha256', secret).update(`${cid}:${bid}`).digest('hex')
}

function verifyUnsubParams(cid, bid, token, secret) {
  const expected = createHmac('sha256', secret).update(`${cid}:${bid}`).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'))
  } catch { return false }
}

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export default async (req) => {
  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  // --- UNSUBSCRIBE: GET shows confirmation page, POST executes ---
  if (action === 'unsubscribe') {
    if (req.method === 'GET') return showUnsubConfirmPage(url.searchParams)
    if (req.method === 'POST') return executeUnsub(req)
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,GET', 'Access-Control-Allow-Headers': 'Content-Type' } })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // --- SEND REWARD EMAIL ---
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  const supabase = getSupabase()
  if (!supabase) return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers })

  const resendKey = process.env.RESEND_API_KEY
  const hmacSecret = process.env.UNSUB_HMAC_SECRET

  try {
    const { contact_id, brand_id, reward_id, balance } = await req.json()
    if (!contact_id || !brand_id || !reward_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers })
    }

    // 1. SERVER-SIDE THRESHOLD VERIFICATION
    //    Don't trust the client's claim — recompute balance from the ledger
    //    and confirm this reward's threshold was actually crossed.
    const [balRes, rewardRes] = await Promise.all([
      supabase.rpc('get_loyalty_balance', { p_contact_id: contact_id, p_brand_id: brand_id }),
      supabase.from('loyalty_rewards').select('id, name, points_required, reward_value').eq('id', reward_id).eq('active', true).single(),
    ])
    const serverBalance = balRes.data?.balance ?? 0
    const reward = rewardRes.data

    if (!reward) {
      await logSendAttempt(supabase, { contact_id, brand_id, reward_id, balance: serverBalance, consent_checked: false, consent_had: false, error: 'reward_not_found' })
      return new Response(JSON.stringify({ skipped: true, reason: 'reward_not_found' }), { status: 200, headers })
    }

    if (serverBalance < reward.points_required) {
      await logSendAttempt(supabase, { contact_id, brand_id, reward_id, balance: serverBalance, consent_checked: false, consent_had: false, error: `balance_below_threshold:${serverBalance}<${reward.points_required}` })
      return new Response(JSON.stringify({ skipped: true, reason: 'below_threshold' }), { status: 200, headers })
    }

    // 2. Dedup check: already sent for this crossing?
    const { data: existing } = await supabase
      .from('reward_emails_sent')
      .select('id')
      .eq('contact_id', contact_id)
      .eq('brand_id', brand_id)
      .eq('reward_id', reward_id)
      .is('error', null)
      .limit(1)

    if (existing?.length > 0) {
      const { data: lastSend } = await supabase
        .from('reward_emails_sent')
        .select('sent_at')
        .eq('contact_id', contact_id)
        .eq('brand_id', brand_id)
        .eq('reward_id', reward_id)
        .is('error', null)
        .order('sent_at', { ascending: false })
        .limit(1)

      if (lastSend?.length > 0) {
        const { count: redemptionsSince } = await supabase
          .from('loyalty_points')
          .select('*', { count: 'exact', head: true })
          .eq('contact_id', contact_id)
          .eq('brand_id', brand_id)
          .eq('reward_id', reward_id)
          .eq('type', 'redeemed')
          .gte('created_at', lastSend[0].sent_at)

        if (!redemptionsSince || redemptionsSince === 0) {
          return new Response(JSON.stringify({ skipped: true, reason: 'already_sent' }), { status: 200, headers })
        }
      }
    }

    // 3. Get contact details + consent check
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, email, first_name, sms_consent')
      .eq('id', contact_id)
      .eq('brand_id', brand_id)
      .single()

    if (!contact?.email) {
      await logSendAttempt(supabase, { contact_id, brand_id, reward_id, balance: serverBalance, consent_checked: true, consent_had: false, error: 'no_email' })
      return new Response(JSON.stringify({ skipped: true, reason: 'no_email' }), { status: 200, headers })
    }

    // CONSENT GATE — non-negotiable
    if (!contact.sms_consent) {
      await logSendAttempt(supabase, { contact_id, brand_id, reward_id, balance: serverBalance, consent_checked: true, consent_had: false, error: null })
      return new Response(JSON.stringify({ skipped: true, reason: 'no_consent' }), { status: 200, headers })
    }

    // 4. Get brand details
    const { data: brand, error: brandErr } = await supabase
      .from('brands')
      .select('id, name, logo_url, logo_dark_url, accent_hex, slug, business_type')
      .eq('id', brand_id)
      .single()

    if (!brand) {
      await logSendAttempt(supabase, { contact_id, brand_id, reward_id, balance: serverBalance, consent_checked: true, consent_had: true, error: `brand_not_found:${brandErr?.message || 'no_data'}` })
      return new Response(JSON.stringify({ error: 'Brand not found' }), { status: 200, headers })
    }

    // 5. Build URLs
    const scanUrl = brand.business_type === 'storefront'
      ? `https://meetcaptura.com/s/${brand_id}`
      : `https://meetcaptura.com/s/${brand.slug || brand_id}`

    const unsubToken = hmacSecret ? signUnsubParams(contact_id, brand_id, hmacSecret) : ''
    const unsubUrl = `https://meetcaptura.com/.netlify/functions/send-reward-email?action=unsubscribe&cid=${contact_id}&bid=${brand_id}&tok=${unsubToken}`

    // 6. Send via Resend (or log gracefully if no key)
    if (!resendKey) {
      await logSendAttempt(supabase, { contact_id, brand_id, reward_id, balance: serverBalance, consent_checked: true, consent_had: true, error: 'no_resend_key' })
      return new Response(JSON.stringify({ skipped: true, reason: 'no_resend_key' }), { status: 200, headers })
    }

    const logoUrl = brand.logo_dark_url || brand.logo_url
    const accentColor = brand.accent_hex || '#22c55e'
    const firstName = contact.first_name || 'there'

    const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;">
  ${logoUrl ? `<tr><td style="padding:24px 24px 0;text-align:center;"><img src="${logoUrl}" alt="${brand.name}" style="max-height:48px;max-width:200px;"></td></tr>` : ''}
  <tr><td style="padding:24px;text-align:center;">
    <div style="font-size:32px;margin-bottom:8px;">&#127881;</div>
    <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">Hey ${firstName}, you earned a reward!</h1>
    <p style="margin:0 0 20px;font-size:16px;color:#52525b;">You have enough points to redeem:</p>
    <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:10px;padding:16px;margin:0 0 20px;">
      <div style="font-size:20px;font-weight:700;color:#18181b;margin-bottom:4px;">${reward.name}</div>
      <div style="font-size:14px;color:#71717a;">${reward.points_required} points${reward.reward_value ? ` \u00B7 ${reward.reward_value}` : ''}</div>
    </div>
    <p style="margin:0 0 4px;font-size:14px;color:#71717a;">Your balance: <strong style="color:${accentColor};">${serverBalance} points</strong></p>
    <a href="${scanUrl}" style="display:inline-block;margin-top:20px;padding:14px 32px;background:${accentColor};color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:10px;">Redeem Your Reward</a>
  </td></tr>
  <tr><td style="padding:16px 24px 24px;text-align:center;border-top:1px solid #f4f4f5;">
    <p style="margin:0;font-size:11px;color:#a1a1aa;">
      You're receiving this because you opted in to marketing communications from ${brand.name} via MeetCaptura.<br>
      <a href="${unsubUrl}" style="color:#a1a1aa;text-decoration:underline;">Unsubscribe</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${brand.name} via MeetCaptura <rewards@meetcaptura.com>`,
        to: [contact.email],
        subject: `You earned ${reward.name}!`,
        html: emailHtml,
      }),
    })

    if (!resendRes.ok) {
      const errBody = await resendRes.text()
      await logSendAttempt(supabase, { contact_id, brand_id, reward_id, balance: serverBalance, consent_checked: true, consent_had: true, error: `resend_${resendRes.status}: ${errBody}` })
      return new Response(JSON.stringify({ error: 'Email send failed' }), { status: 200, headers })
    }

    // 7. Log successful send
    await logSendAttempt(supabase, { contact_id, brand_id, reward_id, balance: serverBalance, consent_checked: true, consent_had: true, error: null })

    return new Response(JSON.stringify({ sent: true }), { status: 200, headers })

  } catch (err) {
    try {
      const sb = getSupabase()
      if (sb) await sb.from('error_log').insert({ source: 'send_reward_email', message: err.message || String(err), metadata: {} }).catch(() => {})
    } catch (_) {}
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 200, headers })
  }
}

// --- Helpers ---

async function logSendAttempt(supabase, { contact_id, brand_id, reward_id, balance, consent_checked, consent_had, error }) {
  try {
    await supabase.from('reward_emails_sent').insert({
      contact_id, brand_id, reward_id,
      balance_at_send: balance || 0,
      consent_checked, consent_had, error,
    })
  } catch (e) { /* best-effort */ }
}

// --- Unsubscribe: GET shows confirmation page ---
function showUnsubConfirmPage(params) {
  const cid = params.get('cid')
  const bid = params.get('bid')
  const tok = params.get('tok')
  const hmacSecret = process.env.UNSUB_HMAC_SECRET
  const htmlHeaders = { 'Content-Type': 'text/html; charset=utf-8' }

  if (!cid || !bid || !tok || !hmacSecret) {
    return new Response('<html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;"><h2>Invalid unsubscribe link.</h2></body></html>', { status: 400, headers: htmlHeaders })
  }

  if (!verifyUnsubParams(cid, bid, tok, hmacSecret)) {
    return new Response('<html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;"><h2>Invalid or expired unsubscribe link.</h2></body></html>', { status: 403, headers: htmlHeaders })
  }

  // Show confirmation page with a form that POSTs
  const actionUrl = `/.netlify/functions/send-reward-email?action=unsubscribe`
  return new Response(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Unsubscribe</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;padding:60px 20px;background:#f4f4f5;">
  <div style="max-width:400px;margin:0 auto;background:#fff;border-radius:12px;padding:32px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Unsubscribe from reward emails?</h2>
    <p style="color:#71717a;font-size:14px;margin:0 0 24px;">You will no longer receive emails when you earn a reward. Your loyalty points will not be affected.</p>
    <form method="POST" action="${actionUrl}">
      <input type="hidden" name="cid" value="${cid}">
      <input type="hidden" name="bid" value="${bid}">
      <input type="hidden" name="tok" value="${tok}">
      <button type="submit" style="padding:12px 32px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-weight:600;font-size:16px;cursor:pointer;">
        Yes, unsubscribe me
      </button>
    </form>
    <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;">Changed your mind? Just close this page.</p>
  </div>
</body></html>`, { status: 200, headers: htmlHeaders })
}

// --- Unsubscribe: POST executes the opt-out ---
async function executeUnsub(req) {
  const htmlHeaders = { 'Content-Type': 'text/html; charset=utf-8' }
  const hmacSecret = process.env.UNSUB_HMAC_SECRET

  let cid, bid, tok
  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const body = await req.text()
    const params = new URLSearchParams(body)
    cid = params.get('cid')
    bid = params.get('bid')
    tok = params.get('tok')
  } else {
    try {
      const json = await req.json()
      cid = json.cid; bid = json.bid; tok = json.tok
    } catch { /* fall through to validation */ }
  }

  if (!cid || !bid || !tok || !hmacSecret) {
    return new Response('<html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;"><h2>Invalid request.</h2></body></html>', { status: 400, headers: htmlHeaders })
  }

  if (!verifyUnsubParams(cid, bid, tok, hmacSecret)) {
    return new Response('<html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;"><h2>Invalid or expired unsubscribe link.</h2></body></html>', { status: 403, headers: htmlHeaders })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return new Response('<html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;"><h2>Server error.</h2></body></html>', { status: 500, headers: htmlHeaders })
  }

  // Record opt-out in consent_changes audit table (preserves original consent evidence)
  await supabase.from('consent_changes').insert({
    contact_id: cid,
    brand_id: bid,
    field_changed: 'sms_consent',
    old_value: 'true',
    new_value: 'false',
    change_source: 'email_unsubscribe_link',
    changed_at: new Date().toISOString(),
  }).catch(() => {})

  // Flip sms_consent to false — do NOT touch sms_consent_text or sms_consent_at
  const { error } = await supabase
    .from('contacts')
    .update({ sms_consent: false })
    .eq('id', cid)
    .eq('brand_id', bid)

  if (error) {
    return new Response('<html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;"><h2>Something went wrong. Please try again.</h2></body></html>', { status: 500, headers: htmlHeaders })
  }

  return new Response(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Unsubscribed</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;padding:60px 20px;background:#f4f4f5;">
  <div style="max-width:400px;margin:0 auto;background:#fff;border-radius:12px;padding:32px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="font-size:32px;margin-bottom:12px;">&#9989;</div>
    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">You've been unsubscribed.</h2>
    <p style="color:#71717a;font-size:14px;margin:0;">You won't receive any more reward emails from this brand. Your loyalty points are still saved.</p>
  </div>
</body></html>`, { status: 200, headers: htmlHeaders })
}
