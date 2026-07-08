import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const PLATFORMS = [
  { key: 'social_instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourbrand', icon: '📸' },
  { key: 'social_tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourbrand', icon: '🎵' },
  { key: 'social_twitter', label: 'X / Twitter', placeholder: 'https://x.com/yourbrand', icon: '𝕏' },
  { key: 'social_facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourbrand', icon: '📘' },
  { key: 'social_youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourbrand', icon: '▶️' },
  { key: 'social_website', label: 'Website', placeholder: 'https://yourbrand.com', icon: '🌐' },
]

export default function Socials({ brand }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (brand) {
      const initial = {}
      PLATFORMS.forEach(p => { initial[p.key] = brand[p.key] || '' })
      setForm(initial)
    }
  }, [brand])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!supabase || !brand?.id || brand.id === 'demo') return
    setSaving(true)

    const { error } = await supabase.from('brands')
      .update(form)
      .eq('id', brand.id)

    if (error) {
      alert(`Error saving: ${error.message}`)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  const filledCount = PLATFORMS.filter(p => form[p.key]).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Socials</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            These links appear on all your QR code scan pages
          </p>
        </div>
        {saved && (
          <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>Saved!</span>
        )}
      </div>

      <div style={{ maxWidth: 560 }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PLATFORMS.map(p => (
            <div key={p.key} className="card" style={{
              display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
              border: form[p.key] ? '1px solid var(--success)' : '1px solid var(--border)',
            }}>
              <div style={{ fontSize: '1.5rem', width: 36, textAlign: 'center', flexShrink: 0 }}>{p.icon}</div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                  {p.label}
                </label>
                <input
                  className="input"
                  placeholder={p.placeholder}
                  value={form[p.key] || ''}
                  onChange={e => setForm({ ...form, [p.key]: e.target.value })}
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                />
              </div>
              {form[p.key] && (
                <button type="button" onClick={() => setForm({ ...form, [p.key]: '' })}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>
                  Clear
                </button>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Saving...' : `Save Socials (${filledCount} linked)`}
            </button>
          </div>
        </form>

        {filledCount > 0 && (
          <div className="card" style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Preview (as seen on scan page)</h3>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {PLATFORMS.filter(p => form[p.key]).map(p => (
                <a key={p.key} href={form[p.key]} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    color: '#FAFAFA', fontSize: '0.8rem', fontWeight: 500,
                    textDecoration: 'none',
                  }}>
                  <span>{p.icon}</span> {p.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
