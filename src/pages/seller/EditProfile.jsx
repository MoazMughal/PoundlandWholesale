import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeller } from '../../context/SellerContext'
import { getApiUrl } from '../../utils/api'

const EditProfile = () => {
  const navigate = useNavigate()
  const { seller, isLoggedIn, loading: authLoading, authResolved, updateSeller } = useSeller()
  const [loading, setLoading] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [changePasswordData, setChangePasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [changePasswordError, setChangePasswordError] = useState('')
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
    // Wait for authentication to be resolved before checking login status
    if (!authResolved || authLoading) {
      return
    }

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
    // Show password modal instead of directly submitting
    setShowPasswordModal(true)
  }

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      setPasswordError('Please enter your password')
      return
    }

    setLoading(true)
    setPasswordError('')

    try {
      const token = localStorage.getItem('sellerToken')
      const response = await fetch(getApiUrl('sellers/profile'), {
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
          productCategory: formData.productCategory,
          password: password
        })
      })

      const data = await response.json()

      if (response.ok) {
        updateSeller(data.seller)
        alert('✅ Profile updated successfully!')
        setShowPasswordModal(false)
        setPassword('')
        setPasswordError('')
        navigate('/seller/dashboard')
      } else {
        // Handle different error cases
        if (response.status === 401) {
          setPasswordError('Incorrect password. Please try again.')
          setPassword('') // Clear the password field
        } else if (response.status === 400) {
          setPasswordError(data.message || 'Invalid request')
        } else {
          setPasswordError(data.message || 'Failed to update profile')
        }
      }
    } catch (error) {
      setPasswordError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordCancel = () => {
    setShowPasswordModal(false)
    setPassword('')
    setPasswordError('')
    setLoading(false)
  }

  const handleChangePasswordClick = () => {
    setShowChangePasswordModal(true)
  }

  const handleChangePasswordSubmit = async () => {
    const { currentPassword, newPassword, confirmPassword } = changePasswordData
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setChangePasswordError('All fields are required')
      return
    }
    
    if (newPassword.length < 8) {
      setChangePasswordError('New password must be at least 8 characters long')
      return
    }
    
    if (newPassword !== confirmPassword) {
      setChangePasswordError('New passwords do not match')
      return
    }
    
    setLoading(true)
    setChangePasswordError('')

    try {
      const token = localStorage.getItem('sellerToken')
      const response = await fetch(getApiUrl('sellers/change-password'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ Password changed successfully!')
        setShowChangePasswordModal(false)
        setChangePasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
        setChangePasswordError('')
      } else {
        if (response.status === 401) {
          setChangePasswordError('Current password is incorrect')
        } else {
          setChangePasswordError(data.message || 'Failed to change password')
        }
      }
    } catch (error) {
      setChangePasswordError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePasswordCancel = () => {
    setShowChangePasswordModal(false)
    setChangePasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    setChangePasswordError('')
    setLoading(false)
  }

  const handleChangePasswordInputChange = (field, value) => {
    setChangePasswordData(prev => ({
      ...prev,
      [field]: value
    }))
    setChangePasswordError('') // Clear error when user types
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

                <div className="d-flex gap-2 flex-wrap">
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
                    className="btn btn-warning"
                    onClick={handleChangePasswordClick}
                    disabled={loading}
                  >
                    <i className="fas fa-key"></i> Change Password
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

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-lock text-warning"></i> Confirm Password
                </h5>
              </div>
              <div className="modal-body">
                <p className="mb-3">
                  <i className="fas fa-info-circle text-info"></i> 
                  For security reasons, please enter your password to confirm profile changes.
                </p>
                {passwordError && (
                  <div className="alert alert-danger py-2" role="alert">
                    <i className="fas fa-exclamation-triangle"></i> {passwordError}
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">Enter your password:</label>
                  <input
                    type="password"
                    className={`form-control ${passwordError ? 'is-invalid' : ''}`}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setPasswordError('') // Clear error when user types
                    }}
                    placeholder="Enter your current password"
                    autoFocus
                    autoComplete="current-password"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handlePasswordSubmit()
                      }
                    }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handlePasswordCancel}
                  disabled={loading}
                >
                  <i className="fas fa-times"></i> Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handlePasswordSubmit}
                  disabled={loading || !password.trim()}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i> Confirm & Update
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-key text-warning"></i> Change Password
                </h5>
              </div>
              <div className="modal-body">
                <p className="mb-3">
                  <i className="fas fa-info-circle text-info"></i> 
                  Enter your current password and choose a new secure password.
                </p>
                {changePasswordError && (
                  <div className="alert alert-danger py-2" role="alert">
                    <i className="fas fa-exclamation-triangle"></i> {changePasswordError}
                  </div>
                )}
                
                <div className="mb-3">
                  <label className="form-label">Current Password:</label>
                  <input
                    type="password"
                    className={`form-control ${changePasswordError && changePasswordError.includes('Current password') ? 'is-invalid' : ''}`}
                    value={changePasswordData.currentPassword}
                    onChange={(e) => handleChangePasswordInputChange('currentPassword', e.target.value)}
                    placeholder="Enter your current password"
                    autoFocus
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">New Password:</label>
                  <input
                    type="password"
                    className={`form-control ${changePasswordError && (changePasswordError.includes('8 characters') || changePasswordError.includes('do not match')) ? 'is-invalid' : ''}`}
                    value={changePasswordData.newPassword}
                    onChange={(e) => handleChangePasswordInputChange('newPassword', e.target.value)}
                    placeholder="Enter new password (min 8 characters)"
                  />
                  <small className="text-muted">Password must be at least 8 characters long</small>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Confirm New Password:</label>
                  <input
                    type="password"
                    className={`form-control ${changePasswordError && changePasswordError.includes('do not match') ? 'is-invalid' : ''}`}
                    value={changePasswordData.confirmPassword}
                    onChange={(e) => handleChangePasswordInputChange('confirmPassword', e.target.value)}
                    placeholder="Confirm your new password"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleChangePasswordSubmit()
                      }
                    }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleChangePasswordCancel}
                  disabled={loading}
                >
                  <i className="fas fa-times"></i> Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-warning"
                  onClick={handleChangePasswordSubmit}
                  disabled={loading || !changePasswordData.currentPassword || !changePasswordData.newPassword || !changePasswordData.confirmPassword}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Changing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-key"></i> Change Password
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EditProfile