import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Products({ brand }) {
  const [products, setProducts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', sku: '', description: '', contentTitle: '', contentBody: '', contentUrl: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [brand])

  async function loadProducts() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setProducts([
        { id: '1', name: 'Pro Wireless Earbuds', sku: 'PWE-001', status: 'active', scan_count: 0 },
        { id: '2', name: 'Running Shoes V2', sku: 'RSV2-003', status: 'active', scan_count: 0 },
      ])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('brand_id', brand.id)
      .order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (supabase && brand?.id && brand.id !== 'demo') {
      const { data, error } = await supabase.from('products').insert({
        brand_id: brand.id,
        name: form.name,
        sku: form.sku,
        description: form.description,
        content_title: form.contentTitle,
        content_body: form.contentBody,
        content_url: form.contentUrl,
      }).select().single()

      if (!error && data) {
        setProducts([data, ...products])
      }
    } else {
      setProducts([{
        id: String(Date.now()),
        name: form.name,
        sku: form.sku,
        status: 'active',
        scan_count: 0,
      }, ...products])
    }
    setForm({ name: '', sku: '', description: '', contentTitle: '', contentBody: '', contentUrl: '' })
    setShowModal(false)
  }

  const handleDelete = async (id) => {
    if (supabase && brand?.id && brand.id !== 'demo') {
      await supabase.from('products').delete().eq('id', id)
    }
    setProducts(products.filter(p => p.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Products</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Product</button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading...</div>
      ) : products.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>No products yet</div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Add your first product to start creating QR codes.</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Product</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Product', 'SKU', 'Status', ''].map(h => (
                  <th key={h} style={{
                    padding: '14px 20px', textAlign: 'left',
                    fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 500 }}>{p.name}</td>
                  <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{p.sku || '-'}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 500,
                      background: p.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(161, 161, 170, 0.1)',
                      color: p.status === 'active' ? 'var(--success)' : 'var(--text-muted)'
                    }}>{p.status || 'active'}</span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <button onClick={() => handleDelete(p.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }} onClick={() => setShowModal(false)}>
          <div className="card" style={{ width: 480, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>Add Product</h2>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input className="input" placeholder="Product Name" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} required />
              <input className="input" placeholder="SKU (optional)" value={form.sku}
                onChange={e => setForm({ ...form, sku: e.target.value })} />
              <textarea className="input" placeholder="Product Description" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                style={{ minHeight: 80, resize: 'vertical' }} />
              <input className="input" placeholder="Content Title (e.g. Setup Guide)" value={form.contentTitle}
                onChange={e => setForm({ ...form, contentTitle: e.target.value })} />
              <textarea className="input" placeholder="Content Body" value={form.contentBody}
                onChange={e => setForm({ ...form, contentBody: e.target.value })}
                style={{ minHeight: 60, resize: 'vertical' }} />
              <input className="input" placeholder="Content URL (video, tutorial link)" value={form.contentUrl}
                onChange={e => setForm({ ...form, contentUrl: e.target.value })} />
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Add Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
