import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Promos({ brand }) {
  const [promos, setPromos] = useState([])
  const [entries, setEntries] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingPromo, setEditingPromo] = useState(null)
  const [viewingEntries, setViewingEntries] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', description: '', prize: '' })

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
  )
}
