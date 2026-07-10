import { createClient } from '@supabase/supabase-js'

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

  // Generate a random nonce for CSRF protection
  const nonce = crypto.randomUUID()

  // Store the nonce and brand_id server-side so callback can verify
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl && supabaseServiceKey && brandId) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    await supabase.from('brands').update({
      shopify_nonce: nonce,
    }).eq('id', brandId)
  }

  // State encodes both brand_id and nonce
  const state = brandId ? `${brandId}:${nonce}` : ''

  const scopes = 'read_products,write_products,read_customers,write_customers'
  const redirectUri = 'https://captura44.netlify.app/.netlify/functions/shopify-oauth-callback'

  const authUrl = `https://${store}.myshopify.com/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`

  return new Response(null, {
    status: 302,
    headers: { Location: authUrl },
  })
}
