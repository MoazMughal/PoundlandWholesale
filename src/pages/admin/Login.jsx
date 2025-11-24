import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { API_BASE_URL } from '../../config/api.config';

const AdminLogin = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAdmin();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Clear any seller/buyer tokens before setting admin token
      localStorage.removeItem('sellerToken');
      localStorage.removeItem('sellerData');
      localStorage.removeItem('buyerToken');
      localStorage.removeItem('buyerData');
      
      // Use the AdminContext login function
      login(data.admin, data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-4 col-md-6">
            <div className="card shadow-lg border-0 rounded-4">
              <div className="card-body p-5">
                {/* Header */}
                <div className="text-center mb-4">
                  <div className="mb-3">
                    <i className="fas fa-user-shield fa-3x text-warning"></i>
                  </div>
                  <h2 className="fw-bold mb-2" style={{color: '#1f2937'}}>Admin Portal</h2>
                  <p className="text-muted">Secure administrative access</p>
                </div>

                {/* Error Alert */}
                {error && (
                  <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={() => setError('')}
                    ></button>
                  </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label fw-semibold">
                      Username or Email
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="fas fa-user text-muted"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0 ps-0"
                        id="username"
                        value={credentials.username}
                        onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                        placeholder="Enter admin username or email"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="password" className="form-label fw-semibold">
                      Password
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-end-0">
                        <i className="fas fa-lock text-muted"></i>
                      </span>
                      <input
                        type="password"
                        className="form-control border-start-0 ps-0"
                        id="password"
                        value={credentials.password}
                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                        placeholder="Enter admin password"
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-warning w-100 py-2 fw-semibold rounded-3 text-dark" 
                    disabled={loading}
                  >
                    {loading ? (
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

                {/* Back to Auth Page Button */}
                <div className="mt-3">
                  <Link 
                    to="/auth"
                    className="btn btn-outline-primary w-100 py-2 fw-semibold rounded-3"
                  >
                    <i className="fas fa-arrow-left me-2"></i>
                    Back to Auth Page
                  </Link>
                </div>

                {/* Security Notice */}
                <div className="mt-4 p-3 bg-light rounded-3">
                  <div className="d-flex align-items-center">
                    <i className="fas fa-shield-alt text-success me-2"></i>
                    <small className="text-muted">
                      This is a secure admin area. All activities are logged and monitored.
                    </small>
                  </div>
                </div>

                {/* Back to Site */}
                <div className="text-center mt-4">
                  <Link to="/" className="btn btn-outline-secondary btn-sm">
                    <i className="fas fa-arrow-left me-1"></i>
                    Back to Site
                  </Link>
                </div>
              </div>
            </div>

            {/* Additional Security Info */}
            <div className="text-center mt-4">
              <div className="row text-white">
                <div className="col-4">
                  <i className="fas fa-lock fa-2x mb-2"></i>
                  <p className="small">Encrypted</p>
                </div>
                <div className="col-4">
                  <i className="fas fa-eye fa-2x mb-2"></i>
                  <p className="small">Monitored</p>
                </div>
                <div className="col-4">
                  <i className="fas fa-shield-alt fa-2x mb-2"></i>
                  <p className="small">Protected</p>
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
