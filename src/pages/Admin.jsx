import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

export default function Admin() {
  const navigate = useNavigate()
  const [unlocked, setUnlocked] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('brands')
  const [brands, setBrands] = useState([])
  const [scans, setScans] = useState([])
  const [vipMembers, setVipMembers] = useState([])
  const [promoEntries, setPromoEntries] = useState([])
  const [billingEvents, setBillingEvents] = useState([])
  const [selectedBrand, setSelectedBrand] = useState(null)
  const [period, setPeriod] = useState('month')
  const [billingMonth, setBillingMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  async function loadAllData() {
    setLoading(true)
    const [brandsRes, scansRes, vipRes, promoRes, billingRes] = await Promise.all([
      supabase.from('brands').select('*').order('created_at', { ascending: false }),
      supabase.from('scans').select('*, products(name, sku), brands:brand_id(name, industry)').order('scanned_at', { ascending: false }).limit(5000),
      supabase.from('vip_members').select('*, products(name), brands:brand_id(name, industry)').order('joined_at', { ascending: false }),
      supabase.from('promo_entries').select('*, products(name), brands:brand_id(name, industry)').order('entered_at', { ascending: false }),
      supabase.from('billing_events').select('*, brands:brand_id(name, industry)').order('created_at', { ascending: false }),
    ])
    setBrands(brandsRes.data || [])
    setScans(scansRes.data || [])
    setVipMembers(vipRes.data || [])
    setPromoEntries(promoRes.data || [])
    setBillingEvents(billingRes.data || [])
    setLoading(false)
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    if (passwordInput === ADMIN_PASSWORD) {
      setUnlocked(true)
      setPasswordError(false)
      loadAllData()
    } else {
      setPasswordError(true)
    }
  }

  // Password gate
  if (!unlocked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <form onSubmit={handlePasswordSubmit} style={{
          width: 380, padding: 36, background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 12,
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.05em' }}>CAPTURA</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 28 }}>Admin Console</h2>
          <input
            className="input"
            type="password"
            placeholder="Enter admin password"
            value={passwordInput}
            onChange={e => { setPasswordInput(e.target.value); setPasswordError(false) }}
            autoFocus
            style={{ width: '100%', marginBottom: 16 }}
          />
          {passwordError && (
            <div style={{ color: '#EF4444', fontSize: '0.85rem', marginBottom: 12 }}>Incorrect password.</div>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 14 }}>
            Unlock
          </button>
        </form>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    )
  }

  const tabStyle = (active) => ({
    padding: '10px 20px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
    background: active ? '#FAFAFA' : 'var(--bg-card)',
    color: active ? '#09090B' : 'var(--text-muted)',
    border: active ? 'none' : '1px solid var(--border)',
  })

  // Brand detail view
  if (selectedBrand) {
    const brand = selectedBrand
    const brandScans = scans.filter(s => s.brand_id === brand.id)
    const brandWarranty = vipMembers.filter(v => v.brand_id === brand.id)
    const brandPromo = promoEntries.filter(p => p.brand_id === brand.id)

    // Time period filter
    const now = new Date()
    const filterByPeriod = (date) => {
      const d = new Date(date)
      if (period === 'week') {
        const weekAgo = new Date(now)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return d >= weekAgo
      } else if (period === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      } else {
        return d.getFullYear() === now.getFullYear()
      }
    }

    const filteredWarranty = brandWarranty.filter(v => filterByPeriod(v.joined_at))
    const filteredPromo = brandPromo.filter(p => filterByPeriod(p.entered_at))
    const totalEntries = filteredWarranty.length + filteredPromo.length
    const amountDue = totalEntries

    const periodLabel = period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'This Year'

    return (
      <div style={{ minHeight: '100vh', padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Back + Header */}
        <div style={{ marginBottom: 28 }}>
          <button onClick={() => setSelectedBrand(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', marginBottom: 12, padding: 0 }}>
            &larr; Back to All Brands
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {brand.logo_url && (
              <img src={brand.logo_url} alt={brand.name} style={{
                width: 48, height: 48, borderRadius: 10, objectFit: 'contain',
                background: '#fff', padding: 3,
              }} />
            )}
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>{brand.name}</h1>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {brand.industry || 'No industry'} &middot; {brand.email} &middot; Joined {new Date(brand.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Period Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { key: 'week', label: 'Week' },
            { key: 'month', label: 'Month' },
            { key: 'year', label: 'Year' },
          ].map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{
              padding: '8px 18px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
              background: period === p.key ? '#FAFAFA' : 'var(--bg-card)',
              color: period === p.key ? '#09090B' : 'var(--text-muted)',
              border: period === p.key ? 'none' : '1px solid var(--border)',
            }}>{p.label}</button>
          ))}
        </div>

        {/* Brand Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Scans', value: brandScans.length, color: '#FAFAFA' },
            { label: `Warranty Registrations`, value: filteredWarranty.length, color: 'var(--success)' },
            { label: `Promo Entries`, value: filteredPromo.length, color: '#F59E0B' },
            { label: `Billable ${periodLabel}`, value: totalEntries, color: '#A1A1AA' },
            { label: 'Amount Due', value: `$${amountDue}.00`, color: 'var(--success)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Warranty Registrations */}
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Warranty Registrations ({filteredWarranty.length})</h3>
        {filteredWarranty.length > 0 ? (
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Email', 'Phone', 'Product', 'City', 'Date'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredWarranty.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500, fontSize: '0.85rem' }}>{v.first_name} {v.last_name}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{v.email || '-'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.85rem' }}>{v.phone}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{v.products?.name || '-'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{v.city || '-'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(v.joined_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card" style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 28 }}>No warranty registrations {periodLabel.toLowerCase()}.</div>
        )}

        {/* Promo Entries */}
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Promo Entries ({filteredPromo.length})</h3>
        {filteredPromo.length > 0 ? (
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Name', 'Email', 'Phone', 'Product', 'City', 'Date'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPromo.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500, fontSize: '0.85rem' }}>{p.first_name} {p.last_name}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.email || '-'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.85rem' }}>{p.phone}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.products?.name || '-'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.city || '-'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(p.entered_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card" style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 28 }}>No promo entries {periodLabel.toLowerCase()}.</div>
        )}
      </div>
    )
  }

  // Main admin view
  return (
    <div style={{ minHeight: '100vh', padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.05em' }}>CAPTURA</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Admin Console</h1>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Brands', value: brands.length, color: '#FAFAFA' },
          { label: 'Total Scans', value: scans.length, color: '#A1A1AA' },
          { label: 'Warranty Registrations', value: vipMembers.length, color: 'var(--success)' },
          { label: 'Promo Entries', value: promoEntries.length, color: '#F59E0B' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button onClick={() => setTab('brands')} style={tabStyle(tab === 'brands')}>Brands</button>
        <button onClick={() => setTab('billing')} style={tabStyle(tab === 'billing')}>Billing</button>
      </div>

      {/* Brands Tab */}
      {tab === 'brands' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {brands.map(b => {
            const bScans = scans.filter(s => s.brand_id === b.id).length
            const bVIP = vipMembers.filter(v => v.brand_id === b.id).length
            const bPromo = promoEntries.filter(p => p.brand_id === b.id).length
            return (
              <div key={b.id} className="card" onClick={() => setSelectedBrand(b)}
                style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#FAFAFA'}
                onMouseLeave={e => e.currentTarget.style.borderColor = ''}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  {b.logo_url && (
                    <img src={b.logo_url} alt={b.name} style={{
                      width: 36, height: 36, borderRadius: 8, objectFit: 'contain',
                      background: '#fff', padding: 2,
                    }} />
                  )}
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{b.name}</h3>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {b.industry || 'No industry'} &middot; Joined {new Date(b.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 24 }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Scans</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{bScans}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Warranty</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }}>{bVIP}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Promo</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F59E0B' }}>{bPromo}</div>
                  </div>
                </div>
              </div>
            )
          })}
          {brands.length === 0 && (
            <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No brands signed up yet.
            </div>
          )}
        </div>
      )}

      {/* Billing Tab */}
      {tab === 'billing' && (() => {
        const monthEvents = billingEvents.filter(e => e.billing_month === billingMonth)

        const brandBilling = {}
        monthEvents.forEach(e => {
          const brandName = e.brands?.name || 'Unknown'
          if (!brandBilling[brandName]) {
            brandBilling[brandName] = { brand_id: e.brand_id, total: 0, billable: 0, duplicates: 0, byType: {} }
          }
          brandBilling[brandName].total++
          if (e.billable) {
            brandBilling[brandName].billable++
          } else {
            brandBilling[brandName].duplicates++
          }
          const t = e.source_type || 'unknown'
          if (!brandBilling[brandName].byType[t]) brandBilling[brandName].byType[t] = 0
          if (e.billable) brandBilling[brandName].byType[t]++
        })

        const billingRows = Object.entries(brandBilling).sort((a, b) => b[1].billable - a[1].billable)
        const totalBillable = billingRows.reduce((sum, [, b]) => sum + b.billable, 0)
        const totalDuplicates = billingRows.reduce((sum, [, b]) => sum + b.duplicates, 0)
        const totalRevenue = totalBillable * 1

        const monthOptions = []
        for (let i = 0; i < 12; i++) {
          const d = new Date()
          d.setMonth(d.getMonth() - i)
          const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          monthOptions.push({ val, label })
        }

        const exportBillingCSV = () => {
          const headers = ['Brand', 'Billable Submissions', 'Duplicates Blocked', 'VIP', 'Promo', 'Warranty', 'Event', 'Amount Due']
          const rows = billingRows.map(([name, b]) => [
            name, b.billable, b.duplicates,
            b.byType.vip || 0, b.byType.promo || 0, b.byType.warranty || 0, b.byType.event || 0,
            `$${b.billable}.00`,
          ])
          rows.push(['TOTAL', totalBillable, totalDuplicates, '', '', '', '', `$${totalRevenue}.00`])
          const csv = [headers, ...rows].map(row =>
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
          ).join('\n')
          const blob = new Blob([csv], { type: 'text/csv' })
          const link = document.createElement('a')
          link.download = `captura-billing-${billingMonth}.csv`
          link.href = URL.createObjectURL(blob)
          link.click()
          URL.revokeObjectURL(link.href)
        }

        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Billing Period:</label>
                <select className="input" value={billingMonth} onChange={e => setBillingMonth(e.target.value)}
                  style={{ width: 220 }}>
                  {monthOptions.map(m => (
                    <option key={m.val} value={m.val}>{m.label}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" onClick={exportBillingCSV}>Export Billing CSV</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
              {[
                { label: 'Billable Submissions', value: totalBillable, color: '#FAFAFA' },
                { label: 'Duplicates Blocked', value: totalDuplicates, color: '#F59E0B' },
                { label: 'Brands Active', value: billingRows.length, color: '#A1A1AA' },
                { label: 'Revenue', value: `$${totalRevenue}.00`, color: 'var(--success)' },
              ].map(s => (
                <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Brand', 'VIP', 'Promo', 'Warranty', 'Event', 'Billable', 'Duplicates', 'Amount Due'].map(h => (
                      <th key={h} style={{
                        padding: '12px 14px', textAlign: 'left',
                        fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {billingRows.map(([name, b]) => (
                    <tr key={name} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: '0.9rem' }}>{name}</td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem' }}>{b.byType.vip || 0}</td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem' }}>{b.byType.promo || 0}</td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem' }}>{b.byType.warranty || 0}</td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem' }}>{b.byType.event || 0}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.9rem' }}>{b.billable}</td>
                      <td style={{ padding: '12px 14px', color: '#F59E0B', fontSize: '0.85rem' }}>{b.duplicates}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--success)', fontSize: '0.9rem' }}>${b.billable}.00</td>
                    </tr>
                  ))}
                  {billingRows.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No submissions for this billing period.
                      </td>
                    </tr>
                  )}
                  {billingRows.length > 0 && (
                    <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '14px', fontWeight: 700, fontSize: '0.9rem' }}>TOTAL</td>
                      <td style={{ padding: '14px' }} />
                      <td style={{ padding: '14px' }} />
                      <td style={{ padding: '14px' }} />
                      <td style={{ padding: '14px' }} />
                      <td style={{ padding: '14px', fontWeight: 700, fontSize: '0.9rem' }}>{totalBillable}</td>
                      <td style={{ padding: '14px', color: '#F59E0B' }}>{totalDuplicates}</td>
                      <td style={{ padding: '14px', fontWeight: 700, color: 'var(--success)', fontSize: '1rem' }}>${totalRevenue}.00</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
