import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';

const PaymentVerifications = () => {
  const navigate = useNavigate();
  const { admin, isLoggedIn, loading: authLoading, authResolved } = useAdmin();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  const openFileInNewTab = async (filename) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/auth/admin/payment-verification-file-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename })
      });

      if (response.ok) {
        const data = await response.json();
        const fileUrl = `/api/auth/admin/payment-verification-file/${filename}/${data.tempToken}`;
        window.open(fileUrl, '_blank');
      } else {
        alert('Failed to access file');
      }
    } catch (error) {
      console.error('Error opening file:', error);
      alert('Failed to open file');
    }
  };

  useEffect(() => {
    // Wait for authentication to be resolved before checking login status
    if (!authResolved || authLoading) {
      return;
    }

    if (!isLoggedIn || !admin) {
      navigate('/admin/login');
      return;
    }
    fetchVerifications();
  }, [isLoggedIn, admin, currentPage, statusFilter, authResolved, authLoading]);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/auth/admin/payment-verifications?status=${statusFilter}&page=${currentPage}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVerifications(data.verifications);
        setTotalPages(data.pagination.total);
      } else {
        console.error('Failed to fetch payment verifications');
      }
    } catch (error) {
      console.error('Error fetching payment verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (verificationId, status) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/auth/admin/payment-verifications/${verificationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          adminNotes
        })
      });

      if (response.ok) {
        closeModal();
        setAdminNotes('');
        fetchVerifications();
        alert(`Payment verification ${status} successfully!`);
      } else {
        const data = await response.json();
        alert(`Failed to ${status} verification: ${data.message}`);
      }
    } catch (error) {
      console.error(`Error ${status} verification:`, error);
      alert(`Failed to ${status} verification`);
    } finally {
      setActionLoading(false);
    }
  };

  const openModal = (verification) => {
    setSelectedVerification(verification);
    setAdminNotes('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedVerification(null);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-warning', text: 'Pending Review', icon: 'fa-clock' },
      approved: { bg: 'bg-success', text: 'Approved', icon: 'fa-check-circle' },
      rejected: { bg: 'bg-danger', text: 'Rejected', icon: 'fa-times-circle' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`badge ${config.bg}`} style={{ fontSize: '0.75rem' }}>
        <i className={`fas ${config.icon} me-1`}></i>
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && verifications.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #e3e3e3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <h5 style={{ color: '#6c757d' }}>Loading Payment Verifications...</h5>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      padding: '20px'
    }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '15px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '30px',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px'
          }}>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <h2 style={{
                margin: '0 0 5px 0',
                fontSize: '24px',
                fontWeight: '700'
              }}>
                <i className="fas fa-credit-card" style={{ marginRight: '10px' }}></i>
                Payment Verifications
              </h2>
              <p style={{
                margin: 0,
                opacity: 0.95,
                fontSize: '14px'
              }}>
                Review and approve buyer payment verifications
              </p>
            </div>
            <button
              onClick={() => navigate('/admin/dashboard')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                borderRadius: '6px',
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <i className="fas fa-arrow-left" style={{ marginRight: '8px' }}></i>
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          padding: '25px',
          background: '#f8f9fa',
          borderBottom: '1px solid #dee2e6'
        }}>
          <div style={{
            display: 'flex',
            gap: '15px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div>
              <label style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#495057',
                marginRight: '8px'
              }}>
                Filter by Status:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '8px 12px',
                  border: '2px solid #e9ecef',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="all">All Verifications</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Verifications List */}
        <div style={{ padding: '25px' }}>
          {verifications.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6c757d'
            }}>
              <i className="fas fa-inbox" style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.5 }}></i>
              <h5>No payment verifications found</h5>
              <p>No verifications match your current filter criteria</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {verifications.map(verification => (
                <div
                  key={verification._id}
                  style={{
                    border: '1px solid #e9ecef',
                    borderRadius: '12px',
                    padding: '20px',
                    background: 'white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '15px',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div>
                      <h6 style={{
                        margin: '0 0 5px 0',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1f2937'
                      }}>
                        {verification.buyerName}
                      </h6>
                      <p style={{
                        margin: '0 0 5px 0',
                        fontSize: '14px',
                        color: '#6b7280'
                      }}>
                        {verification.buyerEmail}
                      </p>
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#9ca3af'
                      }}>
                        Product: {verification.productName}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {getStatusBadge(verification.status)}
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        marginTop: '5px'
                      }}>
                        Submitted: {formatDate(verification.submittedAt)}
                      </div>
                      {verification.reviewedAt && (
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          Reviewed: {formatDate(verification.reviewedAt)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={() => openModal(verification)}
                      style={{
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <i className="fas fa-eye"></i>
                      Review Details
                    </button>

                    {verification.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedVerification(verification);
                            setAdminNotes('');
                            handleAction(verification._id, 'approved');
                          }}
                          disabled={actionLoading}
                          style={{
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            fontSize: '14px',
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: actionLoading ? 0.6 : 1
                          }}
                        >
                          <i className="fas fa-check"></i>
                          Quick Approve
                        </button>
                      </>
                    )}

                    {verification.adminNotes && (
                      <div style={{
                        background: '#f3f4f6',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#4b5563',
                        flex: 1,
                        minWidth: '200px'
                      }}>
                        <strong>Admin Notes:</strong> {verification.adminNotes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              marginTop: '30px'
            }}>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 12px',
                  border: '2px solid #dee2e6',
                  background: currentPage === 1 ? '#f8f9fa' : 'white',
                  color: currentPage === 1 ? '#6c757d' : '#495057',
                  borderRadius: '6px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>

              <span style={{
                padding: '8px 16px',
                fontSize: '14px',
                color: '#495057'
              }}>
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 12px',
                  border: '2px solid #dee2e6',
                  background: currentPage === totalPages ? '#f8f9fa' : 'white',
                  color: currentPage === totalPages ? '#6c757d' : '#495057',
                  borderRadius: '6px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showModal && selectedVerification && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h4 style={{
                margin: 0,
                color: '#1f2937',
                fontSize: '1.25rem',
                fontWeight: '700'
              }}>
                Payment Verification Review
              </h4>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h6 style={{ marginBottom: '10px', color: '#374151' }}>Buyer Information</h6>
              <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '6px' }}>
                <p style={{ margin: '0 0 5px 0' }}><strong>Name:</strong> {selectedVerification.buyerName}</p>
                <p style={{ margin: '0 0 5px 0' }}><strong>Email:</strong> {selectedVerification.buyerEmail}</p>
                <p style={{ margin: 0 }}><strong>Product:</strong> {selectedVerification.productName}</p>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h6 style={{ marginBottom: '10px', color: '#374151' }}>Uploaded Files</h6>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>Payment Receipt</p>
                  <div style={{
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '10px',
                    textAlign: 'center',
                    minWidth: '150px'
                  }}>
                    {selectedVerification.paymentReceipt?.filename ? (
                      <div>
                        <button
                          onClick={() => openFileInNewTab(selectedVerification.paymentReceipt.filename)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            color: '#667eea',
                            padding: 0
                          }}
                        >
                          {selectedVerification.paymentReceipt.mimetype?.startsWith('image/') ? (
                            <i className="fas fa-image" style={{ fontSize: '24px', color: '#6b7280', marginBottom: '5px' }}></i>
                          ) : (
                            <i className="fas fa-file-pdf" style={{ fontSize: '24px', color: '#ef4444', marginBottom: '5px' }}></i>
                          )}
                          <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                            {selectedVerification.paymentReceipt.filename}
                          </p>
                          <p style={{ margin: 0, fontSize: '10px', color: '#9ca3af' }}>
                            Click to view
                          </p>
                        </button>
                      </div>
                    ) : (
                      <div>
                        <i className="fas fa-file-alt" style={{ fontSize: '24px', color: '#6b7280', marginBottom: '5px' }}></i>
                        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                          No file uploaded
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>ID Picture</p>
                  <div style={{
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '10px',
                    textAlign: 'center',
                    minWidth: '150px'
                  }}>
                    {selectedVerification.idPicture?.filename ? (
                      <div>
                        <button
                          onClick={() => openFileInNewTab(selectedVerification.idPicture.filename)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            color: '#667eea',
                            padding: 0
                          }}
                        >
                          <i className="fas fa-id-card" style={{ fontSize: '24px', color: '#6b7280', marginBottom: '5px' }}></i>
                          <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                            {selectedVerification.idPicture.filename}
                          </p>
                          <p style={{ margin: 0, fontSize: '10px', color: '#9ca3af' }}>
                            Click to view
                          </p>
                        </button>
                      </div>
                    ) : (
                      <div>
                        <i className="fas fa-id-card" style={{ fontSize: '24px', color: '#6b7280', marginBottom: '5px' }}></i>
                        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                          No file uploaded
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {selectedVerification.status === 'pending' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={closeModal}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#fff',
                  color: '#374151',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Close
              </button>

              {selectedVerification.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleAction(selectedVerification._id, 'rejected')}
                    disabled={actionLoading}
                    style={{
                      padding: '10px 20px',
                      border: 'none',
                      backgroundColor: actionLoading ? '#9ca3af' : '#ef4444',
                      color: '#fff',
                      borderRadius: '6px',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {actionLoading ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-times"></i>
                    )}
                    Reject
                  </button>

                  <button
                    onClick={() => handleAction(selectedVerification._id, 'approved')}
                    disabled={actionLoading}
                    style={{
                      padding: '10px 20px',
                      border: 'none',
                      backgroundColor: actionLoading ? '#9ca3af' : '#10b981',
                      color: '#fff',
                      borderRadius: '6px',
                      cursor: actionLoading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {actionLoading ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-check"></i>
                    )}
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentVerifications;