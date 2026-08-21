/**
 * Welcome email — sent once, server-side, immediately after first loyalty join.
 * "You're in — here's how it works at {store}"
 *
 * Consent-gated, deduped by UNIQUE index on (contact_id, brand_id) for welcome flow,
 * logged to autopilot_emails, same template shell + HMAC unsub as reward email.
 */

import { getSupabase, sendAutopilotEmail, logAutopilotEmail } from './lib/autopilot-email.js'

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  const supabase = getSupabase()
  if (!supabase) return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers })

  try {
    const { contact_id, brand_id } = await req.json()
    if (!contact_id || !brand_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers })
    }

    // Load contact, brand, rewards, and balance in parallel
    const [contactRes, brandRes, rewardsRes, balRes] = await Promise.all([
      supabase.from('contacts').select('id, email, first_name, sms_consent').eq('id', contact_id).eq('brand_id', brand_id).single(),
      supabase.from('brands').select('id, name, logo_url, logo_dark_url, accent_hex, business_type').eq('id', brand_id).single(),
      supabase.from('loyalty_rewards').select('name, points_required, reward_value').eq('brand_id', brand_id).eq('active', true).order('points_required'),
      supabase.rpc('get_loyalty_balance', { p_contact_id: contact_id, p_brand_id: brand_id }),
    ])

    const contact = contactRes.data
    const brand = brandRes.data
    const rewards = rewardsRes.data || []
    const balance = balRes.data?.balance ?? 0

    // Fetch autopilot toggle + custom messages separately — columns may not exist yet (pre-migration)
    if (brand) {
      try {
        const { data: toggleData } = await supabase.from('brands').select('autopilot_welcome, autopilot_welcome_subject, autopilot_welcome_message').eq('id', brand_id).single()
        if (toggleData) {
          brand.autopilot_welcome = toggleData.autopilot_welcome
          brand.autopilot_welcome_subject = toggleData.autopilot_welcome_subject
          brand.autopilot_welcome_message = toggleData.autopilot_welcome_message
        }
      } catch (_) { /* columns don't exist yet — use defaults */ }
    }

    if (!contact?.email) {
      await logAutopilotEmail(supabase, { contact_id, brand_id, flow: 'welcome', outcome: 'error', error_detail: 'no_email' })
      return new Response(JSON.stringify({ skipped: true, reason: 'no_email' }), { status: 200, headers })
    }

    if (!brand) {
      await logAutopilotEmail(supabase, { contact_id, brand_id, flow: 'welcome', outcome: 'error', error_detail: 'brand_not_found' })
      return new Response(JSON.stringify({ error: 'Brand not found' }), { status: 200, headers })
    }

    // Build welcome email body
    const firstName = contact.first_name || 'there'
    const accentColor = brand.accent_hex || '#22c55e'
    const scanUrl = `https://meetcaptura.com/store/${brand_id}`
    const topReward = rewards.length > 0 ? rewards[0].name : ''

    // Placeholder replacement helper
    const fill = (tpl) => tpl
      .replace(/\{name\}/gi, firstName)
      .replace(/\{store\}/gi, brand.name)
      .replace(/\{points\}/gi, String(balance))
      .replace(/\{reward\}/gi, topReward)

    // Custom or default subject/message
    const subject = fill(brand.autopilot_welcome_subject || `You're in! Here's how loyalty works at {store}`)
    const customMessage = brand.autopilot_welcome_message ? fill(brand.autopilot_welcome_message) : null

    // Rewards list HTML
    let rewardsHtml = ''
    if (rewards.length > 0) {
      const rewardRows = rewards.map(r =>
        `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid #f4f4f5;">
          <span style="font-weight:600;color:#18181b;font-size:14px;">${r.name}</span>
          <span style="color:#71717a;font-size:13px;white-space:nowrap;">${r.points_required} pts</span>
        </div>`
      ).join('')

      rewardsHtml = `
      <div style="margin:20px 0;text-align:left;">
        <div style="font-size:13px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Rewards you can earn</div>
        <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;">
          ${rewardRows}
        </div>
      </div>`
    }

    const bodyHtml = customMessage
      ? `
    <div style="font-size:32px;margin-bottom:8px;">&#9989;</div>
    <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">${subject}</h1>
    <p style="margin:0 0 20px;font-size:16px;color:#52525b;">${customMessage}</p>
    <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:10px;padding:16px;margin:0 0 4px;">
      <div style="font-size:13px;color:#71717a;margin-bottom:4px;">Your starting balance</div>
      <div style="font-size:28px;font-weight:800;color:#D4A017;">${balance} point${balance === 1 ? '' : 's'}</div>
    </div>
    ${rewardsHtml}
    <a href="${scanUrl}" style="display:inline-block;margin-top:20px;padding:14px 32px;background:${accentColor};color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:10px;">Visit ${brand.name}</a>`
      : `
    <div style="font-size:32px;margin-bottom:8px;">&#9989;</div>
    <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">You're in, ${firstName}!</h1>
    <p style="margin:0 0 6px;font-size:16px;color:#52525b;">Here's how loyalty works at ${brand.name}:</p>
    <p style="margin:0 0 20px;font-size:14px;color:#71717a;">Earn 1 point every time you visit and scan our QR code. Collect enough points and redeem them for rewards.</p>
    <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:10px;padding:16px;margin:0 0 4px;">
      <div style="font-size:13px;color:#71717a;margin-bottom:4px;">Your starting balance</div>
      <div style="font-size:28px;font-weight:800;color:#D4A017;">${balance} point${balance === 1 ? '' : 's'}</div>
    </div>
    ${rewardsHtml}
    <a href="${scanUrl}" style="display:inline-block;margin-top:20px;padding:14px 32px;background:${accentColor};color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:10px;">Visit ${brand.name}</a>`

    // Dedup: UNIQUE index enforces one welcome per (contact, brand),
    // but we also check explicitly to log the skip properly
    const dedupCheck = async () => {
      const { data: existing } = await supabase
        .from('autopilot_emails')
        .select('id')
        .eq('contact_id', contact_id)
        .eq('brand_id', brand_id)
        .eq('flow', 'welcome')
        .eq('outcome', 'sent')
        .limit(1)

      if (existing?.length > 0) return { isDupe: true, reason: 'welcome_already_sent' }
      return { isDupe: false }
    }

    const result = await sendAutopilotEmail(supabase, {
      flow: 'welcome',
      contact,
      brand,
      subject,
      bodyHtml,
      dedupCheck,
      extra: { balance_at_send: balance },
    })

    if (result.sent) return new Response(JSON.stringify({ sent: true }), { status: 200, headers })
    if (result.skipped) return new Response(JSON.stringify({ skipped: true, reason: result.skipped }), { status: 200, headers })
    return new Response(JSON.stringify({ error: result.error || 'Unknown error' }), { status: 200, headers })

  } catch (err) {
    try {
      const sb = getSupabase()
      if (sb) await sb.from('error_log').insert({ source: 'send_welcome_email', message: err.message || String(err), metadata: {} }).catch(() => {})
    } catch (_) {}
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 200, headers })
  }
}
