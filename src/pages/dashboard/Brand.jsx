import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { inkFor } from '../../lib/contrast'
import { KITS } from '../../lib/kits'
import ScanPage from '../ScanPage'

const LINK_FIELDS = [
  { key: 'social_instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourbrand', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>' },
  { key: 'social_tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourbrand', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13a8.28 8.28 0 005.58 2.15V11.7a4.79 4.79 0 01-3.77-1.85V6.69h3.77z"/></svg>' },
  { key: 'social_twitter', label: 'X', placeholder: 'https://x.com/yourbrand', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
  { key: 'social_facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourbrand', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' },
  { key: 'social_website', label: 'Website', placeholder: 'https://yourbrand.com', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>' },
  { key: 'social_privacy', label: 'Privacy Policy', placeholder: 'https://yourbrand.com/privacy', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>' },
]

export default function Brand({ brand, onBrandUpdate }) {
  const [form, setForm] = useState({
    name: '',
    logo_url: '',
    logo_dark_url: '',
    logo_align: 'left',
    logo_size: 32,
    accent_hex: '#FFFFFF',
    accent_ink_hex: '#000000',
    kit: 'clean',
    social_instagram: '',
    social_tiktok: '',
    social_twitter: '',
    social_facebook: '',
    social_website: '',
    social_privacy: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoDarkUploading, setLogoDarkUploading] = useState(false)
  const [products, setProducts] = useState([])
  const [previewProductId, setPreviewProductId] = useState('')
  const [promoState, setPromoState] = useState('live')
  const [promos, setPromos] = useState([])

  useEffect(() => {
    if (!brand) return
    setForm({
      name: brand.name || '',
      logo_url: brand.logo_url || '',
      logo_dark_url: brand.logo_dark_url || '',
      logo_align: brand.logo_align || 'left',
      logo_size: brand.logo_size || 32,
      accent_hex: brand.accent_hex || '#FFFFFF',
      accent_ink_hex: brand.accent_ink_hex || '#000000',
      kit: brand.kit || 'clean',
      social_instagram: brand.social_instagram || '',
      social_tiktok: brand.social_tiktok || '',
      social_twitter: brand.social_twitter || '',
      social_facebook: brand.social_facebook || '',
      social_website: brand.social_website || '',
      social_privacy: brand.social_privacy || '',
    })
  }, [brand])

  useEffect(() => {
    if (!supabase || !brand?.id || brand.id === 'demo') return
    supabase.from('products').select('id, name, image_urls, description, content_title, content_body, content_url, reorder_url, warranty_enabled, warranty_duration, warranty_terms')
      .eq('brand_id', brand.id).order('name').then(({ data }) => {
        if (data) setProducts(data)
        if (data?.length) setPreviewProductId(data[0].id)
      })
    supabase.from('promos').select('*').eq('brand_id', brand.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setPromos(data) })
  }, [brand])

  const handleAccentChange = (hex) => {
    setForm(f => ({ ...f, accent_hex: hex, accent_ink_hex: inkFor(hex) }))
  }

  const uploadLogo = async (file, variant) => {
    if (!supabase || !brand?.id) return
    const setter = variant === 'dark' ? setLogoDarkUploading : setLogoUploading
    setter(true)
    const ext = file.name.split('.').pop()
    const path = `logos/${brand.id}/${variant === 'dark' ? 'dark' : 'light'}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true })
    if (error) { alert(error.message); setter(false); return }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    const key = variant === 'dark' ? 'logo_dark_url' : 'logo_url'
    setForm(f => ({ ...f, [key]: publicUrl }))
    setter(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!supabase || !brand?.id || brand.id === 'demo') return
    setSaving(true)
    const { error } = await supabase.from('brands').update(form).eq('id', brand.id)
    if (error) { alert(error.message) }
    else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      if (onBrandUpdate) onBrandUpdate({ ...brand, ...form })
    }
    setSaving(false)
  }

  const previewProduct = products.find(p => p.id === previewProductId) || null

  const previewPromo = useMemo(() => {
    const live = promos.find(p => p.active)
    if (promoState === 'live') return live || null
    if (promoState === 'closed') return null
    if (promoState === 'winner') return live ? { ...live, _winner: true } : null
    if (promoState === 'next') return promos.find(p => !p.active) || null
    return null
  }, [promos, promoState])

  const previewData = useMemo(() => ({
    product: previewProduct,
    brand: {
      name: form.name,
      logo_url: form.logo_url,
      logo_dark_url: form.logo_dark_url,
      logo_align: form.logo_align,
      logo_size: form.logo_size,
      accent_hex: form.accent_hex,
      accent_ink_hex: form.accent_ink_hex,
      kit: form.kit,
      social_instagram: form.social_instagram,
      social_tiktok: form.social_tiktok,
      social_twitter: form.social_twitter,
      social_facebook: form.social_facebook,
      social_website: form.social_website,
      social_privacy: form.social_privacy,
    },
    promo: previewPromo,
  }), [form, previewProduct, previewPromo])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Brand</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Identity, colors, kit, and links. Changes preview live on the right.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saved && <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>Saved!</span>}
          <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="brand-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 390px', gap: 32, alignItems: 'start' }}>

        {/* LEFT COLUMN - FORM */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Identity */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Identity</label>
            <input className="input" placeholder="Brand Name" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} required />

            {/* Logo light */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                Logo (light background)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" style={{
                    width: 56, height: 56, borderRadius: 8, objectFit: 'contain',
                    background: '#fff', padding: 4, border: '1px solid var(--border)',
                  }} />
                ) : (
                  <div style={{
                    width: 56, height: 56, borderRadius: 8, background: 'var(--bg)',
                    border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.7rem',
                  }}>None</div>
                )}
                <label className="btn btn-secondary" style={{ cursor: 'pointer', fontSize: '0.8rem', padding: '8px 14px' }}>
                  {logoUploading ? 'Uploading...' : 'Upload'}
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => e.target.files[0] && uploadLogo(e.target.files[0], 'light')} />
                </label>
                {form.logo_url && (
                  <button type="button" onClick={() => setForm({ ...form, logo_url: '' })}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Logo dark */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                Logo (dark background)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {form.logo_dark_url ? (
                  <img src={form.logo_dark_url} alt="Logo dark" style={{
                    width: 56, height: 56, borderRadius: 8, objectFit: 'contain',
                    background: '#09090B', padding: 4, border: '1px solid var(--border)',
                  }} />
                ) : (
                  <div style={{
                    width: 56, height: 56, borderRadius: 8, background: 'var(--bg)',
                    border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.7rem',
                  }}>None</div>
                )}
                <label className="btn btn-secondary" style={{ cursor: 'pointer', fontSize: '0.8rem', padding: '8px 14px' }}>
                  {logoDarkUploading ? 'Uploading...' : 'Upload'}
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => e.target.files[0] && uploadLogo(e.target.files[0], 'dark')} />
                </label>
                {form.logo_dark_url && (
                  <button type="button" onClick={() => setForm({ ...form, logo_dark_url: '' })}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Logo alignment */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                Logo Alignment
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['left', 'center', 'right'].map(a => (
                  <button key={a} type="button" onClick={() => setForm({ ...form, logo_align: a })}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 6, cursor: 'pointer',
                      fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize',
                      border: form.logo_align === a ? '2px solid #FAFAFA' : '1px solid var(--border)',
                      background: form.logo_align === a ? 'rgba(255,255,255,0.06)' : 'var(--bg)',
                      color: form.logo_align === a ? '#FAFAFA' : 'var(--text-muted)',
                    }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Logo size */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                Logo Size
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ label: 'S', value: 24 }, { label: 'M', value: 32 }, { label: 'L', value: 44 }, { label: 'XL', value: 56 }].map(s => (
                  <button key={s.value} type="button" onClick={() => setForm({ ...form, logo_size: s.value })}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 6, cursor: 'pointer',
                      fontSize: '0.8rem', fontWeight: 600,
                      border: form.logo_size === s.value ? '2px solid #FAFAFA' : '1px solid var(--border)',
                      background: form.logo_size === s.value ? 'rgba(255,255,255,0.06)' : 'var(--bg)',
                      color: form.logo_size === s.value ? '#FAFAFA' : 'var(--text-muted)',
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Buttons</label>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                Button Color
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="color" value={form.accent_hex} onChange={e => handleAccentChange(e.target.value)}
                  style={{ width: 44, height: 44, border: '1px solid var(--border)', borderRadius: 8, padding: 2, cursor: 'pointer', background: 'transparent' }} />
                <input className="input" value={form.accent_hex}
                  onChange={e => {
                    const v = e.target.value
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                      setForm(f => ({ ...f, accent_hex: v }))
                      if (/^#[0-9A-Fa-f]{6}$/.test(v)) handleAccentChange(v)
                    }
                  }}
                  style={{ width: 120, fontFamily: 'monospace' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                Button Text Color (auto-computed for contrast)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 8, background: form.accent_hex,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid var(--border)', fontWeight: 700, fontSize: '0.7rem',
                  color: form.accent_ink_hex,
                }}>Aa</div>
                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {form.accent_ink_hex}
                </span>
              </div>
            </div>
          </div>

          {/* Kit */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Kit</label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: -8 }}>
              Sets the scan page background and card tones.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {KITS.map(k => (
                <div key={k.id} onClick={() => setForm({ ...form, kit: k.id })} style={{
                  padding: 14, borderRadius: 10, cursor: 'pointer',
                  border: form.kit === k.id ? '2px solid #FAFAFA' : '1px solid var(--border)',
                  background: form.kit === k.id ? 'rgba(255,255,255,0.04)' : 'var(--bg)',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>{k.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 10 }}>{k.desc}</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[k.bg, k.card, k.border].map((c, i) => (
                      <div key={i} style={{
                        flex: 1, height: 24, borderRadius: 4, background: c,
                        border: '1px solid rgba(255,255,255,0.08)',
                      }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Socials</label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: -8 }}>
              These appear on all your scan pages.
            </p>
            {LINK_FIELDS.map(f => (
              <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 22, height: 22, flexShrink: 0, color: 'var(--text-muted)' }}
                  dangerouslySetInnerHTML={{ __html: f.svg }} />
                <input className="input" placeholder={f.placeholder} value={form[f.key] || ''}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }} />
              </div>
            ))}
          </div>
        </form>

        {/* RIGHT COLUMN - PREVIEW */}
        <div className="brand-preview-col" style={{ position: 'sticky', top: 32 }}>
          {/* Preview controls */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <select className="input" value={previewProductId}
              onChange={e => setPreviewProductId(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', fontSize: '0.8rem' }}>
              <option value="">No product</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select className="input" value={promoState}
              onChange={e => setPromoState(e.target.value)}
              style={{ width: 120, padding: '8px 10px', fontSize: '0.8rem' }}>
              <option value="live">Live</option>
              <option value="closed">Closed</option>
              <option value="winner">Winner</option>
              <option value="next">Next up</option>
            </select>
          </div>

          {/* Phone frame */}
          <div style={{
            width: 390, borderRadius: 32, border: '3px solid #3F3F46',
            overflow: 'hidden', background: '#09090B',
            height: 700, overflowY: 'auto',
          }}>
            <ScanPage previewData={previewData} />
          </div>
        </div>

      </div>
    </div>
  )
}
