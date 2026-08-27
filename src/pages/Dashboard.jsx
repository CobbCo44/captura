import { useState, useEffect, useRef } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { supabase, getAllBrands } from '../lib/supabase'
import { createBrandForUser } from '../lib/createBrand'
import { INDUSTRIES } from '../lib/industries'
import Products from './dashboard/Products'
import ScanPageTiles from './dashboard/ScanPageTiles'
import Billing from './dashboard/Billing'
import QRCodes from './dashboard/QRCodes'
import Scans from './dashboard/Scans'
import VIPMembers from './dashboard/VIPMembers'
import Overview from './dashboard/Overview'
import Promos from './dashboard/Promos'
import Socials from './dashboard/Socials'
import Brand from './dashboard/Brand'
import Insights from './dashboard/Insights'
import Consumers from './dashboard/Consumers'
import Events from './dashboard/Events'
import Settings from './dashboard/Settings'
import Loyalty from './dashboard/Loyalty'
import Menu from './dashboard/Menu'
import Passport from './dashboard/Passport'
import Email from './dashboard/Email'

const productNavItems = [
  { path: '', label: 'Overview', icon: '◎' },
  { path: 'brand', label: 'Brand', icon: '◆' },
  { path: 'scan-page', label: 'Scan Page', icon: '▧' },
  { path: 'products', label: 'Products', icon: '▦' },
  { path: 'qr-codes', label: 'QR Codes', icon: '⊞' },
  { path: 'promos', label: 'Promos', icon: '🎁' },
  { path: 'events', label: 'Events', icon: '🎪' },
  { path: 'socials', label: 'Socials', icon: '🔗' },
  { path: 'scans', label: 'Scans', icon: '📍' },
  { path: 'consumers', label: 'Consumers', icon: '👥' },
  { path: 'loyalty', label: 'Loyalty', icon: '⭐' },
  { path: 'passport', label: 'Passport', icon: '🛂' },
  { path: 'insights', label: 'Insights', icon: '📊' },
  { path: 'billing', label: 'Billing', icon: '💳' },
  { path: 'settings', label: 'Settings', icon: '⚙' },
]

const storefrontNavItems = [
  { path: '', label: 'Overview', icon: '◎' },
  { path: 'brand', label: 'Brand', icon: '◆' },
  { path: 'scan-page', label: 'Scan Page', icon: '▧' },
  { path: 'menu', label: 'Menu / Services', icon: '▤' },
  { path: 'products', label: 'Products', icon: '▦' },
  { path: 'qr-codes', label: 'QR Codes', icon: '⊞' },
  { path: 'promos', label: 'Promos', icon: '🎁' },
  { path: 'events', label: 'Events', icon: '🎪' },
  { path: 'socials', label: 'Socials', icon: '🔗' },
  { path: 'scans', label: 'Scans', icon: '📍' },
  { path: 'consumers', label: 'Consumers', icon: '👥' },
  { path: 'loyalty', label: 'Loyalty', icon: '⭐' },
  { path: 'email', label: 'Email', icon: '✉' },
  { path: 'insights', label: 'Insights', icon: '📊' },
  { path: 'billing', label: 'Billing', icon: '💳' },
  { path: 'settings', label: 'Settings', icon: '⚙' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [brand, setBrand] = useState(null)
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [mobileNav, setMobileNav] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [showNewBrand, setShowNewBrand] = useState(false)
  const [newBrandName, setNewBrandName] = useState('')
  const [newBrandIndustry, setNewBrandIndustry] = useState('')
  const [newBrandType, setNewBrandType] = useState('product')
  const [creatingBrand, setCreatingBrand] = useState(false)
  const switcherRef = useRef(null)

  // Close switcher when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setSwitcherOpen(false)
        setShowNewBrand(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    async function loadBrands() {
      if (!supabase) {
        setBrand({ id: 'demo', name: 'Demo Brand' })
        setBrands([{ id: 'demo', name: 'Demo Brand' }])
        setLoading(false)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }
      let allBrands = await getAllBrands()
      if (allBrands.length === 0) {
        const { data: newBrand, error: createError } = await createBrandForUser(user)
        if (createError) {
          alert('We could not finish setting up your account: ' + createError.message + '. Please refresh to try again.')
        }
        allBrands = newBrand ? [newBrand] : []
      }
      setBrands(allBrands)
      const savedBrandId = localStorage.getItem('captura_brand_id')
      const savedBrand = savedBrandId && allBrands.find(b => b.id === savedBrandId)
      setBrand(savedBrand || allBrands[0] || { id: 'demo', name: 'My Brand' })
      setLoading(false)
    }
    loadBrands()
  }, [navigate])

  const switchBrand = (b) => {
    setBrand(b)
    localStorage.setItem('captura_brand_id', b.id)
    setSwitcherOpen(false)
  }

  const deleteBrand = async (brandToDelete) => {
    if (brands.length <= 1) return
    if (!window.confirm(`Delete "${brandToDelete.name}" and ALL its products, QR codes, promos, consumers, and scans? This cannot be undone.`)) return
    const { error } = await supabase.from('brands').delete().eq('id', brandToDelete.id)
    if (error) {
      alert('Failed to delete brand: ' + error.message)
      return
    }
    const remaining = brands.filter(b => b.id !== brandToDelete.id)
    setBrands(remaining)
    if (brand?.id === brandToDelete.id) {
      setBrand(remaining[0] || null)
    }
  }

  const createNewBrand = async () => {
    if (!newBrandName.trim() || !supabase) return
    setCreatingBrand(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: newBrand } = await supabase.from('brands').insert({
      user_id: user.id,
      name: newBrandName.trim(),
      email: user.email,
      industry: newBrandIndustry || null,
      business_type: newBrandType,
    }).select().single()
    if (newBrand) {
      setBrands(prev => [...prev, newBrand])
      setBrand(newBrand)
    }
    setNewBrandName('')
    setNewBrandIndustry('')
    setNewBrandType('product')
    setShowNewBrand(false)
    setSwitcherOpen(false)
    setCreatingBrand(false)
  }

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut()
    navigate('/')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile nav toggle */}
      <button onClick={() => setMobileNav(!mobileNav)} style={{
        display: 'none', position: 'fixed', top: 12, left: 12, zIndex: 20,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '8px 12px', color: '#FAFAFA', fontSize: '1.2rem',
        cursor: 'pointer',
      }} className="mobile-nav-toggle">
        {mobileNav ? '✕' : '☰'}
      </button>

      {/* Overlay */}
      {mobileNav && (
        <div onClick={() => setMobileNav(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9,
        }} className="mobile-overlay" />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 240, background: 'var(--bg-card)', borderRight: '1px solid var(--border)',
        padding: '24px 0', display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10,
        transform: mobileNav ? 'translateX(0)' : undefined,
        transition: 'transform 0.2s',
      }} className="sidebar">
        <div style={{ padding: '0 20px', marginBottom: 32 }}>
          <img src="/images/meetcaptura-logo.png" alt="meetcaptura" style={{ marginBottom: 12, filter: 'invert(1)', width: '80%', objectFit: 'contain', objectPosition: 'left' }} />
          <div ref={switcherRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setSwitcherOpen(!switcherOpen)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)', borderRadius: 8,
                cursor: 'pointer', color: '#FAFAFA', fontSize: '0.82rem',
                fontWeight: 500, textAlign: 'left',
              }}
            >
              {brand?.logo_url && (
                <img src={brand.logo_url} alt="" style={{
                  width: 22, height: 22, borderRadius: 4, objectFit: 'contain',
                  background: '#fff', padding: 1, flexShrink: 0,
                }} />
              )}
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {brand?.name || 'Select Brand'}
              </span>
              <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>{switcherOpen ? '▲' : '▼'}</span>
            </button>

            {switcherOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 8, overflow: 'hidden', zIndex: 50,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {brands.map(b => (
                  <div
                    key={b.id}
                    className="brand-row"
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '9px 12px', background: b.id === brand?.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                      cursor: 'pointer', color: '#FAFAFA',
                      fontSize: '0.82rem', textAlign: 'left',
                    }}
                    onClick={() => switchBrand(b)}
                  >
                    {b.logo_url ? (
                      <img src={b.logo_url} alt="" style={{
                        width: 20, height: 20, borderRadius: 4, objectFit: 'contain',
                        background: '#fff', padding: 1,
                      }} />
                    ) : (
                      <span style={{
                        width: 20, height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem',
                      }}>{b.name?.[0]}</span>
                    )}
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.name}
                    </span>
                    {b.id === brand?.id && <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>✓</span>}
                    {brands.length > 1 && (
                      <span
                        onClick={(e) => { e.stopPropagation(); deleteBrand(b) }}
                        style={{
                          fontSize: '0.65rem', cursor: 'pointer',
                          padding: '2px 6px', borderRadius: 4, color: '#ef4444',
                          opacity: 0.5,
                        }}
                        title={`Delete ${b.name}`}
                      >✕</span>
                    )}
                  </div>
                ))}
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {!showNewBrand ? (
                    <button
                      onClick={() => setShowNewBrand(true)}
                      style={{
                        width: '100%', padding: '9px 12px', background: 'transparent',
                        border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                        fontSize: '0.8rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>+</span> Create New Demo
                    </button>
                  ) : (
                    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input
                        type="text"
                        placeholder="Brand name"
                        value={newBrandName}
                        onChange={e => setNewBrandName(e.target.value)}
                        autoFocus
                        style={{
                          width: '100%', padding: '6px 8px', fontSize: '0.8rem',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                          borderRadius: 6, color: '#FAFAFA', outline: 'none',
                        }}
                      />
                      <select
                        value={newBrandType}
                        onChange={e => setNewBrandType(e.target.value)}
                        style={{
                          width: '100%', padding: '6px 8px', fontSize: '0.8rem',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                          borderRadius: 6, color: '#FAFAFA', outline: 'none',
                        }}
                      >
                        <option value="product">Product Brand</option>
                        <option value="storefront">Storefront</option>
                      </select>
                      <select
                        value={newBrandIndustry}
                        onChange={e => setNewBrandIndustry(e.target.value)}
                        style={{
                          width: '100%', padding: '6px 8px', fontSize: '0.8rem',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                          borderRadius: 6, color: '#FAFAFA', outline: 'none',
                        }}
                      >
                        <option value="">Industry (optional)</option>
                        {INDUSTRIES.map(ind => (
                          <option key={ind} value={ind}>{ind}</option>
                        ))}
                      </select>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={createNewBrand}
                          disabled={!newBrandName.trim() || creatingBrand}
                          style={{
                            flex: 1, padding: '6px', fontSize: '0.78rem', fontWeight: 600,
                            background: '#FAFAFA', color: '#0A0A0A', border: 'none',
                            borderRadius: 6, cursor: 'pointer', opacity: !newBrandName.trim() ? 0.4 : 1,
                          }}
                        >
                          {creatingBrand ? '...' : 'Create'}
                        </button>
                        <button
                          onClick={() => { setShowNewBrand(false); setNewBrandName(''); setNewBrandIndustry('') }}
                          style={{
                            padding: '6px 10px', fontSize: '0.78rem',
                            background: 'transparent', color: 'var(--text-muted)',
                            border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <nav style={{ flex: 1, overflow: 'auto' }}>
          {(brand?.business_type === 'storefront' ? storefrontNavItems : productNavItems).map(item => (
            <NavLink
              key={item.path}
              to={`/dashboard/${item.path}`}
              end={item.path === ''}
              onClick={() => setMobileNav(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 20px', fontSize: '0.88rem', fontWeight: 500,
                color: isActive ? '#FAFAFA' : 'var(--text-muted)',
                background: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                borderRight: isActive ? '3px solid #FAFAFA' : '3px solid transparent',
                transition: 'all 0.15s',
              })}
            >
              <span style={{ fontSize: '1rem' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '0 20px' }}>
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.85rem' }}
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, marginLeft: 240, padding: '32px 40px', minWidth: 0 }}
        className="main-content">
        <Routes>
          <Route index element={<Overview brand={brand} />} />
          <Route path="products" element={<Products brand={brand} />} />
          <Route path="menu" element={<Menu brand={brand} />} />
          <Route path="qr-codes" element={<QRCodes brand={brand} />} />
          <Route path="brand" element={<Brand brand={brand} onBrandUpdate={setBrand} />} />
          <Route path="scan-page" element={<ScanPageTiles brand={brand} />} />
          <Route path="billing" element={<Billing brand={brand} />} />
          <Route path="promos" element={<Promos brand={brand} />} />
          <Route path="events" element={<Events brand={brand} />} />
          <Route path="socials" element={<Socials brand={brand} />} />
          <Route path="scans" element={<Scans brand={brand} />} />
          <Route path="vip" element={<VIPMembers brand={brand} />} />
          <Route path="consumers" element={<Consumers brand={brand} />} />
          <Route path="loyalty" element={<Loyalty brand={brand} />} />
          <Route path="email" element={<Email brand={brand} />} />
          <Route path="passport" element={<Passport brand={brand} />} />
          <Route path="insights" element={<Insights brand={brand} />} />
          <Route path="settings" element={<Settings brand={brand} onBrandUpdate={setBrand} />} />
        </Routes>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .mobile-nav-toggle { display: block !important; }
          .sidebar { transform: translateX(-100%); }
          .main-content { margin-left: 0 !important; padding: 60px 16px 32px !important; }
        }
      `}</style>
    </div>
  )
}
