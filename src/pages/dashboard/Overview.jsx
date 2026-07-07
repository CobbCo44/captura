import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const demoStats = {
  totalScans: 1247,
  uniqueLocations: 38,
  vipMembers: 214,
  products: 6,
  recentScans: [
    { id: 1, product: 'Pro Wireless Earbuds', city: 'Houston, TX', time: '2 min ago' },
    { id: 2, product: 'Sport Water Bottle', city: 'Miami, FL', time: '8 min ago' },
    { id: 3, product: 'Running Shoes V2', city: 'Denver, CO', time: '14 min ago' },
    { id: 4, product: 'Pro Wireless Earbuds', city: 'Austin, TX', time: '22 min ago' },
    { id: 5, product: 'Training Gloves', city: 'Chicago, IL', time: '31 min ago' },
  ],
  topProducts: [
    { name: 'Pro Wireless Earbuds', scans: 412 },
    { name: 'Running Shoes V2', scans: 287 },
    { name: 'Sport Water Bottle', scans: 198 },
    { name: 'Training Gloves', scans: 156 },
  ]
}

export default function Overview() {
  const [stats, setStats] = useState(demoStats)

  useEffect(() => {
    if (!supabase) return
    // Future: fetch real stats from Supabase
  }, [])

  return (
    <div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 32 }}>Overview</h1>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
        {[
          { label: 'Total Scans', value: stats.totalScans.toLocaleString(), color: 'var(--primary-light)' },
          { label: 'Unique Locations', value: stats.uniqueLocations, color: 'var(--accent)' },
          { label: 'VIP Members', value: stats.vipMembers, color: 'var(--success)' },
          { label: 'Active Products', value: stats.products, color: '#EC4899' },
        ].map(s => (
          <div key={s.label} className="card">
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Recent Scans */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Recent Scans</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {stats.recentScans.map(scan => (
              <div key={scan.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{scan.product}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>📍 {scan.city}</div>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{scan.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Top Products by Scans</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {stats.topProducts.map((p, i) => (
              <div key={p.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{p.name}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.scans}</span>
                </div>
                <div style={{
                  height: 6, borderRadius: 3, background: 'var(--border)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    background: `var(--primary-light)`,
                    width: `${(p.scans / stats.topProducts[0].scans) * 100}%`,
                    transition: 'width 0.5s'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
