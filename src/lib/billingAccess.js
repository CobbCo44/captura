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

// True when the brand can use the dashboard: founding, or a live subscription
// (past_due keeps access while the owner fixes their card).
export function hasActivePlan(brand) {
  return isFoundingBrand(brand) || LIVE_STATUSES.includes(brand?.subscription_status)
}

// Growth-tier features: blasts, win-back emails.
export function hasGrowthFeatures(brand) {
  if (isFoundingBrand(brand)) return true
  return hasActivePlan(brand) && ['growth', 'pro'].includes(brand?.tier)
}
