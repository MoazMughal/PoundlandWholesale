import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeller } from '../../context/SellerContext'

const SellerDashboard = () => {
  const navigate = useNavigate()
  const { seller, isLoggedIn, loading: contextLoading, logout, updateSeller } = useSeller()
  const [dashboardAccess, setDashboardAccess] = useState(null)
  const [stats, setStats] = useState({
    totalProducts: 0,
    pendingProducts: 0,
    approvedProducts: 0,
    totalEarnings: 0
  })
  const [paymentHistory, setPaymentHistory] = useState([])
  const [listingRequests, setListingRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [verificationDocs, setVerificationDocs] = useState({
    cnicNumber: '',
    idCardFront: '',
    idCardBack: '',
    idCardWithFace: ''
  })

  useEffect(() => {
    // Wait for context to finish loading
    if (contextLoading) return
    
    // If not logged in, redirect to login
    if (!isLoggedIn || !seller) {
      navigate('/login/supplier')
      return
    }

    // Fetch additional dashboard data
    const token = localStorage.getItem('sellerToken')
    if (token) {
      fetchDashboardData(token)
    }
    
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false)
        console.error('Dashboard data fetch timeout')
      }
    }, 10000) // 10 second timeout
    
    return () => clearTimeout(timeout)
  }, [navigate, isLoggedIn, seller, contextLoading])

  const fetchDashboardData = async (token) => {
    try {
      // Check dashboard access
      try {
        const accessResponse = await fetch('http://localhost:5000/api/sellers/dashboard-access', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (accessResponse.ok) {
          const accessData = await accessResponse.json()
          setDashboardAccess(accessData)
        }
      } catch (accessError) {
        console.error('Dashboard access check failed:', accessError)
        // Continue without dashboard access data
      }

      // Fetch payment history
      try {
        const paymentsResponse = await fetch('http://localhost:5000/api/sellers/payments', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json()
          setPaymentHistory(paymentsData)
        }
      } catch (paymentsError) {
        console.error('Payment history fetch failed:', paymentsError)
        // Continue without payment history
      }

      // Fetch listing requests
      try {
        const listingResponse = await fetch('http://localhost:5000/api/sellers/listing-requests', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (listingResponse.ok) {
          const listingData = await listingResponse.json()
          setListingRequests(listingData.requests)
        }
      } catch (listingError) {
        console.error('Listing requests fetch failed:', listingError)
        // Continue without listing requests
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout() // Use the context logout function
  }

  const handleRefreshProfile = async () => {
    try {
      const token = localStorage.getItem('sellerToken')
      if (token) {
        const response = await fetch('http://localhost:5000/api/sellers/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const freshSellerData = await response.json()
          
          updateSeller(freshSellerData)
          alert('✅ Profile refreshed successfully!')
        } else {
          alert('❌ Failed to refresh profile')
        }
      }
    } catch (error) {
      console.error('Refresh error:', error)
      alert('❌ Error refreshing profile')
    }
  }

  const handlePayment = async () => {
    const amount = prompt('Enter payment amount:')
    const transactionId = prompt('Enter transaction ID:')
    
    if (!amount || !transactionId) return

    try {
      const token = localStorage.getItem('sellerToken')
      const response = await fetch('http://localhost:5000/api/sellers/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          paymentMethod: 'Bank Transfer',
          transactionId,
          purpose: 'registration'
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ Payment recorded successfully!')
        fetchDashboardData(token)
      } else {
        alert('❌ ' + data.message)
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('❌ Failed to record payment')
    }
  }

  const handleVerificationSubmit = async () => {
    if (!verificationDocs.cnicNumber || !verificationDocs.idCardFront || !verificationDocs.idCardBack || !verificationDocs.idCardWithFace) {
      alert('❌ Please provide CNIC number and all three documents')
      return
    }

    try {
      const token = localStorage.getItem('sellerToken')
      
      if (!token) {
        alert('❌ Authentication required. Please login again.')
        navigate('/login/supplier')
        return
      }
      
      const response = await fetch('http://localhost:5000/api/sellers/verification/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(verificationDocs)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert('✅ Verification documents submitted successfully! Admin will review your documents.')
        setShowVerificationModal(false)
        // Refresh seller data
        if (seller) {
          updateSeller({...seller, verificationStatus: 'pending'})
        }
        fetchDashboardData(token)
      } else {
        alert('❌ ' + (data.message || 'Failed to submit verification documents'))
      }
    } catch (error) {
      console.error('Verification error:', error)
      alert('❌ Failed to submit verification documents. Error: ' + error.message)
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

  // Show verification required screen if access is blocked (trial expired)
  if (dashboardAccess && !dashboardAccess.canAccess) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card border-warning">
              <div className="card-header bg-warning text-dark">
                <h4><i className="fas fa-exclamation-triangle"></i> Verification Required</h4>
              </div>
              <div className="card-body">
                <div className="text-center mb-4">
                  <i className="fas fa-id-card fa-4x text-warning mb-3"></i>
                  <h5>{dashboardAccess.message}</h5>
                  
                  {(dashboardAccess.reason === 'verification_required' || dashboardAccess.reason === 'trial_expired') && (
                    <div className="mt-4">
                      <p className="text-muted">
                        To continue accessing your dashboard, please submit the following verification documents:
                      </p>
                      <ul className="list-unstyled">
                        <li><i className="fas fa-check text-success"></i> CNIC Front Side</li>
                        <li><i className="fas fa-check text-success"></i> CNIC Back Side</li>
                        <li><i className="fas fa-check text-success"></i> CNIC with Selfie</li>
                      </ul>
                      <button 
                        className="btn btn-warning btn-lg"
                        onClick={() => setShowVerificationModal(true)}
                      >
                        <i className="fas fa-upload"></i> Submit Verification Documents
                      </button>
                    </div>
                  )}

                  {dashboardAccess.reason === 'verification_pending' && (
                    <div className="mt-4">
                      <div className="alert alert-info">
                        <i className="fas fa-clock"></i> Your verification documents are under review. 
                        You will receive an email once approved.
                      </div>
                    </div>
                  )}

                  {dashboardAccess.reason === 'verification_rejected' && (
                    <div className="mt-4">
                      <div className="alert alert-danger">
                        <i className="fas fa-times-circle"></i> Your verification was rejected. 
                        Please resubmit your documents.
                      </div>
                      <button 
                        className="btn btn-danger"
                        onClick={() => setShowVerificationModal(true)}
                      >
                        <i className="fas fa-redo"></i> Resubmit Documents
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <button className="btn btn-secondary" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt"></i> Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Modal */}
        {showVerificationModal && (
          <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Submit Verification Documents</h5>
                  <button 
                    type="button" 
                    className="btn-close"
                    onClick={() => setShowVerificationModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">CNIC Front Side (Image URL)</label>
                    <input
                      type="url"
                      className="form-control"
                      value={verificationDocs.idCardFront}
                      onChange={(e) => setVerificationDocs({...verificationDocs, idCardFront: e.target.value})}
                      placeholder="Enter image URL for CNIC front side"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">CNIC Back Side (Image URL)</label>
                    <input
                      type="url"
                      className="form-control"
                      value={verificationDocs.idCardBack}
                      onChange={(e) => setVerificationDocs({...verificationDocs, idCardBack: e.target.value})}
                      placeholder="Enter image URL for CNIC back side"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">CNIC with Selfie (Image URL)</label>
                    <input
                      type="url"
                      className="form-control"
                      value={verificationDocs.idCardWithFace}
                      onChange={(e) => setVerificationDocs({...verificationDocs, idCardWithFace: e.target.value})}
                      placeholder="Enter image URL for selfie holding CNIC"
                    />
                  </div>
                  <div className="alert alert-info">
                    <small>
                      <i className="fas fa-info-circle"></i> Please ensure all CNIC images are clear and readable. 
                      Upload your images to a service like Imgur or Google Drive and paste the direct image URLs here.
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowVerificationModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={handleVerificationSubmit}
                  >
                    Submit Documents
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!contextLoading && !seller) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">
          <h5>Error loading seller data</h5>
          <p>Unable to load your profile information. This could be due to:</p>
          <ul>
            <li>Network connection issues</li>
            <li>Server temporarily unavailable</li>
            <li>Session expired</li>
          </ul>

          <button 
            className="btn btn-primary me-2" 
            onClick={() => window.location.reload()}
          >
            <i className="fas fa-refresh"></i> Retry
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/login/supplier')}
          >
            <i className="fas fa-sign-in-alt"></i> Login Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid">

      {/* Header */}
      <div className="row mb-4">
        <div className="col-md-8">
          <h2>Seller Dashboard</h2>
          <p className="text-muted mb-0">Manage your products and track your business</p>
        </div>
        <div className="col-md-4 text-end">
          <button className="btn btn-success btn-sm me-2" onClick={handleRefreshProfile}>
            <i className="fas fa-sync"></i> Refresh Data
          </button>
          <button className="btn btn-primary btn-sm me-2" onClick={() => navigate('/seller/profile')}>
            <i className="fas fa-user"></i> Profile
          </button>
        </div>
      </div>

      {/* Status Alerts */}
      {dashboardAccess && dashboardAccess.daysRemaining > 0 && dashboardAccess.daysRemaining <= 5 && (
        <div className="alert alert-warning">
          <i className="fas fa-exclamation-triangle"></i> 
          <strong>Verification Required Soon!</strong> You have {dashboardAccess.daysRemaining} days remaining 
          in your trial period. Please prepare your verification documents to avoid dashboard access interruption.
        </div>
      )}

      {seller.verificationStatus === 'pending' && (
        <div className="alert alert-info">
          <i className="fas fa-clock"></i> Your verification documents are under review. 
          You will receive an email once approved.
        </div>
      )}

      {seller.verificationStatus === 'approved' && (
        <div className="alert alert-success">
          <i className="fas fa-check-circle"></i> Your account is fully verified! You have unlimited dashboard access.
        </div>
      )}

      {seller.verificationStatus === 'required' && (
        <div className="alert alert-warning">
          <i className="fas fa-id-card"></i> Profile verification pending - Please submit your CNIC documents.
          <button 
            className="btn btn-warning btn-sm ms-2" 
            onClick={() => setShowVerificationModal(true)}
          >
            Submit Documents
          </button>
        </div>
      )}

      {seller.verificationStatus === 'rejected' && (
        <div className="alert alert-danger">
          <i className="fas fa-times-circle"></i> Your verification was rejected. Please resubmit your documents.
          <button 
            className="btn btn-danger btn-sm ms-2" 
            onClick={() => setShowVerificationModal(true)}
          >
            Resubmit Documents
          </button>
        </div>
      )}

      {seller.canListProducts && (
        <div className="alert alert-success">
          <i className="fas fa-check-circle"></i> You can now list products! Start adding your inventory.
        </div>
      )}

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Supplier ID</h6>
                  <h4>{seller.supplierId}</h4>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-id-card fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card bg-success text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Status</h6>
                  <h4 className="text-capitalize">{seller.status}</h4>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-check-circle fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card bg-info text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Total Products</h6>
                  <h4>{stats.totalProducts}</h4>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-box fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 mb-3">
          <div className="card bg-warning text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Listing Requests</h6>
                  <h4>{listingRequests.length}</h4>
                </div>
                <div className="align-self-center">
                  <i className="fas fa-list-alt fa-2x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="row">
        {/* Seller Info */}
        <div className="col-lg-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h5><i className="fas fa-user"></i> Seller Information</h5>
            </div>
            <div className="card-body">
              <table className="table table-borderless">
                <tbody>
                  <tr>
                    <td><strong>Username:</strong></td>
                    <td>{seller?.username || 'Loading...'}</td>
                  </tr>
                  <tr>
                    <td><strong>Email:</strong></td>
                    <td>{seller?.email || 'Loading...'}</td>
                  </tr>
                  <tr>
                    <td><strong>WhatsApp Number:</strong></td>
                    <td>
                      {seller?.whatsappNo ? (
                        <a 
                          href={`https://wa.me/${seller.whatsappNo.replace(/[^0-9]/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            color: '#25D366',
                            textDecoration: 'none',
                            fontWeight: '600'
                          }}
                        >
                          <i className="fab fa-whatsapp me-1"></i>
                          {seller.whatsappNo}
                        </a>
                      ) : (
                        'Not provided'
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Location:</strong></td>
                    <td>{seller?.city && seller?.country ? `${seller.city}, ${seller.country}` : 'Not provided'}</td>
                  </tr>
                  <tr>
                    <td><strong>Product Category:</strong></td>
                    <td>{seller?.productCategory || 'Not specified'}</td>
                  </tr>
                  <tr>
                    <td><strong>Supplier ID:</strong></td>
                    <td><span className="badge bg-primary">{seller?.supplierId || 'Loading...'}</span></td>
                  </tr>
                  <tr>
                    <td><strong>Account Status:</strong></td>
                    <td>
                      <span className={`badge bg-${seller?.status === 'active' ? 'success' : 'warning'}`}>
                        {seller?.status?.toUpperCase() || 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Verification Status:</strong></td>
                    <td>
                      <span className={`badge bg-${
                        seller?.verificationStatus === 'approved' ? 'success' : 
                        seller?.verificationStatus === 'pending' ? 'warning' : 
                        seller?.verificationStatus === 'rejected' ? 'danger' : 'warning'
                      }`}>
                        {seller?.verificationStatus === 'required' || seller?.verificationStatus === 'not_required' ? 'PENDING VERIFICATION' : 
                         seller?.verificationStatus === 'approved' ? 'VERIFIED' :
                         seller?.verificationStatus === 'pending' ? 'UNDER REVIEW' :
                         seller?.verificationStatus === 'rejected' ? 'REJECTED' : 'PENDING VERIFICATION'}
                      </span>
                      {(seller?.verificationStatus === 'required' || seller?.verificationStatus === 'not_required' || seller?.verificationStatus === 'rejected') && (
                        <button 
                          className="btn btn-sm btn-warning ms-2"
                          onClick={() => setShowVerificationModal(true)}
                        >
                          <i className="fas fa-id-card"></i> Submit Documents
                        </button>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Can List Products:</strong></td>
                    <td>
                      <span className={`badge bg-${(seller?.canListProducts || seller?.verificationStatus === 'approved') ? 'success' : 'danger'}`}>
                        {(seller?.canListProducts || seller?.verificationStatus === 'approved') ? 'YES' : 'NO'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Joined:</strong></td>
                    <td>{seller?.createdAt ? new Date(seller.createdAt).toLocaleDateString() : 'Unknown'}</td>
                  </tr>
                  {dashboardAccess && dashboardAccess.daysRemaining > 0 && seller.verificationStatus === 'not_required' && (
                    <tr>
                      <td><strong>Trial Days Remaining:</strong></td>
                      <td>
                        <span className={`badge bg-${dashboardAccess.daysRemaining <= 5 ? 'warning' : 'info'}`}>
                          {dashboardAccess.daysRemaining} days
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Product Listing Requests */}
        <div className="col-lg-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h5><i className="fas fa-list-alt"></i> Product Listing Requests</h5>
            </div>
            <div className="card-body">
              {listingRequests.length === 0 ? (
                <p className="text-muted">No product listing requests yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listingRequests.slice(-5).map((request, index) => (
                        <tr key={index}>
                          <td>
                            <small className="text-muted">{request.productName}</small>
                          </td>
                          <td>£{request.productPrice}</td>
                          <td>
                            <span className={`badge bg-${
                              request.status === 'approved' ? 'success' : 
                              request.status === 'rejected' ? 'danger' : 'warning'
                            }`}>
                              {request.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td>{new Date(request.submittedAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="col-lg-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h5><i className="fas fa-history"></i> Payment History</h5>
            </div>
            <div className="card-body">
              {paymentHistory.length === 0 ? (
                <p className="text-muted">No payment history available.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Purpose</th>
                        <th>Details</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((payment, index) => (
                        <tr key={index}>
                          <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                          <td>£{payment.amount}</td>
                          <td className="text-capitalize">{payment.purpose.replace('_', ' ')}</td>
                          <td>
                            {payment.purpose === 'product_listing' && payment.productName ? (
                              <small className="text-muted">{payment.productName}</small>
                            ) : (
                              <small className="text-muted">-</small>
                            )}
                          </td>
                          <td>
                            <span className={`badge bg-${payment.status === 'completed' ? 'success' : 'warning'}`}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Listing Section */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5><i className="fas fa-shopping-cart"></i> List Products to Amazon's Choice</h5>
              <small className="text-muted">Browse and list products from our catalog</small>
            </div>
            <div className="card-body">
              <div className="row g-2 justify-content-center">
                <div className="col-md-6">
                  <button 
                    className="btn btn-warning w-100 py-3"
                    disabled={!(seller?.canListProducts || seller?.verificationStatus === 'approved')}
                    onClick={() => navigate('/seller/admin-products')}
                    style={{ fontSize: '1.1rem' }}
                  >
                    <i className="fas fa-trophy me-2"></i> Amazon's Choice Products
                    <small className="d-block mt-1">List admin products to your inventory</small>
                  </button>
                </div>
              </div>
              
              {!(seller?.canListProducts || seller?.verificationStatus === 'approved') && (
                <div className="alert alert-warning mt-3 mb-0">
                  <i className="fas fa-exclamation-triangle"></i> 
                  <strong>Verification Required:</strong> Complete your verification to list products.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5><i className="fas fa-bolt"></i> Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3 mb-2">
                  <button 
                    className="btn btn-primary w-100"
                    onClick={() => navigate('/seller/add-products')}
                  >
                    <i className="fas fa-plus"></i> Add Custom Products
                  </button>
                </div>
                <div className="col-md-3 mb-2">
                  <button 
                    className="btn btn-info w-100"
                    onClick={() => navigate('/seller/listed-products')}
                  >
                    <i className="fas fa-list"></i> My Listed Products
                  </button>
                </div>
                <div className="col-md-3 mb-2">
                  <button 
                    className="btn btn-success w-100"
                    disabled={!(seller?.canListProducts || seller?.verificationStatus === 'approved')}
                    onClick={() => navigate('/seller/admin-products')}
                  >
                    <i className="fas fa-shopping-cart"></i> Admin Products
                  </button>
                </div>
                <div className="col-md-3 mb-2">
                  <button 
                    className="btn btn-warning w-100"
                    onClick={() => navigate('/seller/profile/edit')}
                  >
                    <i className="fas fa-edit"></i> Edit Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      {showVerificationModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Submit Verification Documents</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowVerificationModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">CNIC Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={verificationDocs.cnicNumber}
                    onChange={(e) => setVerificationDocs({...verificationDocs, cnicNumber: e.target.value})}
                    placeholder="Enter your CNIC number (e.g., 12345-1234567-1)"
                    maxLength="15"
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label"><strong>CNIC Front Side</strong></label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          setVerificationDocs({...verificationDocs, idCardFront: e.target.result});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <small className="text-muted">Choose CNIC front image from your computer</small>
                  {verificationDocs.idCardFront && (
                    <div className="mt-2">
                      <img 
                        src={verificationDocs.idCardFront} 
                        alt="CNIC Front Preview" 
                        className="img-thumbnail"
                        style={{width: '200px', height: '120px', objectFit: 'cover'}}
                      />
                    </div>
                  )}
                </div>
                <div className="mb-4">
                  <label className="form-label"><strong>CNIC Back Side</strong></label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          setVerificationDocs({...verificationDocs, idCardBack: e.target.result});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <small className="text-muted">Choose CNIC back image from your computer</small>
                  {verificationDocs.idCardBack && (
                    <div className="mt-2">
                      <img 
                        src={verificationDocs.idCardBack} 
                        alt="CNIC Back Preview" 
                        className="img-thumbnail"
                        style={{width: '200px', height: '120px', objectFit: 'cover'}}
                      />
                    </div>
                  )}
                </div>
                <div className="mb-4">
                  <label className="form-label"><strong>CNIC with Selfie</strong></label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          setVerificationDocs({...verificationDocs, idCardWithFace: e.target.result});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <small className="text-muted">Choose selfie photo holding your CNIC from your computer</small>
                  {verificationDocs.idCardWithFace && (
                    <div className="mt-2">
                      <img 
                        src={verificationDocs.idCardWithFace} 
                        alt="CNIC with Selfie Preview" 
                        className="img-thumbnail"
                        style={{width: '200px', height: '120px', objectFit: 'cover'}}
                      />
                    </div>
                  )}
                </div>

                <div className="alert alert-info">
                  <small>
                    <i className="fas fa-info-circle"></i> Please ensure all CNIC images are clear and readable. 
                    You can upload files directly from your PC or paste image URLs.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowVerificationModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleVerificationSubmit}
                >
                  Submit Documents
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SellerDashboard