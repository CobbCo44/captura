import { useState } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import Products from './dashboard/Products'
import QRCodes from './dashboard/QRCodes'
import Scans from './dashboard/Scans'
import VIPMembers from './dashboard/VIPMembers'
import Overview from './dashboard/Overview'

const navItems = [
  { path: '', label: 'Overview', icon: '◎' },
  { path: 'products', label: 'Products', icon: '▦' },
  { path: 'qr-codes', label: 'QR Codes', icon: '⊞' },
  { path: 'scans', label: 'Scans', icon: '📍' },
  { path: 'vip', label: 'VIP Members', icon: '👑' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [mobileNav, setMobileNav] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, background: 'var(--bg-card)', borderRight: '1px solid var(--border)',
        padding: '24px 0', display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10,
        transform: mobileNav ? 'translateX(0)' : undefined,
      }}>
        <div style={{ padding: '0 20px', marginBottom: 32 }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            Captura
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Brand Dashboard</div>
        </div>

        <nav style={{ flex: 1 }}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={`/dashboard/${item.path}`}
              end={item.path === ''}
              onClick={() => setMobileNav(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 20px', fontSize: '0.9rem', fontWeight: 500,
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                background: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                borderRight: isActive ? '3px solid #FAFAFA' : '3px solid transparent',
                transition: 'all 0.15s',
              })}
            >
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '0 20px' }}>
          <button
            onClick={() => navigate('/')}
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '0.85rem' }}
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1, marginLeft: 240, padding: '32px 40px',
        maxWidth: 1100
      }}>
        <Routes>
          <Route index element={<Overview />} />
          <Route path="products" element={<Products />} />
          <Route path="qr-codes" element={<QRCodes />} />
          <Route path="scans" element={<Scans />} />
          <Route path="vip" element={<VIPMembers />} />
        </Routes>
      </main>
    </div>
  )
}
