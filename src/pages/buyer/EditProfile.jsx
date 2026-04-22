import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Notification from '../../components/Notification';
import '../../styles/BuyerDashboard.css';
import '../../styles/BuyerEditProfile.css';

const EditProfile = () => {
  const [buyerData, setBuyerData] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Pakistan'
    }
  });
  const [emailData, setEmailData] = useState({
    newEmail: '',
    password: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const navigate = useNavigate();

  // Helper function to show toast notifications
  const showToastNotification = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    // Also update the inline message for backward compatibility
    setMessage({ type: type === 'success' ? 'success' : 'error', text: message });
  };

  useEffect(() => {
    const fetchBuyerData = async () => {
      const token = localStorage.getItem('buyerToken');
      const localBuyerData = localStorage.getItem('buyerData');
      
      if (!token) {
        navigate('/login/buyer');
        return;
      }

      // Load from localStorage immediately if available
      if (localBuyerData) {
        try {
          const buyer = JSON.parse(localBuyerData);
          setBuyerData(buyer);
          setFormData({
            firstName: buyer.firstName || '',
            lastName: buyer.lastName || '',
            phone: buyer.phone || '',
            address: {
              street: buyer.address?.street || '',
              city: buyer.address?.city || '',
              state: buyer.address?.state || '',
              zipCode: buyer.address?.zipCode || '',
              country: buyer.address?.country || 'Pakistan'
            }
          });
          setEmailData({
            newEmail: buyer.email || '',
            password: ''
          });
        } catch (error) {
          // Error parsing localStorage data
        }
      }

      try {
        const response = await fetch('http://localhost:5000/api/buyer/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setBuyerData(data.buyer);
          setFormData({
            firstName: data.buyer.firstName || '',
            lastName: data.buyer.lastName || '',
            phone: data.buyer.phone || '',
            address: {
              street: data.buyer.address?.street || '',
              city: data.buyer.address?.city || '',
              state: data.buyer.address?.state || '',
              zipCode: data.buyer.address?.zipCode || '',
              country: data.buyer.address?.country || 'Pakistan'
            }
          });
          setEmailData({
            newEmail: data.buyer.email || '',
            password: ''
          });
          // Clear any previous error messages
          setMessage({ type: '', text: '' });
        } else {
          const errorData = await response.json();
          
          if (response.status === 401) {
            // Token is invalid, clear it and redirect
            localStorage.removeItem('buyerToken');
            localStorage.removeItem('buyerData');
            navigate('/login/buyer');
          } else {
            // Try to load from localStorage as fallback
            const localBuyerData = localStorage.getItem('buyerData');
            if (localBuyerData && !buyerData) {
              const buyer = JSON.parse(localBuyerData);
              setBuyerData(buyer);
              setFormData({
                firstName: buyer.firstName || '',
                lastName: buyer.lastName || '',
                phone: buyer.phone || '',
                address: {
                  street: buyer.address?.street || '',
                  city: buyer.address?.city || '',
                  state: buyer.address?.state || '',
                  zipCode: buyer.address?.zipCode || '',
                  country: buyer.address?.country || 'Pakistan'
                }
              });
              setEmailData({
                newEmail: buyer.email || '',
                password: ''
              });
              setMessage({ type: 'error', text: 'Server connection failed. Showing cached data. Some features may not work.' });
            } else {
              setMessage({ type: 'error', text: errorData.message || 'Failed to load profile data' });
            }
          }
        }
      } catch (error) {
        // If we have localStorage data, show it with an error message
        if (localBuyerData && !buyerData) {
          try {
            const buyer = JSON.parse(localBuyerData);
            setBuyerData(buyer);
            setFormData({
              firstName: buyer.firstName || '',
              lastName: buyer.lastName || '',
              phone: buyer.phone || '',
              address: {
                street: buyer.address?.street || '',
                city: buyer.address?.city || '',
                state: buyer.address?.state || '',
                zipCode: buyer.address?.zipCode || '',
                country: buyer.address?.country || 'Pakistan'
              }
            });
            setEmailData({
              newEmail: buyer.email || '',
              password: ''
            });
            setMessage({ type: 'error', text: 'Server error. Showing cached data. Please check if the server is running.' });
          } catch (parseError) {
            setMessage({ type: 'error', text: 'Server error. Please make sure the server is running and try again.' });
          }
        } else {
          setMessage({ type: 'error', text: 'Server error. Please make sure the server is running and try again.' });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBuyerData();
  }, [navigate]);

  const handleInputChange = (e, section = 'profile') => {
    const { name, value } = e.target;
    
    if (section === 'profile') {
      if (name.startsWith('address.')) {
        const addressField = name.split('.')[1];
        setFormData(prev => ({
          ...prev,
          address: {
            ...prev.address,
            [addressField]: value
          }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    } else if (section === 'email') {
      setEmailData(prev => ({
        ...prev,
        [name]: value
      }));
    } else if (section === 'password') {
      setPasswordData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    const token = localStorage.getItem('buyerToken');

    try {
      const response = await fetch('http://localhost:5000/api/buyer/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        showToastNotification('Profile updated successfully!', 'success');
        // Update local storage with the new data
        const updatedBuyerData = { ...buyerData, ...data.buyer };
        setBuyerData(updatedBuyerData);
        localStorage.setItem('buyerData', JSON.stringify(updatedBuyerData));
        
        // Update form data to reflect the saved changes
        setFormData({
          firstName: data.buyer.firstName || '',
          lastName: data.buyer.lastName || '',
          phone: data.buyer.phone || '',
          address: {
            street: data.buyer.address?.street || '',
            city: data.buyer.address?.city || '',
            state: data.buyer.address?.state || '',
            zipCode: data.buyer.address?.zipCode || '',
            country: data.buyer.address?.country || 'Pakistan'
          }
        });
      } else {
        showToastNotification(data.message || 'Failed to update profile', 'error');
      }
    } catch (error) {
      showToastNotification('Network error. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    if (!emailData.password) {
      showToastNotification('Current password is required to change email', 'error');
      setSaving(false);
      return;
    }

    const token = localStorage.getItem('buyerToken');

    try {
      const response = await fetch('http://localhost:5000/api/buyer/profile/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(emailData)
      });

      const data = await response.json();

      if (response.ok) {
        showToastNotification('Email updated successfully!', 'success');
        // Update local data
        const updatedBuyerData = { ...buyerData, email: emailData.newEmail };
        setBuyerData(updatedBuyerData);
        localStorage.setItem('buyerData', JSON.stringify(updatedBuyerData));
        setEmailData({ ...emailData, password: '' });
      } else {
        showToastNotification(data.message || 'Failed to update email', 'error');
      }
    } catch (error) {
      showToastNotification('Network error. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToastNotification('New passwords do not match', 'error');
      setSaving(false);
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showToastNotification('New password must be at least 8 characters long', 'error');
      setSaving(false);
      return;
    }

    const token = localStorage.getItem('buyerToken');

    try {
      const response = await fetch('http://localhost:5000/api/buyer/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        showToastNotification('Password updated successfully!', 'success');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        showToastNotification(data.message || 'Failed to update password', 'error');
      }
    } catch (error) {
      showToastNotification('Network error. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div>
          <div className="loading-spinner">⏳</div>
          <div className="loading-text">Loading profile...</div>
          <div style={{fontSize: '0.9rem', color: '#6b7280', marginTop: '10px'}}>
            Fetching your account information...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      minHeight: '100vh',
      background: '#f8f9fa'
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px 24px',
        borderRadius: '12px',
        marginBottom: '24px',
        color: 'white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        <div style={{
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '12px'
        }}>
          <div>
            <h1 style={{
              fontSize: 'clamp(1.3rem, 3vw, 1.7rem)', 
              margin: 0, 
              marginBottom: '6px',
              fontWeight: 800,
              paddingLeft: '12px',
              color: '#ffffff'
            }}>✏️ Edit Profile</h1>
            <p style={{
              fontSize: '0.9rem', 
              margin: 0, 
              opacity: 0.85,
              paddingLeft: '12px',
              color: '#ffffff'
            }}>Update your account information</p>
          </div>
          <button 
            onClick={() => navigate('/buyer/dashboard')}
            style={{
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.2)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginRight: '12px'
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

     

      {/* Message */}
      {message.text && (
        <div style={{
          padding: '8px 12px',
          borderRadius: '6px',
          marginBottom: '15px',
          background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
          color: message.type === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          fontSize: 'clamp(0.75rem, 2vw, 0.85rem)'
        }}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          overflowX: 'auto'
        }}>
          {[
            { id: 'profile', label: '👤 Profile Info', icon: '👤' },
            { id: 'email', label: '📧 Email', icon: '📧' },
            { id: 'password', label: '🔒 Password', icon: '🔒' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: '1',
                minWidth: '100px',
                padding: '8px 12px',
                background: activeTab === tab.id ? '#f3f4f6' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #667eea' : '2px solid transparent',
                fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
                fontWeight: '600',
                color: activeTab === tab.id ? '#667eea' : '#6b7280',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{padding: 'clamp(12px, 3vw, 20px)'}}>
          {/* Profile Info Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileUpdate}>
              <h3 style={{
                fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)', 
                marginBottom: '15px', 
                color: '#111827'
              }}>Personal Information</h3>
              
              {/* Create a grid layout for better space utilization */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px'
              }}>
                {/* Left Column - Personal Info */}
                <div>
                  <div style={{
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '12px', 
                    marginBottom: '15px'
                  }}>
                    <div>
                      <label style={{
                        display: 'block', 
                        fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', 
                        fontWeight: '600', 
                        color: '#374151', 
                        marginBottom: '6px'
                      }}>
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange(e, 'profile')}
                        required
                        style={{
                          width: '100%',
                          padding: 'clamp(8px, 2vw, 10px)',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block', 
                        fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', 
                        fontWeight: '600', 
                        color: '#374151', 
                        marginBottom: '6px'
                      }}>
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange(e, 'profile')}
                        required
                        style={{
                          width: '100%',
                          padding: 'clamp(8px, 2vw, 10px)',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{marginBottom: '15px'}}>
                    <label style={{
                      display: 'block', 
                      fontSize: 'clamp(0.75rem, 2vw, 0.85rem)', 
                      fontWeight: '600', 
                      color: '#374151', 
                      marginBottom: '6px'
                    }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange(e, 'profile')}
                      placeholder="+92 300 1234567"
                      style={{
                        width: '100%',
                        padding: 'clamp(8px, 2vw, 10px)',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Right Column - Address */}
                <div>
                  <h4 style={{fontSize: '1rem', marginBottom: '12px', color: '#111827'}}>Address</h4>
                  
                  <div style={{display: 'grid', gap: '12px'}}>
                    <div>
                      <label style={{display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '6px'}}>
                        Street Address
                      </label>
                      <input
                        type="text"
                        name="address.street"
                        value={formData.address.street}
                        onChange={(e) => handleInputChange(e, 'profile')}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                      <div>
                        <label style={{display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '6px'}}>
                          City
                        </label>
                        <input
                          type="text"
                          name="address.city"
                          value={formData.address.city}
                          onChange={(e) => handleInputChange(e, 'profile')}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '6px'}}>
                          State/Province
                        </label>
                        <input
                          type="text"
                          name="address.state"
                          value={formData.address.state}
                          onChange={(e) => handleInputChange(e, 'profile')}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#374151', marginBottom: '6px'}}>
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        name="address.zipCode"
                        value={formData.address.zipCode}
                        onChange={(e) => handleInputChange(e, 'profile')}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{marginTop: '20px', textAlign: 'right'}}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 24px',
                    background: saving ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  {saving ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          )}

          {/* Email Tab */}
          {activeTab === 'email' && (
            <form onSubmit={handleEmailUpdate}>
              <h3 style={{fontSize: '1.1rem', marginBottom: '15px', color: '#111827'}}>Change Email Address</h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '15px'
              }}>
                <div>
                  <label style={{display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px'}}>
                    Current Email
                  </label>
                  <input
                    type="email"
                    value={buyerData?.email || ''}
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      background: '#f9fafb',
                      color: '#6b7280',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px'}}>
                    New Email Address *
                  </label>
                  <input
                    type="email"
                    name="newEmail"
                    value={emailData.newEmail}
                    onChange={(e) => handleInputChange(e, 'email')}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{marginTop: '15px', marginBottom: '20px'}}>
                <label style={{display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px'}}>
                  Current Password *
                </label>
                <input
                  type="password"
                  name="password"
                  value={emailData.password}
                  onChange={(e) => handleInputChange(e, 'email')}
                  required
                  placeholder="Enter your current password to confirm"
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{textAlign: 'right'}}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 24px',
                    background: saving ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  {saving ? 'Updating...' : 'Update Email'}
                </button>
              </div>
            </form>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordUpdate}>
              <h3 style={{fontSize: '1.1rem', marginBottom: '15px', color: '#111827'}}>Change Password</h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '15px',
                marginBottom: '15px'
              }}>
                <div>
                  <label style={{display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px'}}>
                    Current Password *
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={(e) => handleInputChange(e, 'password')}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px'}}>
                    New Password *
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={(e) => handleInputChange(e, 'password')}
                    required
                    minLength="8"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  <small style={{color: '#6b7280', fontSize: '0.75rem'}}>
                    Password must be at least 8 characters long
                  </small>
                </div>
              </div>

              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px'}}>
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => handleInputChange(e, 'password')}
                  required
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
                {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                  <small style={{color: '#dc2626', fontSize: '0.75rem'}}>
                    Passwords do not match
                  </small>
                )}
              </div>

              <div style={{textAlign: 'right'}}>
                <button
                  type="submit"
                  disabled={saving || passwordData.newPassword !== passwordData.confirmPassword}
                  style={{
                    padding: '10px 24px',
                    background: saving || passwordData.newPassword !== passwordData.confirmPassword ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: saving || passwordData.newPassword !== passwordData.confirmPassword ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      <Notification
        type={toastType}
        message={toastMessage}
        show={showToast}
        onClose={() => setShowToast(false)}
        autoClose={true}
        duration={4000}
      />
    </div>
  );
};

export default EditProfile;