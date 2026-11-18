/**
 * Moves a brand's existing subscription to another tier in place, so owners
 * never end up with two subscriptions. Keeps any trial; after a trial,
 * Stripe prorates the difference on the next invoice.
 */

import { getStripe, getSupabase, PLANS, ensurePrice, ensureUsagePrice, authBrandOwner, brandUpdateFromSubscription, baseItem, usageItem } from './lib/stripe-billing.js'

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } })
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const supabase = getSupabase()
  if (!supabase) return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers })

  const stripe = getStripe()
  if (!stripe) return new Response(JSON.stringify({ error: 'billing_not_configured' }), { status: 200, headers })

  try {
    const { brand_id, tier } = await req.json()
    const auth = await authBrandOwner(supabase, req, brand_id)
    if (auth.error) return new Response(JSON.stringify({ error: auth.error }), { status: 401, headers })
    const { brand } = auth

    const group = brand.business_type === 'storefront' ? 'storefront' : 'product'
    const plan = PLANS[group]?.[tier]
    if (!plan) return new Response(JSON.stringify({ error: 'Unknown plan' }), { status: 400, headers })
    if (!brand.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: 'No subscription to change. Pick a plan first.' }), { status: 400, headers })
    }

    const sub = await stripe.subscriptions.retrieve(brand.stripe_subscription_id)
    if (['canceled', 'incomplete_expired'].includes(sub.status)) {
      return new Response(JSON.stringify({ error: 'This subscription has ended. Pick a plan to start a new one.' }), { status: 400, headers })
    }

    const price = await ensurePrice(stripe, plan)
    const usagePrice = await ensureUsagePrice(stripe, plan)
    const item = baseItem(sub)
    const metered = usageItem(sub)
    const usageSame = !usagePrice || metered?.price?.id === usagePrice.id
    if (item.price.id === price.id && usageSame) {
      return new Response(JSON.stringify({ unchanged: true }), { status: 200, headers })
    }
    const items = [{ id: item.id, price: price.id }]
    // Brand plans: move (or add) the per-contact price to the new plan's rate
    if (usagePrice && !usageSame) items.push(metered ? { id: metered.id, price: usagePrice.id } : { price: usagePrice.id })
    const updated = await stripe.subscriptions.update(sub.id, {
      items,
      proration_behavior: 'create_prorations',
      metadata: { ...sub.metadata, brand_id: brand.id, tier },
    })

    const update = brandUpdateFromSubscription(updated)
    const { error } = await supabase.from('brands').update(update).eq('id', brand.id)
    if (error) throw error

    return new Response(JSON.stringify({ changed: true, tier: update.tier, subscription_status: update.subscription_status }), { status: 200, headers })
  } catch (err) {
    console.error('change-plan:', err.message)
    const detail = err?.type?.startsWith('Stripe') && err.message ? ` Stripe says: ${err.message}` : ' Try again in a moment.'
    return new Response(JSON.stringify({ error: `Could not change your plan.${detail}` }), { status: 500, headers })
  }
}
