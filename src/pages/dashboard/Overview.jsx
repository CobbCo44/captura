import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Overview({ brand }) {
  const [stats, setStats] = useState({ totalScans: 0, uniqueCities: 0, vipMembers: 0, products: 0 })
  const [recentScans, setRecentScans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [brand])

  async function loadStats() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setStats({ totalScans: 0, uniqueCities: 0, vipMembers: 0, products: 0 })
      setLoading(false)
      return
    }

    const [scansRes, vipRes, productsRes, recentRes] = await Promise.all([
      supabase.from('scans').select('id, city, scanned_at').eq('brand_id', brand.id),
      supabase.from('promo_entries').select('id').eq('brand_id', brand.id),
      supabase.from('products').select('id').eq('brand_id', brand.id),
      supabase.from('scans').select('*, products(name)').eq('brand_id', brand.id).order('scanned_at', { ascending: false }).limit(10),
    ])

    const scans = scansRes.data || []
    const cities = new Set(scans.map(s => s.city).filter(Boolean))

    // Scans by day (last 7 days) — use local timezone so today's scans show under today
    const dayMap = {}
    const now = new Date()
    const localDateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      dayMap[localDateKey(d)] = 0
    }
    scans.forEach(s => {
      if (!s.scanned_at) return
      const day = localDateKey(new Date(s.scanned_at))
      if (dayMap[day] !== undefined) dayMap[day]++
    })

    setStats({
      totalScans: scans.length,
      uniqueCities: cities.size,
      vipMembers: (vipRes.data || []).length,
      products: (productsRes.data || []).length,
      scansByDay: Object.entries(dayMap),
    })
    setRecentScans(recentRes.data || [])
    setLoading(false)
  }

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 32 }}>Overview</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
        {[
          { label: 'Total Scans', value: stats.totalScans.toLocaleString(), color: '#FAFAFA' },
          { label: 'Unique Cities', value: stats.uniqueCities, color: '#A1A1AA' },
          { label: 'Promo Entries', value: stats.vipMembers, color: 'var(--success)' },
          { label: 'Active Products', value: stats.products, color: '#D4D4D8' },
        ].map(s => (
          <div key={s.label} className="card">
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Scan Trend */}
      {stats.scansByDay && stats.scansByDay.some(([, count]) => count > 0) && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Scans (Last 7 Days)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, paddingTop: 20 }}>
            {(() => {
              const max = Math.max(...stats.scansByDay.map(([, c]) => c), 1)
              return stats.scansByDay.map(([day, count], i) => {
                const pct = count > 0 ? Math.max((count / max) * 100, 5) : 3
                return (
                  <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{
                      fontSize: '0.75rem', color: '#FAFAFA', fontWeight: 700,
                      opacity: 0, animation: `fadeIn 0.3s ease forwards ${0.3 + i * 0.1}s`,
                    }}>{count || ''}</span>
                    <div style={{
                      width: '100%', borderRadius: 6,
                      background: count > 0 ? 'linear-gradient(180deg, #FAFAFA 0%, #52525B 100%)' : '#1C1C21',
                      height: `${pct}%`,
                      animation: `growBar${i} 0.6s ease forwards ${0.1 + i * 0.1}s`,
                    }} />
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {new Date(day + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' })}
                    </span>
                  </div>
                )
              })
            })()}
          </div>
          <style>{`
            ${stats.scansByDay.map(([, count], i) => {
              const max = Math.max(...stats.scansByDay.map(([, c]) => c), 1)
              const pct = count > 0 ? Math.max((count / max) * 100, 5) : 3
              return `@keyframes growBar${i} { from { height: 0; } to { height: ${pct}%; } }`
            }).join('\n')}
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

      {recentScans.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Recent Scans</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentScans.map(scan => (
              <div key={scan.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{scan.products?.name || 'Unknown'}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {scan.city || 'Unknown location'} {scan.device ? `· ${scan.device}` : ''}
                  </div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {new Date(scan.scanned_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.totalScans === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>No scans yet</div>
          <p style={{ color: 'var(--text-muted)' }}>
            Create a product, generate a QR code, and start scanning to see data here.
          </p>
        </div>
      )}
    </div>
  )
}
