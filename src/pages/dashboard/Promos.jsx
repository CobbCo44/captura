import { useState, useEffect } from 'react'
import { supabase, generateShortId } from '../../lib/supabase'
import BrandedQR from '../../components/BrandedQR'
import generateQRCode from 'qr.js'

export default function Promos({ brand }) {
  const [activeTab, setActiveTab] = useState('promos')
  const [promos, setPromos] = useState([])
  const [entries, setEntries] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingPromo, setEditingPromo] = useState(null)
  const [viewingEntries, setViewingEntries] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', description: '', prize: '' })

  // QR tab state
  const [promoQRs, setPromoQRs] = useState([])
  const [showQRModal, setShowQRModal] = useState(false)
  const [editingQR, setEditingQR] = useState(null)
  const [savingQR, setSavingQR] = useState(false)
  const [qrForm, setQRForm] = useState({
    promoId: '',
    fgColor: '#18181B',
    bgColor: '#FFFFFF',
    logoFile: null,
    logoRawFile: null,
    existingLogoUrl: null,
    logoScale: 0.25,
    ctaText: '',
  })
  const scanUrl = 'https://meetcaptura.com'

  useEffect(() => {
    loadPromos()
    loadPromoQRs()
  }, [brand])

  async function loadPromos() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setPromos([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('promos')
      .select('*')
      .eq('brand_id', brand.id)
      .order('created_at', { ascending: false })
    setPromos(data || [])
    setLoading(false)
  }

  async function loadEntries(promoId) {
    if (!supabase) return
    const { data } = await supabase
      .from('promo_entries')
      .select('*, products(name)')
      .eq('promo_id', promoId)
      .order('entered_at', { ascending: false })
    setEntries(data || [])
  }

  async function loadPromoQRs() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setPromoQRs([])
      return
    }
    const [qrRes, scansRes] = await Promise.all([
      supabase.from('qr_codes').select('*, promos(title)').eq('brand_id', brand.id).not('promo_id', 'is', null).order('created_at', { ascending: false }),
      supabase.from('scans').select('qr_code_id').eq('brand_id', brand.id),
    ])
    const scanCounts = {}
    ;(scansRes.data || []).forEach(s => {
      scanCounts[s.qr_code_id] = (scanCounts[s.qr_code_id] || 0) + 1
    })
    const qrWithCounts = (qrRes.data || []).map(qr => ({
      ...qr, scan_count: scanCounts[qr.id] || 0
    }))
    setPromoQRs(qrWithCounts)
  }

  const openCreateQR = () => {
    setEditingQR(null)
    setQRForm({ promoId: '', fgColor: '#18181B', bgColor: '#FFFFFF', logoFile: null, logoRawFile: null, existingLogoUrl: null, logoScale: 0.25, ctaText: '' })
    setShowQRModal(true)
  }

  const openEditQR = (qr) => {
    setEditingQR(qr)
    setQRForm({
      promoId: qr.promo_id || '',
      fgColor: qr.fg_color || '#18181B',
      bgColor: qr.bg_color || '#FFFFFF',
      logoFile: qr.logo_url || null,
      logoRawFile: null,
      existingLogoUrl: qr.logo_url || null,
      logoScale: qr.logo_scale || 0.25,
      ctaText: qr.cta_text || '',
    })
    setShowQRModal(true)
  }

  const handleQRLogoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setQRForm({ ...qrForm, logoFile: ev.target.result, logoRawFile: file, existingLogoUrl: null })
    }
    reader.readAsDataURL(file)
  }

  const removeQRLogo = () => {
    setQRForm({ ...qrForm, logoFile: null, logoRawFile: null, existingLogoUrl: null })
  }

  async function uploadQRLogo() {
    if (!qrForm.logoRawFile || !supabase || !brand?.id) return null
    const fileExt = qrForm.logoRawFile.name.split('.').pop()
    const fileName = `${brand.id}/qr-logo-${Date.now()}.${fileExt}`
    const { error } = await supabase.storage.from('product-images').upload(fileName, qrForm.logoRawFile)
    if (error) return null
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName)
    return urlData.publicUrl
  }

  const handleQRSubmit = async (e) => {
    e.preventDefault()
    if (!supabase || !brand?.id || brand.id === 'demo') return
    setSavingQR(true)

    let logoUrl = qrForm.existingLogoUrl || null
    if (qrForm.logoRawFile) {
      const uploaded = await uploadQRLogo()
      if (uploaded) logoUrl = uploaded
    }

    const qrData = {
      fg_color: qrForm.fgColor,
      bg_color: qrForm.bgColor,
      logo_url: logoUrl,
      logo_scale: qrForm.logoScale,
      cta_text: qrForm.ctaText || null,
    }

    if (editingQR) {
      const { data, error } = await supabase.from('qr_codes')
        .update({ ...qrData, promo_id: qrForm.promoId || null })
        .eq('id', editingQR.id)
        .select('*, promos(title)').single()
      if (error) {
        alert(`Error updating QR code: ${error.message}`)
      } else if (data) {
        setPromoQRs(promoQRs.map(q => q.id === data.id ? { ...data, scan_count: editingQR.scan_count } : q))
      }
    } else {
      const shortId = generateShortId()
      const { data, error } = await supabase.from('qr_codes').insert({
        brand_id: brand.id,
        product_id: null,
        promo_id: qrForm.promoId || null,
        short_id: shortId,
        ...qrData,
      }).select('*, promos(title)').single()
      if (error) {
        alert(`Error creating QR code: ${error.message}`)
      } else if (data) {
        setPromoQRs([{ ...data, scan_count: 0 }, ...promoQRs])
      }
    }

    setShowQRModal(false)
    setEditingQR(null)
    setSavingQR(false)
  }

  const handleDeleteQR = async (qr) => {
    if (!confirm(`Delete this promo QR code?`)) return
    if (supabase) {
      await supabase.from('qr_codes').delete().eq('id', qr.id)
    }
    setPromoQRs(promoQRs.filter(q => q.id !== qr.id))
  }

  const downloadPNG = (shortId, label) => {
    const canvas = document.getElementById(`promo-qr-${shortId}`)
    if (!canvas) return
    const hiRes = document.createElement('canvas')
    hiRes.width = 1000
    hiRes.height = 1000
    const ctx = hiRes.getContext('2d')
    ctx.drawImage(canvas, 0, 0, 1000, 1000)
    const link = document.createElement('a')
    link.download = `${label || shortId}-promo-qr.png`
    link.href = hiRes.toDataURL('image/png')
    link.click()
  }

  const downloadSVG = (shortId, label, qr) => {
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
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}"><rect width="${svgSize}" height="${svgSize}" fill="${qr.bg_color || '#FFFFFF'}"/>${rects}</svg>`
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const link = document.createElement('a')
    link.download = `${label || shortId}-promo-qr.svg`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const previewQRLogo = qrForm.logoRawFile ? qrForm.logoFile : (qrForm.existingLogoUrl || null)

  const openCreate = () => {
    setEditingPromo(null)
    setForm({ title: '', description: '', prize: '' })
    setShowModal(true)
  }

  const openEdit = (p) => {
    setEditingPromo(p)
    setForm({ title: p.title, description: p.description || '', prize: p.prize || '' })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!supabase || !brand?.id) return

    if (editingPromo) {
      const { data, error } = await supabase.from('promos')
        .update({ title: form.title, description: form.description, prize: form.prize })
        .eq('id', editingPromo.id)
        .select().single()
      if (!error && data) {
        setPromos(promos.map(p => p.id === data.id ? data : p))
      }
    } else {
      const { data, error } = await supabase.from('promos').insert({
        brand_id: brand.id,
        title: form.title,
        description: form.description,
        prize: form.prize,
        active: false,
      }).select().single()
      if (error) {
        alert(`Error: ${error.message}`)
      } else if (data) {
        setPromos([data, ...promos])
      }
    }
    setShowModal(false)
    setEditingPromo(null)
  }

  const toggleActive = async (promo) => {
    if (!supabase) return

    // If turning on, turn off all others first
    if (!promo.active) {
      await supabase.from('promos')
        .update({ active: false })
        .eq('brand_id', brand.id)
    }

    const { data, error } = await supabase.from('promos')
      .update({ active: !promo.active })
      .eq('id', promo.id)
      .select().single()

    if (!error && data) {
      setPromos(promos.map(p => {
        if (p.id === data.id) return data
        if (!promo.active) return { ...p, active: false }
        return p
      }))
    }
  }

  const handleDelete = async (promo) => {
    if (!confirm(`Delete "${promo.title}"?`)) return
    if (supabase) {
      await supabase.from('promos').delete().eq('id', promo.id)
    }
    setPromos(promos.filter(p => p.id !== promo.id))
  }

  const viewEntries = async (promo) => {
    setViewingEntries(promo)
    await loadEntries(promo.id)
  }

  const exportEntries = () => {
    if (entries.length === 0) return
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Product', 'City', 'Date']
    const rows = entries.map(e => [
      e.first_name, e.last_name, e.email || '', e.phone,
      e.products?.name || '', e.city || '',
      new Date(e.entered_at).toLocaleDateString(),
    ])
    const csv = [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.download = `${viewingEntries.title}-entries-${new Date().toISOString().split('T')[0]}.csv`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Promos</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Create promotions and standalone event QR codes
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'promos', label: 'My Promos' },
          { key: 'createqr', label: 'Create QR' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '12px 24px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 600,
            color: activeTab === tab.key ? '#FAFAFA' : 'var(--text-muted)',
            borderBottom: activeTab === tab.key ? '2px solid #FAFAFA' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.2s',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* MY PROMOS TAB */}
      {activeTab === 'promos' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button className="btn btn-primary" onClick={openCreate}>+ Create Promo</button>
          </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading...</div>
      ) : promos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>No promos yet</div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            Create a promo like "Tap it Tuesdays" and toggle it on to show it on all scans.
          </p>
          <button className="btn btn-primary" onClick={openCreate}>+ Create Promo</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {promos.map(promo => (
            <div key={promo.id} className="card" style={{
              border: promo.active ? '1px solid var(--success)' : '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{promo.title}</h3>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                      background: promo.active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(161, 161, 170, 0.1)',
                      color: promo.active ? 'var(--success)' : 'var(--text-muted)',
                    }}>
                      {promo.active ? 'LIVE' : 'OFF'}
                    </span>
                  </div>
                  {promo.description && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 6 }}>{promo.description}</p>
                  )}
                  {promo.prize && (
                    <p style={{ fontSize: '0.85rem', color: '#FAFAFA' }}>Prize: {promo.prize}</p>
                  )}
                </div>

                {/* Toggle */}
                <div onClick={() => toggleActive(promo)} style={{
                  width: 52, height: 28, borderRadius: 14, cursor: 'pointer',
                  background: promo.active ? 'var(--success)' : '#3F3F46',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: 'white',
                    position: 'absolute', top: 3,
                    left: promo.active ? 27 : 3,
                    transition: 'left 0.2s',
                  }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  onClick={() => viewEntries(promo)}>
                  View Entries
                </button>
                <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  onClick={() => openEdit(promo)}>
                  Edit
                </button>
                <button style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer', padding: '6px 14px' }}
                  onClick={() => handleDelete(promo)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }} onClick={() => { setShowModal(false); setEditingPromo(null) }}>
          <div className="card" style={{ width: 440, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>
              {editingPromo ? 'Edit Promo' : 'Create Promo'}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Promo Title
                </label>
                <input className="input" placeholder="e.g. Tap it Tuesdays" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Description
                </label>
                <textarea className="input" placeholder="What's the promo about?" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ minHeight: 80, resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Prize
                </label>
                <input className="input" placeholder="e.g. Free pair of 44 Pro gloves" value={form.prize}
                  onChange={e => setForm({ ...form, prize: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => { setShowModal(false); setEditingPromo(null) }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingPromo ? 'Save Changes' : 'Create Promo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Entries Modal */}
      {viewingEntries && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }} onClick={() => setViewingEntries(null)}>
          <div className="card" style={{ width: 640, maxWidth: '95vw', maxHeight: '80vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{viewingEntries.title}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{entries.length} entries</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {entries.length > 0 && (
                  <button className="btn btn-primary" style={{ fontSize: '0.8rem' }}
                    onClick={exportEntries}>Export CSV</button>
                )}
                <button className="btn btn-secondary" style={{ fontSize: '0.8rem' }}
                  onClick={() => setViewingEntries(null)}>Close</button>
              </div>
            </div>

            {entries.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 30 }}>No entries yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Name', 'Email', 'Phone', 'Product', 'City', 'Date'].map(h => (
                      <th key={h} style={{
                        padding: '10px 12px', textAlign: 'left',
                        fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500, fontSize: '0.85rem' }}>
                        {e.first_name} {e.last_name}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {e.email || '-'}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>{e.phone}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {e.products?.name || '-'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {e.city || '-'}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {new Date(e.entered_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

        </div>
      )}

      {/* CREATE QR TAB */}
      {activeTab === 'createqr' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button className="btn btn-primary" onClick={openCreateQR}>+ Create Event QR</button>
          </div>

          {promoQRs.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>No event QR codes yet</div>
              <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
                Create a standalone QR code for an event, activation, or giveaway. No product required.
              </p>
              <button className="btn btn-primary" onClick={openCreateQR}>+ Create Event QR</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
              {promoQRs.map(qr => (
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
                      canvasId={`promo-qr-${qr.short_id}`}
                      ctaText={qr.cta_text || ''}
                    />
                  </div>
                  <h3 style={{ fontWeight: 600, marginBottom: 4 }}>{qr.promos?.title || 'Event QR'}</h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 12 }}>
                    {qr.scan_count} scan{qr.scan_count !== 1 ? 's' : ''} &middot; {qr.short_id}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}
                      onClick={() => downloadPNG(qr.short_id, qr.promos?.title)}>PNG</button>
                    <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}
                      onClick={() => downloadSVG(qr.short_id, qr.promos?.title, qr)}>SVG</button>
                    <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}
                      onClick={() => openEditQR(qr)}>Edit</button>
                    <button style={{
                      background: 'none', border: 'none', color: 'var(--text-muted)',
                      fontSize: '0.75rem', cursor: 'pointer', padding: '8px',
                    }} onClick={() => handleDeleteQR(qr)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Promo QR Modal */}
      {showQRModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24
        }} onClick={() => { setShowQRModal(false); setEditingQR(null) }}>
          <div className="card" style={{ width: 580, maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 24 }}>
              {editingQR ? 'Edit Event QR' : 'Create Event QR'}
            </h2>

            <form onSubmit={handleQRSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      Link to Promo
                    </label>
                    <select className="input" value={qrForm.promoId}
                      onChange={e => setQRForm({ ...qrForm, promoId: e.target.value })}>
                      <option value="">No promo (just collect info)</option>
                      {promos.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Pick a promo to show on scan, or leave blank for a simple signup QR.
                    </p>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      Center Logo
                    </label>
                    {previewQRLogo ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <img src={previewQRLogo} alt="Logo"
                          style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4, background: '#fff', padding: 2 }} />
                        <button type="button" onClick={removeQRLogo}
                          style={{ fontSize: '0.75rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          Remove
                        </button>
                      </div>
                    ) : null}
                    <input type="file" accept="image/*" onChange={handleQRLogoUpload}
                      style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      QR Color
                    </label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={qrForm.fgColor}
                        onChange={e => setQRForm({ ...qrForm, fgColor: e.target.value })}
                        style={{ width: 40, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                      <input className="input" value={qrForm.fgColor}
                        onChange={e => setQRForm({ ...qrForm, fgColor: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      Call to Action Text
                    </label>
                    <input className="input" placeholder="e.g. Scan to Enter, Event Giveaway"
                      value={qrForm.ctaText} onChange={e => setQRForm({ ...qrForm, ctaText: e.target.value })} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      Background Color
                    </label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="color" value={qrForm.bgColor}
                        onChange={e => setQRForm({ ...qrForm, bgColor: e.target.value })}
                        style={{ width: 40, height: 40, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                      <input className="input" value={qrForm.bgColor}
                        onChange={e => setQRForm({ ...qrForm, bgColor: e.target.value })} />
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
                      fgColor={qrForm.fgColor}
                      bgColor={qrForm.bgColor}
                      logoSrc={previewQRLogo}
                      logoScale={qrForm.logoScale}
                      size={240}
                      ctaText={qrForm.ctaText}
                    />
                  </div>
                  <p style={{
                    color: 'var(--text-muted)', fontSize: '0.75rem',
                    textAlign: 'center', marginTop: 10, lineHeight: 1.4
                  }}>
                    Print this QR code and place it at your event or activation.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => { setShowQRModal(false); setEditingQR(null) }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={savingQR}>
                  {savingQR ? 'Saving...' : editingQR ? 'Save Changes' : 'Create QR Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
