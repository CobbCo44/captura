import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { INDUSTRIES } from '../../lib/industries'

export default function Settings({ brand, onBrandUpdate }) {
  const [form, setForm] = useState({ name: '', industry: '', logoFile: null, logoPreview: null, existingLogo: null })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [shopifyStore, setShopifyStore] = useState('')
  const [shopifyToken, setShopifyToken] = useState('')
  const [shopifyTesting, setShopifyTesting] = useState(false)
  const [shopifyStatus, setShopifyStatus] = useState(null) // 'connected', 'error', null
  const [shopifySaving, setShopifySaving] = useState(false)
  const [showToken, setShowToken] = useState(false)

  useEffect(() => {
    if (brand) {
      setForm({
        name: brand.name || '',
        industry: brand.industry || '',
        logoFile: null,
        logoPreview: null,
        existingLogo: brand.logo_url || null,
      })
      setShopifyStore(brand.shopify_store || '')
      setShopifyToken(brand.shopify_token || '')
      setShopifyStatus(brand.shopify_store && brand.shopify_token ? 'connected' : null)
    }
  }, [brand])

  const handleLogoSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setForm({ ...form, logoFile: file, logoPreview: ev.target.result })
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!supabase || !brand?.id || brand.id === 'demo') return
    setSaving(true)

    let logoUrl = form.existingLogo
    if (form.logoFile) {
      const fileExt = form.logoFile.name.split('.').pop()
      const fileName = `${brand.id}/brand-logo-${Date.now()}.${fileExt}`
      const { error } = await supabase.storage.from('product-images').upload(fileName, form.logoFile)
      if (!error) {
        const { data } = supabase.storage.from('product-images').getPublicUrl(fileName)
        logoUrl = data.publicUrl
      }
    }

    const { data, error } = await supabase.from('brands')
      .update({ name: form.name, industry: form.industry, logo_url: logoUrl, shopify_store: shopifyStore || null, shopify_token: shopifyToken || null })
      .eq('id', brand.id)
      .select().single()

    if (error) {
      alert(`Error: ${error.message}`)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      if (onBrandUpdate && data) onBrandUpdate(data)
    }
    setSaving(false)
  }

  const handleTestShopify = async () => {
    if (!shopifyStore || !shopifyToken) return
    setShopifyTesting(true)
    setShopifyStatus(null)
    try {
      const res = await fetch('/.netlify/functions/import-shopify-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopifyStore, shopifyToken }),
      })
      if (res.ok) {
        setShopifyStatus('connected')
      } else {
        setShopifyStatus('error')
      }
    } catch {
      setShopifyStatus('error')
    }
    setShopifyTesting(false)
  }

  const handleDisconnectShopify = async () => {
    if (!confirm('Disconnect Shopify? Consumer data will stop syncing to your store.')) return
    setShopifySaving(true)
    const { data, error } = await supabase.from('brands')
      .update({ shopify_store: null, shopify_token: null })
      .eq('id', brand.id)
      .select().single()
    if (!error && data) {
      setShopifyStore('')
      setShopifyToken('')
      setShopifyStatus(null)
      if (onBrandUpdate) onBrandUpdate(data)
    }
    setShopifySaving(false)
  }

  const currentLogo = form.logoPreview || form.existingLogo

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Brand Settings</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Manage your brand profile
          </p>
        </div>
        {saved && <span style={{ color: 'var(--success)', fontWeight: 600 }}>Saved!</span>}
      </div>

      <div style={{ maxWidth: 480 }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Brand Logo */}
          <div className="card">
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 10 }}>
              Brand Logo
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {currentLogo ? (
                <img src={currentLogo} alt="Logo" style={{
                  width: 64, height: 64, borderRadius: 8, objectFit: 'contain',
                  background: '#fff', padding: 4, border: '1px solid var(--border)'
                }} />
              ) : (
                <div style={{
                  width: 64, height: 64, borderRadius: 8, background: 'var(--bg)',
                  border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.7rem'
                }}>No logo</div>
              )}
              <div>
                <label style={{
                  display: 'inline-block', padding: '8px 16px', borderRadius: 8,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer',
                }}>
                  Upload logo
                  <input type="file" accept="image/*" onChange={handleLogoSelect} style={{ display: 'none' }} />
                </label>
                {currentLogo && (
                  <button type="button" onClick={() => setForm({ ...form, logoFile: null, logoPreview: null, existingLogo: null })}
                    style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer' }}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Brand Name */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 6 }}>Brand Name</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: 6 }}>Industry</label>
              <select className="input" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}>
                <option value="">Select industry</option>
                {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
          </div>

          {/* Shopify Integration */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Shopify Integration</label>
              {shopifyStatus === 'connected' && (
                <span style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                  background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)',
                }}>Connected</span>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: -8, lineHeight: 1.5 }}>
              Connect your Shopify store to sync consumer data, import products, and link reorder buttons directly to your storefront.
            </p>
            {shopifyStatus === 'connected' && brand?.shopify_store ? (
              <div>
                <div style={{
                  padding: '12px 16px', borderRadius: 8, background: 'var(--bg)',
                  border: '1px solid var(--border)', marginBottom: 12,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {shopifyStore.replace(/\.myshopify\.com$/, '')}.myshopify.com
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      VIP signups, promo entries, and warranty registrations sync automatically
                    </div>
                  </div>
                </div>
                <button type="button" onClick={handleDisconnectShopify} disabled={shopifySaving}
                  style={{
                    background: 'none', border: 'none', color: 'var(--danger)',
                    fontSize: '0.8rem', cursor: 'pointer', padding: 0,
                  }}>
                  {shopifySaving ? 'Disconnecting...' : 'Disconnect Shopify'}
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Store URL
                  </label>
                  <input className="input" placeholder="yourstore.myshopify.com" value={shopifyStore}
                    onChange={e => setShopifyStore(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Admin API Access Token
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input className="input" type={showToken ? 'text' : 'password'}
                      placeholder="shpat_xxxxxxxxxxxxxxxx" value={shopifyToken}
                      onChange={e => setShopifyToken(e.target.value)}
                      style={{ paddingRight: 60 }} />
                    <button type="button" onClick={() => setShowToken(!showToken)}
                      style={{
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'var(--text-muted)',
                        fontSize: '0.75rem', cursor: 'pointer',
                      }}>
                      {showToken ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', lineHeight: 1.5 }}>
                  Create a custom app in your Shopify admin under Settings &gt; Apps &gt; Develop apps.
                  Give it read/write access to Customers and Products, then copy the Admin API access token.
                </p>
                {shopifyStatus === 'error' && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>
                    Could not connect. Check your store URL and token.
                  </div>
                )}
                <button type="button" onClick={handleTestShopify}
                  disabled={shopifyTesting || !shopifyStore || !shopifyToken}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
                    background: shopifyTesting ? 'var(--bg)' : '#96BF48', color: '#fff',
                    border: 'none', cursor: shopifyTesting || !shopifyStore || !shopifyToken ? 'not-allowed' : 'pointer',
                    opacity: !shopifyStore || !shopifyToken ? 0.5 : 1,
                  }}>
                  {shopifyTesting ? 'Testing...' : 'Test Connection'}
                </button>
              </>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  )
}
