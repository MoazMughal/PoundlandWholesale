import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { API_BASE_URL } from '../../config/api.config';

// ── Inline styles shared across inputs ──────────────────────────────────────
const inputWrap = (focused) => ({
  display: 'flex', alignItems: 'center',
  border: `1.5px solid ${focused ? '#667eea' : '#e5e7eb'}`,
  borderRadius: '10px', overflow: 'hidden',
  background: '#fafafa', transition: 'border-color 0.2s'
});

const iconSpan = {
  padding: '0 12px', color: '#9ca3af',
  display: 'flex', alignItems: 'center',
  height: '44px', flexShrink: 0
};

const inputStyle = {
  flex: 1, border: 'none', outline: 'none',
  background: 'transparent', fontSize: '0.88rem',
  color: '#1f2937', padding: '0 12px 0 0', height: '44px'
};

// ── Component ────────────────────────────────────────────────────────────────
const AdminLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoggedIn, authResolved, loading } = useAdmin();
  const redirectUrl = searchParams.get('redirect') || '/admin/dashboard';

  // Step: 'credentials' | 'verify'
  const [step, setStep] = useState('credentials');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (isLoggedIn && authResolved && !loading) {
      navigate(redirectUrl, { replace: true });
    }
  }, [isLoggedIn, authResolved, loading, navigate, redirectUrl]);

  const handleCredentials = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      localStorage.removeItem('sellerToken');
      localStorage.removeItem('buyerToken');
      localStorage.removeItem('adminToken');

      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      const result = await login(data.admin, data.token);
      if (result.success) {
        // In a real 2FA setup you'd transition to verify step here.
        // For now, go straight to dashboard after successful auth.
        navigate(redirectUrl, { replace: true });
      } else {
        throw new Error('Authentication failed');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // OTP input handler
  const handleOtpChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKey = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  return (
    // Full-screen blank canvas — no header/footer
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 50%, #1f2937 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start',
      padding: '80px 16px 40px',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Subtle orb */}
      <div style={{
        position: 'absolute', top: '-15%', right: '-10%',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(102,126,234,0.15) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: '400px',
        background: '#fff', borderRadius: '20px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        overflow: 'hidden', position: 'relative', zIndex: 1
      }}>
        {/* Top accent */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #667eea, #764ba2)' }} />

        <div style={{ padding: '32px 28px 28px' }}>

          {/* Logo → home */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
              <span style={{ fontSize: '1rem', fontWeight: '800', color: '#ff6600', letterSpacing: '-0.5px' }}>
                Poundland<span style={{ color: '#1f2937' }}>Wholesale</span>
                <span style={{ fontSize: '0.6rem', color: '#9ca3af', fontWeight: '600' }}>.com</span>
              </span>
            </a>
          </div>

          {/* Icon + title */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(102,126,234,0.4)', marginBottom: '12px',
              position: 'relative'
            }}>
              <i className="fas fa-crown" style={{ fontSize: '1.4rem', color: '#ffd700' }}></i>
              {/* Shield dot */}
              <div style={{
                position: 'absolute', top: '-4px', right: '-4px',
                width: '18px', height: '18px', borderRadius: '50%',
                background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #fff'
              }}>
                <i className="fas fa-shield-alt" style={{ fontSize: '7px', color: '#fff' }}></i>
              </div>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#1f2937', margin: '0 0 2px' }}>
              Admin Portal
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0 0 10px' }}>
              Secure Access
            </p>

            {/* Security badge — directly under subtitle */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: '20px', padding: '4px 12px', marginBottom: '4px'
            }}>
              <i className="fas fa-shield-alt" style={{ fontSize: '0.7rem', color: '#16a34a' }}></i>
              <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: '700' }}>
                Secure &amp; Monitored
              </span>
            </div>
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

          {/* ── Step 1: Credentials ── */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentials}>
              <div style={{ marginBottom: '12px' }}>
                <div style={inputWrap(focusedField === 'username')}>
                  <span style={iconSpan}>
                    <i className="fas fa-user" style={{ fontSize: '0.85rem' }}></i>
                  </span>
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={e => setCredentials(p => ({ ...p, username: e.target.value }))}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Admin Username"
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={inputWrap(focusedField === 'password')}>
                  <span style={iconSpan}>
                    <i className="fas fa-lock" style={{ fontSize: '0.85rem' }}></i>
                  </span>
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={e => setCredentials(p => ({ ...p, password: e.target.value }))}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Password"
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%', padding: '13px',
                  background: isSubmitting ? '#d1d5db' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none', borderRadius: '10px', color: '#fff',
                  fontSize: '0.92rem', fontWeight: '700',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: isSubmitting ? 'none' : '0 4px 14px rgba(102,126,234,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                {isSubmitting
                  ? <><span className="spinner-border spinner-border-sm" role="status"></span> Authenticating…</>
                  : <><i className="fas fa-sign-in-alt"></i> Admin Login</>
                }
              </button>
            </form>
          )}

          {/* ── Step 2: 2FA verification (UI slot — wire to backend when ready) ── */}
          {step === 'verify' && (
            <div>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', textAlign: 'center', marginBottom: '16px' }}>
                Enter the 6-digit code sent to your authenticator app.
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => otpRefs.current[idx] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(idx, e.target.value)}
                    onKeyDown={e => handleOtpKey(idx, e)}
                    style={{
                      width: '44px', height: '52px', textAlign: 'center',
                      fontSize: '1.3rem', fontWeight: '700', color: '#1f2937',
                      border: `2px solid ${digit ? '#667eea' : '#e5e7eb'}`,
                      borderRadius: '10px', outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  />
                ))}
              </div>
              <button
                onClick={() => { /* wire 2FA verify here */ }}
                style={{
                  width: '100%', padding: '13px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none', borderRadius: '10px', color: '#fff',
                  fontSize: '0.92rem', fontWeight: '700', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(102,126,234,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <i className="fas fa-check-circle"></i> Verify Code
              </button>
              <button
                onClick={() => { setStep('credentials'); setError(''); setOtp(['','','','','','']); }}
                style={{
                  width: '100%', marginTop: '8px', padding: '10px',
                  background: 'none', border: 'none', color: '#9ca3af',
                  fontSize: '0.82rem', cursor: 'pointer'
                }}
              >
                ← Back to login
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Minimal footer note */}
      <p style={{ marginTop: '24px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', position: 'relative', zIndex: 1 }}>
        Unauthorised access is prohibited and monitored.
      </p>
    </div>
  );
};

export default AdminLogin;
