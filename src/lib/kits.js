export const KITS = [
  { id: 'field', name: 'Field', desc: 'Outdoor / tactical', bg: '#1A1A1A', card: '#242424', border: '#333333' },
  { id: 'heritage', name: 'Heritage', desc: 'Warm / classic', bg: '#1C1917', card: '#292524', border: '#44403C' },
  { id: 'clean', name: 'Clean', desc: 'Modern / minimal', bg: '#09090B', card: '#131316', border: '#27272A' },
  { id: 'night', name: 'Night', desc: 'Deep blue / premium', bg: '#0A0F1A', card: '#111827', border: '#1E293B' },
  { id: 'custom', name: 'Custom', desc: 'Pick your own colors', bg: '#0A0A0A', card: '#18181B', border: '#27272A' },
]

export function getKit(id, brand) {
  if (id === 'custom' && brand) {
    return {
      id: 'custom',
      name: 'Custom',
      bg: brand.kit_bg || '#0A0A0A',
      card: brand.kit_card || '#18181B',
      border: brand.kit_border || '#27272A',
    }
  }
  return KITS.find(k => k.id === id) || KITS[2]
}
