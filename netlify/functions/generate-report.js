import { createClient } from '@supabase/supabase-js'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Verify authentication
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseAnonKey) {
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  try {
    const { brandName, summary } = await req.json()

    const prompt = `You are an analytics expert for Captura, a consumer engagement platform where brands use QR codes on products to track engagement.

Analyze this pre-summarized data for "${brandName}" and generate a concise weekly insights report. Be direct and actionable. Do not use em dashes. Use commas, periods, or short sentences instead.

${summary}

Generate a report with these sections:
1. **Performance Summary** - Key numbers and what they mean
2. **Top Products** - Which products are getting the most engagement and why that matters
3. **Geographic Hotspots** - Where scans are concentrated and what to do about it
4. **VIP Conversion** - How well scans are converting to VIP signups, with suggestions to improve
5. **Recommendations** - 3 specific, actionable things the brand should do this week

Keep it concise. No fluff. Write like you are advising a brand owner who wants to grow.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Claude API error:', err)
      return new Response(JSON.stringify({ error: 'Failed to generate report' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const report = data.content[0].text

    return new Response(JSON.stringify({ report }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Report generation error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
