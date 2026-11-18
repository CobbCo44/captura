import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { compTier, BRAND_PLAN_LIMITS } from '../../lib/billingAccess'

// Plain-language plan copy: written for shop owners, not for us
const STOREFRONT_PLANS = [
  {
    tier: 'starter', name: 'Starter', price: 99,
    desc: 'Turn first-time customers into regulars.',
    features: [
      'Your own scan page with menu, hours and locations',
      'Digital punch card: customers earn points and rewards',
      'Live map of where your QR codes and labels get scanned',
      'Automatic welcome and "your reward is ready" emails',
      '1 location',
    ],
  },
  {
    tier: 'growth', name: 'Growth', price: 199, highlight: true,
    desc: 'Bring customers back automatically.',
    features: [
      'Everything in Starter',
      'Email marketing: 4 campaigns a month, with photos',
      'Automatic "we miss you" emails when regulars stop coming',
      'See how many customers came back',
      'Giveaways and promos',
      'Download your customer list',
    ],
  },
  {
    tier: 'pro', name: 'Pro', price: 499,
    desc: 'For businesses with more than one location.',
    features: [
      'Everything in Growth',
      'Up to 5 locations ($89/mo for each extra)',
      'Detailed insights and reports',
      'Connect your Shopify store',
      'Priority setup and support',
    ],
  },
]

// Brand plans: platform fee with new contacts included, then a per-contact rate.
// Numbers come from BRAND_PLAN_LIMITS so the page and the limits never disagree.
const fmtRate = (n) => (n >= 1 ? `$${n}` : `$${n.toFixed(2)}`)
const LAUNCH = BRAND_PLAN_LIMITS.starter
const GROWTH = BRAND_PLAN_LIMITS.growth
const PRODUCT_PLANS = [
  {
    tier: 'starter', name: LAUNCH.name, price: LAUNCH.price,
    usageNote: `${LAUNCH.contacts} new contacts a month included, then ${fmtRate(LAUNCH.perContact)} each`,
    desc: 'Turn the people who buy your products into contacts you own.',
    features: [
      'A unique QR code on every item, up to 100,000 a year',
      'Unlimited products, retail channels and batches',
      'Warranty registration, promos, loyalty and events',
      'Every contact tagged with the channel it came from',
      'Live scan map and channel reporting',
      'Shopify sync and CSV export',
    ],
  },
  {
    tier: 'growth', name: GROWTH.name, price: GROWTH.price, highlight: true,
    usageNote: `${GROWTH.contacts.toLocaleString()} new contacts a month included, then ${fmtRate(GROWTH.perContact)} each`,
    desc: 'For brands selling through several retailers at volume.',
    features: [
      `Everything in ${LAUNCH.name}`,
      'Up to 2 million serialized codes a year',
      'Lower per-contact rate',
      'AI insights and reports',
      'Digital Product Passport (EU ESPR ready)',
    ],
  },
]

const ENTERPRISE = {
  name: 'Enterprise',
  desc: 'For manufacturers labeling millions of units a year.',
  features: [
    'Unlimited serialized codes',
    'Volume per-contact pricing',
    'Annual contract and invoicing',
    'Dedicated onboarding and support',
  ],
}

const STATUS_LABELS = {
  trialing: { text: 'Free trial', color: '#22C55E' },
  active: { text: 'Active', color: '#22C55E' },
  past_due: { text: 'Payment issue', color: '#EF4444' },
  canceled: { text: 'Canceled', color: '#71717A' },
}

const formatDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })

export default function Billing({ brand, onboarding = false }) {
  const [searchParams] = useSearchParams()
  const isStorefront = brand?.business_type === 'storefront'
  const plans = isStorefront ? STOREFRONT_PLANS : PRODUCT_PLANS
  const [working, setWorking] = useState(null) // tier being started, or 'portal'
  const [error, setError] = useState('')
  const [notConfigured, setNotConfigured] = useState(false)
  const [justStarted] = useState(searchParams.get('checkout') === 'success')

  const checkoutResult = searchParams.get('checkout')
  const status = brand?.subscription_status || null
  const statusInfo = status ? STATUS_LABELS[status] : null
  const trialDaysLeft = brand?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(brand.trial_ends_at) - new Date()) / 86400000))
    : null
  const currentPlan = plans.find(p => p.tier === (brand?.tier || 'starter'))
  const brandLimits = !isStorefront ? BRAND_PLAN_LIMITS[brand?.tier || 'starter'] : null

  // Brands: new contacts collected this billing month (trial contacts are free)
  const [contactsThisPeriod, setContactsThisPeriod] = useState(null)
  useEffect(() => {
    if (isStorefront || onboarding || !brand?.id || brand.id === 'demo' || !brand?.subscription_status) return
    let cancelled = false
    const starts = [brand.current_period_start, status === 'trialing' ? null : brand.trial_ends_at].filter(Boolean)
    const since = starts.length ? new Date(Math.max(...starts.map(d => new Date(d).getTime()))).toISOString() : null
    let q = supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('brand_id', brand.id)
    if (since) q = q.gte('created_at', since)
    q.then(({ count }) => { if (!cancelled) setContactsThisPeriod(count ?? 0) })
    return () => { cancelled = true }
  }, [brand?.id, brand?.current_period_start, status])
  const cancelsAt = brand?.cancel_at && status !== 'canceled' ? brand.cancel_at : null

  // Plan details come from Stripe; refresh them when the page opens in case a webhook was missed
  useEffect(() => {
    if (onboarding || !brand?.stripe_subscription_id) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await callBilling('sync-subscription', { brand_id: brand.id })
        if (cancelled || !data?.synced) return
        const changed = data.subscription_status !== brand.subscription_status
          || (data.tier && data.tier !== brand.tier)
          || (data.cancel_at || null) !== (brand.cancel_at ? new Date(brand.cancel_at).toISOString() : null)
        if (changed) window.location.reload()
      } catch { /* keep what we have */ }
    })()
    return () => { cancelled = true }
  }, [brand?.id])

  // The success note shows once; drop ?checkout=success so a refresh doesn't repeat it
  useEffect(() => {
    if (checkoutResult && !onboarding && status) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [checkoutResult, onboarding, status])

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

  const changePlan = async (plan) => {
    const onTrial = status === 'trialing'
    const ok = window.confirm(onTrial
      ? `Switch to ${plan.name} ($${plan.price}/mo)? You stay on your free trial, and ${plan.name} pricing starts when it ends.`
      : `Switch to ${plan.name} ($${plan.price}/mo)? Stripe adjusts your next bill for the rest of this month.`)
    if (!ok) return
    setWorking(plan.tier)
    setError('')
    try {
      const data = await callBilling('change-plan', { brand_id: brand.id, tier: plan.tier })
      if (data.error) { setError(data.error); return }
      window.location.assign('/dashboard/billing')
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

  const freeTier = compTier(brand)
  if (freeTier && !onboarding) {
    const freePlan = plans.find(p => p.tier === freeTier)
    return (
      <div style={{ maxWidth: 1120 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 6px' }}>Billing</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: 0 }}>Your plan and what's included.</p>
        </div>
        <div className="card" style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Your plan</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '1.3rem' }}>{freePlan?.name || freeTier}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>Free plan</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
              MeetCaptura has given you this plan for free. There's nothing to pay and no card on file.
            </p>
          </div>
          {freePlan && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {freePlan.features.map((f, i) => (
                <li key={i} style={{ fontSize: '0.9rem', display: 'flex', gap: 10, lineHeight: 1.45 }}>
                  <span style={{ color: '#22C55E', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  const notice = (style, children) => (
    <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: '0.9rem', lineHeight: 1.5, ...style }}>{children}</div>
  )

  return (
    <div style={{ maxWidth: onboarding ? 'none' : 1120 }}>
      {!onboarding && (
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 6px' }}>Billing</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: 0 }}>
            Your plan, your trial, and your payment details.
          </p>
        </div>
      )}

      {justStarted && !onboarding && status === 'trialing' && notice(
        { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: 'var(--text)' },
        <><strong style={{ color: '#22C55E' }}>You're all set.</strong> Your free trial is active and nothing is charged until it ends.</>
      )}
      {checkoutResult === 'canceled' && notice(
        { background: 'rgba(250,250,250,0.05)', color: 'var(--text-muted)' },
        'Checkout canceled. Pick a plan whenever you\'re ready.'
      )}
      {notConfigured && notice(
        { background: 'rgba(250,250,250,0.05)', color: 'var(--text)' },
        'Billing isn\'t available right now. Try again in a few minutes.'
      )}
      {error && notice({ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }, error)}

      {/* Current plan summary */}
      {statusInfo && !onboarding && (
        <div className="card" style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', alignItems: 'center',
          gap: 20, marginBottom: 32, padding: '20px 24px',
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Your plan</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '1.3rem' }}>{currentPlan?.name || brand?.tier}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${statusInfo.color}1A`, color: statusInfo.color }}>
                {statusInfo.text}
              </span>
              {cancelsAt && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
                  Cancels {formatDate(cancelsAt)}
                </span>
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
              {status === 'trialing' ? 'Trial ends' : 'Price'}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>
              {status === 'trialing' && brand?.trial_ends_at
                ? <>{formatDate(brand.trial_ends_at)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left)</span></>
                : currentPlan ? `$${currentPlan.price}/mo` : '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
              {cancelsAt ? 'Then' : status === 'trialing' ? 'Then' : 'Billing'}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>
              {cancelsAt ? 'Plan ends, no charge' : status === 'trialing' && currentPlan ? `$${currentPlan.price}/mo` : status === 'past_due' ? 'Payment failed' : 'Monthly'}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={openPortal} disabled={working === 'portal'} style={{ padding: '11px 20px', whiteSpace: 'nowrap' }}>
              {working === 'portal' ? 'Opening...' : 'Manage or cancel'}
            </button>
          </div>
          {cancelsAt && (
            <p style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
              Your plan ends on {formatDate(cancelsAt)} and you won't be charged. Changed your mind? Open "Manage or cancel" and choose "Don't cancel subscription."
            </p>
          )}
          {status === 'past_due' && (
            <p style={{ gridColumn: '1 / -1', color: 'var(--danger)', fontSize: '0.88rem', margin: 0 }}>
              Your last payment didn't go through. Update your card under "Manage or cancel" to keep everything running.
            </p>
          )}
        </div>
      )}

      {brandLimits && statusInfo && !onboarding && contactsThisPeriod !== null && (() => {
        const included = brandLimits.contacts
        const over = Math.max(0, contactsThisPeriod - included)
        const pct = Math.min(100, Math.round((contactsThisPeriod / included) * 100))
        const onTrial = status === 'trialing'
        return (
          <div className="card" style={{ padding: '20px 24px', marginBottom: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                {onTrial ? 'New contacts during your trial' : 'New contacts this billing month'}
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                {contactsThisPeriod.toLocaleString()}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.95rem' }}>
                  {onTrial ? ' · free while you\'re on trial' : ` of ${included.toLocaleString()} included`}
                </span>
              </div>
            </div>
            <div>
              {!onTrial && (
                <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: over ? '#F59E0B' : '#22C55E' }} />
                </div>
              )}
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                {onTrial
                  ? `After your trial, ${included.toLocaleString()} a month are included, then ${fmtRate(brandLimits.perContact)} each.`
                  : over
                    ? `${over.toLocaleString()} over: ${fmtRate(brandLimits.perContact)} each, about $${(over * brandLimits.perContact).toLocaleString(undefined, { maximumFractionDigits: 0 })} on your next bill.`
                    : `${(included - contactsThisPeriod).toLocaleString()} left before ${fmtRate(brandLimits.perContact)} per contact applies.`}
              </div>
            </div>
          </div>
        )
      })()}

      {!onboarding && (
        <div style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14 }}>
          {hasSubscription ? 'Change plan' : 'Plans'}
        </div>
      )}

      {/* Plans */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(260px, 1fr))`, gap: 16, alignItems: 'stretch' }}>
        {plans.map(plan => {
          const isCurrent = hasSubscription && (brand?.tier || 'starter') === plan.tier
          const badge = isCurrent ? 'Your plan' : (!hasSubscription && plan.highlight ? 'Most popular' : null)
          const emphasized = isCurrent || (!hasSubscription && plan.highlight)
          return (
            <div key={plan.tier} className="card" style={{
              display: 'flex', flexDirection: 'column', padding: '24px',
              border: emphasized ? `1px solid ${isCurrent ? '#22C55E' : 'var(--text)'}` : undefined,
              position: 'relative',
            }}>
              {badge && (
                <span style={{
                  position: 'absolute', top: -10, left: 24,
                  fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                  background: isCurrent ? '#22C55E' : 'var(--text)', color: isCurrent ? '#0A0A0A' : 'var(--bg)', padding: '3px 10px', borderRadius: 20,
                }}>{badge}</span>
              )}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 700 }}>{plan.name}</span>
                <span>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800 }}>${plan.price}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/mo</span>
                </span>
              </div>
              {plan.usageNote && (
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#22C55E', marginBottom: 8 }}>{plan.usageNote}</div>
              )}
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 18px' }}>{plan.desc}</p>
              <ul style={{
                listStyle: 'none', padding: '18px 0 0', margin: '0 0 22px', borderTop: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', gap: 10, flex: 1,
              }}>
                {plan.features.map((f, i) => (
                  <li key={i} style={{ fontSize: '0.9rem', color: 'var(--text)', display: 'flex', gap: 10, lineHeight: 1.45 }}>
                    <span style={{ color: '#22C55E', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <button
                className={emphasized && !isCurrent ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => isCurrent ? openPortal() : hasSubscription ? changePlan(plan) : startCheckout(plan.tier)}
                disabled={working !== null || isCurrent}
                style={{ padding: '12px', width: '100%', opacity: isCurrent ? 0.6 : 1 }}
              >
                {working === plan.tier
                  ? (hasSubscription ? 'Switching...' : 'Starting...')
                  : isCurrent ? 'Current plan' : hasSubscription ? `Switch to ${plan.name}` : 'Start 14-day free trial'}
              </button>
            </div>
          )
        })}
        {!isStorefront && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 700 }}>{ENTERPRISE.name}</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 800 }}>Custom</span>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Volume pricing on contacts</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: '0 0 18px' }}>{ENTERPRISE.desc}</p>
            <ul style={{
              listStyle: 'none', padding: '18px 0 0', margin: '0 0 22px', borderTop: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', gap: 10, flex: 1,
            }}>
              {ENTERPRISE.features.map((f, i) => (
                <li key={i} style={{ fontSize: '0.9rem', color: 'var(--text)', display: 'flex', gap: 10, lineHeight: 1.45 }}>
                  <span style={{ color: '#22C55E', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                </li>
              ))}
            </ul>
            <a className="btn btn-secondary" href="mailto:hello@meetcaptura.com?subject=MeetCaptura%20Enterprise"
              style={{ padding: '12px', width: '100%', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
              Talk to us
            </a>
          </div>
        )}
      </div>

      {!isStorefront && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, marginTop: 20, maxWidth: 860 }}>
          <strong style={{ color: 'var(--text)' }}>What counts as a contact:</strong> one person who opts in through a warranty registration,
          promo, loyalty signup or event, counted once. When the same person comes back, it's free. Contacts collected during your free trial are free.
        </p>
      )}

      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 24, textAlign: onboarding ? 'center' : 'left' }}>
        Secure payments by Stripe. Your card details never touch our servers.
        {!onboarding && hasSubscription && ' Cancel anytime from "Manage or cancel."'}
      </p>
    </div>
  )
}
