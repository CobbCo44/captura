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
    const { brandName, scans, vipMembers, promoEntries, products } = await req.json()

    const prompt = `You are an analytics expert for a consumer engagement platform called Captura. A brand uses QR codes on their products to track consumer engagement.

Analyze this data for the brand "${brandName}" and generate a concise weekly insights report. Be direct and actionable. Do not use em dashes. Use commas, periods, or short sentences instead.

DATA:
- Total Scans: ${scans.length}
- Products: ${JSON.stringify(products.map(p => ({ name: p.name, sku: p.sku })))}
- VIP Members: ${vipMembers.length}
- Promo Entries: ${promoEntries.length}

Scan breakdown by product:
${(() => {
  const byProduct = {}
  scans.forEach(s => {
    const name = s.products?.name || 'Unknown'
    if (!byProduct[name]) byProduct[name] = { scans: 0, cities: new Set() }
    byProduct[name].scans++
    if (s.city) byProduct[name].cities.add(s.city)
  })
  return Object.entries(byProduct).map(([name, data]) =>
    `  ${name}: ${data.scans} scans in ${data.cities.size} cities (${[...data.cities].join(', ')})`
  ).join('\n')
})()}

Scan breakdown by city:
${(() => {
  const byCity = {}
  scans.forEach(s => { if (s.city) byCity[s.city] = (byCity[s.city] || 0) + 1 })
  return Object.entries(byCity).sort((a, b) => b[1] - a[1]).map(([city, count]) =>
    `  ${city}: ${count} scans`
  ).join('\n')
})()}

VIP conversion rate: ${scans.length > 0 ? Math.round((vipMembers.length / scans.length) * 100) : 0}%

Recent scan timestamps (last 20):
${scans.slice(0, 20).map(s => `  ${s.scanned_at} - ${s.products?.name || 'Unknown'} - ${s.city || 'Unknown'}`).join('\n')}

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
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
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
