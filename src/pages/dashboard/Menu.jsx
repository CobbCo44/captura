import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Menu({ brand }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterCategory, setFilterCategory] = useState('all')
  const [form, setForm] = useState({
    name: '', description: '', price: '', category: '', image_url: '', active: true,
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  // Store info state
  const [storeForm, setStoreForm] = useState({
    store_address: '', store_phone: '', store_video_url: '',
  })
  const [hours, setHours] = useState([])
  const [storeSaving, setStoreSaving] = useState(false)
  const [storeSaved, setStoreSaved] = useState(false)

  // Locations state
  const [locations, setLocations] = useState([])
  const [showLocationForm, setShowLocationForm] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  const [locationForm, setLocationForm] = useState({ name: '', address: '', phone: '' })
  const [locationSaving, setLocationSaving] = useState(false)

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  useEffect(() => {
    loadItems()
    loadStoreInfo()
    loadHours()
    loadLocations()
  }, [brand])

  async function loadItems() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setItems([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('brand_id', brand.id)
      .order('category')
      .order('sort_order')
      .order('name')
    setItems(data || [])
    setLoading(false)
  }

  async function loadStoreInfo() {
    if (!brand) return
    setStoreForm({
      store_address: brand.store_address || '',
      store_phone: brand.store_phone || '',
      store_video_url: brand.store_video_url || '',
    })
  }

  async function loadHours() {
    if (!supabase || !brand?.id || brand.id === 'demo') return
    const { data } = await supabase
      .from('store_hours')
      .select('*')
      .eq('brand_id', brand.id)
      .order('day_of_week')
    if (data && data.length > 0) {
      setHours(data)
    } else {
      // Initialize default hours
      setHours(dayNames.map((_, i) => ({
        day_of_week: i,
        open_time: '09:00',
        close_time: '17:00',
        closed: i === 0, // Sunday closed by default
      })))
    }
  }

  async function loadLocations() {
    if (!supabase || !brand?.id || brand.id === 'demo') return
    const { data } = await supabase
      .from('store_locations')
      .select('*')
      .eq('brand_id', brand.id)
      .order('sort_order')
      .order('name')
    setLocations(data || [])
  }

  const openLocationCreate = () => {
    setEditingLocation(null)
    setLocationForm({ name: '', address: '', phone: '' })
    setShowLocationForm(true)
  }

  const openLocationEdit = (loc) => {
    setEditingLocation(loc)
    setLocationForm({ name: loc.name, address: loc.address || '', phone: loc.phone || '' })
    setShowLocationForm(true)
  }

  const handleLocationSubmit = async (e) => {
    e.preventDefault()
    if (!supabase || !brand?.id || !locationForm.name.trim()) return
    setLocationSaving(true)

    const payload = {
      name: locationForm.name.trim(),
      address: locationForm.address || null,
      phone: locationForm.phone || null,
    }

    if (editingLocation) {
      const { data, error } = await supabase
        .from('store_locations').update(payload).eq('id', editingLocation.id).select().single()
      if (error) alert(`Error: ${error.message}`)
      else setLocations(locations.map(l => l.id === data.id ? data : l))
    } else {
      const { data, error } = await supabase
        .from('store_locations').insert({ ...payload, brand_id: brand.id }).select().single()
      if (error) alert(`Error: ${error.message}`)
      else setLocations([...locations, data])
    }

    setLocationSaving(false)
    setShowLocationForm(false)
    setEditingLocation(null)
  }

  const handleLocationDelete = async (loc) => {
    if (!confirm(`Delete "${loc.name}"?`)) return
    const { error } = await supabase.from('store_locations').delete().eq('id', loc.id)
    if (error) alert(`Error: ${error.message}`)
    else setLocations(locations.filter(l => l.id !== loc.id))
  }

  const categories = [...new Set(items.map(i => i.category))].sort()

  const openCreate = () => {
    setEditingItem(null)
    setForm({ name: '', description: '', price: '', category: categories[0] || '', active: true, image_url: '' })
    setImageFile(null)
    setImagePreview(null)
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      description: item.description || '',
      price: item.price || '',
      category: item.category || '',
      active: item.active !== false,
      image_url: item.image_url || '',
    })
    setImageFile(null)
    setImagePreview(item.image_url || null)
    setShowModal(true)
  }

  const handleImageSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!supabase || !brand?.id) return
    setSaving(true)

    let imageUrl = form.image_url
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop()
      const fileName = `${brand.id}/menu-${Date.now()}.${fileExt}`
      const { error } = await supabase.storage.from('product-images').upload(fileName, imageFile)
      if (!error) {
        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName)
        imageUrl = data.publicUrl
      }
    }

    const payload = {
      name: form.name,
      description: form.description || null,
      price: form.price ? parseFloat(form.price) : null,
      category: form.category || 'General',
      active: form.active,
      image_url: imageUrl || null,
    }

    if (editingItem) {
      const { data, error } = await supabase
        .from('menu_items')
        .update(payload)
        .eq('id', editingItem.id)
        .select().single()
      if (error) alert(`Error: ${error.message}`)
      else setItems(items.map(i => i.id === data.id ? data : i))
    } else {
      const maxSort = items.filter(i => i.category === payload.category).reduce((max, i) => Math.max(max, i.sort_order || 0), 0)
      const { data, error } = await supabase
        .from('menu_items')
        .insert({ ...payload, brand_id: brand.id, sort_order: maxSort + 1 })
        .select().single()
      if (error) alert(`Error: ${error.message}`)
      else setItems([...items, data])
    }

    setSaving(false)
    setShowModal(false)
    setEditingItem(null)
  }

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return
    const { error } = await supabase.from('menu_items').delete().eq('id', item.id)
    if (error) alert(`Error: ${error.message}`)
    else setItems(items.filter(i => i.id !== item.id))
  }

  const toggleActive = async (item) => {
    const { data } = await supabase
      .from('menu_items')
      .update({ active: !item.active })
      .eq('id', item.id)
      .select().single()
    if (data) setItems(items.map(i => i.id === data.id ? data : i))
  }

  const handleSaveStore = async (e) => {
    e.preventDefault()
    if (!supabase || !brand?.id) return
    setStoreSaving(true)

    const { error } = await supabase.from('brands')
      .update({
        store_address: storeForm.store_address || null,
        store_phone: storeForm.store_phone || null,
        store_video_url: storeForm.store_video_url || null,
      })
      .eq('id', brand.id)

    // Save hours
    for (const h of hours) {
      await supabase.from('store_hours').upsert({
        brand_id: brand.id,
        day_of_week: h.day_of_week,
        open_time: h.closed ? null : h.open_time,
        close_time: h.closed ? null : h.close_time,
        closed: h.closed,
      }, { onConflict: 'brand_id,day_of_week' })
    }

    if (!error) {
      setStoreSaved(true)
      setTimeout(() => setStoreSaved(false), 2000)
    } else {
      alert(`Error: ${error.message}`)
    }
    setStoreSaving(false)
  }

  const updateHour = (dayIndex, field, value) => {
    setHours(hours.map(h =>
      h.day_of_week === dayIndex ? { ...h, [field]: value } : h
    ))
  }

  const filteredItems = filterCategory === 'all' ? items : items.filter(i => i.category === filterCategory)

  const [tab, setTab] = useState('items')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Menu / Services</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Manage what customers see when they scan your QR code
          </p>
        </div>
        {tab === 'items' && (
          <button className="btn btn-primary" onClick={openCreate}>+ Add Item</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: '1px solid var(--border)' }}>
        {[
          { key: 'items', label: `Items${items.length ? ` (${items.length})` : ''}` },
          { key: 'store', label: 'Store Info' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 20px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid white' : '2px solid transparent',
            color: tab === t.key ? 'var(--text)' : 'var(--text-muted)',
            transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Items Tab */}
      {tab === 'items' && <>
        {/* Category Filter */}
        {categories.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <button onClick={() => setFilterCategory('all')} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              border: 'none',
              background: filterCategory === 'all' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
              color: filterCategory === 'all' ? '#fff' : 'var(--text-muted)',
            }}>All</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilterCategory(cat)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                border: 'none',
                background: filterCategory === cat ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                color: filterCategory === cat ? '#fff' : 'var(--text-muted)',
              }}>{cat}</button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading...</div>
        ) : items.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>No items yet</div>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
              Add your menu items or services. Customers will see these when they scan your QR code.
            </p>
            <button className="btn btn-primary" onClick={openCreate}>+ Add Item</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(filterCategory === 'all' ? categories : [filterCategory]).map(cat => (
              <div key={cat}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, marginTop: 4 }}>
                  {cat}
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {filteredItems.filter(i => i.category === cat).map((item, idx, arr) => (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                      borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
                      opacity: item.active ? 1 : 0.5,
                    }}>
                      {item.image_url ? (
                        <img src={item.image_url} alt="" style={{
                          width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0,
                        }} />
                      ) : (
                        <div style={{
                          width: 48, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.05)',
                          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.2rem', color: 'var(--text-muted)',
                        }}>▤</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</div>
                        {item.description && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.description}
                          </div>
                        )}
                      </div>
                      {item.price != null && (
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>
                          ${parseFloat(item.price).toFixed(2)}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => toggleActive(item)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem',
                          color: item.active ? 'var(--success)' : 'var(--text-muted)', padding: '4px 8px',
                        }}>{item.active ? 'Active' : 'Hidden'}</button>
                        <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          onClick={() => openEdit(item)}>Edit</button>
                        <button style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer', padding: '4px 8px' }}
                          onClick={() => handleDelete(item)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </>}

      {/* Store Info Tab */}
      {tab === 'store' && (
        <div style={{ maxWidth: 520 }}>
          <form onSubmit={handleSaveStore} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Contact & Location */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 6 }}>Address</label>
                <input className="input" placeholder="123 Main St, City, State" value={storeForm.store_address}
                  onChange={e => setStoreForm({ ...storeForm, store_address: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 6 }}>Phone</label>
                <input className="input" placeholder="(555) 123-4567" value={storeForm.store_phone}
                  onChange={e => setStoreForm({ ...storeForm, store_phone: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 6 }}>Video URL</label>
                <input className="input" placeholder="YouTube or Vimeo link" value={storeForm.store_video_url}
                  onChange={e => setStoreForm({ ...storeForm, store_video_url: e.target.value })} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>
                  Optional. Shown on your scan page if provided.
                </p>
              </div>
            </div>

            {/* Hours */}
            <div className="card">
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 14 }}>Hours</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {hours.map(h => (
                  <div key={h.day_of_week} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 90, fontSize: '0.85rem', fontWeight: 500 }}>{dayNames[h.day_of_week]}</div>
                    <div onClick={() => updateHour(h.day_of_week, 'closed', !h.closed)} style={{
                      width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
                      background: !h.closed ? 'var(--success)' : '#3F3F46',
                      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', background: 'white',
                        position: 'absolute', top: 3, left: !h.closed ? 21 : 3, transition: 'left 0.2s',
                      }} />
                    </div>
                    {!h.closed ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                        <input type="time" value={h.open_time || '09:00'}
                          onChange={e => updateHour(h.day_of_week, 'open_time', e.target.value)}
                          style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                            borderRadius: 6, padding: '4px 8px', color: '#FAFAFA', fontSize: '0.8rem',
                          }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
                        <input type="time" value={h.close_time || '17:00'}
                          onChange={e => updateHour(h.day_of_week, 'close_time', e.target.value)}
                          style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                            borderRadius: 6, padding: '4px 8px', color: '#FAFAFA', fontSize: '0.8rem',
                          }} />
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Closed</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={storeSaving}>
              {storeSaving ? 'Saving...' : storeSaved ? 'Saved!' : 'Save Store Info'}
            </button>
          </form>

          {/* Locations */}
          <div style={{ marginTop: 24 }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Locations</label>
                <button type="button" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                  onClick={openLocationCreate}>
                  + Add Location
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 16, marginTop: -8 }}>
                Add your store locations. Customers will see these when they tap Locations on the scan page.
              </p>

              {showLocationForm && (
                <form onSubmit={handleLocationSubmit} style={{
                  padding: 16, borderRadius: 8, background: 'var(--bg)',
                  border: '1px solid var(--border)', marginBottom: 16,
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Location Name</label>
                    <input className="input" placeholder="e.g. Downtown, Encinitas, Main Street" value={locationForm.name}
                      onChange={e => setLocationForm({ ...locationForm, name: e.target.value })} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Address</label>
                    <input className="input" placeholder="123 Main St, City, State" value={locationForm.address}
                      onChange={e => setLocationForm({ ...locationForm, address: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Phone</label>
                    <input className="input" placeholder="(555) 123-4567" value={locationForm.phone}
                      onChange={e => setLocationForm({ ...locationForm, phone: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px' }} disabled={locationSaving}>
                      {locationSaving ? 'Saving...' : editingLocation ? 'Save' : 'Add'}
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ padding: '8px 16px' }}
                      onClick={() => { setShowLocationForm(false); setEditingLocation(null) }}>Cancel</button>
                  </div>
                </form>
              )}

              {locations.length === 0 && !showLocationForm ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '12px 0' }}>
                  No locations yet. Add your first location.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {locations.map((loc, idx) => (
                    <div key={loc.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                      borderBottom: idx < locations.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{loc.name}</div>
                        {loc.address && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{loc.address}</div>
                        )}
                        {loc.phone && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 1 }}>{loc.phone}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          onClick={() => openLocationEdit(loc)}>Edit</button>
                        <button style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer', padding: '4px 8px' }}
                          onClick={() => handleLocationDelete(loc)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }} onClick={() => { setShowModal(false); setEditingItem(null) }}>
          <div className="card" style={{ width: 480, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>
              {editingItem ? 'Edit Item' : 'Add Item'}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>Name</label>
                <input className="input" placeholder="e.g. Flat White, Haircut, Fish Tacos" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>Description</label>
                <textarea className="input" placeholder="Optional description" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                  style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>Price</label>
                  <input className="input" type="number" step="0.01" min="0" placeholder="0.00" value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>Category</label>
                  <input className="input" placeholder="e.g. Drinks, Mains, Services" value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    list="category-options" />
                  <datalist id="category-options">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>Image</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: 56, height: 56, borderRadius: 8, background: 'rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', color: 'var(--text-muted)',
                    }}>No image</div>
                  )}
                  <label style={{
                    display: 'inline-block', padding: '8px 14px', borderRadius: 8,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer',
                  }}>
                    Upload
                    <input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                  </label>
                  {imagePreview && (
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); setForm({ ...form, image_url: '' }) }}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer' }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active</label>
                <div onClick={() => setForm({ ...form, active: !form.active })} style={{
                  width: 52, height: 28, borderRadius: 14, cursor: 'pointer',
                  background: form.active ? 'var(--success)' : '#3F3F46',
                  position: 'relative', transition: 'background 0.2s',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: 'white',
                    position: 'absolute', top: 3, left: form.active ? 27 : 3, transition: 'left 0.2s',
                  }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => { setShowModal(false); setEditingItem(null) }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
