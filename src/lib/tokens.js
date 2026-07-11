import { getKit } from './kits'

/**
 * Builds the full CSS custom-property map for a scan page.
 * Set these on the page root with style={buildTokens(brand)}.
 * Every visual value in the scan page reads from these — zero hardcoded hex.
 */
export function buildTokens(brand) {
  const kit = getKit(brand?.kit)
  const accent = brand?.accent_hex || '#FAFAFA'
  const ink = brand?.accent_ink_hex || '#09090B'

  return {
    '--t-bg': kit.bg,
    '--t-card': kit.card,
    '--t-border': kit.border,
    '--t-text': kit.text,
    '--t-muted': kit.muted,
    '--t-radius': `${kit.radius}px`,
    '--t-accent': accent,
    '--t-accent-ink': ink,
  }
}
