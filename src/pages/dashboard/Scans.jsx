import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import Globe from 'react-globe.gl'

const tabStyle = (active) => ({
  padding: '10px 20px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
  background: active ? '#FAFAFA' : 'var(--bg-card)',
  color: active ? '#09090B' : 'var(--text-muted)',
  border: active ? 'none' : '1px solid var(--border)',
  transition: 'all 0.15s',
})

export default function Scans({ brand }) {
  const [scans, setScans] = useState([])
  const [tab, setTab] = useState('globe')
  const [loading, setLoading] = useState(true)
  const globeRef = useRef()

  useEffect(() => {
    loadScans()
  }, [brand])

  useEffect(() => {
    if (globeRef.current && tab === 'globe' && scans.length > 0) {
      globeRef.current.pointOfView({ lat: 35, lng: -98, altitude: 2.2 }, 1000)
    }
  }, [tab, scans])

  async function loadScans() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setScans([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('scans')
      .select('*, products(name, sku)')
      .eq('brand_id', brand.id)
      .order('scanned_at', { ascending: false })
      .limit(500)
    setScans(data || [])
    setLoading(false)
  }

  const globePoints = scans
    .filter(s => s.latitude && s.longitude)
    .map(s => ({
      lat: s.latitude,
      lng: s.longitude,
      label: `${s.products?.name || 'Product'}\n${s.city || 'Unknown'}`,
      color: '#EF4444',
      size: 0.5,
    }))

  // SKU breakdown
  const skuMap = {}
  scans.forEach(s => {
    const sku = s.products?.sku || 'N/A'
    if (!skuMap[sku]) {
      skuMap[sku] = { sku, product: s.products?.name || 'Unknown', totalScans: 0, cities: new Set() }
    }
    skuMap[sku].totalScans++
    if (s.city) skuMap[sku].cities.add(s.city)
  })
  const skuData = Object.values(skuMap).sort((a, b) => b.totalScans - a.totalScans)

  // City breakdown
  const cityMap = {}
  scans.forEach(s => { if (s.city) cityMap[s.city] = (cityMap[s.city] || 0) + 1 })
  const cityData = Object.entries(cityMap).sort((a, b) => b[1] - a[1])

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading...</div>
  }

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
          { label: 'Total Scans', value: scans.length, color: '#FAFAFA' },
          { label: 'Unique Cities', value: Object.keys(cityMap).length, color: '#A1A1AA' },
          { label: 'Products Scanned', value: Object.keys(skuMap).length, color: '#D4D4D8' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {scans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>No scans yet</div>
          <p style={{ color: 'var(--text-muted)' }}>
            Scans will appear here as consumers scan your QR codes.
          </p>
        </div>
      ) : (
        <>
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
                  atmosphereColor="#A1A1AA"
                  atmosphereAltitude={0.15}
                />
              </div>
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
                        background: 'rgba(255, 255, 255, 0.08)', color: '#FAFAFA',
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
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FAFAFA' }}>{item.totalScans}</div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cities: {item.cities.size}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      background: 'linear-gradient(90deg, #52525B, #FAFAFA)',
                      width: `${(item.totalScans / skuData[0].totalScans) * 100}%`,
                    }} />
                  </div>
                  {item.cities.size > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {[...item.cities].map(city => (
                          <span key={city} style={{
                            fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4,
                            background: 'var(--bg)', color: 'var(--text-muted)',
                          }}>{city}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Feed Tab */}
          {tab === 'feed' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Product', 'Location', 'Device', 'Time'].map(h => (
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
                      <td style={{ padding: '12px 16px', fontWeight: 500, fontSize: '0.9rem' }}>
                        {s.products?.name || 'Unknown'}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                        <div>{s.city || 'Unknown'}</div>
                        {s.latitude && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {s.latitude.toFixed(2)}, {s.longitude.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {s.device || '-'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(s.scanned_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
