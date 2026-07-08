import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Products({ brand }) {
  const [products, setProducts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', sku: '', description: '', contentTitle: '', contentBody: '', contentUrl: '', images: [] })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [brand])

  async function loadProducts() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setProducts([])
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

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return

    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setForm(prev => ({
          ...prev,
          images: [...prev.images, { file, preview: ev.target.result }]
        }))
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removeImage = (index) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setUploading(true)

    let imageUrls = []

    // Upload all images
    if (form.images.length > 0 && supabase && brand?.id && brand.id !== 'demo') {
      for (const img of form.images) {
        const fileExt = img.file.name.split('.').pop()
        const fileName = `${brand.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, img.file)

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName)
          imageUrls.push(urlData.publicUrl)
        }
      }
    }

    if (supabase && brand?.id && brand.id !== 'demo') {
      const { data, error } = await supabase.from('products').insert({
        brand_id: brand.id,
        name: form.name,
        sku: form.sku,
        description: form.description,
        content_title: form.contentTitle,
        content_body: form.contentBody,
        content_url: form.contentUrl,
        image_urls: imageUrls,
      }).select().single()

      if (error) {
        console.error('Product insert error:', error)
        alert(`Error saving product: ${error.message}`)
      } else if (data) {
        setProducts([data, ...products])
      }
    }

    setForm({ name: '', sku: '', description: '', contentTitle: '', contentBody: '', contentUrl: '', images: [] })
    setShowModal(false)
    setUploading(false)
  }

  const handleDelete = async (id) => {
    if (supabase && brand?.id && brand.id !== 'demo') {
      await supabase.from('products').delete().eq('id', id)
    }
    setProducts(products.filter(p => p.id !== id))
  }

  const getFirstImage = (p) => {
    if (p.image_urls && p.image_urls.length > 0) return p.image_urls[0]
    return null
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
                {['', 'Product', 'SKU', 'Images', 'Status', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '14px 20px', textAlign: 'left',
                    fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                    width: i === 0 ? 60 : 'auto',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map(p => {
                const firstImg = getFirstImage(p)
                const imgCount = p.image_urls?.length || 0
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 20px', width: 60 }}>
                      {firstImg ? (
                        <img src={firstImg} alt={p.name}
                          style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: 40, height: 40, borderRadius: 6,
                          background: 'var(--bg)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--text-muted)', fontSize: '0.7rem'
                        }}>IMG</div>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px', fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{p.sku || '-'}</td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {imgCount > 0 ? `${imgCount} image${imgCount > 1 ? 's' : ''}` : '-'}
                    </td>
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
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
        }} onClick={() => setShowModal(false)}>
          <div className="card" style={{ width: 480, maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>Add Product</h2>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Image Upload */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Product Images
                </label>

                {/* Image previews */}
                {form.images.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    {form.images.map((img, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img src={img.preview} alt={`Preview ${i + 1}`}
                          style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                        <button type="button" onClick={() => removeImage(i)}
                          style={{
                            position: 'absolute', top: -6, right: -6,
                            background: '#EF4444', color: 'white', border: 'none',
                            borderRadius: '50%', width: 20, height: 20, fontSize: '0.7rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>x</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                <label style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '100%', height: form.images.length > 0 ? 60 : 100, borderRadius: 8,
                  border: '2px dashed var(--border)', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: '0.9rem',
                  flexDirection: 'column', gap: 4,
                }}>
                  <span>+ {form.images.length > 0 ? 'Add more images' : 'Click to upload images'}</span>
                  <input type="file" accept="image/*" multiple onChange={handleImageSelect}
                    style={{ display: 'none' }} />
                </label>
              </div>

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
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
