import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getApiUrl } from '../../utils/api'
import '../../styles/AuthLanding.css'

const SupplierRegister = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    whatsappNo: '',
    country: '',
    city: '',
    productCategory: '',
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
      const response = await fetch(getApiUrl('sellers/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          whatsappNo: formData.whatsappNo,
          country: formData.country,
          city: formData.city,
          productCategory: formData.productCategory
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        // Auto redirect after 3 seconds
        setTimeout(() => {
          navigate('/login/supplier')
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
          <div className="col-lg-7 col-md-9">
            <div className="card shadow-lg border-0 rounded-3">
              <div className="card-body p-3">
                {/* Header */}
                <div className="text-center mb-2">
                  <div className="mb-1">
                    <i className="fas fa-store fa-2x text-success"></i>
                  </div>
                  <h4 className="fw-bold text-dark mb-1" style={{fontSize: '1.2rem'}}>Create Supplier Account</h4>
                  <p className="text-muted mb-0" style={{fontSize: '0.75rem'}}>Start selling to thousands of verified buyers</p>
                </div>

                {/* Success Message */}
                {success && (
                  <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
                    <div className="d-flex align-items-center">
                      <i className="fas fa-check-circle fa-2x text-success me-3"></i>
                      <div>
                        <h5 className="alert-heading mb-1">🎉 Welcome to Amazon Choice!</h5>
                        <p className="mb-1">Your supplier account has been created successfully!</p>
                        <small className="text-muted">
                          Redirecting to login...
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
                    <div className="col-md-6 mb-3">
                      <label htmlFor="username" className="form-label fw-semibold">
                        Username <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Choose a unique username"
                        required
                      />
                      <div className="form-text small">
                        This will be your unique identifier on the platform
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="email" className="form-label fw-semibold">
                        Email Address <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light">
                          <i className="fas fa-envelope text-muted"></i>
                        </span>
                        <input
                          type="email"
                          className="form-control"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="whatsappNo" className="form-label fw-semibold">
                      WhatsApp Number <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">
                        <i className="fab fa-whatsapp text-success"></i>
                      </span>
                      <input
                        type="tel"
                        className="form-control"
                        id="whatsappNo"
                        name="whatsappNo"
                        value={formData.whatsappNo}
                        onChange={handleChange}
                        placeholder="e.g., +92 300 1234567"
                        required
                      />
                    </div>
                    <div className="form-text small">
                      Include country code. Buyers will contact you via WhatsApp.
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="country" className="form-label fw-semibold">
                        Country <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleChange}
                        placeholder="e.g., Pakistan"
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="city" className="form-label fw-semibold">
                        City <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="e.g., Karachi"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="productCategory" className="form-label fw-semibold">
                      Primary Product Category <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      id="productCategory"
                      name="productCategory"
                      value={formData.productCategory}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select your main product category</option>
                      <option value="Automotive">Automotive</option>
                      <option value="Baby Products">Baby Products</option>
                      <option value="Balloons">Balloons</option>
                      <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                      <option value="Books & Media">Books & Media</option>
                      <option value="Clothing & Fashion">Clothing & Fashion</option>
                      <option value="Computers & Accessories">Computers & Accessories</option>
                      <option value="Electronics & Gadgets">Electronics & Gadgets</option>
                      <option value="Fashion Jewelry">Fashion Jewelry</option>
                      <option value="Food & Beverages">Food & Beverages</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Garden & Outdoor">Garden & Outdoor</option>
                      <option value="Gift & Craft Supplies">Gift & Craft Supplies</option>
                      <option value="Health & Beauty">Health & Beauty</option>
                      <option value="Home & Garden">Home & Garden</option>
                      <option value="Home & Kitchen">Home & Kitchen</option>
                      <option value="Home Decor">Home Decor</option>
                      <option value="Home Improvement">Home Improvement</option>
                      <option value="Industrial & Scientific">Industrial & Scientific</option>
                      <option value="Jewelry & Accessories">Jewelry & Accessories</option>
                      <option value="Kitchen & Dining">Kitchen & Dining</option>
                      <option value="Lighting">Lighting</option>
                      <option value="Musical Instruments">Musical Instruments</option>
                      <option value="Office & Business">Office & Business</option>
                      <option value="Office Products">Office Products</option>
                      <option value="Party Accessories">Party Accessories</option>
                      <option value="Pet Supplies">Pet Supplies</option>
                      <option value="Sports & Outdoors">Sports & Outdoors</option>
                      <option value="Stationery">Stationery</option>
                      <option value="Tools & Home Improvement">Tools & Home Improvement</option>
                      <option value="Toys & Games">Toys & Games</option>
                      <option value="Other">Other</option>
                    </select>
                    <div className="form-text small">
                      Select the category that best represents your main products
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="password" className="form-label fw-semibold">
                        Password <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light">
                          <i className="fas fa-lock text-muted"></i>
                        </span>
                        <input
                          type="password"
                          className="form-control"
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Create a strong password"
                          required
                        />
                      </div>
                      <div className="form-text small">
                        Minimum 8 characters
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="confirmPassword" className="form-label fw-semibold">
                        Confirm Password <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text bg-light">
                          <i className="fas fa-lock text-muted"></i>
                        </span>
                        <input
                          type="password"
                          className="form-control"
                          id="confirmPassword"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          placeholder="Confirm your password"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="agreeToTerms"
                        name="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onChange={handleChange}
                        required
                      />
                      <label className="form-check-label" htmlFor="agreeToTerms">
                        I agree to the <Link to="/terms" className="text-decoration-none">Terms of Service</Link>, <Link to="/privacy" className="text-decoration-none">Privacy Policy</Link>, and <Link to="/seller-agreement" className="text-decoration-none">Seller Agreement</Link>
                      </label>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-success w-100 py-2 fw-semibold rounded-3 mb-3" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Creating Account...
                      </>
                    ) : (
                      'Create Supplier Account'
                    )}
                  </button>

                  <div className="text-center">
                    <span className="text-muted">Already have an account? </span>
                    <Link to="/login/supplier" className="text-decoration-none fw-semibold">
                      Sign In
                    </Link>
                  </div>
                </form>

                {/* Other Options */}
                <div className="text-center mt-4">
                  <hr className="my-3" />
                  <p className="text-muted small mb-2">Looking to buy products instead?</p>
                  <Link to="/register/buyer" className="btn btn-outline-primary btn-sm">
                    Create Buyer Account
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

export default SupplierRegister