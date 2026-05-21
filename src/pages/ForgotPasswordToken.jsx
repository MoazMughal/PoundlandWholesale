import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiUrl } from '../utils/api';

const ForgotPasswordToken = () => {
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState('buyer');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      // Backend auto-detects account type from email — no userType needed
      const res = await fetch(getApiUrl('auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), userType })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || 'Reset link sent! Check your inbox.');
        setEmail('');
        if (data.developmentUrl) console.log('🔧 Dev reset URL:', data.developmentUrl);
      } else {
        setError(data.message || 'Failed to send reset link.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Full-screen blank canvas — no header/footer
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #667eea 0%, #764ba2 50%, #1f2937 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start',
      padding: '80px 16px 40px',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Subtle orb */}
      <div style={{
        position: 'absolute', top: '-15%', right: '-10%',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: '400px',
        background: '#fff', borderRadius: '20px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        overflow: 'hidden', position: 'relative', zIndex: 1
      }}>
        {/* Top accent */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #667eea, #764ba2)' }} />

        <div style={{ padding: '32px 28px 28px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(102,126,234,0.4)', marginBottom: '14px'
            }}>
              <i className="fas fa-envelope" style={{ fontSize: '1.4rem', color: '#fff' }}></i>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1f2937', margin: '0 0 4px' }}>
              Forgot Password?
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {/* Role toggle — Buyer / Supplier */}
          <div style={{
            display: 'flex', gap: '8px', marginBottom: '20px',
            background: '#f3f4f6', borderRadius: '10px', padding: '4px'
          }}>
            {[
              { value: 'buyer', label: 'Buyer / Retailer' },
              { value: 'seller', label: 'Supplier' }
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setUserType(opt.value)}
                style={{
                  flex: 1, padding: '8px',
                  border: 'none', borderRadius: '7px',
                  fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: userType === opt.value ? '#fff' : 'transparent',
                  color: userType === opt.value ? '#667eea' : '#9ca3af',
                  boxShadow: userType === opt.value ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Success */}
          {success && (
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px',
              padding: '12px 14px', marginBottom: '16px',
              display: 'flex', alignItems: 'flex-start', gap: '10px'
            }}>
              <i className="fas fa-check-circle" style={{ color: '#16a34a', marginTop: '2px', flexShrink: 0 }}></i>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.83rem', color: '#15803d', marginBottom: '2px' }}>Email Sent!</div>
                <div style={{ fontSize: '0.8rem', color: '#166534' }}>{success}</div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
              padding: '10px 14px', marginBottom: '16px',
              fontSize: '0.83rem', color: '#dc2626',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-exclamation-circle" style={{ flexShrink: 0 }}></i>
                {error}
              </span>
              <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email input — icon inline inside field */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: `1.5px solid ${focused ? '#667eea' : '#e5e7eb'}`,
                borderRadius: '10px', overflow: 'hidden',
                background: '#fafafa', transition: 'border-color 0.2s'
              }}>
                <span style={{
                  padding: '0 12px', color: '#9ca3af',
                  display: 'flex', alignItems: 'center',
                  height: '44px', flexShrink: 0
                }}>
                  <i className="fas fa-envelope" style={{ fontSize: '0.85rem' }}></i>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Email address or phone number"
                  required
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    background: 'transparent', fontSize: '0.88rem',
                    color: '#1f2937', padding: '0 12px 0 0', height: '44px'
                  }}
                />
              </div>
            </div>

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? '#d1d5db' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none', borderRadius: '10px', color: '#fff',
                fontSize: '0.92rem', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(102,126,234,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s', marginBottom: '14px'
              }}
            >
              {loading
                ? <><span className="spinner-border spinner-border-sm" role="status"></span> Sending…</>
                : <><i className="fas fa-paper-plane"></i> Send Reset Link</>
              }
            </button>
          </form>

          {/* Back to login */}
          <div style={{ textAlign: 'center', marginBottom: '18px' }}>
            <Link to="/auth" style={{
              fontSize: '0.83rem', color: '#667eea', textDecoration: 'none',
              fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px'
            }}>
              <i className="fas fa-arrow-left"></i> Back to Login
            </Link>
          </div>

          {/* OR divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          </div>

          {/* WhatsApp OTP — prominent secondary button */}
          <Link
            to="/forgot-password"
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
            <i className="fab fa-whatsapp" style={{ fontSize: '1rem' }}></i>
            Continue with WhatsApp OTP
          </Link>

        </div>
      </div>

      {/* Minimal footer note */}
      <p style={{ marginTop: '24px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', position: 'relative', zIndex: 1 }}>
        Remember your password?{' '}
        <Link to="/auth" style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '600', textDecoration: 'underline' }}>
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default ForgotPasswordToken;
