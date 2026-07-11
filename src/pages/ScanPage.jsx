import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function getYouTubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

export default function ScanPage({ previewData } = {}) {
  // Supports two URL shapes:
  //   /s/:qrId             — legacy short_id lookup
  //   /01/:gtin/21/:serial — GS1 Digital Link (serial = short_id for tracking)
  //   /01/:gtin            — GS1 Digital Link without serial (no per-code tracking)
  const { qrId, gtin, serial } = useParams()
  const [product, setProduct] = useState(previewData?.product || null)
  const [qrCode, setQrCode] = useState(null)
  const [brand, setBrand] = useState(previewData?.brand || null)
  const [location, setLocation] = useState(null)
  const [showVIP, setShowVIP] = useState(false)
  const [vipForm, setVipForm] = useState({ firstName: '', lastName: '', email: '', phone: '', consent: false })
  const [vipSubmitted, setVipSubmitted] = useState(false)
  const [loading, setLoading] = useState(!previewData)
  const [notFound, setNotFound] = useState(false)
  const [activePromo, setActivePromo] = useState(previewData?.promo || null)
  const [showPromoEntry, setShowPromoEntry] = useState(false)
  const [promoForm, setPromoForm] = useState({ firstName: '', lastName: '', email: '', phone: '', consent: false })
  const [promoEntered, setPromoEntered] = useState(false)
  const [showWarranty, setShowWarranty] = useState(false)
  const [warrantyForm, setWarrantyForm] = useState({ firstName: '', lastName: '', email: '', phone: '', purchaseDate: '', retailer: '', consent: false })
  const [warrantyRegistered, setWarrantyRegistered] = useState(false)
  const [event, setEvent] = useState(null)
  const [eventForm, setEventForm] = useState({ firstName: '', lastName: '', email: '', phone: '', consent: false })
  const [eventSubmitted, setEventSubmitted] = useState(false)
  const scanLogged = useRef(false)
  const isPreview = !!previewData

  // Keep preview data in sync when props change
  useEffect(() => {
    if (!previewData) return
    setProduct(previewData.product || null)
    setBrand(previewData.brand || null)
    setActivePromo(previewData.promo || null)
  }, [previewData])

  // Determine lookup mode: if we have a gtin param, it's a GS1 path.
  // If we also have a serial, that's the short_id for per-code tracking.
  const lookupShortId = qrId || serial || null
  const lookupGtin = gtin ? gtin.replace(/\D/g, '').padStart(14, '0') : null

  useEffect(() => {
    if (isPreview) return
    loadQRCode()
  }, [qrId, gtin, serial])

  async function loadQRCode() {
    if (!supabase) {
      setProduct({ name: 'Demo Product', description: 'This is a demo product.', content_title: 'Getting Started', content_body: 'Scan a real QR code to see actual product content.' })
      setLoading(false)
      return
    }

    let qr = null

    // Path 1: we have a short_id (either from /s/:qrId or from GS1 /21/:serial)
    if (lookupShortId) {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*, products(*), promos(*), events(*), brands:brand_id(name, logo_url, social_instagram, social_tiktok, social_twitter, social_facebook, social_youtube, social_website)')
        .eq('short_id', lookupShortId)
        .single()
      if (!error && data) qr = data
    }

    // Path 2: GS1 path with GTIN but no serial (or serial lookup failed).
    // Look up the product by GTIN, then find any QR code for it.
    if (!qr && lookupGtin) {
      const { data: prod } = await supabase
        .from('products')
        .select('*')
        .eq('gtin', lookupGtin)
        .limit(1)
        .single()

      if (prod) {
        // Try to find a QR code for this product so we get promo/event/brand data
        const { data: qrData } = await supabase
          .from('qr_codes')
          .select('*, products(*), promos(*), events(*), brands:brand_id(name, logo_url, social_instagram, social_tiktok, social_twitter, social_facebook, social_youtube, social_website)')
          .eq('product_id', prod.id)
          .limit(1)
          .single()

        if (qrData) {
          qr = qrData
        } else {
          // Product exists but no QR code — show the product directly
          const { data: brandData } = await supabase
            .from('brands')
            .select('name, logo_url, social_instagram, social_tiktok, social_twitter, social_facebook, social_youtube, social_website')
            .eq('id', prod.brand_id)
            .single()
          setProduct(prod)
          setBrand(brandData)
          setLoading(false)
          return
        }
      }
    }

    if (!qr) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setQrCode(qr)
    setProduct(qr.products || null)
    setBrand(qr.brands)
    if (qr.events) setEvent(qr.events)
    setLoading(false)

    // Only show promos on product QR codes, never on event QR codes
    if (!qr.events) {
      if (qr.promos) {
        setActivePromo(qr.promos)
      } else {
        // Check for a brand-wide active promo
        const { data: promoData } = await supabase
          .from('promos')
          .select('*')
          .eq('brand_id', qr.brand_id)
          .eq('active', true)
          .limit(1)
          .single()
        if (promoData) setActivePromo(promoData)
      }
    }

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
      product_id: qr.product_id || null,
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

  async function logBillingEvent(brandId, consumerEmail, consumerPhone, sourceType, sourceId) {
    if (!supabase || !brandId) return
    // Build consumer key: prefer email, fall back to phone
    const consumerKey = (consumerEmail || consumerPhone || '').trim().toLowerCase()
    if (!consumerKey) return

    const now = new Date()
    const billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Check for duplicate: same consumer + same brand within 24 hours
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('billing_events')
      .select('id')
      .eq('brand_id', brandId)
      .eq('consumer_key', consumerKey)
      .gte('created_at', cutoff)
      .limit(1)

    const billable = !recent || recent.length === 0

    await supabase.from('billing_events').insert({
      brand_id: brandId,
      consumer_key: consumerKey,
      source_type: sourceType,
      source_id: sourceId || null,
      billable,
      billing_month: billingMonth,
    })
  }

  async function syncToShopify(customerData) {
    if (!qrCode?.brand_id) return
    try {
      await fetch('/.netlify/functions/sync-shopify-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: qrCode.brand_id,
          customer: customerData,
        }),
      })
    } catch (err) {
      // Shopify sync is best-effort, don't block the consumer experience
    }
  }

  const handleVIPSubmit = async (e) => {
    e.preventDefault()
    if (isPreview) { setVipSubmitted(true); return }
    if (supabase && qrCode) {
      const { data: inserted } = await supabase.from('vip_members').insert({
        brand_id: qrCode.brand_id,
        qr_code_id: qrCode.id,
        product_id: qrCode.product_id || null,
        first_name: vipForm.firstName,
        last_name: vipForm.lastName,
        email: vipForm.email,
        phone: vipForm.phone,
        latitude: location?.lat || null,
        longitude: location?.lng || null,
        city: location?.city ? `${location.city}, ${location.region}` : null,
      }).select('id').single()
      logBillingEvent(qrCode.brand_id, vipForm.email, vipForm.phone, 'vip', inserted?.id)
      syncToShopify({
        firstName: vipForm.firstName,
        lastName: vipForm.lastName,
        email: vipForm.email,
        phone: vipForm.phone,
        tags: 'captura, vip',
        note: `VIP signup via Captura QR scan`,
        product: product?.name || null,
        source: 'VIP Signup',
        city: location?.city ? `${location.city}, ${location.region}` : null,
      })
    }
    setVipSubmitted(true)
  }

  const handlePromoEntry = async (e) => {
    e.preventDefault()
    if (isPreview) { setPromoEntered(true); return }
    if (supabase && activePromo && qrCode) {
      const { data: inserted } = await supabase.from('promo_entries').insert({
        promo_id: activePromo.id,
        brand_id: qrCode.brand_id,
        qr_code_id: qrCode.id,
        product_id: qrCode.product_id || null,
        first_name: promoForm.firstName,
        last_name: promoForm.lastName,
        email: promoForm.email,
        phone: promoForm.phone,
        city: location?.city ? `${location.city}, ${location.region}` : null,
      }).select('id').single()
      logBillingEvent(qrCode.brand_id, promoForm.email, promoForm.phone, 'promo', inserted?.id)
      syncToShopify({
        firstName: promoForm.firstName,
        lastName: promoForm.lastName,
        email: promoForm.email,
        phone: promoForm.phone,
        tags: 'captura, promo',
        note: `Promo entry via Captura - ${activePromo.title}`,
        product: product?.name || null,
        source: 'Promo Entry',
        city: location?.city ? `${location.city}, ${location.region}` : null,
      })
    }
    setPromoEntered(true)
  }

  const handleWarrantySubmit = async (e) => {
    e.preventDefault()
    if (isPreview) { setWarrantyRegistered(true); return }
    if (supabase && qrCode) {
      const { data: inserted } = await supabase.from('warranty_registrations').insert({
        brand_id: qrCode.brand_id,
        product_id: qrCode.product_id,
        qr_code_id: qrCode.id,
        first_name: warrantyForm.firstName,
        last_name: warrantyForm.lastName,
        email: warrantyForm.email,
        phone: warrantyForm.phone,
        purchase_date: warrantyForm.purchaseDate || null,
        retailer: warrantyForm.retailer || null,
        city: location?.city ? `${location.city}, ${location.region}` : null,
        consent: warrantyForm.consent,
      }).select('id').single()
      logBillingEvent(qrCode.brand_id, warrantyForm.email, warrantyForm.phone, 'warranty', inserted?.id)
      syncToShopify({
        firstName: warrantyForm.firstName,
        lastName: warrantyForm.lastName,
        email: warrantyForm.email,
        phone: warrantyForm.phone,
        tags: 'captura, warranty',
        note: `Warranty registration via Captura`,
        product: product?.name || null,
        source: 'Warranty Registration',
        city: location?.city ? `${location.city}, ${location.region}` : null,
      })
    }
    setWarrantyRegistered(true)
  }

  const handleEventSubmit = async (e) => {
    e.preventDefault()
    if (isPreview) { setEventSubmitted(true); return }
    if (supabase && event && qrCode) {
      const { data: inserted } = await supabase.from('event_entries').insert({
        event_id: event.id,
        brand_id: qrCode.brand_id,
        qr_code_id: qrCode.id,
        first_name: eventForm.firstName,
        last_name: eventForm.lastName,
        email: eventForm.email,
        phone: eventForm.phone,
        city: location?.city ? `${location.city}, ${location.region}` : null,
      }).select('id').single()
      logBillingEvent(qrCode.brand_id, eventForm.email, eventForm.phone, 'event', inserted?.id)
      syncToShopify({
        firstName: eventForm.firstName,
        lastName: eventForm.lastName,
        email: eventForm.email,
        phone: eventForm.phone,
        tags: 'captura, event',
        note: `Event signup via Captura - ${event.name}${event.giveaway ? ` - Giveaway: ${event.giveaway}` : ''}`,
        product: null,
        source: 'Event Signup',
        city: location?.city ? `${location.city}, ${location.region}` : null,
      })
    }
    setEventSubmitted(true)
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
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>QR code not found</div>
        <div style={{ color: 'var(--text-muted)' }}>This QR code doesn't exist or has been removed.</div>
      </div>
    )
  }

  // Event QR - completely separate experience
  const isEventQR = !!event
  const isPromoOnly = !product && !isEventQR

  // Event scan page
  if (isEventQR) {
    return (
      <div style={{ minHeight: '100vh', maxWidth: 480, margin: '0 auto', padding: '0 0 40px' }}>
        <div style={{
          width: '100%', padding: '28px 20px 20px',
          background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
          textAlign: 'center',
        }}>
          {brand?.logo_url && (
            <img src={brand.logo_url} alt={brand.name} style={{
              width: 48, height: 48, borderRadius: 10, objectFit: 'contain',
              background: '#fff', padding: 3, marginBottom: 12,
            }} />
          )}
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{event.name}</h1>
          {brand?.name && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>by {brand.name}</p>
          )}
        </div>

        <div style={{ padding: '0 20px' }}>
          {event.description && (
            <div style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                {event.description}
              </p>
            </div>
          )}

          {event.giveaway && (
            <div style={{ padding: '24px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{
                ...(event.image_url
                  ? { backgroundImage: `url(${event.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(245, 158, 11, 0.1))' }),
                border: event.image_url ? 'none' : '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius)', overflow: 'hidden',
              }}>
                <div style={{
                  padding: '24px 20px', textAlign: 'center',
                  ...(event.image_url ? { background: 'rgba(0,0,0,0.55)' } : {}),
                }}>
                  <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>🎁</div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>Giveaway</h3>
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FAFAFA' }}>{event.giveaway}</p>
                </div>
              </div>
            </div>
          )}

          {/* VIP Signup Form */}
          <div style={{ padding: '24px 0' }}>
            {!eventSubmitted ? (
              <div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid #3F3F46',
                  borderRadius: 'var(--radius)', padding: '28px 20px',
                }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
                    Sign Up
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20, textAlign: 'center', lineHeight: 1.5 }}>
                    {event.giveaway ? 'Enter your info for a chance to win.' : 'Sign up to stay connected.'}
                  </p>
                  <form onSubmit={handleEventSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <input className="input" placeholder="First Name" value={eventForm.firstName}
                      onChange={e => setEventForm({ ...eventForm, firstName: e.target.value })} required />
                    <input className="input" placeholder="Last Name" value={eventForm.lastName}
                      onChange={e => setEventForm({ ...eventForm, lastName: e.target.value })} required />
                    <input className="input" type="email" placeholder="Email" value={eventForm.email}
                      onChange={e => setEventForm({ ...eventForm, email: e.target.value })} />
                    <input className="input" type="tel" placeholder="Phone Number" value={eventForm.phone}
                      onChange={e => setEventForm({ ...eventForm, phone: e.target.value })} required />
                    <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
                      <input type="checkbox" checked={eventForm.consent} required
                        onChange={e => setEventForm({ ...eventForm, consent: e.target.checked })}
                        style={{ marginTop: 3, accentColor: '#FAFAFA' }} />
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.5 }}>
                        I am 18 years or older and agree to receive communications from this brand via text, email, or phone. I understand my data will be used in accordance with the <a href="/privacy" target="_blank" style={{ color: '#A1A1AA', textDecoration: 'underline' }}>Privacy Policy</a>. Message and data rates may apply. Reply STOP to opt out.
                      </span>
                    </label>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 14 }}>
                      {event.giveaway ? 'Enter to Win' : 'Sign Up'}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: 'center', padding: 28,
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid var(--success)',
                borderRadius: 'var(--radius)'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🎉</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>
                  You're In!
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {event.giveaway
                    ? `Good luck, ${eventForm.firstName}! We'll contact winners directly.`
                    : `Thanks for signing up, ${eventForm.firstName}!`}
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
              { key: 'social_website', label: 'Website', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>' },
            ].filter(s => brand[s.key])
            if (socials.length === 0) return null
            return (
              <div style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>Follow Us</div>
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
            color: 'var(--text-muted)', fontSize: '0.75rem',
          }}>
            <div style={{ marginBottom: 8 }}>
              Powered by <span style={{ color: '#FAFAFA', fontWeight: 600 }}>Captura</span>
            </div>
            <div style={{ fontSize: '0.65rem', color: '#3F3F46', lineHeight: 1.5 }}>
              By scanning this code, approximate location data may be collected to improve your experience.{' '}
              <a href="/privacy" target="_blank" style={{ color: '#52525B', textDecoration: 'underline' }}>Privacy Policy</a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', maxWidth: 480, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Product Images */}
      {!isPromoOnly && product?.image_urls?.length > 0 && (
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

      {/* Header */}
      <div style={{
        width: '100%', padding: '20px 20px 16px',
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
          {isPromoOnly ? (activePromo?.title || brand?.name || 'Event') : (product?.name || 'Product')}
        </h1>
      </div>

      <div style={{ padding: '0 20px' }}>
        {!isPromoOnly && product?.description && (
          <div style={{ padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.95rem', whiteSpace: 'pre-line' }}>
              {product.description}
            </p>
          </div>
        )}

        {!isPromoOnly && (product?.content_title || product?.content_body || product?.content_url) && (
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

        {/* Warranty Registration */}
        {!isPromoOnly && product?.warranty_enabled && (
          <div style={{ padding: '24px 0', borderBottom: '1px solid var(--border)' }}>
            {!showWarranty && !warrantyRegistered && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid #3F3F46',
                borderRadius: 'var(--radius)', padding: '28px 20px', textAlign: 'center'
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>
                  Register Your Warranty
                </h3>
                {product.warranty_duration && (
                  <p style={{ color: '#FAFAFA', fontSize: '0.95rem', fontWeight: 600, marginBottom: 8 }}>
                    {product.warranty_duration} Coverage
                  </p>
                )}
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20, lineHeight: 1.5 }}>
                  Activate your product warranty and get support when you need it.
                </p>
                <button className="btn btn-primary" style={{ padding: '14px 32px' }}
                  onClick={() => setShowWarranty(true)}>
                  Register Now
                </button>
              </div>
            )}

            {showWarranty && !warrantyRegistered && (
              <form onSubmit={handleWarrantySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Warranty Registration</h3>
                <input className="input" placeholder="First Name" value={warrantyForm.firstName}
                  onChange={e => setWarrantyForm({ ...warrantyForm, firstName: e.target.value })} required />
                <input className="input" placeholder="Last Name" value={warrantyForm.lastName}
                  onChange={e => setWarrantyForm({ ...warrantyForm, lastName: e.target.value })} required />
                <input className="input" type="email" placeholder="Email" value={warrantyForm.email}
                  onChange={e => setWarrantyForm({ ...warrantyForm, email: e.target.value })} />
                <input className="input" type="tel" placeholder="Phone Number" value={warrantyForm.phone}
                  onChange={e => setWarrantyForm({ ...warrantyForm, phone: e.target.value })} required />
                <input className="input" type="date" value={warrantyForm.purchaseDate}
                  onChange={e => setWarrantyForm({ ...warrantyForm, purchaseDate: e.target.value })}
                  style={{ colorScheme: 'dark' }} />
                <input className="input" placeholder="Where did you purchase? (store name)" value={warrantyForm.retailer}
                  onChange={e => setWarrantyForm({ ...warrantyForm, retailer: e.target.value })} />
                {product.warranty_terms && (
                  <div style={{
                    padding: '12px', borderRadius: 8, background: 'var(--bg)',
                    border: '1px solid var(--border)', fontSize: '0.8rem',
                    color: 'var(--text-muted)', lineHeight: 1.6, maxHeight: 120, overflow: 'auto',
                  }}>
                    {product.warranty_terms}
                  </div>
                )}
                <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={warrantyForm.consent} required
                    onChange={e => setWarrantyForm({ ...warrantyForm, consent: e.target.checked })}
                    style={{ marginTop: 3, accentColor: '#FAFAFA' }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.5 }}>
                    I am 18 years or older and agree to the warranty terms. I consent to receiving communications about my warranty and product updates. <a href="/privacy" target="_blank" style={{ color: '#A1A1AA', textDecoration: 'underline' }}>Privacy Policy</a>
                  </span>
                </label>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 14 }}>
                  Register Warranty
                </button>
              </form>
            )}

            {warrantyRegistered && (
              <div style={{
                textAlign: 'center', padding: 28,
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid var(--success)',
                borderRadius: 'var(--radius)'
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>
                  Warranty Registered
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Your {product.warranty_duration || ''} warranty is now active, {warrantyForm.firstName}. Keep this confirmation for your records.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Reorder Button */}
        {!isPromoOnly && product?.reorder_url && (
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
                background: activePromo.image_url ? 'none' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(245, 158, 11, 0.1))',
                backgroundImage: activePromo.image_url ? `url(${activePromo.image_url})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: activePromo.image_url ? 'none' : '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius)', overflow: 'hidden',
              }}>
                <div style={{
                  background: activePromo.image_url ? 'rgba(0,0,0,0.55)' : 'transparent',
                  borderRadius: 'var(--radius)', padding: '28px 20px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🎉</div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8, color: '#FAFAFA' }}>
                    {activePromo.title}
                  </h3>
                  {activePromo.description && (
                    <p style={{ color: activePromo.image_url ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 8, lineHeight: 1.5 }}>
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
                <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={promoForm.consent} required
                    onChange={e => setPromoForm({ ...promoForm, consent: e.target.checked })}
                    style={{ marginTop: 3, accentColor: '#FAFAFA' }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.5 }}>
                    I am 18 years or older and agree to receive communications from this brand via text, email, or phone. I understand my data will be used in accordance with the <a href="/privacy" target="_blank" style={{ color: '#A1A1AA', textDecoration: 'underline' }}>Privacy Policy</a>. Message and data rates may apply. Reply STOP to opt out.
                  </span>
                </label>
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
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={vipForm.consent} required
                  onChange={e => setVipForm({ ...vipForm, consent: e.target.checked })}
                  style={{ marginTop: 3, accentColor: '#FAFAFA' }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: 1.5 }}>
                  I am 18 years or older and agree to receive communications from this brand via text, email, or phone. I understand my data will be used in accordance with the <a href="/privacy" target="_blank" style={{ color: '#A1A1AA', textDecoration: 'underline' }}>Privacy Policy</a>. Message and data rates may apply. Reply STOP to opt out.
                </span>
              </label>
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
          color: 'var(--text-muted)', fontSize: '0.75rem',
        }}>
          <div style={{ marginBottom: 8 }}>
            Powered by <span style={{ color: '#FAFAFA', fontWeight: 600 }}>Captura</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: '#3F3F46', lineHeight: 1.5 }}>
            By scanning this code, approximate location data may be collected to improve your experience.{' '}
            <a href="/privacy" target="_blank" style={{ color: '#52525B', textDecoration: 'underline' }}>Privacy Policy</a>
          </div>
        </div>
      </div>
    </div>
  )
}
