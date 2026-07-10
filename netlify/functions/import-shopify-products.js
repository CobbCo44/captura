import { createClient } from '@supabase/supabase-js'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { brandId } = await req.json()

    if (!brandId) {
      return new Response(JSON.stringify({ error: 'Missing brandId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify the user is authenticated and owns this brand
    const authHeader = req.headers.get('Authorization')
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify JWT and check brand ownership
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Look up brand and verify ownership
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const { data: brand } = await adminClient
      .from('brands')
      .select('shopify_store, shopify_token, user_id')
      .eq('id', brandId)
      .single()

    if (!brand || brand.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!brand.shopify_store || !brand.shopify_token) {
      return new Response(JSON.stringify({ error: 'Shopify not connected' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const store = brand.shopify_store
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
          'X-Shopify-Access-Token': brand.shopify_token,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error('Shopify products error:', errText)
        return new Response(JSON.stringify({ error: 'Failed to fetch Shopify products' }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const data = await response.json()
      allProducts = allProducts.concat(data.products || [])

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
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
