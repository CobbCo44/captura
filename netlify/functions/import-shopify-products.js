export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { shopifyStore, shopifyToken } = await req.json()

    if (!shopifyStore || !shopifyToken) {
      return new Response(JSON.stringify({ error: 'Missing store or token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const store = shopifyStore
      .replace(/^https?:\/\//, '')
      .replace(/\.myshopify\.com.*$/, '')
      .replace(/\/$/, '')
      .trim()

    // Fetch all products with pagination
    let allProducts = []
    let nextPageUrl = `https://${store}.myshopify.com/admin/api/2024-01/products.json?limit=250&status=active`

    while (nextPageUrl) {
      const response = await fetch(nextPageUrl, {
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error('Shopify products error:', errText)
        return new Response(JSON.stringify({ error: 'Failed to fetch Shopify products', details: errText }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const data = await response.json()
      allProducts = allProducts.concat(data.products || [])

      // Check for next page via Link header
      const linkHeader = response.headers.get('Link') || ''
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
      nextPageUrl = nextMatch ? nextMatch[1] : null
    }

    const products = allProducts.map(p => ({
      shopify_id: String(p.id),
      name: p.title,
      description: p.body_html ? p.body_html.replace(/<[^>]*>/g, '') : '',
      sku: p.variants?.[0]?.sku || '',
      image_url: p.image?.src || null,
      images: (p.images || []).map(img => img.src),
      handle: p.handle,
      shopify_url: `https://${store}.myshopify.com/products/${p.handle}`,
      variants: (p.variants || []).map(v => ({
        id: String(v.id),
        title: v.title,
        sku: v.sku,
        price: v.price,
      })),
    }))

    return new Response(JSON.stringify({ products }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Shopify import error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
