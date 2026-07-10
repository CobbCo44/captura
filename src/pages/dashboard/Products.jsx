import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Products({ brand }) {
  const [products, setProducts] = useState([])
  const [view, setView] = useState('list') // 'list' or 'form'
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState({ name: '', sku: '', gtin: '', description: '', contentTitle: '', contentBody: '', contentUrl: '', reorderUrl: '', warrantyEnabled: false, warrantyDuration: '', warrantyTerms: '', images: [], existingImages: [] })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [shopifyProducts, setShopifyProducts] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerLoading, setPickerLoading] = useState(false)

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

  const openAdd = () => {
    setEditingProduct(null)
    setForm({ name: '', sku: '', gtin: '', description: '', contentTitle: '', contentBody: '', contentUrl: '', reorderUrl: '', images: [], existingImages: [] })
    setView('form')
  }

  const openEdit = (p) => {
    setEditingProduct(p)
    setForm({
      name: p.name || '',
      sku: p.sku || '',
      gtin: p.gtin || '',
      description: p.description || '',
      contentTitle: p.content_title || '',
      contentBody: p.content_body || '',
      contentUrl: p.content_url || '',
      reorderUrl: p.reorder_url || '',
      warrantyEnabled: p.warranty_enabled || false,
      warrantyDuration: p.warranty_duration || '',
      warrantyTerms: p.warranty_terms || '',
      images: [],
      existingImages: p.image_urls || [],
    })
    setView('form')
  }

  const goBack = () => {
    setView('list')
    setEditingProduct(null)
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

  const removeNewImage = (index) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }))
  }

  const removeExistingImage = (index) => {
    setForm(prev => ({ ...prev, existingImages: prev.existingImages.filter((_, i) => i !== index) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUploading(true)

    let newImageUrls = []
    if (form.images.length > 0 && supabase && brand?.id && brand.id !== 'demo') {
      for (const img of form.images) {
        const fileExt = img.file.name.split('.').pop()
        const fileName = `${brand.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, img.file)

        if (uploadError) {
          console.error('Image upload error:', uploadError)
        } else {
          const { data: urlData } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName)
          newImageUrls.push(urlData.publicUrl)
        }
      }
    }

    const allImageUrls = [...form.existingImages, ...newImageUrls]

    if (supabase && brand?.id && brand.id !== 'demo') {
      const productData = {
        name: form.name,
        sku: form.sku,
        gtin: form.gtin || null,
        description: form.description,
        content_title: form.contentTitle,
        content_body: form.contentBody,
        content_url: form.contentUrl,
        reorder_url: form.reorderUrl,
        warranty_enabled: form.warrantyEnabled,
        warranty_duration: form.warrantyDuration || null,
        warranty_terms: form.warrantyTerms || null,
        image_urls: allImageUrls,
      }

      if (editingProduct) {
        const { data, error } = await supabase.from('products')
          .update(productData)
          .eq('id', editingProduct.id)
          .select().single()
        if (error) {
          alert(`Error updating product: ${error.message}`)
        } else if (data) {
          setProducts(products.map(p => p.id === data.id ? data : p))
        }
      } else {
        const { data, error } = await supabase.from('products').insert({
          brand_id: brand.id,
          ...productData,
        }).select().single()
        if (error) {
          alert(`Error saving product: ${error.message}`)
        } else if (data) {
          setProducts([data, ...products])
        }
      }
    }

    setForm({ name: '', sku: '', gtin: '', description: '', contentTitle: '', contentBody: '', contentUrl: '', reorderUrl: '', images: [], existingImages: [] })
    setEditingProduct(null)
    setView('list')
    setUploading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return
    if (supabase && brand?.id && brand.id !== 'demo') {
      await supabase.from('products').delete().eq('id', id)
    }
    setProducts(products.filter(p => p.id !== id))
  }

  const openShopifyPicker = async () => {
    if (!brand?.shopify_store) return
    setPickerLoading(true)
    setShowPicker(true)
    setPickerSearch('')
    setSelectedIds(new Set())
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/import-shopify-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ brandId: brand.id }),
      })
      if (!res.ok) throw new Error('Failed to fetch Shopify products')
      const { products: fetched } = await res.json()

      // Mark which ones are already imported
      const existingSkus = new Set(products.filter(p => p.sku).map(p => p.sku))
      const existingShopifyIds = new Set(products.filter(p => p.shopify_product_id).map(p => p.shopify_product_id))
      const tagged = fetched.map(sp => ({
        ...sp,
        alreadyImported: existingShopifyIds.has(sp.shopify_id) || (sp.sku && existingSkus.has(sp.sku)),
      }))

      setShopifyProducts(tagged)
    } catch (err) {
      setImportResult({ count: 0, message: `Failed to load Shopify products: ${err.message}` })
      setShowPicker(false)
    }
    setPickerLoading(false)
  }

  const toggleProduct = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    const available = filteredShopifyProducts.filter(p => !p.alreadyImported)
    if (available.every(p => selectedIds.has(p.shopify_id))) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        available.forEach(p => next.delete(p.shopify_id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        available.forEach(p => next.add(p.shopify_id))
        return next
      })
    }
  }

  const filteredShopifyProducts = shopifyProducts.filter(p => {
    if (!pickerSearch) return true
    const q = pickerSearch.toLowerCase()
    return p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))
  })

  const handleImportSelected = async () => {
    if (selectedIds.size === 0) return
    setImporting(true)
    setShowPicker(false)
    setImportResult(null)

    const toImport = shopifyProducts.filter(sp => selectedIds.has(sp.shopify_id))
    let imported = 0
    for (const sp of toImport) {
      const { error } = await supabase.from('products').insert({
        brand_id: brand.id,
        name: sp.name,
        sku: sp.sku || null,
        gtin: sp.barcode || null,
        description: sp.description || null,
        image_urls: sp.images.length > 0 ? sp.images : null,
        reorder_url: sp.shopify_url,
        shopify_product_id: sp.shopify_id,
      })
      if (!error) imported++
    }

    setImportResult({ count: imported, message: `Imported ${imported} product${imported !== 1 ? 's' : ''} from Shopify.` })
    loadProducts()
    setImporting(false)
  }

  const getFirstImage = (p) => {
    if (p.image_urls && p.image_urls.length > 0) return p.image_urls[0]
    return null
  }

  // ========== FORM VIEW ==========
  if (view === 'form') {
    return (
      <div>
        <button onClick={goBack} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          fontSize: '0.9rem', cursor: 'pointer', marginBottom: 20, padding: 0,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          ← Back to Products
        </button>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 28 }}>
          {editingProduct ? 'Edit Product' : 'Add Product'}
        </h1>

        <div style={{ maxWidth: 560 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Image Upload */}
            <div className="card">
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 10 }}>
                Product Images
              </label>

              {(form.existingImages.length > 0 || form.images.length > 0) && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                  {form.existingImages.map((url, i) => (
                    <div key={`existing-${i}`} style={{ position: 'relative' }}>
                      <img src={url} alt={`Image ${i + 1}`}
                        style={{ width: 90, height: 90, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                      <button type="button" onClick={() => removeExistingImage(i)}
                        style={{
                          position: 'absolute', top: -6, right: -6,
                          background: '#EF4444', color: 'white', border: 'none',
                          borderRadius: '50%', width: 22, height: 22, fontSize: '0.75rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>x</button>
                    </div>
                  ))}
                  {form.images.map((img, i) => (
                    <div key={`new-${i}`} style={{ position: 'relative' }}>
                      <img src={img.preview} alt={`New ${i + 1}`}
                        style={{ width: 90, height: 90, borderRadius: 8, objectFit: 'cover', border: '2px solid var(--success)' }} />
                      <button type="button" onClick={() => removeNewImage(i)}
                        style={{
                          position: 'absolute', top: -6, right: -6,
                          background: '#EF4444', color: 'white', border: 'none',
                          borderRadius: '50%', width: 22, height: 22, fontSize: '0.75rem',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>x</button>
                    </div>
                  ))}
                </div>
              )}

              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', height: (form.existingImages.length + form.images.length) > 0 ? 50 : 100, borderRadius: 8,
                border: '2px dashed var(--border)', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: '0.9rem',
              }}>
                <span>+ {(form.existingImages.length + form.images.length) > 0 ? 'Add more images' : 'Click to upload images'}</span>
                <input type="file" accept="image/*" multiple onChange={handleImageSelect}
                  style={{ display: 'none' }} />
              </label>
            </div>

            {/* Details */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Details</label>
              <input className="input" placeholder="Product Name" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} required />
              <input className="input" placeholder="SKU (optional)" value={form.sku}
                onChange={e => setForm({ ...form, sku: e.target.value })} />
              <input className="input" placeholder="GTIN / UPC / Barcode (optional)" value={form.gtin}
                onChange={e => setForm({ ...form, gtin: e.target.value })} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: -8 }}>
                The product barcode number. When set, QR codes use a GS1 Digital Link URL that works at retail checkout.
              </p>
              <textarea className="input" placeholder="Product Description" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                style={{ minHeight: 100, resize: 'vertical' }} />
            </div>

            {/* Scan Page Content */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Scan Page Content</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: -8 }}>
                This content shows when a consumer scans the QR code.
              </p>
              <input className="input" placeholder="Heading (e.g. Setup Guide, How to Use)" value={form.contentTitle}
                onChange={e => setForm({ ...form, contentTitle: e.target.value })} />
              <textarea className="input" placeholder="Content body" value={form.contentBody}
                onChange={e => setForm({ ...form, contentBody: e.target.value })}
                style={{ minHeight: 80, resize: 'vertical' }} />
              <input className="input" placeholder="Link URL (video, tutorial, etc.)" value={form.contentUrl}
                onChange={e => setForm({ ...form, contentUrl: e.target.value })} />
            </div>

            {/* Reorder */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Reorder Link</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: -8 }}>
                For consumable products (supplements, beauty, etc.). Consumers see a "Reorder" button that links directly to your product page.
              </p>
              <input className="input" placeholder="https://yourbrand.com/product/buy" value={form.reorderUrl}
                onChange={e => setForm({ ...form, reorderUrl: e.target.value })} />
            </div>

            {/* Warranty */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Warranty Registration</label>
                <div onClick={() => setForm({ ...form, warrantyEnabled: !form.warrantyEnabled })} style={{
                  width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
                  background: form.warrantyEnabled ? '#22C55E' : '#3F3F46',
                  position: 'relative', transition: 'background 0.2s',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: 'white',
                    position: 'absolute', top: 3,
                    left: form.warrantyEnabled ? 23 : 3,
                    transition: 'left 0.2s',
                  }} />
                </div>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: -8 }}>
                When enabled, consumers see a "Register Your Warranty" section on the scan page. They provide their contact info, purchase date, and retailer.
              </p>
              {form.warrantyEnabled && (
                <>
                  <input className="input" placeholder="Warranty Duration (e.g. 1 Year, 2 Years, Lifetime)"
                    value={form.warrantyDuration}
                    onChange={e => setForm({ ...form, warrantyDuration: e.target.value })} />
                  <textarea className="input" placeholder="Warranty Terms (what's covered, what's not)"
                    value={form.warrantyTerms}
                    onChange={e => setForm({ ...form, warrantyTerms: e.target.value })}
                    style={{ minHeight: 80, resize: 'vertical' }} />
                </>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                onClick={goBack}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={uploading}>
                {uploading ? 'Saving...' : editingProduct ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // ========== LIST VIEW ==========
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Products</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          {brand?.shopify_store && (
            <button className="btn btn-secondary" onClick={openShopifyPicker} disabled={importing}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              {importing ? 'Importing...' : 'Import from Shopify'}
            </button>
          )}
          <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
        </div>
      </div>

      {importResult && (
        <div style={{
          padding: '12px 16px', borderRadius: 8, marginBottom: 16,
          background: importResult.count > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(161, 161, 170, 0.1)',
          border: `1px solid ${importResult.count > 0 ? 'var(--success)' : 'var(--border)'}`,
          color: importResult.count > 0 ? 'var(--success)' : 'var(--text-muted)',
          fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{importResult.message}</span>
          <button onClick={() => setImportResult(null)} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem',
          }}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Loading...</div>
      ) : products.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>No products yet</div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Add your first product to start creating QR codes.</p>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['', 'Product', 'SKU', 'GTIN', 'Images', 'Status', ''].map((h, i) => (
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
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => openEdit(p)}>
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
                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.gtin || '-'}</td>
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
                      <button onClick={(e) => { e.stopPropagation(); openEdit(p) }}
                        style={{ background: 'none', border: 'none', color: '#FAFAFA', fontSize: '0.8rem', cursor: 'pointer', marginRight: 12 }}>
                        Edit
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer' }}>
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

      {/* Shopify Product Picker Modal */}
      {showPicker && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }} onClick={() => setShowPicker(false)}>
          <div style={{
            background: 'var(--card-bg)', borderRadius: 12, width: '100%', maxWidth: 640,
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            border: '1px solid var(--border)',
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Import from Shopify</h2>
                <button onClick={() => setShowPicker(false)} style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  fontSize: '1.2rem', cursor: 'pointer',
                }}>x</button>
              </div>
              <input className="input" placeholder="Search products by name or SKU..."
                value={pickerSearch} onChange={e => setPickerSearch(e.target.value)}
                style={{ width: '100%' }} />
            </div>

            {/* Product List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
              {pickerLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading products from Shopify...
                </div>
              ) : filteredShopifyProducts.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  {pickerSearch ? 'No products match your search.' : 'No products found in your Shopify store.'}
                </div>
              ) : (
                <>
                  {/* Select All */}
                  <div style={{
                    padding: '10px 24px', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <input type="checkbox"
                      checked={filteredShopifyProducts.filter(p => !p.alreadyImported).length > 0 &&
                        filteredShopifyProducts.filter(p => !p.alreadyImported).every(p => selectedIds.has(p.shopify_id))}
                      onChange={toggleAll}
                      style={{ width: 18, height: 18, cursor: 'pointer' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Select all ({filteredShopifyProducts.filter(p => !p.alreadyImported).length} available)
                    </span>
                  </div>

                  {filteredShopifyProducts.map(sp => (
                    <label key={sp.shopify_id} style={{
                      padding: '12px 24px', borderBottom: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: 14,
                      opacity: sp.alreadyImported ? 0.4 : 1,
                      cursor: sp.alreadyImported ? 'default' : 'pointer',
                    }}>
                      <input type="checkbox"
                        checked={sp.alreadyImported || selectedIds.has(sp.shopify_id)}
                        disabled={sp.alreadyImported}
                        onChange={() => !sp.alreadyImported && toggleProduct(sp.shopify_id)}
                        style={{ width: 18, height: 18, cursor: sp.alreadyImported ? 'default' : 'pointer', flexShrink: 0 }} />
                      {sp.image_url ? (
                        <img src={sp.image_url} alt={sp.name}
                          style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: 44, height: 44, borderRadius: 6, background: 'var(--bg)',
                          border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.6rem',
                        }}>IMG</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sp.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {sp.sku && `SKU: ${sp.sku}`}
                          {sp.sku && sp.variants.length > 1 && ' · '}
                          {sp.variants.length > 1 && `${sp.variants.length} variants`}
                          {sp.alreadyImported && ' · Already imported'}
                        </div>
                      </div>
                    </label>
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {selectedIds.size} product{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setShowPicker(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleImportSelected}
                  disabled={selectedIds.size === 0}
                  style={{ opacity: selectedIds.size === 0 ? 0.5 : 1 }}>
                  Import Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
