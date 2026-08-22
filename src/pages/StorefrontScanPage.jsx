import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { supabase } from '../lib/supabase'
import { getKit } from '../lib/kits'

export default function StorefrontScanPage() {
  const { brandId } = useParams()
  const [searchParams] = useSearchParams()
  const isLabelQR = searchParams.get('label') === '1'
  const [brand, setBrand] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [menuImages, setMenuImages] = useState([])
  const [hours, setHours] = useState([])
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Loyalty state
  const [loyaltyRewards, setLoyaltyRewards] = useState([])
  const [loyaltyState, setLoyaltyState] = useState(null)
  const [loyaltyForm, setLoyaltyForm] = useState({ firstName: '', lastName: '', email: '', phone: '', marketingConsent: false })
  const [loyaltyLookupMode, setLoyaltyLookupMode] = useState(false)
  const [loyaltyLookupEmail, setLoyaltyLookupEmail] = useState('')
  const [loyaltyLookupError, setLoyaltyLookupError] = useState('')
  const [loyaltySubmitting, setLoyaltySubmitting] = useState(false)
  const [showLoyalty, setShowLoyalty] = useState(false)
  const [loyaltyRedeemed, setLoyaltyRedeemed] = useState(null)
  const [redemptionProof, setRedemptionProof] = useState(null)
  const [proofClock, setProofClock] = useState(null)
  const [thresholdCelebration, setThresholdCelebration] = useState(null)

  // Menu expanded
  const [showMenu, setShowMenu] = useState(false)
  const [menuCategory, setMenuCategory] = useState('all')
  const [showHours, setShowHours] = useState(false)
  const [showLocations, setShowLocations] = useState(false)
  const [locations, setLocations] = useState([])

  // Promo form
  const [showPromo, setShowPromo] = useState(false)
  const [promoForm, setPromoForm] = useState({ firstName: '', lastName: '', email: '', phone: '', ageConsent: false, marketingConsent: false })
  const [promoSubmitting, setPromoSubmitting] = useState(false)
  const [promoSubmitted, setPromoSubmitted] = useState(false)

  const scanLogged = useRef(false)
  const proofTimerRef = useRef(null)

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Live clock for redemption proof
  useEffect(() => {
    if (!redemptionProof) return
    const tick = setInterval(() => setProofClock(new Date()), 1000)
    // Auto-dismiss after 5 minutes
    proofTimerRef.current = setTimeout(() => {
      setRedemptionProof(null)
      setProofClock(null)
      setShowLoyalty(false)
    }, 5 * 60 * 1000)
    return () => { clearInterval(tick); clearTimeout(proofTimerRef.current) }
  }, [redemptionProof])

  // Check threshold crossing after loyalty state changes
  function checkThresholdCrossing(result, rewards) {
    if (!result?.awarded || !rewards?.length) return null
    const prevBal = result.previous_balance ?? 0
    const newBal = result.balance ?? 0
    const crossed = rewards.find(r => newBal >= r.points_required && prevBal < r.points_required)
    return crossed || null
  }

  // Trigger reward-earned email server-side
  async function triggerRewardEmail(contactId, brandIdVal, rewardId, balance) {
    try {
      await fetch('/.netlify/functions/send-reward-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId, brand_id: brandIdVal, reward_id: rewardId, balance }),
      })
    } catch (e) { /* fire and forget */ }
  }

  // Trigger welcome email server-side (first join only)
  async function triggerWelcomeEmail(contactId, brandIdVal) {
    try {
      await fetch('/.netlify/functions/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId, brand_id: brandIdVal }),
      })
    } catch (e) { /* fire and forget */ }
  }

  useEffect(() => {
    loadStorefront()
  }, [brandId])

  async function loadStorefront() {
    if (!supabase || !brandId) { setNotFound(true); setLoading(false); return }

    // Load brand
    const { data: brandData } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .eq('business_type', 'storefront')
      .single()

    if (!brandData) { setNotFound(true); setLoading(false); return }
    setBrand(brandData)

    // Load menu, hours, promos, loyalty rewards in parallel
    const [menuRes, hoursRes, promosRes, rewardsRes, locationsRes, menuImagesRes] = await Promise.all([
      supabase.from('menu_items').select('*').eq('brand_id', brandId).eq('active', true).order('category').order('sort_order').order('name'),
      supabase.from('store_hours').select('*').eq('brand_id', brandId).order('day_of_week'),
      supabase.from('promos').select('*').eq('brand_id', brandId).or('active.eq.true,winner_announced_at.not.is.null').order('active', { ascending: false }).order('winner_announced_at', { ascending: false, nullsFirst: false }),
      supabase.from('loyalty_rewards').select('*').eq('brand_id', brandId).eq('active', true).order('points_required'),
      supabase.from('store_locations').select('*').eq('brand_id', brandId).order('sort_order').order('name'),
      supabase.from('menu_images').select('*').eq('brand_id', brandId).order('sort_order').order('created_at'),
    ])

    setMenuItems(menuRes.data || [])
    setHours(hoursRes.data || [])
    setPromos(promosRes.data || [])
    setLoyaltyRewards(rewardsRes.data || [])
    setLocations(locationsRes.data || [])
    setMenuImages(menuImagesRes.data || [])

    // Check for returning loyalty member (skip for label QR codes)
    const savedEmail = localStorage.getItem(`loyalty_email_${brandId}`)
    const savedContactId = localStorage.getItem(`loyalty_contact_${brandId}`)
    if (savedEmail && savedContactId && !isLabelQR) {
      // Award point (no cooldown for storefronts - every visit earns)
      try {
        const { data: result } = await supabase.rpc('award_loyalty_point', {
          p_brand_id: brandId,
          p_contact_id: savedContactId,
          p_product_id: null,
          p_cooldown_hours: brandData.loyalty_cooldown_hours ?? 12,
        })
        if (result) {
          setLoyaltyState({ ...result, returning: true })
          const crossed = checkThresholdCrossing(result, rewardsRes.data)
          if (crossed) {
            setThresholdCelebration(crossed)
            setShowLoyalty(true)
            const savedCid = localStorage.getItem(`loyalty_contact_${brandId}`)
            if (savedCid) triggerRewardEmail(savedCid, brandId, crossed.id, result.balance)
          }
        }
      } catch (err) {
        // Fallback: just get balance
        try {
          const { data: bal } = await supabase.rpc('get_loyalty_balance', {
            p_contact_id: savedContactId,
            p_brand_id: brandId,
          })
          if (bal) setLoyaltyState({ ...bal, returning: true })
        } catch (e) {}
      }
    }

    // Log scan
    if (!scanLogged.current) {
      scanLogged.current = true
      try {
        const geo = await fetch('/.netlify/functions/geo').then(r => r.json()).catch(() => ({}))
        await supabase.from('scans').insert({
          brand_id: brandId,
          latitude: geo.lat || null,
          longitude: geo.lng || null,
          city: geo.city || null,
          region: geo.region || null,
          country: geo.country || null,
          device: /mobile/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          user_agent: navigator.userAgent,
        })
      } catch (e) {}
    }

    setLoading(false)
  }

  const handleLoyaltySubmit = async (e) => {
    e.preventDefault()
    setLoyaltySubmitting(true)
    try {
      const consentTextForLoyalty = `I agree to receive recurring marketing texts, emails, and calls from ${brand?.name || 'this business'}, including by automated technology, at the contact info I provided. My information was collected by MeetCaptura on behalf of ${brand?.name || 'this business'}. Consent is not a condition of purchase. Msg frequency varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help.`
      const { data: contactId, error: contactErr } = await supabase.rpc('get_or_create_contact', {
        p_brand_id: brandId,
        p_first_name: loyaltyForm.firstName,
        p_last_name: loyaltyForm.lastName,
        p_email: loyaltyForm.email,
        p_phone: loyaltyForm.phone || null,
        p_source: 'loyalty',
        p_sms_consent: loyaltyForm.marketingConsent,
        p_sms_consent_at: loyaltyForm.marketingConsent ? new Date().toISOString() : null,
        p_sms_consent_text: loyaltyForm.marketingConsent ? consentTextForLoyalty : null,
      })
      if (contactErr) {
        console.error('Contact RPC error:', contactErr)
        setLoyaltyLookupError('Something went wrong. Please try again.')
        setLoyaltySubmitting(false)
        return
      }
      if (contactId) {
        const { data: result, error: awardErr } = await supabase.rpc('award_loyalty_point', {
          p_brand_id: brandId,
          p_contact_id: contactId,
          p_product_id: null,
          p_cooldown_hours: brand?.loyalty_cooldown_hours ?? 12,
        })
        if (awardErr) {
          console.error('Award RPC error:', awardErr)
        }
        if (result) {
          setLoyaltyState(result)
          const crossed = checkThresholdCrossing(result, loyaltyRewards)
          if (crossed) {
            setThresholdCelebration(crossed)
            triggerRewardEmail(contactId, brandId, crossed.id, result.balance)
          }
          localStorage.setItem(`loyalty_email_${brandId}`, loyaltyForm.email)
          localStorage.setItem(`loyalty_contact_${brandId}`, contactId)
          // Welcome email — first join only, fire and forget
          triggerWelcomeEmail(contactId, brandId)
        }
      }
    } catch (err) {
      console.error('Loyalty error:', err)
      setLoyaltyLookupError('Something went wrong. Please try again.')
    }
    setLoyaltySubmitting(false)
  }

  const handleLoyaltyRedeem = async (reward) => {
    const contactId = localStorage.getItem(`loyalty_contact_${brandId}`)
    if (!contactId) return
    try {
      const { data } = await supabase.rpc('redeem_loyalty_reward', {
        p_contact_id: contactId,
        p_brand_id: brandId,
        p_reward_id: reward.id,
      })
      if (data?.success) {
        setLoyaltyRedeemed(data)
        setLoyaltyState(prev => ({ ...prev, balance: data.new_balance }))
        setThresholdCelebration(null)
        // Show the staff-facing proof screen
        setRedemptionProof({
          rewardName: data.reward_name,
          rewardValue: data.reward_value,
          storeName: brand?.name || 'Store',
          remainingBalance: data.new_balance,
          redeemedAt: new Date(),
        })
        setProofClock(new Date())
      } else {
        const needed = reward.points_required - (loyaltyState?.balance || 0)
        alert(`Not enough points. You have ${loyaltyState?.balance || 0} points, need ${needed} more.`)
      }
    } catch (err) {
      console.error('Redeem error:', err)
    }
  }

  const handleLoyaltyLookup = async (e) => {
    e.preventDefault()
    setLoyaltyLookupError('')
    setLoyaltySubmitting(true)
    // Rate limit through server-side gate
    try {
      const rlRes = await fetch('/.netlify/functions/consumer-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'loyalty', data: { brand_id: brandId, email: loyaltyLookupEmail, _rateCheckOnly: true } }),
      })
      if (rlRes.status === 429) {
        setLoyaltyLookupError('Too many attempts. Please try again in a few minutes.')
        setLoyaltySubmitting(false)
        return
      }
    } catch { /* fail open */ }
    try {
      const { data: member } = await supabase.rpc('lookup_loyalty_member', {
        p_brand_id: brandId,
        p_email: loyaltyLookupEmail,
      })
      if (member?.contact_id) {
        localStorage.setItem(`loyalty_email_${brandId}`, loyaltyLookupEmail)
        localStorage.setItem(`loyalty_contact_${brandId}`, member.contact_id)
        setLoyaltyState({ balance: member.balance, total_earned: member.total_earned, total_redeemed: member.total_redeemed, returning: true })
        setLoyaltyForm(prev => ({ ...prev, email: loyaltyLookupEmail }))
        setLoyaltyLookupMode(false)
        // Auto-award point for this visit (no cooldown for storefronts)
        const { data: awardResult } = await supabase.rpc('award_loyalty_point', {
          p_brand_id: brandId,
          p_contact_id: member.contact_id,
          p_product_id: null,
          p_cooldown_hours: brand?.loyalty_cooldown_hours ?? 12,
        })
        if (awardResult) {
          setLoyaltyState({ ...awardResult, returning: true })
          const crossed = checkThresholdCrossing(awardResult, loyaltyRewards)
          if (crossed) {
            setThresholdCelebration(crossed)
            triggerRewardEmail(member.contact_id, brandId, crossed.id, awardResult.balance)
          }
        }
      } else {
        setLoyaltyLookupError('No membership found for that email. Sign up below to get started.')
        setLoyaltyLookupMode(false)
        setLoyaltyForm(prev => ({ ...prev, email: loyaltyLookupEmail }))
      }
    } catch (err) {
      setLoyaltyLookupError('Something went wrong. Please try again.')
    }
    setLoyaltySubmitting(false)
  }

  const handlePromoSubmit = async (e) => {
    e.preventDefault()
    if (!promoForm.ageConsent) return
    setPromoSubmitting(true)
    const promo = promos.find(p => p.active)
    if (!promo) return

    try {
      // Get geo for consent logging
      const geo = await fetch('/.netlify/functions/geo').then(r => r.json()).catch(() => ({}))
      const consentText = `I am 18+ and agree to the ${brand?.name || 'brand'} giveaway rules. I agree to receive marketing communications from ${brand?.name || 'brand'}.`

      await supabase.from('promo_entries').insert({
        brand_id: brandId,
        promo_id: promo.id,
        first_name: promoForm.firstName,
        last_name: promoForm.lastName,
        email: promoForm.email,
        phone: promoForm.phone || null,
        latitude: geo.latitude || null,
        longitude: geo.longitude || null,
        city: geo.city || null,
        region: geo.region || null,
        country: geo.country || null,
        marketing_consent: promoForm.marketingConsent,
        consent_timestamp: promoForm.marketingConsent ? new Date().toISOString() : null,
        consent_ip: geo.ip || null,
        consent_text_shown: promoForm.marketingConsent ? consentText : null,
        age_attestation: true,
        age_attestation_timestamp: new Date().toISOString(),
      })

      // Upsert contact
      await supabase.rpc('get_or_create_contact', {
        p_brand_id: brandId,
        p_first_name: promoForm.firstName,
        p_last_name: promoForm.lastName,
        p_email: promoForm.email,
        p_phone: promoForm.phone || null,
        p_source: 'promo',
        p_sms_consent: false,
      })

      setPromoSubmitted(true)
    } catch (err) {
      console.error('Promo error:', err)
    }
    setPromoSubmitting(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A', color: '#fff' }}>
        Loading...
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0A', color: '#fff', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Store not found</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>This QR code doesn't link to an active storefront.</div>
      </div>
    )
  }

  const accentBg = brand?.accent_hex || '#FFFFFF'
  const accentInk = brand?.accent_ink_hex || '#000000'
  const kit = getKit(brand?.kit, brand)
  const headerFont = brand?.store_header_font || 'Inter'
  const storeHeaderLogo = brand?.store_header_logo
  const useLogoHeader = brand?.store_header_type === 'logo' && storeHeaderLogo
  const hasLogo = useLogoHeader || brand?.logo_dark_url || brand?.logo_url
  const activePromo = promos.find(p => p.active)
  const winnerPromo = promos.find(p => p.winner_name)
  const menuCategories = [...new Set(menuItems.map(i => i.category))].sort()

  const today = new Date().getDay()
  // Default hours (no location) for the main page display
  const defaultHours = hours.filter(h => !h.location_id)
  const todayHours = defaultHours.find(h => h.day_of_week === today)
  // Per-location hours lookup
  const getLocationHours = (locationId) => {
    const locHours = hours.filter(h => h.location_id === locationId)
    return locHours.length > 0 ? locHours : defaultHours
  }

  // Parse YouTube URL
  const getYouTubeId = (url) => {
    if (!url) return null
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/)
    return match ? match[1] : null
  }
  const videoId = getYouTubeId(brand?.store_video_url)

  const btnStyle = { background: accentBg, color: accentInk }

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

  // Socials
  const socials = brand ? [
    { key: 'social_instagram', label: 'Instagram', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>' },
    { key: 'social_tiktok', label: 'TikTok', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13a8.28 8.28 0 005.58 2.15V11.7a4.79 4.79 0 01-3.77-1.85V6.69h3.77z"/></svg>' },
    { key: 'social_twitter', label: 'X', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
    { key: 'social_facebook', label: 'Facebook', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' },
    { key: 'social_website', label: 'Website', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>' },
  ].filter(s => brand[s.key]) : []

  return (
    <div style={{
      minHeight: '100vh', maxWidth: 480, margin: '0 auto', background: kit.bg, color: '#fff',
      fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, lineHeight: 1.5,
      ...(brand?.kit_bg_image ? { backgroundImage: `url(${brand.kit_bg_image})`, backgroundSize: '390px 844px', backgroundPosition: 'top center', backgroundRepeat: 'no-repeat' } : {}),
      ...t,
    }}>
      <style>{`
        @keyframes captura-pulse{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes captura-slide-up{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes loyaltyPulse{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 12px rgba(34,197,94,0.25)}}
        @keyframes loyaltyDot{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes proofPulse{0%,100%{opacity:1}50%{opacity:.85}}
      `}</style>

      {/* Google Font for header */}
      {!hasLogo && (
        <link href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(headerFont)}:wght@700&display=swap`} rel="stylesheet" />
      )}

      {/* 1. BRAND BAR */}
      <div style={{
        background: accentBg, color: accentInk,
        padding: hasLogo ? '0 14px' : '14px 14px',
        display: 'flex', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 6,
        minHeight: 46,
        justifyContent: brand?.logo_align === 'center' ? 'center' : brand?.logo_align === 'right' ? 'flex-end' : 'flex-start',
      }}>
        {useLogoHeader ? (
          <img src={storeHeaderLogo} alt={brand.name} style={{
            height: Math.round(46 * (brand?.logo_size || 70) / 100), objectFit: 'contain',
          }} />
        ) : hasLogo ? (
          <img src={brand.logo_dark_url || brand.logo_url} alt={brand.name} style={{
            height: Math.round(46 * (brand?.logo_size || 70) / 100), objectFit: 'contain',
          }} />
        ) : (
          <div style={{
            fontFamily: `"${headerFont}", sans-serif`, fontSize: '1.4rem', fontWeight: 700,
            textAlign: brand?.logo_align === 'center' ? 'center' : 'left',
            width: brand?.logo_align === 'center' ? '100%' : 'auto',
          }}>
            {brand.name}
          </div>
        )}
      </div>

      {/* 2. HOURS BAR */}
      {todayHours && (
        <div onClick={() => setShowHours(true)} style={{
          padding: '8px 14px', background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: '0.8rem', cursor: 'pointer',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Today</span>
          <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            {todayHours.closed ? (
              <span style={{ color: '#ef4444' }}>Closed</span>
            ) : (
              <span>{todayHours.open_time && todayHours.close_time
                ? `${formatTime(todayHours.open_time)} - ${formatTime(todayHours.close_time)}`
                : 'Open'}</span>
            )}
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>▶</span>
          </span>
        </div>
      )}

      {/* 3. BENTO GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridAutoRows: 84, gap: 9, padding: '14px 14px 16px' }}>

        {/* a) PROMO TILE */}
        {activePromo && (
          <div onClick={() => { setShowPromo(true); setPromoSubmitted(false) }} style={{
            gridColumn: 'span 4', gridRow: 'span 2',
            background: 'var(--tile)', border: '1px solid var(--line)', borderRadius: 'var(--r)',
            position: 'relative', overflow: 'hidden', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 13,
          }}>
            {activePromo.image_url && (
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${activePromo.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.8) 100%)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                ...btnStyle, marginBottom: 6,
              }}>Enter to Win</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2 }}>{activePromo.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--ink2)', marginTop: 2 }}>
                {activePromo.description || (activePromo.prize ? `Prize: ${activePromo.prize}` : '')}
              </div>
            </div>
          </div>
        )}

        {/* c) VIDEO TILE */}
        {videoId && (
          <div style={{
            gridColumn: 'span 4', gridRow: 'span 2',
            background: 'var(--tile)', border: '1px solid var(--line)', borderRadius: 'var(--r)',
            overflow: 'hidden',
          }}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              style={{ width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* d) UTILITY TILES */}
        {(() => {
          const tiles = []

          // Winner tile
          if (winnerPromo?.winner_name) {
            tiles.push({
              key: 'winner',
              type: 'winner',
              label: `${winnerPromo.winner_name}${winnerPromo.winner_city ? ' \u00B7 ' + winnerPromo.winner_city : ''}`,
              sub: 'Won the last drop',
            })
          }

          // Loyalty tile (hidden on label QR codes)
          const storeLoyaltyHasReward = loyaltyState?.returning && loyaltyRewards.some(r => (loyaltyState.balance || 0) >= r.points_required)
          if (loyaltyRewards.length > 0 && !isLabelQR) {
            tiles.push({
              key: 'loyalty',
              label: redemptionProof ? 'Reward Redeemed' : thresholdCelebration ? `You earned ${thresholdCelebration.name}!` : loyaltyState?.returning ? `${loyaltyState.balance} Points` : 'Loyalty',
              sub: redemptionProof ? 'Show at counter' : thresholdCelebration ? 'Tap to redeem' : storeLoyaltyHasReward ? 'You have a reward ready!' : loyaltyState?.returning ? 'View rewards' : 'Earn points',
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accentBg} strokeWidth="1.8">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              ),
              action: () => setShowLoyalty(true),
              badge: redemptionProof || thresholdCelebration || storeLoyaltyHasReward,
            })
          }

          // Menu tile
          if (menuItems.length > 0 || menuImages.length > 0) {
            tiles.push({
              key: 'menu',
              label: 'Menu',
              sub: 'View menu',
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accentBg} strokeWidth="1.8">
                  <path d="M4 6h16M4 12h16M4 18h12"/>
                </svg>
              ),
              action: () => setShowMenu(true),
            })
          }

          // Hours tile
          if (defaultHours.length > 0) {
            const th = defaultHours.find(h => h.day_of_week === today)
            tiles.push({
              key: 'hours',
              label: th?.closed ? 'Closed Today' : 'Hours',
              sub: th && !th.closed && th.open_time && th.close_time
                ? `${formatTime(th.open_time)} - ${formatTime(th.close_time)}`
                : 'View hours',
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accentBg} strokeWidth="1.8">
                  <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                </svg>
              ),
              action: () => setShowHours(true),
            })
          }

          // Locations tile
          if (locations.length > 0) {
            tiles.push({
              key: 'locations',
              label: locations.length === 1 ? locations[0].name : `${locations.length} Locations`,
              sub: locations.length === 1 ? (locations[0].address ? 'Get directions' : 'View details') : 'View all',
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accentBg} strokeWidth="1.8">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              ),
              action: () => setShowLocations(true),
            })
          }

          // Follow tile (if socials exist)
          if (socials.length > 0) {
            tiles.push({
              key: 'follow',
              label: 'Follow Us',
              sub: socials.map(s => s.label).slice(0, 3).join(', '),
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accentBg} strokeWidth="1.8">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
                </svg>
              ),
              action: () => {
                const el = document.getElementById('captura-socials')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              },
            })
          }

          const span = tiles.length === 1 ? 4 : 2

          return tiles.map(tile => {
            if (tile.type === 'winner') {
              return (
                <div key={tile.key} style={{
                  gridColumn: `span ${span}`, gridRow: 'span 1',
                  background: 'var(--tile)', border: '1px solid var(--line)', borderRadius: 'var(--r)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 14px',
                }}>
                  <span style={{
                    background: 'var(--line)', color: 'var(--ink2)',
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
                    letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500,
                    padding: '2px 6px', borderRadius: 3, marginBottom: 'auto', marginTop: 12,
                    alignSelf: 'flex-start',
                  }}>Last winner</span>
                  <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2, color: 'var(--ink)', marginBottom: 12 }}>
                    {tile.label}
                    <small style={{ display: 'block', fontWeight: 400, fontSize: '9.5px', color: 'var(--ink2)', marginTop: 1 }}>{tile.sub}</small>
                  </span>
                </div>
              )
            }
            return (
              <div key={tile.key} onClick={tile.action} style={{
                gridColumn: `span ${span}`, gridRow: 'span 1',
                background: tile.badge ? `linear-gradient(135deg, var(--tile), rgba(34,197,94,0.12))` : 'var(--tile)',
                border: tile.badge ? '1px solid var(--accent)' : '1px solid var(--line)', borderRadius: 'var(--r)',
                display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
                cursor: tile.action ? 'pointer' : 'default',
                position: 'relative',
                animation: tile.badge ? 'loyaltyPulse 2s ease-in-out infinite' : undefined,
              }}>
                {tile.badge && (
                  <span style={{
                    position: 'absolute', top: 8, right: 8, width: 8, height: 8,
                    borderRadius: '50%', background: 'var(--accent)',
                    boxShadow: `0 0 6px ${accentBg}`,
                    animation: 'loyaltyDot 1.5s ease-in-out infinite',
                  }} />
                )}
                {tile.icon}
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: tile.badge ? 'var(--accent)' : undefined }}>{tile.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--ink2)' }}>{tile.sub}</div>
                </div>
              </div>
            )
          })
        })()}
      </div>

      {/* 4. SOCIALS BAR */}
      {socials.length > 0 && (
        <div id="captura-socials" style={{
          display: 'flex', justifyContent: 'center', gap: 16, padding: '8px 14px 12px',
        }}>
          {socials.map(s => (
            <a key={s.key} href={brand[s.key]} target="_blank" rel="noopener noreferrer"
              style={{ color: 'rgba(255,255,255,0.4)', width: 24, height: 24 }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(s.svg) }} />
          ))}
        </div>
      )}

      {/* 5. FOOTER LINKS */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, padding: '8px 14px 12px', flexWrap: 'wrap' }}>
        {defaultHours.length > 0 && (
          <span onClick={() => setShowHours(true)} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', cursor: 'pointer' }}>Hours</span>
        )}
        {(locations.length > 0 || brand?.store_address) && (
          <span onClick={() => locations.length > 0 ? setShowLocations(true) : window.open(`https://maps.google.com/?q=${encodeURIComponent(brand.store_address)}`, '_blank')}
            style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', cursor: 'pointer' }}>
            {locations.length > 1 ? 'Locations' : 'Location'}
          </span>
        )}
        {(locations.length === 1 && locations[0].phone) || (!locations.length && brand?.store_phone) ? (
          <a href={`tel:${locations.length === 1 ? locations[0].phone : brand.store_phone}`}
            style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textDecoration: 'none' }}>Call Us</a>
        ) : null}
      </div>

      {/* 6. POWERED BY */}
      <div style={{ textAlign: 'center', padding: '4px 0 20px', fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)' }}>
        Powered by MeetCaptura
      </div>

      {/* ===== MODALS ===== */}

      {/* HOURS MODAL */}
      {showHours && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', flexDirection: 'column' }}>
          <div onClick={() => setShowHours(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />
          <div style={{
            position: 'relative', marginTop: 'auto', maxHeight: '85vh', overflowY: 'auto',
            background: kit.bg, borderRadius: '20px 20px 0 0', padding: '20px 16px 32px',
            animation: 'captura-slide-up 0.25s ease-out',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 16px', textAlign: 'center' }}>Hours</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {dayNames.map((day, i) => {
                const h = defaultHours.find(hr => hr.day_of_week === i)
                const isToday = i === today
                return (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    fontWeight: isToday ? 700 : 400,
                  }}>
                    <span style={{ fontSize: '0.9rem', color: isToday ? '#fff' : 'rgba(255,255,255,0.6)' }}>{day}</span>
                    {h?.closed ? (
                      <span style={{ fontSize: '0.85rem', color: '#ef4444' }}>Closed</span>
                    ) : h?.open_time && h?.close_time ? (
                      <span style={{ fontSize: '0.85rem', color: isToday ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                        {formatTime(h.open_time)} - {formatTime(h.close_time)}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)' }}>--</span>
                    )}
                  </div>
                )
              })}
            </div>
            {brand?.store_address && (
              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(brand.store_address)}`} target="_blank" rel="noopener noreferrer"
                  style={{ color: accentBg, fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
                  Get Directions
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOCATIONS MODAL */}
      {showLocations && locations.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', flexDirection: 'column' }}>
          <div onClick={() => setShowLocations(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />
          <div style={{
            position: 'relative', marginTop: 'auto', maxHeight: '85vh', overflowY: 'auto',
            background: kit.bg, borderRadius: '20px 20px 0 0', padding: '20px 16px 32px',
            animation: 'captura-slide-up 0.25s ease-out',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 16px', textAlign: 'center' }}>Locations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {locations.map(loc => {
                const locHours = getLocationHours(loc.id)
                const locToday = locHours.find(h => h.day_of_week === today)
                return (
                <div key={loc.id} style={{
                  padding: '14px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 6 }}>{loc.name}</div>
                  {loc.address && (
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{loc.address}</div>
                  )}
                  {loc.phone && (
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{loc.phone}</div>
                  )}
                  {locToday && (
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                      Today: {locToday.closed ? (
                        <span style={{ color: '#ef4444' }}>Closed</span>
                      ) : locToday.open_time && locToday.close_time ? (
                        <span>{formatTime(locToday.open_time)} - {formatTime(locToday.close_time)}</span>
                      ) : '--'}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12 }}>
                    {loc.address && (
                      <a href={`https://maps.google.com/?q=${encodeURIComponent(loc.address)}`} target="_blank" rel="noopener noreferrer"
                        style={{ color: accentBg, fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
                        Get Directions
                      </a>
                    )}
                    {loc.phone && (
                      <a href={`tel:${loc.phone}`}
                        style={{ color: accentBg, fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
                        Call
                      </a>
                    )}
                  </div>
                </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* MENU MODAL */}
      {showMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', flexDirection: 'column' }}>
          <div onClick={() => setShowMenu(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />
          <div style={{
            position: 'relative', marginTop: 'auto', maxHeight: '85vh', overflowY: 'auto',
            background: kit.bg, borderRadius: '20px 20px 0 0', padding: '20px 16px 32px',
            animation: 'captura-slide-up 0.25s ease-out',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 16px', textAlign: 'center' }}>
              Menu / Services
            </h3>

            {/* Uploaded menu images */}
            {menuImages.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {menuImages.map(mi => (
                  <div key={mi.id}>
                    {menuImages.length > 1 && (
                      <div style={{
                        fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)',
                        marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>{mi.label}</div>
                    )}
                    {mi.url.endsWith('.pdf') ? (
                      <a href={mi.url} target="_blank" rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.08)',
                          color: accentBg, textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem',
                        }}>
                        📄 {menuImages.length > 1 ? mi.label : 'View Full Menu'} (PDF)
                      </a>
                    ) : (
                      <img src={mi.url} alt={mi.label} style={{
                        width: '100%', borderRadius: 12, objectFit: 'contain',
                      }} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Category pills */}
            {menuCategories.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
                <button onClick={() => setMenuCategory('all')} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600,
                  border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: menuCategory === 'all' ? accentBg : 'rgba(255,255,255,0.08)',
                  color: menuCategory === 'all' ? accentInk : '#fff',
                }}>All</button>
                {menuCategories.map(cat => (
                  <button key={cat} onClick={() => setMenuCategory(cat)} style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600,
                    border: 'none', cursor: 'pointer', flexShrink: 0,
                    background: menuCategory === cat ? accentBg : 'rgba(255,255,255,0.08)',
                    color: menuCategory === cat ? accentInk : '#fff',
                  }}>{cat}</button>
                ))}
              </div>
            )}

            {/* Items */}
            {(menuCategory === 'all' ? menuCategories : [menuCategory]).map(cat => (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
                  {cat}
                </div>
                {menuItems.filter(i => i.category === cat).map(item => (
                  <div key={item.id} style={{
                    display: 'flex', gap: 12, padding: '12px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {item.image_url && (
                      <img src={item.image_url} alt="" style={{
                        width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0,
                      }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</span>
                        {item.price != null && (
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, marginLeft: 8 }}>
                            ${parseFloat(item.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', marginTop: 2, lineHeight: 1.4 }}>
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LOYALTY MODAL (hidden on label QR codes) */}
      {showLoyalty && !isLabelQR && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', flexDirection: 'column' }}>
          <div onClick={() => setShowLoyalty(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />
          <div onClick={e => e.stopPropagation()} style={{
            position: 'relative', marginTop: 'auto', maxHeight: '85vh', overflowY: 'auto',
            background: kit.bg, borderRadius: '20px 20px 0 0', padding: '20px 16px 32px',
            animation: 'captura-slide-up 0.25s ease-out',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 20px' }} />

            {/* Not identified */}
            {!loyaltyState && !loyaltyLookupMode && (
              <form onSubmit={handleLoyaltySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, textAlign: 'center' }}>Earn Loyalty Points</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>
                  Sign up to start earning points with every visit
                </p>
                {loyaltyLookupError && (
                  <div style={{ padding: '10px 14px', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: 10, fontSize: '0.82rem', color: '#fbbf24', textAlign: 'center' }}>
                    {loyaltyLookupError}
                  </div>
                )}
                <input className="input" placeholder="First Name" value={loyaltyForm.firstName}
                  onChange={e => setLoyaltyForm({ ...loyaltyForm, firstName: e.target.value })} required
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: '0.9rem' }} />
                <input className="input" placeholder="Last Name" value={loyaltyForm.lastName}
                  onChange={e => setLoyaltyForm({ ...loyaltyForm, lastName: e.target.value })} required
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: '0.9rem' }} />
                <input className="input" type="email" placeholder="Email" value={loyaltyForm.email}
                  onChange={e => setLoyaltyForm({ ...loyaltyForm, email: e.target.value })} required
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: '0.9rem' }} />
                <input className="input" type="tel" placeholder="Phone (optional)" value={loyaltyForm.phone}
                  onChange={e => setLoyaltyForm({ ...loyaltyForm, phone: e.target.value })}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: '0.9rem' }} />
                <label style={{ display: 'flex', gap: 10, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, cursor: 'pointer' }}>
                  <input type="checkbox" checked={loyaltyForm.marketingConsent} onChange={e => setLoyaltyForm({ ...loyaltyForm, marketingConsent: e.target.checked })} style={{ marginTop: 3, accentColor: accentBg }} />
                  I agree to receive recurring marketing texts, emails, and calls from {brand?.name || 'this business'}, including by automated technology, at the contact info I provided. My information was collected by MeetCaptura on behalf of {brand?.name || 'this business'}. Consent is not a condition of purchase. Msg frequency varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help.
                </label>
                <button type="submit" disabled={loyaltySubmitting} style={{
                  width: '100%', padding: 14, ...btnStyle, border: 'none', borderRadius: 12,
                  fontWeight: 700, cursor: loyaltySubmitting ? 'wait' : 'pointer', fontSize: 14,
                  opacity: loyaltySubmitting ? 0.6 : 1,
                }}>
                  {loyaltySubmitting ? 'Joining...' : 'Join & Earn Your First Point'}
                </button>
                <button type="button" onClick={() => { setLoyaltyLookupMode(true); setLoyaltyLookupError('') }} style={{
                  background: 'none', border: 'none', color: accentBg, cursor: 'pointer',
                  fontSize: '0.85rem', textDecoration: 'underline', padding: 0, textAlign: 'center',
                }}>
                  Already a member? Look up your points
                </button>
              </form>
            )}

            {/* Email lookup */}
            {!loyaltyState && loyaltyLookupMode && (
              <form onSubmit={handleLoyaltyLookup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, textAlign: 'center' }}>Welcome Back</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>Enter the email you signed up with to find your points</p>
                <input className="input" type="email" placeholder="Email" value={loyaltyLookupEmail} onChange={e => setLoyaltyLookupEmail(e.target.value)} required autoFocus
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: '0.9rem' }} />
                <button type="submit" disabled={loyaltySubmitting} style={{
                  width: '100%', padding: 14, ...btnStyle, border: 'none', borderRadius: 12,
                  fontWeight: 700, cursor: loyaltySubmitting ? 'wait' : 'pointer', fontSize: 14,
                  opacity: loyaltySubmitting ? 0.6 : 1,
                }}>
                  {loyaltySubmitting ? 'Looking up...' : 'Find My Points'}
                </button>
                <button type="button" onClick={() => { setLoyaltyLookupMode(false); setLoyaltyLookupError('') }} style={{
                  background: 'none', border: 'none', color: accentBg, cursor: 'pointer',
                  fontSize: '0.85rem', textDecoration: 'underline', padding: 0, textAlign: 'center',
                }}>
                  New here? Sign up instead
                </button>
              </form>
            )}

            {/* Identified */}
            {loyaltyState && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* REDEMPTION PROOF SCREEN (staff-facing, one-time display) */}
                {redemptionProof ? (
                  <div style={{
                    textAlign: 'center', padding: '24px 0',
                    animation: 'proofPulse 3s ease-in-out infinite',
                  }}>
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" style={{ display: 'inline' }}>
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '12px 0 4px', color: '#22c55e' }}>
                      Reward Redeemed
                    </h3>
                    <p style={{ fontSize: '1.4rem', fontWeight: 800, color: accentBg, margin: '8px 0 4px' }}>
                      {redemptionProof.rewardName}
                    </p>
                    {redemptionProof.rewardValue && (
                      <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 12px' }}>
                        {redemptionProof.rewardValue}
                      </p>
                    )}
                    <div style={{
                      margin: '12px auto', padding: '10px 20px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      display: 'inline-block',
                    }}>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                        {redemptionProof.storeName}
                      </div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", color: '#fff' }}>
                        {proofClock ? proofClock.toLocaleTimeString() : ''}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                        {redemptionProof.redeemedAt.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', margin: '16px 0 4px' }}>
                      You have <strong style={{ color: accentBg }}>{redemptionProof.remainingBalance}</strong> {redemptionProof.remainingBalance === 1 ? 'point' : 'points'} toward your next reward.
                    </p>
                    <button onClick={() => {
                      setRedemptionProof(null)
                      setProofClock(null)
                      setLoyaltyRedeemed(null)
                      setShowLoyalty(false)
                      clearTimeout(proofTimerRef.current)
                    }} style={{
                      marginTop: 16, padding: '14px 32px', background: 'rgba(255,255,255,0.08)', color: '#fff',
                      border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, fontWeight: 600,
                      cursor: 'pointer', fontSize: '0.85rem',
                    }}>Dismiss</button>
                  </div>
                ) : (
                  <>
                    {/* Threshold celebration banner */}
                    {thresholdCelebration && (
                      <div style={{
                        textAlign: 'center', padding: '16px', borderRadius: 12,
                        background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
                      }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4ade80', marginBottom: 4 }}>
                          {loyaltyState.awarded ? `You just earned ${thresholdCelebration.name}!` : `You have a reward ready to redeem`}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
                          {thresholdCelebration.points_required} points
                        </div>
                        <button onClick={() => handleLoyaltyRedeem(thresholdCelebration)} style={{
                          padding: '10px 24px', ...btnStyle, border: 'none',
                          borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                        }}>Redeem Now</button>
                      </div>
                    )}

                    {/* Persistent banner for returning members who have a reward ready but didn't just cross */}
                    {!thresholdCelebration && loyaltyRewards.some(r => (loyaltyState.balance || 0) >= r.points_required) && (
                      <div style={{
                        textAlign: 'center', padding: '12px 16px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.04)', border: `1px solid ${accentBg}40`,
                      }}>
                        <span style={{ color: accentBg, fontWeight: 600, fontSize: '0.85rem' }}>You have a reward ready to redeem</span>
                      </div>
                    )}

                    {/* Balance */}
                    <div style={{ textAlign: 'center', padding: '12px 0' }}>
                      <div style={{ fontSize: '3rem', fontWeight: 800, color: accentBg, lineHeight: 1 }}>
                        {loyaltyState.balance || 0}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Points</div>
                      {loyaltyState.awarded && !thresholdCelebration && (
                        <div style={{
                          marginTop: 8, display: 'inline-block', padding: '4px 12px', borderRadius: 20,
                          fontSize: '0.75rem', fontWeight: 600,
                          background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e',
                        }}>+1 point earned for this visit!</div>
                      )}
                      {loyaltyState.awarded === false && loyaltyState.cooldown_remaining_minutes > 0 && (
                        <div style={{
                          marginTop: 8, display: 'inline-block', padding: '4px 12px', borderRadius: 20,
                          fontSize: '0.75rem', fontWeight: 600,
                          background: 'rgba(255, 165, 0, 0.15)', color: '#ffa500',
                        }}>
                          Come back in {loyaltyState.cooldown_remaining_minutes >= 1440
                            ? `${Math.floor(loyaltyState.cooldown_remaining_minutes / 1440)}d ${Math.floor((loyaltyState.cooldown_remaining_minutes % 1440) / 60)}h`
                            : loyaltyState.cooldown_remaining_minutes >= 60
                            ? `${Math.floor(loyaltyState.cooldown_remaining_minutes / 60)}h ${Math.round(loyaltyState.cooldown_remaining_minutes % 60)}m`
                            : `${Math.round(loyaltyState.cooldown_remaining_minutes)}m`
                          } to earn another point
                        </div>
                      )}
                    </div>

                    {/* Rewards */}
                    {loyaltyRewards.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
                          Available Rewards
                        </div>
                        {loyaltyRewards.map(reward => {
                          const canRedeem = (loyaltyState.balance || 0) >= reward.points_required
                          return (
                            <div key={reward.id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '12px 14px', borderRadius: 10, marginBottom: 8,
                              background: canRedeem ? 'rgba(34, 197, 94, 0.06)' : 'rgba(255,255,255,0.04)',
                              border: canRedeem ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(255,255,255,0.06)',
                            }}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{reward.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                  {canRedeem ? 'Ready to redeem' : `${reward.points_required - (loyaltyState.balance || 0)} more points needed`}
                                </div>
                              </div>
                              <button onClick={() => handleLoyaltyRedeem(reward)} disabled={!canRedeem} style={{
                                padding: '8px 16px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: '0.8rem',
                                cursor: canRedeem ? 'pointer' : 'not-allowed',
                                background: canRedeem ? accentBg : 'rgba(255,255,255,0.06)',
                                color: canRedeem ? accentInk : 'rgba(255,255,255,0.3)',
                              }}>Redeem</button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROMO MODAL */}
      {showPromo && activePromo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', flexDirection: 'column' }}>
          <div onClick={() => setShowPromo(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />
          <div style={{
            position: 'relative', marginTop: 'auto', maxHeight: '85vh', overflowY: 'auto',
            background: kit.bg, borderRadius: '20px 20px 0 0', padding: '20px 16px 32px',
            animation: 'captura-slide-up 0.25s ease-out',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 20px' }} />

            {promoSubmitted ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎉</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 4px' }}>You're entered!</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Good luck!</p>
                <button onClick={() => setShowPromo(false)} style={{
                  marginTop: 16, padding: '14px 32px', ...btnStyle, border: 'none',
                  borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14,
                }}>Done</button>
              </div>
            ) : (
              <form onSubmit={handlePromoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, textAlign: 'center' }}>{activePromo.title}</h3>
                {activePromo.description && (
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>{activePromo.description}</p>
                )}
                {[
                  { key: 'firstName', placeholder: 'First Name', required: true },
                  { key: 'lastName', placeholder: 'Last Name', required: true },
                  { key: 'email', placeholder: 'Email', type: 'email', required: true },
                  { key: 'phone', placeholder: 'Phone (optional)' },
                ].map(f => (
                  <input key={f.key} className="input" type={f.type || 'text'} placeholder={f.placeholder}
                    value={promoForm[f.key]} onChange={e => setPromoForm({ ...promoForm, [f.key]: e.target.value })}
                    required={f.required}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: '0.9rem' }} />
                ))}
                {/* TCPA Consent */}
                <label style={{ display: 'flex', gap: 10, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={promoForm.ageConsent} onChange={e => setPromoForm({ ...promoForm, ageConsent: e.target.checked })} required />
                  I am 18 or older and agree to the giveaway rules.
                </label>
                <label style={{ display: 'flex', gap: 10, fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={promoForm.marketingConsent} onChange={e => setPromoForm({ ...promoForm, marketingConsent: e.target.checked })} />
                  I'd like to receive marketing communications from {brand?.name || 'this business'}.
                </label>
                <button type="submit" disabled={promoSubmitting || !promoForm.ageConsent} style={{
                  width: '100%', padding: 14, ...btnStyle, border: 'none', borderRadius: 12,
                  fontWeight: 700, cursor: promoSubmitting ? 'wait' : 'pointer', fontSize: 14,
                  opacity: promoSubmitting || !promoForm.ageConsent ? 0.6 : 1,
                }}>
                  {promoSubmitting ? 'Entering...' : 'Enter to Win'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}
