/**
 * Starts a Stripe Checkout session for a plan: 14-day trial, card required
 * upfront, auto-converts on day 15. Returns the hosted checkout URL —
 * card details never touch our servers.
 */

import { getStripe, getSupabase, PLANS, ensurePrice, authBrandOwner } from './lib/stripe-billing.js'

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
    const { user, brand } = auth

    const group = brand.business_type === 'storefront' ? 'storefront' : 'product'
    const plan = PLANS[group]?.[tier]
    if (!plan) return new Response(JSON.stringify({ error: 'Unknown plan' }), { status: 400, headers })

    // Reuse or create the Stripe customer for this brand
    let customerId = brand.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: brand.name,
        metadata: { brand_id: brand.id },
      })
      customerId = customer.id
      await supabase.from('brands').update({ stripe_customer_id: customerId }).eq('id', brand.id)
    }

    const price = await ensurePrice(stripe, plan)
    const origin = process.env.URL || 'https://meetcaptura.com'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: price.id, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { brand_id: brand.id, tier },
      },
      payment_method_collection: 'always',
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard/billing?checkout=success`,
      cancel_url: `${origin}/dashboard/billing?checkout=canceled`,
      metadata: { brand_id: brand.id, tier },
    })

    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers })
  } catch (err) {
    console.error('create-checkout-session:', err.message)
    return new Response(JSON.stringify({ error: 'Could not start checkout. Try again in a moment.' }), { status: 500, headers })
  }
}
