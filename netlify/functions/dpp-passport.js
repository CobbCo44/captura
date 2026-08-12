/**
 * DPP Passport — serves passport data for a GTIN in two formats:
 *
 *   1. HTML (default) — a mobile-first passport page for humans.
 *      Shows product name, brand, GTIN, last updated date, and all
 *      current attributes in clean, readable cards.
 *
 *   2. JSON-LD (for machines) — structured data using schema.org
 *      Product vocabulary. Returned when the request has:
 *        - Accept: application/ld+json header, OR
 *        - URL ends in .jsonld (e.g. /passport/00812345678906.jsonld)
 *
 * Both formats only show attributes where is_current = true.
 */

import { createClient } from '@supabase/supabase-js'

// ---------- helpers ----------

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Parse the GTIN from the path. Handles /passport/{gtin} and /passport/{gtin}.jsonld */
function parsePassportPath(pathname) {
  const match = pathname.match(/\/passport\/(\d{8,14})(\.jsonld)?$/)
  if (!match) return { gtin: null, wantsJsonLd: false }
  return {
    gtin: match[1].padStart(14, '0'),
    wantsJsonLd: !!match[2],
  }
}

/** Turn an attribute_key like "material_composition" into "Material Composition" */
function formatLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Turn a JSONB attribute_value into readable HTML.
 * Handles strings, numbers, arrays, and objects.
 */
function renderValue(value) {
  if (value === null || value === undefined) return '—'

  // Array → bulleted list
  if (Array.isArray(value)) {
    const items = value.map(v => `<li>${escapeHtml(String(v))}</li>`).join('')
    return `<ul style="margin:0;padding-left:18px;">${items}</ul>`
  }

  // Object → key-value pairs
  if (typeof value === 'object') {
    const rows = Object.entries(value)
      .map(([k, v]) => {
        const label = formatLabel(k)
        const display = typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)
        return `<div style="margin-bottom:4px;"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(display)}</div>`
      })
      .join('')
    return rows
  }

  // String or number
  return escapeHtml(String(value))
}

// ---------- data fetching ----------

async function getPassportData(gtin) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return null

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Get the DPP product record with brand info
  const { data: product } = await supabase
    .from('dpp_products')
    .select('*, brands:brand_id(name, logo_url)')
    .eq('gtin', gtin)
    .single()

  if (!product) return null

  // Get all current attributes (is_current = true)
  const { data: attributes } = await supabase
    .from('dpp_attributes')
    .select('*')
    .eq('product_id', product.id)
    .eq('is_current', true)
    .order('attribute_key')

  return { product, attributes: attributes || [] }
}

// ---------- JSON-LD builder ----------

/**
 * Build a schema.org Product JSON-LD with GS1 vocabulary terms.
 * Maps common DPP attribute keys to their schema.org equivalents.
 */
function buildJsonLd(product, attributes, origin) {
  const jsonLd = {
    '@context': {
      '@vocab': 'https://schema.org/',
      'gs1': 'https://gs1.org/voc/',
    },
    '@type': 'Product',
    'name': product.product_name,
    'gtin': product.gtin,
    'brand': {
      '@type': 'Brand',
      'name': product.brands?.name || 'Unknown',
    },
    'url': `${origin}/passport/${product.gtin}`,
    'dateModified': product.updated_at,
  }

  // Map attributes to schema.org / GS1 terms where possible
  const schemaMap = {
    'material_composition': 'material',
    'country_of_origin': 'countryOfOrigin',
    'weight_grams': 'weight',
    'care_instructions': 'gs1:careInstructions',
    'recyclability': 'gs1:recyclabilityInfo',
    'substances_of_concern': 'gs1:substancesOfConcern',
    'repair_info': 'gs1:repairInfo',
  }

  // Add a structured additionalProperty array for all attributes
  // This ensures every attribute is machine-readable even if
  // there isn't a direct schema.org mapping
  const additionalProperties = []

  for (const attr of attributes) {
    const schemaKey = schemaMap[attr.attribute_key]

    // If there's a direct schema.org mapping, set it at top level
    if (schemaKey) {
      jsonLd[schemaKey] = attr.attribute_value
    }

    // Always include in additionalProperty for completeness
    additionalProperties.push({
      '@type': 'PropertyValue',
      'name': attr.attribute_key,
      'value': attr.attribute_value,
      'gs1:version': attr.version,
    })
  }

  if (additionalProperties.length > 0) {
    jsonLd.additionalProperty = additionalProperties
  }

  return jsonLd
}

// ---------- HTML builder ----------

function buildHtmlPage(product, attributes, origin) {
  const brand = product.brands || {}
  const updatedDate = new Date(product.updated_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // Group attributes into cards
  const attributeCards = attributes.map(attr => {
    const label = formatLabel(attr.attribute_key)
    const value = renderValue(attr.attribute_value)
    return `
      <div class="attr-card">
        <div class="attr-label">${escapeHtml(label)}</div>
        <div class="attr-value">${value}</div>
        <div class="attr-version">v${attr.version}</div>
      </div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(product.product_name)} — Digital Product Passport</title>
  <meta name="description" content="Digital Product Passport for ${escapeHtml(product.product_name)}" />
  <link rel="canonical" href="${origin}/passport/${product.gtin}" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f7;
      color: #1a1a1a;
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }

    .passport {
      max-width: 480px;
      margin: 0 auto;
      padding: 20px 16px 40px;
    }

    /* Header badge */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #e8f5e9;
      color: #2e7d32;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 20px;
      margin-bottom: 16px;
      letter-spacing: 0.02em;
    }
    .badge svg { flex-shrink: 0; }

    /* Product header */
    .product-header {
      background: #fff;
      border-radius: 16px;
      padding: 24px 20px;
      margin-bottom: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }

    .brand-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }

    .brand-logo {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      object-fit: contain;
      background: #f0f0f0;
    }

    .brand-name {
      font-size: 14px;
      font-weight: 600;
      color: #666;
    }

    .product-name {
      font-size: 22px;
      font-weight: 700;
      line-height: 1.3;
      margin-bottom: 12px;
    }

    .meta-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .meta-item {
      font-size: 12px;
      color: #888;
    }

    .meta-item strong {
      color: #555;
      font-weight: 600;
    }

    /* Attribute cards */
    .attr-card {
      background: #fff;
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 10px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      position: relative;
    }

    .attr-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #888;
      margin-bottom: 8px;
    }

    .attr-value {
      font-size: 15px;
      line-height: 1.5;
      color: #1a1a1a;
    }

    .attr-value ul {
      list-style: disc;
    }

    .attr-value li {
      margin-bottom: 2px;
    }

    .attr-version {
      position: absolute;
      top: 14px;
      right: 16px;
      font-size: 10px;
      color: #bbb;
      font-weight: 500;
    }

    /* Footer */
    .footer {
      text-align: center;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
    }

    .footer p {
      font-size: 12px;
      color: #aaa;
      line-height: 1.6;
    }

    .footer a {
      color: #888;
      text-decoration: none;
    }

    .json-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #666;
      text-decoration: none;
      margin-top: 8px;
      padding: 6px 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
    }
    .json-link:hover { background: #f5f5f5; }
  </style>
</head>
<body>
  <div class="passport">
    <div class="badge">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      DPP-Ready
    </div>

    <div class="product-header">
      <div class="brand-row">
        ${brand.logo_url
          ? `<img class="brand-logo" src="${escapeHtml(brand.logo_url)}" alt="${escapeHtml(brand.name)}" />`
          : ''
        }
        <span class="brand-name">${escapeHtml(brand.name || 'Unknown Brand')}</span>
      </div>
      <h1 class="product-name">${escapeHtml(product.product_name)}</h1>
      <div class="meta-row">
        <div class="meta-item"><strong>GTIN</strong> ${escapeHtml(product.gtin)}</div>
        <div class="meta-item"><strong>Updated</strong> ${escapeHtml(updatedDate)}</div>
      </div>
    </div>

    ${attributeCards}

    <div class="footer">
      <p>Digital Product Passport powered by <a href="${origin}">MeetCaptura</a></p>
      <a class="json-link" href="${origin}/passport/${product.gtin}.jsonld">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
        </svg>
        View as JSON-LD
      </a>
    </div>
  </div>
</body>
</html>`
}

// ---------- 404 ----------

function serve404(gtin) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Passport Not Found</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; padding: 24px;
      background: #f8f9fa; color: #1a1a1a;
    }
    .card {
      background: #fff; border-radius: 16px; padding: 40px 24px;
      max-width: 400px; width: 100%; text-align: center;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
    h1 { font-size: 20px; margin-bottom: 8px; }
    p { font-size: 15px; color: #666; line-height: 1.5; }
    .gtin { font-family: monospace; background: #f0f0f0; padding: 2px 8px;
            border-radius: 4px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Passport Not Found</h1>
    <p>No Digital Product Passport exists for
       ${gtin ? `GTIN <span class="gtin">${escapeHtml(gtin)}</span>` : 'this product'} yet.</p>
  </div>
</body>
</html>`

  return new Response(html, {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// ---------- main handler ----------

export default async (req) => {
  const url = new URL(req.url)
  const { gtin, wantsJsonLd } = parsePassportPath(url.pathname)

  if (!gtin) return serve404(null)

  const data = await getPassportData(gtin)
  if (!data) return serve404(gtin)

  const { product, attributes } = data
  const accept = req.headers.get('accept') || ''

  // Serve JSON-LD if requested via header or .jsonld extension
  if (wantsJsonLd || accept.includes('application/ld+json')) {
    const jsonLd = buildJsonLd(product, attributes, url.origin)
    return new Response(JSON.stringify(jsonLd, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/ld+json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  // Default: serve HTML passport page
  const html = buildHtmlPage(product, attributes, url.origin)
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
