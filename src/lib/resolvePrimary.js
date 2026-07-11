/**
 * Primary-slot resolver.
 *
 * Determines which content fills the single primary card on the scan page.
 * Exactly one state is returned. The promo lifecycle is derived from
 * start_at / end_at / winner_announced_at — never stored.
 *
 * @param {object} opts
 * @param {object|null} opts.promo         - The promo record (must have start_at, end_at, active, winner_announced_at)
 * @param {object|null} opts.product       - The product record (needs product_type, warranty_enabled)
 * @param {boolean}     opts.warrantyRegistered - Has this visitor already registered warranty?
 * @param {boolean}     opts.knownVisitor  - Has this visitor been seen before (VIP, promo entry, warranty)?
 * @returns {string} One of: PROMO_LIVE, PROMO_CLOSED, PROMO_WINNER, PROMO_NEXT, WARRANTY, VIP, WELCOME_BACK
 */
export function resolvePrimary({ promo, product, warrantyRegistered, knownVisitor }) {
  // Promo path — only if active (visible to consumers)
  if (promo && promo.active) {
    const status = derivePromoStatus(promo)
    if (status === 'live')      return 'PROMO_LIVE'
    if (status === 'closed')    return 'PROMO_CLOSED'
    if (status === 'winner')    return 'PROMO_WINNER'
    if (status === 'scheduled') return 'PROMO_NEXT'
  }

  // No promo — fall back based on visitor + product state
  if (knownVisitor) {
    if (product?.warranty_enabled && !warrantyRegistered) return 'WARRANTY'
    return 'WELCOME_BACK'
  }

  // Unknown visitor
  if (product?.product_type === 'durable' && product?.warranty_enabled) return 'WARRANTY'
  return 'VIP'
}

/**
 * Derives promo status from temporal fields. Never stored.
 *
 * now < start_at                       -> scheduled
 * start_at <= now <= end_at            -> live
 * now > end_at && !winner_announced_at -> closed
 * winner_announced_at set              -> winner
 */
export function derivePromoStatus(promo) {
  if (!promo) return null
  const now = new Date()
  const start = new Date(promo.start_at)
  const end = new Date(promo.end_at)

  if (promo.winner_announced_at) return 'winner'
  if (now < start) return 'scheduled'
  if (now >= start && now <= end) return 'live'
  return 'closed'
}
