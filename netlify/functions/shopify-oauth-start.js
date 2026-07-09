export default async (req) => {
  const url = new URL(req.url)
  const shop = url.searchParams.get('shop')
  const brandId = url.searchParams.get('brand_id')

  if (!shop) {
    return new Response(JSON.stringify({ error: 'Missing shop parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Clean store name
  const store = shop
    .replace(/^https?:\/\//, '')
    .replace(/\.myshopify\.com.*$/, '')
    .replace(/\/$/, '')
    .trim()

  const clientId = process.env.SHOPIFY_CLIENT_ID
  if (!clientId) {
    return new Response(JSON.stringify({ error: 'SHOPIFY_CLIENT_ID not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const scopes = 'read_products,write_products,read_customers,write_customers'
  const redirectUri = 'https://captura44.netlify.app/.netlify/functions/shopify-oauth-callback'
  const state = brandId || ''

  const authUrl = `https://${store}.myshopify.com/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

  return new Response(null, {
    status: 302,
    headers: { Location: authUrl },
  })
}
