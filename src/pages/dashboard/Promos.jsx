import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import PromoImage, { FIT_WHOLE } from '../../components/PromoImage'
import { loadTileConfig } from '../../lib/tiles'
import { canUseFeature } from '../../lib/billingAccess'
import PlanLock from '../../components/PlanLock'

export default function Promos({ brand }) {
  const [promos, setPromos] = useState([])
  const [entries, setEntries] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingPromo, setEditingPromo] = useState(null)
  const [viewingEntries, setViewingEntries] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', description: '', prize: '', image: null, existingImage: '', imagePosition: 'center' })
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ y: 0, startPct: 50 })
  const previewRef = useRef(null)

  useEffect(() => {
    loadPromos()
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

  const openCreate = () => {
    setEditingPromo(null)
    setForm({ title: '', description: '', prize: '', image: null, existingImage: '', winner_name: '', winner_city: '', imagePosition: 'center' })
    setShowModal(true)
  }

  const openEdit = (p) => {
    setEditingPromo(p)
    setForm({ title: p.title, description: p.description || '', prize: p.prize || '', image: null, existingImage: p.image_url || '', winner_name: p.winner_name || '', winner_city: p.winner_city || '', imagePosition: p.image_position || 'center' })
    setShowModal(true)
  }

  // Parse a saved position ("center 30%", "40% 30%", "center") into x/y percentages
  const getXY = (pos) => {
    if (!pos || pos === 'center' || pos === FIT_WHOLE) return { x: 50, y: 50 }
    const pcts = [...pos.matchAll(/(\d+)%/g)].map(m => parseInt(m[1]))
    if (pcts.length >= 2) return { x: pcts[0], y: pcts[1] }
    return { x: 50, y: pcts[0] ?? 50 }
  }

  // The promo tile on a phone is as wide as the screen and two grid rows tall; the
  // row height depends on how many other tiles the scan page shows. Mirror that here.
  const [previewAspect, setPreviewAspect] = useState('362 / 475')
  useEffect(() => {
    if (!showModal || !brand?.id || brand.id === 'demo') return
    if (brand.business_type !== 'storefront') { setPreviewAspect('4 / 2.1'); return }
    let cancelled = false
    const count = (q) => q.then(r => r.count || 0, () => 0)
    ;(async () => {
      // Same rules as the scan page: a tile only shows when it has content
      const [order, rewards, items, images, hours, locations, winners] = await Promise.all([
        loadTileConfig(brand.id, 'counter'),
        count(supabase.from('loyalty_rewards').select('id', { count: 'exact', head: true }).eq('brand_id', brand.id).eq('active', true)),
        count(supabase.from('menu_items').select('id', { count: 'exact', head: true }).eq('brand_id', brand.id).eq('active', true)),
        count(supabase.from('menu_images').select('id', { count: 'exact', head: true }).eq('brand_id', brand.id)),
        count(supabase.from('store_hours').select('id', { count: 'exact', head: true }).eq('brand_id', brand.id).is('location_id', null)),
        count(supabase.from('store_locations').select('id', { count: 'exact', head: true }).eq('brand_id', brand.id)),
        count(supabase.from('promos').select('id', { count: 'exact', head: true }).eq('brand_id', brand.id).not('winner_name', 'is', null)),
      ])
      if (cancelled || !order) return
      const hasContent = {
        winner: winners > 0, loyalty: rewards > 0, menu: items + images > 0, hours: hours > 0, locations: locations > 0,
        follow: ['social_instagram', 'social_tiktok', 'social_twitter', 'social_facebook', 'social_website'].some(k => brand[k]),
      }
      const enabled = (key) => order.find(o => o.key === key)?.enabled !== false
      const others = order.filter(o => o.enabled !== false && o.key !== 'promo' && o.key !== 'video' && (o.custom || hasContent[o.key])).length
      const videoRows = brand.store_video_url && enabled('video') ? 2 : 0
      const rows = 2 + videoRows + Math.ceil(others / 2)
      const reserved = 46 + (hours > 0 ? 36 : 0) + 50 + 30 + (rows - 1) * 9
      const rowH = Math.max(60, Math.floor((844 - reserved) / rows))
      setPreviewAspect(`362 / ${2 * rowH + 9}`)
    })()
    return () => { cancelled = true }
  }, [showModal, brand?.id])

  const handleDragStart = useCallback((e) => {
    e.preventDefault()
    if (form.imagePosition === FIT_WHOLE) return
    const point = e.touches ? e.touches[0] : e
    setDragging(true)
    setDragStart({ x: point.clientX, y: point.clientY, start: getXY(form.imagePosition) })
  }, [form.imagePosition])

  const handleDragMove = useCallback((e) => {
    if (!dragging || !previewRef.current) return
    const point = e.touches ? e.touches[0] : e
    const rect = previewRef.current.getBoundingClientRect()
    // Dragging the image right reveals more of its left side, so position moves the other way
    const x = Math.max(0, Math.min(100, dragStart.start.x - ((point.clientX - dragStart.x) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, dragStart.start.y - ((point.clientY - dragStart.y) / rect.height) * 100))
    setForm(f => ({ ...f, imagePosition: `${Math.round(x)}% ${Math.round(y)}%` }))
  }, [dragging, dragStart])

  const handleDragEnd = useCallback(() => {
    setDragging(false)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!supabase || !brand?.id) return
    setUploading(true)

    let imageUrl = form.existingImage || null

    // Upload new image if selected
    if (form.image && supabase && brand?.id && brand.id !== 'demo') {
      const fileExt = form.image.name.split('.').pop()
      const fileName = `${brand.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, form.image)

      if (uploadError) {
        console.error('Image upload error:', uploadError)
      } else {
        const { data: urlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName)
        imageUrl = urlData.publicUrl
      }
    }

    if (editingPromo) {
      const updatePayload = { title: form.title, description: form.description, prize: form.prize, image_url: imageUrl, image_position: form.imagePosition || 'center', winner_name: form.winner_name || null, winner_city: form.winner_city || null }
      // Auto-set winner_announced_at when a winner name is provided
      if (form.winner_name?.trim()) {
        updatePayload.winner_announced_at = editingPromo.winner_announced_at || new Date().toISOString()
      } else {
        updatePayload.winner_announced_at = null
      }
      const { data, error } = await supabase.from('promos')
        .update(updatePayload)
        .eq('id', editingPromo.id)
        .select().single()
      if (error) {
        console.error('Promo update error:', error)
        alert(`Error saving promo: ${error.message}`)
      } else if (data) {
        setPromos(promos.map(p => p.id === data.id ? data : p))
      }
    } else {
      const { data, error } = await supabase.from('promos').insert({
        brand_id: brand.id,
        title: form.title,
        description: form.description,
        prize: form.prize,
        image_url: imageUrl,
        image_position: form.imagePosition || 'center',
        active: false,
      }).select().single()
      if (error) {
        alert(`Error: ${error.message}`)
      } else if (data) {
        setPromos([data, ...promos])
      }
    }
    setUploading(false)
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

  const pickRandomWinner = async () => {
    if (entries.length === 0) return
    const winner = entries[Math.floor(Math.random() * entries.length)]
    const winnerName = `${winner.first_name} ${winner.last_name}`
    const winnerCity = winner.city || ''
    if (!window.confirm(`Random selection: ${winnerName}${winnerCity ? ` from ${winnerCity}` : ''}. Announce this winner?`)) return
    const { data, error } = await supabase.from('promos').update({
      winner_name: winnerName,
      winner_city: winnerCity,
      winner_announced_at: new Date().toISOString(),
    }).eq('id', viewingEntries.id).select().single()
    if (error) {
      alert('Error saving winner: ' + error.message)
    } else if (data) {
      setPromos(promos.map(p => p.id === data.id ? data : p))
      alert(`Winner announced: ${winnerName}`)
    }
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

  if (!canUseFeature(brand, 'promos')) {
    return (
      <div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Promos</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4, marginBottom: 28 }}>Giveaways that turn scans into new customers.</p>
        <PlanLock feature="promos" description="Run giveaways customers enter by scanning your QR code. Every entry adds a new contact to your list." />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Promos</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Create promotions that appear on all your QR code scans
          </p>
        </div>
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
                  {promo.winner_name && (
                    <p style={{ fontSize: '0.8rem', color: '#8B5CF6', marginTop: 4 }}>
                      Winner: {promo.winner_name}{promo.winner_city ? `, ${promo.winner_city}` : ''}
                    </p>
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
      {showModal && (() => {
        const previewImageUrl = form.image ? URL.createObjectURL(form.image) : (form.existingImage || null)
        const hasImage = !!previewImageUrl
        const accentBg = brand?.accent_color || '#F97316'

        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
          }} onClick={() => { setShowModal(false); setEditingPromo(null) }}>
            <div className="card" style={{ width: 860, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>
                {editingPromo ? 'Edit Promo' : 'Create Promo'}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: hasImage ? '1fr 280px' : '1fr', gap: 28 }}>
                {/* Left: Form fields */}
                <form onSubmit={handleSubmit} id="promo-form" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      Background Image (optional)
                    </label>
                    <input type="file" accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0] || null
                        setForm({ ...form, image: file, existingImage: file ? '' : form.existingImage })
                      }}
                      style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }} />
                    {hasImage && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        {[['cover', 'Fill tile'], [FIT_WHOLE, 'Show whole image']].map(([mode, text]) => {
                          const active = mode === FIT_WHOLE ? form.imagePosition === FIT_WHOLE : form.imagePosition !== FIT_WHOLE
                          return (
                            <button key={mode} type="button"
                              onClick={() => setForm({ ...form, imagePosition: mode === FIT_WHOLE ? FIT_WHOLE : 'center' })}
                              style={{
                                padding: '6px 12px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                                color: active ? 'var(--text)' : 'var(--text-muted)',
                                border: `1px solid ${active ? 'rgba(255,255,255,0.25)' : 'var(--border)'}`,
                              }}>{text}</button>
                          )
                        })}
                      </div>
                    )}
                    {hasImage && (
                      <button type="button" onClick={() => setForm({ ...form, image: null, existingImage: '', imagePosition: 'center' })}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer', marginTop: 6, padding: 0 }}>
                        Remove image
                      </button>
                    )}
                  </div>
                  {editingPromo && (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                          Winner Name
                        </label>
                        <input className="input" placeholder="Leave blank until announced" value={form.winner_name}
                          onChange={e => setForm({ ...form, winner_name: e.target.value })} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                          Winner City
                        </label>
                        <input className="input" placeholder="e.g. San Diego, CA" value={form.winner_city}
                          onChange={e => setForm({ ...form, winner_city: e.target.value })} />
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                      onClick={() => { setShowModal(false); setEditingPromo(null) }}>Cancel</button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={uploading}>
                      {uploading ? 'Saving...' : editingPromo ? 'Save Changes' : 'Create Promo'}
                    </button>
                  </div>
                </form>

                {/* Right: Live preview with drag-to-position */}
                {hasImage && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {form.imagePosition === FIT_WHOLE ? 'Phone preview' : 'Phone preview: drag the image to reposition'}
                    </label>
                    <div
                      ref={previewRef}
                      onMouseDown={handleDragStart}
                      onTouchStart={handleDragStart}
                      onMouseMove={handleDragMove}
                      onTouchMove={handleDragMove}
                      onMouseUp={handleDragEnd}
                      onTouchEnd={handleDragEnd}
                      onMouseLeave={handleDragEnd}
                      style={{
                        width: '100%', maxWidth: 280, alignSelf: 'center', aspectRatio: previewAspect, borderRadius: 12,
                        position: 'relative', overflow: 'hidden',
                        cursor: form.imagePosition === FIT_WHOLE ? 'default' : dragging ? 'grabbing' : 'grab', userSelect: 'none',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <PromoImage url={previewImageUrl} position={form.imagePosition} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.82) 100%)' }} />

                      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1 }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: accentBg, color: '#fff',
                          fontFamily: "'IBM Plex Mono', monospace", fontSize: 7,
                          letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500,
                          padding: '2px 6px', borderRadius: 3,
                        }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />
                          Live now
                        </span>
                      </div>

                      <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, zIndex: 1 }}>
                        <h3 style={{
                          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em',
                          fontSize: 14, lineHeight: 1.1, margin: '0 0 3px', color: '#fff',
                        }}>
                          {form.title || 'Promo Title'}
                        </h3>
                        {form.description && (
                          <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.74)', margin: 0 }}>{form.description}</p>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
                      Matches the promo tile on a phone (exact height varies a little by phone)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

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
                {entries.length > 0 && !viewingEntries.winner_name && (
                  <button className="btn btn-primary" style={{ fontSize: '0.8rem', background: '#8B5CF6' }}
                    onClick={pickRandomWinner}>Pick a Winner</button>
                )}
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
  )
}
