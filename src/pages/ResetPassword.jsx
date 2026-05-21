import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getApiUrl } from '../utils/api';

// ── Password strength helpers ────────────────────────────────────────────────
const checks = [
  { id: 'len',    label: 'At least 8 characters',          test: p => p.length >= 8 },
  { id: 'upper',  label: 'Uppercase letter (A–Z)',          test: p => /[A-Z]/.test(p) },
  { id: 'lower',  label: 'Lowercase letter (a–z)',          test: p => /[a-z]/.test(p) },
  { id: 'num',    label: 'Number (0–9)',                    test: p => /\d/.test(p) },
  { id: 'sym',    label: 'Symbol (!@#$…)',                  test: p => /[^A-Za-z0-9]/.test(p) },
];

const getStrength = (p) => {
  const passed = checks.filter(c => c.test(p)).length;
  if (passed <= 1) return { label: 'Weak',   color: '#ef4444', width: '20%' };
  if (passed <= 3) return { label: 'Fair',   color: '#f59e0b', width: '50%' };
  if (passed === 4) return { label: 'Good',  color: '#3b82f6', width: '75%' };
  return              { label: 'Strong', color: '#16a34a', width: '100%' };
};

// ── Shared input styles ──────────────────────────────────────────────────────
const inputRow = (focused) => ({
  display: 'flex', alignItems: 'center',
  border: `1.5px solid ${focused ? '#10b981' : '#e5e7eb'}`,
  borderRadius: '10px', overflow: 'hidden',
  background: '#fafafa', transition: 'border-color 0.2s'
});
const iconSpan = { padding: '0 12px', color: '#9ca3af', display: 'flex', alignItems: 'center', height: '44px', flexShrink: 0 };
const inputSt  = { flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '0.88rem', color: '#1f2937', padding: '0 0 0 0', height: '44px' };
const eyeBtn   = { background: 'none', border: 'none', padding: '0 12px', color: '#9ca3af', cursor: 'pointer', height: '44px', display: 'flex', alignItems: 'center' };

// ── Component ────────────────────────────────────────────────────────────────
const ResetPassword = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [verifying, setVerifying]       = useState(true);
  const [tokenValid, setTokenValid]     = useState(false);
  const [userEmail, setUserEmail]       = useState('');
  const [userType, setUserType]         = useState('buyer');
  const [newPassword, setNewPassword]   = useState('');
  const [confirmPw, setConfirmPw]       = useState('');
  const [showNew, setShowNew]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [focusedNew, setFocusedNew]     = useState(false);
  const [focusedConf, setFocusedConf]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  const strength = getStrength(newPassword);
  const passedChecks = checks.filter(c => c.test(newPassword));
  const passwordsMatch = confirmPw && newPassword === confirmPw;
  const passwordsMismatch = confirmPw && newPassword !== confirmPw;

  useEffect(() => { verifyToken(); }, [token]);

  const verifyToken = async () => {
    try {
      const type = searchParams.get('type') || 'buyer';
      setUserType(type);
      const res = await fetch(getApiUrl(`auth/verify-reset-token/${token}?type=${type}`));
      const data = await res.json();
      if (res.ok) { setTokenValid(true); setUserEmail(data.email); }
      else { setTokenValid(false); setError(data.message || 'Invalid or expired reset link.'); }
    } catch { setTokenValid(false); setError('Failed to verify reset link.'); }
    finally { setVerifying(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPw) { setError('Passwords do not match.'); return; }
    if (passedChecks.length < 3)   { setError('Please create a stronger password.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(getApiUrl('auth/reset-password-token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, userType })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Password reset! Redirecting to login…');
        setTimeout(() => navigate(userType === 'buyer' ? '/login/buyer' : '/login/supplier'), 2000);
      } else { setError(data.message || 'Failed to reset password.'); }
    } catch { setError('Connection error. Please try again.'); }
    finally { setLoading(false); }
  };

  // ── Verifying state ──
  if (verifying) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner-border text-success mb-3" role="status" style={{ width: '2.5rem', height: '2.5rem' }}></div>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Verifying reset link…</p>
      </div>
    </div>
  );

  // ── Invalid token state ──
  if (!tokenValid) return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(160deg, #10b981 0%, #059669 40%, #1f2937 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
      padding: '80px 16px 40px'
    }}>
      <div style={{ width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '20px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #ef4444, #dc2626)' }} />
        <div style={{ padding: '32px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#1f2937', marginBottom: '8px' }}>Invalid Reset Link</h2>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '20px' }}>{error}</p>
          <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: '8px', padding: '12px', textAlign: 'left', marginBottom: '20px', fontSize: '0.8rem', color: '#713f12' }}>
            <strong>Possible reasons:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: '16px' }}>
              <li>Link expired (valid for 10 minutes)</li>
              <li>Link already used</li>
              <li>Link is invalid or corrupted</li>
            </ul>
          </div>
          <Link to="/forgot-password-token" style={{ display: 'block', padding: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', fontSize: '0.88rem', marginBottom: '8px' }}>
            Request New Reset Link
          </Link>
          <Link to="/auth" style={{ display: 'block', padding: '10px', border: '1.5px solid #e5e7eb', borderRadius: '10px', color: '#6b7280', textDecoration: 'none', fontSize: '0.85rem' }}>
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );

  // ── Main form ──
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #10b981 0%, #059669 40%, #1f2937 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start',
      padding: '80px 16px 40px', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Card */}
      <div style={{ width: '100%', maxWidth: '420px', background: '#fff', borderRadius: '20px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #10b981, #059669)' }} />

        <div style={{ padding: '32px 28px 28px' }}>

          {/* Brand logo → home */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <a href="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: '1rem', fontWeight: '800', color: '#ff6600', letterSpacing: '-0.5px' }}>
                Poundland<span style={{ color: '#1f2937' }}>Wholesale</span><span style={{ fontSize: '0.6rem', color: '#9ca3af', fontWeight: '600' }}>.com</span>
              </span>
            </a>
          </div>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(16,185,129,0.4)', marginBottom: '12px' }}>
              <i className="fas fa-lock" style={{ fontSize: '1.4rem', color: '#fff' }}></i>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#1f2937', margin: '0 0 4px' }}>Set New Password</h2>
            <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: 0 }}>
              For: <strong style={{ color: '#059669' }}>{userEmail}</strong>
            </p>
          </div>

          {/* Success */}
          {success && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.83rem', color: '#15803d' }}>
              <i className="fas fa-check-circle" style={{ flexShrink: 0 }}></i> {success}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.83rem', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><i className="fas fa-exclamation-circle" style={{ flexShrink: 0 }}></i>{error}</span>
              <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0 }}><i className="fas fa-times"></i></button>
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* New Password */}
            <div style={{ marginBottom: '6px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>New Password</label>
              <div style={inputRow(focusedNew)}>
                <span style={iconSpan}><i className="fas fa-lock" style={{ fontSize: '0.85rem' }}></i></span>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  onFocus={() => setFocusedNew(true)}
                  onBlur={() => setFocusedNew(false)}
                  placeholder=""
                  aria-label="New password"
                  required
                  style={inputSt}
                />
                <button type="button" style={eyeBtn} onClick={() => setShowNew(p => !p)} aria-label={showNew ? 'Hide password' : 'Show password'}>
                  <i className={`fas fa-eye${showNew ? '-slash' : ''}`} style={{ fontSize: '0.85rem' }}></i>
                </button>
              </div>
            </div>

            {/* Strength meter */}
            {newPassword && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
                  <div style={{ height: '100%', width: strength.width, background: strength.color, borderRadius: '4px', transition: 'all 0.3s' }} />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: strength.color }}>{strength.label}</span>
              </div>
            )}

            {/* Interactive checklist */}
            {newPassword && (
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px' }}>
                {checks.map(c => {
                  const ok = c.test(newPassword);
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px', fontSize: '0.78rem', color: ok ? '#16a34a' : '#9ca3af', transition: 'color 0.2s' }}>
                      <i className={`fas fa-${ok ? 'check-circle' : 'circle'}`} style={{ fontSize: '0.7rem', flexShrink: 0 }}></i>
                      {c.label}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Confirm Password */}
            <div style={{ marginBottom: '6px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>Confirm New Password</label>
              <div style={inputRow(focusedConf)}>
                <span style={iconSpan}><i className="fas fa-lock" style={{ fontSize: '0.85rem' }}></i></span>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  onFocus={() => setFocusedConf(true)}
                  onBlur={() => setFocusedConf(false)}
                  placeholder=""
                  aria-label="Confirm new password"
                  required
                  style={inputSt}
                />
                <button type="button" style={eyeBtn} onClick={() => setShowConfirm(p => !p)} aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                  <i className={`fas fa-eye${showConfirm ? '-slash' : ''}`} style={{ fontSize: '0.85rem' }}></i>
                </button>
              </div>
            </div>

            {/* Match indicator */}
            {confirmPw && (
              <div style={{ fontSize: '0.75rem', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '5px', color: passwordsMatch ? '#16a34a' : '#ef4444' }}>
                <i className={`fas fa-${passwordsMatch ? 'check-circle' : 'times-circle'}`}></i>
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </div>
            )}
            {!confirmPw && <div style={{ marginBottom: '18px' }} />}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || passwordsMismatch || !newPassword || !confirmPw}
              style={{
                width: '100%', padding: '13px',
                background: (loading || passwordsMismatch || !newPassword || !confirmPw) ? '#d1d5db' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none', borderRadius: '10px', color: '#fff',
                fontSize: '0.92rem', fontWeight: '700',
                cursor: (loading || passwordsMismatch || !newPassword || !confirmPw) ? 'not-allowed' : 'pointer',
                boxShadow: (loading || passwordsMismatch) ? 'none' : '0 4px 14px rgba(16,185,129,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s', marginBottom: '14px'
              }}
            >
              {loading
                ? <><span className="spinner-border spinner-border-sm" role="status"></span> Resetting…</>
                : <><i className="fas fa-check"></i> Reset Password</>
              }
            </button>
          </form>

          <div style={{ textAlign: 'center' }}>
            <Link to="/auth" style={{ fontSize: '0.83rem', color: '#10b981', textDecoration: 'none', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <i className="fas fa-arrow-left"></i> Back to Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
