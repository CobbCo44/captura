import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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

  useEffect(() => {
    loadQRCode()
    requestLocation()
  }, [qrId])

  async function loadQRCode() {
    if (!supabase) {
      setProduct({ name: 'Demo Product', brand: 'Demo Brand', description: 'This is a demo product.', content_title: 'Getting Started', content_body: 'Scan a real QR code to see actual product content.' })
      setLoading(false)
      return
    }

    // Look up QR code by short_id
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

    // Log the scan
    logScan(qr)
  }

  async function logScan(qr) {
    if (!supabase) return

    const scanData = {
      qr_code_id: qr.id,
      product_id: qr.product_id,
      brand_id: qr.brand_id,
      device: getDeviceInfo(),
      user_agent: navigator.userAgent,
    }

    // Add location if available
    if (location) {
      scanData.latitude = location.lat
      scanData.longitude = location.lng
    }

    await supabase.from('scans').insert(scanData)
  }

  function requestLocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setLocation(loc)

          // Try to reverse geocode for city name
          try {
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${loc.lat}&longitude=${loc.lng}&localityLanguage=en`)
            const data = await res.json()
            if (data.city || data.locality) {
              loc.city = data.city || data.locality
              loc.region = data.principalSubdivisionCode || data.principalSubdivision
              loc.country = data.countryCode
              setLocation({ ...loc })

              // Update the scan with location if it was already logged
              if (supabase && qrCode) {
                await supabase.from('scans')
                  .update({
                    latitude: loc.lat,
                    longitude: loc.lng,
                    city: `${loc.city}, ${loc.region}`,
                    country: loc.country,
                  })
                  .eq('qr_code_id', qrCode.id)
                  .order('scanned_at', { ascending: false })
                  .limit(1)
              }
            }
          } catch (e) {
            // Geocoding failed, that's ok
          }
        },
        () => {
          // Location denied, still log scan without location
        }
      )
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
      {/* Product Hero */}
      <div style={{
        width: '100%', padding: '40px 20px 20px',
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
        {/* Product Description */}
        {product?.description && (
          <div style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>
              {product.description}
            </p>
          </div>
        )}

        {/* Content Section */}
        {product?.content_title && (
          <div style={{ padding: '24px 0', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>
              {product.content_title}
            </h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>
              {product.content_body}
            </p>
            {product.content_url && (
              <a href={product.content_url} target="_blank" rel="noopener noreferrer"
                className="btn btn-secondary" style={{ marginTop: 16, display: 'inline-flex' }}>
                View More
              </a>
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

        {/* Powered By */}
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
