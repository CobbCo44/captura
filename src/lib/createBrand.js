import { supabase } from './supabase'

// Bump this string when counsel revises the Terms of Service / Privacy Policy.
// Recorded on the auth user metadata at signup and on the brand record,
// so we always know which version each account agreed to.
export const TERMS_VERSION = '2026-08-24.v1'

/**
 * Create a brand for a user, pulling signup details from auth user metadata.
 * Used by the signup flow (session available immediately) and by the
 * Dashboard's first-load auto-create (email-confirmation flow, where the
 * brand couldn't be created until the user's first authenticated visit).
 */
export async function createBrandForUser(user) {
  const meta = user.user_metadata || {}
  return supabase.from('brands').insert({
    user_id: user.id,
    name: meta.brand_name || 'My Brand',
    email: user.email,
    business_type: meta.business_type === 'storefront' ? 'storefront' : 'product',
    tier: 'starter',
    owner_name: meta.owner_name || null,
    owner_phone: meta.owner_phone || null,
    terms_accepted_at: meta.terms_accepted_at || null,
    terms_version: meta.terms_version || null,
  }).select().single()
}
