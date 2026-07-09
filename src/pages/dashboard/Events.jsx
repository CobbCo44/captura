import { useState, useEffect } from 'react'
import { supabase, generateShortId } from '../../lib/supabase'
import BrandedQR from '../../components/BrandedQR'
import generateQRCode from 'qr.js'

export default function Events({ brand }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [viewingEntries, setViewingEntries] = useState(null)
  const [entries, setEntries] = useState([])

  // QR modal state
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrEvent, setQrEvent] = useState(null)
  const [editingQR, setEditingQR] = useState(null)
  const [savingQR, setSavingQR] = useState(false)
  const [qrForm, setQRForm] = useState({
    fgColor: '#18181B',
    bgColor: '#FFFFFF',
    logoFile: null,
    logoRawFile: null,
    existingLogoUrl: null,
    logoScale: 0.25,
    ctaText: '',
  })

  const [form, setForm] = useState({ name: '', description: '', giveaway: '' })

  const scanUrl = 'https://meetcaptura.com'

  useEffect(() => {
    loadEvents()
  }, [brand])

  async function loadEvents() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setEvents([])
      setLoading(false)
      return
    }
    // Load events with their QR codes and scan counts
    const [eventsRes, scansRes] = await Promise.all([
      supabase.from('events').select('*, qr_codes(*)').eq('brand_id', brand.id).order('created_at', { ascending: false }),
      supabase.from('scans').select('qr_code_id').eq('brand_id', brand.id),
    ])

    const scanCounts = {}
    ;(scansRes.data || []).forEach(s => {
      scanCounts[s.qr_code_id] = (scanCounts[s.qr_code_id] || 0) + 1
    })

    const eventsWithCounts = (eventsRes.data || []).map(ev => {
      const qrs = ev.qr_codes || []
      const totalScans = qrs.reduce((sum, qr) => sum + (scanCounts[qr.id] || 0), 0)
      return { ...ev, total_scans: totalScans }
    })

    setEvents(eventsWithCounts)
    setLoading(false)
  }

  async function loadEntries(eventId) {
    if (!supabase) return
    const { data } = await supabase
      .from('event_entries')
      .select('*')
      .eq('event_id', eventId)
      .order('entered_at', { ascending: false })
    setEntries(data || [])
  }

  // Event CRUD
  const openCreate = () => {
    setEditingEvent(null)
    setForm({ name: '', description: '', giveaway: '' })
    setShowModal(true)
  }

  const openEdit = (ev) => {
    setEditingEvent(ev)
    setForm({ name: ev.name, description: ev.description || '', giveaway: ev.giveaway || '' })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!supabase || !brand?.id) return

    if (editingEvent) {
      const { data, error } = await supabase.from('events')
        .update({ name: form.name, description: form.description, giveaway: form.giveaway })
        .eq('id', editingEvent.id)
        .select('*, qr_codes(*)').single()
      if (!error && data) {
        setEvents(events.map(ev => ev.id === data.id ? { ...data, total_scans: editingEvent.total_scans } : ev))
      }
    } else {
      const { data, error } = await supabase.from('events').insert({
        brand_id: brand.id,
        name: form.name,
        description: form.description,
        giveaway: form.giveaway,
      }).select('*, qr_codes(*)').single()
      if (error) {
        alert(`Error: ${error.message}`)
      } else if (data) {
        setEvents([{ ...data, total_scans: 0 }, ...events])
      }
    }
    setShowModal(false)
    setEditingEvent(null)
  }

  const handleDelete = async (ev) => {
    if (!confirm(`Delete "${ev.name}"? This will also delete its QR codes and entries.`)) return
    if (supabase) {
      await supabase.from('events').delete().eq('id', ev.id)
    }
    setEvents(events.filter(e => e.id !== ev.id))
  }

  const viewEntries = async (ev) => {
    setViewingEntries(ev)
    await loadEntries(ev.id)
  }

  const exportEntries = () => {
    if (entries.length === 0) return
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'City', 'Date']
    const rows = entries.map(e => [
      e.first_name, e.last_name, e.email || '', e.phone,
      e.city || '', new Date(e.entered_at).toLocaleDateString(),
    ])
    const csv = [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const link = document.createElement('a')
    link.download = `${viewingEntries.name}-entries-${new Date().toISOString().split('T')[0]}.csv`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // QR Code functions
  const openCreateQR = (ev) => {
    setQrEvent(ev)
    setEditingQR(null)
    setQRForm({ fgColor: '#18181B', bgColor: '#FFFFFF', logoFile: null, logoRawFile: null, existingLogoUrl: null, logoScale: 0.25, ctaText: '' })
    setShowQRModal(true)
  }

  const openEditQR = (ev, qr) => {
    setQrEvent(ev)
    setEditingQR(qr)
    setQRForm({
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
    if (!supabase || !brand?.id || !qrEvent) return
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
      const { error } = await supabase.from('qr_codes')
        .update(qrData)
        .eq('id', editingQR.id)
      if (error) alert(`Error: ${error.message}`)
    } else {
      const shortId = generateShortId()
      const { error } = await supabase.from('qr_codes').insert({
        brand_id: brand.id,
        product_id: null,
        event_id: qrEvent.id,
        short_id: shortId,
        ...qrData,
      })
      if (error) alert(`Error: ${error.message}`)
    }

    setShowQRModal(false)
    setEditingQR(null)
    setQrEvent(null)
    setSavingQR(false)
    loadEvents()
  }

  const handleDeleteQR = async (qr) => {
    if (!confirm('Delete this event QR code?')) return
    if (supabase) {
      await supabase.from('qr_codes').delete().eq('id', qr.id)
    }
    loadEvents()
  }

  const downloadPNG = (shortId, label) => {
    const canvas = document.getElementById(`event-qr-${shortId}`)
    if (!canvas) return
    const hiRes = document.createElement('canvas')
    hiRes.width = 1000
    hiRes.height = 1000
    const ctx = hiRes.getContext('2d')
    ctx.drawImage(canvas, 0, 0, 1000, 1000)
    const link = document.createElement('a')
    link.download = `${label || shortId}-event-qr.png`
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
    link.download = `${label || shortId}-event-qr.svg`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const previewQRLogo = qrForm.logoRawFile ? qrForm.logoFile : (qrForm.existingLogoUrl || null)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Events</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Create events and generate QR codes for activations and giveaways
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Create Event</button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading...</div>
      ) : events.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>No events yet</div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
            Create an event for a pop-up, activation, or giveaway. Then generate a QR code to capture attendee info.
          </p>
          <button className="btn btn-primary" onClick={openCreate}>+ Create Event</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {events.map(ev => {
            const qrs = ev.qr_codes || []
            return (
              <div key={ev.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>{ev.name}</h3>
                    {ev.description && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 6 }}>{ev.description}</p>
                    )}
                    {ev.giveaway && (
                      <p style={{ fontSize: '0.85rem', color: '#FAFAFA' }}>Giveaway: {ev.giveaway}</p>
                    )}
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 8 }}>
                      {ev.total_scans || 0} scan{ev.total_scans !== 1 ? 's' : ''} &middot; {qrs.length} QR code{qrs.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                      onClick={() => viewEntries(ev)}>Entries</button>
                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                      onClick={() => openEdit(ev)}>Edit</button>
                    <button style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer', padding: '6px 14px' }}
                      onClick={() => handleDelete(ev)}>Delete</button>
                  </div>
                </div>

                {/* QR Codes for this event */}
                {qrs.length > 0 && (
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16,
                    padding: '16px 0', borderTop: '1px solid var(--border)',
                  }}>
                    {qrs.map(qr => (
                      <div key={qr.id} style={{ textAlign: 'center' }}>
                        <div style={{
                          background: '#0A0A10', borderRadius: 10, padding: 20,
                          display: 'flex', justifyContent: 'center', marginBottom: 10,
                        }}>
                          <BrandedQR
                            url={`${scanUrl}/s/${qr.short_id}`}
                            fgColor={qr.fg_color}
                            bgColor={qr.bg_color}
                            logoSrc={qr.logo_url || null}
                            logoScale={qr.logo_scale || 0.25}
                            size={160}
                            canvasId={`event-qr-${qr.short_id}`}
                            ctaText={qr.cta_text || ''}
                          />
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: 8 }}>
                          {qr.short_id}
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                          <button className="btn btn-primary" style={{ fontSize: '0.7rem', padding: '5px 10px' }}
                            onClick={() => downloadPNG(qr.short_id, ev.name)}>PNG</button>
                          <button className="btn btn-primary" style={{ fontSize: '0.7rem', padding: '5px 10px' }}
                            onClick={() => downloadSVG(qr.short_id, ev.name, qr)}>SVG</button>
                          <button className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '5px 10px' }}
                            onClick={() => openEditQR(ev, qr)}>Edit</button>
                          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer', padding: '5px 6px' }}
                            onClick={() => handleDeleteQR(qr)}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ borderTop: qrs.length > 0 ? 'none' : '1px solid var(--border)', paddingTop: 12 }}>
                  <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '8px 16px' }}
                    onClick={() => openCreateQR(ev)}>
                    + Create QR Code
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Event Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }} onClick={() => { setShowModal(false); setEditingEvent(null) }}>
          <div className="card" style={{ width: 440, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>
              {editingEvent ? 'Edit Event' : 'Create Event'}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Event Name
                </label>
                <input className="input" placeholder="e.g. Summer Showcase 2026" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Description
                </label>
                <textarea className="input" placeholder="What's the event about?" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ minHeight: 80, resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Giveaway
                </label>
                <input className="input" placeholder="e.g. Free pair of gloves, $100 gift card" value={form.giveaway}
                  onChange={e => setForm({ ...form, giveaway: e.target.value })} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  What are you giving away at this event? This shows on the scan page.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => { setShowModal(false); setEditingEvent(null) }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingEvent ? 'Save Changes' : 'Create Event'}
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
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{viewingEntries.name}</h2>
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
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 30 }}>No entries yet. Share your event QR code to start collecting signups.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Name', 'Email', 'Phone', 'City', 'Date'].map(h => (
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

      {/* Create/Edit QR Modal */}
      {showQRModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24
        }} onClick={() => { setShowQRModal(false); setEditingQR(null); setQrEvent(null) }}>
          <div className="card" style={{ width: 580, maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 4 }}>
              {editingQR ? 'Edit QR Code' : 'Create QR Code'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
              {qrEvent?.name}
            </p>

            <form onSubmit={handleQRSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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
                    <input className="input" placeholder="e.g. Scan to Enter, Win Big"
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
                    Print this QR code and place it at your event.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => { setShowQRModal(false); setEditingQR(null); setQrEvent(null) }}>Cancel</button>
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
