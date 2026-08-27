import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Overview({ brand }) {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ totalScans: 0, uniqueCities: 0, vipMembers: 0, products: 0 })
  const [recentScans, setRecentScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [setup, setSetup] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    loadStats()
  }, [brand])

  async function loadStats() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setStats({ totalScans: 0, uniqueCities: 0, vipMembers: 0, products: 0 })
      setLoading(false)
      return
    }

    const isStorefront = brand.business_type === 'storefront'

    const queries = [
      supabase.from('scans').select('id, city, scanned_at').eq('brand_id', brand.id),
      supabase.from('promo_entries').select('id').eq('brand_id', brand.id),
      supabase.from('products').select('id').eq('brand_id', brand.id),
      supabase.from('scans').select('*, products(name)').eq('brand_id', brand.id).order('scanned_at', { ascending: false }).limit(10),
      supabase.from('qr_codes').select('id').eq('brand_id', brand.id).limit(1),
      supabase.from('promos').select('id').eq('brand_id', brand.id).limit(1),
      supabase.from('loyalty_rewards').select('id').eq('brand_id', brand.id).limit(1),
    ]

    if (isStorefront) {
      queries.push(supabase.from('menu_items').select('id').eq('brand_id', brand.id).limit(1))
    }

    const results = await Promise.all(queries)
    const [scansRes, vipRes, productsRes, recentRes, qrRes, promosRes, rewardsRes, menuRes] = results

    const scans = scansRes.data || []
    const cities = new Set(scans.map(s => s.city).filter(Boolean))

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

    // Build setup checklist
    const hasBrand = !!(brand.logo_url || brand.accent_hex)
    const hasProducts = (productsRes.data || []).length > 0
    const hasQR = (qrRes.data || []).length > 0
    const hasPromo = (promosRes.data || []).length > 0
    const hasRewards = (rewardsRes.data || []).length > 0
    const hasMenu = isStorefront ? ((menuRes?.data || []).length > 0 || !!brand.menu_image_url) : true

    if (isStorefront) {
      setSetup({
        steps: [
          { key: 'brand', label: 'Set up your brand', desc: 'Add your logo and pick your accent color', done: hasBrand, path: '/dashboard/brand' },
          { key: 'menu', label: 'Add your menu', desc: 'Upload a menu image or add items', done: hasMenu, path: '/dashboard/menu' },
          { key: 'promo', label: 'Create a promo', desc: 'Run a giveaway to capture consumers', done: hasPromo, path: '/dashboard/promos' },
          { key: 'rewards', label: 'Set up loyalty rewards', desc: 'Give customers a reason to come back', done: hasRewards, path: '/dashboard/loyalty' },
          { key: 'scan', label: 'Test your QR code', desc: 'Scan your Counter QR to see the live page', done: scans.length > 0, path: '/dashboard/qr-codes' },
        ],
      })
    } else {
      setSetup({
        steps: [
          { key: 'brand', label: 'Set up your brand', desc: 'Add your logo and pick your accent color', done: hasBrand, path: '/dashboard/brand' },
          { key: 'product', label: 'Add a product', desc: 'Enter your first product with a GTIN', done: hasProducts, path: '/dashboard/products' },
          { key: 'qr', label: 'Create a QR code', desc: 'Generate a branded QR for your product', done: hasQR, path: '/dashboard/qr-codes' },
          { key: 'promo', label: 'Create a promo', desc: 'Run a giveaway to capture consumers', done: hasPromo, path: '/dashboard/promos' },
          { key: 'rewards', label: 'Set up loyalty rewards', desc: 'Reward repeat scanners with points', done: hasRewards, path: '/dashboard/loyalty' },
          { key: 'scan', label: 'Test your QR code', desc: 'Scan it with your phone to see the live page', done: scans.length > 0, path: '/dashboard/qr-codes' },
        ],
      })
    }

    setLoading(false)
  }

  if (loading) {
    return <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading...</div>
  }

  const completedCount = setup ? setup.steps.filter(s => s.done).length : 0
  const totalSteps = setup ? setup.steps.length : 0
  const allDone = completedCount === totalSteps
  const showChecklist = setup && !allDone && !dismissed

  return (
    <div>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 32 }}>Overview</h1>

      {import.meta.env.VITE_BILLING_LIVE === 'true' && !brand?.subscription_status && (
        <div style={{
          padding: '14px 18px', borderRadius: 10, marginBottom: 24,
          background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Start your 14-day free trial</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>Pick a plan to keep everything running. Nothing is charged for 14 days.</div>
          </div>
          <Link to="/dashboard/billing" className="btn btn-primary" style={{ padding: '10px 22px', fontSize: '0.85rem' }}>Choose a plan</Link>
        </div>
      )}

      {/* Onboarding Checklist */}
      {showChecklist && (
        <div className="card" style={{ marginBottom: 28, padding: '24px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>Getting Started</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                {completedCount} of {totalSteps} steps complete
              </p>
            </div>
            <button onClick={() => setDismissed(true)} style={{
              background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
              fontSize: '0.8rem', padding: '4px 8px',
            }}>Dismiss</button>
          </div>

          {/* Progress bar */}
          <div style={{
            height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', marginBottom: 20, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: 'linear-gradient(90deg, #22c55e, #4ade80)',
              width: `${(completedCount / totalSteps) * 100}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {setup.steps.map((step, i) => (
              <div
                key={step.key}
                onClick={() => !step.done && navigate(step.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 12px',
                  borderBottom: i < setup.steps.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: step.done ? 'default' : 'pointer',
                  borderRadius: 8,
                  transition: 'background 0.15s',
                  opacity: step.done ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!step.done) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                {/* Check circle */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step.done ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255,255,255,0.06)',
                  border: step.done ? '1.5px solid #22c55e' : '1.5px solid rgba(255,255,255,0.15)',
                  transition: 'all 0.2s',
                }}>
                  {step.done ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>{i + 1}</span>
                  )}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600, fontSize: '0.9rem',
                    textDecoration: step.done ? 'line-through' : 'none',
                    color: step.done ? 'var(--text-muted)' : 'var(--text)',
                  }}>{step.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 1 }}>{step.desc}</div>
                </div>

                {/* Arrow for incomplete */}
                {!step.done && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
        {[
          { label: 'Total Scans', value: stats.totalScans.toLocaleString(), color: '#FAFAFA' },
          { label: 'Unique Cities', value: stats.uniqueCities, color: '#A1A1AA' },
          { label: 'Consumers Captured', value: stats.vipMembers, color: 'var(--success)' },
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

      {stats.totalScans === 0 && !showChecklist && (
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
