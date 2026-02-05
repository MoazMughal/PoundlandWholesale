import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { API_BASE_URL } from '../../config/api.config';
import '../../styles/AdminLogin.css';

const AdminLogin = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoggedIn, authResolved, loading } = useAdmin();

  // Get redirect URL from query params
  const redirectUrl = searchParams.get('redirect') || '/admin/dashboard';

  // Redirect if already logged in - with debugging
  useEffect(() => {
    console.log('🔍 AdminLogin useEffect - isLoggedIn:', isLoggedIn)
    if (isLoggedIn && authResolved && !loading) {
      console.log('🔄 Admin already logged in, redirecting to:', redirectUrl)
      navigate(redirectUrl, { replace: true });
    }
  }, [isLoggedIn, authResolved, loading, navigate, redirectUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      console.log('🔑 Admin login form submitted')
      
      // Clear any existing auth data from localStorage only
      localStorage.removeItem('sellerToken');
      localStorage.removeItem('sellerData');
      localStorage.removeItem('buyerToken');
      localStorage.removeItem('buyerData');
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      console.log('🔑 Server login successful, response data:', {
        hasToken: !!data.token,
        tokenLength: data.token?.length,
        adminData: data.admin,
        message: data.message
      })

      // Use the AdminContext login function and wait for completion
      const result = await login(data.admin, data.token);
      
      if (result.success) {
        console.log('🔑 Context login completed successfully, navigating...')
        
        // Navigate immediately after successful login
        navigate(redirectUrl, { replace: true });
      } else {
        throw new Error('Context login failed');
      }
      
    } catch (err) {
      console.error('❌ Login error:', err)
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex justify-content-center" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      overflow: 'hidden',
      paddingTop: '8vh',
      paddingBottom: '2vh'
    }}>
      {/* Animated Background Elements */}
      <div className="floating-element" style={{
        position: 'absolute',
        top: '5%',
        left: '10%',
        width: '100px',
        height: '100px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '50%'
      }}></div>
      <div className="floating-element" style={{
        position: 'absolute',
        top: '75%',
        right: '15%',
        width: '150px',
        height: '150px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '50%'
      }}></div>
      <div className="floating-element" style={{
        position: 'absolute',
        top: '25%',
        right: '5%',
        width: '80px',
        height: '80px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '50%'
      }}></div>
      <div className="floating-element" style={{
        position: 'absolute',
        bottom: '15%',
        left: '5%',
        width: '60px',
        height: '60px',
        background: 'rgba(255,255,255,0.06)',
        borderRadius: '50%'
      }}></div>
      <div className="floating-element" style={{
        position: 'absolute',
        top: '45%',
        left: '2%',
        width: '40px',
        height: '40px',
        background: 'rgba(255,255,255,0.04)',
        borderRadius: '50%'
      }}></div>

      <div className="container-fluid" style={{alignSelf: 'flex-start'}}>
        <div className="row justify-content-center">
          <div className="col-11 col-sm-8 col-md-6 col-lg-4 col-xl-3">
            <div className="card admin-login-card glass-card border-0" style={{
              borderRadius: '20px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
            }}>
              <div className="card-body p-4">
                {/* Compact Header */}
                <div className="text-center mb-3">
                  <div className="position-relative d-inline-block mb-2">
                    <div className="admin-crown" style={{
                      width: '60px',
                      height: '60px',
                      background: 'linear-gradient(135deg, #ffd700 0%, #ffb347 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      cursor: 'pointer'
                    }}>
                      <i className="fas fa-crown fa-2x text-white"></i>
                    </div>
                    <div style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      width: '20px',
                      height: '20px',
                      background: '#28a745',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <i className="fas fa-shield-alt fa-xs text-white"></i>
                    </div>
                  </div>
                  <h3 className="fw-bold mb-1 gradient-text" style={{fontSize: '1.5rem'}}>
                    Admin Portal
                  </h3>
                  <p className="text-muted small mb-0">Secure Access</p>
                </div>

                {/* Compact Error Alert */}
                {error && (
                  <div className="alert alert-danger py-2 mb-3" style={{borderRadius: '10px', fontSize: '0.85rem'}}>
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                )}

                {/* Compact Login Form */}
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <div className="input-group admin-input-group" style={{borderRadius: '12px', overflow: 'hidden', transition: 'all 0.3s ease'}}>
                      <span className="input-group-text border-0" style={{
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
                      }}>
                        <i className="fas fa-user text-primary"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-0 py-2"
                        value={credentials.username}
                        onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                        placeholder="Admin Username"
                        required
                        style={{fontSize: '0.9rem'}}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="input-group admin-input-group" style={{borderRadius: '12px', overflow: 'hidden', transition: 'all 0.3s ease'}}>
                      <span className="input-group-text border-0" style={{
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
                      }}>
                        <i className="fas fa-lock text-primary"></i>
                      </span>
                      <input
                        type="password"
                        className="form-control border-0 py-2"
                        value={credentials.password}
                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                        placeholder="Password"
                        required
                        style={{fontSize: '0.9rem'}}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn admin-login-btn w-100 py-2 fw-bold mb-3" 
                    disabled={isSubmitting}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '0.9rem',
                      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt me-2"></i>
                        Admin Login
                      </>
                    )}
                  </button>
                </form>

                {/* Compact Navigation */}
                <div className="row g-2">
                  <div className="col-6">
                    <Link 
                      to="/auth"
                      className="btn btn-outline-secondary btn-sm w-100"
                      style={{borderRadius: '8px', fontSize: '0.8rem'}}
                    >
                      <i className="fas fa-users me-1"></i>
                      Auth
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link 
                      to="/" 
                      className="btn btn-outline-secondary btn-sm w-100"
                      style={{borderRadius: '8px', fontSize: '0.8rem'}}
                    >
                      <i className="fas fa-home me-1"></i>
                      Home
                    </Link>
                  </div>
                </div>

                {/* Compact Security Badge */}
                <div className="text-center mt-3">
                  <div className="d-inline-flex align-items-center px-3 py-1 security-badge" style={{
                    borderRadius: '20px',
                    border: '1px solid rgba(40, 167, 69, 0.2)'
                  }}>
                    <i className="fas fa-shield-alt text-success me-2" style={{fontSize: '0.8rem'}}></i>
                    <small className="text-success fw-semibold">Secure & Monitored</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AdminLogin;
