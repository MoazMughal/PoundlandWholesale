import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getApiUrl } from '../../utils/api'
import '../../styles/AuthLanding.css'

const BuyerRegister = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    whatsappNo: '',
    agreeToTerms: false
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
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
    setError('')
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match!')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }
    
    if (!formData.agreeToTerms) {
      setError('Please agree to the terms and conditions')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch(getApiUrl('buyer/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          whatsappNo: formData.whatsappNo,
          userType: 'buyer'
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        // Auto redirect after 3 seconds
        setTimeout(() => {
          navigate('/login/buyer')
        }, 3000)
      } else {
        setError(data.message || 'Registration failed. Please try again.')
      }
    } catch (error) {
      console.error('Registration error:', error)
      setError('Failed to register. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light py-2">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-8">
            <div className="card shadow-lg border-0 rounded-3">
              <div className="card-body p-3">
                {/* Header */}
                <div className="text-center mb-2">
                  <div className="mb-1">
                    <i className="fas fa-shopping-cart fa-2x text-primary"></i>
                  </div>
                  <h4 className="fw-bold text-dark mb-1" style={{fontSize: '1.2rem'}}>Create Buyer Account</h4>
                  <p className="text-muted mb-0" style={{fontSize: '0.75rem'}}>Join thousands of retailers getting wholesale prices</p>
                </div>

                {/* Success Message */}
                {success && (
                  <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-check-circle fa-2x text-success me-3"></i>
                      <div>
                        <h5 className="alert-heading mb-1">🎉 Welcome to Amazon Choice!</h5>
                        <p className="mb-1">Your buyer account has been created successfully!</p>
                        <small className="text-muted">
                          You can now access wholesale products and connect with verified suppliers. Redirecting to login...
                        </small>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      {error}
                    </div>
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={() => setError('')}
                    ></button>
                  </div>
                )}

                {/* Registration Form */}
                <form onSubmit={handleSubmit} style={{ display: success ? 'none' : 'block' }}>
                  <div className="row">
                    <div className="col-md-6 mb-2">
                      <label htmlFor="firstName" className="form-label" style={{fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px'}}>
                        First Name
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="First name"
                        style={{fontSize: '0.75rem', padding: '4px 8px', height: '30px'}}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-2">
                      <label htmlFor="lastName" className="form-label" style={{fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px'}}>
                        Last Name
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        placeholder="Last name"
                        style={{fontSize: '0.75rem', padding: '4px 8px', height: '30px'}}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-2">
                    <label htmlFor="email" className="form-label" style={{fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px'}}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="form-control form-control-sm"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      style={{fontSize: '0.75rem', padding: '4px 8px', height: '30px'}}
                      required
                    />
                  </div>

                  <div className="mb-2">
                    <label htmlFor="whatsappNo" className="form-label" style={{fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px'}}>
                      WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      className="form-control form-control-sm"
                      id="whatsappNo"
                      name="whatsappNo"
                      value={formData.whatsappNo}
                      onChange={handleChange}
                      placeholder="+92 300 1234567"
                      style={{fontSize: '0.75rem', padding: '4px 8px', height: '30px'}}
                      required
                    />
                    <div className="form-text" style={{fontSize: '0.65rem', marginTop: '1px'}}>
                      Include country code
                    </div>
                  </div>

                  <div className="mb-2">
                    <label htmlFor="password" className="form-label" style={{fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px'}}>
                      Password
                    </label>
                    <input
                      type="password"
                      className="form-control form-control-sm"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min 8 characters"
                      style={{fontSize: '0.75rem', padding: '4px 8px', height: '30px'}}
                      required
                    />
                  </div>

                  <div className="mb-2">
                    <label htmlFor="confirmPassword" className="form-label" style={{fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px'}}>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      className="form-control form-control-sm"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm password"
                      style={{fontSize: '0.75rem', padding: '4px 8px', height: '30px'}}
                      required
                    />
                  </div>

                  <div className="mb-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="agreeToTerms"
                        name="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onChange={handleChange}
                        style={{transform: 'scale(0.9)'}}
                        required
                      />
                      <label className="form-check-label" htmlFor="agreeToTerms" style={{fontSize: '0.7rem'}}>
                        I agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>
                      </label>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary w-100 rounded-2 mb-2" 
                    style={{fontSize: '0.8rem', padding: '6px', height: '32px'}}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" style={{width: '0.8rem', height: '0.8rem'}}></span>
                        Creating...
                      </>
                    ) : (
                      'Create Buyer Account'
                    )}
                  </button>

                  <div className="text-center">
                    <span className="text-muted" style={{fontSize: '0.7rem'}}>Already have an account? </span>
                    <Link to="/login/buyer" className="text-decoration-none" style={{fontSize: '0.7rem'}}>
                      Sign In
                    </Link>
                  </div>
                </form>

                {/* Other Options */}
                <div className="text-center mt-2">
                  <hr className="my-2" />
                  <p className="text-muted mb-1" style={{fontSize: '0.7rem'}}>Want to sell products instead?</p>
                  <Link to="/register/supplier" className="btn btn-outline-success btn-sm" style={{fontSize: '0.7rem', padding: '3px 10px'}}>
                    Create Supplier Account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BuyerRegister