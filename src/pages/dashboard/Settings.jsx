import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { INDUSTRIES } from '../../lib/industries'

export default function Settings({ brand, onBrandUpdate }) {
  const [form, setForm] = useState({ name: '', industry: '', logoFile: null, logoPreview: null, existingLogo: null })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (brand) {
      setForm({
        name: brand.name || '',
        industry: brand.industry || '',
        logoFile: null,
        logoPreview: null,
        existingLogo: brand.logo_url || null,
      })
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

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </div>
  )
}
