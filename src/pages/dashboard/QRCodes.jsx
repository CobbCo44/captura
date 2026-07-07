import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

const demoQRs = [
  { id: 'q1', product: 'Pro Wireless Earbuds', scans: 412, created: '2026-06-15', color: '#6C2BD9' },
  { id: 'q2', product: 'Running Shoes V2', scans: 287, created: '2026-06-20', color: '#EC4899' },
  { id: 'q3', product: 'Sport Water Bottle', scans: 198, created: '2026-06-22', color: '#10B981' },
  { id: 'q4', product: 'Training Gloves', scans: 156, created: '2026-06-28', color: '#F59E0B' },
]

export default function QRCodes() {
  const [qrCodes, setQrCodes] = useState(demoQRs)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ product: '', fgColor: '#6C2BD9', bgColor: '#0F0F14' })

  const scanUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const handleCreate = (e) => {
    e.preventDefault()
    const newQR = {
      id: `q${qrCodes.length + 1}`,
      product: form.product,
      scans: 0,
      created: new Date().toISOString().split('T')[0],
      color: form.fgColor
    }
    setQrCodes([...qrCodes, newQR])
    setForm({ product: '', fgColor: '#6C2BD9', bgColor: '#0F0F14' })
    setShowCreate(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>QR Codes</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create QR Code</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
        {qrCodes.map(qr => (
          <div key={qr.id} className="card" style={{ textAlign: 'center' }}>
            <div style={{
              background: '#0F0F14', borderRadius: 12, padding: 24,
              display: 'flex', justifyContent: 'center', marginBottom: 16
            }}>
              <QRCodeSVG
                value={`${scanUrl}/s/${qr.id}`}
                size={160}
                fgColor={qr.color}
                bgColor="transparent"
                level="H"
                style={{ width: 160, height: 160 }}
              />
            </div>
            <h3 style={{ fontWeight: 600, marginBottom: 4 }}>{qr.product}</h3>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
              {qr.scans} scans &middot; Created {qr.created}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}>
                Download
              </button>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}>
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create QR Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }} onClick={() => setShowCreate(false)}>
          <div className="card" style={{ width: 480, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>Create Custom QR Code</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                    QR Color
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={form.fgColor}
                      onChange={e => setForm({ ...form, fgColor: e.target.value })}
                      style={{ width: 44, height: 44, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                    <input className="input" value={form.fgColor}
                      onChange={e => setForm({ ...form, fgColor: e.target.value })}
                      style={{ flex: 1 }} />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                    Background
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={form.bgColor}
                      onChange={e => setForm({ ...form, bgColor: e.target.value })}
                      style={{ width: 44, height: 44, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                    <input className="input" value={form.bgColor}
                      onChange={e => setForm({ ...form, bgColor: e.target.value })}
                      style={{ flex: 1 }} />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div style={{
                background: form.bgColor, borderRadius: 12, padding: 32,
                display: 'flex', justifyContent: 'center', border: '1px solid var(--border)'
              }}>
                <QRCodeSVG
                  value={`${scanUrl}/s/preview`}
                  size={180}
                  fgColor={form.fgColor}
                  bgColor="transparent"
                  level="H"
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
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
