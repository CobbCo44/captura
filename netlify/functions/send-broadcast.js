/**
 * Broadcast email — one-off blast to all consented loyalty members for a brand.
 * POST with { brand_id, subject, message }
 * Same template shell, consent gate, HMAC unsub as all autopilot emails.
 * Logged to autopilot_emails with flow='broadcast'.
 *
 * Rate limits (both enforced server-side):
 *   - Max 4 blasts per brand per rolling 30 days
 *   - Min 24 hours between blasts
 * Refusals are logged to autopilot_emails and surfaced with specific messages.
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

    // Verify the brand exists
    const { data: brand } = await supabase
      .from('brands')
      .select('id, name, logo_url, logo_dark_url, accent_hex, business_type')
      .eq('id', brand_id)
      .single()

    if (!brand) return new Response(JSON.stringify({ error: 'Brand not found' }), { status: 200, headers })

    // --- RATE LIMIT CHECKS ---
    // Get all broadcast sends in the last 30 days (used for both checks)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { data: blastDates } = await supabase
      .from('autopilot_emails')
      .select('created_at')
      .eq('brand_id', brand_id)
      .eq('flow', 'broadcast')
      .eq('outcome', 'sent')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    // Count unique blasts (multiple sends in the same blast share a minute)
    const uniqueBlastTimes = [...new Set((blastDates || []).map(d => d.created_at.substring(0, 16)))]

    // Check 1: 24-hour gap
    if (uniqueBlastTimes.length > 0) {
      const lastBlastTime = new Date(blastDates[0].created_at)
      const hoursSince = (Date.now() - lastBlastTime.getTime()) / (1000 * 60 * 60)

      if (hoursSince < 24) {
        const nextAvailable = new Date(lastBlastTime.getTime() + 24 * 60 * 60 * 1000)
        const nextTime = nextAvailable.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles' })

        // Log the refusal
        await supabase.from('error_log').insert({
          source: 'broadcast_rate_limit',
          message: `refused_daily_gap: ${Math.round(hoursSince)}h since last blast`,
          metadata: { brand_id },
        }).catch(() => {})

        return new Response(JSON.stringify({
          error: `You sent an announcement in the last 24 hours. Next one available at ${nextTime}.`,
          refused: 'daily_gap',
        }), { status: 200, headers })
      }
    }

    // Check 2: Monthly cap (4 per 30 days)
    if (uniqueBlastTimes.length >= 4) {
      // Find when the oldest of the 4 blasts will roll off
      const oldestBlast = new Date(uniqueBlastTimes[uniqueBlastTimes.length - 1])
      const resetDate = new Date(oldestBlast.getTime() + 30 * 24 * 60 * 60 * 1000)
      const resetStr = resetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' })

      // Log the refusal
      await supabase.from('error_log').insert({
        source: 'broadcast_rate_limit',
        message: `refused_monthly_cap: ${uniqueBlastTimes.length} blasts in last 30d`,
        metadata: { brand_id },
      }).catch(() => {})

      return new Response(JSON.stringify({
        error: `You've used all 4 announcements this month. Resets on ${resetStr}.`,
        refused: 'monthly_cap',
      }), { status: 200, headers })
    }

    // --- SEND BLAST ---
    // Get all loyalty members
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

      const result = await sendAutopilotEmail(supabase, {
        flow: 'broadcast',
        contact,
        brand: { ...brand, autopilot_broadcast: true },
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
