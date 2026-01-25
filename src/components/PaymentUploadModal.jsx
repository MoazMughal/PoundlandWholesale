import { useState } from 'react';
import { useBuyer } from '../context/BuyerContext';

const PaymentUploadModal = ({ show, onClose, productId, productName }) => {
  const { buyer } = useBuyer();
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [idPicture, setIdPicture] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File size should be less than 5MB');
        return;
      }
      if (type === 'receipt') {
        setPaymentReceipt(file);
      } else if (type === 'id') {
        setIdPicture(file);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!paymentReceipt || !idPicture) {
      setMessage('Please upload both payment receipt and ID picture');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('paymentReceipt', paymentReceipt);
      formData.append('idPicture', idPicture);
      formData.append('productId', productId);
      formData.append('productName', productName);
      formData.append('buyerId', buyer._id);
      formData.append('buyerName', buyer.username || buyer.name);
      formData.append('buyerEmail', buyer.email);

      const token = localStorage.getItem('buyerToken');
      const response = await fetch('/api/buyer/payment-verification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Payment verification submitted successfully! Admin will review and approve within 24 hours.');
        setTimeout(() => {
          onClose();
          setPaymentReceipt(null);
          setIdPicture(null);
          setMessage('');
        }, 3000);
      } else {
        setMessage(data.message || 'Failed to submit payment verification');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setMessage('Failed to submit payment verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
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
        maxWidth: '500px',
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
          <h3 style={{
            margin: 0,
            color: '#1f2937',
            fontSize: '1.25rem',
            fontWeight: '700'
          }}>
            <i className="fas fa-credit-card" style={{ marginRight: '8px', color: '#10b981' }}></i>
            Payment Verification
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            color: '#0c4a6e',
            fontSize: '1rem',
            fontWeight: '600'
          }}>
            <i className="fas fa-mobile-alt" style={{ marginRight: '8px' }}></i>
            Payment Instructions
          </h4>
          <div style={{ fontSize: '14px', color: '#0c4a6e', lineHeight: '1.5' }}>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Account Number:</strong> <span style={{ fontSize: '16px', fontWeight: '700' }}>+923235685367</span>
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Network:</strong> Jazz Cash
            </p>
            <p style={{ margin: '0' }}>
              <strong>Amount:</strong> Rs. 500 (One-time payment for lifetime access)
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151'
            }}>
              <i className="fas fa-receipt" style={{ marginRight: '6px', color: '#10b981' }}></i>
              Payment Receipt *
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleFileChange(e, 'receipt')}
              style={{
                width: '100%',
                padding: '8px',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              required
            />
            {paymentReceipt && (
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center'
              }}>
                <i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i>
                {paymentReceipt.name}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151'
            }}>
              <i className="fas fa-id-card" style={{ marginRight: '6px', color: '#10b981' }}></i>
              ID Picture (CNIC/Passport) *
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'id')}
              style={{
                width: '100%',
                padding: '8px',
                border: '2px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              required
            />
            {idPicture && (
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center'
              }}>
                <i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i>
                {idPicture.name}
              </div>
            )}
          </div>

          {message && (
            <div style={{
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '16px',
              backgroundColor: message.includes('successfully') ? '#d1fae5' : '#fee2e2',
              border: `1px solid ${message.includes('successfully') ? '#10b981' : '#ef4444'}`,
              color: message.includes('successfully') ? '#065f46' : '#991b1b',
              fontSize: '14px'
            }}>
              <i className={`fas ${message.includes('successfully') ? 'fa-check-circle' : 'fa-exclamation-triangle'}`} style={{ marginRight: '6px' }}></i>
              {message}
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                border: '1px solid #d1d5db',
                backgroundColor: '#fff',
                color: '#374151',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !paymentReceipt || !idPicture}
              style={{
                padding: '10px 20px',
                border: 'none',
                backgroundColor: loading ? '#9ca3af' : '#10b981',
                color: '#fff',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Submitting...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Submit for Approval
                </>
              )}
            </button>
          </div>
        </form>

        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#92400e'
        }}>
          <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
          <strong>Note:</strong> After payment verification approval, you'll have lifetime access to view seller information for all products.
        </div>
      </div>
    </div>
  );
};

export default PaymentUploadModal;