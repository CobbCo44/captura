/**
 * Reads the brand's current subscription straight from Stripe and records it.
 * Called by the dashboard when an owner returns from checkout, so access
 * doesn't depend on the webhook arriving first. Writes the same columns as
 * the webhook via brandUpdateFromSubscription.
 */

import { getStripe, getSupabase, authBrandOwner, brandUpdateFromSubscription } from './lib/stripe-billing.js'

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
    const { brand_id } = await req.json()
    const auth = await authBrandOwner(supabase, req, brand_id)
    if (auth.error) return new Response(JSON.stringify({ error: auth.error }), { status: 401, headers })
    const { brand } = auth

    if (!brand.stripe_customer_id) {
      return new Response(JSON.stringify({ synced: false, reason: 'no_customer' }), { status: 200, headers })
    }

    // Most recent subscription for this customer, in any state
    const { data: subs } = await stripe.subscriptions.list({
      customer: brand.stripe_customer_id,
      status: 'all',
      limit: 1,
    })
    const sub = subs[0]
    if (!sub) return new Response(JSON.stringify({ synced: false, reason: 'no_subscription' }), { status: 200, headers })

    const update = brandUpdateFromSubscription(sub)
    const { error } = await supabase.from('brands').update(update).eq('id', brand.id)
    if (error) throw error

    return new Response(JSON.stringify({ synced: true, subscription_status: update.subscription_status, tier: update.tier || brand.tier }), { status: 200, headers })
  } catch (err) {
    console.error('sync-subscription:', err.message)
    return new Response(JSON.stringify({ error: 'Could not check your plan with Stripe.' }), { status: 500, headers })
  }
}
