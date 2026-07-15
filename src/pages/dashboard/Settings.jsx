import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { INDUSTRIES } from '../../lib/industries'

export default function Settings({ brand, onBrandUpdate }) {
  const [form, setForm] = useState({ name: '', industry: '', logoFile: null, logoPreview: null, existingLogo: null })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [shopifyStore, setShopifyStore] = useState('')
  const [shopifyStatus, setShopifyStatus] = useState(null) // 'connected', 'error', null
  const [shopifySaving, setShopifySaving] = useState(false)
  const [shopifyConnecting, setShopifyConnecting] = useState(false)
  const [connectStore, setConnectStore] = useState('')

  // Channels state
  const [channelsList, setChannelsList] = useState([])
  const [channelsLoading, setChannelsLoading] = useState(true)
  const [showChannelForm, setShowChannelForm] = useState(false)
  const [channelForm, setChannelForm] = useState({ name: '', type: 'retail' })
  const [channelSaving, setChannelSaving] = useState(false)
  const [channelBatchCounts, setChannelBatchCounts] = useState({})

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
      setShopifyStatus(brand.shopify_store ? 'connected' : null)
      loadChannels()
    }
  }, [brand])

  async function loadChannels() {
    if (!supabase || !brand?.id || brand.id === 'demo') {
      setChannelsLoading(false)
      return
    }
    const { data } = await supabase
      .from('channels')
      .select('*')
      .eq('brand_id', brand.id)
      .order('created_at', { ascending: false })
    setChannelsList(data || [])

    // Check which channels have batches (to control delete)
    if (data && data.length > 0) {
      const channelIds = data.map(c => c.id)
      const { data: batchData } = await supabase
        .from('batches')
        .select('channel_id')
        .in('channel_id', channelIds)
      if (batchData) {
        const counts = {}
        batchData.forEach(b => {
          counts[b.channel_id] = (counts[b.channel_id] || 0) + 1
        })
        setChannelBatchCounts(counts)
      }
    }
    setChannelsLoading(false)
  }

  async function handleAddChannel(e) {
    e.preventDefault()
    if (!supabase || !brand?.id || brand.id === 'demo') return
    if (!channelForm.name.trim()) return
    setChannelSaving(true)
    const { data, error } = await supabase
      .from('channels')
      .insert({ brand_id: brand.id, name: channelForm.name.trim(), type: channelForm.type })
      .select()
      .single()
    if (error) {
      alert(`Error adding channel: ${error.message}`)
    } else {
      setChannelsList(prev => [data, ...prev])
      setChannelForm({ name: '', type: 'retail' })
      setShowChannelForm(false)
    }
    setChannelSaving(false)
  }

  async function handleDeleteChannel(channelId) {
    if (!confirm('Delete this channel?')) return
    const { error } = await supabase.from('channels').delete().eq('id', channelId)
    if (error) {
      alert(`Error deleting channel: ${error.message}`)
    } else {
      setChannelsList(prev => prev.filter(c => c.id !== channelId))
    }
  }

  // Handle OAuth callback - check URL for success flag
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (params.get('shopify') === 'connected') {
      window.history.replaceState({}, '', window.location.pathname)
      if (onBrandUpdate) {
        supabase?.from('brands').select('*').eq('id', brand?.id).single().then(({ data }) => {
          if (data) {
            onBrandUpdate(data)
            setShopifyStore(data.shopify_store || '')
            setShopifyStatus('connected')
          }
        })
      }
    }
  }, [brand?.id])

  const handleConnectShopify = () => {
    if (!connectStore) return
    setShopifyConnecting(true)
    const store = connectStore
      .replace(/^https?:\/\//, '')
      .replace(/\.myshopify\.com.*$/, '')
      .replace(/\/$/, '')
      .trim()
    window.location.href = `/.netlify/functions/shopify-oauth-start?shop=${encodeURIComponent(store)}&brand_id=${brand?.id || ''}`
  }

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
      .update({ name: form.name, industry: form.industry, logo_url: logoUrl })
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
                    Your Shopify Store
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input className="input" placeholder="yourstore" value={connectStore}
                      onChange={e => setConnectStore(e.target.value)}
                      style={{ flex: 1 }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>.myshopify.com</span>
                  </div>
                </div>
                {shopifyStatus === 'error' && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>
                    Could not connect. Check your store name and try again.
                  </div>
                )}
                <button type="button" onClick={handleConnectShopify}
                  disabled={shopifyConnecting || !connectStore}
                  style={{
                    padding: '10px 20px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600,
                    background: !connectStore ? 'var(--bg)' : '#96BF48', color: '#fff',
                    border: 'none', cursor: !connectStore ? 'not-allowed' : 'pointer',
                    opacity: !connectStore ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                  {shopifyConnecting ? 'Redirecting...' : 'Connect to Shopify'}
                </button>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', lineHeight: 1.5 }}>
                  You'll be redirected to Shopify to authorize Captura. We'll get read/write access to your products and customers so we can sync data automatically.
                </p>
              </>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>

        {/* Channels Section */}
        <div style={{ marginTop: 32 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Channels</label>
              <button type="button" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '8px 16px' }}
                onClick={() => setShowChannelForm(!showChannelForm)}>
                {showChannelForm ? 'Cancel' : '+ Add Channel'}
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 16, marginTop: -8 }}>
              Channels represent distribution paths (retail, DTC, distributor, event). Batches of serialized QR codes are assigned to a channel.
            </p>

            {showChannelForm && (
              <form onSubmit={handleAddChannel} style={{
                padding: 16, borderRadius: 8, background: 'var(--bg)',
                border: '1px solid var(--border)', marginBottom: 16,
                display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Name</label>
                  <input className="input" placeholder="e.g. Amazon US" value={channelForm.name}
                    onChange={e => setChannelForm({ ...channelForm, name: e.target.value })} required />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Type</label>
                  <select className="input" value={channelForm.type}
                    onChange={e => setChannelForm({ ...channelForm, type: e.target.value })}>
                    <option value="retail">Retail</option>
                    <option value="dtc">DTC</option>
                    <option value="distributor">Distributor</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }} disabled={channelSaving}>
                  {channelSaving ? 'Adding...' : 'Add'}
                </button>
              </form>
            )}

            {channelsLoading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '12px 0' }}>
                Loading...
              </div>
            ) : channelsList.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '12px 0' }}>
                No channels yet. Add one to start generating serialized QR batches.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Name', 'Type', 'Created', ''].map(h => (
                        <th key={h} style={{
                          padding: '10px 12px', textAlign: 'left',
                          fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {channelsList.map(ch => {
                      const hasBatches = (channelBatchCounts[ch.id] || 0) > 0
                      return (
                        <tr key={ch.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 500 }}>{ch.name}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                              background: 'rgba(161, 161, 170, 0.1)', color: 'var(--text-muted)',
                              textTransform: 'capitalize',
                            }}>{ch.type}</span>
                          </td>
                          <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                            {new Date(ch.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            {hasBatches ? (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                {channelBatchCounts[ch.id]} batch{channelBatchCounts[ch.id] !== 1 ? 'es' : ''}
                              </span>
                            ) : (
                              <button onClick={() => handleDeleteChannel(ch.id)}
                                style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer' }}>
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
