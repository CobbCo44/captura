import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { nativeTilesFor, resolveTileOrder } from '../../lib/tiles'

const CONTEXTS = {
  storefront: [
    { id: 'counter', name: 'Counter QR' },
    { id: 'label', name: 'Label QR' },
  ],
  product: [
    { id: 'product', name: 'Product Scan' },
  ],
}

export default function ScanPageTiles({ brand }) {
  const isStorefront = brand?.business_type === 'storefront'
  const contexts = CONTEXTS[isStorefront ? 'storefront' : 'product']
  const [context, setContext] = useState(contexts[0].id)
  const [customTiles, setCustomTiles] = useState([])
  const [order, setOrder] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null) // { type: 'ok'|'error', text }
  const [dirty, setDirty] = useState(false)

  // Add Custom Tile form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ label: '', url: '', description: '' })
  const [formImage, setFormImage] = useState(null)
  const [adding, setAdding] = useState(false)

  const dragIndex = useRef(null)

  useEffect(() => {
    if (!brand?.id) return
    async function load() {
      setLoading(true)
      const [settingsRes, customRes] = await Promise.all([
        supabase.from('tile_settings').select('tile_key, enabled, sort')
          .eq('brand_id', brand.id).eq('context', context),
        supabase.from('custom_tiles').select('*').eq('brand_id', brand.id).order('sort'),
      ])
      const custom = customRes.data || []
      setCustomTiles(custom)
      setOrder(resolveTileOrder(settingsRes.data || [], context, custom))
      setDirty(false)
      setLoading(false)
    }
    load()
  }, [brand?.id, context])

  const native = nativeTilesFor(context)
  const tileName = (entry) => entry.custom
    ? entry.custom.label
    : (native.find(t => t.key === entry.key)?.name || entry.key)
  const isBig = (entry) => !entry.custom && native.find(t => t.key === entry.key)?.big

  const move = (from, to) => {
    if (to < 0 || to >= order.length) return
    const next = order.slice()
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setOrder(next)
    setDirty(true)
    setMessage(null)
  }

  const toggle = (i) => {
    const next = order.slice()
    next[i] = { ...next[i], enabled: !next[i].enabled }
    setOrder(next)
    setDirty(true)
    setMessage(null)
  }

  const save = async () => {
    setSaving(true)
    setMessage(null)
    const payload = order.map(o => ({ tile_key: o.key, enabled: o.enabled }))
    const { error } = await supabase.rpc('save_tile_settings', {
      p_brand_id: brand.id, p_context: context, p_settings: payload,
    })
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'ok', text: 'Saved. Your scan page is updated.' })
      setDirty(false)
    }
    setSaving(false)
  }

  const addCustomTile = async () => {
    const label = form.label.trim()
    const url = form.url.trim()
    if (!label) { setMessage({ type: 'error', text: 'Give the tile a short label.' }); return }
    if (!/^https?:\/\/\S+$/i.test(url)) { setMessage({ type: 'error', text: 'The link must start with http:// or https://' }); return }
    setAdding(true)
    setMessage(null)
    let image_url = null
    if (formImage) {
      const path = `custom-tiles/${brand.id}-${Date.now()}-${formImage.name}`
      const { error: upErr } = await supabase.storage.from('product-images').upload(path, formImage, { upsert: true })
      if (upErr) {
        setMessage({ type: 'error', text: 'Image upload failed: ' + upErr.message })
        setAdding(false)
        return
      }
      image_url = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
    }
    const { data, error } = await supabase.from('custom_tiles').insert({
      brand_id: brand.id, label, url,
      description: form.description.trim() || null,
      image_url,
      sort: customTiles.length,
    }).select().single()
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      const nextCustom = [...customTiles, data]
      setCustomTiles(nextCustom)
      setOrder([...order, { key: `custom:${data.id}`, enabled: true, custom: data }])
      setDirty(true)
      setForm({ label: '', url: '', description: '' })
      setFormImage(null)
      setShowForm(false)
      setMessage({ type: 'ok', text: `"${label}" added. Drag it where you want it, then save.` })
    }
    setAdding(false)
  }

  const removeCustomTile = async (entry) => {
    if (!confirm(`Remove the "${entry.custom.label}" tile? It disappears from every QR context.`)) return
    const { error } = await supabase.from('custom_tiles').delete().eq('id', entry.custom.id)
    if (error) { setMessage({ type: 'error', text: error.message }); return }
    setCustomTiles(customTiles.filter(t => t.id !== entry.custom.id))
    setOrder(order.filter(o => o.key !== entry.key))
    setDirty(true)
  }

  const activeCustomCount = customTiles.filter(t => t.is_active).length

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 8 }}>Scan Page</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.6 }}>
        Choose which tiles show on your scan page and the order they appear in.
        Tiles only appear to customers when they have something to show — a hidden
        toggle here always wins.
      </p>

      {contexts.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {contexts.map(c => (
            <button key={c.id} onClick={() => setContext(c.id)} className="btn" style={{
              padding: '8px 18px', fontSize: '0.85rem', borderRadius: 8,
              background: context === c.id ? 'var(--text)' : 'transparent',
              color: context === c.id ? 'var(--bg)' : 'var(--text-muted)',
              border: context === c.id ? 'none' : '1px solid var(--line, #27272A)',
            }}>{c.name}</button>
          ))}
        </div>
      )}

      {context === 'counter' && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 16 }}>
          The Loyalty tile is pinned to the top three spots on the Counter QR — it drives repeat visits.
        </p>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        {order.map((entry, i) => (
          <div
            key={entry.key}
            draggable
            onDragStart={() => { dragIndex.current = i }}
            onDragOver={e => e.preventDefault()}
            onDrop={() => { if (dragIndex.current !== null && dragIndex.current !== i) move(dragIndex.current, i); dragIndex.current = null }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
              borderBottom: i < order.length - 1 ? '1px solid var(--line, #27272A)' : 'none',
              opacity: entry.enabled ? 1 : 0.45, cursor: 'grab',
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: '1rem', letterSpacing: 2, userSelect: 'none' }}>⠿</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                {tileName(entry)}
                {entry.custom && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', border: '1px solid var(--line, #27272A)', borderRadius: 4, padding: '1px 6px' }}>CUSTOM</span>}
                {isBig(entry) && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>large tile</span>}
              </div>
              {entry.custom && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.custom.url}</div>}
            </div>
            <button onClick={() => move(i, i - 1)} className="btn" style={{ padding: '4px 10px', fontSize: '0.8rem' }} aria-label="Move up">↑</button>
            <button onClick={() => move(i, i + 1)} className="btn" style={{ padding: '4px 10px', fontSize: '0.8rem' }} aria-label="Move down">↓</button>
            {entry.custom && (
              <button onClick={() => removeCustomTile(entry)} className="btn" style={{ padding: '4px 10px', fontSize: '0.8rem', color: 'var(--danger)' }} aria-label="Delete">✕</button>
            )}
            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={entry.enabled} onChange={() => toggle(i)} style={{ width: 18, height: 18, accentColor: 'var(--text)' }} />
            </label>
          </div>
        ))}
      </div>

      {message && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.85rem', lineHeight: 1.5,
          background: message.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
          color: message.type === 'error' ? 'var(--danger)' : '#22C55E',
        }}>{message.text}</div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <button className="btn btn-primary" onClick={save} disabled={saving || !dirty} style={{ padding: '12px 28px' }}>
          {saving ? 'Saving...' : 'Save Order'}
        </button>
        {!showForm && (
          <button className="btn btn-secondary" onClick={() => setShowForm(true)} disabled={activeCustomCount >= 3} style={{ padding: '12px 20px' }}>
            {activeCustomCount >= 3 ? 'Custom tile limit reached (3)' : '+ Add Custom Tile'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>New custom tile</h3>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>Label</label>
            <input className="input" maxLength={30} placeholder="Book a Table" value={form.label}
              onChange={e => setForm({ ...form, label: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>Link</label>
            <input className="input" type="url" placeholder="https://..." value={form.url}
              onChange={e => setForm({ ...form, url: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>Description (optional, one line)</label>
            <input className="input" maxLength={80} placeholder="Reserve your spot" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>Image (optional)</label>
            <input type="file" accept="image/*" onChange={e => setFormImage(e.target.files[0] || null)} style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={addCustomTile} disabled={adding} style={{ padding: '10px 22px' }}>
              {adding ? 'Adding...' : 'Add Tile'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowForm(false); setMessage(null) }} style={{ padding: '10px 18px' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
