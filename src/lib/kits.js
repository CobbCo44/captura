export const KITS = [
  { id: 'field', name: 'Field', desc: 'Outdoor / tactical', bg: '#1A1A1A', card: '#242424', border: '#333333' },
  { id: 'heritage', name: 'Heritage', desc: 'Warm / classic', bg: '#1C1917', card: '#292524', border: '#44403C' },
  { id: 'clean', name: 'Clean', desc: 'Modern / minimal', bg: '#09090B', card: '#131316', border: '#27272A' },
  { id: 'night', name: 'Night', desc: 'Deep blue / premium', bg: '#0A0F1A', card: '#111827', border: '#1E293B' },
]

export function getKit(id) {
  return KITS.find(k => k.id === id) || KITS[2]
}
