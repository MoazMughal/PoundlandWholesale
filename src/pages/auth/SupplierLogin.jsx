import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getApiUrl } from '../../utils/api'
import { useSeller } from '../../context/SellerContext'
import '../../styles/AuthLanding.css'

const SupplierLogin = () => {
  const navigate = useNavigate()
  const { login: sellerLogin } = useSeller()
  const [formData, setFormData] = useState({
    username: '',
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
      const response = await fetch(getApiUrl('sellers/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formData.username, // This can be username, email, or WhatsApp number
          password: formData.password
        })
      })

      const data = await response.json()

      if (response.ok) {
        console.log('✅ Login successful, saving auth...')
        
        // Use seller context to login (this will handle redirect)
        await sellerLogin(data.seller, data.token)
        
        // Clear any errors
        setError('')
        
        // Context login will handle navigation, no need to navigate here
        console.log('✅ Auth saved, context will redirect to dashboard')
      } else {
        setError(data.message || 'Invalid credentials. Please check your username/email/WhatsApp and password.')
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
      background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
      padding: '10px 0',
      alignItems: 'flex-start',
      paddingTop: '4vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Elements */}
      <div style={{
        position: 'absolute',
        top: '15%',
        right: '8%',
        width: '90px',
        height: '90px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '50%',
        animation: 'float 7s ease-in-out infinite'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '20%',
        left: '12%',
        width: '60px',
        height: '60px',
        background: 'rgba(255,255,255,0.06)',
        borderRadius: '50%',
        animation: 'float 9s ease-in-out infinite reverse'
      }}></div>
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
                    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                    borderRadius: '50%',
                    boxShadow: '0 8px 25px rgba(40, 167, 69, 0.3)'
                  }}>
                    <i className="fas fa-store fa-2x text-white"></i>
                  </div>
                  <h3 className="fw-bold text-dark mb-1" style={{fontSize: '1.5rem'}}>Supplier Login</h3>
                  <p className="text-muted small mb-0">Manage products & grow business</p>
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
                        <i className="fas fa-user text-success"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-0 py-2"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Username, email, or WhatsApp"
                        required
                        style={{fontSize: '0.9rem'}}
                      />
                    </div>
                    <div className="form-text small text-muted">
                      Login with username, email, or WhatsApp number
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="input-group" style={{borderRadius: '12px', overflow: 'hidden'}}>
                      <span className="input-group-text border-0" style={{
                        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
                      }}>
                        <i className="fas fa-lock text-success"></i>
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
                    <Link to="/forgot-password-token" className="text-decoration-none small text-success">
                      Forgot Password?
                    </Link>
                  </div>

                  <button 
                    type="submit" 
                    className="btn w-100 py-2 fw-semibold mb-2" 
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '0.9rem',
                      boxShadow: '0 4px 15px rgba(40, 167, 69, 0.4)'
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
                        Sign In as Supplier
                      </>
                    )}
                  </button>
                </form>

                {/* Compact Register Link */}
                <div className="text-center mb-2">
                  <Link 
                    to="/register/supplier" 
                    className="btn btn-outline-success w-100 py-2"
                    style={{borderRadius: '12px', fontSize: '0.9rem'}}
                  >
                    <i className="fas fa-user-plus me-2"></i>
                    Create Supplier Account
                  </Link>
                </div>

                {/* Compact Navigation */}
                <div className="row g-2 mb-2">
                  <div className="col-6">
                    <Link to="/login/buyer" className="btn btn-outline-secondary btn-sm w-100" style={{borderRadius: '8px', fontSize: '0.8rem'}}>
                      <i className="fas fa-shopping-cart me-1"></i>
                      Buyer
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
                      <i className="fas fa-users text-success mb-1"></i>
                      <div className="fw-semibold" style={{fontSize: '0.75rem'}}>Customers</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-1">
                      <i className="fas fa-chart-line text-primary mb-1"></i>
                      <div className="fw-semibold" style={{fontSize: '0.75rem'}}>Growth</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-1">
                      <i className="fas fa-handshake text-info mb-1"></i>
                      <div className="fw-semibold" style={{fontSize: '0.75rem'}}>Trusted</div>
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

export default SupplierLogin