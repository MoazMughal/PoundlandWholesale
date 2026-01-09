import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const AdminSellerVerifications = () => {
  const navigate = useNavigate()
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchPendingVerifications()
  }, [])

  const fetchPendingVerifications = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('http://localhost:5000/api/sellers/admin/verification-pending', {
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
      const response = await fetch(`http://localhost:5000/api/sellers/admin/verification/${id}/approve`, {
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
    const reason = prompt('Enter rejection reason:')
    if (!reason) return

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`http://localhost:5000/api/sellers/admin/verification/${id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      })

      if (response.ok) {
        alert('✅ Seller verification rejected')
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
    <div className="container-fluid mt-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-md-8">
          <h2>Seller Verifications</h2>
          <p className="text-muted">Review and approve seller verification documents</p>
        </div>
        <div className="col-md-4 text-end">
          <button className="btn btn-secondary" onClick={() => navigate('/admin/dashboard')}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
        </div>
      </div>

      {/* Verifications List */}
      {sellers.length === 0 ? (
        <div className="text-center py-5">
          <i className="fas fa-check-circle fa-3x text-muted mb-3"></i>
          <h4>No pending verifications</h4>
          <p className="text-muted">All seller verifications are up to date</p>
        </div>
      ) : (
        <div className="row">
          {sellers.map(seller => (
            <div key={seller._id} className="col-lg-6 col-xl-4 mb-4">
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
    </div>
  )
}

export default AdminSellerVerifications