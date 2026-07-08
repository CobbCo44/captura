import { useState, useRef, useEffect } from 'react'
import Globe from 'react-globe.gl'

const demoScans = [
  { id: 1, product: 'Pro Wireless Earbuds', sku: 'PWE-001', city: 'Houston, TX', lat: 29.76, lng: -95.37, device: 'iPhone 15', time: '2026-07-07 14:32', vipSignup: true },
  { id: 2, product: 'Sport Water Bottle', sku: 'SWB-010', city: 'Miami, FL', lat: 25.76, lng: -80.19, device: 'Samsung Galaxy S24', time: '2026-07-07 14:24', vipSignup: false },
  { id: 3, product: 'Running Shoes V2', sku: 'RSV2-003', city: 'Denver, CO', lat: 39.74, lng: -104.99, device: 'iPhone 14 Pro', time: '2026-07-07 14:18', vipSignup: true },
  { id: 4, product: 'Pro Wireless Earbuds', sku: 'PWE-001', city: 'Austin, TX', lat: 30.27, lng: -97.74, device: 'Pixel 8', time: '2026-07-07 14:10', vipSignup: false },
  { id: 5, product: 'Training Gloves', sku: 'TG-005', city: 'Chicago, IL', lat: 41.88, lng: -87.63, device: 'iPhone 15 Pro', time: '2026-07-07 14:01', vipSignup: true },
  { id: 6, product: 'Resistance Bands Set', sku: 'RBS-007', city: 'Phoenix, AZ', lat: 33.45, lng: -112.07, device: 'Samsung Galaxy A54', time: '2026-07-07 13:48', vipSignup: false },
  { id: 7, product: 'Pro Wireless Earbuds', sku: 'PWE-001', city: 'Seattle, WA', lat: 47.61, lng: -122.33, device: 'iPhone 16', time: '2026-07-07 13:35', vipSignup: true },
  { id: 8, product: 'Running Shoes V2', sku: 'RSV2-003', city: 'Nashville, TN', lat: 36.16, lng: -86.78, device: 'iPhone 15', time: '2026-07-07 13:22', vipSignup: false },
  { id: 9, product: 'Pro Wireless Earbuds', sku: 'PWE-001', city: 'New York, NY', lat: 40.71, lng: -74.01, device: 'iPhone 16 Pro', time: '2026-07-07 12:55', vipSignup: true },
  { id: 10, product: 'Sport Water Bottle', sku: 'SWB-010', city: 'Los Angeles, CA', lat: 34.05, lng: -118.24, device: 'Pixel 9', time: '2026-07-07 12:40', vipSignup: false },
  { id: 11, product: 'Training Gloves', sku: 'TG-005', city: 'Dallas, TX', lat: 32.78, lng: -96.80, device: 'Samsung Galaxy S24', time: '2026-07-07 12:15', vipSignup: true },
  { id: 12, product: 'Pro Wireless Earbuds', sku: 'PWE-001', city: 'San Francisco, CA', lat: 37.77, lng: -122.42, device: 'iPhone 15', time: '2026-07-07 11:58', vipSignup: false },
  { id: 13, product: 'Running Shoes V2', sku: 'RSV2-003', city: 'Atlanta, GA', lat: 33.75, lng: -84.39, device: 'iPhone 16', time: '2026-07-07 11:30', vipSignup: true },
  { id: 14, product: 'Resistance Bands Set', sku: 'RBS-007', city: 'Portland, OR', lat: 45.52, lng: -122.68, device: 'Pixel 8 Pro', time: '2026-07-07 11:12', vipSignup: false },
  { id: 15, product: 'Sport Water Bottle', sku: 'SWB-010', city: 'Boston, MA', lat: 42.36, lng: -71.06, device: 'iPhone 15 Pro', time: '2026-07-07 10:45', vipSignup: true },
]

const tabStyle = (active) => ({
  padding: '10px 20px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
  background: active ? 'var(--primary)' : 'var(--bg-card)',
  color: active ? 'white' : 'var(--text-muted)',
  border: active ? 'none' : '1px solid var(--border)',
  transition: 'all 0.15s',
})

export default function Scans() {
  const [scans] = useState(demoScans)
  const [tab, setTab] = useState('globe')
  const globeRef = useRef()

  // Point the globe at the US on load
  useEffect(() => {
    if (globeRef.current && tab === 'globe') {
      globeRef.current.pointOfView({ lat: 35, lng: -98, altitude: 2.2 }, 1000)
    }
  }, [tab])

  // Globe data points
  const globePoints = scans.map(s => ({
    lat: s.lat,
    lng: s.lng,
    label: `${s.product}\n${s.city}`,
    color: s.vipSignup ? '#8B5CF6' : '#6C2BD9',
    size: s.vipSignup ? 0.6 : 0.4,
  }))

  // SKU breakdown
  const skuMap = {}
  scans.forEach(s => {
    if (!skuMap[s.sku]) {
      skuMap[s.sku] = { sku: s.sku, product: s.product, totalScans: 0, vipSignups: 0, cities: new Set() }
    }
    skuMap[s.sku].totalScans++
    if (s.vipSignup) skuMap[s.sku].vipSignups++
    skuMap[s.sku].cities.add(s.city)
  })
  const skuData = Object.values(skuMap).sort((a, b) => b.totalScans - a.totalScans)

  // Location breakdown
  const cityMap = {}
  scans.forEach(s => { cityMap[s.city] = (cityMap[s.city] || 0) + 1 })
  const cityData = Object.entries(cityMap).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Scan Activity</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setTab('globe')} style={tabStyle(tab === 'globe')}>Globe</button>
          <button onClick={() => setTab('sku')} style={tabStyle(tab === 'sku')}>By SKU</button>
          <button onClick={() => setTab('feed')} style={tabStyle(tab === 'feed')}>Live Feed</button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Scans', value: scans.length, color: 'var(--primary-light)' },
          { label: 'Unique Cities', value: Object.keys(cityMap).length, color: 'var(--accent)' },
          { label: 'VIP Signups', value: scans.filter(s => s.vipSignup).length, color: 'var(--success)' },
          { label: 'Products Scanned', value: Object.keys(skuMap).length, color: '#EC4899' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Globe Tab */}
      {tab === 'globe' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden', height: 500, position: 'relative' }}>
            <Globe
              ref={globeRef}
              width={600}
              height={500}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
              backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
              pointsData={globePoints}
              pointLat="lat"
              pointLng="lng"
              pointLabel="label"
              pointColor="color"
              pointRadius="size"
              pointAltitude={0.01}
              atmosphereColor="#6C2BD9"
              atmosphereAltitude={0.15}
            />
          </div>

          {/* Location Sidebar */}
          <div className="card" style={{ maxHeight: 500, overflow: 'auto' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Scan Locations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cityData.map(([city, count]) => (
                <div key={city} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid var(--border)'
                }}>
                  <span style={{ fontSize: '0.9rem' }}>{city}</span>
                  <span style={{
                    background: 'rgba(108, 43, 217, 0.15)', color: 'var(--primary-light)',
                    padding: '2px 10px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600
                  }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SKU Tab */}
      {tab === 'sku' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {skuData.map(item => (
              <div key={item.sku} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 4 }}>{item.product}</h3>
                    <span style={{
                      fontSize: '0.75rem', color: 'var(--text-muted)',
                      background: 'var(--bg)', padding: '2px 8px', borderRadius: 4
                    }}>SKU: {item.sku}</span>
                  </div>
                  <div style={{
                    fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-light)'
                  }}>{item.totalScans}</div>
                </div>

                <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>VIP Signups</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>{item.vipSignups}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Conversion</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>
                      {Math.round((item.vipSignups / item.totalScans) * 100)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cities</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{item.cities.size}</div>
                  </div>
                </div>

                {/* Scan bar */}
                <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    background: 'linear-gradient(90deg, var(--primary), var(--primary-light))',
                    width: `${(item.totalScans / skuData[0].totalScans) * 100}%`,
                  }} />
                </div>

                {/* Cities list */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>Scanned in:</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {[...item.cities].map(city => (
                      <span key={city} style={{
                        fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4,
                        background: 'var(--bg)', color: 'var(--text-muted)',
                      }}>{city}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Feed Tab */}
      {tab === 'feed' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Product', 'SKU', 'Location', 'Device', 'Time', 'VIP'].map(h => (
                    <th key={h} style={{
                      padding: '14px 16px', textAlign: 'left',
                      fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.5px'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scans.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500, fontSize: '0.9rem' }}>{s.product}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{s.sku}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                      <div>{s.city}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {s.lat.toFixed(2)}, {s.lng.toFixed(2)}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{s.device}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{s.time}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {s.vipSignup
                        ? <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>Yes</span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Location Sidebar */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>By Location</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cityData.map(([city, count]) => (
                <div key={city} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid var(--border)'
                }}>
                  <span style={{ fontSize: '0.9rem' }}>{city}</span>
                  <span style={{
                    background: 'rgba(108, 43, 217, 0.15)', color: 'var(--primary-light)',
                    padding: '2px 10px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600
                  }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
