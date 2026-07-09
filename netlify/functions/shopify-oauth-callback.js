import { createClient } from '@supabase/supabase-js'

export default async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const shop = url.searchParams.get('shop')
  const state = url.searchParams.get('state') // brand_id

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
      return new Response(`<h1>Could not connect to Shopify</h1><p>${JSON.stringify(tokenData)}</p>`, {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      })
    }

    // Save token directly to Supabase if we have the service key and brand_id
    if (supabaseUrl && supabaseServiceKey && state) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      await supabase.from('brands').update({
        shopify_store: shop,
        shopify_token: tokenData.access_token,
      }).eq('id', state)
    }

    // Redirect back to Captura dashboard with success
    const dashboardUrl = `${process.env.URL || 'https://captura44.netlify.app'}/dashboard/settings`

    // If we saved to Supabase, just redirect with a success flag
    // If not, pass the token so the frontend can save it
    if (supabaseUrl && supabaseServiceKey && state) {
      return new Response(null, {
        status: 302,
        headers: { Location: `${dashboardUrl}?shopify=connected` },
      })
    } else {
      // Fallback: pass token via hash fragment so frontend can save it
      return new Response(null, {
        status: 302,
        headers: { Location: `${dashboardUrl}#shopify_token=${tokenData.access_token}&shopify_store=${shop}` },
      })
    }
  } catch (err) {
    return new Response(`<h1>Connection Error</h1><p>${err.message}</p>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}
