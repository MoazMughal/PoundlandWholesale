import { useState } from 'react';

const PaymentModal = ({ isOpen, onClose, supplierId, productId, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState('jazzcash');
  const [transactionId, setTransactionId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file (JPG, PNG, etc.)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentReceipt(reader.result);
        setReceiptPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate receipt upload for Pakistani payment methods
      if ((paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa' || paymentMethod === 'bank_transfer') && !paymentReceipt) {
        alert('❌ Please upload payment receipt');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('buyerToken');
      const response = await fetch(`http://localhost:5000/api/buyer/unlock-supplier/${supplierId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentMethod,
          transactionId: paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa' || paymentMethod === 'bank_transfer' ? transactionId : undefined,
          paymentReceipt: paymentReceipt,
          productId: productId,
          cardDetails: (paymentMethod === 'visa' || paymentMethod === 'mastercard') ? {
            cardNumber,
            expiry: cardExpiry,
            cvv: cardCVV
          } : undefined
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.payment.status === 'pending') {
          alert('✅ Payment receipt submitted successfully!\n\nYour payment is pending admin approval. You will be notified once approved.\n\nTransaction ID: ' + data.payment.transactionId);
        } else {
          alert('✅ Payment successful! Supplier contact unlocked.\n\nTransaction ID: ' + data.payment.transactionId);
        }
        onSuccess();
        onClose();
      } else {
        // Show specific error message from backend
        const errorMessage = data.message || 'Payment failed. Please try again.';
        alert('❌ Payment Failed\n\n' + errorMessage);
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('❌ Payment Failed\n\nUnable to process payment. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px',
          borderRadius: '16px 16px 0 0',
          color: 'white'
        }}>
          <h2 style={{margin: 0, fontSize: '1.5rem'}}>🔓 Unlock Supplier Contact</h2>
          <p style={{margin: '5px 0 0 0', fontSize: '0.9rem', opacity: 0.9}}>
            Pay Rs 200 to access supplier details
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{padding: '25px'}}>
          {/* Payment Method Selection */}
          <div style={{marginBottom: '20px'}}>
            <label style={{display: 'block', marginBottom: '10px', fontWeight: '600', color: '#111827'}}>
              Select Payment Method
            </label>
            <div style={{display: 'grid', gap: '10px'}}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: `2px solid ${paymentMethod === 'jazzcash' ? '#667eea' : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                background: paymentMethod === 'jazzcash' ? '#f0f4ff' : 'white'
              }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="jazzcash"
                  checked={paymentMethod === 'jazzcash'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{marginRight: '10px'}}
                />
                <span style={{fontWeight: '600'}}>💳 JazzCash</span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: `2px solid ${paymentMethod === 'easypaisa' ? '#667eea' : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                background: paymentMethod === 'easypaisa' ? '#f0f4ff' : 'white'
              }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="easypaisa"
                  checked={paymentMethod === 'easypaisa'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{marginRight: '10px'}}
                />
                <span style={{fontWeight: '600'}}>💳 EasyPaisa</span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: `2px solid ${paymentMethod === 'bank_transfer' ? '#667eea' : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                background: paymentMethod === 'bank_transfer' ? '#f0f4ff' : 'white'
              }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bank_transfer"
                  checked={paymentMethod === 'bank_transfer'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{marginRight: '10px'}}
                />
                <span style={{fontWeight: '600'}}>🏦 Bank Transfer</span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: `2px solid ${paymentMethod === 'visa' ? '#667eea' : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                background: paymentMethod === 'visa' ? '#f0f4ff' : 'white'
              }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="visa"
                  checked={paymentMethod === 'visa'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{marginRight: '10px'}}
                />
                <span style={{fontWeight: '600'}}>💳 Visa Card (International)</span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                border: `2px solid ${paymentMethod === 'mastercard' ? '#667eea' : '#e5e7eb'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                background: paymentMethod === 'mastercard' ? '#f0f4ff' : 'white'
              }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="mastercard"
                  checked={paymentMethod === 'mastercard'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{marginRight: '10px'}}
                />
                <span style={{fontWeight: '600'}}>💳 Mastercard (International)</span>
              </label>
            </div>
          </div>

          {/* Payment Details */}
          {(paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa' || paymentMethod === 'bank_transfer') && (
            <div style={{
              padding: '15px',
              background: '#fef3c7',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #fbbf24'
            }}>
              <h4 style={{margin: '0 0 10px 0', color: '#92400e', fontSize: '0.95rem'}}>
                📱 Payment Instructions
              </h4>
              <p style={{margin: '0 0 10px 0', fontSize: '0.85rem', color: '#78350f'}}>
                <strong>Send Rs 200 to:</strong>
              </p>
              <p style={{margin: '0 0 10px 0', fontSize: '0.9rem', color: '#78350f', fontWeight: '600'}}>
                JazzCash: 03235685367
              </p>
              <p style={{margin: 0, fontSize: '0.85rem', color: '#78350f'}}>
                After payment, enter your transaction ID below
              </p>
            </div>
          )}

          {(paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa' || paymentMethod === 'bank_transfer') && (
            <>
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: '#111827'}}>
                  Transaction ID *
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter your transaction ID"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: '#111827'}}>
                  Upload Payment Receipt * 📸
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptUpload}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <small style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '4px', display: 'block'}}>
                  Upload screenshot of payment confirmation (JPG, PNG - Max 5MB)
                </small>
                
                {receiptPreview && (
                  <div style={{marginTop: '10px', textAlign: 'center'}}>
                    <img 
                      src={receiptPreview} 
                      alt="Receipt preview" 
                      style={{
                        maxWidth: '100%',
                        maxHeight: '200px',
                        borderRadius: '8px',
                        border: '2px solid #e5e7eb'
                      }}
                    />
                    <p style={{fontSize: '0.8rem', color: '#10b981', marginTop: '5px'}}>
                      ✓ Receipt uploaded successfully
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {(paymentMethod === 'visa' || paymentMethod === 'mastercard') && (
            <>
              <div style={{marginBottom: '15px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: '#111827'}}>
                  Card Number *
                </label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => {
                    // Allow only numbers and spaces
                    const value = e.target.value.replace(/[^\d\s]/g, '');
                    // Format with spaces every 4 digits
                    const formatted = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                    setCardNumber(formatted);
                  }}
                  placeholder="1234 5678 9012 3456"
                  maxLength="19"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    outline: 'none',
                    letterSpacing: '0.05em'
                  }}
                />
                <small style={{fontSize: '0.75rem', color: '#6b7280', marginTop: '4px', display: 'block'}}>
                  Enter 13-19 digit card number
                </small>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: '#111827'}}>
                    Expiry (MM/YY) *
                  </label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => {
                      // Format as MM/YY
                      let value = e.target.value.replace(/[^\d]/g, '');
                      if (value.length >= 2) {
                        value = value.slice(0, 2) + '/' + value.slice(2, 4);
                      }
                      setCardExpiry(value);
                    }}
                    placeholder="12/25"
                    maxLength="5"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: '#111827'}}>
                    CVV *
                  </label>
                  <input
                    type="text"
                    value={cardCVV}
                    onChange={(e) => {
                      // Allow only 3 digits
                      const value = e.target.value.replace(/[^\d]/g, '').slice(0, 3);
                      setCardCVV(value);
                    }}
                    placeholder="123"
                    maxLength="3"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{
                padding: '12px',
                background: '#fef3c7',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '0.85rem',
                color: '#92400e',
                border: '1px solid #fbbf24'
              }}>
                <strong>⚠️ Important:</strong> Rs 200 will be charged from your card and transferred to JazzCash: 03235685367. Supplier details will only be unlocked if payment is successful.
              </div>
            </>
          )}

          {/* Amount Display */}
          <div style={{
            padding: '15px',
            background: '#f3f4f6',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{fontWeight: '600', color: '#111827'}}>Total Amount:</span>
            <span style={{fontSize: '1.5rem', fontWeight: '700', color: '#667eea'}}>Rs 200</span>
          </div>

          {/* Buttons */}
          <div style={{display: 'flex', gap: '10px'}}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                background: '#f3f4f6',
                color: '#111827',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                background: loading ? '#9ca3af' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Processing...' : 'Pay Rs 200'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
