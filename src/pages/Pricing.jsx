import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const productTiers = [
  {
    name: 'Launch',
    price: '299',
    perContact: '300 new contacts a month included, then $1 each',
    desc: 'Turn the people who buy your products into contacts you own.',
    features: [
      'A unique QR code on every item, up to 100,000 a year',
      'Unlimited products, retail channels and batches',
      'Warranty registration, promos and events',
      'Every contact tagged with the channel it came from',
      'Live scan map and channel reporting',
      'Shopify sync and CSV export',
    ],
    highlight: false,
  },
  {
    name: 'Growth',
    price: '999',
    perContact: '1,250 new contacts a month included, then $0.80 each',
    desc: 'For brands selling through several retailers at volume.',
    features: [
      'Everything in Launch',
      'Up to 2 million serialized codes a year',
      'Lower per-contact rate',
      'AI insights and reports',
      'Digital Product Passport (EU ESPR ready)',
    ],
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    perContact: 'Volume pricing on contacts',
    desc: 'For manufacturers labeling millions of units a year.',
    features: [
      'Everything in Growth',
      'Unlimited serialized codes',
      'Annual contract and invoicing',
      'Dedicated onboarding and support',
    ],
    highlight: false,
  },
]

const storefrontTiers = [
  {
    name: 'Starter',
    price: '99',
    desc: 'Turn first-time customers into regulars.',
    features: [
      'Your own scan page with menu, hours and locations',
      'Digital punch card: customers earn points and rewards',
      'Live map of where your QR codes and labels get scanned',
      'Automatic welcome and "your reward is ready" emails',
      '1 location',
      'Unlimited scans',
    ],
    highlight: false,
  },
  {
    name: 'Growth',
    price: '199',
    desc: 'Bring customers back automatically.',
    features: [
      'Everything in Starter',
      'Email marketing: 4 campaigns a month, with photos',
      'Automatic "we miss you" emails when regulars stop coming',
      'See how many customers came back',
      'Giveaways and promos',
      'Download your customer list',
    ],
    highlight: true,
  },
  {
    name: 'Pro',
    price: '499',
    desc: 'For businesses with more than one location.',
    features: [
      'Everything in Growth',
      'Up to 5 locations ($89/mo for each extra)',
      'Detailed insights and reports',
      'Connect your Shopify store',
      'Priority setup and support',
    ],
    highlight: false,
  },
]

export default function Pricing() {
  const navigate = useNavigate()
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('storefront')

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

  const tiers = tab === 'storefront' ? storefrontTiers : productTiers
  const isStorefront = tab === 'storefront'

  return (
    <div style={{ minHeight: '100vh', padding: '40px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 60 }}>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FAFAFA', letterSpacing: '-1px' }}>MeetCaptura</div>
        <Link to="/dashboard" style={{ color: '#A1A1AA', fontSize: '0.9rem' }}>Back to Dashboard</Link>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 800, letterSpacing: '-1.5px', color: '#FAFAFA', marginBottom: 16 }}>
          Choose your plan
        </h1>
        <p style={{ color: '#52525B', fontSize: '1.1rem', maxWidth: 520, margin: '0 auto' }}>
          {isStorefront
            ? 'Simple, flat monthly pricing. No per-contact fees, no surprises.'
            : 'A monthly fee that includes your first contacts, then about $1 for each new person who opts in. QR codes are free.'}
        </p>
      </div>

      {/* Toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
        <div style={{
          display: 'inline-flex', background: '#131316', borderRadius: 10, padding: 3,
          border: '1px solid #1C1C21',
        }}>
          {[
            { key: 'storefront', label: 'Storefront' },
            { key: 'product', label: 'Product Brand' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '10px 28px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 600,
              cursor: 'pointer', border: 'none', transition: 'all 0.2s',
              background: tab === t.key ? '#FAFAFA' : 'transparent',
              color: tab === t.key ? '#09090B' : '#52525B',
            }}>{t.label}</button>
          ))}
        </div>
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
              {tier.perContact && (
                <div style={{ color: '#A1A1AA', fontSize: '0.85rem', fontWeight: 600, marginTop: 4 }}>{tier.perContact}</div>
              )}
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
              {tier.price === 'Custom' ? 'Contact Sales' : 'Select Plan'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', color: '#52525B', fontSize: '0.9rem', marginBottom: 40, maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.6 }}>
        {isStorefront
          ? 'Flat monthly pricing with no per-contact fees. Upgrade or cancel anytime.'
          : 'A contact is one person who opts in through a warranty registration, promo or event, counted once. Repeat visits from the same person are free, and so is everything collected during your 14-day trial.'}
      </div>

      <div style={{ textAlign: 'center', color: '#3F3F46', fontSize: '0.85rem', paddingBottom: 40 }}>
        Questions? Contact us at hello@meetcaptura.com
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
