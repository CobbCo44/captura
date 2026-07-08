import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const tiers = [
  {
    name: 'Starter',
    price: '299',
    perContact: '$1',
    desc: 'For brands launching their first consumer capture program.',
    features: [
      'Core dashboard',
      'Up to 5 products',
      '3 QR codes',
      'Scan analytics + map',
      'VIP member capture',
      'CSV exports',
      'Unlimited scans',
    ],
    highlight: false,
  },
  {
    name: 'Growth',
    price: '499',
    perContact: '$1',
    desc: 'For brands scaling consumer engagement across product lines.',
    features: [
      'Everything in Starter',
      'Unlimited products',
      'Unlimited QR codes',
      'AI insights reports',
      'Warranty registration',
      'Reorder links',
      'Promotional campaigns',
      'Social media links',
      'Consumer data dashboard',
    ],
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    perContact: 'Volume pricing',
    desc: 'For large manufacturers with high-volume product lines.',
    features: [
      'Custom platform fee',
      'Volume per-contact pricing',
      'Everything in Growth',
      'Dedicated onboarding',
      'Priority support',
      'Admin controls',
      'Dedicated account manager',
    ],
    highlight: false,
  },
]

export default function Pricing() {
  const navigate = useNavigate()
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      if (!supabase) { navigate('/login'); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      setAuthenticated(true)
      setLoading(false)
    }
    check()
  }, [navigate])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', padding: '40px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 60 }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FAFAFA', letterSpacing: '-1px' }}>Captura</div>
        <Link to="/dashboard" style={{ color: '#A1A1AA', fontSize: '0.9rem' }}>Back to Dashboard</Link>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 800, letterSpacing: '-1.5px', color: '#FAFAFA', marginBottom: 16 }}>
          Choose your plan
        </h1>
        <p style={{ color: '#52525B', fontSize: '1.1rem', maxWidth: 520, margin: '0 auto' }}>
          A platform fee plus $1 per consumer captured. You only pay for real contacts you own.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, marginBottom: 60 }}>
        {tiers.map((tier) => (
          <div key={tier.name} style={{
            padding: '44px 36px', background: '#131316',
            border: tier.highlight ? '1px solid #3F3F46' : 'none',
            display: 'flex', flexDirection: 'column',
          }}>
            {tier.highlight && (
              <div style={{
                fontSize: '0.65rem', fontWeight: 700, color: '#09090B', background: '#FAFAFA',
                padding: '4px 12px', borderRadius: 4, display: 'inline-block',
                marginBottom: 16, alignSelf: 'flex-start', letterSpacing: '1px',
              }}>MOST POPULAR</div>
            )}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: '0.8rem', color: '#52525B', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
                {tier.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                {tier.price === 'Custom' ? (
                  <span style={{ fontSize: '3rem', fontWeight: 800, color: '#FAFAFA', letterSpacing: '-2px' }}>Custom</span>
                ) : (
                  <>
                    <span style={{ fontSize: '3rem', fontWeight: 800, color: '#FAFAFA', letterSpacing: '-2px' }}>${tier.price}</span>
                    <span style={{ color: '#3F3F46', fontSize: '0.9rem' }}>/month</span>
                  </>
                )}
              </div>
              <div style={{ color: '#A1A1AA', fontSize: '0.85rem', fontWeight: 600, marginTop: 4 }}>+ {tier.perContact} per captured contact</div>
              <p style={{ color: '#52525B', fontSize: '0.85rem', lineHeight: 1.5, marginTop: 12 }}>{tier.desc}</p>
            </div>

            <div style={{ flex: 1, marginBottom: 28 }}>
              {tier.features.map((f, i) => (
                <div key={i} style={{
                  padding: '8px 0', fontSize: '0.9rem', color: '#A1A1AA',
                  borderBottom: '1px solid #1C1C21',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ color: '#22C55E', fontSize: '0.8rem' }}>+</span>
                  {f}
                </div>
              ))}
            </div>

            <button style={{
              display: 'block', textAlign: 'center', padding: '14px', width: '100%',
              borderRadius: 8, fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
              background: tier.highlight ? '#FAFAFA' : 'transparent',
              color: tier.highlight ? '#09090B' : '#A1A1AA',
              border: tier.highlight ? 'none' : '1px solid #27272A',
            }}>
              {tier.name === 'Enterprise' ? 'Contact Sales' : 'Select Plan'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', color: '#52525B', fontSize: '0.9rem', marginBottom: 40, maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.6 }}>
        You pay for results. $1 per opted-in consumer you actually capture. The platform fee covers your dashboard, analytics, and unlimited scans.
      </div>

      <div style={{ textAlign: 'center', color: '#3F3F46', fontSize: '0.85rem', paddingBottom: 40 }}>
        Questions? Contact us at hello@meetcaptura.com
      </div>
    </div>
  )
}
