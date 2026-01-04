import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getApiUrl } from '../utils/api';

const ResetPassword = () => {
  // Add error boundary
  const [componentError, setComponentError] = useState(null);
  
  // Wrap the component in error handling
  useEffect(() => {
    const handleError = (error) => {
      console.error('ResetPassword component error:', error);
      setComponentError(error.message);
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (componentError) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <h2>Component Error</h2>
        <p>Error: {componentError}</p>
        <a href="/forgot-password-token">Request New Reset Link</a>
      </div>
    );
  }

  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  console.log('🔄 ResetPassword component loaded');
  console.log('🔄 Token from URL:', token);
  console.log('🔄 Search params:', Object.fromEntries(searchParams));
  
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userType, setUserType] = useState('');
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    console.log('🔄 useEffect triggered, calling verifyToken');
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const type = searchParams.get('type') || 'buyer';
      setUserType(type);

      console.log('🔍 Verifying token:', token, 'for type:', type);

      const response = await fetch(
        getApiUrl(`auth/verify-reset-token/${token}?type=${type}`)
      );

      const data = await response.json();
      console.log('🔍 Token verification response:', data);

      if (response.ok) {
        setTokenValid(true);
        setUserEmail(data.email);
        console.log('✅ Token is valid for email:', data.email);
      } else {
        setTokenValid(false);
        setError(data.message || 'Invalid or expired reset token');
        console.error('❌ Token verification failed:', data.message);
      }
    } catch (error) {
      console.error('Token verification error:', error);
      setTokenValid(false);
      setError('Failed to verify reset token. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!formData.newPassword) {
      setError('Please enter a new password');
      return;
    }
    
    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('🔄 Submitting password reset for token:', token, 'userType:', userType);
      
      const response = await fetch(getApiUrl('auth/reset-password-token'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token,
          newPassword: formData.newPassword,
          userType: userType
        })
      });

      const data = await response.json();
      console.log('🔄 Password reset response:', data);

      if (response.ok) {
        setSuccess('Password reset successfully! Redirecting to login...');
        console.log('✅ Password reset successful');
        setTimeout(() => {
          const loginPath = userType === 'buyer' 
            ? '/login/buyer' 
            : userType === 'seller' 
              ? '/login/supplier' 
              : '/auth';
          console.log('🔄 Redirecting to:', loginPath);
          navigate(loginPath);
        }, 2000);
      } else {
        setError(data.message || 'Failed to reset password');
        console.error('❌ Password reset failed:', data.message);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{width: '3rem', height: '3rem'}}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Verifying reset token...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-vh-100 d-flex align-items-center bg-light py-4">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-5 col-md-7">
              <div className="card shadow-lg border-0 rounded-4">
                <div className="card-body p-4 text-center">
                  <div className="mb-3">
                    <i className="fas fa-exclamation-triangle fa-3x text-danger"></i>
                  </div>
                  <h4 className="fw-bold text-dark mb-2">Invalid Reset Link</h4>
                  <p className="text-muted mb-4">{error}</p>
                  
                  <div className="alert alert-warning text-start">
                    <strong>Possible reasons:</strong>
                    <ul className="mb-0 mt-2 small">
                      <li>The link has expired (valid for 10 minutes)</li>
                      <li>The link has already been used</li>
                      <li>The link is invalid or corrupted</li>
                    </ul>
                  </div>

                  <Link to="/forgot-password-token" className="btn btn-primary w-100 mb-2">
                    <i className="fas fa-redo me-2"></i>Request New Reset Link
                  </Link>
                  
                  <Link to="/auth" className="btn btn-outline-secondary w-100">
                    <i className="fas fa-arrow-left me-2"></i>Back to Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex align-items-center py-4" style={{
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      position: 'relative'
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/svg%3E")`,
        opacity: 0.2
      }}></div>
      
      <div className="container position-relative">
        <div className="row justify-content-center">
          <div className="col-lg-5 col-md-7">
            <div className="card shadow-2xl border-0 rounded-4" style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)'
            }}>
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <div className="d-inline-flex align-items-center justify-content-center" style={{
                      width: '80px',
                      height: '80px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderRadius: '50%',
                      boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)'
                    }}>
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '32px', height: '32px'}}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                      </svg>
                    </div>
                  </div>
                  <h4 className="fw-bold text-dark mb-2">Set New Password</h4>
                  <p className="text-muted small mb-0">
                    Create a strong password for: <strong className="text-success">{userEmail}</strong>
                  </p>
                </div>

                {success && (
                  <div className="alert alert-success alert-dismissible fade show mb-3" role="alert">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-check-circle me-2"></i>
                      <small>{success}</small>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      <small>{error}</small>
                    </div>
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={() => setError('')}
                    ></button>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">New Password</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">
                        <i className="fas fa-lock text-muted"></i>
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-control"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        placeholder="Enter new password"
                        minLength="8"
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <i className={`fas fa-eye${showPassword ? '-slash' : ''}`}></i>
                      </button>
                    </div>
                    <div className="form-text small">
                      Password must be at least 8 characters long
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Confirm New Password</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">
                        <i className="fas fa-lock text-muted"></i>
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-control"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm new password"
                        required
                      />
                    </div>
                    {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                      <div className="text-danger small mt-1">
                        <i className="fas fa-times-circle me-1"></i>Passwords do not match
                      </div>
                    )}
                    {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
                      <div className="text-success small mt-1">
                        <i className="fas fa-check-circle me-1"></i>Passwords match
                      </div>
                    )}
                  </div>

                  <div className="alert alert-info py-2 mb-3">
                    <div className="d-flex align-items-start">
                      <i className="fas fa-shield-alt text-info me-2 mt-1"></i>
                      <div>
                        <h6 className="mb-1 small fw-bold">Password Tips:</h6>
                        <ul className="mb-0 small ps-3">
                          <li>Use at least 8 characters</li>
                          <li>Mix uppercase and lowercase letters</li>
                          <li>Include numbers and symbols</li>
                          <li>Avoid common words or patterns</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-success w-100 mb-3 py-2"
                    disabled={loading || formData.newPassword !== formData.confirmPassword}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Resetting Password...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check me-2"></i>Reset Password
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <Link to="/auth" className="text-decoration-none small">
                      <i className="fas fa-arrow-left me-1"></i>Back to Login
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
