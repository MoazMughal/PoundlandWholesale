import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiConfig from '../../config/api.config';

const PendingPayments = () => {
  const navigate = useNavigate();
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchPendingPayments();
  }, [navigate]);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(apiConfig.getApiUrl('buyer/admin/pending-payments'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingPayments(data.pendingPayments);
      } else {
        console.error('Failed to fetch pending payments');
      }
    } catch (error) {
      console.error('Error fetching pending payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (payment) => {
    if (!window.confirm(`Approve payment of Rs ${payment.amount} from ${payment.buyerName}?`)) {
      return;
    }

    setProcessing(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(
        apiConfig.getApiUrl(`buyer/admin/approve-payment/${payment.buyerId}/${payment.paymentId}`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ adminNotes })
        }
      );

      if (response.ok) {
        alert('✅ Payment approved successfully!');
        setSelectedPayment(null);
        setAdminNotes('');
        fetchPendingPayments();
      } else {
        alert('❌ Failed to approve payment');
      }
    } catch (error) {
      console.error('Error approving payment:', error);
      alert('❌ Error approving payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (payment) => {
    const reason = window.prompt('Enter reason for rejection:');
    if (!reason) return;

    setProcessing(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(
        apiConfig.getApiUrl(`buyer/admin/reject-payment/${payment.buyerId}/${payment.paymentId}`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ adminNotes: reason })
        }
      );

      if (response.ok) {
        alert('✅ Payment rejected');
        setSelectedPayment(null);
        fetchPendingPayments();
      } else {
        alert('❌ Failed to reject payment');
      }
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('❌ Error rejecting payment');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading pending payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <i className="fas fa-receipt me-2"></i>
          Pending Payment Approvals
        </h2>
        <button 
          onClick={() => navigate('/admin/dashboard')} 
          className="btn btn-outline-secondary"
        >
          <i className="fas fa-arrow-left me-2"></i>
          Back to Dashboard
        </button>
      </div>

      {pendingPayments.length === 0 ? (
        <div className="alert alert-info">
          <i className="fas fa-info-circle me-2"></i>
          No pending payments to review
        </div>
      ) : (
        <div className="row">
          {pendingPayments.map((payment) => (
            <div key={payment.paymentId} className="col-md-6 col-lg-4 mb-4">
              <div className="card shadow-sm h-100">
                <div className="card-header bg-warning text-dark">
                  <h5 className="mb-0">
                    <i className="fas fa-clock me-2"></i>
                    Pending Approval
                  </h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <strong>Buyer:</strong>
                    <div>{payment.buyerName}</div>
                    <small className="text-muted">{payment.buyerEmail}</small>
                  </div>

                  <div className="mb-3">
                    <strong>Amount:</strong>
                    <div className="h4 text-success mb-0">
                      {payment.currency} {payment.amount}
                    </div>
                  </div>

                  <div className="mb-3">
                    <strong>Payment Method:</strong>
                    <div className="text-capitalize">{payment.paymentMethod}</div>
                  </div>

                  <div className="mb-3">
                    <strong>Transaction ID:</strong>
                    <div className="font-monospace small">{payment.transactionId}</div>
                  </div>

                  {payment.product && (
                    <div className="mb-3">
                      <strong>Product:</strong>
                      <div className="d-flex align-items-center mt-2">
                        {payment.product.images && payment.product.images[0] && (
                          <img 
                            src={payment.product.images[0]} 
                            alt={payment.product.name}
                            style={{
                              width: '50px',
                              height: '50px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              marginRight: '10px'
                            }}
                          />
                        )}
                        <div>
                          <div className="small">{payment.product.name}</div>
                          <div className="text-muted small">£{payment.product.price}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-3">
                    <strong>Payment Date:</strong>
                    <div className="small">
                      {new Date(payment.paymentDate).toLocaleString()}
                    </div>
                  </div>

                  {payment.paymentReceipt && (
                    <div className="mb-3">
                      <strong>Payment Receipt:</strong>
                      <div className="mt-2">
                        <img 
                          src={payment.paymentReceipt} 
                          alt="Payment Receipt"
                          style={{
                            width: '100%',
                            maxHeight: '300px',
                            objectFit: 'contain',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                          onClick={() => window.open(payment.paymentReceipt, '_blank')}
                        />
                        <small className="text-muted d-block mt-1">
                          Click to view full size
                        </small>
                      </div>
                    </div>
                  )}
                </div>
                <div className="card-footer bg-light">
                  <div className="d-grid gap-2">
                    <button
                      onClick={() => handleApprove(payment)}
                      disabled={processing}
                      className="btn btn-success"
                    >
                      <i className="fas fa-check me-2"></i>
                      Approve Payment
                    </button>
                    <button
                      onClick={() => handleReject(payment)}
                      disabled={processing}
                      className="btn btn-danger"
                    >
                      <i className="fas fa-times me-2"></i>
                      Reject Payment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Receipt Modal */}
      {selectedPayment && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setSelectedPayment(null)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{padding: '20px'}}>
              <h4>Payment Receipt</h4>
              <img 
                src={selectedPayment.paymentReceipt} 
                alt="Receipt"
                style={{width: '100%', borderRadius: '8px'}}
              />
              <button 
                onClick={() => setSelectedPayment(null)}
                className="btn btn-secondary mt-3 w-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingPayments;
