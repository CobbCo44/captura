import { useState } from 'react'
import BrandedQR from '../../components/BrandedQR'

const iconPresets = {
  star: {
    label: 'Star',
    path: 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z',
    viewBox: '0 0 24 24',
  },
  bolt: {
    label: 'Bolt',
    path: 'M13 2L3 14h9l-1 10 10-12h-9l1-10z',
    viewBox: '0 0 24 24',
  },
  diamond: {
    label: 'Diamond',
    path: 'M12 2L2 12l10 10 10-10L12 2z',
    viewBox: '0 0 24 24',
  },
  heart: {
    label: 'Heart',
    path: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    viewBox: '0 0 24 24',
  },
  shield: {
    label: 'Shield',
    path: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
    viewBox: '0 0 24 24',
  },
  flame: {
    label: 'Flame',
    path: 'M12 23c-3.6 0-8-3.17-8-8.5C4 9.67 8 4 12 1c4 3 8 8.67 8 13.5 0 5.33-4.4 8.5-8 8.5zm0-18.5C9.5 7.5 6 12 6 14.5 6 18.09 8.69 21 12 21s6-2.91 6-6.5c0-2.5-3.5-7-6-10z',
    viewBox: '0 0 24 24',
  },
  crown: {
    label: 'Crown',
    path: 'M2 19h20v3H2v-3zm2-5l4-7 4 4 4-4 4 7H4z',
    viewBox: '0 0 24 24',
  },
  circle: {
    label: 'Dot',
    path: null,
    viewBox: '0 0 24 24',
  },
}

const demoQRs = [
  {
    id: 'q1', product: 'Pro Wireless Earbuds', scans: 412, created: '2026-06-15',
    color: '#6C2BD9', color2: '#EC4899', icon: 'bolt',
    finderStyle: 'circle', circularFade: true, randomSize: true, jitter: true,
  },
  {
    id: 'q2', product: 'Running Shoes V2', scans: 287, created: '2026-06-20',
    color: '#EC4899', color2: '#F59E0B', icon: 'star',
    finderStyle: 'rounded', circularFade: false, randomSize: true, jitter: false, rotateIcons: true,
  },
  {
    id: 'q3', product: 'Sport Water Bottle', scans: 198, created: '2026-06-22',
    color: '#10B981', color2: '#06B6D4', icon: 'diamond',
    finderStyle: 'diamond', circularFade: true, randomSize: false, jitter: true,
  },
  {
    id: 'q4', product: 'Training Gloves', scans: 156, created: '2026-06-28',
    color: '#F59E0B', color2: '#EF4444', icon: 'circle',
    finderStyle: 'circle', circularFade: false, randomSize: true, jitter: true,
    shapeMask: 'shield',
  },
]

const toggleStyle = (active) => ({
  padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
  background: active ? 'rgba(108, 43, 217, 0.2)' : 'var(--bg)',
  border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
  color: active ? 'var(--text)' : 'var(--text-muted)',
})

export default function QRCodes() {
  const [qrCodes, setQrCodes] = useState(demoQRs)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    product: '',
    fgColor: '#6C2BD9',
    fgColor2: '#EC4899',
    icon: 'circle',
    customIconFile: null,
    finderStyle: 'circle',
    circularFade: true,
    randomSize: true,
    jitter: true,
    rotateIcons: false,
    dotScale: 1.0,
    shapeMask: 'none',        // 'none', preset key, or 'custom'
    customShapeMask: null,     // data URL of uploaded shape image
  })

  const scanUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const handleCreate = (e) => {
    e.preventDefault()
    const newQR = {
      id: `q${Date.now()}`,
      product: form.product,
      scans: 0,
      created: new Date().toISOString().split('T')[0],
      color: form.fgColor,
      color2: form.fgColor2,
      icon: form.icon,
      finderStyle: form.finderStyle,
      circularFade: form.circularFade,
      randomSize: form.randomSize,
      jitter: form.jitter,
      rotateIcons: form.rotateIcons,
    }
    setQrCodes([...qrCodes, newQR])
    setShowCreate(false)
  }

  const handleIconUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setForm({ ...form, customIconFile: ev.target.result, icon: 'custom' })
    }
    reader.readAsDataURL(file)
  }

  const handleShapeMaskUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setForm({ ...form, customShapeMask: ev.target.result, shapeMask: 'custom' })
    }
    reader.readAsDataURL(file)
  }

  const selectedPreset = iconPresets[form.icon] || iconPresets.circle

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>QR Codes</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Custom branded codes made from your icon
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create QR Code</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
        {qrCodes.map(qr => {
          const preset = iconPresets[qr.icon] || iconPresets.circle
          return (
            <div key={qr.id} className="card" style={{ textAlign: 'center' }}>
              <div style={{
                background: '#0A0A10', borderRadius: 12, padding: 28,
                display: 'flex', justifyContent: 'center', marginBottom: 16
              }}>
                <BrandedQR
                  url={`${scanUrl}/s/${qr.id}`}
                  fgColor={qr.color}
                  fgColor2={qr.color2}
                  iconSvgPath={preset.path}
                  iconViewBox={preset.viewBox}
                  size={200}
                  finderStyle={qr.finderStyle || 'rounded'}
                  circularFade={qr.shapeMask ? false : qr.circularFade}
                  randomSize={qr.randomSize}
                  jitter={qr.jitter}
                  rotateIcons={qr.rotateIcons}
                  shapeMaskSvgPath={
                    qr.shapeMask && qr.shapeMask !== 'none' && iconPresets[qr.shapeMask]
                      ? iconPresets[qr.shapeMask].path : null
                  }
                  shapeMaskViewBox={
                    qr.shapeMask && iconPresets[qr.shapeMask]
                      ? iconPresets[qr.shapeMask].viewBox : '0 0 24 24'
                  }
                />
              </div>
              <h3 style={{ fontWeight: 600, marginBottom: 4 }}>{qr.product}</h3>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
                {qr.scans} scans &middot; {qr.created}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}>
                  Download SVG
                </button>
                <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem', padding: '8px' }}>
                  Download PNG
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create QR Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          overflow: 'auto', padding: 24
        }} onClick={() => setShowCreate(false)}>
          <div className="card" style={{ width: 680, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 24 }}>Create Branded QR Code</h2>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>

                {/* Left: Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Product */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      Product
                    </label>
                    <select className="input" value={form.product}
                      onChange={e => setForm({ ...form, product: e.target.value })} required>
                      <option value="">Select a product</option>
                      <option>Pro Wireless Earbuds</option>
                      <option>Running Shoes V2</option>
                      <option>Sport Water Bottle</option>
                      <option>Training Gloves</option>
                      <option>Yoga Mat Premium</option>
                      <option>Resistance Bands Set</option>
                    </select>
                  </div>

                  {/* Icon Shape */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                      Dot Shape
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                      {Object.entries(iconPresets).map(([key, preset]) => (
                        <button type="button" key={key}
                          onClick={() => setForm({ ...form, icon: key, customIconFile: null })}
                          style={{
                            padding: '8px 4px', borderRadius: 8, fontSize: '0.65rem',
                            background: form.icon === key ? 'rgba(108, 43, 217, 0.2)' : 'var(--bg)',
                            border: form.icon === key ? '2px solid var(--primary)' : '1px solid var(--border)',
                            color: form.icon === key ? 'var(--text)' : 'var(--text-muted)',
                            cursor: 'pointer', textAlign: 'center',
                          }}>
                          {preset.path ? (
                            <svg width="18" height="18" viewBox={preset.viewBox} style={{ display: 'block', margin: '0 auto 2px' }}>
                              <path d={preset.path} fill={form.icon === key ? 'var(--primary-light)' : 'var(--text-muted)'} />
                            </svg>
                          ) : (
                            <div style={{
                              width: 18, height: 18, borderRadius: '50%', margin: '0 auto 2px',
                              background: form.icon === key ? 'var(--primary-light)' : 'var(--text-muted)',
                            }} />
                          )}
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Upload */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      Or upload brand icon (SVG/PNG)
                    </label>
                    <input type="file" accept="image/*" onChange={handleIconUpload}
                      style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} />
                  </div>

                  {/* Colors */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        Color 1
                      </label>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input type="color" value={form.fgColor}
                          onChange={e => setForm({ ...form, fgColor: e.target.value })}
                          style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                        <input className="input" value={form.fgColor}
                          onChange={e => setForm({ ...form, fgColor: e.target.value })} style={{ fontSize: '0.85rem' }} />
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        Color 2 (gradient)
                      </label>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input type="color" value={form.fgColor2}
                          onChange={e => setForm({ ...form, fgColor2: e.target.value })}
                          style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                        <input className="input" value={form.fgColor2}
                          onChange={e => setForm({ ...form, fgColor2: e.target.value })} style={{ fontSize: '0.85rem' }} />
                      </div>
                    </div>
                  </div>

                  {/* Style Toggles */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                      Effects
                    </label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => setForm({ ...form, circularFade: !form.circularFade })}
                        style={toggleStyle(form.circularFade)}>Circular Fade</button>
                      <button type="button" onClick={() => setForm({ ...form, randomSize: !form.randomSize })}
                        style={toggleStyle(form.randomSize)}>Random Sizes</button>
                      <button type="button" onClick={() => setForm({ ...form, jitter: !form.jitter })}
                        style={toggleStyle(form.jitter)}>Jitter</button>
                      <button type="button" onClick={() => setForm({ ...form, rotateIcons: !form.rotateIcons })}
                        style={toggleStyle(form.rotateIcons)}>Rotate Icons</button>
                    </div>
                  </div>

                  {/* Dot Scale */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                      Dot Size: {(form.dotScale * 100).toFixed(0)}%
                    </label>
                    <input type="range" min="0.5" max="1.5" step="0.05" value={form.dotScale}
                      onChange={e => setForm({ ...form, dotScale: parseFloat(e.target.value) })}
                      style={{ width: '100%', accentColor: 'var(--primary)' }} />
                  </div>

                  {/* Logo Shape Mask */}
                  <div style={{
                    background: 'rgba(108, 43, 217, 0.05)',
                    border: '1px solid rgba(108, 43, 217, 0.2)',
                    borderRadius: 12, padding: 14,
                  }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--primary-light)', marginBottom: 8, fontWeight: 600 }}>
                      Logo Shape Mask
                    </label>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.4 }}>
                      Upload your logo to shape the entire QR code into your logo's silhouette. Works best with bold, chunky logos.
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      <button type="button" onClick={() => setForm({ ...form, shapeMask: 'none', customShapeMask: null })}
                        style={toggleStyle(form.shapeMask === 'none')}>None</button>
                      {Object.entries(iconPresets).filter(([k]) => k !== 'circle').map(([key, preset]) => (
                        <button type="button" key={`shape-${key}`}
                          onClick={() => setForm({ ...form, shapeMask: key, customShapeMask: null })}
                          style={toggleStyle(form.shapeMask === key)}>
                          {preset.path && (
                            <svg width="14" height="14" viewBox={preset.viewBox} style={{ verticalAlign: 'middle', marginRight: 2 }}>
                              <path d={preset.path} fill="currentColor" />
                            </svg>
                          )}
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <input type="file" accept="image/*" onChange={handleShapeMaskUpload}
                      style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} />
                    {form.shapeMask !== 'none' && (
                      <p style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: 6 }}>
                        Scan with your phone to test. Complex shapes may not scan.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Live Preview */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                    Live Preview
                  </label>
                  <div style={{
                    background: '#0A0A10', borderRadius: 16, padding: 24,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    border: '1px solid var(--border)', minHeight: 300,
                  }}>
                    <BrandedQR
                      url={`${scanUrl}/s/preview`}
                      fgColor={form.fgColor}
                      fgColor2={form.fgColor2}
                      iconSvgPath={form.icon === 'custom' ? null : (selectedPreset?.path || null)}
                      iconViewBox={selectedPreset?.viewBox}
                      iconSrc={form.icon === 'custom' ? form.customIconFile : null}
                      size={260}
                      finderStyle={form.finderStyle}
                      circularFade={form.shapeMask === 'none' ? form.circularFade : false}
                      randomSize={form.randomSize}
                      jitter={form.jitter}
                      rotateIcons={form.rotateIcons}
                      dotScale={form.dotScale}
                      shapeMaskSrc={form.shapeMask === 'custom' ? form.customShapeMask : null}
                      shapeMaskSvgPath={
                        form.shapeMask !== 'none' && form.shapeMask !== 'custom' && iconPresets[form.shapeMask]
                          ? iconPresets[form.shapeMask].path
                          : null
                      }
                      shapeMaskViewBox={
                        form.shapeMask !== 'none' && form.shapeMask !== 'custom' && iconPresets[form.shapeMask]
                          ? iconPresets[form.shapeMask].viewBox
                          : '0 0 24 24'
                      }
                    />
                  </div>
                  <p style={{
                    color: 'var(--text-muted)', fontSize: '0.75rem',
                    textAlign: 'center', marginTop: 10, lineHeight: 1.4
                  }}>
                    Try scanning with your phone camera to verify it works.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
                  onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create QR Code</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
