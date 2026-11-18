/**
 * Hourly: tells Stripe how many new opted-in contacts each paying brand
 * collected, so the per-contact part of the brand plans bills correctly.
 *
 * - A contact is one person per brand (contacts are unique by email), so a
 *   shopper who registers a warranty, enters a promo and joins loyalty is one.
 * - Contacts collected before the subscription started or during the free
 *   trial are never billed.
 * - Each contact is stamped with usage_reported_at so it's billed once. The
 *   stamp is written before Stripe is told; if Stripe fails, it's rolled back.
 *   (A failure can only under-bill, never double-bill.)
 * - Free (comp) plans and founding brands have no metered item and are skipped.
 */

import { getStripe, getSupabase, CONTACT_METER_EVENT, usageItem } from './lib/stripe-billing.js'

export const config = { schedule: '@hourly' }

const CHUNK = 500

export default async () => {
  const stripe = getStripe()
  const supabase = getSupabase()
  if (!stripe || !supabase) return new Response('billing not configured', { status: 200 })

  const { data: brands, error } = await supabase
    .from('brands')
    .select('id, stripe_customer_id, stripe_subscription_id, comp_tier')
    .neq('business_type', 'storefront')
    .not('stripe_subscription_id', 'is', null)
    .not('stripe_customer_id', 'is', null)
    .in('subscription_status', ['active', 'past_due'])
  if (error) {
    console.error('report-contact-usage: brands query failed:', error.message)
    return new Response('error', { status: 500 })
  }

  const summary = []
  for (const brand of brands || []) {
    if (brand.comp_tier) continue
    try {
      const sub = await stripe.subscriptions.retrieve(brand.stripe_subscription_id)
      if (!usageItem(sub) || sub.status === 'trialing') continue
      const billableFrom = new Date(Math.max(sub.start_date || 0, sub.trial_end || 0) * 1000).toISOString()

      let reported = 0
      for (;;) {
        const { data: rows } = await supabase
          .from('contacts')
          .select('id')
          .eq('brand_id', brand.id)
          .is('usage_reported_at', null)
          .gte('created_at', billableFrom)
          .order('created_at', { ascending: true })
          .limit(CHUNK)
        const ids = (rows || []).map(r => r.id)
        if (ids.length === 0) break

        const stamp = new Date().toISOString()
        const { error: stampError } = await supabase.from('contacts').update({ usage_reported_at: stamp }).in('id', ids)
        if (stampError) throw stampError
        try {
          await stripe.billing.meterEvents.create({
            event_name: CONTACT_METER_EVENT,
            identifier: `contacts-${brand.id}-${ids[0]}-${ids.length}-${stamp}`,
            payload: { stripe_customer_id: brand.stripe_customer_id, value: String(ids.length) },
          })
        } catch (stripeError) {
          await supabase.from('contacts').update({ usage_reported_at: null }).in('id', ids)
          throw stripeError
        }
        reported += ids.length
        if (ids.length < CHUNK) break
      }
      if (reported) summary.push(`${brand.id}: ${reported}`)
    } catch (err) {
      console.error(`report-contact-usage: brand ${brand.id}:`, err.message)
    }
  }

  console.log('report-contact-usage:', summary.length ? summary.join(', ') : 'nothing new')
  return new Response('ok', { status: 200 })
}
