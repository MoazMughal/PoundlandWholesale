import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getApiUrl } from '../../utils/api'
import { useBuyer } from '../../context/BuyerContext'

const BuyerLogin = () => {
  const navigate = useNavigate()
  const { login, isLoggedIn, authResolved } = useBuyer()

  useEffect(() => {
    if (authResolved && isLoggedIn) navigate('/buyer/dashboard', { replace: true })
  }, [isLoggedIn, authResolved, navigate])

  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(getApiUrl('buyer/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      })
      const data = await res.json()
      if (res.ok) {
        login(data.buyer, data.token)
        navigate('/buyer/dashboard')
      } else {
        setError(data.message || 'Invalid credentials. Please try again.')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #ff6600 0%, #c2410c 40%, #1f2937 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '80px 16px 40px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle bg orb */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Login card */}
      <div style={{
        width: '100%', maxWidth: '420px',
        background: '#fff',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        position: 'relative', zIndex: 1
      }}>
        {/* Card top accent */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #ff6600, #c2410c)' }} />

        <div style={{ padding: '32px 28px 28px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #ff6600 0%, #c2410c 100%)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(255,102,0,0.35)', marginBottom: '14px'
            }}>
              <i className="fas fa-shopping-basket" style={{ fontSize: '1.4rem', color: '#fff' }}></i>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1f2937', margin: '0 0 4px' }}>
              Buyer Login
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
              Wholesale prices &amp; exclusive deals
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
              padding: '10px 14px', marginBottom: '16px', fontSize: '0.83rem', color: '#dc2626',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <i className="fas fa-exclamation-circle" style={{ flexShrink: 0 }}></i>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>

            {/* Email */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: '1.5px solid #e5e7eb', borderRadius: '10px',
                overflow: 'hidden', background: '#fafafa',
                transition: 'border-color 0.2s'
              }}
                onFocusCapture={e => e.currentTarget.style.borderColor = '#ff6600'}
                onBlurCapture={e => e.currentTarget.style.borderColor = '#e5e7eb'}
              >
                <span style={{
                  padding: '0 12px', color: '#9ca3af', display: 'flex',
                  alignItems: 'center', height: '44px', flexShrink: 0
                }}>
                  <i className="fas fa-envelope" style={{ fontSize: '0.85rem' }}></i>
                </span>
                <input
                  type="text"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email or WhatsApp number"
                  required
                  style={{
                    flex: 1, border: 'none', outline: 'none', background: 'transparent',
                    fontSize: '0.88rem', color: '#1f2937', padding: '0 12px 0 0', height: '44px'
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: '1.5px solid #e5e7eb', borderRadius: '10px',
                overflow: 'hidden', background: '#fafafa',
                transition: 'border-color 0.2s'
              }}
                onFocusCapture={e => e.currentTarget.style.borderColor = '#ff6600'}
                onBlurCapture={e => e.currentTarget.style.borderColor = '#e5e7eb'}
              >
                <span style={{
                  padding: '0 12px', color: '#9ca3af', display: 'flex',
                  alignItems: 'center', height: '44px', flexShrink: 0
                }}>
                  <i className="fas fa-lock" style={{ fontSize: '0.85rem' }}></i>
                </span>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  required
                  style={{
                    flex: 1, border: 'none', outline: 'none', background: 'transparent',
                    fontSize: '0.88rem', color: '#1f2937', padding: '0 12px 0 0', height: '44px'
                  }}
                />
              </div>
            </div>

            {/* Remember me + Forgot password on same row */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: '18px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', color: '#6b7280' }}>
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  style={{ accentColor: '#ff6600', width: '14px', height: '14px' }}
                />
                Remember me
              </label>
              <Link to="/forgot-password-token" style={{ fontSize: '0.82rem', color: '#ff6600', textDecoration: 'none', fontWeight: '600' }}>
                Forgot Password?
              </Link>
            </div>

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? '#d1d5db' : 'linear-gradient(135deg, #ff6600 0%, #c2410c 100%)',
                border: 'none', borderRadius: '10px', color: '#fff',
                fontSize: '0.92rem', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(255,102,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s', marginBottom: '12px'
              }}
            >
              {loading
                ? <><span className="spinner-border spinner-border-sm" role="status"></span> Signing in…</>
                : <><i className="fas fa-sign-in-alt"></i> Sign In as Buyer</>
              }
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>Don't have an account?</span>
            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          </div>

          {/* Secondary CTA — outlined */}
          <Link
            to="/register/buyer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              width: '100%', padding: '11px',
              border: '2px solid #ff6600', borderRadius: '10px',
              color: '#ff6600', fontWeight: '700', fontSize: '0.88rem',
              textDecoration: 'none', background: 'transparent',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fff7ed' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <i className="fas fa-user-plus"></i> Create Buyer Account
          </Link>

        </div>
      </div>

      {/* Trust badges — outside the card */}
      <div style={{
        display: 'flex', gap: '32px', marginTop: '28px',
        position: 'relative', zIndex: 1
      }}>
        {[
          { icon: 'fa-tags', label: 'Wholesale Prices' },
          { icon: 'fa-shield-alt', label: 'Verified Suppliers' },
          { icon: 'fa-shipping-fast', label: 'Fast Shipping' }
        ].map(b => (
          <div key={b.label} style={{ textAlign: 'center' }}>
            <i className={`fas ${b.icon}`} style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.9)', display: 'block', marginBottom: '4px' }}></i>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', fontWeight: '600', whiteSpace: 'nowrap' }}>{b.label}</span>
          </div>
        ))}
      </div>

      {/* Supplier link — subtle footer */}
      <p style={{ marginTop: '20px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', position: 'relative', zIndex: 1 }}>
        Are you a supplier?{' '}
        <Link to="/login/supplier" style={{ color: 'rgba(255,255,255,0.75)', fontWeight: '600', textDecoration: 'underline' }}>
          Sign in here
        </Link>
      </p>
    </div>
  )
}

export default BuyerLogin
