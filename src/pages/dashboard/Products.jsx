import { useState } from 'react'

const demoProducts = [
  { id: 1, name: 'Pro Wireless Earbuds', sku: 'PWE-001', scans: 412, status: 'Active' },
  { id: 2, name: 'Running Shoes V2', sku: 'RSV2-003', scans: 287, status: 'Active' },
  { id: 3, name: 'Sport Water Bottle', sku: 'SWB-010', scans: 198, status: 'Active' },
  { id: 4, name: 'Training Gloves', sku: 'TG-005', scans: 156, status: 'Active' },
  { id: 5, name: 'Yoga Mat Premium', sku: 'YMP-002', scans: 94, status: 'Draft' },
  { id: 6, name: 'Resistance Bands Set', sku: 'RBS-007', scans: 100, status: 'Active' },
]

export default function Products() {
  const [products, setProducts] = useState(demoProducts)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', sku: '', description: '', contentUrl: '' })

  const handleAdd = (e) => {
    e.preventDefault()
    setProducts([...products, {
      id: products.length + 1,
      name: form.name,
      sku: form.sku,
      scans: 0,
      status: 'Draft'
    }])
    setForm({ name: '', sku: '', description: '', contentUrl: '' })
    setShowModal(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Products</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Product</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Product', 'SKU', 'Scans', 'Status'].map(h => (
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
                <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{p.sku}</td>
                <td style={{ padding: '14px 20px' }}>{p.scans.toLocaleString()}</td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 500,
                    background: p.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: p.status === 'Active' ? 'var(--success)' : 'var(--accent)'
                  }}>{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }} onClick={() => setShowModal(false)}>
          <div className="card" style={{ width: 440, maxWidth: '90vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>Add Product</h2>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input className="input" placeholder="Product Name" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} required />
              <input className="input" placeholder="SKU" value={form.sku}
                onChange={e => setForm({ ...form, sku: e.target.value })} required />
              <textarea className="input" placeholder="Product Description" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                style={{ minHeight: 80, resize: 'vertical' }} />
              <input className="input" placeholder="Content URL (tutorial, video, etc.)" value={form.contentUrl}
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
