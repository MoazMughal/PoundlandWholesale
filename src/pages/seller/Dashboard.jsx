import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeller } from '../../context/SellerContext'
import { getApiUrl } from '../../utils/api'
import '../../styles/dashboard-responsive.css'
import '../../styles/mobile-dashboard.css'
import '../../styles/seller-dashboard-improvements.css'

const SellerDashboard = () => {
  const navigate = useNavigate()
  const { seller, isLoggedIn, loading: contextLoading, authResolved, logout, updateSeller } = useSeller()
  const [dashboardAccess, setDashboardAccess] = useState(null)
  const [stats, setStats] = useState({
    totalProducts: 0,
    pendingProducts: 0,
    approvedProducts: 0,
    totalEarnings: 0
  })
  const [paymentHistory, setPaymentHistory] = useState([])
  const [listingRequests, setListingRequests] = useState([])
  const [previewProducts, setPreviewProducts] = useState([])
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [verificationDocs, setVerificationDocs] = useState({
    cnicNumber: '',
    idCardFront: '',
    idCardBack: '',
    idCardWithFace: ''
  })

  // Main useEffect - only depends on authResolved, isLoggedIn, and seller
  useEffect(() => {
    console.log('🏠 Dashboard useEffect triggered:', {
      authResolved,
      isLoggedIn,
      hasSeller: !!seller,
      sellerUsername: seller?.username
    })
    
    // Wait for auth to be resolved
    if (!authResolved) {
      console.log('🏠 Dashboard waiting for auth resolution...')
      return
    }
    
    // If not logged in, redirect to login
    if (!isLoggedIn || !seller) {
      console.log('🏠 Dashboard redirecting to login - not authenticated')
      navigate('/login/supplier')
      return
    }

    console.log('🏠 Dashboard authenticated, fetching data...')
    
    // Fetch dashboard data only once when authenticated
    const token = sessionStorage.getItem('sellerToken')
    if (token) {
      fetchDashboardData(token)
    }
  }, [authResolved, isLoggedIn, seller?.username, navigate]) // Only re-run if these change

  const fetchDashboardData = async (token) => {
    console.log('📊 Starting dashboard data fetch...')
    setDashboardLoading(true)
    setLoadingPreview(true)
    
    try {
      // Fetch all data in parallel for better performance
      const [accessResponse, paymentsResponse, listingResponse, previewResponse] = await Promise.allSettled([
        // Dashboard access check
        fetch(getApiUrl('sellers/dashboard-access'), {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        // Payment history
        fetch(getApiUrl('sellers/payments'), {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        // Listing requests
        fetch(getApiUrl('sellers/listing-requests'), {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        // Preview products
        fetch(getApiUrl('products/admin/available?limit=6'), {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      // Process dashboard access
      if (accessResponse.status === 'fulfilled' && accessResponse.value.ok) {
        const accessData = await accessResponse.value.json()
        setDashboardAccess(accessData)
      }

      // Process payment history
      if (paymentsResponse.status === 'fulfilled' && paymentsResponse.value.ok) {
        const paymentsData = await paymentsResponse.value.json()
        setPaymentHistory(paymentsData)
      }

      // Process listing requests
      if (listingResponse.status === 'fulfilled' && listingResponse.value.ok) {
        const listingData = await listingResponse.value.json()
        console.log('📋 Listing requests fetched:', listingData.requests)
        setListingRequests(listingData.requests || [])
      }

      // Process preview products
      if (previewResponse.status === 'fulfilled' && previewResponse.value.ok) {
        const previewData = await previewResponse.value.json()
        setPreviewProducts(previewData.products || [])
      }

      console.log('✅ Dashboard data fetch completed')
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error)
    } finally {
      setDashboardLoading(false)
      setLoadingPreview(false)
    }
  }

  const handleLogout = () => {
    logout() // Use the context logout function
  }

  const handleRefreshProfile = async () => {
    try {
      const token = localStorage.getItem('sellerToken')
      if (token) {
        const response = await fetch(getApiUrl('sellers/profile'), {
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
      
      const response = await fetch(getApiUrl('sellers/verification/submit'), {
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

  // Show loading spinner only while context is loading (not dashboard data)
  if (contextLoading || !authResolved) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border text-success" role="status" style={{width: '3rem', height: '3rem'}}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Authenticating...</p>
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

  if (!authResolved && !seller) {
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
    <div className="container-fluid dashboard-container">
      {/* Dashboard Loading Indicator - Less intrusive */}
      {dashboardLoading && (
        <div className="position-fixed top-0 end-0 m-3" style={{zIndex: 9999}}>
          <div className="bg-white rounded shadow-lg p-3 d-flex align-items-center gap-2">
            <div className="spinner-border spinner-border-sm text-success" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <span className="text-muted small">Loading data...</span>
          </div>
        </div>
      )}

      {/* PROMINENT RED WARNING FOR UNVERIFIED ACCOUNTS */}
      {seller && (seller.verificationStatus === 'required' || seller.verificationStatus === 'not_required' || seller.verificationStatus === 'rejected' || !seller.verificationStatus) && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert" style={{
          background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
          border: '2px solid #dc3545',
          borderRadius: '10px',
          boxShadow: '0 4px 15px rgba(220, 53, 69, 0.3)',
          animation: 'pulse 2s infinite'
        }}>
          <div className="d-flex align-items-center">
            <div className="me-3">
              <i className="fas fa-exclamation-triangle fa-2x text-white"></i>
            </div>
            <div className="flex-grow-1">
              <h5 className="alert-heading text-white mb-2">
                <i className="fas fa-shield-alt me-2"></i>
                Account Verification Required
              </h5>
              <p className="mb-2 text-white">
                <strong>Your seller account is not verified!</strong> You have limited access to platform features.
              </p>
              <div className="mb-3">
                <small className="text-white opacity-75">
                  <i className="fas fa-clock me-1"></i>
                  Verification Status: <span className="badge bg-light text-dark ms-1">
                    {seller.verificationStatus === 'rejected' ? 'REJECTED - Resubmit Required' : 
                     seller.verificationStatus === 'pending' ? 'UNDER REVIEW' : 'PENDING SUBMISSION'}
                  </span>
                </small>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <button 
                  className="btn btn-light btn-sm"
                  onClick={() => setShowVerificationModal(true)}
                >
                  <i className="fas fa-upload me-1"></i>
                  {seller.verificationStatus === 'rejected' ? 'Resubmit Documents' : 'Submit Verification'}
                </button>
                <button 
                  className="btn btn-outline-light btn-sm"
                  onClick={() => navigate('/seller/profile')}
                >
                  <i className="fas fa-user me-1"></i>
                  View Profile
                </button>
              </div>
            </div>
          </div>
          <button type="button" className="btn-close btn-close-white" data-bs-dismiss="alert"></button>
          
          <style>
            {`
              @keyframes pulse {
                0% { box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3); }
                50% { box-shadow: 0 6px 20px rgba(220, 53, 69, 0.5); }
                100% { box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3); }
              }
            `}
          </style>
        </div>
      )}

      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="dashboard-header d-flex justify-content-between align-items-center flex-wrap">
            <div>
              <h2 className="mb-1">Seller Dashboard</h2>
              <p className="text-muted mb-0">Manage your products and track your business</p>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <button className="btn btn-success btn-sm" onClick={handleRefreshProfile}>
                <i className="fas fa-sync"></i> <span className="mobile-hide">Refresh Data</span>
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/seller/profile')}>
                <i className="fas fa-user"></i> <span className="mobile-hide">Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Alerts - Improved */}
      {dashboardAccess && dashboardAccess.daysRemaining > 0 && dashboardAccess.daysRemaining <= 5 && (
        <div className="alert alert-warning alert-dismissible fade show" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i> 
          <strong>Verification Required Soon!</strong> You have {dashboardAccess.daysRemaining} days remaining 
          in your trial period. Please prepare your verification documents to avoid dashboard access interruption.
          <button type="button" className="btn-close" data-bs-dismiss="alert"></button>
        </div>
      )}

      {seller.verificationStatus === 'pending' && (
        <div className="alert alert-info alert-dismissible fade show" role="alert">
          <i className="fas fa-clock me-2"></i> Your verification documents are under review. 
          You will receive an email once approved.
          <button type="button" className="btn-close" data-bs-dismiss="alert"></button>
        </div>
      )}

      {seller.verificationStatus === 'approved' && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="fas fa-check-circle me-2"></i> Your account is fully verified! You have unlimited dashboard access.
          <button type="button" className="btn-close" data-bs-dismiss="alert"></button>
        </div>
      )}

      {seller.verificationStatus === 'required' && (
        <div className="alert alert-warning" role="alert">
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <div>
              <i className="fas fa-id-card me-2"></i> Profile verification pending - Please submit your CNIC documents.
            </div>
            <button 
              className="btn btn-warning btn-sm mt-2 mt-md-0" 
              onClick={() => setShowVerificationModal(true)}
            >
              <i className="fas fa-upload me-1"></i>Submit Documents
            </button>
          </div>
        </div>
      )}

      {seller.verificationStatus === 'rejected' && (
        <div className="alert alert-danger" role="alert">
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <div>
              <i className="fas fa-times-circle me-2"></i> Your verification was rejected. Please resubmit your documents.
            </div>
            <button 
              className="btn btn-danger btn-sm mt-2 mt-md-0" 
              onClick={() => setShowVerificationModal(true)}
            >
              <i className="fas fa-redo me-1"></i>Resubmit Documents
            </button>
          </div>
        </div>
      )}

      {seller.canListProducts && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="fas fa-check-circle me-2"></i> You can now list products! Start adding your inventory.
          <button type="button" className="btn-close" data-bs-dismiss="alert"></button>
        </div>
      )}

      {/* Stats Cards - Improved Grid */}
      <div className="row g-3 mb-4">
        <div className="col-lg-3 col-md-6 col-sm-6">
          <div className="card bg-primary text-white stats-card h-100">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <h6 className="card-title mb-1">Supplier ID</h6>
                <h4 className="mb-0">{seller.supplierId}</h4>
              </div>
              <div>
                <i className="fas fa-id-card fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 col-sm-6">
          <div className="card bg-success text-white stats-card h-100">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <h6 className="card-title mb-1">Status</h6>
                <h4 className="mb-0 text-capitalize">{seller.status}</h4>
              </div>
              <div>
                <i className="fas fa-check-circle fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 col-sm-6">
          <div className="card bg-info text-white stats-card h-100">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <h6 className="card-title mb-1">Total Products</h6>
                <h4 className="mb-0">{stats.totalProducts}</h4>
              </div>
              <div>
                <i className="fas fa-box fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6 col-sm-6">
          <div className="card bg-warning text-white stats-card h-100">
            <div className="card-body d-flex justify-content-between align-items-center">
              <div>
                <h6 className="card-title mb-1">Listing Requests</h6>
                <h4 className="mb-0">{listingRequests.length}</h4>
              </div>
              <div>
                <i className="fas fa-list-alt fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Improved Layout */}
      <div className="row g-4">
        {/* Seller Info - Improved Table */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header bg-light">
              <h5 className="mb-0"><i className="fas fa-user me-2"></i>Seller Information</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <strong className="text-muted">Username:</strong>
                    <span>{seller?.username || 'Loading...'}</span>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <strong className="text-muted">Email:</strong>
                    <span className="text-break text-end">{seller?.email || 'Loading...'}</span>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <strong className="text-muted">WhatsApp:</strong>
                    <div>
                      {seller?.whatsappNo ? (
                        <a 
                          href={`https://wa.me/${seller.whatsappNo.replace(/[^0-9]/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-success btn-sm"
                        >
                          <i className="fab fa-whatsapp me-1"></i>
                          <span className="mobile-hide">{seller.whatsappNo}</span>
                          <span className="mobile-show">Contact</span>
                        </a>
                      ) : (
                        <span className="text-muted">Not provided</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <strong className="text-muted">Location:</strong>
                    <span>{seller?.city && seller?.country ? `${seller.city}, ${seller.country}` : 'Not provided'}</span>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <strong className="text-muted">Category:</strong>
                    <span>{seller?.productCategory || 'Not specified'}</span>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <strong className="text-muted">Account Status:</strong>
                    <span className={`badge bg-${seller?.status === 'active' ? 'success' : 'warning'}`}>
                      {seller?.status?.toUpperCase() || 'ACTIVE'}
                    </span>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <strong className="text-muted">Verification:</strong>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge bg-${
                        seller?.verificationStatus === 'approved' ? 'success' : 
                        seller?.verificationStatus === 'pending' ? 'warning' : 
                        seller?.verificationStatus === 'rejected' ? 'danger' : 'warning'
                      }`}>
                        {seller?.verificationStatus === 'required' || seller?.verificationStatus === 'not_required' ? 'PENDING' : 
                         seller?.verificationStatus === 'approved' ? 'VERIFIED' :
                         seller?.verificationStatus === 'pending' ? 'UNDER REVIEW' :
                         seller?.verificationStatus === 'rejected' ? 'REJECTED' : 'PENDING'}
                      </span>
                      {(seller?.verificationStatus === 'required' || seller?.verificationStatus === 'not_required' || seller?.verificationStatus === 'rejected') && (
                        <button 
                          className="btn btn-warning btn-sm"
                          onClick={() => setShowVerificationModal(true)}
                        >
                          <i className="fas fa-id-card"></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <strong className="text-muted">Can List Products:</strong>
                    <span className={`badge bg-${(seller?.canListProducts || seller?.verificationStatus === 'approved') ? 'success' : 'danger'}`}>
                      {(seller?.canListProducts || seller?.verificationStatus === 'approved') ? 'YES' : 'NO'}
                    </span>
                  </div>
                </div>
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center py-2">
                    <strong className="text-muted">Joined:</strong>
                    <span>{seller?.createdAt ? new Date(seller.createdAt).toLocaleDateString() : 'Unknown'}</span>
                  </div>
                </div>
                {dashboardAccess && dashboardAccess.daysRemaining > 0 && seller.verificationStatus === 'not_required' && (
                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center py-2">
                      <strong className="text-muted">Trial Days:</strong>
                      <span className={`badge bg-${dashboardAccess.daysRemaining <= 5 ? 'warning' : 'info'}`}>
                        {dashboardAccess.daysRemaining} days
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Product Listing Requests - Improved */}
        <div className="col-lg-6">
          <div className="card h-100">
            <div className="card-header bg-light">
              <h5 className="mb-0"><i className="fas fa-list-alt me-2"></i>Recent Listing Requests</h5>
            </div>
            <div className="card-body">
              {listingRequests.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                  <p className="text-muted mb-0">No product listing requests yet.</p>
                  <small className="text-muted">Start requesting products to see your requests here.</small>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {listingRequests.slice(-5).map((request, index) => (
                    <div key={index} className="list-group-item px-0 py-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <h6 className="mb-1 text-truncate">{request.productName}</h6>
                          <p className="mb-1 text-muted">
                            Your Price: £{request.sellerPrice ? parseFloat(request.sellerPrice).toFixed(2) : 'N/A'}
                          </p>
                          <small className="text-muted">
                            {request.submittedAt ? new Date(request.submittedAt).toLocaleDateString() : 
                             new Date(request.submittedAt || Date.now()).toLocaleDateString()}
                          </small>
                        </div>
                        <div className="text-end">
                          <span className={`badge bg-${
                            request.status === 'approved' ? 'success' : 
                            request.status === 'rejected' ? 'danger' : 'warning'
                          }`}>
                            {request.status === 'pending_approval' ? 'PENDING APPROVAL' :
                             request.status === 'approved' ? 'APPROVED' :
                             request.status === 'rejected' ? 'REJECTED' :
                             request.status?.replace('_', ' ').toUpperCase()}
                          </span>
                          {request.status === 'rejected' && request.rejectionReason && (
                            <div className="mt-1">
                              <small className="text-danger" title={request.rejectionReason}>
                                <i className="fas fa-info-circle"></i> Reason available
                              </small>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    

      {/* Product Listing Section - Improved */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card amazon-choice-card">
            <div className="card-header">
              <h5 className="mb-1"><i className="fas fa-shopping-cart me-2"></i>Request Products from Amazon's Choice</h5>
              <small className="opacity-75">Browse and request products from our catalog (requires admin approval)</small>
            </div>
            <div className="card-body">
              {/* Product Preview Section */}
              {previewProducts.length > 0 && (
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">
                      <i className="fas fa-star text-warning me-2"></i>
                      Featured Products
                    </h6>
                    <button 
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => navigate('/seller/admin-products')}
                      disabled={!(seller?.canListProducts || seller?.verificationStatus === 'approved' || seller?.status === 'active')}
                    >
                      <i className="fas fa-th-large me-1"></i>
                      Show All
                    </button>
                  </div>
                  
                  {loadingPreview ? (
                    <div className="text-center py-3">
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <small className="text-muted ms-2">Loading products...</small>
                    </div>
                  ) : (
                    <div className="row g-2">
                      {previewProducts.slice(0, 6).map((product, index) => (
                        <div key={product._id} className="col-lg-2 col-md-3 col-sm-4 col-6">
                          <div className="card h-100 shadow-sm" style={{fontSize: '0.75rem'}}>
                            <div className="position-relative">
                              <img 
                                src={product.images?.[0] || 'https://via.placeholder.com/150x150?text=No+Image'} 
                                alt={product.name}
                                className="card-img-top"
                                style={{
                                  height: '100px',
                                  objectFit: 'contain',
                                  backgroundColor: '#f8f9fa',
                                  padding: '8px'
                                }}
                                onError={(e) => {
                                  e.target.src = 'https://via.placeholder.com/150x150?text=No+Image';
                                }}
                              />
                            </div>
                            <div className="card-body p-2">
                              <h6 className="card-title mb-1" style={{
                                fontSize: '0.7rem',
                                lineHeight: '1.2',
                                height: '2.4rem',
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                              }}>
                                {product.name}
                              </h6>
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="text-success fw-bold" style={{fontSize: '0.8rem'}}>
                                  £{product.price}
                                  {product.shipping > 0 && (
                                    <div style={{fontSize: '0.6rem', color: '#6c757d'}}>
                                      +£{product.shipping} ship
                                    </div>
                                  )}
                                </span>
                                <button 
                                  className="btn btn-primary btn-sm"
                                  style={{fontSize: '0.6rem', padding: '2px 6px'}}
                                  onClick={() => navigate('/seller/admin-products')}
                                  disabled={!(seller?.canListProducts || seller?.verificationStatus === 'approved' || seller?.status === 'active')}
                                  title="Go to products page to request this item"
                                >
                                  <i className="fas fa-plus"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Main Action Section */}
              <div className="text-center py-3">
                <div className="mb-3">
                  <i className="fas fa-paper-plane fa-3x text-primary mb-3"></i>
                  <h6 className="mb-2">Submit Listing Requests</h6>
                  <p className="text-muted mb-4">
                    Choose from our curated Amazon's Choice products and submit requests for admin approval
                  </p>
                  <div className="alert alert-info mb-4">
                    <i className="fas fa-info-circle me-2"></i>
                    <strong>New Process:</strong> All product listing requests now require admin approval. 
                    You'll be notified once your requests are reviewed.
                  </div>
                </div>
                
                <button 
                  className="btn btn-primary btn-lg"
                  disabled={!(seller?.canListProducts || seller?.verificationStatus === 'approved' || seller?.status === 'active')}
                  onClick={() => navigate('/seller/admin-products')}
                >
                  <div className="d-flex flex-column align-items-center">
                    <div className="d-flex align-items-center mb-1">
                      <i className="fas fa-paper-plane me-2"></i>
                      <span>Browse & Request Products</span>
                    </div>
                    <small>Submit listing requests</small>
                  </div>
                </button>
                
                {!(seller?.canListProducts || seller?.verificationStatus === 'approved' || seller?.status === 'active') && (
                  <div className="alert alert-warning mt-4 mb-0">
                    <i className="fas fa-exclamation-triangle me-2"></i> 
                    <strong>Verification Required:</strong> Complete your verification to request products.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Improved Grid */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-light">
              <h5 className="mb-0"><i className="fas fa-bolt me-2"></i>Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-lg-3 col-md-6 col-sm-6">
                  <button 
                    className="btn btn-primary w-100 h-100 d-flex flex-column align-items-center justify-content-center py-3"
                    onClick={() => navigate('/seller/add-products')}
                  >
                    <i className="fas fa-plus fa-2x mb-2"></i>
                    <span className="fw-bold">Add Products</span>
                    <small className="opacity-75">Create custom listings</small>
                  </button>
                </div>
                <div className="col-lg-3 col-md-6 col-sm-6">
                  <button 
                    className="btn btn-info w-100 h-100 d-flex flex-column align-items-center justify-content-center py-3"
                    onClick={() => navigate('/seller/listed-products')}
                  >
                    <i className="fas fa-list fa-2x mb-2"></i>
                    <span className="fw-bold">My Products</span>
                    <small className="opacity-75">View your listings</small>
                  </button>
                </div>
                <div className="col-lg-3 col-md-6 col-sm-6">
                  <button 
                    className="btn btn-success w-100 h-100 d-flex flex-column align-items-center justify-content-center py-3"
                    disabled={!(seller?.canListProducts || seller?.verificationStatus === 'approved' || seller?.status === 'active')}
                    onClick={() => navigate('/seller/admin-products')}
                  >
                    <i className="fas fa-paper-plane fa-2x mb-2"></i>
                    <span className="fw-bold">Request Products</span>
                    <small className="opacity-75">Browse & request</small>
                  </button>
                </div>
                <div className="col-lg-3 col-md-6 col-sm-6">
                  <button 
                    className="btn btn-warning w-100 h-100 d-flex flex-column align-items-center justify-content-center py-3"
                    onClick={() => navigate('/seller/profile/edit')}
                  >
                    <i className="fas fa-edit fa-2x mb-2"></i>
                    <span className="fw-bold">Edit Profile</span>
                    <small className="opacity-75">Update information</small>
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