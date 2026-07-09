export default async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const shop = url.searchParams.get('shop')

  if (!code || !shop) {
    return new Response('<h1>Missing code or shop parameter</h1>', {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  // Exchange the auth code for an access token
  const clientId = 'd292f70eeecda96a0c1fb776a45099b9'

  // The client secret needs to be set as an environment variable
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET

  if (!clientSecret) {
    return new Response('<h1>SHOPIFY_CLIENT_SECRET env var not set</h1>', {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  try {
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    })

    const data = await response.json()

    if (data.access_token) {
      return new Response(`
        <html>
          <body style="font-family: sans-serif; padding: 40px; background: #1a1a1a; color: #fff;">
            <h1>Shopify Connected!</h1>
            <p>Copy this access token and paste it into Captura Settings:</p>
            <div style="background: #333; padding: 16px; border-radius: 8px; font-family: monospace; word-break: break-all; font-size: 18px; margin: 20px 0;">
              ${data.access_token}
            </div>
            <p>After copying, you can close this tab.</p>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      })
    } else {
      return new Response(`<h1>Error</h1><pre>${JSON.stringify(data, null, 2)}</pre>`, {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      })
    }
  } catch (err) {
    return new Response(`<h1>Error</h1><pre>${err.message}</pre>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}
