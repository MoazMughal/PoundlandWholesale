import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getApiUrl } from '../../utils/api'

const BuyerLogin = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(getApiUrl('buyer/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email, // This can be email or WhatsApp number
          password: formData.password
        })
      })

      const data = await response.json()

      if (response.ok) {
        // Store buyer data
        localStorage.setItem('buyerToken', data.token)
        localStorage.setItem('buyerData', JSON.stringify(data.buyer))
        
        // Show success message briefly then redirect
        setError('')
        
        // Redirect to buyer dashboard
        navigate('/buyer/dashboard')
      } else {
        setError(data.message || 'Invalid credentials. Please check your email/WhatsApp and password.')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Failed to login. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '10px 0',
      alignItems: 'flex-start',
      paddingTop: '4vh'
    }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-5 col-md-7 col-sm-9">
            <div className="card shadow-lg border-0" style={{
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)'
            }}>
              <div className="card-body p-3">
                {/* Compact Header */}
                <div className="text-center mb-2">
                  <div className="d-inline-flex align-items-center justify-content-center mb-2" style={{
                    width: '60px',
                    height: '60px',
                    background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                    borderRadius: '50%',
                    boxShadow: '0 8px 25px rgba(0, 123, 255, 0.3)'
                  }}>
                    <i className="fas fa-shopping-cart fa-2x text-white"></i>
                  </div>
                  <h3 className="fw-bold text-dark mb-1" style={{fontSize: '1.5rem'}}>Buyer Login</h3>
                  <p className="text-muted small mb-0">Wholesale prices & exclusive deals</p>
                </div>

                {/* Compact Error Message */}
                {error && (
                  <div className="alert alert-danger py-2 mb-3" style={{borderRadius: '10px', fontSize: '0.85rem'}}>
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                )}

                {/* Compact Login Form */}
                <form onSubmit={handleSubmit}>
                  <div className="mb-2">
                    <div className="input-group" style={{borderRadius: '12px', overflow: 'hidden'}}>
                      <span className="input-group-text border-0" style={{
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
                      }}>
                        <i className="fas fa-envelope text-primary"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-0 py-2"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Email or WhatsApp number"
                        required
                        style={{fontSize: '0.9rem'}}
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="input-group" style={{borderRadius: '12px', overflow: 'hidden'}}>
                      <span className="input-group-text border-0" style={{
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
                      }}>
                        <i className="fas fa-lock text-primary"></i>
                      </span>
                      <input
                        type="password"
                        className="form-control border-0 py-2"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Password"
                        required
                        style={{fontSize: '0.9rem'}}
                      />
                    </div>
                  </div>

                  <div className="mb-2 d-flex justify-content-between align-items-center">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="rememberMe"
                        name="rememberMe"
                        checked={formData.rememberMe}
                        onChange={handleChange}
                      />
                      <label className="form-check-label text-muted small" htmlFor="rememberMe">
                        Remember me
                      </label>
                    </div>
                    <Link to="/forgot-password" className="text-decoration-none small text-primary">
                      Forgot Password?
                    </Link>
                  </div>

                  <button 
                    type="submit" 
                    className="btn w-100 py-2 fw-semibold mb-2" 
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '0.9rem',
                      boxShadow: '0 4px 15px rgba(0, 123, 255, 0.4)'
                    }}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Signing In...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt me-2"></i>
                        Sign In as Buyer
                      </>
                    )}
                  </button>
                </form>

                {/* Compact Register Link */}
                <div className="text-center mb-2">
                  <Link 
                    to="/register/buyer" 
                    className="btn btn-outline-primary w-100 py-2"
                    style={{borderRadius: '12px', fontSize: '0.9rem'}}
                  >
                    <i className="fas fa-user-plus me-2"></i>
                    Create Buyer Account
                  </Link>
                </div>

                {/* Compact Navigation */}
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <Link to="/login/supplier" className="btn btn-outline-secondary btn-sm w-100" style={{borderRadius: '8px', fontSize: '0.8rem'}}>
                      <i className="fas fa-store me-1"></i>
                      Supplier
                    </Link>
                  </div>
                  <div className="col-6">
                    <Link to="/admin/login" className="btn btn-outline-warning btn-sm w-100" style={{borderRadius: '8px', fontSize: '0.8rem'}}>
                      <i className="fas fa-crown me-1"></i>
                      Admin
                    </Link>
                  </div>
                </div>

                {/* Compact Benefits */}
                <div className="row g-2 text-center">
                  <div className="col-4">
                    <div className="p-1">
                      <i className="fas fa-tags text-primary mb-1"></i>
                      <div className="fw-semibold" style={{fontSize: '0.75rem'}}>Wholesale</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-1">
                      <i className="fas fa-shield-alt text-success mb-1"></i>
                      <div className="fw-semibold" style={{fontSize: '0.75rem'}}>Verified</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-1">
                      <i className="fas fa-shipping-fast text-info mb-1"></i>
                      <div className="fw-semibold" style={{fontSize: '0.75rem'}}>Fast Ship</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BuyerLogin