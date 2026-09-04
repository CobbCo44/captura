import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const STOREFRONT_PLANS = [
  {
    tier: 'starter', name: 'Starter', price: 125,
    desc: 'The loyalty loop, running itself.',
    features: ['Scan page with menu and prices', 'Hours and locations', 'Loyalty program with rewards', 'Welcome and reward alert emails', '1 location'],
  },
  {
    tier: 'growth', name: 'Growth', price: 250, highlight: true,
    desc: 'Everything in Starter plus Autopilot at full power.',
    features: ['Everything in Starter', 'Win-Back emails', 'Announcements (4 per month)', 'Customers-brought-back dashboard', 'Consumer data export'],
  },
  {
    tier: 'pro', name: 'Pro', price: 499,
    desc: 'For multi-location businesses and chains.',
    features: ['Everything in Growth', 'Up to 5 locations', '$89 per additional location', 'Insights dashboard', 'Shopify integration'],
  },
]

const PRODUCT_PLANS = [
  {
    tier: 'starter', name: 'Starter', price: 299,
    desc: 'For brands launching their first consumer capture program.',
    features: ['Core dashboard', 'Up to 5 products', '3 QR codes', 'Scan analytics + map', 'VIP member capture'],
  },
  {
    tier: 'growth', name: 'Growth', price: 499, highlight: true,
    desc: 'For brands scaling engagement across product lines.',
    features: ['Everything in Starter', 'Unlimited products', 'Unlimited QR codes', 'Serialization', 'Shopify integration'],
  },
]

const STATUS_LABELS = {
  trialing: { text: 'Free trial', color: '#22C55E' },
  active: { text: 'Active', color: '#22C55E' },
  past_due: { text: 'Payment issue', color: '#EF4444' },
  canceled: { text: 'Canceled', color: '#71717A' },
}

export default function Billing({ brand }) {
  const [searchParams] = useSearchParams()
  const isStorefront = brand?.business_type === 'storefront'
  const plans = isStorefront ? STOREFRONT_PLANS : PRODUCT_PLANS
  const [working, setWorking] = useState(null) // tier being started, or 'portal'
  const [error, setError] = useState('')
  const [notConfigured, setNotConfigured] = useState(false)

  const checkoutResult = searchParams.get('checkout')
  const status = brand?.subscription_status || null
  const statusInfo = status ? STATUS_LABELS[status] : null
  const trialDaysLeft = brand?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(brand.trial_ends_at) - new Date()) / 86400000))
    : null

  const callBilling = async (fn, body) => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/.netlify/functions/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  const startCheckout = async (tier) => {
    setWorking(tier)
    setError('')
    try {
      const data = await callBilling('create-checkout-session', { brand_id: brand.id, tier })
      if (data.error === 'billing_not_configured') { setNotConfigured(true); return }
      if (data.error) { setError(data.error); return }
      window.location.href = data.url
    } catch {
      setError('Could not reach billing. Check your connection and try again.')
    } finally {
      setWorking(null)
    }
  }

  const openPortal = async () => {
    setWorking('portal')
    setError('')
    try {
      const data = await callBilling('create-portal-session', { brand_id: brand.id })
      if (data.error === 'billing_not_configured') { setNotConfigured(true); return }
      if (data.error) { setError(data.error); return }
      window.location.href = data.url
    } catch {
      setError('Could not reach billing. Check your connection and try again.')
    } finally {
      setWorking(null)
    }
  }

  const hasSubscription = !!brand?.stripe_subscription_id && status && status !== 'canceled'

  return (
    <div style={{ maxWidth: 860 }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 8 }}>Billing</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.6 }}>
        Every plan starts with a 14-day free trial. Card required to start, nothing charged until day 15, cancel anytime from this page.
      </p>

      {checkoutResult === 'success' && (
        <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 20, background: 'rgba(34,197,94,0.1)', color: '#22C55E', fontSize: '0.9rem' }}>
          You're in! Your 14-day free trial has started. This page will show your plan as soon as Stripe confirms it (usually seconds).
        </div>
      )}
      {checkoutResult === 'canceled' && (
        <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 20, background: 'rgba(250,250,250,0.06)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Checkout canceled. No worries — pick a plan whenever you're ready.
        </div>
      )}
      {notConfigured && (
        <div style={{ padding: '14px 16px', borderRadius: 8, marginBottom: 20, background: 'rgba(250,250,250,0.06)', color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Billing isn't live yet — you're on the <strong>founding plan</strong>: every feature unlocked, on the house.
          When billing launches, founding accounts keep their rate locked for twelve months.
        </div>
      )}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 20, background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontSize: '0.9rem' }}>{error}</div>
      )}

      {/* Current plan */}
      {statusInfo && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', textTransform: 'capitalize' }}>{brand?.tier || 'starter'}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${statusInfo.color}1A`, color: statusInfo.color }}>
                {statusInfo.text}{status === 'trialing' && trialDaysLeft !== null ? ` · ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left` : ''}
              </span>
            </div>
            {status === 'past_due' && (
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 6 }}>
                Your last payment didn't go through. Update your card to keep Autopilot running.
              </p>
            )}
          </div>
          <button className="btn btn-secondary" onClick={openPortal} disabled={working === 'portal'} style={{ padding: '10px 20px' }}>
            {working === 'portal' ? 'Opening...' : 'Manage billing'}
          </button>
        </div>
      )}

      {/* Plans */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(230px, 1fr))`, gap: 16 }}>
        {plans.map(plan => {
          const isCurrent = hasSubscription && (brand?.tier || 'starter') === plan.tier
          return (
            <div key={plan.tier} className="card" style={{
              display: 'flex', flexDirection: 'column', gap: 12,
              border: plan.highlight ? '1px solid var(--text)' : undefined,
              position: 'relative',
            }}>
              {plan.highlight && (
                <span style={{
                  position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                  fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                  background: 'var(--text)', color: 'var(--bg)', padding: '3px 12px', borderRadius: 20,
                }}>Most popular</span>
              )}
              <div style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{plan.name}</div>
              <div>
                <span style={{ fontSize: '2rem', fontWeight: 800 }}>${plan.price}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>/mo</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>{plan.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                {plan.features.map((f, i) => (
                  <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                    <span style={{ color: '#22C55E' }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button
                className={plan.highlight ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => isCurrent ? openPortal() : startCheckout(plan.tier)}
                disabled={working !== null}
                style={{ padding: '12px', width: '100%' }}
              >
                {working === plan.tier ? 'Starting...' : isCurrent ? 'Current plan' : hasSubscription ? 'Switch plan' : 'Start 14-day trial'}
              </button>
            </div>
          )
        })}
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 20, lineHeight: 1.6 }}>
        Payments are handled by Stripe — your card details never touch our servers.
        {isStorefront && ' Founding storefronts: $199 setup waived, rate locked for twelve months.'}
      </p>
    </div>
  )
}
