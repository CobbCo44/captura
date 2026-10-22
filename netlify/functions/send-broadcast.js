/**
 * Broadcast email — one-off blast to all consented loyalty members for a brand.
 * POST with { brand_id, subject, message, image_url?, button_text?, button_url?, test? }
 * Requires the brand owner's session (Authorization: Bearer <access token>).
 * test: true sends one copy to the owner's own email; it skips rate limits and
 * isn't logged, so it doesn't use up one of the month's blasts.
 * Same template shell, consent gate, HMAC unsub as all autopilot emails.
 * Logged to autopilot_emails with flow='broadcast'.
 *
 * Rate limits (both enforced server-side):
 *   - Max 4 blasts per brand per rolling 30 days
 *   - Min 24 hours between blasts
 * Refusals are logged to autopilot_emails and surfaced with specific messages.
 */

import { getSupabase, sendAutopilotEmail, sendViaResend, buildEmailHtml } from './lib/autopilot-email.js'
import { authBrandOwner } from './lib/stripe-billing.js'
import { buildBroadcastBody, fillBroadcastText, isHttpUrl } from '../../src/lib/emailTemplates.js'

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
    const { brand_id, subject, message, image_url, button_text, button_url, test } = await req.json()
    if (!brand_id || !subject || !message) {
      return new Response(JSON.stringify({ error: 'Missing brand_id, subject, or message' }), { status: 400, headers })
    }
    if (image_url && !isHttpUrl(image_url)) {
      return new Response(JSON.stringify({ error: 'The photo link is not valid. Try uploading it again.' }), { status: 200, headers })
    }
    if (button_text && !isHttpUrl(button_url)) {
      return new Response(JSON.stringify({ error: 'Add a full button link starting with https://' }), { status: 200, headers })
    }

    // Only the brand's owner can send blasts or tests
    const auth = await authBrandOwner(supabase, req, brand_id)
    if (auth.error) return new Response(JSON.stringify({ error: auth.error }), { status: 200, headers })
    const brand = auth.brand
    const content = { message, imageUrl: image_url, buttonText: button_text, buttonUrl: button_url }

    // Test send: one copy to the owner, no rate limit, not logged as a blast
    if (test) {
      const resendKey = process.env.RESEND_API_KEY
      if (!resendKey) return new Response(JSON.stringify({ error: 'Email sending is not configured.' }), { status: 200, headers })
      const fill = { firstName: 'there', storeName: brand.name }
      const testSubject = `[Test] ${fillBroadcastText(subject, fill)}`
      const bodyHtml = buildBroadcastBody({ brand, ...content, subject: fillBroadcastText(subject, fill), message: fillBroadcastText(message, fill) })
      const result = await sendViaResend({
        resendKey,
        from: `${brand.name} via MeetCaptura <rewards@meetcaptura.com>`,
        to: auth.user.email,
        subject: testSubject,
        html: buildEmailHtml({ brand, subject: testSubject, bodyHtml, unsubUrl: '#' }),
      })
      if (result.error) return new Response(JSON.stringify({ error: 'Test email failed to send. Please try again.' }), { status: 200, headers })
      return new Response(JSON.stringify({ test_sent_to: auth.user.email }), { status: 200, headers })
    }

    // Tier enforcement: billed accounts need Growth+ to send blasts.
    // No subscription_status = founding free ride, not gated.
    if (brand.subscription_status && !['growth', 'pro'].includes(brand.tier)) {
      return new Response(JSON.stringify({ error: 'Announcements are a Growth feature. Upgrade on the Billing page to send blasts.' }), { status: 200, headers })
    }

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

    let sent = 0, skipped = 0, errorCount = 0

    for (const contact of contacts) {
      const firstName = contact.first_name || 'there'

      const fill = { firstName, storeName: brand.name }
      const filledSubject = fillBroadcastText(subject, fill)
      const bodyHtml = buildBroadcastBody({ brand, ...content, subject: filledSubject, message: fillBroadcastText(message, fill) })

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
