import { useState, useEffect } from 'react'
import { supabase, generateShortId } from '../../lib/supabase'
import BrandedQR from '../../components/BrandedQR'

export default function QRCodes({ brand }) {
  const [qrCodes, setQrCodes] = useState([])
  const [products, setProducts] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    productId: '',
    fgColor: '#18181B',
    bgColor: '#FFFFFF',
    logoFile: null,
    logoScale: 0.25,
  })

  const scanUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    loadData()
  }, [brand])

  async function loadData() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setQrCodes([])
      setProducts([])
      setLoading(false)
      return
    }
    const [qrRes, prodRes] = await Promise.all([
      supabase.from('qr_codes').select('*, products(name, sku)').eq('brand_id', brand.id).order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, sku').eq('brand_id', brand.id).order('name'),
    ])
    setQrCodes(qrRes.data || [])
    setProducts(prodRes.data || [])
    setLoading(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!supabase || !brand?.id || brand.id === 'demo') return

    const shortId = generateShortId()
    const { data, error } = await supabase.from('qr_codes').insert({
      brand_id: brand.id,
      product_id: form.productId,
      short_id: shortId,
      fg_color: form.fgColor,
      bg_color: form.bgColor,
      logo_scale: form.logoScale,
    }).select('*, products(name, sku)').single()

    if (!error && data) {
      setQrCodes([data, ...qrCodes])
    }
    setForm({ productId: '', fgColor: '#18181B', bgColor: '#FFFFFF', logoFile: null, logoScale: 0.25 })
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

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading...</div>
      ) : qrCodes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>No QR codes yet</div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            {products.length === 0
              ? 'Add a product first, then create a QR code for it.'
              : 'Create your first QR code to start tracking scans.'}
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create QR Code</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {qrCodes.map(qr => (
            <div key={qr.id} className="card" style={{ textAlign: 'center' }}>
              <div style={{
                background: '#0A0A10', borderRadius: 12, padding: 28,
                display: 'flex', justifyContent: 'center', marginBottom: 16
              }}>
                <BrandedQR
                  url={`${scanUrl}/s/${qr.short_id}`}
                  fgColor={qr.fg_color}
                  bgColor={qr.bg_color}
                  logoSrc={qr.logo_url || null}
                  logoScale={qr.logo_scale || 0.25}
                  size={200}
                />
              </div>
              <h3 style={{ fontWeight: 600, marginBottom: 4 }}>{qr.products?.name || 'Product'}</h3>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 4 }}>
                {qr.products?.sku || ''}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 12 }}>
                ID: {qr.short_id}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}>
                  Download PNG
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          padding: 24
        }} onClick={() => setShowCreate(false)}>
          <div className="card" style={{ width: 580, maxWidth: '95vw' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 24 }}>Create QR Code</h2>

            {products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>You need to add a product first before creating a QR code.</p>
                <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Close</button>
              </div>
            ) : (
              <form onSubmit={handleCreate}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        Product
                      </label>
                      <select className="input" value={form.productId}
                        onChange={e => setForm({ ...form, productId: e.target.value })} required>
                        <option value="">Select a product</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
                        ))}
                      </select>
                    </div>

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

                    {form.logoFile && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                          Logo Size: {Math.round(form.logoScale * 100)}%
                        </label>
                        <input type="range" min="0.15" max="0.40" step="0.01" value={form.logoScale}
                          onChange={e => setForm({ ...form, logoScale: parseFloat(e.target.value) })}
                          style={{ width: '100%' }} />
                      </div>
                    )}

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
            )}
          </div>
        </div>
      )}
    </div>
  )
}
