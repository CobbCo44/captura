import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { supabase, getCurrentBrand } from '../lib/supabase'
import Products from './dashboard/Products'
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

const navItems = [
  { path: '', label: 'Overview', icon: '◎' },
  { path: 'brand', label: 'Brand', icon: '◆' },
  { path: 'products', label: 'Products', icon: '▦' },
  { path: 'qr-codes', label: 'QR Codes', icon: '⊞' },
  { path: 'promos', label: 'Promos', icon: '🎁' },
  { path: 'events', label: 'Events', icon: '🎪' },
  { path: 'socials', label: 'Socials', icon: '🔗' },
  { path: 'scans', label: 'Scans', icon: '📍' },
  { path: 'consumers', label: 'Consumers', icon: '👥' },
  { path: 'insights', label: 'Insights', icon: '📊' },
  { path: 'settings', label: 'Settings', icon: '⚙' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [brand, setBrand] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => {
    async function loadBrand() {
      if (!supabase) {
        setBrand({ id: 'demo', name: 'Demo Brand' })
        setLoading(false)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }
      let b = await getCurrentBrand()
      if (!b) {
        const { data: newBrand } = await supabase.from('brands').insert({
          user_id: user.id,
          name: user.user_metadata?.brand_name || 'My Brand',
          email: user.email,
        }).select().single()
        b = newBrand
      }
      setBrand(b || { id: 'demo', name: 'My Brand' })
      setLoading(false)
    }
    loadBrand()
  }, [navigate])

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {brand?.logo_url && (
              <img src={brand.logo_url} alt="" style={{
                width: 28, height: 28, borderRadius: 6, objectFit: 'contain',
                background: '#fff', padding: 2,
              }} />
            )}
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FAFAFA' }}>Captura</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {brand?.name || 'Brand Dashboard'}
              </div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, overflow: 'auto' }}>
          {navItems.map(item => (
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
          <Route path="qr-codes" element={<QRCodes brand={brand} />} />
          <Route path="brand" element={<Brand brand={brand} onBrandUpdate={setBrand} />} />
          <Route path="promos" element={<Promos brand={brand} />} />
          <Route path="events" element={<Events brand={brand} />} />
          <Route path="socials" element={<Socials brand={brand} />} />
          <Route path="scans" element={<Scans brand={brand} />} />
          <Route path="vip" element={<VIPMembers brand={brand} />} />
          <Route path="consumers" element={<Consumers brand={brand} />} />
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
