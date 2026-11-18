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
    starter: { lookup_key: 'storefront_starter', name: 'MeetCaptura Storefront Starter', amount: 9900 },
    growth: { lookup_key: 'storefront_growth', name: 'MeetCaptura Storefront Growth', amount: 19900 },
    pro: { lookup_key: 'storefront_pro', name: 'MeetCaptura Storefront Pro', amount: 49900 },
  },
  // Brand plans: a platform fee that includes new contacts each month, then a
  // per-contact rate (a graduated, metered Stripe price on the same subscription).
  product: {
    starter: {
      lookup_key: 'product_starter', name: 'MeetCaptura Brand Launch', amount: 29900,
      usage: { lookup_key: 'product_starter_contacts', included: 300, unitCents: 100 },
    },
    growth: {
      lookup_key: 'product_growth', name: 'MeetCaptura Brand Growth', amount: 99900,
      usage: { lookup_key: 'product_growth_contacts', included: 1250, unitCents: 80 },
    },
  },
}

// Stripe meter that counts new opted-in contacts; report-contact-usage sends to it
export const CONTACT_METER_EVENT = 'captura_new_contact'

export async function ensureContactMeter(stripe) {
  const meters = await stripe.billing.meters.list({ status: 'active', limit: 100 })
  const found = meters.data.find(m => m.event_name === CONTACT_METER_EVENT)
  if (found) return found
  return stripe.billing.meters.create({
    display_name: 'New opted-in contacts',
    event_name: CONTACT_METER_EVENT,
    default_aggregation: { formula: 'sum' },
    customer_mapping: { type: 'by_id', event_payload_key: 'stripe_customer_id' },
    value_settings: { event_payload_key: 'value' },
  })
}

/**
 * The metered contacts price for a brand plan (first N free each month, then
 * the per-contact rate). Created on first use like ensurePrice; null for plans
 * without usage pricing.
 */
export async function ensureUsagePrice(stripe, plan) {
  const usage = plan.usage
  if (!usage) return null
  const existing = await stripe.prices.list({ lookup_keys: [usage.lookup_key], limit: 1, expand: ['data.tiers'] })
  const current = existing.data[0]
  if (current && current.tiers?.[0]?.up_to === usage.included && current.tiers?.[1]?.unit_amount === usage.unitCents) {
    return current
  }
  const meter = await ensureContactMeter(stripe)
  const productId = current
    ? (typeof current.product === 'object' ? current.product.id : current.product)
    : (await stripe.products.create({ name: 'MeetCaptura opted-in contacts', tax_code: SAAS_TAX_CODE })).id
  return stripe.prices.create({
    product: productId,
    currency: 'usd',
    nickname: `${usage.included} included, then $${(usage.unitCents / 100).toFixed(2)} each`,
    recurring: { interval: 'month', usage_type: 'metered', meter: meter.id },
    billing_scheme: 'tiered',
    tiers_mode: 'graduated',
    tiers: [
      { up_to: usage.included, unit_amount: 0 },
      { up_to: 'inf', unit_amount: usage.unitCents },
    ],
    lookup_key: usage.lookup_key,
    transfer_lookup_key: true,
  })
}

const isMetered = (item) => item?.price?.recurring?.usage_type === 'metered'
// The flat platform-fee item on a subscription (not the per-contact one)
export const baseItem = (sub) => sub.items?.data?.find(i => !isMetered(i)) || sub.items?.data?.[0]
export const usageItem = (sub) => sub.items?.data?.find(isMetered) || null

/**
 * Find the Stripe price for a plan by lookup_key, creating the product
 * and price on first use. Idempotent — no dashboard setup needed.
 */
// Stripe product tax code for "Software as a service (SaaS), business use".
// Required by Stripe Managed Payments, which handles sales tax for us.
export const SAAS_TAX_CODE = 'txcd_10103001'

export async function ensurePrice(stripe, plan) {
  const existing = await stripe.prices.list({ lookup_keys: [plan.lookup_key], limit: 1, expand: ['data.product'] })
  const current = existing.data[0]
  // Products created before the tax code was set get it now
  const currentProduct = current?.product
  if (currentProduct && typeof currentProduct === 'object' && !currentProduct.tax_code) {
    await stripe.products.update(currentProduct.id, { tax_code: SAAS_TAX_CODE })
  }
  if (current && current.unit_amount === plan.amount) return current
  // No price yet, or the catalog amount changed: create a price at the
  // current amount and move the lookup_key onto it. Existing subscribers
  // keep their old price (rate lock); new checkouts get the new one.
  const productId = currentProduct
    ? (typeof currentProduct === 'object' ? currentProduct.id : currentProduct)
    : (await stripe.products.create({ name: plan.name, tax_code: SAAS_TAX_CODE })).id
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

/**
 * The billing columns a Stripe subscription maps to on brands.
 * Used by the webhook and by sync-subscription so both write the same thing.
 */
export function brandUpdateFromSubscription(sub) {
  const update = {
    stripe_subscription_id: sub.id,
    subscription_status: sub.status === 'trialing' ? 'trialing'
      : sub.status === 'active' ? 'active'
      : (sub.status === 'past_due' || sub.status === 'unpaid') ? 'past_due'
      : (sub.status === 'canceled' || sub.status === 'incomplete_expired') ? 'canceled'
      : sub.status,
    trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    cancel_at: scheduledCancelAt(sub),
    billing_updated_at: new Date().toISOString(),
  }
  const base = baseItem(sub)
  const periodStart = sub.current_period_start ?? base?.current_period_start
  if (periodStart) update.current_period_start = new Date(periodStart * 1000).toISOString()
  const lookupKey = base?.price?.lookup_key
  const tier = tierFromLookupKey(lookupKey) || sub.metadata?.tier
  if (tier) update.tier = tier
  return update
}

// When a subscription is set to end (owner canceled in the portal), or null
function scheduledCancelAt(sub) {
  if (['canceled', 'incomplete_expired'].includes(sub.status)) return null
  const periodEnd = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end
  const at = sub.cancel_at ?? (sub.cancel_at_period_end ? periodEnd : null)
  return at ? new Date(at * 1000).toISOString() : null
}
