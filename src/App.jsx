import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import ScanPage from './pages/ScanPage'
import Login from './pages/Login'
import Admin from './pages/Admin'
import Pricing from './pages/Pricing'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import GS1 from './pages/GS1'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard/*" element={<Dashboard />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/01/:gtin/21/:serial" element={<ScanPage />} />
      <Route path="/01/:gtin" element={<ScanPage />} />
      <Route path="/s/:qrId" element={<ScanPage />} />
      <Route path="/gs1" element={<GS1 />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
    </Routes>
  )
}
