import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';

const ResetPassword = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
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
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const type = searchParams.get('type') || 'buyer';
      setUserType(type);

      const response = await fetch(
        `http://localhost:5000/api/auth/verify-reset-token/${token}?type=${type}`
      );

      const data = await response.json();

      if (response.ok) {
        setTokenValid(true);
        setUserEmail(data.email);
      } else {
        setTokenValid(false);
        setError(data.message || 'Invalid or expired reset token');
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
      const response = await fetch('http://localhost:5000/api/auth/reset-password-token', {
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

      if (response.ok) {
        setSuccess('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          const loginPath = userType === 'buyer' 
            ? '/login/buyer' 
            : userType === 'seller' 
              ? '/login/supplier' 
              : '/login';
          navigate(loginPath);
        }, 2000);
      } else {
        setError(data.message || 'Failed to reset password');
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
    <div className="min-vh-100 d-flex align-items-center bg-light py-4">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-5 col-md-7">
            <div className="card shadow-lg border-0 rounded-4">
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <i className="fas fa-lock fa-3x text-success"></i>
                  </div>
                  <h4 className="fw-bold text-dark mb-2">Set New Password</h4>
                  <p className="text-muted small mb-0">
                    Create a strong password for: <strong>{userEmail}</strong>
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
