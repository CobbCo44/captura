import { derivePromoStatus } from './resolvePrimary'

/**
 * Resolves the single CTA card on the scan page.
 *
 * The job never changes: capture the contact. The promo only swaps
 * the headline, image, and button label.
 *
 * Returns null when visitor.captured is true (do not render the ask).
 *
 * @param {object} opts
 * @param {object|null} opts.promo   - promo record (start_at, end_at, active, etc.)
 * @param {object}      opts.visitor - { captured: boolean }
 * @returns {object|null}
 *   { pill, headline, subline, cta, action, image, useScrim }
 */
export function resolveCTA({ promo, visitor }) {
  if (visitor?.captured) return null

  if (promo && promo.active) {
    const status = derivePromoStatus(promo)

    if (status === 'live') {
      return {
        state: 'live',
        pill: 'live',
        headline: promo.title,
        subline: null,
        showCountdown: true,
        countdownTarget: promo.end_at,
        cta: 'Enter to win',
        formMode: 'promo',
        image: promo.image_url,
        useScrim: true,
      }
    }

    if (status === 'closed') {
      const endDate = new Date(promo.end_at)
      const dayStr = endDate.toLocaleDateString('en-US', { weekday: 'long' })
      return {
        state: 'closed',
        pill: 'closed',
        headline: promo.title,
        subline: `Winner drawn ${dayStr}`,
        showCountdown: false,
        countdownTarget: null,
        cta: 'Get notified',
        formMode: 'vip',
        image: promo.image_url,
        useScrim: true,
      }
    }

    if (status === 'winner') {
      return {
        state: 'winner',
        pill: 'winner',
        headline: `${promo.winner_name} won`,
        subline: promo.winner_city || null,
        showCountdown: false,
        countdownTarget: null,
        cta: 'Get the next one',
        formMode: 'vip',
        image: promo.image_url,
        useScrim: true,
      }
    }

    if (status === 'scheduled') {
      return {
        state: 'scheduled',
        pill: 'scheduled',
        headline: promo.title,
        subline: null,
        showCountdown: true,
        countdownTarget: promo.start_at,
        cta: 'Get the alert',
        formMode: 'vip',
        image: promo.image_url,
        useScrim: true,
      }
    }
  }

  // No promo — quiet VIP ask
  return {
    state: 'vip',
    pill: 'vip',
    headline: 'Join the list',
    subline: 'Drops, deals, and first access. For people who already own one.',
    showCountdown: false,
    countdownTarget: null,
    cta: 'Join the list',
    formMode: 'vip',
    image: null,
    useScrim: false,
  }
}
