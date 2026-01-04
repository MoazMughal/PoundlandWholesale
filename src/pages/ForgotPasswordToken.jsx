import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiUrl } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumb from '../components/Breadcrumb';

const ForgotPasswordToken = () => {
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState('buyer');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(getApiUrl('auth/forgot-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          userType: userType
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setEmail(''); // Clear email field
        
        // Log development info if available
        if (data.developmentUrl) {
          console.log('🔧 Development Reset URL:', data.developmentUrl);
          // Only show URL in console for development, never on the page
        }
      } else {
        setError(data.message || 'Failed to send reset link');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('Failed to send reset link. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      padding: '20px 0'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '0 20px'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center' 
        }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '400px' 
          }}>
            {/* Breadcrumb */}
            <div style={{ marginBottom: '20px' }}>
              <Breadcrumb customItems={[
                { label: 'Home', href: '/' },
                { label: 'Login', href: '/auth' },
                { label: 'Forgot Password' }
              ]} />
            </div>
            
            <div style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              padding: '30px'
            }}>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '50%',
                  marginBottom: '15px'
                }}>
                  <i className="fas fa-envelope" style={{ 
                    fontSize: '24px', 
                    color: 'white' 
                  }}></i>
                </div>
                <h2 style={{ 
                  fontWeight: 'bold', 
                  color: '#333', 
                  marginBottom: '8px',
                  fontSize: '24px'
                }}>
                  Forgot Password?
                </h2>
                <p style={{ 
                  color: '#666', 
                  fontSize: '14px', 
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  Enter your email and we'll send you a reset link
                </p>
              </div>

              {/* Success Message */}
              {success && (
                <div style={{
                  background: '#f0f9ff',
                  border: '1px solid #0ea5e9',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'flex-start'
                }}>
                  <i className="fas fa-check-circle" style={{
                    color: '#0ea5e9',
                    fontSize: '16px',
                    marginRight: '10px',
                    marginTop: '2px'
                  }}></i>
                  <div>
                    <div style={{ 
                      fontWeight: '600', 
                      color: '#0c4a6e',
                      marginBottom: '4px',
                      fontSize: '14px'
                    }}>
                      Email Sent!
                    </div>
                    <div style={{ 
                      fontSize: '13px', 
                      color: '#0c4a6e'
                    }}>
                      {success}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #ef4444',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <i className="fas fa-exclamation-circle" style={{
                      color: '#ef4444',
                      fontSize: '16px',
                      marginRight: '8px'
                    }}></i>
                    <span style={{ 
                      fontSize: '13px', 
                      color: '#991b1b' 
                    }}>
                      {error}
                    </span>
                  </div>
                  <button 
                    onClick={() => setError('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: '2px'
                    }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Account Type */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ 
                    display: 'block',
                    fontWeight: '600',
                    fontSize: '13px',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Account Type
                  </label>
                  <select
                    value={userType}
                    onChange={(e) => setUserType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: 'white',
                      transition: 'all 0.3s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <option value="buyer">Buyer/Retailer</option>
                    <option value="seller">Seller/Supplier</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Email Input */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block',
                    fontWeight: '600',
                    fontSize: '13px',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af',
                      zIndex: 1
                    }}>
                      <i className="fas fa-envelope"></i>
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 40px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: 'white',
                        transition: 'all 0.3s ease',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button 
                  type="submit" 
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    marginBottom: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 6px 12px rgba(102, 126, 234, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                >
                  {loading ? (
                    <LoadingSpinner size="small" color="white" text="Sending..." />
                  ) : (
                    <>
                      <i className="fas fa-paper-plane" style={{ marginRight: '6px' }}></i>
                      Send Reset Link
                    </>
                  )}
                </button>

                {/* Back to Login */}
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                  <Link 
                    to="/auth" 
                    style={{
                      color: '#667eea',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: '500',
                      display: 'inline-flex',
                      alignItems: 'center',
                      transition: 'color 0.3s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#4f46e5'}
                    onMouseLeave={(e) => e.target.style.color = '#667eea'}
                  >
                    <i className="fas fa-arrow-left" style={{ marginRight: '5px' }}></i>
                    Back to Login
                  </Link>
                </div>
              </form>

              {/* Divider */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                margin: '15px 0'
              }}>
                <div style={{
                  flex: 1,
                  height: '1px',
                  background: '#e5e7eb'
                }}></div>
                <span style={{
                  padding: '0 12px',
                  fontSize: '12px',
                  color: '#9ca3af'
                }}>
                  OR
                </span>
                <div style={{
                  flex: 1,
                  height: '1px',
                  background: '#e5e7eb'
                }}></div>
              </div>

              {/* Alternative Option */}
              <div style={{ textAlign: 'center' }}>
                <p style={{ 
                  fontSize: '12px', 
                  color: '#6b7280', 
                  marginBottom: '8px' 
                }}>
                  Prefer OTP verification?
                </p>
                <Link 
                  to="/forgot-password" 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '8px 16px',
                    background: 'transparent',
                    border: '2px solid #667eea',
                    borderRadius: '6px',
                    color: '#667eea',
                    textDecoration: 'none',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#667eea';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.color = '#667eea';
                  }}
                >
                  <i className="fab fa-whatsapp" style={{ marginRight: '6px' }}></i>
                  Use WhatsApp OTP
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordToken;
