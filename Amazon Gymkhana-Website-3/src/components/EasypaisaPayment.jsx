import React, { useState } from 'react';

const EasypaisaPayment = ({ amount, supplierId, onSuccess }) => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayment = async () => {
    if (!mobileNumber.match(/^03\d{9}$/)) {
      setError('Please enter valid mobile number (03XXXXXXXXX)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/easypaisa/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: amount,
          mobileNumber: mobileNumber,
          description: 'Supplier Contact Unlock',
          supplierId: supplierId
        })
      });

      const data = await response.json();

      if (data.success) {
        // Create and submit form to Easypaisa
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.paymentUrl;

        Object.keys(data.formData).forEach(key => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = data.formData[key];
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } else {
        setError(data.message || 'Payment initiation failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <img 
          src="https://www.easypaisa.com.pk/wp-content/uploads/2021/03/easypaisa-logo.png" 
          alt="Easypaisa" 
          style={styles.logo}
        />
        <h3>Pay with Easypaisa</h3>
      </div>

      <div style={styles.form}>
        <label style={styles.label}>
          Easypaisa Mobile Number
          <input
            type="tel"
            placeholder="03001234567"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            maxLength="11"
            disabled={loading}
            style={styles.input}
          />
        </label>

        <div style={styles.summary}>
          <div style={styles.row}>
            <span>Amount:</span>
            <strong>PKR {amount}</strong>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button
          onClick={handlePayment}
          disabled={loading || !mobileNumber}
          style={{
            ...styles.button,
            opacity: loading || !mobileNumber ? 0.6 : 1
          }}
        >
          {loading ? 'Processing...' : `Pay PKR ${amount}`}
        </button>

        <div style={styles.info}>
          <p>✓ Secure payment via Easypaisa</p>
          <p>✓ You'll be redirected to Easypaisa</p>
          <p>✓ Enter your MPIN to complete payment</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '500px',
    margin: '20px auto',
    padding: '20px',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    backgroundColor: '#fff'
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px'
  },
  logo: {
    width: '150px',
    marginBottom: '10px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  label: {
    display: 'block',
    fontWeight: '500',
    marginBottom: '5px'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
    marginTop: '5px',
    boxSizing: 'border-box'
  },
  summary: {
    background: '#f9fafb',
    padding: '15px',
    borderRadius: '8px'
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0'
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '14px'
  },
  button: {
    width: '100%',
    padding: '15px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.3s'
  },
  info: {
    padding: '15px',
    background: '#eff6ff',
    borderRadius: '6px',
    fontSize: '14px'
  }
};

export default EasypaisaPayment;
