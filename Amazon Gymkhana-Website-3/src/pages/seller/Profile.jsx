import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeller } from '../../context/SellerContext'

const SellerProfile = () => {
  const navigate = useNavigate()
  const { seller, isLoggedIn, loading: contextLoading, updateSeller } = useSeller()
  const [formData, setFormData] = useState({
    contactNo: '',
    country: '',
    city: '',
    productCategory: ''
  })
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    // Wait for context to finish loading
    if (contextLoading) return
    
    // If not logged in, redirect to login
    if (!isLoggedIn || !seller) {
      navigate('/login/supplier')
      return
    }

    // Set form data from seller context
    setFormData({
      contactNo: seller.contactNo || '',
      country: seller.country || '',
      city: seller.city || '',
      productCategory: seller.productCategory || ''
    })
  }, [navigate, isLoggedIn, seller, contextLoading])



  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUpdating(true)

    try {
      const token = localStorage.getItem('sellerToken')
      const response = await fetch('http://localhost:5000/api/sellers/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ Profile updated successfully!')
        updateSeller(data.seller)
      } else {
        alert('❌ ' + data.message)
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('❌ Failed to update profile')
    } finally {
      setUpdating(false)
    }
  }

  if (contextLoading || loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!contextLoading && !seller) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">
          Error loading profile. Please try again.
          <button 
            className="btn btn-primary ms-2" 
            onClick={() => navigate('/login/supplier')}
          >
            Login Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-md-8">
          <h2>Seller Profile</h2>
          <p className="text-muted">Manage your seller account information</p>
        </div>
        <div className="col-md-4 text-end">
          <button className="btn btn-secondary" onClick={() => navigate('/seller/dashboard')}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
        </div>
      </div>

      <div className="row">
        {/* Profile Form */}
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h5><i className="fas fa-user-edit"></i> Edit Profile</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="username" className="form-label">Username</label>
                    <input
                      type="text"
                      className="form-control"
                      id="username"
                      value={seller.username}
                      disabled
                    />
                    <div className="form-text">Username cannot be changed</div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="email" className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      value={seller.email}
                      disabled
                    />
                    <div className="form-text">Email cannot be changed</div>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="contactNo" className="form-label">Contact Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      id="contactNo"
                      name="contactNo"
                      value={formData.contactNo}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="productCategory" className="form-label">Product Category</label>
                    <select
                      className="form-select"
                      id="productCategory"
                      name="productCategory"
                      value={formData.productCategory}
                      onChange={handleChange}
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
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="country" className="form-label">Country</label>
                    <input
                      type="text"
                      className="form-control"
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="city" className="form-label">City</label>
                    <input
                      type="text"
                      className="form-control"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <button 
                    type="button" 
                    className="btn btn-secondary me-md-2"
                    onClick={() => navigate('/seller/dashboard')}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={updating}
                  >
                    {updating ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h5><i className="fas fa-info-circle"></i> Account Information</h5>
            </div>
            <div className="card-body">
              <table className="table table-borderless table-sm">
                <tbody>
                  <tr>
                    <td><strong>Supplier ID:</strong></td>
                    <td>{seller.supplierId}</td>
                  </tr>
                  <tr>
                    <td><strong>Status:</strong></td>
                    <td>
                      <span className={`badge bg-${
                        seller.status === 'approved' ? 'success' : 
                        seller.status === 'pending' ? 'warning' : 'danger'
                      }`}>
                        {seller.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Can List Products:</strong></td>
                    <td>
                      <span className={`badge bg-${seller.canListProducts ? 'success' : 'danger'}`}>
                        {seller.canListProducts ? 'YES' : 'NO'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Registration Payment:</strong></td>
                    <td>
                      <span className={`badge bg-${seller.hasRegistrationPayment ? 'success' : 'warning'}`}>
                        {seller.hasRegistrationPayment ? 'COMPLETED' : 'PENDING'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Member Since:</strong></td>
                    <td>{new Date(seller.createdAt).toLocaleDateString()}</td>
                  </tr>
                  {seller.approvedAt && (
                    <tr>
                      <td><strong>Approved On:</strong></td>
                      <td>{new Date(seller.approvedAt).toLocaleDateString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Status Help */}
          <div className="card mt-3">
            <div className="card-header">
              <h6><i className="fas fa-question-circle"></i> Need Help?</h6>
            </div>
            <div className="card-body">
              <small className="text-muted">
                {seller.status === 'pending' && (
                  <p>Your account is under review. You'll receive an email once approved.</p>
                )}
                {seller.status === 'approved' && !seller.hasRegistrationPayment && (
                  <p>Complete your registration payment to start listing products.</p>
                )}
                {seller.canListProducts && (
                  <p>You're all set! You can now add products and list admin products.</p>
                )}
                <p>For support, contact: <a href="mailto:support@amazongymkhana.com">support@amazongymkhana.com</a></p>
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SellerProfile