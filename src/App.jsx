import { useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import ScanPage from './pages/ScanPage'
import Login from './pages/Login'
import Admin from './pages/Admin'
// import Pricing from './pages/Pricing'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import StorefrontScanPage from './pages/StorefrontScanPage'
import GS1 from './pages/GS1'
import Storefronts from './pages/Storefronts'

export default function App() {
  const navigate = useNavigate()

  // Password-reset links can land on any page (Supabase redirects to the
  // site root by default). Wherever the recovery ticket arrives, hand the
  // user to the login page's set-new-password screen.
  useEffect(() => {
    if (!supabase) return
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') navigate('/login#type=recovery')
    })
    return () => sub.subscription.unsubscribe()
  }, [navigate])

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard/*" element={<Dashboard />} />
      <Route path="/admin" element={<Admin />} />
      {/* <Route path="/pricing" element={<Pricing />} /> */}
      <Route path="/01/:gtin/21/:serial" element={<ScanPage />} />
      <Route path="/01/:gtin" element={<ScanPage />} />
      <Route path="/s/:qrId" element={<ScanPage />} />
      <Route path="/store/:brandId" element={<StorefrontScanPage />} />
      <Route path="/gs1" element={<GS1 />} />
      <Route path="/storefronts" element={<Storefronts />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
    </Routes>
  )
}
