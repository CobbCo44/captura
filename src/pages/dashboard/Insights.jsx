import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Insights({ brand }) {
  const [report, setReport] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [scans, setScans] = useState([])
  const [vipMembers, setVipMembers] = useState([])
  const [promoEntries, setPromoEntries] = useState([])
  const [products, setProducts] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadData()
  }, [brand])

  async function loadData() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setLoaded(true)
      return
    }
    const [scansRes, vipRes, promoRes, prodRes] = await Promise.all([
      supabase.from('scans').select('*, products(name, sku)').eq('brand_id', brand.id).order('scanned_at', { ascending: false }).limit(500),
      supabase.from('vip_members').select('*').eq('brand_id', brand.id),
      supabase.from('promo_entries').select('*').eq('brand_id', brand.id),
      supabase.from('products').select('name, sku').eq('brand_id', brand.id),
    ])
    setScans(scansRes.data || [])
    setVipMembers(vipRes.data || [])
    setPromoEntries(promoRes.data || [])
    setProducts(prodRes.data || [])
    setLoaded(true)
  }

  const generateReport = async () => {
    if (scans.length === 0) {
      alert('You need some scan data before generating a report. Go scan some QR codes!')
      return
    }

    setGenerating(true)
    try {
      // Summarize data locally so the serverless function gets a small payload
      const byProduct = {}
      scans.forEach(s => {
        const name = s.products?.name || 'Unknown'
        if (!byProduct[name]) byProduct[name] = { scans: 0, cities: new Set() }
        byProduct[name].scans++
        if (s.city) byProduct[name].cities.add(s.city)
      })
      const byCity = {}
      scans.forEach(s => { if (s.city) byCity[s.city] = (byCity[s.city] || 0) + 1 })

      const summary = [
        `Total Scans: ${scans.length}`,
        `VIP Members: ${vipMembers.length}`,
        `Promo Entries: ${promoEntries.length}`,
        `VIP Conversion Rate: ${scans.length > 0 ? Math.round((vipMembers.length / scans.length) * 100) : 0}%`,
        `Products: ${products.map(p => p.name).join(', ')}`,
        '',
        'Scans by product:',
        ...Object.entries(byProduct).map(([name, data]) =>
          `  ${name}: ${data.scans} scans in ${data.cities.size} cities (${[...data.cities].join(', ')})`
        ),
        '',
        'Scans by city:',
        ...Object.entries(byCity).sort((a, b) => b[1] - a[1]).map(([city, count]) =>
          `  ${city}: ${count}`
        ),
        '',
        'Recent scans (last 10):',
        ...scans.slice(0, 10).map(s =>
          `  ${s.scanned_at} - ${s.products?.name || 'Unknown'} - ${s.city || 'Unknown'}`
        ),
      ].join('\n')

      const res = await fetch('/.netlify/functions/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        const cleaned = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        return <li key={i} style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.9rem', marginLeft: 16 }} dangerouslySetInnerHTML={{ __html: cleaned }} />
      }
      if (line.trim() === '') return <br key={i} />
      const cleaned = line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#FAFAFA">$1</strong>')
      return <p key={i} style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.9rem', marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: cleaned }} />
    })
  }

  if (!loaded) {
    return <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading...</div>
  }

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

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Scans', value: scans.length },
          { label: 'VIP Members', value: vipMembers.length },
          { label: 'Promo Entries', value: promoEntries.length },
          { label: 'VIP Conversion', value: scans.length > 0 ? `${Math.round((vipMembers.length / scans.length) * 100)}%` : '0%' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FAFAFA' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Report */}
      {generating && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Analyzing your data...</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Analyzing your scans, VIP signups, and engagement patterns.
          </p>
        </div>
      )}

      {!generating && report && (
        <div className="card" style={{ maxWidth: 720 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Weekly Insights Report</h2>
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

      {!generating && !report && scans.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>No data yet</div>
          <p style={{ color: 'var(--text-muted)' }}>
            Start scanning QR codes to collect data, then generate your first insights report.
          </p>
        </div>
      )}

      {!generating && !report && scans.length > 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>Ready to analyze</div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            You have {scans.length} scans and {vipMembers.length} VIP members to analyze.
          </p>
          <button className="btn btn-primary" onClick={generateReport}>Generate Report</button>
        </div>
      )}
    </div>
  )
}
