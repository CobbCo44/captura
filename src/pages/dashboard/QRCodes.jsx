import { useState, useEffect } from 'react'
import { supabase, generateShortId } from '../../lib/supabase'
import BrandedQR from '../../components/BrandedQR'
import generateQRCode from 'qr.js'

export default function QRCodes({ brand }) {
  const [qrCodes, setQrCodes] = useState([])
  const [products, setProducts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingQR, setEditingQR] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    productId: '',
    fgColor: '#18181B',
    bgColor: '#FFFFFF',
    logoFile: null,
    logoRawFile: null,
    existingLogoUrl: null,
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

  const openCreate = () => {
    setEditingQR(null)
    setForm({ productId: '', fgColor: '#18181B', bgColor: '#FFFFFF', logoFile: null, logoRawFile: null, existingLogoUrl: null, logoScale: 0.25 })
    setShowModal(true)
  }

  const openEdit = (qr) => {
    setEditingQR(qr)
    setForm({
      productId: qr.product_id,
      fgColor: qr.fg_color || '#18181B',
      bgColor: qr.bg_color || '#FFFFFF',
      logoFile: qr.logo_url || null,
      logoRawFile: null,
      existingLogoUrl: qr.logo_url || null,
      logoScale: qr.logo_scale || 0.25,
    })
    setShowModal(true)
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setForm({ ...form, logoFile: ev.target.result, logoRawFile: file, existingLogoUrl: null })
    }
    reader.readAsDataURL(file)
  }

  const removeLogo = () => {
    setForm({ ...form, logoFile: null, logoRawFile: null, existingLogoUrl: null })
  }

  async function uploadLogo() {
    if (!form.logoRawFile || !supabase || !brand?.id) return null

    const fileExt = form.logoRawFile.name.split('.').pop()
    const fileName = `${brand.id}/qr-logo-${Date.now()}.${fileExt}`
    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, form.logoRawFile)

    if (error) {
      console.error('Logo upload error:', error)
      return null
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName)
    return urlData.publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!supabase || !brand?.id || brand.id === 'demo') return
    setSaving(true)

    // Upload logo if new file selected
    let logoUrl = form.existingLogoUrl || null
    if (form.logoRawFile) {
      const uploaded = await uploadLogo()
      if (uploaded) logoUrl = uploaded
    }

    const qrData = {
      fg_color: form.fgColor,
      bg_color: form.bgColor,
      logo_url: logoUrl,
      logo_scale: form.logoScale,
    }

    if (editingQR) {
      // Update
      const { data, error } = await supabase.from('qr_codes')
        .update({ ...qrData, product_id: form.productId })
        .eq('id', editingQR.id)
        .select('*, products(name, sku)').single()

      if (error) {
        alert(`Error updating QR code: ${error.message}`)
      } else if (data) {
        setQrCodes(qrCodes.map(q => q.id === data.id ? data : q))
      }
    } else {
      // Create
      const shortId = generateShortId()
      const { data, error } = await supabase.from('qr_codes').insert({
        brand_id: brand.id,
        product_id: form.productId,
        short_id: shortId,
        ...qrData,
      }).select('*, products(name, sku)').single()

      if (error) {
        alert(`Error creating QR code: ${error.message}`)
      } else if (data) {
        setQrCodes([data, ...qrCodes])
      }
    }

    setForm({ productId: '', fgColor: '#18181B', bgColor: '#FFFFFF', logoFile: null, logoRawFile: null, existingLogoUrl: null, logoScale: 0.25 })
    setEditingQR(null)
    setShowModal(false)
    setSaving(false)
  }

  const handleDelete = async (qr) => {
    if (!confirm(`Delete QR code for ${qr.products?.name || 'this product'}?`)) return
    if (supabase) {
      await supabase.from('qr_codes').delete().eq('id', qr.id)
    }
    setQrCodes(qrCodes.filter(q => q.id !== qr.id))
  }

  const downloadPNG = (shortId, productName) => {
    const canvas = document.getElementById(`qr-${shortId}`)
    if (!canvas) return
    // Create a high-res version
    const hiRes = document.createElement('canvas')
    hiRes.width = 1000
    hiRes.height = 1000
    const ctx = hiRes.getContext('2d')
    ctx.drawImage(canvas, 0, 0, 1000, 1000)
    const link = document.createElement('a')
    link.download = `${productName || shortId}-qr.png`
    link.href = hiRes.toDataURL('image/png')
    link.click()
  }

  const downloadSVG = (shortId, productName, qr) => {
    // Re-generate QR as SVG
    const code = generateQRCode(`${scanUrl}/s/${shortId}`)
    if (!code) return
    const matrix = code.modules
    const gridSize = matrix.length
    const modSize = 10
    const svgSize = gridSize * modSize

    let rects = ''
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (!matrix[y][x]) continue
        rects += `<rect x="${x * modSize}" y="${y * modSize}" width="${modSize}" height="${modSize}" fill="${qr.fg_color || '#18181B'}"/>`
      }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">
      <rect width="${svgSize}" height="${svgSize}" fill="${qr.bg_color || '#FFFFFF'}"/>
      ${rects}
    </svg>`

    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const link = document.createElement('a')
    link.download = `${productName || shortId}-qr.svg`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // Preview logo: use new file preview, existing URL, or null
  const previewLogo = form.logoRawFile ? form.logoFile : (form.existingLogoUrl || null)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>QR Codes</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Branded QR codes with your logo in the center
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Create QR Code</button>
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
          <button className="btn btn-primary" onClick={openCreate}>+ Create QR Code</button>
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
                  canvasId={`qr-${qr.short_id}`}
                />
              </div>
              <h3 style={{ fontWeight: 600, marginBottom: 4 }}>{qr.products?.name || 'Product'}</h3>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 4 }}>
                {qr.products?.sku || ''}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 12 }}>
                ID: {qr.short_id}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}
                  onClick={() => downloadPNG(qr.short_id, qr.products?.name)}>
                  PNG
                </button>
                <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}
                  onClick={() => downloadSVG(qr.short_id, qr.products?.name, qr)}>
                  SVG
                </button>
                <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}
                  onClick={() => openEdit(qr)}>
                  Edit
                </button>
                <button style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  fontSize: '0.75rem', cursor: 'pointer', padding: '8px',
                }}
                  onClick={() => handleDelete(qr)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          padding: 24
        }} onClick={() => { setShowModal(false); setEditingQR(null) }}>
          <div className="card" style={{ width: 580, maxWidth: '95vw' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 24 }}>
              {editingQR ? 'Edit QR Code' : 'Create QR Code'}
            </h2>

            {products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>You need to add a product first before creating a QR code.</p>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
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
                      {previewLogo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <img src={previewLogo} alt="Logo"
                            style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4, background: '#fff', padding: 2 }} />
                          <button type="button" onClick={removeLogo}
                            style={{ fontSize: '0.75rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                            Remove
                          </button>
                        </div>
                      ) : null}
                      <input type="file" accept="image/*" onChange={handleLogoUpload}
                        style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }} />
                    </div>

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
                        url={`${scanUrl}/s/${editingQR?.short_id || 'preview'}`}
                        fgColor={form.fgColor}
                        bgColor={form.bgColor}
                        logoSrc={previewLogo}
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
                    onClick={() => { setShowModal(false); setEditingQR(null) }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                    {saving ? 'Saving...' : editingQR ? 'Save Changes' : 'Create QR Code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
