import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Demo product data (replaced by Supabase when connected)
const demoProducts = {
  q1: {
    name: 'Pro Wireless Earbuds',
    brand: 'TechFit',
    image: 'https://placehold.co/600x400/1A1A24/8B5CF6?text=Pro+Earbuds',
    description: 'Premium wireless earbuds with active noise cancellation, 32-hour battery life, and IPX5 water resistance. Designed for athletes and music lovers.',
    contentTitle: 'Setup Guide',
    contentBody: 'Pair your earbuds by opening the case near your phone. Tap "Connect" when prompted. For the best fit, try all three ear tip sizes included in the box.',
    videoUrl: '',
  },
  q2: {
    name: 'Running Shoes V2',
    brand: 'TechFit',
    image: 'https://placehold.co/600x400/1A1A24/EC4899?text=Running+Shoes',
    description: 'Lightweight performance running shoes with responsive foam cushioning and breathable knit upper. Built for daily training and race day.',
    contentTitle: 'Care Instructions',
    contentBody: 'Remove insoles after runs to air dry. Spot clean with mild soap and cold water. Avoid machine washing. Replace after 400 miles for optimal support.',
    videoUrl: '',
  },
  q3: {
    name: 'Sport Water Bottle',
    brand: 'TechFit',
    image: 'https://placehold.co/600x400/1A1A24/10B981?text=Water+Bottle',
    description: '32oz insulated stainless steel bottle. Keeps drinks cold for 24 hours and hot for 12. Leak-proof lid with one-hand operation.',
    contentTitle: 'First Use',
    contentBody: 'Wash with warm soapy water before first use. The silicone seal is dishwasher safe. The bottle body should be hand-washed only to preserve the finish.',
    videoUrl: '',
  },
  q4: {
    name: 'Training Gloves',
    brand: 'TechFit',
    image: 'https://placehold.co/600x400/1A1A24/F59E0B?text=Training+Gloves',
    description: 'Ventilated weight training gloves with wrist support wraps. Synthetic leather palms with silicone grip pads.',
    contentTitle: 'Sizing Guide',
    contentBody: 'Measure around your palm just below the knuckles (exclude thumb). S: 7-7.5", M: 7.5-8", L: 8-8.5", XL: 8.5-9". Gloves should feel snug but not restrictive.',
    videoUrl: '',
  },
}

export default function ScanPage() {
  const { qrId } = useParams()
  const [product, setProduct] = useState(null)
  const [location, setLocation] = useState(null)
  const [locationAsked, setLocationAsked] = useState(false)
  const [showVIP, setShowVIP] = useState(false)
  const [vipForm, setVipForm] = useState({ firstName: '', lastName: '', phone: '' })
  const [vipSubmitted, setVipSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load product data
    if (supabase) {
      // Future: fetch from Supabase
      setProduct(demoProducts[qrId] || demoProducts.q1)
    } else {
      setProduct(demoProducts[qrId] || demoProducts.q1)
    }
    setLoading(false)

    // Request location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setLocationAsked(true)
          // Future: log scan to Supabase with location
        },
        () => {
          setLocationAsked(true)
          // Future: log scan without location
        }
      )
    } else {
      setLocationAsked(true)
    }
  }, [qrId])

  const handleVIPSubmit = async (e) => {
    e.preventDefault()
    if (supabase) {
      // Future: save to Supabase vip_members table
    }
    setVipSubmitted(true)
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ color: 'var(--primary-light)', fontSize: '1.2rem' }}>Loading...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16
      }}>
        <div style={{ fontSize: '2rem' }}>🔍</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Product not found</div>
        <div style={{ color: 'var(--text-muted)' }}>This QR code is not linked to a product.</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', maxWidth: 480, margin: '0 auto', padding: '0 0 40px' }}>
      {/* Product Hero */}
      <div style={{
        width: '100%', height: 280, overflow: 'hidden',
        background: 'var(--bg-card)', position: 'relative'
      }}>
        <img
          src={product.image}
          alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(15,15,20,0.9))',
          padding: '40px 20px 16px'
        }}>
          <div style={{
            fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-light)',
            textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4
          }}>{product.brand}</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{product.name}</h1>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {/* Product Description */}
        <div style={{
          padding: '20px 0', borderBottom: '1px solid var(--border)'
        }}>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>
            {product.description}
          </p>
        </div>

        {/* Content Section */}
        <div style={{ padding: '24px 0', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>
            {product.contentTitle}
          </h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>
            {product.contentBody}
          </p>
        </div>

        {/* VIP Signup */}
        <div style={{ padding: '24px 0' }}>
          {!showVIP && !vipSubmitted && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(108, 43, 217, 0.1), rgba(245, 158, 11, 0.1))',
                border: '1px solid var(--primary)',
                borderRadius: 'var(--radius)', padding: '28px 20px'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>👑</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>
                  Join the VIP List
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20, lineHeight: 1.5 }}>
                  Get exclusive access to deals, early product drops, and insider content
                  straight to your phone.
                </p>
                <button
                  className="btn btn-accent"
                  style={{ padding: '14px 32px' }}
                  onClick={() => setShowVIP(true)}
                >
                  Sign Me Up
                </button>
              </div>
            </div>
          )}

          {showVIP && !vipSubmitted && (
            <form onSubmit={handleVIPSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Join VIP</h3>
              <input
                className="input"
                placeholder="First Name"
                value={vipForm.firstName}
                onChange={e => setVipForm({ ...vipForm, firstName: e.target.value })}
                required
              />
              <input
                className="input"
                placeholder="Last Name"
                value={vipForm.lastName}
                onChange={e => setVipForm({ ...vipForm, lastName: e.target.value })}
                required
              />
              <input
                className="input"
                type="tel"
                placeholder="Phone Number"
                value={vipForm.phone}
                onChange={e => setVipForm({ ...vipForm, phone: e.target.value })}
                required
              />
              <button type="submit" className="btn btn-accent" style={{ width: '100%', padding: 14 }}>
                Join VIP List
              </button>
            </form>
          )}

          {vipSubmitted && (
            <div style={{
              textAlign: 'center', padding: 28,
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid var(--success)',
              borderRadius: 'var(--radius)'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎉</div>
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
          Powered by <span style={{ color: 'var(--primary-light)', fontWeight: 600 }}>Captura</span>
        </div>
      </div>
    </div>
  )
}
