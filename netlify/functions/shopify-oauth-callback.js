import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export default async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const shop = url.searchParams.get('shop')
  const state = url.searchParams.get('state') || ''
  const hmac = url.searchParams.get('hmac')

  if (!code || !shop) {
    return new Response('<h1>Authorization failed. Please try again from your Captura dashboard.</h1>', {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!clientId || !clientSecret) {
    return new Response('<h1>Shopify app not configured. Contact support.</h1>', {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  // Verify HMAC from Shopify
  if (hmac && clientSecret) {
    const params = new URLSearchParams(url.search)
    params.delete('hmac')
    params.sort()
    const message = params.toString()
    const expectedHmac = crypto.createHmac('sha256', clientSecret).update(message).digest('hex')
    if (hmac !== expectedHmac) {
      return new Response('<h1>Invalid request signature. Please try again.</h1>', {
        status: 403,
        headers: { 'Content-Type': 'text/html' },
      })
    }
  }

  // Parse state to get brand_id and nonce
  const [brandId, nonce] = state.split(':')

  // Verify nonce matches what we stored
  if (supabaseUrl && supabaseServiceKey && brandId && nonce) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: brand } = await supabase
      .from('brands')
      .select('shopify_nonce')
      .eq('id', brandId)
      .single()

    if (!brand || brand.shopify_nonce !== nonce) {
      return new Response('<h1>Invalid session. Please try connecting again from your Captura dashboard.</h1>', {
        status: 403,
        headers: { 'Content-Type': 'text/html' },
      })
    }
  }

  try {
    // Exchange auth code for access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      return new Response('<h1>Could not connect to Shopify. Please try again.</h1>', {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      })
    }

    // Save token directly to Supabase and clear the nonce
    const dashboardUrl = 'https://captura44.netlify.app/dashboard/settings'

    if (supabaseUrl && supabaseServiceKey && brandId) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      await supabase.from('brands').update({
        shopify_store: shop,
        shopify_token: tokenData.access_token,
        shopify_nonce: null,
      }).eq('id', brandId)

      return new Response(null, {
        status: 302,
        headers: { Location: `${dashboardUrl}?shopify=connected` },
      })
    } else {
      // If we can't save server-side, show error instead of leaking token
      return new Response('<h1>Server configuration error. Contact support.</h1>', {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      })
    }
  } catch (err) {
    return new Response('<h1>Connection error. Please try again.</h1>', {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}
