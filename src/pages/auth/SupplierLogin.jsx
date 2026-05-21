import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getApiUrl } from '../../utils/api'
import { useSeller } from '../../context/SellerContext'

const SupplierLogin = () => {
  const navigate = useNavigate()
  const { login: sellerLogin, isLoggedIn, authResolved } = useSeller()

  useEffect(() => {
    if (authResolved && isLoggedIn) navigate('/seller/dashboard', { replace: true })
  }, [isLoggedIn, authResolved, navigate])

  const [formData, setFormData] = useState({ username: '', password: '', rememberMe: false })
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
      const res = await fetch(getApiUrl('sellers/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.username, password: formData.password })
      })
      const data = await res.json()
      if (res.ok) {
        await sellerLogin(data.seller, data.token)
        setError('')
      } else {
        setError(data.message || 'Invalid credentials. Please try again.')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputWrap = {
    display: 'flex', alignItems: 'center',
    border: '1.5px solid #e5e7eb', borderRadius: '10px',
    overflow: 'hidden', background: '#fafafa',
    transition: 'border-color 0.2s'
  }

  const iconSpan = {
    padding: '0 12px', color: '#9ca3af',
    display: 'flex', alignItems: 'center',
    height: '44px', flexShrink: 0
  }

  const inputStyle = {
    flex: 1, border: 'none', outline: 'none', background: 'transparent',
    fontSize: '0.88rem', color: '#1f2937',
    padding: '0 12px 0 0', height: '44px'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #16a34a 0%, #15803d 40%, #1f2937 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start',
      padding: '80px 16px 40px',
      position: 'relative', overflow: 'hidden'
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
        background: '#fff', borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden', position: 'relative', zIndex: 1
      }}>
        {/* Top accent */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #16a34a, #15803d)' }} />

        <div style={{ padding: '32px 28px 28px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(22,163,74,0.35)', marginBottom: '14px'
            }}>
              <i className="fas fa-store" style={{ fontSize: '1.4rem', color: '#fff' }}></i>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1f2937', margin: '0 0 4px' }}>
              Supplier Login
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
              Manage products &amp; grow your business
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
              padding: '10px 14px', marginBottom: '16px',
              fontSize: '0.83rem', color: '#dc2626',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <i className="fas fa-exclamation-circle" style={{ flexShrink: 0 }}></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* Username field */}
            <div style={{ marginBottom: '12px' }}>
              <div style={inputWrap}
                onFocusCapture={e => e.currentTarget.style.borderColor = '#16a34a'}
                onBlurCapture={e => e.currentTarget.style.borderColor = '#e5e7eb'}
              >
                <span style={iconSpan}>
                  <i className="fas fa-user" style={{ fontSize: '0.85rem' }}></i>
                </span>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Username, email, or WhatsApp"
                  required
                  style={inputStyle}
                />
              </div>
              {/* Removed redundant sub-label — placeholder is sufficient */}
            </div>

            {/* Password field */}
            <div style={{ marginBottom: '12px' }}>
              <div style={inputWrap}
                onFocusCapture={e => e.currentTarget.style.borderColor = '#16a34a'}
                onBlurCapture={e => e.currentTarget.style.borderColor = '#e5e7eb'}
              >
                <span style={iconSpan}>
                  <i className="fas fa-lock" style={{ fontSize: '0.85rem' }}></i>
                </span>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Remember me + Forgot password — same row */}
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
                  style={{ accentColor: '#16a34a', width: '14px', height: '14px' }}
                />
                Remember me
              </label>
              <Link to="/forgot-password-token" style={{ fontSize: '0.82rem', color: '#16a34a', textDecoration: 'none', fontWeight: '600' }}>
                Forgot Password?
              </Link>
            </div>

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? '#d1d5db' : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                border: 'none', borderRadius: '10px', color: '#fff',
                fontSize: '0.92rem', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(22,163,74,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s', marginBottom: '12px'
              }}
            >
              {loading
                ? <><span className="spinner-border spinner-border-sm" role="status"></span> Signing in…</>
                : <><i className="fas fa-sign-in-alt"></i> Sign In as Supplier</>
              }
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>Don't have a supplier account?</span>
            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          </div>

          {/* Secondary CTA — outlined */}
          <Link
            to="/register/supplier"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              width: '100%', padding: '11px',
              border: '2px solid #16a34a', borderRadius: '10px',
              color: '#16a34a', fontWeight: '700', fontSize: '0.88rem',
              textDecoration: 'none', background: 'transparent',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f0fdf4' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <i className="fas fa-rocket"></i> Create Supplier Account
          </Link>

        </div>
      </div>

      {/* Trust badges — outside the card */}
      <div style={{
        display: 'flex', gap: '32px', marginTop: '28px',
        position: 'relative', zIndex: 1
      }}>
        {[
          { icon: 'fa-users', label: 'Global Buyers' },
          { icon: 'fa-chart-line', label: 'Business Growth' },
          { icon: 'fa-handshake', label: 'Trusted Platform' }
        ].map(b => (
          <div key={b.label} style={{ textAlign: 'center' }}>
            <i className={`fas ${b.icon}`} style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.9)', display: 'block', marginBottom: '4px' }}></i>
            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', fontWeight: '600', whiteSpace: 'nowrap' }}>{b.label}</span>
          </div>
        ))}
      </div>

      {/* Buyer link — subtle footer */}
      <p style={{ marginTop: '20px', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', position: 'relative', zIndex: 1 }}>
        Are you a buyer?{' '}
        <Link to="/login/buyer" style={{ color: 'rgba(255,255,255,0.75)', fontWeight: '600', textDecoration: 'underline' }}>
          Sign in here
        </Link>
      </p>
    </div>
  )
}

export default SupplierLogin
