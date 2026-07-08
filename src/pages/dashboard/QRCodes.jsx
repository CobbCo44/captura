import { useState } from 'react'
import BrandedQR from '../../components/BrandedQR'

const demoQRs = [
  { id: 'q1', product: 'Pro Wireless Earbuds', scans: 412, created: '2026-06-15', fgColor: '#6C2BD9', bgColor: '#FFFFFF' },
  { id: 'q2', product: 'Running Shoes V2', scans: 287, created: '2026-06-20', fgColor: '#EC4899', bgColor: '#FFFFFF' },
  { id: 'q3', product: 'Sport Water Bottle', scans: 198, created: '2026-06-22', fgColor: '#10B981', bgColor: '#FFFFFF' },
  { id: 'q4', product: 'Training Gloves', scans: 156, created: '2026-06-28', fgColor: '#F59E0B', bgColor: '#FFFFFF' },
]

export default function QRCodes() {
  const [qrCodes, setQrCodes] = useState(demoQRs)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    product: '',
    fgColor: '#6C2BD9',
    bgColor: '#FFFFFF',
    logoFile: null,
    logoScale: 0.25,
  })

  const scanUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const handleCreate = (e) => {
    e.preventDefault()
    const newQR = {
      id: `q${Date.now()}`,
      product: form.product,
      scans: 0,
      created: new Date().toISOString().split('T')[0],
      fgColor: form.fgColor,
      bgColor: form.bgColor,
      logoFile: form.logoFile,
      logoScale: form.logoScale,
    }
    setQrCodes([...qrCodes, newQR])
    setForm({ product: '', fgColor: '#6C2BD9', bgColor: '#FFFFFF', logoFile: null, logoScale: 0.25 })
    setShowCreate(false)
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setForm({ ...form, logoFile: ev.target.result })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>QR Codes</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Branded QR codes with your logo in the center
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create QR Code</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
        {qrCodes.map(qr => (
          <div key={qr.id} className="card" style={{ textAlign: 'center' }}>
            <div style={{
              background: '#0A0A10', borderRadius: 12, padding: 28,
              display: 'flex', justifyContent: 'center', marginBottom: 16
            }}>
              <BrandedQR
                url={`${scanUrl}/s/${qr.id}`}
                fgColor={qr.fgColor}
                bgColor={qr.bgColor}
                logoSrc={qr.logoFile || null}
                logoScale={qr.logoScale || 0.25}
                size={200}
              />
            </div>
            <h3 style={{ fontWeight: 600, marginBottom: 4 }}>{qr.product}</h3>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
              {qr.scans} scans &middot; {qr.created}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}>
                Download PNG
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create QR Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          padding: 24
        }} onClick={() => setShowCreate(false)}>
          <div className="card" style={{ width: 580, maxWidth: '95vw' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 24 }}>Create QR Code</h2>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>

                {/* Left: Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Product */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      Product
                    </label>
                    <select className="input" value={form.product}
                      onChange={e => setForm({ ...form, product: e.target.value })} required>
                      <option value="">Select a product</option>
                      <option>Pro Wireless Earbuds</option>
                      <option>Running Shoes V2</option>
                      <option>Sport Water Bottle</option>
                      <option>Training Gloves</option>
                      <option>Yoga Mat Premium</option>
                      <option>Resistance Bands Set</option>
                    </select>
                  </div>

                  {/* Logo Upload */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      Center Logo
                    </label>
                    <input type="file" accept="image/*" onChange={handleLogoUpload}
                      style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }} />
                    {form.logoFile && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img src={form.logoFile} alt="Logo preview"
                          style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 4 }} />
                        <button type="button" onClick={() => setForm({ ...form, logoFile: null })}
                          style={{ fontSize: '0.75rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Logo Size */}
                  {form.logoFile && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        Logo Size: {Math.round(form.logoScale * 100)}%
                      </label>
                      <input type="range" min="0.15" max="0.40" step="0.01" value={form.logoScale}
                        onChange={e => setForm({ ...form, logoScale: parseFloat(e.target.value) })}
                        style={{ width: '100%', accentColor: 'var(--primary)' }} />
                    </div>
                  )}

                  {/* QR Color */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      QR Color
                    </label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={form.fgColor}
                        onChange={e => setForm({ ...form, fgColor: e.target.value })}
                        style={{ width: 40, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                      <input className="input" value={form.fgColor}
                        onChange={e => setForm({ ...form, fgColor: e.target.value })} />
                    </div>
                  </div>

                  {/* Background Color */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      Background Color
                    </label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={form.bgColor}
                        onChange={e => setForm({ ...form, bgColor: e.target.value })}
                        style={{ width: 40, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                      <input className="input" value={form.bgColor}
                        onChange={e => setForm({ ...form, bgColor: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Right: Live Preview */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Live Preview
                  </label>
                  <div style={{
                    background: '#0A0A10', borderRadius: 16, padding: 24,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    border: '1px solid var(--border)', minHeight: 280,
                  }}>
                    <BrandedQR
                      url={`${scanUrl}/s/preview`}
                      fgColor={form.fgColor}
                      bgColor={form.bgColor}
                      logoSrc={form.logoFile}
                      logoScale={form.logoScale}
                      size={240}
                    />
                  </div>
                  <p style={{
                    color: 'var(--text-muted)', fontSize: '0.75rem',
                    textAlign: 'center', marginTop: 10, lineHeight: 1.4
                  }}>
                    Scan with your phone to verify it works.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create QR Code</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
