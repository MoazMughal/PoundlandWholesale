import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiUrl } from '../../utils/api'

const AdminSellerVerifications = () => {
  const navigate = useNavigate()
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingSeller, setRejectingSeller] = useState(null)

  useEffect(() => {
    fetchPendingVerifications()
  }, [])

  const fetchPendingVerifications = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(getApiUrl('sellers/admin/verification-pending'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSellers(data.sellers)
      }
    } catch (error) {
      console.error('Error fetching verifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    if (!confirm('Are you sure you want to approve this seller verification?')) return

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(getApiUrl(`sellers/admin/verification/${id}/approve`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('✅ Seller verification approved successfully')
        fetchPendingVerifications()
      } else {
        const data = await response.json()
        alert('❌ ' + data.message)
      }
    } catch (error) {
      console.error('Approve error:', error)
      alert('❌ Failed to approve verification')
    }
  }

  const handleReject = async (id) => {
    setRejectingSeller(id)
    setShowRejectModal(true)
  }

  const confirmReject = async () => {
    if (!rejectingSeller) return

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(getApiUrl(`sellers/admin/verification/${rejectingSeller}/reject`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: rejectReason.trim() || null })
      })

      if (response.ok) {
        alert('✅ Seller verification rejected')
        setShowRejectModal(false)
        setRejectReason('')
        setRejectingSeller(null)
        fetchPendingVerifications()
      } else {
        const data = await response.json()
        alert('❌ ' + data.message)
      }
    } catch (error) {
      console.error('Reject error:', error)
      alert('❌ Failed to reject verification')
    }
  }

  const cancelReject = () => {
    setShowRejectModal(false)
    setRejectReason('')
    setRejectingSeller(null)
  }

  const viewDocuments = (seller) => {
    setSelectedSeller(seller)
    setShowModal(true)
  }

  if (loading) {
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
    <div style={{maxWidth: '1400px', margin: '0 auto', padding: '24px 16px'}}>
      {/* Header */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px'}}>
        <div>
          <h2 style={{margin: 0, fontWeight: 700}}>Seller Verifications</h2>
          <p style={{margin: '4px 0 0', color: '#6b7280'}}>Review and approve seller verification documents</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/admin/dashboard')}>
          <i className="fas fa-arrow-left me-1"></i> Back to Dashboard
        </button>
      </div>

      {/* Verifications List */}
      {sellers.length === 0 ? (
        <div className="text-center py-5">
          <i className="fas fa-check-circle fa-3x text-muted mb-3"></i>
          <h4>No pending verifications</h4>
          <p className="text-muted">All seller verifications are up to date</p>
        </div>
      ) : (
        <div className="row g-3">
          {sellers.map(seller => (
            <div key={seller._id} className="col-12 col-md-6 col-xl-4">
              <div className="card h-100">
                <div className="card-header">
                  <h6 className="mb-0">
                    <i className="fas fa-user"></i> {seller.username}
                  </h6>
                  <small className="text-muted">{seller.supplierId}</small>
                </div>
                <div className="card-body">
                  <div className="mb-2">
                    <strong>Email:</strong> {seller.email}
                  </div>
                  <div className="mb-2">
                    <strong>WhatsApp:</strong>{' '}
                    {(seller.whatsappNo || seller.contactNo) ? (
                      <a 
                        href={`https://wa.me/${(seller.whatsappNo || seller.contactNo).replace(/[^0-9]/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          color: '#25D366',
                          textDecoration: 'none',
                          fontWeight: '600'
                        }}
                      >
                        <i className="fab fa-whatsapp me-1"></i>
                        {seller.whatsappNo || seller.contactNo}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </div>
                  <div className="mb-2">
                    <strong>Location:</strong> {seller.city}, {seller.country}
                  </div>
                  <div className="mb-2">
                    <strong>Category:</strong> {seller.productCategory}
                  </div>
                  <div className="mb-2">
                    <strong>Submitted:</strong> {new Date(seller.verificationDocuments.submittedAt).toLocaleDateString()}
                  </div>
                  <div className="mb-3">
                    <span className="badge bg-warning">PENDING VERIFICATION</span>
                  </div>
                  
                  <div className="d-grid gap-2">
                    <button 
                      className="btn btn-info btn-sm"
                      onClick={() => viewDocuments(seller)}
                    >
                      <i className="fas fa-eye"></i> View Documents
                    </button>
                    <div className="btn-group">
                      <button 
                        className="btn btn-success btn-sm"
                        onClick={() => handleApprove(seller._id)}
                      >
                        <i className="fas fa-check"></i> Approve
                      </button>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => handleReject(seller._id)}
                      >
                        <i className="fas fa-times"></i> Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Viewer Modal */}
      {showModal && selectedSeller && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Verification Documents - {selectedSeller.username}
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <h6>CNIC Front</h6>
                    <div className="border p-2" style={{minHeight: '200px'}}>
                      {selectedSeller.verificationDocuments.idCardFront ? (
                        <img 
                          src={selectedSeller.verificationDocuments.idCardFront} 
                          alt="CNIC Front"
                          className="img-fluid"
                          style={{maxHeight: '300px'}}
                        />
                      ) : (
                        <div className="text-center text-muted">
                          <i className="fas fa-image fa-3x"></i>
                          <p>No image provided</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-4 mb-3">
                    <h6>CNIC Back</h6>
                    <div className="border p-2" style={{minHeight: '200px'}}>
                      {selectedSeller.verificationDocuments.idCardBack ? (
                        <img 
                          src={selectedSeller.verificationDocuments.idCardBack} 
                          alt="CNIC Back"
                          className="img-fluid"
                          style={{maxHeight: '300px'}}
                        />
                      ) : (
                        <div className="text-center text-muted">
                          <i className="fas fa-image fa-3x"></i>
                          <p>No image provided</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-4 mb-3">
                    <h6>CNIC with Selfie</h6>
                    <div className="border p-2" style={{minHeight: '200px'}}>
                      {selectedSeller.verificationDocuments.idCardWithFace ? (
                        <img 
                          src={selectedSeller.verificationDocuments.idCardWithFace} 
                          alt="CNIC with Selfie"
                          className="img-fluid"
                          style={{maxHeight: '300px'}}
                        />
                      ) : (
                        <div className="text-center text-muted">
                          <i className="fas fa-image fa-3x"></i>
                          <p>No image provided</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3">
                  <h6>Seller Information</h6>
                  <div className="row">
                    <div className="col-md-6">
                      <p><strong>Username:</strong> {selectedSeller.username}</p>
                      <p><strong>Email:</strong> {selectedSeller.email}</p>
                      <p>
                        <strong>WhatsApp:</strong>{' '}
                        {(selectedSeller.whatsappNo || selectedSeller.contactNo) ? (
                          <a 
                            href={`https://wa.me/${(selectedSeller.whatsappNo || selectedSeller.contactNo).replace(/[^0-9]/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{
                              color: '#25D366',
                              textDecoration: 'none',
                              fontWeight: '600'
                            }}
                          >
                            <i className="fab fa-whatsapp me-1"></i>
                            {selectedSeller.whatsappNo || selectedSeller.contactNo}
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <p><strong>Location:</strong> {selectedSeller.city}, {selectedSeller.country}</p>
                      <p><strong>Category:</strong> {selectedSeller.productCategory}</p>
                      <p><strong>Submitted:</strong> {new Date(selectedSeller.verificationDocuments.submittedAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={() => {
                    setShowModal(false)
                    handleReject(selectedSeller._id)
                  }}
                >
                  <i className="fas fa-times"></i> Reject
                </button>
                <button 
                  type="button" 
                  className="btn btn-success"
                  onClick={() => {
                    setShowModal(false)
                    handleApprove(selectedSeller._id)
                  }}
                >
                  <i className="fas fa-check"></i> Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectModal && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-times-circle text-danger"></i> Reject Verification
                </h5>
              </div>
              <div className="modal-body">
                <p className="mb-3">
                  <i className="fas fa-info-circle text-info"></i> 
                  You are about to reject this seller's verification. You can optionally provide a reason that will be shown to the seller.
                </p>
                <div className="mb-3">
                  <label className="form-label">Rejection Reason (Optional):</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejection (optional)..."
                    maxLength="500"
                  />
                  <small className="text-muted">
                    {rejectReason.length}/500 characters. This reason will be shown to the seller in their dashboard.
                  </small>
                </div>
                <div className="alert alert-warning">
                  <i className="fas fa-exclamation-triangle"></i> 
                  <strong>Note:</strong> The seller will be able to resubmit their documents after rejection.
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={cancelReject}
                >
                  <i className="fas fa-times"></i> Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={confirmReject}
                >
                  <i className="fas fa-times-circle"></i> Reject Verification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminSellerVerifications