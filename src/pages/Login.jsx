import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (signInError) throw signInError
      navigate('/dashboard')
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
          <img src="/images/meetcaptura-logo.png" alt="meetcaptura" style={{ height: 48, marginBottom: 8 }} />
          <p style={{ color: 'var(--text-muted)' }}>
            Welcome back
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            {loading ? 'Please wait...' : 'Log In'}
          </button>

          <p style={{ textAlign: 'center', marginTop: -8 }}>
            <span onClick={async () => {
              if (!email) { setError('Enter your email first'); return }
              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/login',
              })
              if (error) setError(error.message)
              else alert('Check your email for a password reset link.')
            }}
              style={{ color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>
              Forgot password?
            </span>
          </p>
        </form>
      </div>
    </div>
  )
}
