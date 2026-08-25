import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'

import { supabase } from '../lib/supabase'
import { createBrandForUser, TERMS_VERSION } from '../lib/createBrand'

// Map raw Supabase auth errors to messages a shop owner can act on.
function humanAuthError(err, mode) {
  const msg = (err?.message || '').toLowerCase()
  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return 'That email already has an account. Log in instead, or use "Forgot password?" if you need to reset it.'
  }
  if (msg.includes('password should be') || msg.includes('weak password') || msg.includes('at least')) {
    return 'That password is too weak. Use at least 6 characters, and mix in a number or symbol.'
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || err?.status === 429) {
    return 'Too many attempts in a short time. Wait a minute, then try again.'
  }
  if (msg.includes('invalid login credentials')) {
    return 'That email and password don’t match. Double-check both, or use "Forgot password?" below.'
  }
  if (msg.includes('email not confirmed')) {
    return 'Your email hasn’t been confirmed yet. Check your inbox for the confirmation link, then log in.'
  }
  if (msg.includes('invalid email') || msg.includes('validate email') || msg.includes('is invalid')) {
    return 'That doesn’t look like a valid email address. Check it and try again.'
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'We couldn’t reach the server. Check your connection and try again.'
  }
  return (err?.message || (mode === 'signup' ? 'Something went wrong creating your account.' : 'Something went wrong logging in.')) +
    ' If this keeps happening, email support@meetcaptura.com.'
}

const labelStyle = { display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState(searchParams.get('signup') === 'true' ? 'signup' : 'login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Signup-only fields
  const [businessName, setBusinessName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [businessType, setBusinessType] = useState(
    searchParams.get('type') === 'storefront' ? 'storefront' : 'product'
  )
  const [agreed, setAgreed] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  const switchMode = (next) => {
    setMode(next)
    setError('')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!supabase) {
      navigate('/dashboard')
      return
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (signInError) throw signInError
      navigate('/dashboard')
    } catch (err) {
      setError(humanAuthError(err, 'login'))
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')

    if (!businessName.trim()) { setError('Enter your business name.'); return }
    if (!ownerName.trim()) { setError('Enter your name.'); return }
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) { setError('Enter a phone number with area code, like (555) 123-4567.'); return }
    if (password.length < 6) { setError('Password needs at least 6 characters.'); return }
    if (!agreed) { setError('Please agree to the Terms of Service and Privacy Policy to continue.'); return }

    if (!supabase) {
      navigate('/dashboard')
      return
    }

    setLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            brand_name: businessName.trim(),
            owner_name: ownerName.trim(),
            owner_phone: phone.trim(),
            business_type: businessType,
            terms_accepted_at: new Date().toISOString(),
            terms_version: TERMS_VERSION,
          },
        },
      })
      if (signUpError) throw signUpError

      // Supabase returns a ghost user (no identities) instead of an error
      // when the email is already registered and confirmations are on.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setError('That email already has an account. Log in instead, or use "Forgot password?" to reset it.')
        return
      }

      if (data.session) {
        // Confirmation off: we're signed in. Create the brand now.
        const { error: brandError } = await createBrandForUser(data.user)
        if (brandError) {
          // Account exists; the dashboard will retry brand creation from
          // the metadata on next load. Tell the user what happened.
          setError('Your account was created, but we hit a snag setting up your brand: ' +
            brandError.message + '. Logging you in anyway — if your dashboard looks empty, refresh once.')
          setTimeout(() => navigate('/dashboard'), 2500)
          return
        }
        navigate('/dashboard')
      } else {
        // Email confirmation required: brand gets created from metadata
        // on first dashboard visit after they confirm.
        setConfirmSent(true)
      }
    } catch (err) {
      setError(humanAuthError(err, 'signup'))
    } finally {
      setLoading(false)
    }
  }

  const isSignup = mode === 'signup'

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/">
            <img src="/images/meetcaptura-logo.png" alt="MeetCaptura" style={{ height: 48, marginBottom: 8, filter: 'invert(1)' }} />
          </Link>
          <p style={{ color: 'var(--text-muted)' }}>
            {isSignup ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        {confirmSent ? (
          <div className="card" style={{ textAlign: 'center', padding: '36px 28px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>Check your email</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.95rem' }}>
              We sent a confirmation link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
              Tap it, then log in and your dashboard will be ready.
            </p>
            <button
              className="btn btn-secondary"
              style={{ marginTop: 24 }}
              onClick={() => { setConfirmSent(false); switchMode('login') }}
            >Back to log in</button>
          </div>
        ) : (
        <form onSubmit={isSignup ? handleSignup : handleLogin} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isSignup && (
            <>
              <div>
                <label style={labelStyle}>Business name</label>
                <input
                  className="input"
                  placeholder="Cobb's Coffee"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Your name</label>
                <input
                  className="input"
                  placeholder="First and last name"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Business type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { value: 'storefront', label: 'Storefront', desc: 'Shop, cafe, salon, gym' },
                    { value: 'product', label: 'Product Brand', desc: 'Products on shelves' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBusinessType(opt.value)}
                      style={{
                        padding: '12px 10px', borderRadius: 8, cursor: 'pointer',
                        textAlign: 'left', fontFamily: 'inherit',
                        background: businessType === opt.value ? 'rgba(250,250,250,0.08)' : 'transparent',
                        border: businessType === opt.value ? '1px solid var(--text)' : '1px solid var(--line, #27272A)',
                      }}
                    >
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{opt.label}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@brand.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              className="input"
              placeholder="Min 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {isSignup && (
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
              fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5,
            }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, accentColor: 'var(--text)' }}
              />
              <span>
                I agree to the{' '}
                <Link to="/terms" target="_blank" style={{ color: 'var(--text)', textDecoration: 'underline' }}>Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" target="_blank" style={{ color: 'var(--text)', textDecoration: 'underline' }}>Privacy Policy</Link>
              </span>
            </label>
          )}

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
              fontSize: '0.85rem', lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Please wait...' : (isSignup ? 'Create Account' : 'Log In')}
          </button>

          {!isSignup && (
            <p style={{ textAlign: 'center', marginTop: -8 }}>
              <span onClick={async () => {
                if (!email) { setError('Enter your email first'); return }
                const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: window.location.origin + '/login',
                })
                if (resetError) setError(humanAuthError(resetError, 'login'))
                else alert('Check your email for a password reset link.')
              }}
                style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>
                Forgot password?
              </span>
            </p>
          )}

          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isSignup ? (
              <>Already have an account?{' '}
                <span onClick={() => switchMode('login')} style={{ color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>Log in</span>
              </>
            ) : (
              <>New to MeetCaptura?{' '}
                <span onClick={() => switchMode('signup')} style={{ color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>Create an account</span>
              </>
            )}
          </p>
        </form>
        )}
      </div>
    </div>
  )
}
