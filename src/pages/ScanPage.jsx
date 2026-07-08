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
      .select('*, products(*), brands:brand_id(name, logo_url)')
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

    let scanData = {
      qr_code_id: qr.id,
      product_id: qr.product_id,
      brand_id: qr.brand_id,
      device: getDeviceInfo(),
      user_agent: navigator.userAgent,
    }

    // Try to get location (with a timeout so we don't wait forever)
    try {
      const loc = await new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) return reject('no geo')
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => reject('denied'),
          { timeout: 5000 }
        )
      })

      scanData.latitude = loc.lat
      scanData.longitude = loc.lng
      setLocation(loc)

      // Reverse geocode for city
      try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${loc.lat}&longitude=${loc.lng}&localityLanguage=en`)
        const geo = await res.json()
        const city = geo.city || geo.locality || ''
        const region = geo.principalSubdivisionCode || geo.principalSubdivision || ''
        const country = geo.countryCode || ''

        if (city) {
          scanData.city = `${city}, ${region}`
          scanData.region = region
          scanData.country = country
          setLocation({ ...loc, city, region, country })
        }
      } catch (e) {
        // Geocode failed, still have lat/lng
      }
    } catch (e) {
      // Location denied or unavailable, log without it
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
        {brand && (
          <div style={{
            fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8
          }}>{brand.name}</div>
        )}
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
