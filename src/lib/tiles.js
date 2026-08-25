import { supabase } from './supabase'

// Native tile definitions per scan page. Order here IS the default layout —
// it must match what the pages rendered before the tile system existed,
// so a brand that never touches Scan Page settings sees zero change.
export const STOREFRONT_TILES = [
  { key: 'promo', name: 'Giveaway / Promo', big: true },
  { key: 'video', name: 'Video', big: true },
  { key: 'winner', name: 'Last Winner' },
  { key: 'loyalty', name: 'Loyalty' },
  { key: 'menu', name: 'Menu' },
  { key: 'hours', name: 'Hours' },
  { key: 'locations', name: 'Locations' },
  { key: 'follow', name: 'Follow Us' },
]

export const PRODUCT_TILES = [
  { key: 'promo', name: 'Giveaway / Promo', big: true },
  { key: 'video', name: 'Product Video', big: true },
  { key: 'reorder', name: 'Reorder' },
  { key: 'warranty', name: 'Warranty' },
  { key: 'winner', name: 'Last Winner' },
  { key: 'loyalty', name: 'Loyalty' },
]

export function nativeTilesFor(context) {
  return context === 'product' ? PRODUCT_TILES : STOREFRONT_TILES
}

// Pre-tile-system behavior: label QRs hid the loyalty tile.
function defaultEnabled(key, context) {
  if (context === 'label' && key === 'loyalty') return false
  return true
}

/**
 * Merge saved tile_settings rows with native defs and active custom tiles
 * into one ordered list of {key, enabled, custom?}.
 * No saved rows -> the exact pre-tile-system layout.
 */
export function resolveTileOrder(rows, context, customTiles) {
  const native = nativeTilesFor(context)
  const activeCustom = (customTiles || []).filter(t => t.is_active)
  const customByKey = Object.fromEntries(activeCustom.map(t => [`custom:${t.id}`, t]))

  if (!rows || rows.length === 0) {
    return [
      ...native.map(t => ({ key: t.key, enabled: defaultEnabled(t.key, context) })),
      ...activeCustom
        .slice()
        .sort((a, b) => a.sort - b.sort)
        .map(t => ({ key: `custom:${t.id}`, enabled: true, custom: t })),
    ]
  }

  const ordered = []
  const seen = new Set()
  for (const row of rows.slice().sort((a, b) => a.sort - b.sort)) {
    seen.add(row.tile_key)
    if (row.tile_key.startsWith('custom:')) {
      const tile = customByKey[row.tile_key]
      if (tile) ordered.push({ key: row.tile_key, enabled: row.enabled, custom: tile })
    } else if (native.some(t => t.key === row.tile_key)) {
      ordered.push({ key: row.tile_key, enabled: row.enabled })
    }
  }
  // Native tiles added after the brand last saved: append, default state
  for (const t of native) {
    if (!seen.has(t.key)) ordered.push({ key: t.key, enabled: defaultEnabled(t.key, context) })
  }
  // Custom tiles created after the last save: append enabled
  for (const t of activeCustom) {
    if (!seen.has(`custom:${t.id}`)) ordered.push({ key: `custom:${t.id}`, enabled: true, custom: t })
  }
  return ordered
}

/**
 * Load tile settings + custom tiles for a brand/context.
 * Fails soft: any error (e.g. migration not applied yet) returns the
 * defaults so scan pages never break.
 */
export async function loadTileConfig(brandId, context, productId = null) {
  try {
    let query = supabase.from('tile_settings').select('tile_key, enabled, sort, product_id')
      .eq('brand_id', brandId).eq('context', context)
    query = productId
      ? query.or(`product_id.eq.${productId},product_id.is.null`)
      : query.is('product_id', null)
    const [settingsRes, customRes] = await Promise.all([
      query,
      supabase.from('custom_tiles').select('*')
        .eq('brand_id', brandId).eq('is_active', true).order('sort'),
    ])
    const rows = settingsRes.data || []
    // A product with its own rows overrides the brand-wide (null) set
    const productRows = productId ? rows.filter(r => r.product_id === productId) : []
    const brandRows = rows.filter(r => !r.product_id)
    return resolveTileOrder(productRows.length ? productRows : brandRows, context, customRes.data || [])
  } catch {
    return resolveTileOrder([], context, [])
  }
}
