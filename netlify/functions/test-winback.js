/**
 * Test endpoint to manually trigger winback for a single brand.
 * POST with { brand_id } — runs the same logic as the scheduled function.
 * For testing only.
 */

import { getSupabase, sendAutopilotEmail, logAutopilotEmail } from './lib/autopilot-email.js'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('POST only', { status: 405 })
  }

  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  const supabase = getSupabase()
  if (!supabase) return new Response(JSON.stringify({ error: 'No supabase' }), { status: 500, headers })

  try {
    const { brand_id } = await req.json()
    if (!brand_id) return new Response(JSON.stringify({ error: 'Missing brand_id' }), { status: 400, headers })

    const { data: brand } = await supabase
      .from('brands')
      .select('id, name, logo_url, logo_dark_url, accent_hex, business_type, autopilot_winback, winback_days, autopilot_winback_subject, autopilot_winback_message')
      .eq('id', brand_id)
      .single()

    if (!brand) return new Response(JSON.stringify({ error: 'Brand not found' }), { status: 200, headers })

    const winbackDays = brand.winback_days || 30
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - winbackDays)
    const cutoffISO = cutoffDate.toISOString()

    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    const sixtyDaysISO = sixtyDaysAgo.toISOString()

    // Find lapsed contacts
    const { data: earnedPoints } = await supabase
      .from('loyalty_points')
      .select('contact_id, created_at')
      .eq('brand_id', brand_id)
      .eq('type', 'earned')
      .order('created_at', { ascending: false })

    if (!earnedPoints?.length) return new Response(JSON.stringify({ result: 'no_points_found' }), { status: 200, headers })

    const contactLastEarn = {}
    for (const p of earnedPoints) {
      if (!contactLastEarn[p.contact_id] || p.created_at > contactLastEarn[p.contact_id]) {
        contactLastEarn[p.contact_id] = p.created_at
      }
    }

    const lapsedContactIds = Object.entries(contactLastEarn)
      .filter(([, lastEarn]) => lastEarn < cutoffISO)
      .map(([cid]) => cid)

    if (!lapsedContactIds.length) {
      return new Response(JSON.stringify({
        result: 'no_lapsed_contacts',
        winback_days: winbackDays,
        cutoff: cutoffISO,
        contacts_checked: Object.keys(contactLastEarn).length,
        most_recent_earn: Object.values(contactLastEarn).sort().reverse()[0],
      }), { status: 200, headers })
    }

    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, email, first_name, sms_consent, created_at')
      .eq('brand_id', brand_id)
      .in('id', lapsedContactIds)

    if (!contacts?.length) return new Response(JSON.stringify({ result: 'no_contacts_found_for_lapsed' }), { status: 200, headers })

    const { data: rewards } = await supabase
      .from('loyalty_rewards')
      .select('id, name, points_required, reward_value')
      .eq('brand_id', brand_id)
      .eq('active', true)
      .order('points_required', { ascending: false })

    const results = []

    for (const contact of contacts) {
      // Skip consent check and joined-too-recently check for testing
      // but log what WOULD have happened
      const skips = []
      if (!contact.sms_consent) skips.push('no_consent')
      if (contact.created_at > cutoffISO) skips.push('joined_too_recently')

      // 60-day cooldown check
      const { data: recentWinback } = await supabase
        .from('autopilot_emails')
        .select('created_at')
        .eq('contact_id', contact.id)
        .eq('brand_id', brand_id)
        .eq('flow', 'winback')
        .eq('outcome', 'sent')
        .gte('created_at', sixtyDaysISO)
        .limit(1)

      if (recentWinback?.length) skips.push('winback_cooldown_60d')

      if (skips.length > 0) {
        // In test mode, skip the joined_too_recently guardrail but enforce consent + 60d
        if (skips.includes('no_consent') || skips.includes('winback_cooldown_60d')) {
          results.push({ contact_id: contact.id, email: contact.email, skipped: skips.join(', ') })
          await logAutopilotEmail(supabase, { contact_id: contact.id, brand_id, flow: 'winback', outcome: 'skipped_dedup', error_detail: skips.join(', ') })
          continue
        }
        // joined_too_recently — skip in prod but allow in test
      }

      // Get balance
      const { data: balData } = await supabase.rpc('get_loyalty_balance', {
        p_contact_id: contact.id,
        p_brand_id: brand_id,
      })
      const balance = balData?.balance ?? 0

      const firstName = contact.first_name || 'there'
      const accentColor = brand.accent_hex || '#22c55e'
      const scanUrl = `https://meetcaptura.com/store/${brand_id}`
      const claimableReward = (rewards || []).find(r => balance >= r.points_required)
      const rewardName = claimableReward ? claimableReward.name : ((rewards || [])[0]?.name || '')

      const fill = (tpl) => tpl
        .replace(/\{name\}/gi, firstName)
        .replace(/\{store\}/gi, brand.name)
        .replace(/\{points\}/gi, String(balance))
        .replace(/\{reward\}/gi, rewardName)

      let subject, bodyHtml
      const customSubject = brand.autopilot_winback_subject ? fill(brand.autopilot_winback_subject) : null
      const customMessage = brand.autopilot_winback_message ? fill(brand.autopilot_winback_message) : null

      if (claimableReward) {
        subject = customSubject || `Your ${claimableReward.name} is still waiting, ${firstName}!`
        const message = customMessage || `Hey ${firstName}, you have enough points to redeem this reward at ${brand.name}.`
        bodyHtml = `
        <div style="font-size:32px;margin-bottom:8px;">&#127873;</div>
        <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">${subject}</h1>
        <p style="margin:0 0 20px;font-size:16px;color:#52525b;">${message}</p>
        <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:10px;padding:16px;margin:0 0 20px;">
          <div style="font-size:20px;font-weight:700;color:#18181b;margin-bottom:4px;">${claimableReward.name}</div>
          <div style="font-size:14px;color:#71717a;">${claimableReward.points_required} points${claimableReward.reward_value ? ` · ${claimableReward.reward_value}` : ''}</div>
        </div>
        <p style="margin:0 0 4px;font-size:14px;color:#71717a;">Your balance: <strong style="color:#18181b;">${balance} points</strong></p>
        <a href="${scanUrl}" style="display:inline-block;margin-top:20px;padding:14px 32px;background:${accentColor};color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:10px;">Redeem Your Reward</a>`
      } else {
        subject = customSubject || `It's been a while, ${firstName}!`
        const message = customMessage || `You have points waiting for you at ${brand.name}.`
        bodyHtml = `
        <div style="font-size:32px;margin-bottom:8px;">&#128075;</div>
        <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">${subject}</h1>
        <p style="margin:0 0 20px;font-size:16px;color:#52525b;">${message}</p>
        <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:10px;padding:16px;margin:0 0 20px;">
          <div style="font-size:13px;color:#71717a;margin-bottom:4px;">Your balance</div>
          <div style="font-size:28px;font-weight:800;color:#D4A017;">${balance} point${balance === 1 ? '' : 's'}</div>
        </div>
        <a href="${scanUrl}" style="display:inline-block;margin-top:20px;padding:14px 32px;background:${accentColor};color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:10px;">Visit ${brand.name}</a>`
      }

      const sendResult = await sendAutopilotEmail(supabase, {
        flow: 'winback',
        contact,
        brand,
        subject,
        bodyHtml,
        dedupCheck: null,
        extra: { balance_at_send: balance },
      })

      results.push({ contact_id: contact.id, email: contact.email, ...sendResult, skips_overridden: skips })
    }

    return new Response(JSON.stringify({ winback_days: winbackDays, results }), { status: 200, headers })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 200, headers })
  }
}
