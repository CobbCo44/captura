import { Link } from 'react-router-dom'
import { STOREFRONT_FEATURES, featureInfo } from '../lib/billingAccess'

const TIER_NAMES = { growth: 'Growth', pro: 'Pro' }

// Shown in place of a feature the brand's plan doesn't include.
// compact: a one-line version for buttons and small sections.
export default function PlanLock({ feature, description, compact = false, brand = null }) {
  const info = (brand && featureInfo(brand, feature)) || STOREFRONT_FEATURES[feature] || { tier: 'growth', name: 'This feature' }
  const tierName = TIER_NAMES[info.tier] || 'a higher plan'

  if (compact) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        <LockIcon />
        {info.name}: included in the {tierName} plan.
        <Link to="/dashboard/billing" style={{ color: 'var(--text)', fontWeight: 600 }}>See plans</Link>
      </span>
    )
  }

  return (
    <div className="card" style={{ padding: '36px 28px', textAlign: 'center', maxWidth: 560 }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', margin: '0 auto 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
      }}>
        <LockIcon size={18} />
      </div>
      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>{info.name}</div>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#22C55E', marginBottom: 10 }}>Included in the {tierName} plan</div>
      {description && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 auto 20px', maxWidth: 420 }}>{description}</p>
      )}
      <Link to="/dashboard/billing" className="btn btn-primary" style={{ display: 'inline-block', padding: '11px 26px', fontSize: '0.9rem' }}>
        See plans
      </Link>
    </div>
  )
}

function LockIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}
