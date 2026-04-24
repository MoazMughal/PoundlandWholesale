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
  const [showVerifiedBanner, setShowVerifiedBanner] = useState(() => {
    // Only show if seller hasn't dismissed it before
    return !localStorage.getItem('verifiedBannerDismissed')
  })
  const [verificationDocs, setVerificationDocs] = useState({
    cnicNumber: '',
    idCardFront: '',
    idCardBack: '',
    idCardWithFace: ''
  })

  // Main useEffect - only depends on authResolved, isLoggedIn, and seller
  useEffect(() => {
    console.log('ðŸ  Dashboard useEffect triggered:', {
      authResolved,
      isLoggedIn,
      hasSeller: !!seller,
      sellerUsername: seller?.username
    })
    
    // Wait for auth to be resolved
    if (!authResolved) {
      console.log('ðŸ  Dashboard waiting for auth resolution...')
      return
    }
    
    // If not logged in, redirect to login
    if (!isLoggedIn || !seller) {
      console.log('ðŸ  Dashboard redirecting to login - not authenticated')
      navigate('/login/supplier')
      return
    }

    console.log('ðŸ  Dashboard authenticated, fetching data...')
    
    // Fetch dashboard data only once when authenticated
    const token = localStorage.getItem('sellerToken') || sessionStorage.getItem('sellerToken')
    if (token) {
      fetchDashboardData(token)
    }
  }, [authResolved, isLoggedIn, seller?.username, navigate]) // Only re-run if these change

  const fetchDashboardData = async (token) => {
    console.log('ðŸ“Š Starting dashboard data fetch...')
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
        console.log('ðŸ“‹ Listing requests fetched:', listingData.requests)
        setListingRequests(listingData.requests || [])
      }

      // Process preview products
      if (previewResponse.status === 'fulfilled' && previewResponse.value.ok) {
        const previewData = await previewResponse.value.json()
        setPreviewProducts(previewData.products || [])
      }

      console.log('âœ… Dashboard data fetch completed')
    } catch (error) {
      console.error('âŒ Error fetching dashboard data:', error)
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
          alert('âœ… Profile refreshed successfully!')
        } else {
          alert('âŒ Failed to refresh profile')
        }
      }
    } catch (error) {
      console.error('Refresh error:', error)
      alert('âŒ Error refreshing profile')
    }
  }

  const handleVerificationSubmit = async () => {
    if (!verificationDocs.cnicNumber || !verificationDocs.idCardFront || !verificationDocs.idCardBack || !verificationDocs.idCardWithFace) {
      alert('âŒ Please provide CNIC number and all three documents')
      return
    }

    try {
      const token = localStorage.getItem('sellerToken')
      
      if (!token) {
        alert('âŒ Authentication required. Please login again.')
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
        alert('âœ… Verification documents submitted successfully! Admin will review your documents.')
        setShowVerificationModal(false)
        // Refresh seller data
        if (seller) {
          updateSeller({...seller, verificationStatus: 'pending'})
        }
        fetchDashboardData(token)
      } else {
        alert('âŒ ' + (data.message || 'Failed to submit verification documents'))
      }
    } catch (error) {
      console.error('Verification error:', error)
      alert('âŒ Failed to submit verification documents. Error: ' + error.message)
    }
  }

  // Don't render anything while auth is resolving â€” redirect happens in useEffect
  if (contextLoading || !authResolved) {
    return null;
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
    <div style={{background: '#f4f6f9', minHeight: '100vh', padding: '0'}}>
      <style>{`
        .sd-page { padding: 12px 14px; max-width: 1400px; margin: 0 auto; }
        .sd-header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 14px 18px; border-radius: 10px; margin-bottom: 12px; }
        .sd-stat { border-radius: 10px; padding: 14px 16px; color: #fff; display: flex; justify-content: space-between; align-items: center; }
        .sd-card { background: #fff; border-radius: 10px; border: 1px solid #e8ecf0; overflow: hidden; margin-bottom: 12px; }
        .sd-card-header { background: #f8f9fa; padding: 10px 16px; border-bottom: 1px solid #e8ecf0; font-weight: 700; font-size: 0.9rem; color: #2d3748; display: flex; align-items: center; gap: 8px; }
        .sd-card-body { padding: 14px 16px; }
        .sd-info-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #f0f2f5; font-size: 0.85rem; }
        .sd-info-row:last-child { border-bottom: none; }
        .sd-info-label { color: #6b7280; font-weight: 600; }
        .sd-qa-btn { border-radius: 8px; padding: 10px 12px; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px; font-weight: 700; font-size: 0.78rem; transition: transform 0.15s, box-shadow 0.15s; width: 100%; }
        .sd-qa-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .sd-qa-btn i { font-size: 1.2rem; }
        .sd-product-card { border-radius: 8px; border: 1px solid #e8ecf0; overflow: hidden; background: #fff; height: 100%; }
        .sd-product-card img { height: 80px; width: 100%; object-fit: contain; background: #f8f9fa; padding: 6px; }
        .sd-product-card .body { padding: 6px 8px; }
        .sd-alert { border-radius: 8px; padding: 10px 14px; margin-bottom: 10px; font-size: 0.85rem; border: none; }
        .sd-alert-warning { background: #fff8e1; color: #856404; border-left: 4px solid #ffc107; }
        .sd-alert-info { background: #e8f4fd; color: #0c5460; border-left: 4px solid #17a2b8; }
        .sd-alert-success { background: #d4edda; color: #155724; border-left: 4px solid #28a745; }
        .sd-alert-danger { background: #fde8e8; color: #721c24; border-left: 4px solid #dc3545; }
        @media (max-width: 576px) {
          .sd-page { padding: 8px 10px; }
          .sd-header { padding: 10px 12px; }
          .sd-stat { padding: 10px 12px; }
          .sd-qa-btn { padding: 8px 6px; font-size: 0.72rem; }
          .sd-qa-btn i { font-size: 1rem; }
        }
      `}</style>

      <div className="sd-page">
        {/* Loading indicator */}
        {dashboardLoading && (
          <div className="position-fixed top-0 end-0 m-3" style={{zIndex: 9999}}>
            <div className="bg-white rounded shadow p-2 d-flex align-items-center gap-2" style={{fontSize: '0.8rem'}}>
              <div className="spinner-border spinner-border-sm text-success" role="status"></div>
              <span className="text-muted">Loading...</span>
            </div>
          </div>
        )}

        {/* â”€â”€ HEADER â”€â”€ */}
        <div className="sd-header">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <h5 className="mb-0 fw-bold" style={{color: '#fff'}}>Seller Dashboard</h5>
              <small style={{color: 'rgba(255,255,255,0.7)'}}>Manage your products and track your business</small>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <button className="btn btn-sm" style={{background: '#28a745', color: '#fff', borderRadius: '6px'}} onClick={handleRefreshProfile}>
                <i className="fas fa-sync me-1"></i>Refresh
              </button>
              <button className="btn btn-sm" style={{background: '#667eea', color: '#fff', borderRadius: '6px'}} onClick={() => navigate('/seller/profile/edit')}>
                <i className="fas fa-edit me-1"></i>Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* â”€â”€ ALERTS â”€â”€ */}
        {seller.verificationStatus === 'approved' && showVerifiedBanner && (
          <div className="sd-alert sd-alert-success d-flex justify-content-between align-items-center">
            <span><i className="fas fa-check-circle me-2"></i>Your account is fully verified! You have unlimited dashboard access.</span>
            <button className="btn btn-sm p-0 ms-2" style={{background: 'none', border: 'none', color: '#155724', fontSize: '1rem'}} onClick={() => { localStorage.setItem('verifiedBannerDismissed', '1'); setShowVerifiedBanner(false); }}>âœ•</button>
          </div>
        )}
        {seller.verificationStatus === 'pending' && (
          <div className="sd-alert sd-alert-info"><i className="fas fa-clock me-2"></i>Your verification documents are under review. You'll be notified once approved.</div>
        )}
        {(seller.verificationStatus === 'required' || seller.verificationStatus === 'not_required' || !seller.verificationStatus) && (
          <div className="sd-alert sd-alert-warning d-flex justify-content-between align-items-center flex-wrap gap-2">
            <span><i className="fas fa-exclamation-triangle me-2"></i><strong>Verification required.</strong> Submit your CNIC documents to unlock full access.</span>
            <button className="btn btn-sm btn-warning" onClick={() => setShowVerificationModal(true)}><i className="fas fa-upload me-1"></i>Submit Docs</button>
          </div>
        )}
        {seller.verificationStatus === 'rejected' && (
          <div className="sd-alert sd-alert-danger d-flex justify-content-between align-items-center flex-wrap gap-2">
            <span><i className="fas fa-times-circle me-2"></i><strong>Verification rejected.</strong> Please resubmit your documents.</span>
            <button className="btn btn-sm btn-danger" onClick={() => setShowVerificationModal(true)}><i className="fas fa-redo me-1"></i>Resubmit</button>
          </div>
        )}
        {dashboardAccess?.daysRemaining > 0 && dashboardAccess.daysRemaining <= 5 && (
          <div className="sd-alert sd-alert-warning"><i className="fas fa-clock me-2"></i><strong>{dashboardAccess.daysRemaining} days</strong> remaining in trial. Submit verification to avoid interruption.</div>
        )}
        {seller.canListProducts && (
          <div className="sd-alert sd-alert-success"><i className="fas fa-check-circle me-2"></i>You can now list products! Start adding your inventory.</div>
        )}

        {/* â”€â”€ STATS ROW â”€â”€ */}
        <div className="row g-2 mb-3">
          <div className="col-6 col-md-3">
            <div className="sd-stat" style={{background: 'linear-gradient(135deg, #ff6b35, #f7931e)'}}>
              <div>
                <div style={{fontSize: '0.65rem', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Supplier ID</div>
                <div style={{fontSize: '1.1rem', fontWeight: 800}}>{seller.supplierId}</div>
              </div>
              <i className="fas fa-id-card" style={{fontSize: '1.6rem', opacity: 0.5}}></i>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="sd-stat" style={{background: 'linear-gradient(135deg, #28a745, #20c997)'}}>
              <div>
                <div style={{fontSize: '0.65rem', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Status</div>
                <div style={{fontSize: '1.1rem', fontWeight: 800, textTransform: 'capitalize'}}>{seller.status}</div>
              </div>
              <i className="fas fa-check-circle" style={{fontSize: '1.6rem', opacity: 0.5}}></i>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="sd-stat" style={{background: 'linear-gradient(135deg, #17a2b8, #007bff)'}}>
              <div>
                <div style={{fontSize: '0.65rem', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Total Products</div>
                <div style={{fontSize: '1.1rem', fontWeight: 800}}>{stats.totalProducts}</div>
              </div>
              <i className="fas fa-box" style={{fontSize: '1.6rem', opacity: 0.5}}></i>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="sd-stat" style={{background: 'linear-gradient(135deg, #ffc107, #fd7e14)'}}>
              <div>
                <div style={{fontSize: '0.65rem', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Listing Requests</div>
                <div style={{fontSize: '1.1rem', fontWeight: 800}}>{listingRequests.length}</div>
              </div>
              <i className="fas fa-list-alt" style={{fontSize: '1.6rem', opacity: 0.5}}></i>
            </div>
          </div>
        </div>

        {/* â”€â”€ QUICK ACTIONS â”€â”€ */}
        <div className="sd-card mb-3">
          <div className="sd-card-header"><i className="fas fa-bolt" style={{color: '#ffc107'}}></i>Quick Actions</div>
          <div className="sd-card-body">
            <div className="row g-2">
              {[
                { icon: 'fas fa-paper-plane', label: 'Request Products', sub: 'Browse & request', color: '#28a745', path: '/seller/admin-products', disabled: seller?.verificationStatus !== 'approved' },
                { icon: 'fas fa-list', label: 'My Products', sub: 'View listings', color: '#17a2b8', path: '/seller/listed-products' },
                { icon: 'fas fa-inbox', label: 'Buyer Queries', sub: 'Product demands', color: '#e74c3c', path: '/seller/buyer-queries' },
                { icon: 'fas fa-edit', label: 'Edit Profile', sub: 'Update info', color: '#fd7e14', path: '/seller/profile/edit' },
              ].map((a, i) => (
                <div key={i} className="col-6 col-sm-3" style={{flex: '0 0 25%', maxWidth: '25%'}}>
                  <button
                    className="sd-qa-btn"
                    style={{background: a.disabled ? '#e9ecef' : a.color + '18', color: a.disabled ? '#aaa' : a.color, border: `1.5px solid ${a.disabled ? '#dee2e6' : a.color + '44'}`}}
                    onClick={() => !a.disabled && navigate(a.path)}
                    disabled={a.disabled}
                  >
                    <i className={a.icon}></i>
                    <span>{a.label}</span>
                    <small style={{opacity: 0.7, fontSize: '0.68rem'}}>{a.sub}</small>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* â”€â”€ MAIN CONTENT: Info + Requests side by side â”€â”€ */}
        <div className="row g-3 mb-3">
          {/* Seller Info */}
          <div className="col-lg-5">
            <div className="sd-card h-100">
              <div className="sd-card-header"><i className="fas fa-user" style={{color: '#667eea'}}></i>Seller Information</div>
              <div className="sd-card-body">
                {[
                  { label: 'Username', value: seller?.username },
                  { label: 'Email', value: seller?.email },
                  { label: 'WhatsApp', value: seller?.whatsappNo ? (
                    <a href={`https://wa.me/${seller.whatsappNo.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm py-0 px-2" style={{fontSize: '0.75rem'}}>
                      <i className="fab fa-whatsapp me-1"></i>{seller.whatsappNo}
                    </a>
                  ) : 'Not provided' },
                  { label: 'Location', value: seller?.city && seller?.country ? `${seller.city}, ${seller.country}` : 'Not provided' },
                  { label: 'Category', value: seller?.productCategory || 'Not specified' },
                  { label: 'Account Status', value: <span className={`badge bg-${seller?.status === 'active' ? 'success' : 'warning'}`}>{seller?.status?.toUpperCase()}</span> },
                  { label: 'Verification', value: (
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge bg-${seller?.verificationStatus === 'approved' ? 'success' : seller?.verificationStatus === 'pending' ? 'warning' : seller?.verificationStatus === 'rejected' ? 'danger' : 'secondary'}`}>
                        {seller?.verificationStatus === 'approved' ? 'VERIFIED' : seller?.verificationStatus === 'pending' ? 'UNDER REVIEW' : seller?.verificationStatus === 'rejected' ? 'REJECTED' : 'PENDING'}
                      </span>
                      {(seller?.verificationStatus === 'required' || seller?.verificationStatus === 'not_required' || seller?.verificationStatus === 'rejected') && (
                        <button className="btn btn-warning btn-sm py-0 px-2" style={{fontSize: '0.7rem'}} onClick={() => setShowVerificationModal(true)}><i className="fas fa-id-card"></i></button>
                      )}
                    </div>
                  )},
                  { label: 'Can List Products', value: <span className={`badge bg-${(seller?.canListProducts || seller?.verificationStatus === 'approved') ? 'success' : 'danger'}`}>{(seller?.canListProducts || seller?.verificationStatus === 'approved') ? 'YES' : 'NO'}</span> },
                  { label: 'Joined', value: seller?.createdAt ? new Date(seller.createdAt).toLocaleDateString() : 'Unknown' },
                ].map((row, i) => (
                  <div key={i} className="sd-info-row">
                    <span className="sd-info-label">{row.label}</span>
                    <span style={{fontSize: '0.85rem', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word'}}>{row.value}</span>
                  </div>
                ))}
                {dashboardAccess?.daysRemaining > 0 && seller.verificationStatus === 'not_required' && (
                  <div className="sd-info-row">
                    <span className="sd-info-label">Trial Days</span>
                    <span className={`badge bg-${dashboardAccess.daysRemaining <= 5 ? 'warning' : 'info'}`}>{dashboardAccess.daysRemaining} days</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Listing Requests */}
          <div className="col-lg-7">
            <div className="sd-card h-100">
              <div className="sd-card-header d-flex justify-content-between align-items-center">
                <span><i className="fas fa-list-alt me-2" style={{color: '#28a745'}}></i>Recent Listing Requests</span>
                <button className="btn btn-sm" style={{fontSize: '0.72rem', padding: '3px 10px', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: '6px'}}
                  onClick={() => navigate('/seller/admin-products')}
                  disabled={seller?.verificationStatus !== 'approved'}>
                  <i className="fas fa-paper-plane me-1"></i>Browse &amp; Request
                </button>
              </div>
              <div className="sd-card-body">
                {listingRequests.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="fas fa-clock fa-2x mb-2" style={{color: '#ffc107'}}></i>
                    <p className="mb-1" style={{fontSize: '0.85rem', fontWeight: 600, color: '#374151'}}>No pending requests yet.</p>
                    <small className="text-muted">Click "Browse & Request" to submit your first listing request to admin.</small>
                  </div>
                ) : (
                  <div>
                    {listingRequests.slice(-5).map((req, i) => (
                      <div key={i} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: i < Math.min(listingRequests.length, 5) - 1 ? '1px solid #f0f2f5' : 'none', gap: '8px'}}>
                        <div style={{flex: 1, minWidth: 0}}>
                          <div style={{fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{req.productName}</div>
                          <div style={{fontSize: '0.72rem', color: '#6b7280'}}>£{req.sellerPrice ? parseFloat(req.sellerPrice).toFixed(2) : 'N/A'} · {req.submittedAt ? new Date(req.submittedAt).toLocaleDateString() : ''}</div>
                        </div>
                        <span className={`badge bg-${req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'}`} style={{fontSize: '0.65rem', whiteSpace: 'nowrap'}}>
                          {req.status === 'pending_approval' ? 'PENDING' : req.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AVAILABLE PRODUCTS TO REQUEST */}
        <div className="sd-card">
          <div className="sd-card-header d-flex justify-content-between align-items-center" style={{background: 'linear-gradient(135deg, #1a1a2e, #16213e)', color: '#fff', borderBottom: 'none'}}>
            <span><i className="fas fa-boxes me-2"></i>Available Products — Request to List</span>
            <button className="btn btn-sm" style={{background: '#ff6b35', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700}}
              onClick={() => navigate('/seller/admin-products')}
              disabled={seller?.verificationStatus !== 'approved'}>
              <i className="fas fa-th-large me-1"></i>View All Products
            </button>
          </div>
          <div className="sd-card-body">
            <small className="text-muted d-block mb-3" style={{fontSize: '0.78rem'}}>
              <i className="fas fa-info-circle me-1 text-info"></i>
              Click "Request to List" on any product. Admin will review and approve your request.
            </small>
            {loadingPreview ? (
              <div className="text-center py-3">
                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                <small className="text-muted ms-2">Loading products...</small>
              </div>
            ) : previewProducts.length > 0 ? (
              <div className="row g-2">
                {previewProducts.slice(0, 6).map((product) => (
                  <div key={product._id} className="col-6 col-sm-4 col-md-2">
                    <div className="sd-product-card" style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                      <img src={product.images?.[0] || 'https://via.placeholder.com/150x80?text=No+Image'} alt={product.name}
                        onError={e => { e.target.src = 'https://via.placeholder.com/150x80?text=No+Image' }} />
                      <div className="body" style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '4px'}}>
                        <div style={{fontSize: '0.68rem', fontWeight: 600, lineHeight: 1.2, height: '2.4em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>{product.name}</div>
                        <div style={{fontSize: '0.75rem', fontWeight: 700, color: '#28a745'}}>£{product.price}</div>
                        <button
                          className="btn btn-sm mt-auto"
                          style={{fontSize: '0.62rem', padding: '3px 6px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', width: '100%'}}
                          onClick={() => navigate('/seller/admin-products')}
                          disabled={seller?.verificationStatus !== 'approved'}>
                          <i className="fas fa-paper-plane me-1"></i>Request to List
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 text-muted" style={{fontSize: '0.85rem'}}>No products available.</div>
            )}
            {seller?.verificationStatus !== 'approved' && (
              <div className="sd-alert sd-alert-warning mt-3 mb-0">
                <i className="fas fa-exclamation-triangle me-2"></i>
                {seller?.verificationStatus === 'pending'
                  ? <><strong>Under Review:</strong> Your documents are being reviewed. You'll be able to request products once approved.</>
                  : <><strong>Verification Required:</strong> Complete your verification to request products.</>
                }
              </div>
            )}
          </div>
        </div>

      </div>

      {/* â”€â”€ VERIFICATION MODAL â”€â”€ */}
      {showVerificationModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Submit Verification Documents</h5>
                <button type="button" className="btn-close" onClick={() => setShowVerificationModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">CNIC Number</label>
                  <input type="text" className="form-control" value={verificationDocs.cnicNumber}
                    onChange={e => setVerificationDocs({...verificationDocs, cnicNumber: e.target.value})}
                    placeholder="e.g., 12345-1234567-1" maxLength="15" />
                </div>
                {[
                  { key: 'idCardFront', label: 'CNIC Front Side' },
                  { key: 'idCardBack', label: 'CNIC Back Side' },
                  { key: 'idCardWithFace', label: 'CNIC with Selfie' },
                ].map(({ key, label }) => (
                  <div className="mb-3" key={key}>
                    <label className="form-label"><strong>{label}</strong></label>
                    <input type="file" className="form-control" accept="image/*"
                      onChange={e => {
                        const file = e.target.files[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = ev => setVerificationDocs(d => ({...d, [key]: ev.target.result}))
                          reader.readAsDataURL(file)
                        }
                      }} />
                    {verificationDocs[key] && (
                      <img src={verificationDocs[key]} alt={label} className="img-thumbnail mt-2" style={{width: '180px', height: '110px', objectFit: 'cover'}} />
                    )}
                  </div>
                ))}
                <div className="alert alert-info mb-0">
                  <small><i className="fas fa-info-circle me-1"></i>Ensure all CNIC images are clear and readable.</small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowVerificationModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleVerificationSubmit}>Submit Documents</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )


}

export default SellerDashboard
