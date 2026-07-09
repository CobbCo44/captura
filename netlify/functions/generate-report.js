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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
