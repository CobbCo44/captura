import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

function renderBold(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: '#FAFAFA' }}>{part}</strong> : part)
}

const DATE_RANGES = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
  { label: 'All Time', value: null },
]

export default function Insights({ brand }) {
  const [report, setReport] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [stats, setStats] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [range, setRange] = useState(30)
  const [channelStats, setChannelStats] = useState([])

  useEffect(() => {
    loadData()
  }, [brand, range])

  async function loadData() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setLoaded(true)
      return
    }

    const since = range
      ? new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString()
      : null

    const { data, error } = await supabase.rpc('get_insights_rollup', {
      p_brand_id: brand.id,
      p_since: since,
    })

    if (error) {
      // Fallback to client-side if the function doesn't exist yet
      await loadDataFallback(since)
      return
    }

    setStats(data)
    await loadChannelStats(since)
    setLoaded(true)
  }

  async function loadChannelStats(since) {
    if (!supabase || !brand?.id || brand.id === 'demo') return

    // Get all serials with batch/channel info for this brand
    let serialsQuery = supabase
      .from('serials')
      .select('id, status, claimed_at, batch_id, batches!inner(brand_id, channel_id, channels!inner(name))')
      .eq('batches.brand_id', brand.id)

    const { data: serials } = await serialsQuery

    // Get scans with serial_id for this brand
    let scansQuery = supabase
      .from('scans')
      .select('id, serial_id, scanned_at')
      .eq('brand_id', brand.id)
      .not('serial_id', 'is', null)

    if (since) {
      scansQuery = scansQuery.gte('scanned_at', since)
    }

    const { data: serialScans } = await scansQuery

    if (!serials || serials.length === 0) {
      setChannelStats([])
      return
    }

    // Build serial_id -> channel_name map
    const serialChannelMap = {}
    const channelData = {}
    for (const s of serials) {
      const channelName = s.batches?.channels?.name || 'Unknown'
      serialChannelMap[s.id] = channelName
      if (!channelData[channelName]) channelData[channelName] = { scans: 0, claims: 0, total: 0 }
      channelData[channelName].total++
      if (s.status === 'claimed') {
        if (!since || (s.claimed_at && new Date(s.claimed_at) >= new Date(since))) {
          channelData[channelName].claims++
        }
      }
    }

    // Count scans per channel
    if (serialScans) {
      for (const scan of serialScans) {
        const ch = serialChannelMap[scan.serial_id]
        if (ch && channelData[ch]) channelData[ch].scans++
      }
    }

    const result = Object.entries(channelData)
      .map(([name, d]) => ({ name, scans: d.scans, claims: d.claims, total: d.total }))
      .sort((a, b) => b.scans - a.scans)

    setChannelStats(result)
  }

  async function loadDataFallback(since) {
    let scansQuery = supabase.from('scans').select('*, products(name, sku)').eq('brand_id', brand.id)
    let promoQuery = supabase.from('promo_entries').select('id').eq('brand_id', brand.id)
    let eventQuery = supabase.from('event_entries').select('id').eq('brand_id', brand.id)
    let warrantyQuery = supabase.from('warranty_registrations').select('id').eq('brand_id', brand.id)

    if (since) {
      scansQuery = scansQuery.gte('scanned_at', since)
      promoQuery = promoQuery.gte('entered_at', since)
      eventQuery = eventQuery.gte('entered_at', since)
      warrantyQuery = warrantyQuery.gte('registered_at', since)
    }

    const [scansRes, promoRes, eventRes, warrantyRes] = await Promise.all([
      scansQuery.order('scanned_at', { ascending: false }).limit(500),
      promoQuery,
      eventQuery,
      warrantyQuery,
    ])

    const scans = scansRes.data || []
    const byProduct = {}
    scans.forEach(s => {
      const name = s.products?.name || 'Unknown'
      if (!byProduct[name]) byProduct[name] = { scan_count: 0, city_count: new Set() }
      byProduct[name].scan_count++
      if (s.city) byProduct[name].city_count.add(s.city)
    })
    const byCity = {}
    scans.forEach(s => { if (s.city) byCity[s.city] = (byCity[s.city] || 0) + 1 })

    setStats({
      total_scans: scans.length,
      promo_entries: (promoRes.data || []).length,
      event_entries: (eventRes.data || []).length,
      warranty_registrations: (warrantyRes.data || []).length,
      scans_by_product: Object.entries(byProduct).map(([product_name, d]) => ({
        product_name,
        scan_count: d.scan_count,
        city_count: d.city_count.size,
      })),
      scans_by_city: Object.entries(byCity)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([city, scan_count]) => ({ city, scan_count })),
      recent_scans: scans.slice(0, 10).map(s => ({
        scanned_at: s.scanned_at,
        product_name: s.products?.name || 'Unknown',
        city: s.city,
      })),
    })
    await loadChannelStats(since)
    setLoaded(true)
  }

  const generateReport = async () => {
    if (!stats || stats.total_scans === 0) {
      alert('You need some scan data before generating a report. Go scan some QR codes!')
      return
    }

    setGenerating(true)
    try {
      const conversionRate = stats.total_scans > 0
        ? Math.round((stats.promo_entries / stats.total_scans) * 100)
        : 0

      const summary = [
        `Total Scans: ${stats.total_scans}`,
        `Promo Entries: ${stats.promo_entries}`,
        `Event Entries: ${stats.event_entries || 0}`,
        `Warranty Registrations: ${stats.warranty_registrations || 0}`,
        `Promo Conversion Rate (Promo Entries / Scans): ${conversionRate}%`,
        `Date Range: ${range ? `Last ${range} days` : 'All time'}`,
        '',
        'Scans by product:',
        ...stats.scans_by_product.map(p =>
          `  ${p.product_name}: ${p.scan_count} scans in ${p.city_count} cities`
        ),
        '',
        'Scans by city:',
        ...stats.scans_by_city.map(c => `  ${c.city}: ${c.scan_count}`),
        '',
        'Recent scans (last 10):',
        ...stats.recent_scans.map(s =>
          `  ${s.scanned_at} - ${s.product_name} - ${s.city || 'Unknown'}`
        ),
      ].join('\n')

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ brandName: brand.name, summary }),
      })

      if (!res.ok) {
        const text = await res.text()
        alert(`Error ${res.status}: ${text.slice(0, 200)}`)
        setGenerating(false)
        return
      }
      const data = await res.json()
      if (data.error) {
        alert(`Error: ${data.error}`)
      } else {
        setReport(data.report)
      }
    } catch (err) {
      alert(`Error generating report: ${err.message}`)
    }
    setGenerating(false)
  }

  // Simple markdown-ish rendering
  const renderReport = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h3 key={i} style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: 24, marginBottom: 8 }}>{line.replace(/\*\*/g, '')}</h3>
      }
      if (line.match(/^\d+\.\s\*\*/)) {
        const cleaned = line.replace(/\*\*/g, '')
        return <h3 key={i} style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: 24, marginBottom: 8 }}>{cleaned}</h3>
      }
      if (line.match(/^#+\s/)) {
        const cleaned = line.replace(/^#+\s/, '')
        return <h3 key={i} style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: 24, marginBottom: 8 }}>{cleaned}</h3>
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const text = line.slice(2)
        return <li key={i} style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.9rem', marginLeft: 16 }}>{renderBold(text)}</li>
      }
      if (line.trim() === '') return <br key={i} />
      return <p key={i} style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.9rem', marginBottom: 4 }}>{renderBold(line)}</p>
    })
  }

  if (!loaded) {
    return <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading...</div>
  }

  const conversionRate = stats && stats.total_scans > 0
    ? `${Math.round((stats.promo_entries / stats.total_scans) * 100)}%`
    : '0%'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Insights</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            AI-powered analysis of your scan data
          </p>
        </div>
        <button className="btn btn-primary" onClick={generateReport} disabled={generating}>
          {generating ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {/* Date Range Picker */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {DATE_RANGES.map(r => (
          <button
            key={r.label}
            onClick={() => { setRange(r.value); setReport(null) }}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: range === r.value ? 'var(--primary, #6C63FF)' : 'var(--card-bg, #1E1E2E)',
              color: range === r.value ? '#fff' : 'var(--text-muted)',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Scans', value: stats?.total_scans || 0 },
          { label: 'Promo Entries', value: stats?.promo_entries || 0 },
          { label: 'Event Entries', value: stats?.event_entries || 0 },
          { label: 'Warranty Reg.', value: stats?.warranty_registrations || 0 },
          { label: 'Promo Conversion', value: conversionRate },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FAFAFA' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* By Channel Breakdown */}
      {channelStats.length > 0 && (
        <div className="card" style={{ marginBottom: 28, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>By Channel</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
              Scans and claims grouped by retail channel
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Channel', 'Scans', 'Claims', 'Total Serials', 'Claim Rate'].map(h => (
                    <th key={h} style={{
                      padding: '12px 20px', textAlign: 'left',
                      fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {channelStats.map(ch => (
                  <tr key={ch.name} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 20px', fontWeight: 500, fontSize: '0.9rem' }}>{ch.name}</td>
                    <td style={{ padding: '12px 20px', fontSize: '0.9rem' }}>{ch.scans}</td>
                    <td style={{ padding: '12px 20px', fontSize: '0.9rem' }}>{ch.claims}</td>
                    <td style={{ padding: '12px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{ch.total}</td>
                    <td style={{ padding: '12px 20px', fontSize: '0.9rem' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
                        background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)',
                      }}>
                        {ch.total > 0 ? `${Math.round((ch.claims / ch.total) * 100)}%` : '0%'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report */}
      {generating && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Analyzing your data...</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Analyzing your scans, promo entries, and engagement patterns.
          </p>
        </div>
      )}

      {!generating && report && (
        <div className="card" style={{ maxWidth: 720 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Insights Report</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                onClick={() => {
                  navigator.clipboard.writeText(report)
                  const btn = document.activeElement
                  const orig = btn.textContent
                  btn.textContent = 'Copied!'
                  setTimeout(() => { btn.textContent = orig }, 1500)
                }}>
                Copy
              </button>
            </div>
          </div>
          <div>{renderReport(report)}</div>
        </div>
      )}

      {!generating && !report && (!stats || stats.total_scans === 0) && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>No data yet</div>
          <p style={{ color: 'var(--text-muted)' }}>
            Start scanning QR codes to collect data, then generate your first insights report.
          </p>
        </div>
      )}

      {!generating && !report && stats && stats.total_scans > 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>Ready to analyze</div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            You have {stats.total_scans} scans and {stats.promo_entries} promo entries to analyze.
          </p>
          <button className="btn btn-primary" onClick={generateReport}>Generate Report</button>
        </div>
      )}
    </div>
  )
}
