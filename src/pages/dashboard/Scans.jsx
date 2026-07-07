import { useState } from 'react'

const demoScans = [
  { id: 1, product: 'Pro Wireless Earbuds', city: 'Houston, TX', lat: 29.76, lng: -95.37, device: 'iPhone 15', time: '2026-07-07 14:32', vipSignup: true },
  { id: 2, product: 'Sport Water Bottle', city: 'Miami, FL', lat: 25.76, lng: -80.19, device: 'Samsung Galaxy S24', time: '2026-07-07 14:24', vipSignup: false },
  { id: 3, product: 'Running Shoes V2', city: 'Denver, CO', lat: 39.74, lng: -104.99, device: 'iPhone 14 Pro', time: '2026-07-07 14:18', vipSignup: true },
  { id: 4, product: 'Pro Wireless Earbuds', city: 'Austin, TX', lat: 30.27, lng: -97.74, device: 'Pixel 8', time: '2026-07-07 14:10', vipSignup: false },
  { id: 5, product: 'Training Gloves', city: 'Chicago, IL', lat: 41.88, lng: -87.63, device: 'iPhone 15 Pro', time: '2026-07-07 14:01', vipSignup: true },
  { id: 6, product: 'Resistance Bands Set', city: 'Phoenix, AZ', lat: 33.45, lng: -112.07, device: 'Samsung Galaxy A54', time: '2026-07-07 13:48', vipSignup: false },
  { id: 7, product: 'Pro Wireless Earbuds', city: 'Seattle, WA', lat: 47.61, lng: -122.33, device: 'iPhone 16', time: '2026-07-07 13:35', vipSignup: true },
  { id: 8, product: 'Running Shoes V2', city: 'Nashville, TN', lat: 36.16, lng: -86.78, device: 'iPhone 15', time: '2026-07-07 13:22', vipSignup: false },
]

export default function Scans() {
  const [scans] = useState(demoScans)
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? scans : scans.filter(s =>
    filter === 'vip' ? s.vipSignup : !s.vipSignup
  )

  // Count by city for the location breakdown
  const byCityMap = {}
  scans.forEach(s => { byCityMap[s.city] = (byCityMap[s.city] || 0) + 1 })
  const byCity = Object.entries(byCityMap).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Scan Activity</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'vip', 'anonymous'].map(f => (
            <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '8px 14px', textTransform: 'capitalize' }}
              onClick={() => setFilter(f)}>
              {f === 'all' ? 'All Scans' : f === 'vip' ? 'VIP Signups' : 'Anonymous'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Scan Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Product', 'Location', 'Device', 'Time', 'VIP'].map(h => (
                  <th key={h} style={{
                    padding: '14px 16px', textAlign: 'left',
                    fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500, fontSize: '0.9rem' }}>{s.product}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                    <div>📍 {s.city}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {s.lat.toFixed(2)}, {s.lng.toFixed(2)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{s.device}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{s.time}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {s.vipSignup
                      ? <span style={{ color: 'var(--success)', fontWeight: 600 }}>Yes</span>
                      : <span style={{ color: 'var(--text-muted)' }}>No</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Location Breakdown */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Scans by Location</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {byCity.map(([city, count]) => (
              <div key={city} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: '0.9rem' }}>📍 {city}</span>
                <span style={{
                  background: 'rgba(108, 43, 217, 0.15)', color: 'var(--primary-light)',
                  padding: '2px 10px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600
                }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
