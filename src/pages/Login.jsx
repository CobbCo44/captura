import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [isSignup, setIsSignup] = useState(searchParams.get('signup') === 'true')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [brandName, setBrandName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!supabase) {
      navigate('/dashboard')
      return
    }

    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) throw signUpError

        if (data.user) {
          await supabase.from('brands').insert({
            user_id: data.user.id,
            name: brandName,
            email: email
          })
        }
        navigate('/dashboard')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (signInError) throw signInError
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>
            Captura
          </div>
          <p style={{ color: 'var(--text-muted)' }}>
            {isSignup ? 'Create your brand account' : 'Welcome back'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isSignup && (
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                Brand Name
              </label>
              <input
                type="text"
                className="input"
                placeholder="Your brand name"
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              Email
            </label>
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
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              Password
            </label>
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

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
              fontSize: '0.85rem'
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
            {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Log In'}
          </button>

          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <span
              onClick={() => setIsSignup(!isSignup)}
              style={{ color: '#FAFAFA', cursor: 'pointer', fontWeight: 500 }}
            >
              {isSignup ? 'Log In' : 'Sign Up'}
            </span>
          </p>
        </form>
      </div>
    </div>
  )
}
