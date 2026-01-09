import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const Register = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    contactNo: '',
    whatsappNo: '',
    country: '',
    city: '',
    productCategory: '',
    userType: 'buyer',
    agreeToTerms: false
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
    
    if (formData.password !== formData.confirmPassword) {
      alert('❌ Passwords do not match!')
      return
    }

    if (formData.password.length < 8) {
      alert('❌ Password must be at least 8 characters long')
      return
    }
    
    if (!formData.agreeToTerms) {
      alert('❌ Please agree to the terms and conditions')
      return
    }
    
    setLoading(true)
    
    try {
      let endpoint = 'http://localhost:5000/api/buyer/register'
      let requestBody = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        whatsappNo: formData.whatsappNo,
        userType: formData.userType
      }

      if (formData.userType === 'supplier') {
        endpoint = 'http://localhost:5000/api/sellers/register'
        requestBody = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          whatsappNo: formData.contactNo, // Using contactNo field for WhatsApp
          country: formData.country,
          city: formData.city,
          productCategory: formData.productCategory
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (response.ok) {
        // Redirect directly to login page
        navigate('/login')
      } else {
        alert('❌ ' + data.message)
      }
    } catch (error) {
      console.error('Registration error:', error)
      alert('❌ Failed to register. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Registration Section */}
      <section style={{padding: '20px 0'}}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-6 col-md-8">
              <div className="card shadow border-0">
                <div className="card-body p-3">
                  <div className="text-center mb-2">
                    <h3 className="card-title modern-title" style={{fontSize: '1.3rem', marginBottom: '0.3rem'}}>Create Account</h3>
                    <p className="text-muted section-subtitle" style={{fontSize: '0.75rem', marginBottom: '0.3rem'}}>Join Generic Wholesale community today</p>
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-md-6 mb-1">
                        <label htmlFor="firstName" className="form-label" style={{fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px'}}>First Name</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          style={{fontSize: '0.75rem', padding: '4px 8px', height: '30px'}}
                          required
                        />
                      </div>
                      <div className="col-md-6 mb-1">
                        <label htmlFor="lastName" className="form-label" style={{fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px'}}>Last Name</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          style={{fontSize: '0.75rem', padding: '4px 8px', height: '30px'}}
                          required
                        />
                      </div>
                    </div>

                    <div className="mb-1">
                      <label htmlFor="email" className="form-label" style={{fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px'}}>Email Address</label>
                      <input
                        type="email"
                        className="form-control form-control-sm"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        style={{fontSize: '0.75rem', padding: '4px 8px', height: '30px'}}
                        required
                      />
                    </div>

                    {/* WhatsApp Number for all users */}
                    <div className="mb-1">
                      <label htmlFor="whatsappNo" className="form-label" style={{fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px'}}>WhatsApp Number</label>
                      <input
                        type="tel"
                        className="form-control form-control-sm"
                        id="whatsappNo"
                        name="whatsappNo"
                        value={formData.whatsappNo}
                        onChange={handleChange}
                        style={{fontSize: '0.75rem', padding: '4px 8px', height: '30px'}}
                        placeholder="e.g., +92 300 1234567"
                        required
                      />
                      <div className="form-text" style={{fontSize: '0.65rem', marginTop: '1px'}}>
                        Include country code
                      </div>
                    </div>

                    <div className="mb-1">
                      <label htmlFor="userType" className="form-label" style={{fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px'}}>I want to</label>
                      <select
                        className="form-select form-select-sm"
                        id="userType"
                        name="userType"
                        value={formData.userType}
                        onChange={handleChange}
                        style={{fontSize: '0.75rem', padding: '4px 8px', height: '30px'}}
                        required
                      >
                        <option value="buyer">Buy products (Retailer)</option>
                        <option value="supplier">Sell products (Supplier)</option>
                        <option value="both">Both buy and sell</option>
                      </select>
                    </div>

                    {/* Seller-specific fields */}
                    {formData.userType === 'supplier' && (
                      <>
                        <div className="mb-1">
                          <label htmlFor="username" className="form-label" style={{fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px'}}>Username</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            style={{fontSize: '0.75rem', padding: '4px 8px', height: '30px'}}
                            required
                          />
                        </div>

                        <div className="mb-1">
                          <label htmlFor="contactNo" className="form-label" style={{fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px'}}>WhatsApp Number</label>
                          <input
                            type="tel"
                            className="form-control form-control-sm"
                            id="contactNo"
                            name="contactNo"
                            value={formData.contactNo}
                            onChange={handleChange}
                            style={{fontSize: '0.75rem', padding: '4px 8px', height: '30px'}}
                            placeholder="e.g., +92 300 1234567"
                            required
                          />
                        </div>

                        <div className="row">
                          <div className="col-md-6 mb-1">
                            <label htmlFor="country" className="form-label" style={{fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px'}}>Country</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              id="country"
                              name="country"
                              value={formData.country}
                              onChange={handleChange}
                              style={{fontSize: '0.75rem', padding: '4px 8px', height: '30px'}}
                              required
                            />
                          </div>
                          <div className="col-md-6 mb-1">
                            <label htmlFor="city" className="form-label" style={{fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px'}}>City</label>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              id="city"
                              name="city"
                              value={formData.city}
                              onChange={handleChange}
                              style={{fontSize: '0.75rem', padding: '4px 8px', height: '30px'}}
                              required
                            />
                          </div>
                        </div>

                        <div className="mb-1">
                          <label htmlFor="productCategory" className="form-label" style={{fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px'}}>Product Category</label>
                          <select
                            className="form-select form-select-sm"
                            id="productCategory"
                            name="productCategory"
                            value={formData.productCategory}
                            onChange={handleChange}
                            style={{fontSize: '0.75rem', padding: '4px 8px', height: '30px'}}
                            required
                          >
                            <option value="">Select Category</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Clothing">Clothing & Fashion</option>
                            <option value="Home & Garden">Home & Garden</option>
                            <option value="Sports">Sports & Outdoors</option>
                            <option value="Health">Health & Beauty</option>
                            <option value="Automotive">Automotive</option>
                            <option value="Books">Books & Media</option>
                            <option value="Toys">Toys & Games</option>
                            <option value="Food">Food & Beverages</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div className="mb-1">
                      <label htmlFor="password" className="form-label" style={{fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px'}}>Password</label>
                      <input
                        type="password"
                        className="form-control form-control-sm"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        style={{fontSize: '0.75rem', padding: '4px 8px', height: '30px'}}
                        required
                      />
                      <div className="form-text" style={{fontSize: '0.65rem', marginTop: '1px'}}>
                        Min 8 characters
                      </div>
                    </div>

                    <div className="mb-1">
                      <label htmlFor="confirmPassword" className="form-label" style={{fontSize: '0.75rem', fontWeight: '600', marginBottom: '2px'}}>Confirm Password</label>
                      <input
                        type="password"
                        className="form-control form-control-sm"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        style={{fontSize: '0.75rem', padding: '4px 8px', height: '30px'}}
                        required
                      />
                    </div>

                    <div className="mb-2 form-check">
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

                    <button type="submit" className="btn btn-primary btn-sm w-100 mb-2" style={{fontSize: '0.8rem', padding: '6px', height: '32px'}} disabled={loading}>
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </button>

                    <div className="text-center">
                      <span className="text-muted" style={{fontSize: '0.7rem'}}>Already have an account? </span>
                      <Link to="/login" className="text-decoration-none" style={{fontSize: '0.7rem'}}>
                        Sign In
                      </Link>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Register