import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeller } from '../../context/SellerContext'

const EditProfile = () => {
  const navigate = useNavigate()
  const { seller, isLoggedIn, updateSeller } = useSeller()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    whatsappNo: '',
    contactNo: '',
    country: '',
    city: '',
    productCategory: ''
  })

  useEffect(() => {
    if (!isLoggedIn || !seller) {
      navigate('/login/supplier')
      return
    }

    // Populate form with current seller data
    setFormData({
      username: seller.username || '',
      email: seller.email || '',
      whatsappNo: seller.whatsappNo || '',
      contactNo: seller.contactNo || '',
      country: seller.country || '',
      city: seller.city || '',
      productCategory: seller.productCategory || ''
    })
  }, [seller, isLoggedIn, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem('sellerToken')
      const response = await fetch('http://localhost:5000/api/sellers/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          whatsappNo: formData.whatsappNo,
          contactNo: formData.contactNo,
          country: formData.country,
          city: formData.city,
          productCategory: formData.productCategory
        })
      })

      const data = await response.json()

      if (response.ok) {
        updateSeller(data.seller)
        alert('✅ Profile updated successfully!')
        navigate('/seller/dashboard')
      } else {
        alert('❌ ' + data.message)
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('❌ Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (!seller) {
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

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h4><i className="fas fa-user-edit"></i> Edit Profile</h4>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Username</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.username}
                      disabled
                      style={{backgroundColor: '#f8f9fa'}}
                    />
                    <small className="text-muted">Username cannot be changed</small>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      disabled
                      style={{backgroundColor: '#f8f9fa'}}
                    />
                    <small className="text-muted">Email cannot be changed</small>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">WhatsApp Number *</label>
                    <input
                      type="tel"
                      className="form-control"
                      name="whatsappNo"
                      value={formData.whatsappNo}
                      onChange={handleChange}
                      placeholder="e.g., +92 300 1234567"
                      required
                    />
                    <small className="text-muted">Include country code</small>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Contact Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      name="contactNo"
                      value={formData.contactNo}
                      onChange={handleChange}
                      placeholder="Alternative contact number"
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Country *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">City *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Product Category *</label>
                  <select
                    className="form-select"
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

                <div className="d-flex gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save"></i> Update Profile
                      </>
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => navigate('/seller/dashboard')}
                  >
                    <i className="fas fa-times"></i> Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditProfile