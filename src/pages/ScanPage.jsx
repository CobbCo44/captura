import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { buildTokens } from '../lib/tokens'
import { resolveCTA } from '../lib/resolveCTA'
import { derivePromoStatus } from '../lib/resolvePrimary'

function getYouTubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

function getVisitorCookie() {
  const match = document.cookie.match(/captura_visitor_id=([^;]+)/)
  return match ? match[1] : null
}

function setVisitorCookie(id) {
  document.cookie = `captura_visitor_id=${id};path=/;max-age=${365*24*60*60};SameSite=Lax`
}

export default function ScanPage({ previewData } = {}) {
  const { qrId, gtin, serial } = useParams()
  const [product, setProduct] = useState(previewData?.product || null)
  const [qrCode, setQrCode] = useState(null)
  const [brand, setBrand] = useState(previewData?.brand || null)
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(!previewData)
  const [notFound, setNotFound] = useState(false)
  const [activePromo, setActivePromo] = useState(previewData?.promo || null)
  const [event, setEvent] = useState(null)
  const [eventForm, setEventForm] = useState({ firstName: '', lastName: '', email: '', phone: '', consent: false })
  const [eventSubmitted, setEventSubmitted] = useState(false)

  // Unified capture
  const [visitorId, setVisitorId] = useState(null)
  const [captured, setCaptured] = useState(false)
  const [formMode, setFormMode] = useState(null)  // 'promo' | 'warranty' | 'vip' | null
  const [formData, setFormData] = useState({ firstName: '', email: '', phone: '', smsConsent: false, purchaseDate: '', retailer: '' })
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)

  // UI
  const [countdown, setCountdown] = useState('')
  const [descExpanded, setDescExpanded] = useState(false)
  const [showStickyBar, setShowStickyBar] = useState(false)

  const scanLogged = useRef(false)
  const askRef = useRef(null)
  const isPreview = !!previewData

  // Keep preview data in sync when props change
  useEffect(() => {
    if (!previewData) return
    setProduct(previewData.product || null)
    setBrand(previewData.brand || null)
    setActivePromo(previewData.promo || null)
  }, [previewData])

  // Determine lookup mode
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
        .select('*, products(*), promos(*), events(*), brands:brand_id(name, logo_url, logo_dark_url, logo_align, logo_size, logo_header_h, accent_hex, accent_ink_hex, kit, social_instagram, social_tiktok, social_twitter, social_facebook, social_youtube, social_website)')
        .eq('short_id', lookupShortId)
        .single()
      if (!error && data) qr = data
    }

    // Path 2: GS1 path with GTIN but no serial (or serial lookup failed).
    if (!qr && lookupGtin) {
      const { data: prod } = await supabase
        .from('products')
        .select('*')
        .eq('gtin', lookupGtin)
        .limit(1)
        .single()

      if (prod) {
        const { data: qrData } = await supabase
          .from('qr_codes')
          .select('*, products(*), promos(*), events(*), brands:brand_id(name, logo_url, logo_dark_url, logo_align, logo_size, logo_header_h, accent_hex, accent_ink_hex, kit, social_instagram, social_tiktok, social_twitter, social_facebook, social_youtube, social_website)')
          .eq('product_id', prod.id)
          .limit(1)
          .single()

        if (qrData) {
          qr = qrData
        } else {
          const { data: brandData } = await supabase
            .from('brands')
            .select('name, logo_url, logo_dark_url, logo_align, logo_size, logo_header_h, accent_hex, accent_ink_hex, kit, social_instagram, social_tiktok, social_twitter, social_facebook, social_youtube, social_website')
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

    // Initialize visitor
    initVisitor(qr.brand_id)

    // Only show promos on product QR codes, never on event QR codes
    if (!qr.events) {
      if (qr.promos) {
        setActivePromo(qr.promos)
      } else {
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

  async function initVisitor(brandId) {
    if (isPreview || !supabase) return
    let vid = getVisitorCookie()
    if (vid) {
      // Update last_seen
      await supabase.from('visitors').update({ last_seen_at: new Date().toISOString() }).eq('id', vid)
      setVisitorId(vid)
    } else {
      // Create new visitor
      const { data } = await supabase.from('visitors').insert({ brand_id: brandId }).select('id').single()
      if (data) {
        vid = data.id
        setVisitorCookie(vid)
        setVisitorId(vid)
      }
    }
    // Check if captured via RPC
    if (vid) {
      const { data: isCaptured } = await supabase.rpc('is_visitor_captured', { p_visitor_id: vid, p_brand_id: brandId })
      setCaptured(!!isCaptured)
    }
  }

  // Countdown timer
  const countdownTarget = useMemo(() => {
    if (!activePromo?.active) return null
    const status = derivePromoStatus(activePromo)
    if (status === 'live') return activePromo.end_at
    if (status === 'scheduled') return activePromo.start_at
    return null
  }, [activePromo])

  useEffect(() => {
    if (!countdownTarget) { setCountdown(''); return }
    const calc = () => {
      const diff = Math.max(0, new Date(countdownTarget) - new Date())
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setCountdown(`${d}d ${h}h ${m}m`)
    }
    calc()
    const id = setInterval(calc, 60000)
    return () => clearInterval(id)
  }, [countdownTarget])

  // Sticky bar observer
  useEffect(() => {
    if (!askRef.current || captured) return
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(askRef.current)
    return () => observer.disconnect()
  }, [captured, formMode])

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

  const handleCaptureSubmit = async (e) => {
    e.preventDefault()
    if (isPreview) { setFormSubmitted(true); setCaptured(true); return }
    if (!supabase || !qrCode?.brand_id) return
    setFormSubmitting(true)

    const brandId = qrCode.brand_id
    const smsText = 'Text me when the winner drops and when new gear lands'

    // Upsert contact
    const contactPayload = {
      brand_id: brandId,
      visitor_id: visitorId,
      first_name: formData.firstName,
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone || null,
      sms_consent: formData.smsConsent,
      sms_consent_at: formData.smsConsent ? new Date().toISOString() : null,
      sms_consent_text: formData.smsConsent ? smsText : null,
      source: formMode || 'vip',
    }

    const { data: contact, error } = await supabase
      .from('contacts')
      .upsert(contactPayload, { onConflict: 'brand_id,email' })
      .select('id')
      .single()

    if (error || !contact) {
      setFormSubmitting(false)
      return
    }

    // Attach promo entry or warranty
    if (formMode === 'promo' && activePromo) {
      await supabase.from('contact_promo_entries').upsert(
        { contact_id: contact.id, promo_id: activePromo.id },
        { onConflict: 'contact_id,promo_id' }
      )
    }
    if (formMode === 'warranty' && product) {
      await supabase.from('contact_warranties').upsert(
        { contact_id: contact.id, product_id: product.id, purchase_date: formData.purchaseDate || null, retailer: formData.retailer || null },
        { onConflict: 'contact_id,product_id' }
      )
    }

    // Billing + Shopify
    logBillingEvent(brandId, formData.email, formData.phone, formMode || 'vip', contact.id)
    syncToShopify({
      firstName: formData.firstName,
      lastName: '',
      email: formData.email,
      phone: formData.phone,
      tags: `captura, ${formMode || 'vip'}`,
      note: `${formMode || 'vip'} capture via Captura`,
      product: product?.name || null,
      source: formMode || 'vip',
      city: location?.city ? `${location.city}, ${location.region}` : null,
    })

    setFormSubmitted(true)
    setCaptured(true)
    setFormSubmitting(false)
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

  // --- Product scan page ---
  const isPromoOnly = !product && !isEventQR
  const tokens = buildTokens(brand)
  const cta = resolveCTA({ promo: activePromo, visitor: { captured } })

  const ghostBtn = {
    background: 'transparent',
    border: '1px solid var(--t-border)',
    color: 'var(--t-text)',
    borderRadius: 'var(--t-radius)',
    padding: '12px 16px',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center',
  }

  const accentBtn = {
    background: 'var(--t-accent)',
    color: 'var(--t-accent-ink)',
    border: 'none',
    borderRadius: 'var(--t-radius)',
    padding: '14px 32px',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
  }

  // Rail buttons
  const railButtons = []
  if (product?.warranty_enabled) railButtons.push({ label: 'Warranty', action: () => { setFormMode('warranty'); setFormSubmitted(false) } })
  if (product?.reorder_url) railButtons.push({ label: 'Reorder', href: product.reorder_url })
  if (product?.care_url) railButtons.push({ label: 'Care', href: product.care_url })

  // Pill content
  const pillContent = (() => {
    if (!cta) return null
    switch (cta.state) {
      case 'live': return <><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22C55E', marginRight: 6, animation: 'captura-pulse 2s ease-in-out infinite' }} />Live now</>
      case 'closed': return 'Entries closed'
      case 'winner': return 'Winner announced'
      case 'scheduled': return 'Next drop'
      case 'vip': return 'Owner list'
      default: return null
    }
  })()

  return (
    <div style={{ minHeight: '100vh', maxWidth: 480, margin: '0 auto', background: 'var(--t-bg)', color: 'var(--t-text)', ...tokens }}>
      <style>{`@keyframes captura-pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }`}</style>

      {/* 1. Brand bar - sticky top, 46px, accent bg */}
      {(brand?.logo_dark_url || brand?.logo_url) && (
        <div style={{
          width: '100%', height: 46, padding: '0 16px', overflow: 'hidden',
          background: 'var(--t-accent)',
          position: 'sticky', top: 0, zIndex: 10,
          display: 'flex', alignItems: 'center',
          justifyContent: brand?.logo_align === 'center' ? 'center' : brand?.logo_align === 'right' ? 'flex-end' : 'flex-start',
        }}>
          <img src={brand.logo_dark_url || brand.logo_url} alt={brand.name} style={{
            height: Math.round(46 * (brand?.logo_size || 40) / 100), objectFit: 'contain',
          }} />
        </div>
      )}

      {/* 2. Hero image - 4:3, full size */}
      {!isPromoOnly && product?.image_urls?.length > 0 && (
        <div style={{ width: '100%', overflow: 'auto', display: 'flex', scrollSnapType: 'x mandatory' }}>
          {product.image_urls.map((url, i) => (
            <div key={i} style={{
              minWidth: '100%', height: 300, scrollSnapAlign: 'start',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--t-card)',
            }}>
              <img src={url} alt={`${product.name} ${i + 1}`}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
          ))}
        </div>
      )}

      {/* 3. Product name */}
      <div style={{ padding: '20px 20px 12px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--t-text)', margin: 0 }}>
          {isPromoOnly ? (activePromo?.title || brand?.name || 'Product') : (product?.name || 'Product')}
        </h1>
      </div>

      <div style={{ padding: '0 20px' }}>

        {/* 4. Video - above the ask, 16:9 */}
        {!isPromoOnly && product?.content_url && getYouTubeId(product.content_url) && (
          <div style={{ marginBottom: 20 }}>
            {product.content_title && (
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12, color: 'var(--t-text)' }}>
                {product.content_title}
              </h2>
            )}
            {product.content_body && (
              <p style={{ color: 'var(--t-muted)', lineHeight: 1.7, fontSize: '0.95rem', marginBottom: 12 }}>
                {product.content_body}
              </p>
            )}
            <div style={{
              borderRadius: 'var(--t-radius)', overflow: 'hidden',
              position: 'relative', paddingBottom: '56.25%', height: 0,
            }}>
              <iframe
                src={`https://www.youtube.com/embed/${getYouTubeId(product.content_url)}`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Non-YouTube content link */}
        {!isPromoOnly && product?.content_url && !getYouTubeId(product.content_url) && (
          <div style={{ marginBottom: 20 }}>
            {product.content_title && (
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12, color: 'var(--t-text)' }}>
                {product.content_title}
              </h2>
            )}
            {product.content_body && (
              <p style={{ color: 'var(--t-muted)', lineHeight: 1.7, fontSize: '0.95rem', marginBottom: 12 }}>
                {product.content_body}
              </p>
            )}
            <a href={product.content_url} target="_blank" rel="noopener noreferrer"
              style={{ ...ghostBtn, display: 'inline-flex' }}>
              View More
            </a>
          </div>
        )}

        {/* 5. CTA CARD or confirmation */}
        <div ref={askRef}>
          {cta && !formMode && !formSubmitted ? (
            <div style={{
              borderRadius: 'var(--t-radius)', overflow: 'hidden',
              ...(cta.image
                ? { backgroundImage: `url(${cta.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : { background: 'var(--t-card)' }),
            }}>
              <div style={{
                ...(cta.useScrim
                  ? { background: 'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.82) 100%)' }
                  : {}),
                padding: '32px 20px', textAlign: 'center',
              }}>
                {/* Pill */}
                <div style={{
                  display: 'inline-block', padding: '4px 14px',
                  borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
                  background: cta.useScrim ? 'rgba(255,255,255,0.15)' : 'var(--t-border)',
                  color: cta.useScrim ? '#fff' : 'var(--t-muted)',
                  marginBottom: 16,
                }}>
                  {pillContent}
                </div>

                {/* Headline */}
                <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8, color: cta.useScrim ? '#fff' : 'var(--t-text)' }}>
                  {cta.headline}
                </div>

                {/* Subline / countdown */}
                {cta.subline && (
                  <div style={{ fontSize: '0.9rem', color: cta.useScrim ? 'rgba(255,255,255,0.8)' : 'var(--t-muted)', marginBottom: 8, lineHeight: 1.5 }}>
                    {cta.subline}
                  </div>
                )}
                {cta.showCountdown && countdown && (
                  <div style={{ fontSize: '0.85rem', color: cta.useScrim ? 'rgba(255,255,255,0.7)' : 'var(--t-muted)', marginBottom: 12 }}>
                    {cta.state === 'live' ? `Ends in ${countdown}` : `Starts in ${countdown}`}
                  </div>
                )}

                {/* Accent CTA - the ONLY filled button on the page */}
                <button style={accentBtn} onClick={() => { setFormMode(cta.formMode); setFormSubmitted(false) }}>
                  {cta.cta}
                </button>
              </div>
            </div>
          ) : captured || formSubmitted ? (
            /* Confirmation row */
            <div style={{
              padding: '16px 20px', borderRadius: 'var(--t-radius)',
              background: 'var(--t-card)', textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--t-text)' }}>
                You're on the list
              </div>
            </div>
          ) : null}
        </div>

        {/* CAPTURE FORM (inline, below ask) */}
        {formMode && !formSubmitted && (
          <div style={{ paddingTop: 20 }}>
            <form onSubmit={handleCaptureSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input className="input" placeholder="First Name" value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })} required />
              <input className="input" type="email" placeholder="Email" value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })} required />
              <input className="input" type="tel" placeholder="Phone (optional)" value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })} />

              {/* Warranty fields */}
              {formMode === 'warranty' && (
                <>
                  <input className="input" type="date" placeholder="Purchase Date" value={formData.purchaseDate}
                    onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                    style={{ colorScheme: 'dark' }} />
                  <input className="input" placeholder="Where did you purchase? (store name)" value={formData.retailer}
                    onChange={e => setFormData({ ...formData, retailer: e.target.value })} />
                </>
              )}

              {/* SMS consent - unchecked, never required */}
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={formData.smsConsent}
                  onChange={e => setFormData({ ...formData, smsConsent: e.target.checked })}
                  style={{ marginTop: 3, accentColor: 'var(--t-accent)' }} />
                <span style={{ color: 'var(--t-muted)', fontSize: '0.75rem', lineHeight: 1.5 }}>
                  Text me when the winner drops and when new gear lands
                </span>
              </label>

              {/* Notice at collection */}
              <p style={{ color: 'var(--t-muted)', fontSize: '0.65rem', lineHeight: 1.5, margin: 0 }}>
                By submitting, you agree to receive communications from this brand. Your data is used in accordance with our <a href="/privacy" target="_blank" style={{ color: 'var(--t-muted)', textDecoration: 'underline' }}>Privacy Policy</a>. Message and data rates may apply. Reply STOP to opt out.
              </p>

              <button type="submit" disabled={formSubmitting} style={{ ...accentBtn, width: '100%', opacity: formSubmitting ? 0.7 : 1 }}>
                {formSubmitting ? 'Submitting...' : cta?.cta || 'Submit'}
              </button>
            </form>
          </div>
        )}

        {/* 6. SECONDARY RAIL */}
        {railButtons.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            {railButtons.map(btn => (
              btn.href ? (
                <a key={btn.label} href={btn.href} target="_blank" rel="noopener noreferrer"
                  style={{ ...ghostBtn, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {btn.label}
                </a>
              ) : (
                <button key={btn.label} style={{ ...ghostBtn, flex: 1 }} onClick={btn.action}>
                  {btn.label}
                </button>
              )
            ))}
          </div>
        )}

        {/* 7. Content - description with clamp */}
        {!isPromoOnly && product?.description && (
          <div style={{ padding: '24px 0', borderBottom: `1px solid var(--t-border)` }}>
            <div style={{
              color: 'var(--t-muted)', lineHeight: 1.7, fontSize: '0.95rem', whiteSpace: 'pre-line',
              ...(!descExpanded ? { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}),
            }}>
              {product.description}
            </div>
            <button onClick={() => setDescExpanded(!descExpanded)}
              style={{ background: 'none', border: 'none', color: 'var(--t-accent)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', padding: '8px 0 0' }}>
              {descExpanded ? 'Show less' : 'Read more'}
            </button>
          </div>
        )}

        {/* Features */}
        {!isPromoOnly && product?.features?.length > 0 && (
          <div style={{ padding: '20px 0', borderBottom: `1px solid var(--t-border)` }}>
            <ul style={{ color: 'var(--t-muted)', paddingLeft: 20, margin: 0, listStyleType: 'disc', lineHeight: 1.8, fontSize: '0.9rem' }}>
              {product.features.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}

        {/* 8. Socials */}
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
            <div style={{ padding: '20px 0', borderBottom: `1px solid var(--t-border)` }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 12, textAlign: 'center', color: 'var(--t-text)' }}>Follow Us</div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                {socials.map(s => (
                  <a key={s.key} href={brand[s.key]} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'var(--t-card)', border: '1px solid var(--t-border)',
                      color: 'var(--t-text)', textDecoration: 'none',
                    }}>
                    <span style={{ width: 20, height: 20 }} dangerouslySetInnerHTML={{ __html: s.svg }} />
                  </a>
                ))}
              </div>
            </div>
          )
        })()}

        {/* 9. Footer */}
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--t-muted)', fontSize: '0.75rem' }}>
          <div style={{ marginBottom: 8 }}>
            Powered by <span style={{ color: 'var(--t-text)', fontWeight: 600 }}>Captura</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--t-muted)', lineHeight: 1.5 }}>
            By scanning this code, approximate location data may be collected to improve your experience.{' '}
            <a href="/privacy" target="_blank" style={{ color: 'var(--t-muted)', textDecoration: 'underline' }}>Privacy Policy</a>
          </div>
        </div>
      </div>

      {/* STICKY BAR - bottom of viewport */}
      {showStickyBar && !captured && !formMode && cta && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
          background: 'var(--t-accent)', color: 'var(--t-accent-ink)',
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          maxWidth: 480, margin: '0 auto',
        }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
              {activePromo?.active ? activePromo.title : 'Join the list'}
            </div>
            {countdown && (
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{countdown}</div>
            )}
          </div>
          <button onClick={() => { setFormMode(cta.formMode); setFormSubmitted(false) }} style={{
            background: 'var(--t-accent-ink)', color: 'var(--t-accent)',
            border: 'none', borderRadius: 'var(--t-radius)',
            padding: '8px 20px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
          }}>
            {activePromo?.active ? 'Enter' : 'Join'}
          </button>
        </div>
      )}
    </div>
  )
}
