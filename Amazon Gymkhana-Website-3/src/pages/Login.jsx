import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSeller } from '../context/SellerContext'

const Login = () => {
  const navigate = useNavigate()
  const { login: sellerLogin } = useSeller()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    userType: 'buyer',
    rememberMe: false
  })
  const [loading, setLoading] = useState(false)

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
    
    try {
      let endpoint = 'http://localhost:5000/api/buyer/login'
      let tokenKey = 'buyerToken'
      let dataKey = 'buyerData'
      let redirectPath = '/buyer/dashboard'

      if (formData.userType === 'seller') {
        endpoint = 'http://localhost:5000/api/sellers/login'
        tokenKey = 'sellerToken'
        dataKey = 'sellerData'
        redirectPath = '/seller/dashboard'
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formData.email, // Can be email or username for sellers
          password: formData.password
        })
      })

      const data = await response.json()

      if (response.ok) {
        if (formData.userType === 'seller') {
          console.log('Seller login successful:', data.seller.username) // Debug log
          sellerLogin(data.seller, data.token)
        } else {
          localStorage.setItem(tokenKey, data.token)
          localStorage.setItem(dataKey, JSON.stringify(data.buyer))
        }
        
        navigate(redirectPath)
      } else {
        alert('❌ Invalid credentials. Please check your username and password.')
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('❌ Failed to login. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Login Section */}
      <section style={{padding: '40px 0'}}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-5 col-md-7">
              <div className="card shadow border-0">
                <div className="card-body p-4">
                  <div className="text-center mb-4">
                    <h3 className="card-title modern-title" style={{fontSize: '1.8rem', marginBottom: '0.5rem'}}>Welcome Back</h3>
                    <p className="text-muted section-subtitle" style={{fontSize: '0.9rem', marginBottom: '0'}}>Sign in to your Generic Wholesale account</p>
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label htmlFor="userType" className="form-label" style={{fontSize: '0.9rem', fontWeight: '600'}}>Login as</label>
                      <select
                        className="form-select"
                        id="userType"
                        name="userType"
                        value={formData.userType}
                        onChange={handleChange}
                        style={{fontSize: '0.9rem', padding: '8px 12px'}}
                        required
                      >
                        <option value="buyer">Buyer/Retailer</option>
                        <option value="seller">Seller/Supplier</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="email" className="form-label" style={{fontSize: '0.9rem', fontWeight: '600'}}>
                        {formData.userType === 'seller' ? 'Username, Email, or WhatsApp' : 'Email or WhatsApp Number'}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder={formData.userType === 'seller' ? 'Username, email, or WhatsApp number' : 'Email or WhatsApp number'}
                        style={{fontSize: '0.9rem', padding: '8px 12px'}}
                        required
                      />
                      <div className="form-text">
                        {formData.userType === 'seller' 
                          ? 'You can login with your username, email, or WhatsApp number'
                          : 'You can login with your email or WhatsApp number'
                        }
                      </div>
                    </div>

                    <div className="mb-3">
                      <label htmlFor="password" className="form-label" style={{fontSize: '0.9rem', fontWeight: '600'}}>Password</label>
                      <input
                        type="password"
                        className="form-control"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter your password"
                        style={{fontSize: '0.9rem', padding: '8px 12px'}}
                        required
                      />
                    </div>

                    <div className="mb-3 d-flex justify-content-between align-items-center">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="rememberMe"
                          name="rememberMe"
                          checked={formData.rememberMe}
                          onChange={handleChange}
                        />
                        <label className="form-check-label" htmlFor="rememberMe" style={{fontSize: '0.85rem'}}>
                          Remember me
                        </label>
                      </div>
                      <Link to="/forgot-password" className="text-decoration-none" style={{fontSize: '0.85rem'}}>
                        Forgot Password?
                      </Link>
                    </div>

                    <button type="submit" className="btn btn-primary w-100 mb-3" style={{fontSize: '0.9rem', padding: '10px'}} disabled={loading}>
                      {loading ? 'Signing In...' : 'Sign In'}
                    </button>

                    <div className="text-center">
                      <span className="text-muted" style={{fontSize: '0.85rem'}}>Don't have an account? </span>
                      <Link to="/auth" className="text-decoration-none" style={{fontSize: '0.85rem'}}>
                        Create Account
                      </Link>
                    </div>

                    <div className="text-center mt-3">
                      <Link to="/admin/login" className="btn btn-outline-warning btn-sm">
                        <i className="fas fa-user-shield me-1"></i>
                        Admin Login
                      </Link>
                    </div>
                  </form>

                  <hr className="my-4" />

                  <div className="text-center">
                    <p className="text-muted mb-3">Or sign in with</p>
                    <div className="d-grid gap-2">
                      <button className="btn btn-outline-danger">
                        <i className="fab fa-google me-2"></i>
                        Continue with Google
                      </button>
                      <button className="btn btn-outline-primary">
                        <i className="fab fa-facebook-f me-2"></i>
                        Continue with Facebook
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section-padding bg-light">
        <div className="container">
          <div className="row">
            <div className="col-12 text-center mb-5">
              <h3>Why Join Amazon Choice?</h3>
            </div>
          </div>
          
          <div className="row">
            <div className="col-lg-4 col-md-6 mb-4">
              <div className="text-center">
                <div className="mb-3">
                  <i className="fas fa-shopping-cart fa-3x text-primary"></i>
                </div>
                <h5>Wholesale Prices</h5>
                <p className="text-muted">Access thousands of Amazon products at wholesale prices with high profit margins.</p>
              </div>
            </div>
            
            <div className="col-lg-4 col-md-6 mb-4">
              <div className="text-center">
                <div className="mb-3">
                  <i className="fas fa-users fa-3x text-primary"></i>
                </div>
                <h5>Trusted Network</h5>
                <p className="text-muted">Connect with verified suppliers and buyers across Pakistan.</p>
              </div>
            </div>
            
            <div className="col-lg-4 col-md-6 mb-4">
              <div className="text-center">
                <div className="mb-3">
                  <i className="fas fa-chart-line fa-3x text-primary"></i>
                </div>
                <h5>Grow Your Business</h5>
                <p className="text-muted">Scale your business with our platform and reach more customers.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Login