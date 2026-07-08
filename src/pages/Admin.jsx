import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { INDUSTRIES } from '../lib/industries'

export default function Admin() {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [brands, setBrands] = useState([])
  const [scans, setScans] = useState([])
  const [vipMembers, setVipMembers] = useState([])
  const [promoEntries, setPromoEntries] = useState([])
  const [selectedIndustry, setSelectedIndustry] = useState('all')

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {
    if (!supabase) { navigate('/'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }

    const { data } = await supabase.from('admins').select('user_id').eq('user_id', user.id).single()
    if (!data) { navigate('/dashboard'); return }

    setIsAdmin(true)
    loadAllData()
  }

  async function loadAllData() {
    const [brandsRes, scansRes, vipRes, promoRes] = await Promise.all([
      supabase.from('brands').select('*').order('created_at', { ascending: false }),
      supabase.from('scans').select('*, products(name, sku), brands:brand_id(name, industry)').order('scanned_at', { ascending: false }).limit(1000),
      supabase.from('vip_members').select('*, products(name), brands:brand_id(name, industry)').order('joined_at', { ascending: false }),
      supabase.from('promo_entries').select('*, products(name), brands:brand_id(name, industry)').order('entered_at', { ascending: false }),
    ])
    setBrands(brandsRes.data || [])
    setScans(scansRes.data || [])
    setVipMembers(vipRes.data || [])
    setPromoEntries(promoRes.data || [])
    setLoading(false)
  }

  if (!isAdmin || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    )
  }

  // Filter by industry
  const filteredBrands = selectedIndustry === 'all' ? brands : brands.filter(b => b.industry === selectedIndustry)
  const brandIds = new Set(filteredBrands.map(b => b.id))
  const filteredScans = selectedIndustry === 'all' ? scans : scans.filter(s => brandIds.has(s.brand_id))
  const filteredVIP = selectedIndustry === 'all' ? vipMembers : vipMembers.filter(v => brandIds.has(v.brand_id))
  const filteredPromo = selectedIndustry === 'all' ? promoEntries : promoEntries.filter(p => brandIds.has(p.brand_id))

  // Industry breakdown
  const industryStats = {}
  brands.forEach(b => {
    const ind = b.industry || 'Uncategorized'
    if (!industryStats[ind]) industryStats[ind] = { brands: 0, scans: 0, vip: 0 }
    industryStats[ind].brands++
  })
  scans.forEach(s => {
    const ind = s.brands?.industry || 'Uncategorized'
    if (!industryStats[ind]) industryStats[ind] = { brands: 0, scans: 0, vip: 0 }
    industryStats[ind].scans++
  })
  vipMembers.forEach(v => {
    const ind = v.brands?.industry || 'Uncategorized'
    if (!industryStats[ind]) industryStats[ind] = { brands: 0, scans: 0, vip: 0 }
    industryStats[ind].vip++
  })
  const industryData = Object.entries(industryStats).sort((a, b) => b[1].scans - a[1].scans)

  const exportAllCSV = () => {
    const headers = ['Industry', 'Brand', 'First Name', 'Last Name', 'Email', 'Phone', 'Product', 'City', 'Type', 'Date']
    const rows = []

    filteredVIP.forEach(v => {
      rows.push([
        v.brands?.industry || '', v.brands?.name || '', v.first_name, v.last_name,
        v.email || '', v.phone, v.products?.name || '', v.city || '', 'VIP',
        new Date(v.joined_at).toLocaleDateString(),
      ])
    })
    filteredPromo.forEach(p => {
      rows.push([
        p.brands?.industry || '', p.brands?.name || '', p.first_name, p.last_name,
        p.email || '', p.phone, p.products?.name || '', p.city || '', 'Promo Entry',
        new Date(p.entered_at).toLocaleDateString(),
      ])
    })

    const csv = [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.download = `captura-master-${selectedIndustry === 'all' ? 'all' : selectedIndustry}-${new Date().toISOString().split('T')[0]}.csv`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const tabStyle = (active) => ({
    padding: '10px 20px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
    background: active ? '#FAFAFA' : 'var(--bg-card)',
    color: active ? '#09090B' : 'var(--text-muted)',
    border: active ? 'none' : '1px solid var(--border)',
  })

  return (
    <div style={{ minHeight: '100vh', padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>CAPTURA ADMIN</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Master Data Console</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={exportAllCSV}>Export CSV</button>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Brand Dashboard</button>
        </div>
      </div>

      {/* Industry Filter */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter by Industry:</label>
        <select className="input" value={selectedIndustry} onChange={e => setSelectedIndustry(e.target.value)}
          style={{ width: 260 }}>
          <option value="all">All Industries</option>
          {INDUSTRIES.map(ind => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Brands', value: filteredBrands.length, color: '#FAFAFA' },
          { label: 'Total Scans', value: filteredScans.length, color: '#A1A1AA' },
          { label: 'VIP Members', value: filteredVIP.length, color: 'var(--success)' },
          { label: 'Promo Entries', value: filteredPromo.length, color: '#D4D4D8' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button onClick={() => setTab('overview')} style={tabStyle(tab === 'overview')}>By Industry</button>
        <button onClick={() => setTab('consumers')} style={tabStyle(tab === 'consumers')}>All Consumers</button>
        <button onClick={() => setTab('brands')} style={tabStyle(tab === 'brands')}>All Brands</button>
        <button onClick={() => setTab('scans')} style={tabStyle(tab === 'scans')}>All Scans</button>
      </div>

      {/* By Industry Tab */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {industryData.map(([industry, stats]) => (
            <div key={industry} className="card" onClick={() => setSelectedIndustry(industry === 'Uncategorized' ? 'all' : industry)}
              style={{ cursor: 'pointer' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>{industry}</h3>
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Brands</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stats.brands}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Scans</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stats.scans}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>VIP Members</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--success)' }}>{stats.vip}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All Consumers Tab */}
      {tab === 'consumers' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Email', 'Phone', 'Brand', 'Industry', 'Product', 'City', 'Type', 'Date'].map(h => (
                  <th key={h} style={{
                    padding: '12px 14px', textAlign: 'left',
                    fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredVIP.map(v => (
                <tr key={`vip-${v.id}`} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, fontSize: '0.85rem' }}>{v.first_name} {v.last_name}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{v.email || '-'}</td>
                  <td style={{ padding: '10px 14px', fontSize: '0.85rem' }}>{v.phone}</td>
                  <td style={{ padding: '10px 14px', fontSize: '0.85rem' }}>{v.brands?.name || '-'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{v.brands?.industry || '-'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{v.products?.name || '-'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{v.city || '-'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600, background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' }}>VIP</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(v.joined_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {filteredPromo.map(p => (
                <tr key={`promo-${p.id}`} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, fontSize: '0.85rem' }}>{p.first_name} {p.last_name}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.email || '-'}</td>
                  <td style={{ padding: '10px 14px', fontSize: '0.85rem' }}>{p.phone}</td>
                  <td style={{ padding: '10px 14px', fontSize: '0.85rem' }}>{p.brands?.name || '-'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{p.brands?.industry || '-'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.products?.name || '-'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.city || '-'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600, background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>Promo</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(p.entered_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* All Brands Tab */}
      {tab === 'brands' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Brand', 'Industry', 'Email', 'Joined'].map(h => (
                  <th key={h} style={{
                    padding: '12px 14px', textAlign: 'left',
                    fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredBrands.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 500 }}>{b.name}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{b.industry || '-'}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{b.email}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(b.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* All Scans Tab */}
      {tab === 'scans' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Brand', 'Industry', 'Product', 'City', 'Device', 'Time'].map(h => (
                  <th key={h} style={{
                    padding: '12px 14px', textAlign: 'left',
                    fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredScans.slice(0, 100).map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 500, fontSize: '0.85rem' }}>{s.brands?.name || '-'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{s.brands?.industry || '-'}</td>
                  <td style={{ padding: '10px 14px', fontSize: '0.85rem' }}>{s.products?.name || '-'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{s.city || '-'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{s.device || '-'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(s.scanned_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
