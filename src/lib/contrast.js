/**
 * Returns '#FFFFFF' or '#000000' — whichever has better WCAG contrast
 * against the given hex background color.
 */
export function inkFor(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)

  return L > 0.179 ? '#000000' : '#FFFFFF'
}
