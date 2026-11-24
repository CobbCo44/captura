// Scan page kits: each is a complete look (surfaces, text, corner radius and a
// heading typeface), not just a background tint.
//   font/weight/transform/tracking style tile labels and section headings.
//   light: true means dark text on a light page.
//   glow: true adds a soft accent glow behind tiles.
//   storefrontOnly: the product scan page doesn't support it yet.
export const KITS = [
  {
    id: 'clean', name: 'Clean', desc: 'Modern and minimal',
    bg: '#09090B', card: '#141417', border: '#26262B', text: '#FAFAFA', muted: 'rgba(250,250,250,0.56)',
    radius: 18, font: 'Inter', weight: 700, transform: 'none', tracking: '-0.01em',
  },
  {
    id: 'heritage', name: 'Heritage', desc: 'Warm, classic serif',
    bg: '#15100C', card: '#221912', border: '#3B2D21', text: '#F5EADB', muted: 'rgba(245,234,219,0.6)',
    radius: 10, font: 'DM Serif Display', weight: 400, transform: 'none', tracking: '0',
  },
  {
    id: 'field', name: 'Field', desc: 'Rugged and condensed',
    bg: '#10120E', card: '#1A1D16', border: '#30352B', text: '#ECEADC', muted: 'rgba(236,234,220,0.58)',
    radius: 6, font: 'Barlow Condensed', weight: 700, transform: 'uppercase', tracking: '0.04em',
  },
  {
    id: 'night', name: 'Night', desc: 'Deep blue with a glow',
    bg: '#050913', card: '#0D1426', border: '#1B2744', text: '#EEF2FF', muted: 'rgba(238,242,255,0.58)',
    radius: 20, font: 'Sora', weight: 600, transform: 'none', tracking: '-0.01em', glow: true,
  },
  {
    id: 'daylight', name: 'Daylight', desc: 'Bright, light background',
    bg: '#F3F3F0', card: '#FFFFFF', border: '#E3E3DE', text: '#131313', muted: 'rgba(19,19,19,0.58)',
    radius: 18, font: 'Inter', weight: 700, transform: 'none', tracking: '-0.01em', light: true, storefrontOnly: true,
  },
  {
    id: 'custom', name: 'Custom', desc: 'Pick your own colors',
    bg: '#0A0A0A', card: '#18181B', border: '#27272A', text: '#FAFAFA', muted: 'rgba(250,250,250,0.56)',
    radius: 16, font: 'Inter', weight: 700, transform: 'none', tracking: '-0.01em',
  },
]

// Every kit typeface in one stylesheet (Inter is already on the page)
export const KIT_FONTS_URL = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Barlow+Condensed:wght@600;700&family=Sora:wght@500;600&display=swap'

export function isLightColor(hex) {
  const h = String(hex || '').replace('#', '')
  if (h.length < 6) return false
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
}

export function getKit(id, brand) {
  if (id === 'custom' && brand) {
    const base = KITS.find(k => k.id === 'custom')
    const bg = brand.kit_bg || base.bg
    const light = isLightColor(bg)
    return {
      ...base,
      bg,
      card: brand.kit_card || base.card,
      border: brand.kit_border || base.border,
      text: light ? '#131313' : '#FAFAFA',
      muted: light ? 'rgba(19,19,19,0.58)' : 'rgba(250,250,250,0.56)',
      light,
    }
  }
  return KITS.find(k => k.id === id) || KITS.find(k => k.id === 'clean')
}
