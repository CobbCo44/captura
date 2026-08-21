/**
 * Broadcast email — one-off blast to all consented loyalty members for a brand.
 * POST with { brand_id, subject, message }
 * Same template shell, consent gate, HMAC unsub as all autopilot emails.
 * Logged to autopilot_emails with flow='broadcast'.
 */

import { getSupabase, sendAutopilotEmail, logAutopilotEmail } from './lib/autopilot-email.js'

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  const supabase = getSupabase()
  if (!supabase) return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers })

  try {
    const { brand_id, subject, message } = await req.json()
    if (!brand_id || !subject || !message) {
      return new Response(JSON.stringify({ error: 'Missing brand_id, subject, or message' }), { status: 400, headers })
    }

    // Verify the brand exists and is a storefront
    const { data: brand } = await supabase
      .from('brands')
      .select('id, name, logo_url, logo_dark_url, accent_hex, business_type')
      .eq('id', brand_id)
      .single()

    if (!brand) return new Response(JSON.stringify({ error: 'Brand not found' }), { status: 200, headers })

    // Get all loyalty members with consent
    // A loyalty member = a contact who has at least one loyalty_points entry
    const { data: points } = await supabase
      .from('loyalty_points')
      .select('contact_id')
      .eq('brand_id', brand_id)

    if (!points?.length) {
      return new Response(JSON.stringify({ sent: 0, skipped: 0, error_count: 0, detail: 'no_loyalty_members' }), { status: 200, headers })
    }

    const uniqueContactIds = [...new Set(points.map(p => p.contact_id))]

    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, email, first_name, sms_consent')
      .eq('brand_id', brand_id)
      .in('id', uniqueContactIds)

    if (!contacts?.length) {
      return new Response(JSON.stringify({ sent: 0, skipped: 0, error_count: 0, detail: 'no_contacts_found' }), { status: 200, headers })
    }

    const accentColor = brand.accent_hex || '#22c55e'
    const scanUrl = `https://meetcaptura.com/store/${brand_id}`
    let sent = 0, skipped = 0, errorCount = 0

    for (const contact of contacts) {
      const firstName = contact.first_name || 'there'

      // Replace placeholders in subject and message
      const filledSubject = subject
        .replace(/\{name\}/gi, firstName)
        .replace(/\{store\}/gi, brand.name)

      const filledMessage = message
        .replace(/\{name\}/gi, firstName)
        .replace(/\{store\}/gi, brand.name)

      const bodyHtml = `
      <div style="font-size:32px;margin-bottom:8px;">&#128227;</div>
      <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">${filledSubject}</h1>
      <p style="margin:0 0 20px;font-size:16px;color:#52525b;white-space:pre-line;">${filledMessage}</p>
      <a href="${scanUrl}" style="display:inline-block;margin-top:12px;padding:14px 32px;background:${accentColor};color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:10px;">Visit ${brand.name}</a>`

      // sendAutopilotEmail handles consent gate + logging
      // No dedup for broadcasts — they're intentional one-offs
      const result = await sendAutopilotEmail(supabase, {
        flow: 'broadcast',
        contact,
        brand: { ...brand, autopilot_broadcast: true }, // always allow (no toggle for broadcast)
        subject: filledSubject,
        bodyHtml,
        dedupCheck: null,
      })

      if (result.sent) sent++
      else if (result.skipped) skipped++
      else errorCount++
    }

    return new Response(JSON.stringify({ sent, skipped, error_count: errorCount, total: contacts.length }), { status: 200, headers })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 200, headers })
  }
}
