import { useState } from 'react';
import { Link } from 'react-router-dom';

const ForgotPasswordToken = () => {
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState('buyer');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          userType: userType
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setEmail(''); // Clear email field
        
        // Log development info if available
        if (data.developmentUrl) {
          console.log('Development Reset URL:', data.developmentUrl);
          console.log('Development Token:', data.developmentToken);
        }
      } else {
        setError(data.message || 'Failed to send reset link');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('Failed to send reset link. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light py-4">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-5 col-md-7">
            <div className="card shadow-lg border-0 rounded-4">
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <i className="fas fa-envelope fa-3x text-primary"></i>
                  </div>
                  <h4 className="fw-bold text-dark mb-2">Forgot Password?</h4>
                  <p className="text-muted small mb-0">
                    Enter your email and we'll send you a secure reset link
                  </p>
                </div>

                {success && (
                  <div className="alert alert-success alert-dismissible fade show mb-3" role="alert">
                    <div className="d-flex align-items-start">
                      <i className="fas fa-check-circle me-2 mt-1"></i>
                      <div>
                        <strong>Email Sent!</strong>
                        <p className="mb-0 small mt-1">{success}</p>
                        <p className="mb-0 small mt-2">
                          <i className="fas fa-info-circle me-1"></i>
                          Check your inbox and spam folder
                        </p>
                      </div>
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
                    <label className="form-label fw-semibold small">Account Type</label>
                    <select
                      className="form-select"
                      value={userType}
                      onChange={(e) => setUserType(e.target.value)}
                    >
                      <option value="buyer">Buyer/Retailer</option>
                      <option value="seller">Seller/Supplier</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Email Address</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">
                        <i className="fas fa-envelope text-muted"></i>
                      </span>
                      <input
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>

                  <div className="alert alert-info py-2 mb-3">
                    <div className="d-flex align-items-start">
                      <i className="fas fa-info-circle text-info me-2 mt-1"></i>
                      <div>
                        <h6 className="mb-1 small fw-bold">How it works:</h6>
                        <ol className="mb-0 small ps-3">
                          <li>Enter your email address</li>
                          <li>Receive a secure reset link</li>
                          <li>Link expires in 10 minutes</li>
                          <li>Set your new password</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary w-100 mb-3 py-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Sending Reset Link...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-2"></i>Send Reset Link
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <Link to="/auth" className="text-decoration-none small">
                      <i className="fas fa-arrow-left me-1"></i>Back to Login
                    </Link>
                  </div>
                </form>

                <hr className="my-3" />

                <div className="text-center">
                  <p className="small text-muted mb-2">Prefer OTP verification?</p>
                  <Link to="/forgot-password" className="btn btn-outline-secondary btn-sm">
                    <i className="fab fa-whatsapp me-1"></i>Use WhatsApp OTP
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordToken;
