/**
 * Shared Stripe billing helper.
 * Degrades gracefully: getStripe() returns null until STRIPE_SECRET_KEY
 * is set in Netlify env, and every billing function reports
 * "billing_not_configured" instead of erroring.
 */

import Stripe from 'stripe'
import { getSupabase } from './autopilot-email.js'

export { getSupabase }

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key)
}

// Plan catalog. lookup_key is the stable id used to find/create the
// Stripe price, so the same code works in test mode and live mode.
export const PLANS = {
  storefront: {
    starter: { lookup_key: 'storefront_starter', name: 'MeetCaptura Storefront Starter', amount: 12500 },
    growth: { lookup_key: 'storefront_growth', name: 'MeetCaptura Storefront Growth', amount: 25000 },
    pro: { lookup_key: 'storefront_pro', name: 'MeetCaptura Storefront Pro', amount: 49900 },
  },
  product: {
    starter: { lookup_key: 'product_starter', name: 'MeetCaptura Brand Starter', amount: 29900 },
    growth: { lookup_key: 'product_growth', name: 'MeetCaptura Brand Growth', amount: 49900 },
  },
}

/**
 * Find the Stripe price for a plan by lookup_key, creating the product
 * and price on first use. Idempotent — no dashboard setup needed.
 */
export async function ensurePrice(stripe, plan) {
  const existing = await stripe.prices.list({ lookup_keys: [plan.lookup_key], limit: 1 })
  const current = existing.data[0]
  if (current && current.unit_amount === plan.amount) return current
  // No price yet, or the catalog amount changed: create a price at the
  // current amount and move the lookup_key onto it. Existing subscribers
  // keep their old price (rate lock); new checkouts get the new one.
  const productId = current ? current.product : (await stripe.products.create({ name: plan.name })).id
  return stripe.prices.create({
    product: productId,
    unit_amount: plan.amount,
    currency: 'usd',
    recurring: { interval: 'month' },
    lookup_key: plan.lookup_key,
    transfer_lookup_key: true,
  })
}

/**
 * Authenticate the calling dashboard user from the Authorization header
 * and confirm they own the brand. Returns { user, brand } or an error string.
 */
export async function authBrandOwner(supabase, req, brandId) {
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return { error: 'Not signed in' }
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return { error: 'Not signed in' }
  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .eq('user_id', user.id)
    .single()
  if (!brand) return { error: 'Not your brand' }
  return { user, brand }
}

export function tierFromLookupKey(lookupKey) {
  for (const group of Object.values(PLANS)) {
    for (const [tier, plan] of Object.entries(group)) {
      if (plan.lookup_key === lookupKey) return tier
    }
  }
  return null
}
