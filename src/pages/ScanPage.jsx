import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function getYouTubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

export default function ScanPage() {
  const { qrId } = useParams()
  const [product, setProduct] = useState(null)
  const [qrCode, setQrCode] = useState(null)
  const [brand, setBrand] = useState(null)
  const [location, setLocation] = useState(null)
  const [showVIP, setShowVIP] = useState(false)
  const [vipForm, setVipForm] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [vipSubmitted, setVipSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activePromo, setActivePromo] = useState(null)
  const [showPromoEntry, setShowPromoEntry] = useState(false)
  const [promoForm, setPromoForm] = useState({ firstName: '', lastName: '', email: '', phone: '' })
  const [promoEntered, setPromoEntered] = useState(false)
  const scanLogged = useRef(false)

  useEffect(() => {
    loadQRCode()
  }, [qrId])

  async function loadQRCode() {
    if (!supabase) {
      setProduct({ name: 'Demo Product', description: 'This is a demo product.', content_title: 'Getting Started', content_body: 'Scan a real QR code to see actual product content.' })
      setLoading(false)
      return
    }

    const { data: qr, error } = await supabase
      .from('qr_codes')
      .select('*, products(*), brands:brand_id(name, logo_url, social_instagram, social_tiktok, social_twitter, social_facebook, social_youtube, social_website)')
      .eq('short_id', qrId)
      .single()

    if (error || !qr) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setQrCode(qr)
    setProduct(qr.products)
    setBrand(qr.brands)
    setLoading(false)

    // Check for active promo
    const { data: promoData } = await supabase
      .from('promos')
      .select('*')
      .eq('brand_id', qr.brand_id)
      .eq('active', true)
      .limit(1)
      .single()
    if (promoData) setActivePromo(promoData)

    // Get location, then log scan with it
    getLocationAndLogScan(qr)
  }

  async function getLocationAndLogScan(qr) {
    if (scanLogged.current) return
    scanLogged.current = true

    // Throttle: don't log duplicate scans within 5 minutes
    const throttleKey = `scan_${qr.short_id}`
    const lastScan = localStorage.getItem(throttleKey)
    if (lastScan && Date.now() - parseInt(lastScan) < 300000) return
    localStorage.setItem(throttleKey, String(Date.now()))

    let scanData = {
      qr_code_id: qr.id,
      product_id: qr.product_id,
      brand_id: qr.brand_id,
      device: getDeviceInfo(),
      user_agent: navigator.userAgent,
    }

    // Get location from IP address (no permission popup needed)
    try {
      const res = await fetch('https://ipapi.co/json/')
      const geo = await res.json()
      if (geo && geo.city) {
        scanData.latitude = geo.latitude
        scanData.longitude = geo.longitude
        scanData.city = `${geo.city}, ${geo.region_code || geo.region}`
        scanData.region = geo.region_code || geo.region
        scanData.country = geo.country_code
        setLocation({
          lat: geo.latitude,
          lng: geo.longitude,
          city: geo.city,
          region: geo.region_code || geo.region,
          country: geo.country_code,
        })
      }
    } catch (e) {
      // IP geolocation failed, log without location
    }

    // Log the scan with whatever data we have
    if (supabase) {
      await supabase.from('scans').insert(scanData)
    }
  }

  function getDeviceInfo() {
    const ua = navigator.userAgent
    if (/iPhone/.test(ua)) return 'iPhone'
    if (/iPad/.test(ua)) return 'iPad'
    if (/Android/.test(ua)) return 'Android'
    if (/Mac/.test(ua)) return 'Mac'
    if (/Windows/.test(ua)) return 'Windows'
    return 'Unknown'
  }

  const handleVIPSubmit = async (e) => {
    e.preventDefault()
    if (supabase && qrCode) {
      await supabase.from('vip_members').insert({
        brand_id: qrCode.brand_id,
        qr_code_id: qrCode.id,
        product_id: qrCode.product_id,
        first_name: vipForm.firstName,
        last_name: vipForm.lastName,
        email: vipForm.email,
        phone: vipForm.phone,
        latitude: location?.lat || null,
        longitude: location?.lng || null,
        city: location?.city ? `${location.city}, ${location.region}` : null,
      })
    }
    setVipSubmitted(true)
  }

  const handlePromoEntry = async (e) => {
    e.preventDefault()
    if (supabase && activePromo && qrCode) {
      await supabase.from('promo_entries').insert({
        promo_id: activePromo.id,
        brand_id: qrCode.brand_id,
        qr_code_id: qrCode.id,
        product_id: qrCode.product_id,
        first_name: promoForm.firstName,
        last_name: promoForm.lastName,
        email: promoForm.email,
        phone: promoForm.phone,
        city: location?.city ? `${location.city}, ${location.region}` : null,
      })
    }
    setPromoEntered(true)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Loading...</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Product not found</div>
        <div style={{ color: 'var(--text-muted)' }}>This QR code is not linked to a product.</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', maxWidth: 480, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Product Images */}
      {product?.image_urls?.length > 0 && (
        <div style={{
          width: '100%', overflow: 'auto', background: '#000',
          display: 'flex', scrollSnapType: 'x mandatory',
        }}>
          {product.image_urls.map((url, i) => (
            <div key={i} style={{
              minWidth: '100%', height: 300, scrollSnapAlign: 'start',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src={url} alt={`${product.name} ${i + 1}`}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
          ))}
        </div>
      )}

      <div style={{
        width: '100%', padding: '20px 20px 16px',
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{product?.name || 'Product'}</h1>
      </div>

      <div style={{ padding: '0 20px' }}>
        {product?.description && (
          <div style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>
              {product.description}
            </p>
          </div>
        )}

        {(product?.content_title || product?.content_body || product?.content_url) && (
          <div style={{ padding: '24px 0', borderBottom: '1px solid var(--border)' }}>
            {product.content_title && (
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>
                {product.content_title}
              </h2>
            )}
            {product.content_body && (
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                {product.content_body}
              </p>
            )}
            {product.content_url && getYouTubeId(product.content_url) && (
              <div style={{
                marginTop: 16, borderRadius: 8, overflow: 'hidden',
                position: 'relative', paddingBottom: '56.25%', height: 0,
              }}>
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeId(product.content_url)}`}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            {product.content_url && !getYouTubeId(product.content_url) && (
              <a href={product.content_url} target="_blank" rel="noopener noreferrer"
                className="btn btn-secondary" style={{ marginTop: 16, display: 'inline-flex' }}>
                View More
              </a>
            )}
          </div>
        )}

        {/* Reorder Button */}
        {product?.reorder_url && (
          <div style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
            <a href={product.reorder_url} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', padding: '16px', borderRadius: 'var(--radius)',
                background: '#FAFAFA', color: '#09090B', fontWeight: 700,
                fontSize: '1rem', textDecoration: 'none', gap: 8,
              }}>
              Reorder This Product
            </a>
          </div>
        )}

        {/* Active Promo */}
        {activePromo && (
          <div style={{ padding: '24px 0', borderBottom: '1px solid var(--border)' }}>
            {!showPromoEntry && !promoEntered && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(245, 158, 11, 0.1))',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius)', padding: '28px 20px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🎉</div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8 }}>
                  {activePromo.title}
                </h3>
                {activePromo.description && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 8, lineHeight: 1.5 }}>
                    {activePromo.description}
                  </p>
                )}
                {activePromo.prize && (
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FAFAFA', marginBottom: 20 }}>
                    Prize: {activePromo.prize}
                  </p>
                )}
                <button className="btn btn-primary" style={{ padding: '14px 32px' }}
                  onClick={() => setShowPromoEntry(true)}>
                  Enter to Win
                </button>
              </div>
            )}

            {showPromoEntry && !promoEntered && (
              <form onSubmit={handlePromoEntry} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Enter to Win</h3>
                <input className="input" placeholder="First Name" value={promoForm.firstName}
                  onChange={e => setPromoForm({ ...promoForm, firstName: e.target.value })} required />
                <input className="input" placeholder="Last Name" value={promoForm.lastName}
                  onChange={e => setPromoForm({ ...promoForm, lastName: e.target.value })} required />
                <input className="input" type="email" placeholder="Email" value={promoForm.email}
                  onChange={e => setPromoForm({ ...promoForm, email: e.target.value })} />
                <input className="input" type="tel" placeholder="Phone Number" value={promoForm.phone}
                  onChange={e => setPromoForm({ ...promoForm, phone: e.target.value })} required />
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 14 }}>
                  Submit Entry
                </button>
              </form>
            )}

            {promoEntered && (
              <div style={{
                textAlign: 'center', padding: 28,
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid var(--success)',
                borderRadius: 'var(--radius)'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🎉</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>
                  You're Entered!
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Good luck, {promoForm.firstName}! We'll contact winners directly.
                </p>
              </div>
            )}
          </div>
        )}

        {/* VIP Signup */}
        <div style={{ padding: '24px 0' }}>
          {!showVIP && !vipSubmitted && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid #3F3F46',
                borderRadius: 'var(--radius)', padding: '28px 20px'
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>
                  Join the VIP List
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20, lineHeight: 1.5 }}>
                  Get exclusive access to deals, early product drops, and insider content.
                </p>
                <button className="btn btn-primary" style={{ padding: '14px 32px' }}
                  onClick={() => setShowVIP(true)}>
                  Sign Me Up
                </button>
              </div>
            </div>
          )}

          {showVIP && !vipSubmitted && (
            <form onSubmit={handleVIPSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Join VIP</h3>
              <input className="input" placeholder="First Name" value={vipForm.firstName}
                onChange={e => setVipForm({ ...vipForm, firstName: e.target.value })} required />
              <input className="input" placeholder="Last Name" value={vipForm.lastName}
                onChange={e => setVipForm({ ...vipForm, lastName: e.target.value })} required />
              <input className="input" type="email" placeholder="Email" value={vipForm.email}
                onChange={e => setVipForm({ ...vipForm, email: e.target.value })} />
              <input className="input" type="tel" placeholder="Phone Number" value={vipForm.phone}
                onChange={e => setVipForm({ ...vipForm, phone: e.target.value })} required />
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 14 }}>
                Join VIP List
              </button>
            </form>
          )}

          {vipSubmitted && (
            <div style={{
              textAlign: 'center', padding: 28,
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid var(--success)',
              borderRadius: 'var(--radius)'
            }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>
                You're In!
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Welcome to the VIP list, {vipForm.firstName}. We'll be in touch soon.
              </p>
            </div>
          )}
        </div>

        {/* Social Links */}
        {brand && (() => {
          const socials = [
            { key: 'social_instagram', label: 'Instagram', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>' },
            { key: 'social_tiktok', label: 'TikTok', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13a8.28 8.28 0 005.58 2.15V11.7a4.79 4.79 0 01-3.77-1.85V6.69h3.77z"/></svg>' },
            { key: 'social_twitter', label: 'X', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
            { key: 'social_facebook', label: 'Facebook', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' },
            { key: 'social_youtube', label: 'YouTube', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' },
            { key: 'social_website', label: 'Website', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>' },
          ].filter(s => brand[s.key])
          if (socials.length === 0) return null
          return (
            <div style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>
                Follow Us
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {socials.map(s => (
                  <a key={s.key} href={brand[s.key]} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      color: '#FAFAFA', textDecoration: 'none',
                    }}>
                    <span style={{ width: 20, height: 20 }} dangerouslySetInnerHTML={{ __html: s.svg }} />
                  </a>
                ))}
              </div>
            </div>
          )
        })()}

        <div style={{
          textAlign: 'center', padding: '20px 0',
          color: 'var(--text-muted)', fontSize: '0.75rem'
        }}>
          Powered by <span style={{ color: '#FAFAFA', fontWeight: 600 }}>Captura</span>
        </div>
      </div>
    </div>
  )
}
