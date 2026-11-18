// Who gets access to what, shared by the dashboard and the Netlify functions.
// Pure functions only: this file is bundled into both.

// Brands created before this moment are founding accounts: every feature
// unlocked without a subscription. Anything created after must pick a plan.
export const FOUNDING_CUTOFF = '2026-11-18T00:00:00Z'

const LIVE_STATUSES = ['trialing', 'active', 'past_due']

export function isFoundingBrand(brand) {
  if (!brand || brand.subscription_status) return false
  if (!brand.created_at) return false
  return new Date(brand.created_at) < new Date(FOUNDING_CUTOFF)
}

// A plan given for free by an admin (no Stripe): 'starter' | 'growth' | 'pro'
export function compTier(brand) {
  return ['starter', 'growth', 'pro'].includes(brand?.comp_tier) ? brand.comp_tier : null
}

// The tier whose features apply: a free plan wins over a paid one
export function effectiveTier(brand) {
  return compTier(brand) || brand?.tier || null
}

// True when the brand can use the dashboard: founding, a free plan, or a live
// subscription (past_due keeps access while the owner fixes their card).
export function hasActivePlan(brand) {
  return isFoundingBrand(brand) || !!compTier(brand) || LIVE_STATUSES.includes(brand?.subscription_status)
}

// Growth-tier features: blasts, win-back emails.
export function hasGrowthFeatures(brand) {
  if (isFoundingBrand(brand)) return true
  return hasActivePlan(brand) && ['growth', 'pro'].includes(effectiveTier(brand))
}

// Which plan each storefront feature needs. Product brands aren't gated here yet.
const TIER_RANK = { starter: 1, growth: 2, pro: 3 }
export const STOREFRONT_FEATURES = {
  promos: { tier: 'growth', name: 'Giveaways and promos' },
  customerExport: { tier: 'growth', name: 'Downloading your customer list' },
  emailMarketing: { tier: 'growth', name: 'Email marketing' },
  winback: { tier: 'growth', name: '"We miss you" emails' },
  insights: { tier: 'pro', name: 'Insights and reports' },
  shopify: { tier: 'pro', name: 'Shopify' },
  multiLocation: { tier: 'pro', name: 'More than one location' },
}

export function canUseFeature(brand, feature) {
  if (!brand || brand.id === 'demo') return true
  if (brand.business_type !== 'storefront') return true
  if (isFoundingBrand(brand)) return true
  if (!hasActivePlan(brand)) return false
  const needed = STOREFRONT_FEATURES[feature]?.tier || 'starter'
  return (TIER_RANK[effectiveTier(brand)] || 0) >= TIER_RANK[needed]
}

// Storefront locations included in the plan (Pro: up to 5)
export function locationLimit(brand) {
  return canUseFeature(brand, 'multiLocation') ? 5 : 1
}
