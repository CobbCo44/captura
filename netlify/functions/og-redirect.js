import { createClient } from '@supabase/supabase-js'

const BOT_PATTERN = /bot|crawl|spider|preview|slurp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|iMessageLinkPrefetch|Applebot/i

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default async (req) => {
  const ua = req.headers.get('user-agent') || ''

  // Not a bot — let it fall through to index.html
  if (!BOT_PATTERN.test(ua)) {
    const origin = new URL(req.url).origin
    const spaRes = await fetch(`${origin}/index.html`)
    return new Response(spaRes.body, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const url = new URL(req.url)
  const path = url.pathname

  // Parse QR URL patterns
  let shortId = null
  let gtinRaw = null

  const shortMatch = path.match(/^\/s\/([a-zA-Z0-9]+)/)
  const gs1SerialMatch = path.match(/^\/01\/([^/]+)\/21\/([a-zA-Z0-9]+)/)
  const gs1Match = path.match(/^\/01\/([^/]+)$/)

  if (shortMatch) shortId = shortMatch[1]
  else if (gs1SerialMatch) { gtinRaw = gs1SerialMatch[1]; shortId = gs1SerialMatch[2] }
  else if (gs1Match) gtinRaw = gs1Match[1]
  else return

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    let product = null
    let brand = null

    if (shortId) {
      const { data } = await supabase
        .from('qr_codes')
        .select('*, products(name, description, image_url), brands:brand_id(name, logo_url)')
        .eq('short_id', shortId)
        .single()
      if (data) {
        product = data.products
        brand = data.brands
      }
    }

    if (!product && gtinRaw) {
      const gtin = gtinRaw.replace(/\D/g, '').padStart(14, '0')
      const { data: prod } = await supabase
        .from('products')
        .select('name, description, image_url, brand_id')
        .eq('gtin', gtin)
        .single()
      if (prod) {
        product = prod
        const { data: br } = await supabase
          .from('brands')
          .select('name, logo_url')
          .eq('id', prod.brand_id)
          .single()
        brand = br
      }
    }

    if (!product) return

    const title = `${product.name || 'Product'} | ${brand?.name || 'Captura'}`
    const description = product.description
      ? product.description.slice(0, 160)
      : `Check out ${product.name} from ${brand?.name || 'Captura'}`
    const image = product.image_url || brand?.logo_url || `${url.origin}/images/hero-qr-box.png`

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
  } catch {
    return
  }
}
