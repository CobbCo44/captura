/**
 * Stripe webhook — the single writer of billing state onto brands.
 * Signature-verified with STRIPE_WEBHOOK_SECRET; events from anywhere
 * else are rejected. Handles the full subscription lifecycle.
 */

import { getStripe, getSupabase, tierFromLookupKey } from './lib/stripe-billing.js'

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const stripe = getStripe()
  const supabase = getSupabase()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !supabase || !secret) return new Response('Not configured', { status: 500 })

  let event
  try {
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')
    event = await stripe.webhooks.constructEventAsync(body, sig, secret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response('Bad signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const brandId = session.metadata?.brand_id
        if (brandId && session.subscription) {
          await supabase.from('brands').update({
            stripe_subscription_id: session.subscription,
            billing_updated_at: new Date().toISOString(),
          }).eq('id', brandId)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const update = {
          stripe_subscription_id: sub.id,
          subscription_status: sub.status === 'trialing' ? 'trialing'
            : sub.status === 'active' ? 'active'
            : (sub.status === 'past_due' || sub.status === 'unpaid') ? 'past_due'
            : (sub.status === 'canceled' || sub.status === 'incomplete_expired') ? 'canceled'
            : sub.status,
          trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          billing_updated_at: new Date().toISOString(),
        }
        const lookupKey = sub.items?.data?.[0]?.price?.lookup_key
        const tier = tierFromLookupKey(lookupKey) || sub.metadata?.tier
        if (tier) update.tier = tier
        const brandId = sub.metadata?.brand_id
        if (brandId) {
          await supabase.from('brands').update(update).eq('id', brandId)
        } else {
          await supabase.from('brands').update(update).eq('stripe_customer_id', sub.customer)
        }
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await supabase.from('brands').update({
          subscription_status: 'canceled',
          billing_updated_at: new Date().toISOString(),
        }).eq('stripe_customer_id', sub.customer)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object
        await supabase.from('brands').update({
          subscription_status: 'past_due',
          billing_updated_at: new Date().toISOString(),
        }).eq('stripe_customer_id', invoice.customer)
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', event.type, err.message)
    return new Response('Handler error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
}
