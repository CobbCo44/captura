/**
 * Shared autopilot email helper.
 * One send function used by reward-ready, welcome, and winback flows.
 * Handles: consent gate, dedup check, Resend send, HMAC unsubscribe, unified logging.
 */

import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'node:crypto'

// --- Supabase ---
export function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// --- HMAC helpers ---
export function signUnsubParams(cid, bid, secret) {
  return createHmac('sha256', secret).update(`${cid}:${bid}`).digest('hex')
}

export function verifyUnsubParams(cid, bid, token, secret) {
  const expected = createHmac('sha256', secret).update(`${cid}:${bid}`).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'))
  } catch { return false }
}

/**
 * Log every autopilot email decision to the unified table.
 */
export async function logAutopilotEmail(supabase, { contact_id, brand_id, flow, outcome, error_detail, reward_id, balance_at_send }) {
  try {
    const { error } = await supabase.from('autopilot_emails').insert({
      contact_id,
      brand_id,
      flow,
      outcome,
      error_detail: error_detail || null,
      reward_id: reward_id || null,
      balance_at_send: balance_at_send ?? null,
    })
    // If autopilot_emails table doesn't exist yet, fall back to reward_emails_sent for reward flows
    if (error && flow === 'reward_ready' && reward_id) {
      await supabase.from('reward_emails_sent').insert({
        contact_id, brand_id, reward_id,
        balance_at_send: balance_at_send || 0,
        consent_checked: true,
        consent_had: outcome === 'sent' || outcome === 'skipped_dedup',
        error: outcome === 'sent' ? null : (error_detail || outcome),
      }).catch(() => {})
    }
  } catch (e) { /* best-effort */ }
}

/**
 * Build the branded email HTML shell.
 * All flows share the same outer structure: logo, accent color, footer with unsub link.
 */
export function buildEmailHtml({ brand, subject, bodyHtml, unsubUrl }) {
  const logoUrl = brand.logo_dark_url || brand.logo_url
  const accentColor = brand.accent_hex || '#22c55e'

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;">
  ${logoUrl ? `<tr><td style="padding:24px 24px 0;text-align:center;"><img src="${logoUrl}" alt="${brand.name}" style="max-height:48px;max-width:200px;"></td></tr>` : ''}
  <tr><td style="padding:24px;text-align:center;">
    ${bodyHtml}
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
}

/**
 * Send an email via Resend. Returns { sent: true } or { error: string }.
 */
export async function sendViaResend({ resendKey, from, to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    return { error: `resend_${res.status}: ${errBody}` }
  }
  return { sent: true }
}

/**
 * Full autopilot send pipeline: consent check, dedup, send, log.
 *
 * @param {object} supabase - service-role Supabase client
 * @param {object} opts
 * @param {string} opts.flow - 'reward_ready' | 'welcome' | 'winback'
 * @param {object} opts.contact - { id, email, first_name, sms_consent }
 * @param {object} opts.brand - { id, name, logo_url, logo_dark_url, accent_hex, business_type, autopilot_* }
 * @param {string} opts.subject - email subject
 * @param {string} opts.bodyHtml - inner HTML body content
 * @param {function} opts.dedupCheck - async () => { isDupe: boolean, reason?: string }
 * @param {object} [opts.extra] - extra fields for log (reward_id, balance_at_send)
 * @returns {{ sent: boolean, skipped?: string, error?: string }}
 */
export async function sendAutopilotEmail(supabase, opts) {
  const { flow, contact, brand, subject, bodyHtml, dedupCheck, extra = {} } = opts
  const resendKey = process.env.RESEND_API_KEY
  const hmacSecret = process.env.UNSUB_HMAC_SECRET

  const logBase = {
    contact_id: contact.id,
    brand_id: brand.id,
    flow,
    reward_id: extra.reward_id,
    balance_at_send: extra.balance_at_send,
  }

  // 1. Check flow toggle
  const toggleKey = `autopilot_${flow}`
  if (brand[toggleKey] === false) {
    await logAutopilotEmail(supabase, { ...logBase, outcome: 'skipped_disabled', error_detail: `${flow} disabled for brand` })
    return { skipped: 'flow_disabled' }
  }

  // 2. Consent gate
  if (!contact.sms_consent) {
    await logAutopilotEmail(supabase, { ...logBase, outcome: 'skipped_no_consent' })
    return { skipped: 'no_consent' }
  }

  // 3. Dedup
  if (dedupCheck) {
    const { isDupe, reason } = await dedupCheck()
    if (isDupe) {
      await logAutopilotEmail(supabase, { ...logBase, outcome: 'skipped_dedup', error_detail: reason || 'duplicate' })
      return { skipped: reason || 'already_sent' }
    }
  }

  // 4. Build email
  if (!resendKey) {
    await logAutopilotEmail(supabase, { ...logBase, outcome: 'error', error_detail: 'no_resend_key' })
    return { error: 'no_resend_key' }
  }

  const unsubToken = hmacSecret ? signUnsubParams(contact.id, brand.id, hmacSecret) : ''
  const unsubUrl = `https://meetcaptura.com/.netlify/functions/send-reward-email?action=unsubscribe&cid=${contact.id}&bid=${brand.id}&tok=${unsubToken}`

  const html = buildEmailHtml({ brand, subject, bodyHtml, unsubUrl })

  // 5. Send
  const result = await sendViaResend({
    resendKey,
    from: `${brand.name} via MeetCaptura <rewards@meetcaptura.com>`,
    to: contact.email,
    subject,
    html,
  })

  if (result.error) {
    await logAutopilotEmail(supabase, { ...logBase, outcome: 'error', error_detail: result.error })
    return { error: result.error }
  }

  // 6. Log success
  await logAutopilotEmail(supabase, { ...logBase, outcome: 'sent' })
  return { sent: true }
}
