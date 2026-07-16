import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getKit } from '../lib/kits'

function getYouTubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match ? match[1] : null
}

export default function ScanPage({ previewData } = {}) {
  // Supports three URL shapes:
  //   /s/:qrId             — legacy short_id lookup
  //   /01/:gtin/21/:serial — GS1 Digital Link with serialized unit tracking
  //   /01/:gtin            — GS1 Digital Link, product-level (static GTIN)
  const { qrId, gtin, serial } = useParams()
  const [product, setProduct] = useState(previewData?.product || null)
  const [qrCode, setQrCode] = useState(null)
  const [brand, setBrand] = useState(previewData?.brand || null)
  const [location, setLocation] = useState(null)
  const locationRef = useRef(null)
  const [showVIP, setShowVIP] = useState(false)
  const [vipForm, setVipForm] = useState({ firstName: '', lastName: '', email: '', phone: '', consent: false })
  const [vipSubmitted, setVipSubmitted] = useState(false)
  const [loading, setLoading] = useState(!previewData)
  const [notFound, setNotFound] = useState(false)
  const [activePromo, setActivePromo] = useState(previewData?.promo || null)
  const [showPromoEntry, setShowPromoEntry] = useState(false)
  const [promoForm, setPromoForm] = useState({ firstName: '', lastName: '', email: '', phone: '', ageConsent: false, marketingConsent: false })
  const [promoEntered, setPromoEntered] = useState(false)
  const [showWarranty, setShowWarranty] = useState(false)
  const [warrantyForm, setWarrantyForm] = useState({ firstName: '', lastName: '', email: '', phone: '', purchaseDate: '', retailer: '', consent: false })
  const [warrantyRegistered, setWarrantyRegistered] = useState(false)
  const [event, setEvent] = useState(previewData?.event || null)
  const [eventForm, setEventForm] = useState({ firstName: '', lastName: '', email: '', phone: '', ageConsent: false, marketingConsent: false })
  const [eventSubmitted, setEventSubmitted] = useState(false)
  const scanLogged = useRef(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [countdown, setCountdown] = useState('')
  const isPreview = !!previewData
  // V2 serialization: data from lookup_serial RPC when /21/ segment is present
  const [serialData, setSerialData] = useState(null)
  const [showEventForm, setShowEventForm] = useState(false)

  // Keep preview data in sync
  useEffect(() => {
    if (!previewData) return
    setProduct(previewData.product || null)
    setBrand(previewData.brand || null)
    setActivePromo(previewData.promo || null)
    if (previewData.event) setEvent(previewData.event)
  }, [previewData])

  // Countdown timer for promo
  useEffect(() => {
    if (activePromo?.winner_announced_at) { setCountdown(''); return }
    if (!activePromo?.active) { setCountdown(''); return }
    let target = null
    try {
      const now = new Date()
      const start = activePromo.start_at ? new Date(activePromo.start_at) : null
      const end = activePromo.end_at ? new Date(activePromo.end_at) : null
      if (start && end) {
        if (now < start) target = activePromo.start_at
        else if (now >= start && now <= end) target = activePromo.end_at
      }
    } catch { /* ignore */ }
    if (!target) { setCountdown(''); return }
    const calc = () => {
      const diff = Math.max(0, new Date(target) - new Date())
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setCountdown(`${d}d ${h}h ${m}m`)
    }
    calc()
    const id = setInterval(calc, 60000)
    return () => clearInterval(id)
  }, [activePromo])

  // Determine lookup mode
  const lookupShortId = qrId || null  // only /s/:qrId uses short_id lookup
  const lookupGtin = gtin ? gtin.replace(/\D/g, '').padStart(14, '0') : null
  const lookupSerial = serial || null  // /21/ segment → serials table via RPC

  // Fetch location once via Netlify edge geo (free, unlimited, server-side)
  const locationPromise = useRef(null)
  useEffect(() => {
    if (isPreview || locationPromise.current) return
    locationPromise.current = (async () => {
      try {
        const res = await fetch('/.netlify/functions/geo')
        const loc = await res.json()
        if (loc && loc.city) {
          locationRef.current = loc
          setLocation(loc)
          return loc
        }
      } catch { /* geo unavailable */ }
      return null
    })()
  }, [])

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
    let resolvedSerialData = null

    // Path 1: legacy short_id lookup (/s/:qrId only)
    if (lookupShortId) {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*, products(*), promos(*), events(*), brands:brand_id(name, logo_url, logo_dark_url, logo_align, logo_size, accent_hex, accent_ink_hex, kit, social_instagram, social_tiktok, social_twitter, social_facebook, social_youtube, social_website)')
        .eq('short_id', lookupShortId)
        .single()
      if (!error && data) qr = data
    }

    // Path 2: serialized scan (/01/:gtin/21/:serial) — lookup via RPC
    if (!qr && lookupGtin && lookupSerial) {
      const { data: serialResult } = await supabase.rpc('lookup_serial', {
        p_gtin: lookupGtin,
        p_serial_value: lookupSerial,
      })
      if (serialResult && serialResult.length > 0) {
        resolvedSerialData = serialResult[0]
        setSerialData(resolvedSerialData)
        // Serial found — now load the product and QR/brand data using the product_id
      }
      // If serial not found, fall through to static GTIN lookup (bogus serial fallback)
    }

    // Path 3: static GTIN lookup (/01/:gtin with no serial, or bogus serial fallback)
    // Also used after a valid serial lookup to load the QR/brand/promo data
    if (!qr && lookupGtin) {
      const productId = resolvedSerialData?.product_id
      let prod = null

      if (productId) {
        // We already know the product_id from the serial lookup
        const { data } = await supabase.from('products').select('*').eq('id', productId).single()
        prod = data
      } else {
        // Static GTIN lookup (no serial, or bogus serial)
        const { data } = await supabase.from('products').select('*').eq('gtin', lookupGtin).limit(1).single()
        prod = data
      }

      if (prod) {
        // Try to find a QR code for this product so we get promo/event/brand data
        const { data: qrData } = await supabase
          .from('qr_codes')
          .select('*, products(*), promos(*), events(*), brands:brand_id(name, logo_url, logo_dark_url, logo_align, logo_size, accent_hex, accent_ink_hex, kit, social_instagram, social_tiktok, social_twitter, social_facebook, social_youtube, social_website)')
          .eq('product_id', prod.id)
          .limit(1)
          .single()

        if (qrData) {
          qr = qrData
        } else {
          // Product exists but no QR code — show the product directly
          const { data: brandData } = await supabase
            .from('brands')
            .select('name, logo_url, logo_dark_url, logo_align, logo_size, accent_hex, accent_ink_hex, kit, social_instagram, social_tiktok, social_twitter, social_facebook, social_youtube, social_website')
            .eq('id', prod.brand_id)
            .single()
          setProduct(prod)
          setBrand(brandData)
          setLoading(false)
          getLocationAndLogScan(null, resolvedSerialData)
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
        // Check for active promo or most recent winner
        const { data: promoData } = await supabase
          .from('promos')
          .select('*')
          .eq('brand_id', qr.brand_id)
          .or('active.eq.true,winner_announced_at.not.is.null')
          .order('winner_announced_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .single()
        if (promoData) setActivePromo(promoData)
      }
    }

    // Get location, then log scan with it
    getLocationAndLogScan(qr, resolvedSerialData)
  }

  async function getLocationAndLogScan(qr, serialInfo) {
    if (scanLogged.current) return
    scanLogged.current = true

    // Throttle: don't log duplicate scans within 5 minutes
    const throttleKey = qr ? `scan_${qr.short_id}` : `scan_gtin_${lookupGtin}_${lookupSerial || ''}`
    const lastScan = localStorage.getItem(throttleKey)
    if (lastScan && Date.now() - parseInt(lastScan) < 300000) return
    localStorage.setItem(throttleKey, String(Date.now()))

    // Wait for the shared location fetch to finish (won't make a second API call)
    if (locationPromise.current) {
      await locationPromise.current
    }
    const loc = locationRef.current

    const brandId = qr?.brand_id || serialInfo?.brand_id
    if (!brandId) return

    let scanData = {
      qr_code_id: qr?.id || null,
      product_id: qr?.product_id || serialInfo?.product_id || null,
      brand_id: brandId,
      serial_id: serialInfo?.serial_id || null,
      device: getDeviceInfo(),
      user_agent: navigator.userAgent,
    }

    if (loc) {
      scanData.latitude = loc.lat
      scanData.longitude = loc.lng
      scanData.city = `${loc.city}, ${loc.region}`
      scanData.region = loc.region
      scanData.country = loc.country
    }

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

  // V2: upsert contact via RPC and attempt serial claim (if serialized scan)
  async function upsertContactAndClaimSerial(brandId, firstName, email, phone, source, consent) {
    if (!supabase || !email) return
    try {
      const { data: contactId } = await supabase.rpc('get_or_create_contact', {
        p_brand_id: brandId,
        p_first_name: firstName,
        p_email: email,
        p_phone: phone || null,
        p_source: source,
        p_sms_consent: consent || false,
      })
      if (contactId && serialData && lookupGtin) {
        await supabase.rpc('claim_serial', {
          p_serial_value: lookupSerial,
          p_gtin: lookupGtin,
          p_contact_id: contactId,
        })
      }
    } catch (err) {
      // Contact upsert/claim is best-effort, never block the consumer experience
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
        region: location?.region || null,
        country: location?.country || null,
      }).select('id').single()
      logBillingEvent(qrCode.brand_id, vipForm.email, vipForm.phone, 'vip', inserted?.id)
      upsertContactAndClaimSerial(qrCode.brand_id, vipForm.firstName, vipForm.email, vipForm.phone, 'vip', vipForm.consent)
      syncToShopify({
        firstName: vipForm.firstName,
        lastName: vipForm.lastName,
        email: vipForm.email,
        phone: vipForm.phone,
        tags: `captura, vip${serialData?.channel_name ? `, ${serialData.channel_name}` : ''}`,
        note: `VIP signup via Captura QR scan${serialData?.channel_name ? `\nChannel: ${serialData.channel_name}` : ''}`,
        product: product?.name || null,
        serial: lookupSerial || null,
        source: 'VIP Signup',
        city: location?.city ? `${location.city}, ${location.region}` : null,
      })
    }
    setVipSubmitted(true)
  }

  // Build the TCPA consent text for checkbox B (used in form and stored as evidence)
  const brandNameForConsent = brand?.name || 'this brand'
  const marketingConsentText = `I agree to receive recurring marketing texts, emails, and calls from ${brandNameForConsent}, including by automated technology, at the contact info I provided. My information was collected by Captura on behalf of ${brandNameForConsent}. Consent is not a condition of entry or purchase. Msg frequency varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help.`

  const handlePromoEntry = async (e) => {
    e.preventDefault()
    if (isPreview) { setPromoEntered(true); return }
    // Ensure geo/IP is available
    if (locationPromise.current) await locationPromise.current
    const loc = locationRef.current
    if (supabase && activePromo && qrCode) {
      const now = new Date().toISOString()
      const { data: inserted } = await supabase.from('promo_entries').insert({
        promo_id: activePromo.id,
        brand_id: qrCode.brand_id,
        qr_code_id: qrCode.id,
        product_id: qrCode.product_id || null,
        first_name: promoForm.firstName,
        last_name: promoForm.lastName,
        email: promoForm.email,
        phone: promoForm.phone,
        latitude: loc?.lat || null,
        longitude: loc?.lng || null,
        city: loc?.city ? `${loc.city}, ${loc.region}` : null,
        region: loc?.region || null,
        country: loc?.country || null,
        age_attestation: true,
        age_attestation_timestamp: now,
        marketing_consent: promoForm.marketingConsent,
        consent_timestamp: promoForm.marketingConsent ? now : null,
        consent_ip: promoForm.marketingConsent ? (loc?.ip || null) : null,
        consent_text_shown: promoForm.marketingConsent ? marketingConsentText : null,
      }).select('id').single()
      logBillingEvent(qrCode.brand_id, promoForm.email, promoForm.phone, 'promo', inserted?.id)
      upsertContactAndClaimSerial(qrCode.brand_id, promoForm.firstName, promoForm.email, promoForm.phone, 'promo', promoForm.marketingConsent)
      syncToShopify({
        firstName: promoForm.firstName,
        lastName: promoForm.lastName,
        email: promoForm.email,
        phone: promoForm.phone,
        tags: `captura, promo, ${activePromo.title}${serialData?.channel_name ? `, ${serialData.channel_name}` : ''}`,
        note: `Promo entry via Captura - ${activePromo.title}${serialData?.channel_name ? `\nChannel: ${serialData.channel_name}` : ''}`,
        product: product?.name || null,
        serial: lookupSerial || null,
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
        latitude: location?.lat || null,
        longitude: location?.lng || null,
        city: location?.city ? `${location.city}, ${location.region}` : null,
        region: location?.region || null,
        country: location?.country || null,
        consent: warrantyForm.consent,
      }).select('id').single()
      logBillingEvent(qrCode.brand_id, warrantyForm.email, warrantyForm.phone, 'warranty', inserted?.id)
      upsertContactAndClaimSerial(qrCode.brand_id, warrantyForm.firstName, warrantyForm.email, warrantyForm.phone, 'warranty', warrantyForm.consent)
      syncToShopify({
        firstName: warrantyForm.firstName,
        lastName: warrantyForm.lastName,
        email: warrantyForm.email,
        phone: warrantyForm.phone,
        tags: `captura, warranty${serialData?.channel_name ? `, ${serialData.channel_name}` : ''}`,
        note: `Warranty registration via Captura${serialData?.channel_name ? `\nChannel: ${serialData.channel_name}` : ''}`,
        product: product?.name || null,
        serial: lookupSerial || null,
        source: 'Warranty Registration',
        city: location?.city ? `${location.city}, ${location.region}` : null,
      })
    }
    setWarrantyRegistered(true)
  }

  const handleEventSubmit = async (e) => {
    e.preventDefault()
    if (isPreview) { setEventSubmitted(true); return }
    if (locationPromise.current) await locationPromise.current
    const loc = locationRef.current
    if (supabase && event && qrCode) {
      const now = new Date().toISOString()
      const { data: inserted, error: insertErr } = await supabase.from('event_entries').insert({
        event_id: event.id,
        brand_id: qrCode.brand_id,
        qr_code_id: qrCode.id,
        first_name: eventForm.firstName,
        last_name: eventForm.lastName,
        email: eventForm.email,
        phone: eventForm.phone,
        latitude: loc?.lat || null,
        longitude: loc?.lng || null,
        city: loc?.city ? `${loc.city}, ${loc.region}` : null,
        region: loc?.region || null,
        country: loc?.country || null,
        age_attestation: true,
        age_attestation_timestamp: now,
        marketing_consent: eventForm.marketingConsent,
        consent_timestamp: eventForm.marketingConsent ? now : null,
        consent_ip: eventForm.marketingConsent ? (loc?.ip || null) : null,
        consent_text_shown: eventForm.marketingConsent ? marketingConsentText : null,
      }).select('id').single()
      logBillingEvent(qrCode.brand_id, eventForm.email, eventForm.phone, 'event', inserted?.id)
      upsertContactAndClaimSerial(qrCode.brand_id, eventForm.firstName, eventForm.email, eventForm.phone, 'event', eventForm.marketingConsent)
      syncToShopify({
        firstName: eventForm.firstName,
        lastName: eventForm.lastName,
        email: eventForm.email,
        phone: eventForm.phone,
        tags: `captura, event, ${event.name}${serialData?.channel_name ? `, ${serialData.channel_name}` : ''}`,
        note: `Event signup via Captura - ${event.name}${event.giveaway ? ` - Giveaway: ${event.giveaway}` : ''}${serialData?.channel_name ? `\nChannel: ${serialData.channel_name}` : ''}`,
        product: null,
        serial: null,
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

  // Brand tokens
  const kit = getKit(brand?.kit)
  const accentBg = brand?.accent_hex || '#FAFAFA'
  const accentInk = brand?.accent_ink_hex || '#09090B'
  const tokenVars = { '--scan-bg': kit.bg, '--scan-card': kit.card, '--scan-border': kit.border }
  const btnStyle = { background: accentBg, color: accentInk }

  // Derive promo state safely (winner only shown in utility tile, not here)
  const promoState = (() => {
    if (!activePromo?.active) return 'evergreen'
    try {
      const now = new Date()
      const start = activePromo.start_at ? new Date(activePromo.start_at) : null
      const end = activePromo.end_at ? new Date(activePromo.end_at) : null
      if (!start || !end) return 'live'
      if (now < start) return 'scheduled'
      if (now >= start && now <= end) return 'live'
      return 'closed'
    } catch { return 'evergreen' }
  })()

  // Giveaway tile config
  const promoConfig = (() => {
    switch (promoState) {
      case 'live': return { pill: 'Live now', dot: true, h: activePromo.title, sub: activePromo.description || (activePromo.prize ? `Prize: ${activePromo.prize}` : ''), showCountdown: true, countdownTarget: activePromo.end_at, cta: 'Enter to win', formAction: () => setShowPromoEntry(true) }
      case 'scheduled': return { pill: 'Next drop', dot: false, h: activePromo.title, sub: activePromo.prize ? `Prize: ${activePromo.prize}` : '', showCountdown: true, countdownTarget: activePromo.start_at, cta: 'Get the alert', formAction: () => setShowPromoEntry(true) }
      case 'closed': return { pill: 'Entries closed', dot: false, h: activePromo.title, sub: 'Winner drawn soon', showCountdown: false, countdownTarget: null, cta: 'Get notified', formAction: () => setShowPromoEntry(true) }
      default: return { pill: 'This month', dot: true, h: 'Win the Monthly Gear Drop', sub: 'Gloves, grips, and a bag.', showCountdown: false, countdownTarget: null, cta: 'Enter free', formAction: () => setShowPromoEntry(true) }
    }
  })()

  const hasPromoImage = activePromo?.image_url && promoState !== 'evergreen'

  // Utility tiles
  const utilTiles = []
  if (product?.reorder_url) utilTiles.push({ type: 'reorder', label: 'Reorder', sub: 'Buy again', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>', href: product.reorder_url })
  if (product?.warranty_enabled) {
    utilTiles.push({ type: 'warranty', label: 'Warranty', sub: 'Register', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>', action: () => setShowWarranty(true) })
  }
  if (activePromo?.winner_name) {
    utilTiles.push({ type: 'winner', winnerName: `${activePromo.winner_name}${activePromo.winner_city ? ' \u00B7 ' + activePromo.winner_city : ''}`, sub: 'Won the last drop' })
  }

  // Token CSS vars matching reference
  const t = {
    '--accent': accentBg,
    '--accent-ink': accentInk,
    '--surface': kit.bg,
    '--tile': kit.card,
    '--ink': '#fff',
    '--ink2': 'rgba(255,255,255,0.56)',
    '--line': 'rgba(255,255,255,0.11)',
    '--r': '14px',
  }

  // Event scan page
  if (isEventQR) {
    const eventBg = event.image_url
      ? { backgroundImage: `url(${event.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { background: 'linear-gradient(165deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }

    const eventSocials = brand ? [
      { key: 'social_instagram', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>' },
      { key: 'social_tiktok', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13a8.28 8.28 0 005.58 2.15V11.7a4.79 4.79 0 01-3.77-1.85V6.69h3.77z"/></svg>' },
      { key: 'social_twitter', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
      { key: 'social_facebook', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' },
      { key: 'social_youtube', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' },
      { key: 'social_website', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>' },
    ].filter(s => brand[s.key]) : []

    return (
      <div style={{ height: isPreview ? 580 : '100vh', minHeight: isPreview ? 580 : '100vh', maxWidth: 480, margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
        <style>{`
          @keyframes ev-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
          @keyframes ev-slide-up{from{transform:translateY(100%)}to{transform:translateY(0)}}
          @keyframes ev-fade-in{from{opacity:0}to{opacity:1}}
        `}</style>

        {/* Full-bleed background */}
        <div style={{
          ...eventBg,
          height: '100%', width: '100%', position: 'relative',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Dark overlay for readability */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.6) 75%, rgba(0,0,0,0.85) 100%)',
          }} />

          {/* Content layer */}
          <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Brand header bar */}
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: (event.logo_align || 'center') === 'center' ? 'center' : (event.logo_align === 'right' ? 'flex-end' : 'flex-start'),
              padding: '16px 20px',
            }}>
              {(event.logo_url || brand?.logo_dark_url || brand?.logo_url) && (
                <img src={event.logo_url || brand.logo_dark_url || brand.logo_url} alt={brand?.name} style={{
                  height: event.logo_size || 48, objectFit: 'contain',
                }} />
              )}
            </div>

            {/* Spacer pushes content to bottom */}
            <div style={{ flex: 1 }} />

            {/* Bottom content area */}
            <div style={{ padding: '0 24px 40px' }}>

              {/* Event title large */}
              <h1 style={{
                fontSize: '2.2rem', fontWeight: 800, color: '#fff', lineHeight: 1.15,
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                marginBottom: 8,
              }}>{event.name}</h1>

              {event.description && (
                <p style={{
                  color: 'rgba(255,255,255,0.8)', fontSize: '1rem', lineHeight: 1.5,
                  marginBottom: 16, textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                }}>{event.description}</p>
              )}

              {/* Giveaway badge */}
              {event.giveaway && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 100, padding: '8px 16px', marginBottom: 24,
                }}>
                  <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>{event.giveaway}</span>
                </div>
              )}

              {/* CTA Button */}
              {!eventSubmitted ? (
                <button
                  onClick={() => setShowEventForm(true)}
                  style={{
                    width: '100%', padding: '18px 24px',
                    background: accentBg, color: accentInk,
                    border: 'none', borderRadius: 14, cursor: 'pointer',
                    fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.01em',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                    animation: 'ev-pulse 2.5s ease-in-out infinite',
                  }}
                >
                  {event.giveaway ? 'Enter to Win' : 'Sign Up'}
                </button>
              ) : (
                <div style={{
                  textAlign: 'center', padding: '20px 24px',
                  background: 'rgba(34, 197, 94, 0.2)', backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  borderRadius: 14,
                }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4ade80', marginBottom: 4 }}>
                    You're In!
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
                    {event.giveaway
                      ? `Good luck, ${eventForm.firstName}! We'll contact winners directly.`
                      : `Thanks for signing up, ${eventForm.firstName}!`}
                  </p>
                </div>
              )}

              {/* Socials row */}
              {eventSocials.length > 0 && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
                  {eventSocials.map(s => (
                    <a key={s.key} href={brand[s.key]} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff', textDecoration: 'none',
                      }}>
                      <span style={{ width: 18, height: 18 }} dangerouslySetInnerHTML={{ __html: s.svg }} />
                    </a>
                  ))}
                </div>
              )}

              <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>
                Powered by <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Captura</span>
                {' '}&middot;{' '}
                <a href="/privacy" target="_blank" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'underline' }}>Privacy</a>
              </div>
            </div>
          </div>
        </div>

        {/* Slide-up form modal */}
        {showEventForm && !eventSubmitted && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          }}>
            {/* Backdrop */}
            <div
              onClick={() => setShowEventForm(false)}
              style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                animation: 'ev-fade-in 0.2s ease-out',
              }}
            />
            {/* Form panel */}
            <div style={{
              position: 'relative', zIndex: 51,
              background: '#18181B', borderRadius: '24px 24px 0 0',
              padding: '8px 24px 40px', maxHeight: '85vh', overflowY: 'auto',
              animation: 'ev-slide-up 0.3s ease-out',
            }}>
              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 16px' }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: '#3F3F46' }} />
              </div>

              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 4, color: '#FAFAFA' }}>
                {event.giveaway ? 'Enter to Win' : 'Sign Up'}
              </h3>
              <p style={{ color: '#A1A1AA', fontSize: '0.9rem', marginBottom: 20, lineHeight: 1.5 }}>
                {event.giveaway ? `Win: ${event.giveaway}` : 'Sign up to stay connected.'}
              </p>

              <form onSubmit={handleEventSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input className="input" placeholder="First Name" value={eventForm.firstName}
                    onChange={e => setEventForm({ ...eventForm, firstName: e.target.value })} required
                    style={{ background: '#27272A', border: '1px solid #3F3F46', color: '#FAFAFA' }} />
                  <input className="input" placeholder="Last Name" value={eventForm.lastName}
                    onChange={e => setEventForm({ ...eventForm, lastName: e.target.value })} required
                    style={{ background: '#27272A', border: '1px solid #3F3F46', color: '#FAFAFA' }} />
                </div>
                <input className="input" type="email" placeholder="Email" value={eventForm.email}
                  onChange={e => setEventForm({ ...eventForm, email: e.target.value })}
                  style={{ background: '#27272A', border: '1px solid #3F3F46', color: '#FAFAFA' }} />
                <input className="input" type="tel" placeholder="Phone Number" value={eventForm.phone}
                  onChange={e => setEventForm({ ...eventForm, phone: e.target.value })} required
                  style={{ background: '#27272A', border: '1px solid #3F3F46', color: '#FAFAFA' }} />
                {/* Checkbox A: Age + Rules (required) */}
                <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={eventForm.ageConsent} required
                    onChange={e => setEventForm({ ...eventForm, ageConsent: e.target.checked })}
                    style={{ marginTop: 3, accentColor: accentBg }} />
                  <span style={{ color: '#71717A', fontSize: '0.7rem', lineHeight: 1.5 }}>
                    I am 18 or older and agree to the <a href={`/rules/${event.id || ''}`} target="_blank" style={{ color: '#A1A1AA', textDecoration: 'underline' }}>Official Rules</a> and <a href="/privacy" target="_blank" style={{ color: '#A1A1AA', textDecoration: 'underline' }}>Privacy Policy</a>. No purchase necessary.
                  </span>
                </label>
                {/* Checkbox B: Marketing opt-in (optional) */}
                <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={eventForm.marketingConsent}
                    onChange={e => setEventForm({ ...eventForm, marketingConsent: e.target.checked })}
                    style={{ marginTop: 3, accentColor: accentBg }} />
                  <span style={{ color: '#71717A', fontSize: '0.65rem', lineHeight: 1.5 }}>
                    {marketingConsentText}
                  </span>
                </label>
                <button type="submit" style={{
                  width: '100%', padding: '16px 24px',
                  background: accentBg, color: accentInk,
                  border: 'none', borderRadius: 12, cursor: 'pointer',
                  fontSize: '1rem', fontWeight: 700, marginTop: 4,
                }}>
                  {event.giveaway ? 'Enter to Win' : 'Sign Up'}
                </button>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem', lineHeight: 1.5, textAlign: 'center', margin: '-4px 0 0' }}>
                  Entry gives you 1 giveaway entry in exchange for your contact information. See our Notice of Financial Incentive in the <a href="/privacy" target="_blank" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'underline' }}>Privacy Policy</a>. You may withdraw at any time by replying STOP or emailing privacy@meetcaptura.com.
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', maxWidth: 480, margin: '0 auto', background: 'var(--surface)', color: 'var(--ink)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5, ...t }}>
      <style>{`@keyframes captura-pulse{0%,100%{opacity:1}50%{opacity:.25}}@keyframes captura-slide-up{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

      {/* 1. BRAND BAR */}
      {(brand?.logo_dark_url || brand?.logo_url) && (
        <div style={{
          background: 'var(--accent)', color: 'var(--accent-ink)',
          height: 46, display: 'flex', alignItems: 'center',
          padding: '0 14px', position: 'sticky', top: 0, zIndex: 6,
          justifyContent: brand?.logo_align === 'center' ? 'center' : brand?.logo_align === 'right' ? 'flex-end' : 'flex-start',
        }}>
          <img src={brand.logo_dark_url || brand.logo_url} alt={brand.name} style={{
            height: Math.round(46 * (brand?.logo_size || 70) / 100), objectFit: 'contain',
          }} />
        </div>
      )}

      {/* 2. PRODUCT HEADER */}
      {!isPromoOnly && product && (
        <div style={{ display: 'grid', gridTemplateColumns: '116px 1fr', gap: 14, alignItems: 'center', padding: '14px 14px 10px' }}>
          <div style={{
            aspectRatio: '1', background: 'var(--tile)', borderRadius: 'var(--r)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            {product.image_urls?.[0] ? (
              <img src={product.image_urls[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: 'var(--ink2)', fontSize: 11 }}>No image</span>
            )}
          </div>
          <div>
            <h2 style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', fontSize: 21, lineHeight: 1.1, margin: '0 0 3px', color: 'var(--ink)' }}>
              {product.name}
            </h2>
          </div>
        </div>
      )}

      {/* 3. BENTO GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 84, gap: 9, padding: '2px 14px 16px' }}>

        {/* a) GIVEAWAY TILE */}
        <div onClick={promoConfig.formAction} style={{
          gridColumn: 'span 4', gridRow: 'span 2',
          background: 'var(--tile)', border: '1px solid var(--line)', borderRadius: 'var(--r)',
          position: 'relative', overflow: 'hidden', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 13,
        }}>
          {hasPromoImage && (
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${activePromo.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.82) 100%)' }} />

          <span style={{
            alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'var(--accent)', color: 'var(--accent-ink)',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '8.5px',
            letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500,
            padding: '3px 7px', borderRadius: 3, marginBottom: 'auto',
            position: 'relative', zIndex: 1,
          }}>
            {promoConfig.dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-ink)', animation: 'captura-pulse 1.6s infinite' }} />}
            {promoConfig.pill}
          </span>

          <h3 style={{
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em',
            fontSize: 20, lineHeight: 1.08, margin: '8px 0 2px', color: '#fff',
            position: 'relative', zIndex: 1,
          }}>
            {promoConfig.h}
          </h3>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, position: 'relative', zIndex: 1 }}>
            <div>
              {promoConfig.sub && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.74)', margin: 0 }}>{promoConfig.sub}</p>}
            </div>
            <button onClick={e => { e.stopPropagation(); promoConfig.formAction() }} style={{
              flex: 'none', border: 'none', cursor: 'pointer',
              background: 'var(--accent)', color: 'var(--accent-ink)',
              borderRadius: 9, padding: '12px 20px',
              fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
            }}>
              {promoConfig.cta}
            </button>
          </div>
        </div>

        {/* b) VIDEO TILE */}
        {!isPromoOnly && product?.content_url && getYouTubeId(product.content_url) && (
          <div style={{
            gridColumn: 'span 4', gridRow: 'span 2',
            background: 'var(--tile)', border: '1px solid var(--line)', borderRadius: 'var(--r)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <iframe
                src={`https://www.youtube.com/embed/${getYouTubeId(product.content_url)}?playsinline=1`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* c) UTILITY TILES */}
        {utilTiles.map((tile, i) => {
          const spanClass = utilTiles.length === 1 ? 4 : 2
          if (tile.type === 'winner') {
            return (
              <div key={i} style={{
                gridColumn: `span ${spanClass}`,
                background: 'var(--tile)', border: '1px solid var(--line)', borderRadius: 'var(--r)',
                position: 'relative', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10px 11px',
              }}>
                <span style={{
                  alignSelf: 'flex-start',
                  border: '1px solid var(--accent)', color: 'var(--accent)',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
                  letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500,
                  padding: '2px 6px', borderRadius: 3, marginBottom: 'auto',
                }}>Last winner</span>
                <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2, color: 'var(--ink)' }}>
                  {tile.winnerName}
                  <small style={{ display: 'block', fontWeight: 400, fontSize: '9.5px', color: 'var(--ink2)', marginTop: 1 }}>{tile.sub}</small>
                </span>
              </div>
            )
          }
          return (
            <div key={i} onClick={() => tile.href ? window.open(tile.href, '_blank') : tile.action?.()} style={{
              gridColumn: `span ${spanClass}`,
              background: 'var(--tile)', border: '1px solid var(--line)', borderRadius: 'var(--r)',
              position: 'relative', overflow: 'hidden', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10px 11px',
              transition: 'border-color 0.14s',
            }}>
              <span style={{ width: 20, height: 20, marginBottom: 'auto', color: 'var(--accent)' }} dangerouslySetInnerHTML={{ __html: tile.icon }} />
              <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.15, color: 'var(--ink)' }}>
                {tile.label}
                <small style={{ display: 'block', fontWeight: 400, fontSize: '9.5px', color: 'var(--ink2)', marginTop: 1 }}>{tile.sub}</small>
              </span>
            </div>
          )
        })}
      </div>

      {/* FORMS */}
      <div style={{ padding: '0 14px' }}>

        {/* Promo entered confirmation (inline) */}
        {promoEntered && (
          <div style={{ textAlign: 'center', padding: 28, marginBottom: 20, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)', borderRadius: 'var(--r)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>You're Entered!</h3>
            <p style={{ color: 'var(--ink2)', fontSize: '0.9rem' }}>Good luck, {promoForm.firstName}! We'll contact winners directly.</p>
          </div>
        )}

        {/* VIP form */}
        {showVIP && !vipSubmitted && (
          <div style={{ paddingBottom: 20 }}>
            <form onSubmit={handleVIPSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>Join VIP</h3>
              <input className="input" placeholder="First Name" value={vipForm.firstName} onChange={e => setVipForm({ ...vipForm, firstName: e.target.value })} required />
              <input className="input" placeholder="Last Name" value={vipForm.lastName} onChange={e => setVipForm({ ...vipForm, lastName: e.target.value })} required />
              <input className="input" type="email" placeholder="Email" value={vipForm.email} onChange={e => setVipForm({ ...vipForm, email: e.target.value })} />
              <input className="input" type="tel" placeholder="Phone Number" value={vipForm.phone} onChange={e => setVipForm({ ...vipForm, phone: e.target.value })} required />
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={vipForm.consent} required onChange={e => setVipForm({ ...vipForm, consent: e.target.checked })} style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
                <span style={{ color: 'var(--ink2)', fontSize: '0.75rem', lineHeight: 1.5 }}>
                  I am 18 years or older and agree to receive communications from this brand via text, email, or phone. I understand my data will be used in accordance with the <a href="/privacy" target="_blank" style={{ color: 'var(--ink2)', textDecoration: 'underline' }}>Privacy Policy</a>. Message and data rates may apply. Reply STOP to opt out.
                </span>
              </label>
              <button type="submit" style={{ width: '100%', padding: 14, ...btnStyle, border: 'none', borderRadius: 'var(--r)', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Join VIP List</button>
            </form>
          </div>
        )}
        {vipSubmitted && (
          <div style={{ textAlign: 'center', padding: 28, marginBottom: 20, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)', borderRadius: 'var(--r)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>You're In!</h3>
            <p style={{ color: 'var(--ink2)', fontSize: '0.9rem' }}>Welcome to the VIP list, {vipForm.firstName}. We'll be in touch soon.</p>
          </div>
        )}

        {/* Warranty form */}
        {showWarranty && !warrantyRegistered && (
          <div style={{ paddingBottom: 20 }}>
            <form onSubmit={handleWarrantySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)' }}>Warranty Registration</h3>
              <input className="input" placeholder="First Name" value={warrantyForm.firstName} onChange={e => setWarrantyForm({ ...warrantyForm, firstName: e.target.value })} required />
              <input className="input" placeholder="Last Name" value={warrantyForm.lastName} onChange={e => setWarrantyForm({ ...warrantyForm, lastName: e.target.value })} required />
              <input className="input" type="email" placeholder="Email" value={warrantyForm.email} onChange={e => setWarrantyForm({ ...warrantyForm, email: e.target.value })} />
              <input className="input" type="tel" placeholder="Phone Number" value={warrantyForm.phone} onChange={e => setWarrantyForm({ ...warrantyForm, phone: e.target.value })} required />
              <input className="input" type="date" value={warrantyForm.purchaseDate} onChange={e => setWarrantyForm({ ...warrantyForm, purchaseDate: e.target.value })} style={{ colorScheme: 'dark' }} />
              <input className="input" placeholder="Where did you purchase? (store name)" value={warrantyForm.retailer} onChange={e => setWarrantyForm({ ...warrantyForm, retailer: e.target.value })} />
              {product?.warranty_terms && (
                <div style={{ padding: 12, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--line)', fontSize: '0.8rem', color: 'var(--ink2)', lineHeight: 1.6, maxHeight: 120, overflow: 'auto' }}>
                  {product.warranty_terms}
                </div>
              )}
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={warrantyForm.consent} required onChange={e => setWarrantyForm({ ...warrantyForm, consent: e.target.checked })} style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
                <span style={{ color: 'var(--ink2)', fontSize: '0.75rem', lineHeight: 1.5 }}>
                  I am 18 years or older and agree to the warranty terms. I consent to receiving communications about my warranty and product updates. <a href="/privacy" target="_blank" style={{ color: 'var(--ink2)', textDecoration: 'underline' }}>Privacy Policy</a>
                </span>
              </label>
              <button type="submit" style={{ width: '100%', padding: 14, ...btnStyle, border: 'none', borderRadius: 'var(--r)', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Register Warranty</button>
            </form>
          </div>
        )}
        {warrantyRegistered && (
          <div style={{ textAlign: 'center', padding: 28, marginBottom: 20, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)', borderRadius: 'var(--r)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>Warranty Registered</h3>
            <p style={{ color: 'var(--ink2)', fontSize: '0.9rem' }}>Your {product?.warranty_duration || ''} warranty is now active, {warrantyForm.firstName}.</p>
          </div>
        )}
      </div>

      {/* 4. CONTENT */}
      {!isPromoOnly && product?.description && (
        <div style={{ padding: '16px 14px', borderTop: '1px solid var(--line)' }}>
          <h4 style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', fontSize: 13, margin: '0 0 7px', color: 'var(--ink)' }}>About this product</h4>
          <p style={{
            color: 'var(--ink2)', fontSize: 13, margin: 0, lineHeight: 1.5, whiteSpace: 'pre-line',
            ...(descExpanded ? {} : { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
          }}>
            {product.description}
          </p>
          <button onClick={() => setDescExpanded(!descExpanded)} style={{
            background: 'none', border: 'none', padding: '5px 0 0', color: 'var(--accent)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          }}>
            {descExpanded ? 'Read less' : 'Read more'}
          </button>
          {product.features?.length > 0 && (
            <ul style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', margin: '14px 0 0', padding: 0, listStyle: 'none' }}>
              {product.features.map((f, i) => (
                <li key={i} style={{ fontSize: '11.5px', color: 'var(--ink2)', paddingLeft: 11, position: 'relative', lineHeight: 1.4 }}>
                  <span style={{ position: 'absolute', left: 0, top: 6, width: 4, height: 4, background: 'var(--accent)', borderRadius: 1 }} />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 5. SOCIALS */}
      {brand && (() => {
        const socials = [
          { key: 'social_instagram', label: 'IG', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>' },
          { key: 'social_tiktok', label: 'TT', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13a8.28 8.28 0 005.58 2.15V11.7a4.79 4.79 0 01-3.77-1.85V6.69h3.77z"/></svg>' },
          { key: 'social_twitter', label: 'X', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
          { key: 'social_facebook', label: 'FB', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' },
          { key: 'social_youtube', label: 'YT', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' },
          { key: 'social_website', label: 'Web', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>' },
        ].filter(s => brand[s.key])
        if (socials.length === 0) return null
        return (
          <div style={{ padding: '6px 14px 14px' }}>
            <h5 style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, margin: '10px 0 12px', color: 'var(--ink)' }}>Follow Us</h5>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              {socials.map(s => (
                <a key={s.key} href={brand[s.key]} target="_blank" rel="noopener noreferrer"
                  style={{
                    width: 40, height: 40, border: '1px solid var(--line)', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--tile)', color: 'var(--ink2)', textDecoration: 'none',
                  }}>
                  <span style={{ width: 18, height: 18 }} dangerouslySetInnerHTML={{ __html: s.svg }} />
                </a>
              ))}
            </div>
          </div>
        )
      })()}

      {/* 6. FOOTER */}
      <div style={{ padding: '14px 14px 22px', borderTop: '1px solid var(--line)', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'var(--ink2)', margin: '0 0 4px' }}>Powered by <b style={{ color: 'var(--ink)' }}>Captura</b></p>
        <p style={{ fontSize: 9, color: 'var(--ink2)', opacity: 0.7, margin: 0 }}>
          Approximate location may be collected to improve this experience.{' '}
          <a href="/privacy" target="_blank" style={{ color: 'var(--ink2)', textDecoration: 'underline' }}>Privacy Policy</a>
        </p>
      </div>

      {/* PROMO ENTRY MODAL */}
      {showPromoEntry && !promoEntered && (
        <div onClick={() => setShowPromoEntry(false)} style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 480,
            background: 'var(--tile, #18181B)', border: '1px solid var(--line, rgba(255,255,255,0.11))',
            borderRadius: '18px 18px 0 0', padding: '24px 20px 32px',
            animation: 'captura-slide-up 0.25s ease-out',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 20px' }} />
            <form onSubmit={handlePromoEntry} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink, #fff)', margin: 0, textAlign: 'center' }}>Enter to Win</h3>
              {activePromo?.title && <p style={{ color: 'var(--ink2, rgba(255,255,255,0.56))', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>{activePromo.title}</p>}
              <input className="input" placeholder="First Name" value={promoForm.firstName} onChange={e => setPromoForm({ ...promoForm, firstName: e.target.value })} required />
              <input className="input" placeholder="Last Name" value={promoForm.lastName} onChange={e => setPromoForm({ ...promoForm, lastName: e.target.value })} required />
              <input className="input" type="email" placeholder="Email" value={promoForm.email} onChange={e => setPromoForm({ ...promoForm, email: e.target.value })} />
              <input className="input" type="tel" placeholder="Phone Number" value={promoForm.phone} onChange={e => setPromoForm({ ...promoForm, phone: e.target.value })} required />
              {/* Checkbox A: Age + Rules (required) */}
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={promoForm.ageConsent} required onChange={e => setPromoForm({ ...promoForm, ageConsent: e.target.checked })} style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
                <span style={{ color: 'var(--ink2, rgba(255,255,255,0.56))', fontSize: '0.75rem', lineHeight: 1.5 }}>
                  I am 18 or older and agree to the <a href={`/rules/${activePromo?.id || ''}`} target="_blank" style={{ color: 'var(--ink2)', textDecoration: 'underline' }}>Official Rules</a> and <a href="/privacy" target="_blank" style={{ color: 'var(--ink2)', textDecoration: 'underline' }}>Privacy Policy</a>. No purchase necessary.
                </span>
              </label>
              {!promoForm.ageConsent && promoForm.firstName && (
                <p style={{ color: '#ef4444', fontSize: '0.7rem', margin: '-8px 0 0', lineHeight: 1.4 }}>Please confirm you're 18+ and agree to the rules.</p>
              )}
              {/* Checkbox B: Marketing opt-in (optional) */}
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input type="checkbox" checked={promoForm.marketingConsent} onChange={e => setPromoForm({ ...promoForm, marketingConsent: e.target.checked })} style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
                <span style={{ color: 'var(--ink2, rgba(255,255,255,0.56))', fontSize: '0.7rem', lineHeight: 1.5 }}>
                  {marketingConsentText}
                </span>
              </label>
              <button type="submit" style={{ width: '100%', padding: 14, ...btnStyle, border: 'none', borderRadius: 'var(--r, 14px)', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Enter to Win</button>
              <p style={{ color: 'var(--ink2, rgba(255,255,255,0.36))', fontSize: '0.6rem', lineHeight: 1.5, textAlign: 'center', margin: '-4px 0 0' }}>
                Entry gives you 1 giveaway entry in exchange for your contact information. See our Notice of Financial Incentive in the <a href="/privacy" target="_blank" style={{ color: 'var(--ink2, rgba(255,255,255,0.36))', textDecoration: 'underline' }}>Privacy Policy</a>. You may withdraw at any time by replying STOP or emailing privacy@meetcaptura.com.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
