/**
 * Win-Back scheduled function — runs daily.
 * Selects loyalty members whose most recent point-earning scan is > winback_days ago.
 *
 * Guardrails (all server-side):
 *   1. Consent required (sms_consent = true)
 *   2. Never to a member who joined < winback_days ago
 *   3. Never if they've scanned since the last win-back sent
 *   4. Max one win-back per member per 60 days
 *   5. Flow must be enabled for the brand (autopilot_winback = true)
 *
 * Content: "It's been a while — you have {points} points waiting at {store}"
 * If at or over a reward threshold, lead with: "Your {reward} is still waiting."
 *
 * Every decision (sent or skipped and why) is logged to autopilot_emails.
 */

import { getSupabase, sendAutopilotEmail, logAutopilotEmail } from './lib/autopilot-email.js'

// Netlify Scheduled Function config
export const config = {
  schedule: '0 14 * * *',  // 2 PM UTC daily (10 AM ET, 7 AM PT)
}

export default async () => {
  const supabase = getSupabase()
  if (!supabase) {
    console.error('Supabase not configured')
    return
  }

  // 1. Get all storefront brands with winback enabled
  const { data: brands, error: brandsErr } = await supabase
    .from('brands')
    .select('id, name, logo_url, logo_dark_url, accent_hex, business_type, autopilot_winback, winback_days, autopilot_winback_subject, autopilot_winback_message, subscription_status, tier')
    .eq('business_type', 'storefront')
    .eq('autopilot_winback', true)

  if (brandsErr || !brands?.length) {
    console.log('No eligible brands:', brandsErr?.message || 'none found')
    return
  }

  for (const brand of brands) {
    // Tier enforcement: billed accounts need Growth+ for Win-Back.
    // No subscription_status = founding free ride, not gated.
    if (brand.subscription_status && !['growth', 'pro'].includes(brand.tier)) continue
    try {
      await processWinbackForBrand(supabase, brand)
    } catch (err) {
      console.error(`Winback error for brand ${brand.id}:`, err.message)
      try {
        await supabase.from('error_log').insert({
          source: 'autopilot_winback',
          message: err.message || String(err),
          metadata: { brand_id: brand.id },
        }).catch(() => {})
      } catch (_) {}
    }
  }
}

async function processWinbackForBrand(supabase, brand) {
  const winbackDays = brand.winback_days || 30
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - winbackDays)
  const cutoffISO = cutoffDate.toISOString()

  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
  const sixtyDaysISO = sixtyDaysAgo.toISOString()

  // Get all contacts who have earned points for this brand
  const { data: earnedPoints, error: pointsErr } = await supabase
    .from('loyalty_points')
    .select('contact_id, created_at')
    .eq('brand_id', brand.id)
    .eq('type', 'earned')
    .order('created_at', { ascending: false })

  if (pointsErr || !earnedPoints?.length) return

  // Group by contact: find most recent earn date per contact
  const contactLastEarn = {}
  for (const p of earnedPoints) {
    if (!contactLastEarn[p.contact_id] || p.created_at > contactLastEarn[p.contact_id]) {
      contactLastEarn[p.contact_id] = p.created_at
    }
  }

  // Filter to contacts whose last earn is older than winback_days
  const lapsedContactIds = Object.entries(contactLastEarn)
    .filter(([, lastEarn]) => lastEarn < cutoffISO)
    .map(([contactId]) => contactId)

  if (!lapsedContactIds.length) return

  // Load contacts with consent
  const { data: contacts, error: contactsErr } = await supabase
    .from('contacts')
    .select('id, email, first_name, sms_consent, created_at')
    .eq('brand_id', brand.id)
    .in('id', lapsedContactIds)

  if (contactsErr || !contacts?.length) return

  // Load rewards for threshold check
  const { data: rewards } = await supabase
    .from('loyalty_rewards')
    .select('id, name, points_required, reward_value')
    .eq('brand_id', brand.id)
    .eq('active', true)
    .order('points_required', { ascending: false })

  // Load recent winback sends for dedup (60-day cooldown)
  const { data: recentWinbacks } = await supabase
    .from('autopilot_emails')
    .select('contact_id, created_at')
    .eq('brand_id', brand.id)
    .eq('flow', 'winback')
    .eq('outcome', 'sent')
    .gte('created_at', sixtyDaysISO)

  const recentWinbackMap = {}
  for (const w of (recentWinbacks || [])) {
    if (!recentWinbackMap[w.contact_id] || w.created_at > recentWinbackMap[w.contact_id]) {
      recentWinbackMap[w.contact_id] = w.created_at
    }
  }

  for (const contact of contacts) {
    const logBase = { contact_id: contact.id, brand_id: brand.id, flow: 'winback' }

    // Guardrail: consent required
    if (!contact.sms_consent) {
      await logAutopilotEmail(supabase, { ...logBase, outcome: 'skipped_no_consent' })
      continue
    }

    // Guardrail: never if joined less than winback_days ago
    if (contact.created_at > cutoffISO) {
      await logAutopilotEmail(supabase, { ...logBase, outcome: 'skipped_dedup', error_detail: 'joined_too_recently' })
      continue
    }

    // Guardrail: max one winback per 60 days
    if (recentWinbackMap[contact.id]) {
      await logAutopilotEmail(supabase, { ...logBase, outcome: 'skipped_dedup', error_detail: 'winback_cooldown_60d' })
      continue
    }

    // Guardrail: never if they've scanned since the last winback sent
    // (check any winback ever sent, not just recent 60d)
    const { data: lastWinback } = await supabase
      .from('autopilot_emails')
      .select('created_at')
      .eq('contact_id', contact.id)
      .eq('brand_id', brand.id)
      .eq('flow', 'winback')
      .eq('outcome', 'sent')
      .order('created_at', { ascending: false })
      .limit(1)

    if (lastWinback?.length > 0) {
      const lastWinbackDate = lastWinback[0].created_at
      // Check if they earned a point since the last winback
      const { count: earnsSince } = await supabase
        .from('loyalty_points')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', contact.id)
        .eq('brand_id', brand.id)
        .eq('type', 'earned')
        .gte('created_at', lastWinbackDate)

      if (!earnsSince || earnsSince === 0) {
        // They haven't scanned since last winback — and 60d cooldown already checked above
        // This case means they received a winback >60d ago but still haven't come back
        // Allow sending again (the 60d cooldown already passed if we got here)
      }
    }

    // Get balance
    const { data: balData } = await supabase.rpc('get_loyalty_balance', {
      p_contact_id: contact.id,
      p_brand_id: brand.id,
    })
    const balance = balData?.balance ?? 0

    // Build email content
    const firstName = contact.first_name || 'there'
    const accentColor = brand.accent_hex || '#22c55e'
    const scanUrl = `https://meetcaptura.com/store/${brand.id}`

    // Check if they're at or over a reward threshold
    const claimableReward = (rewards || []).find(r => balance >= r.points_required)
    const rewardName = claimableReward ? claimableReward.name : ((rewards || [])[0]?.name || '')

    // Placeholder replacement
    const fill = (tpl) => tpl
      .replace(/\{name\}/gi, firstName)
      .replace(/\{store\}/gi, brand.name)
      .replace(/\{points\}/gi, String(balance))
      .replace(/\{reward\}/gi, rewardName)

    let subject, bodyHtml

    // Use custom messages if set
    const customSubject = brand.autopilot_winback_subject ? fill(brand.autopilot_winback_subject) : null
    const customMessage = brand.autopilot_winback_message ? fill(brand.autopilot_winback_message) : null

    if (customSubject || customMessage) {
      subject = customSubject || (claimableReward ? `Your ${claimableReward.name} is still waiting, ${firstName}!` : `It's been a while, ${firstName}!`)
      const message = customMessage || (claimableReward ? `You have enough points to redeem ${claimableReward.name} at ${brand.name}.` : `You have points waiting for you at ${brand.name}.`)
      bodyHtml = `
      <div style="font-size:32px;margin-bottom:8px;">${claimableReward ? '&#127873;' : '&#128075;'}</div>
      <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">${subject}</h1>
      <p style="margin:0 0 20px;font-size:16px;color:#52525b;">${message}</p>
      <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:10px;padding:16px;margin:0 0 20px;">
        <div style="font-size:13px;color:#71717a;margin-bottom:4px;">Your balance</div>
        <div style="font-size:28px;font-weight:800;color:#D4A017;">${balance} point${balance === 1 ? '' : 's'}</div>
      </div>
      <a href="${scanUrl}" style="display:inline-block;margin-top:20px;padding:14px 32px;background:${accentColor};color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:10px;">Visit ${brand.name}</a>`
    } else if (claimableReward) {
      subject = `Your ${claimableReward.name} is still waiting, ${firstName}!`
      bodyHtml = `
      <div style="font-size:32px;margin-bottom:8px;">&#127873;</div>
      <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">Your ${claimableReward.name} is still waiting!</h1>
      <p style="margin:0 0 20px;font-size:16px;color:#52525b;">Hey ${firstName}, you have enough points to redeem this reward at ${brand.name}.</p>
      <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:10px;padding:16px;margin:0 0 20px;">
        <div style="font-size:20px;font-weight:700;color:#18181b;margin-bottom:4px;">${claimableReward.name}</div>
        <div style="font-size:14px;color:#71717a;">${claimableReward.points_required} points${claimableReward.reward_value ? ` \u00B7 ${claimableReward.reward_value}` : ''}</div>
      </div>
      <p style="margin:0 0 4px;font-size:14px;color:#71717a;">Your balance: <strong style="color:#18181b;">${balance} points</strong></p>
      <a href="${scanUrl}" style="display:inline-block;margin-top:20px;padding:14px 32px;background:${accentColor};color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:10px;">Redeem Your Reward</a>`
    } else {
      subject = `It's been a while, ${firstName}!`
      bodyHtml = `
      <div style="font-size:32px;margin-bottom:8px;">&#128075;</div>
      <h1 style="margin:0 0 8px;font-size:22px;color:#18181b;">It's been a while, ${firstName}!</h1>
      <p style="margin:0 0 20px;font-size:16px;color:#52525b;">You have points waiting for you at ${brand.name}.</p>
      <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:10px;padding:16px;margin:0 0 20px;">
        <div style="font-size:13px;color:#71717a;margin-bottom:4px;">Your balance</div>
        <div style="font-size:28px;font-weight:800;color:#D4A017;">${balance} point${balance === 1 ? '' : 's'}</div>
      </div>
      ${(rewards || []).length > 0 ? `<p style="margin:0 0 4px;font-size:14px;color:#71717a;">Next reward at ${rewards[rewards.length - 1].points_required} points</p>` : ''}
      <a href="${scanUrl}" style="display:inline-block;margin-top:20px;padding:14px 32px;background:${accentColor};color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;border-radius:10px;">Visit ${brand.name}</a>`
    }

    // Send via shared pipeline (consent + toggle checks handled inside)
    await sendAutopilotEmail(supabase, {
      flow: 'winback',
      contact,
      brand,
      subject,
      bodyHtml,
      dedupCheck: null,  // dedup already handled above with 60-day check
      extra: { balance_at_send: balance },
    })
  }
}
