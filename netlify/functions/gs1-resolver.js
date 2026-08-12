/**
 * GS1 Digital Link Resolver
 *
 * This Netlify Function handles all /01/{gtin} and /01/{gtin}/21/{serial} URLs.
 * It decides what to do based on the request:
 *
 *   1. Normal phone scan (no special params) → serve the existing consumer
 *      capture page exactly as before. Nothing changes for consumers.
 *
 *   2. ?linkType=gs1:sustainabilityInfo → redirect to the DPP passport page
 *      for that GTIN. This is how regulators or informed users reach the
 *      product passport.
 *
 *   3. Accept: application/linkset+json header → return a JSON linkset that
 *      lists every available link type for this product (capture page,
 *      passport page, brand homepage). Machines and GS1-conformant resolvers
 *      use this.
 *
 *   4. Bot user-agent (social previews) → return OG meta tags so links
 *      shared on iMessage, Slack, etc. show a nice preview.
 *
 *   5. Unknown GTIN or serial → clean mobile-friendly 404 page.
 */

import { createClient } from '@supabase/supabase-js'

// ---------- helpers ----------

const BOT_PATTERN =
  /bot|crawl|spider|preview|slurp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|iMessageLinkPrefetch|Applebot/i

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Parse GTIN and serial from a GS1 Digital Link path.
 * Supports:  /01/00614141123452/21/ABC123
 *            /01/00614141123452
 */
function parseGS1Path(pathname) {
  const serialMatch = pathname.match(/^\/01\/([^/]+)\/21\/([^/?]+)/)
  if (serialMatch) {
    return {
      gtin: serialMatch[1].replace(/\D/g, '').padStart(14, '0'),
      serial: serialMatch[2],
    }
  }
  const gtinMatch = pathname.match(/^\/01\/([^/]+)/)
  if (gtinMatch) {
    return {
      gtin: gtinMatch[1].replace(/\D/g, '').padStart(14, '0'),
      serial: null,
    }
  }
  return { gtin: null, serial: null }
}

/**
 * Look up the product and brand from Supabase.
 * Returns { product, brand } or null if not found.
 */
async function lookupProduct(supabase, gtin, serial) {
  // If we have a serial, try looking up via qr_codes first (matches existing flow)
  if (serial) {
    const { data } = await supabase
      .from('qr_codes')
      .select('*, products(name, description, gtin), brands:brand_id(id, name, logo_url, website)')
      .eq('short_id', serial)
      .single()
    if (data) {
      return { product: data.products, brand: data.brands }
    }
  }

  // Fall back to GTIN-level lookup
  const { data: prod } = await supabase
    .from('products')
    .select('name, description, gtin, brand_id')
    .eq('gtin', gtin)
    .single()
  if (!prod) return null

  const { data: br } = await supabase
    .from('brands')
    .select('id, name, logo_url, website')
    .eq('id', prod.brand_id)
    .single()

  return { product: prod, brand: br }
}

// ---------- response builders ----------

/** Return the SPA index.html so React Router handles the scan page */
async function serveSPA(origin) {
  const spaRes = await fetch(`${origin}/index.html`)
  return new Response(spaRes.body, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

/** Return OG meta tags for social-preview bots */
function serveOGMeta(url, product, brand) {
  const title = `${product.name || 'Product'} | ${brand?.name || 'Captura'}`
  const description = product.description
    ? product.description.slice(0, 160)
    : `Check out ${product.name} from ${brand?.name || 'Captura'}`
  const image = brand?.logo_url || `${url.origin}/images/hero-qr-box.png`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:url" content="${escapeHtml(url.href)}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
</head>
<body></body>
</html>`

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

/**
 * Return a GS1 Digital Link linkset (RFC 9264).
 * Lists every link type available for this product so machines can
 * discover the capture page, passport, and brand homepage.
 */
function serveLinkset(url, gtin, brand) {
  const origin = url.origin

  const linkset = {
    linkset: [
      {
        anchor: `${origin}/01/${gtin}`,
        // Consumer capture page (default interaction)
        'https://gs1.org/voc/defaultLink': [
          {
            href: `${origin}/01/${gtin}`,
            title: 'Product Page',
            type: 'text/html',
          },
        ],
        // Product passport / sustainability info
        'https://gs1.org/voc/sustainabilityInfo': [
          {
            href: `${origin}/passport/${gtin}`,
            title: 'Digital Product Passport',
            type: 'text/html',
          },
        ],
        // Machine-readable passport (JSON-LD)
        'https://gs1.org/voc/sustainabilityInfo+json-ld': [
          {
            href: `${origin}/passport/${gtin}.jsonld`,
            title: 'Digital Product Passport (JSON-LD)',
            type: 'application/ld+json',
          },
        ],
      },
    ],
  }

  // Add brand homepage link if the brand has a website
  if (brand?.website) {
    linkset.linkset[0]['https://gs1.org/voc/brandHomePage'] = [
      {
        href: brand.website,
        title: `${brand.name} Homepage`,
        type: 'text/html',
      },
    ]
  }

  return new Response(JSON.stringify(linkset, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/linkset+json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

/** Mobile-friendly 404 page */
function serve404(gtin) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Product Not Found</title>
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
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; margin-bottom: 8px; }
    p { font-size: 15px; color: #666; line-height: 1.5; }
    .gtin { font-family: monospace; background: #f0f0f0; padding: 2px 8px;
            border-radius: 4px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔍</div>
    <h1>Product Not Found</h1>
    <p>We couldn't find a product matching
       ${gtin ? `GTIN <span class="gtin">${escapeHtml(gtin)}</span>` : 'this code'}.</p>
    <p style="margin-top: 12px; font-size: 13px; color: #999;">
      If you scanned a QR code, it may not be registered yet.
    </p>
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
  const { gtin, serial } = parseGS1Path(url.pathname)

  // If we can't even parse a GTIN from the URL, 404
  if (!gtin) return serve404(null)

  const ua = req.headers.get('user-agent') || ''
  const accept = req.headers.get('accept') || ''
  const linkType = url.searchParams.get('linkType')

  // --- Route 1: Machine requesting a linkset ---
  // If the Accept header asks for linkset+json, return the linkset
  // regardless of other params. This is how GS1 conformant resolvers work.
  if (accept.includes('application/linkset+json')) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) return serve404(gtin)

    const supabase = createClient(supabaseUrl, supabaseKey)
    const result = await lookupProduct(supabase, gtin, serial)
    if (!result) return serve404(gtin)

    return serveLinkset(url, gtin, result.brand)
  }

  // --- Route 2: linkType=gs1:sustainabilityInfo → passport page ---
  if (linkType === 'gs1:sustainabilityInfo') {
    return Response.redirect(`${url.origin}/passport/${gtin}`, 307)
  }

  // --- Route 3: Bot → OG meta tags for social previews ---
  if (BOT_PATTERN.test(ua)) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) return serve404(gtin)

    const supabase = createClient(supabaseUrl, supabaseKey)
    const result = await lookupProduct(supabase, gtin, serial)
    if (!result) return serve404(gtin)

    return serveOGMeta(url, result.product, result.brand)
  }

  // --- Route 4: Default — normal phone scan → consumer capture page ---
  // Serve the SPA. React Router will load ScanPage as it always has.
  return serveSPA(url.origin)
}
