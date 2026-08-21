/**
 * Send reward-earned email when a member crosses a loyalty threshold.
 * Now uses shared autopilot-email helper for sending + logging.
 * Unsubscribe flow remains here (shared across all email types).
 *
 * Env vars required: RESEND_API_KEY, UNSUB_HMAC_SECRET
 */

import { getSupabase, verifyUnsubParams, sendAutopilotEmail, logAutopilotEmail } from './lib/autopilot-email.js'

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

  try {
    const { contact_id, brand_id, reward_id } = await req.json()
    if (!contact_id || !brand_id || !reward_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers })
    }

    // 1. SERVER-SIDE THRESHOLD VERIFICATION
    const [balRes, rewardRes, contactRes, brandRes] = await Promise.all([
      supabase.rpc('get_loyalty_balance', { p_contact_id: contact_id, p_brand_id: brand_id }),
      supabase.from('loyalty_rewards').select('id, name, points_required, reward_value').eq('id', reward_id).eq('active', true).single(),
      supabase.from('contacts').select('id, email, first_name, sms_consent').eq('id', contact_id).eq('brand_id', brand_id).single(),
      supabase.from('brands').select('id, name, logo_url, logo_dark_url, accent_hex, business_type').eq('id', brand_id).single(),
    ])

    const serverBalance = balRes.data?.balance ?? 0
    const reward = rewardRes.data
    const contact = contactRes.data
    const brand = brandRes.data

    if (!reward) {
      await logAutopilotEmail(supabase, { contact_id, brand_id, flow: 'reward_ready', outcome: 'error', error_detail: 'reward_not_found', reward_id, balance_at_send: serverBalance })
      return new Response(JSON.stringify({ skipped: true, reason: 'reward_not_found' }), { status: 200, headers })
    }

    if (serverBalance < reward.points_required) {
      await logAutopilotEmail(supabase, { contact_id, brand_id, flow: 'reward_ready', outcome: 'error', error_detail: `balance_below_threshold:${serverBalance}<${reward.points_required}`, reward_id, balance_at_send: serverBalance })
      return new Response(JSON.stringify({ skipped: true, reason: 'below_threshold' }), { status: 200, headers })
    }

    if (!contact?.email) {
      await logAutopilotEmail(supabase, { contact_id, brand_id, flow: 'reward_ready', outcome: 'error', error_detail: 'no_email', reward_id, balance_at_send: serverBalance })
      return new Response(JSON.stringify({ skipped: true, reason: 'no_email' }), { status: 200, headers })
    }

    if (!brand) {
      await logAutopilotEmail(supabase, { contact_id, brand_id, flow: 'reward_ready', outcome: 'error', error_detail: 'brand_not_found', reward_id, balance_at_send: serverBalance })
      return new Response(JSON.stringify({ error: 'Brand not found' }), { status: 200, headers })
    }

    // Fetch autopilot toggle + custom messages separately — columns may not exist yet (pre-migration)
    try {
      const { data: toggleData } = await supabase.from('brands').select('autopilot_reward_ready, autopilot_reward_subject, autopilot_reward_message').eq('id', brand_id).single()
      if (toggleData) {
        brand.autopilot_reward_ready = toggleData.autopilot_reward_ready
        brand.autopilot_reward_subject = toggleData.autopilot_reward_subject
        brand.autopilot_reward_message = toggleData.autopilot_reward_message
      }
    } catch (_) { /* columns don't exist yet — use defaults */ }

    // 2. Build reward email body
    const accentColor = brand.accent_hex || '#22c55e'
    const scanUrl = `https://meetcaptura.com/store/${brand_id}`
    const firstName = contact.first_name || 'there'

    // Placeholder replacement
    const fill = (tpl) => tpl
      .replace(/\{name\}/gi, firstName)
      .replace(/\{store\}/gi, brand.name)
      .replace(/\{points\}/gi, String(serverBalance))
      .replace(/\{reward\}/gi, reward.name)

    const rewardSubject = fill(brand.autopilot_reward_subject || `You earned {reward}!`)
    const customMessage = brand.autopilot_reward_message ? fill(brand.autopilot_reward_message) : null

    const bodyHtml = customMessage
      ? `
    <div style="font-size:32px;margin-bottom:8px;">&#127881;</div>
    <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">${rewardSubject}</h1>
    <p style="margin:0 0 20px;font-size:16px;color:#52525b;">${customMessage}</p>
    <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:10px;padding:16px;margin:0 0 20px;">
      <div style="font-size:20px;font-weight:700;color:#18181b;margin-bottom:4px;">${reward.name}</div>
      <div style="font-size:14px;color:#71717a;">${reward.points_required} points${reward.reward_value ? ` \u00B7 ${reward.reward_value}` : ''}</div>
    </div>
    <p style="margin:0 0 4px;font-size:14px;color:#71717a;">Your balance: <strong style="color:#18181b;">${serverBalance} points</strong></p>
    <a href="${scanUrl}" style="display:inline-block;margin-top:20px;padding:14px 32px;background:${accentColor};color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:10px;">Redeem Your Reward</a>`
      : `
    <div style="font-size:32px;margin-bottom:8px;">&#127881;</div>
    <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">Hey ${firstName}, you earned a reward!</h1>
    <p style="margin:0 0 20px;font-size:16px;color:#52525b;">You have enough points to redeem:</p>
    <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:10px;padding:16px;margin:0 0 20px;">
      <div style="font-size:20px;font-weight:700;color:#18181b;margin-bottom:4px;">${reward.name}</div>
      <div style="font-size:14px;color:#71717a;">${reward.points_required} points${reward.reward_value ? ` \u00B7 ${reward.reward_value}` : ''}</div>
    </div>
    <p style="margin:0 0 4px;font-size:14px;color:#71717a;">Your balance: <strong style="color:#18181b;">${serverBalance} points</strong></p>
    <a href="${scanUrl}" style="display:inline-block;margin-top:20px;padding:14px 32px;background:${accentColor};color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:10px;">Redeem Your Reward</a>`

    // 3. Dedup: one email per (contact, brand, reward) unless they redeemed since last send
    const dedupCheck = async () => {
      const { data: existing } = await supabase
        .from('autopilot_emails')
        .select('created_at')
        .eq('contact_id', contact_id)
        .eq('brand_id', brand_id)
        .eq('reward_id', reward_id)
        .eq('flow', 'reward_ready')
        .eq('outcome', 'sent')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!existing?.length) return { isDupe: false }

      // Check if they redeemed since last send
      const { count: redemptionsSince } = await supabase
        .from('loyalty_points')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', contact_id)
        .eq('brand_id', brand_id)
        .eq('reward_id', reward_id)
        .eq('type', 'redeemed')
        .gte('created_at', existing[0].created_at)

      if (!redemptionsSince || redemptionsSince === 0) {
        return { isDupe: true, reason: 'already_sent_for_this_crossing' }
      }
      return { isDupe: false }
    }

    // 4. Send via shared pipeline
    const result = await sendAutopilotEmail(supabase, {
      flow: 'reward_ready',
      contact,
      brand,
      subject: rewardSubject,
      bodyHtml,
      dedupCheck,
      extra: { reward_id, balance_at_send: serverBalance },
    })

    if (result.sent) return new Response(JSON.stringify({ sent: true }), { status: 200, headers })
    if (result.skipped) return new Response(JSON.stringify({ skipped: true, reason: result.skipped }), { status: 200, headers })
    return new Response(JSON.stringify({ error: result.error || 'Unknown error' }), { status: 200, headers })

  } catch (err) {
    try {
      const sb = getSupabase()
      if (sb) await sb.from('error_log').insert({ source: 'send_reward_email', message: err.message || String(err), metadata: {} }).catch(() => {})
    } catch (_) {}
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 200, headers })
  }
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

  const actionUrl = `/.netlify/functions/send-reward-email?action=unsubscribe`
  return new Response(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Unsubscribe</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;padding:60px 20px;background:#f4f4f5;">
  <div style="max-width:400px;margin:0 auto;background:#fff;border-radius:12px;padding:32px 24px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Unsubscribe from emails?</h2>
    <p style="color:#71717a;font-size:14px;margin:0 0 24px;">You will no longer receive automated emails from this brand. Your loyalty points will not be affected.</p>
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

  await supabase.from('consent_changes').insert({
    contact_id: cid,
    brand_id: bid,
    field_changed: 'sms_consent',
    old_value: 'true',
    new_value: 'false',
    change_source: 'email_unsubscribe_link',
    changed_at: new Date().toISOString(),
  }).catch(() => {})

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
    <p style="color:#71717a;font-size:14px;margin:0;">You won't receive any more automated emails from this brand. Your loyalty points are still saved.</p>
  </div>
</body></html>`, { status: 200, headers: htmlHeaders })
}
