// Edge function that intercepts QR scan URLs and returns dynamic OG tags
// for link preview bots (iMessage, Facebook, Twitter, Slack, etc.)
// Real users get passed through to the React app.

const BOT_PATTERN = /bot|crawl|spider|preview|slurp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|iMessageLinkPrefetch|Applebot/i

export default async (request, context) => {
  const ua = request.headers.get('user-agent') || ''

  // Not a bot — let the request pass through to the React app
  if (!BOT_PATTERN.test(ua)) {
    return context.next()
  }

  const url = new URL(request.url)
  const path = url.pathname

  // Parse the QR URL pattern
  let shortId = null
  let gtinRaw = null

  const shortMatch = path.match(/^\/s\/([a-zA-Z0-9]+)$/)
  const gs1SerialMatch = path.match(/^\/01\/([^/]+)\/21\/([a-zA-Z0-9]+)$/)
  const gs1Match = path.match(/^\/01\/([^/]+)$/)

  if (shortMatch) {
    shortId = shortMatch[1]
  } else if (gs1SerialMatch) {
    gtinRaw = gs1SerialMatch[1]
    shortId = gs1SerialMatch[2]
  } else if (gs1Match) {
    gtinRaw = gs1Match[1]
  } else {
    return context.next()
  }

  // Query Supabase for the product/brand info
  const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL') || Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('VITE_SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    return context.next()
  }

  try {
    let qr = null

    // Lookup by short_id first
    if (shortId) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/qr_codes?short_id=eq.${shortId}&select=*,products(name,description,image_url),brands:brand_id(name,logo_url)`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      )
      const data = await res.json()
      if (data?.length > 0) qr = data[0]
    }

    // Fallback: lookup by GTIN
    if (!qr && gtinRaw) {
      const gtin = gtinRaw.replace(/\D/g, '').padStart(14, '0')
      const prodRes = await fetch(
        `${supabaseUrl}/rest/v1/products?gtin=eq.${gtin}&select=id,name,description,image_url,brand_id`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      )
      const products = await prodRes.json()
      if (products?.length > 0) {
        const prod = products[0]
        const brandRes = await fetch(
          `${supabaseUrl}/rest/v1/brands?id=eq.${prod.brand_id}&select=name,logo_url`,
          { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
        )
        const brands = await brandRes.json()
        qr = {
          products: prod,
          brands: brands?.[0] || null,
        }
      }
    }

    if (!qr) {
      return context.next()
    }

    const productName = qr.products?.name || 'Product'
    const brandName = qr.brands?.name || 'Captura'
    const description = qr.products?.description
      ? qr.products.description.slice(0, 160)
      : `Check out ${productName} from ${brandName}`
    const image = qr.products?.image_url || qr.brands?.logo_url || `${url.origin}/images/hero-qr-box.png`
    const title = `${productName} | ${brandName}`

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
  <meta http-equiv="refresh" content="0;url=${escapeHtml(url.href)}" />
</head>
<body></body>
</html>`

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch {
    return context.next()
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

