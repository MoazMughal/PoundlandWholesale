import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBuyer } from '../../context/BuyerContext';
import { getApiUrl } from '../../utils/api';
import '../../styles/BuyerDashboard.css';
import '../../styles/dashboard-responsive.css';
import '../../styles/mobile-dashboard.css';

const BuyerDashboard = () => {
  const { buyer, isLoggedIn, loading: authLoading, logout } = useBuyer();
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalFavorites: 0,
    status: 'active',
    memberSince: null,
    lastLogin: null
  });
  const [unlockedSuppliers, setUnlockedSuppliers] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBuyerData = async () => {
      // Wait for auth loading to complete
      if (authLoading) return;
      
      // Check if buyer is logged in
      if (!isLoggedIn || !buyer) {
        console.log('Dashboard: Not logged in, redirecting to login');
        navigate('/login/buyer');
        return;
      }

      const token = localStorage.getItem('buyerToken');
      
      if (!token) {
        console.log('Dashboard: No token, redirecting to login');
        navigate('/login/buyer');
        return;
      }

      try {
        console.log('Dashboard: Making profile API call');
        // Fetch buyer profile
        const profileResponse = await fetch(getApiUrl('buyer/profile'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('Dashboard: Profile response status:', profileResponse.status);

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          localStorage.setItem('buyerData', JSON.stringify(profileData.buyer));
        } else if (profileResponse.status === 401) {
          console.log('Dashboard: Unauthorized, clearing tokens and redirecting');
          localStorage.removeItem('buyerToken');
          localStorage.removeItem('buyerData');
          navigate('/login/buyer');
          return;
        }

        // Fetch dashboard stats
        const statsResponse = await fetch(getApiUrl('buyer/dashboard/stats'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData.stats);
        }

        // Fetch unlocked suppliers
        const suppliersResponse = await fetch(getApiUrl('buyer/unlocked-suppliers'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (suppliersResponse.ok) {
          const suppliersData = await suppliersResponse.json();
          setUnlockedSuppliers(suppliersData.unlockedSuppliers || []);
        }

        // Fetch payment history
        const paymentsResponse = await fetch(getApiUrl('buyer/payment-history'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json();
          // Use combined history if available, otherwise fall back to payment history
          setPaymentHistory(paymentsData.combinedHistory || paymentsData.paymentHistory || []);
        }
      } catch (error) {
        console.error('Error fetching buyer data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBuyerData();
  }, [authLoading, isLoggedIn, buyer, navigate]);

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh'}}>
        <div style={{textAlign: 'center'}}>
          <div style={{fontSize: '2rem', marginBottom: '10px'}}>⏳</div>
          <div style={{fontSize: '1.2rem', fontWeight: '600'}}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{padding: '20px', maxWidth: '1200px', margin: '0 auto'}}>
      {/* Header */}
      <header className="buyer-dashboard-header" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '15px 20px',
        borderRadius: '12px',
        marginBottom: '25px',
        color: 'white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div className="dashboard-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px'}}>
          <div>
            <h1 style={{fontSize: '1.6rem', margin: 0, marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '10px', color: 'white'}}>
              👋 Welcome, {buyer?.name || buyer?.firstName || buyer?.username || 'Buyer'}!
            </h1>
            <p style={{fontSize: '0.85rem', margin: 0, opacity: 0.9, marginLeft: '15px', color: 'white'}} className="text-break">{buyer?.email}</p>
          </div>
          <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginRight: '15px'}}>
            <button 
              onClick={() => navigate('/')}
              style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              🏠 Home
            </button>
            <button 
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="buyer-stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '25px'
      }}>
        <div className="buyer-stat-card" style={{
          background: 'white',
          padding: '15px',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div className="stat-icon" style={{fontSize: '1.8rem', marginBottom: '8px'}}>🛒</div>
          <h3 style={{fontSize: '0.85rem', color: '#6b7280', margin: 0, marginBottom: '5px', fontWeight: '500'}}>Total Orders</h3>
          <p className="stat-value" style={{fontSize: '1.8rem', fontWeight: '700', color: '#111827', margin: 0}}>{stats.totalOrders}</p>
        </div>

        <div className="buyer-stat-card" style={{
          background: 'white',
          padding: '15px',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div className="stat-icon" style={{fontSize: '1.8rem', marginBottom: '8px'}}>❤️</div>
          <h3 style={{fontSize: '0.85rem', color: '#6b7280', margin: 0, marginBottom: '5px', fontWeight: '500'}}>Favorites</h3>
          <p className="stat-value" style={{fontSize: '1.8rem', fontWeight: '700', color: '#111827', margin: 0}}>{stats.totalFavorites}</p>
        </div>

        <div className="buyer-stat-card" style={{
          background: 'white',
          padding: '15px',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div className="stat-icon" style={{fontSize: '1.8rem', marginBottom: '8px'}}>🔓</div>
          <h3 style={{fontSize: '0.85rem', color: '#6b7280', margin: 0, marginBottom: '5px', fontWeight: '500'}}>Unlocked Suppliers</h3>
          <p className="stat-value" style={{fontSize: '1.8rem', fontWeight: '700', color: '#111827', margin: 0}}>{unlockedSuppliers.length}</p>
        </div>

        <div className="buyer-stat-card" style={{
          background: 'white',
          padding: '15px',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div className="stat-icon" style={{fontSize: '1.8rem', marginBottom: '8px'}}>📊</div>
          <h3 style={{fontSize: '0.85rem', color: '#6b7280', margin: 0, marginBottom: '5px', fontWeight: '500'}}>Account Status</h3>
          <p className="stat-value" style={{
            fontSize: '1rem', 
            fontWeight: '700', 
            color: stats.status === 'active' ? '#059669' : '#dc2626', 
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px'
          }}>
            {stats.status === 'active' ? (
              <>✅ Active</>
            ) : stats.status === 'inactive' ? (
              <>⏸️ Inactive</>
            ) : (
              <>🚫 Suspended</>
            )}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '25px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{fontSize: '1.1rem', marginBottom: '15px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px'}}>
          🚀 Quick Actions
        </h2>
        <div style={{display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap'}}>
          <button
            onClick={() => navigate('/buyer/wishlist')}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 3px 10px rgba(231,76,60,0.3)', transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 5px 15px rgba(231,76,60,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(231,76,60,0.3)'; }}
          >
            ❤️ My Wishlist & Queries
          </button>
          <button
            onClick={() => navigate('/buyer/edit-profile')}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 3px 10px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 5px 15px rgba(102, 126, 234, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 3px 10px rgba(102, 126, 234, 0.3)'
            }}
          >
            ✏️ Edit Profile
          </button>
          
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #ff9900 0%, #ff6600 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 3px 10px rgba(255, 153, 0, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 5px 15px rgba(255, 153, 0, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 3px 10px rgba(255, 153, 0, 0.3)'
            }}
          >
            🏆 View All Products
          </button>
        </div>
      </div>

      {/* Account Info */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '10px',
        marginBottom: '25px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{fontSize: '1.1rem', marginBottom: '15px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px'}}>
          👤 Account Information
        </h2>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px'}}>
          <div>
            <p style={{fontSize: '0.8rem', color: '#6b7280', margin: 0, marginBottom: '4px'}}>Email</p>
            <p style={{fontSize: '0.9rem', fontWeight: '600', color: '#111827', margin: 0}}>{buyer?.email}</p>
          </div>
          <div>
            <p style={{fontSize: '0.8rem', color: '#6b7280', margin: 0, marginBottom: '4px'}}>User Type</p>
            <p style={{fontSize: '0.9rem', fontWeight: '600', color: '#111827', margin: 0, textTransform: 'capitalize'}}>
              {buyer?.userType || 'Buyer'}
            </p>
          </div>
          <div>
            <p style={{fontSize: '0.8rem', color: '#6b7280', margin: 0, marginBottom: '4px'}}>Member Since</p>
            <p style={{fontSize: '0.9rem', fontWeight: '600', color: '#111827', margin: 0}}>
              {stats.memberSince ? new Date(stats.memberSince).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <p style={{fontSize: '0.8rem', color: '#6b7280', margin: 0, marginBottom: '4px'}}>Last Login</p>
            <p style={{fontSize: '0.9rem', fontWeight: '600', color: '#111827', margin: 0}}>
              {stats.lastLogin ? new Date(stats.lastLogin).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Unlocked Suppliers */}
      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '12px',
        marginBottom: '30px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{fontSize: '1.3rem', marginBottom: '20px', color: '#111827'}}>🔓 Unlocked Suppliers</h2>
        {unlockedSuppliers.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#6b7280'}}>
            <div style={{fontSize: '3rem', marginBottom: '15px'}}>🔒</div>
            <h3 style={{fontSize: '1.1rem', marginBottom: '10px'}}>No suppliers unlocked yet</h3>
            <p style={{fontSize: '0.9rem', marginBottom: '20px'}}>Unlock supplier contacts by paying Rs 200 per supplier</p>
          </div>
        ) : (
          <div style={{display: 'grid', gap: '15px'}}>
            {unlockedSuppliers.map((item, index) => (
              <div key={index} style={{
                padding: '15px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{margin: 0, marginBottom: '5px', color: '#111827'}}>
                    {item.supplierId?.businessName || 'Supplier'}
                  </h4>
                  <p style={{margin: 0, fontSize: '0.85rem', color: '#6b7280'}}>
                    📧 {item.supplierId?.email} | 📞 {item.supplierId?.phone}
                  </p>
                  <p style={{margin: 0, fontSize: '0.75rem', color: '#9ca3af', marginTop: '5px'}}>
                    Unlocked: {new Date(item.unlockedAt).toLocaleDateString()}
                  </p>
                </div>
                <span style={{
                  padding: '6px 12px',
                  background: '#10b981',
                  color: 'white',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}>
                  ✅ Unlocked
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History */}
      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '12px',
        marginBottom: '30px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{fontSize: '1.3rem', marginBottom: '20px', color: '#111827'}}>💳 Payment History</h2>
        {paymentHistory.length === 0 ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#6b7280'}}>
            <div style={{fontSize: '3rem', marginBottom: '15px'}}>💰</div>
            <h3 style={{fontSize: '1.1rem', marginBottom: '10px'}}>No payments yet</h3>
            <p style={{fontSize: '0.9rem'}}>Your payment history will appear here</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="payment-history-table" style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{borderBottom: '2px solid #e5e7eb'}}>
                  <th style={{padding: '12px', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280'}}>Date</th>
                  <th style={{padding: '12px', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280'}}>Description</th>
                  <th style={{padding: '12px', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280'}} className="mobile-hide">Method</th>
                  <th style={{padding: '12px', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280'}}>Amount</th>
                  <th style={{padding: '12px', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280'}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((item, index) => (
                  <tr key={index} style={{borderBottom: '1px solid #f3f4f6'}}>
                    <td style={{padding: '12px', fontSize: '0.9rem'}}>
                      {new Date(item.date || item.paymentDate).toLocaleDateString()}
                    </td>
                    <td style={{padding: '12px', fontSize: '0.9rem'}}>
                      <div className="text-truncate" style={{maxWidth: '200px'}}>
                        {item.description || (item.type === 'verification' ? `Payment Verification - ${item.productName}` : 'Payment')}
                      </div>
                    </td>
                    <td style={{padding: '12px', fontSize: '0.9rem', textTransform: 'capitalize'}} className="mobile-hide">
                      {item.type === 'verification' ? 'Verification' : (item.paymentMethod?.replace('_', ' ') || 'N/A')}
                    </td>
                    <td style={{padding: '12px', fontSize: '0.9rem', fontWeight: '600'}}>
                      {item.type === 'verification' ? 'N/A' : `Rs ${item.amount}`}
                    </td>
                    <td style={{padding: '12px'}}>
                      <span style={{
                        padding: '4px 8px',
                        background: item.status === 'completed' || item.status === 'approved' ? '#d1fae5' : 
                                   item.status === 'pending' ? '#fef3c7' : 
                                   item.status === 'rejected' ? '#fee2e2' : '#f3f4f6',
                        color: item.status === 'completed' || item.status === 'approved' ? '#065f46' : 
                               item.status === 'pending' ? '#92400e' : 
                               item.status === 'rejected' ? '#991b1b' : '#374151',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'capitalize'
                      }}>
                        {item.status}
                      </span>
                      {item.type === 'verification' && item.adminNotes && (
                        <div style={{fontSize: '0.7rem', color: '#6b7280', marginTop: '4px'}} className="mobile-hide">
                          {item.adminNotes}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{fontSize: '1.3rem', marginBottom: '20px', color: '#111827'}}>📦 Recent Orders</h2>
        {stats.totalOrders === 0 ? (
          <div style={{textAlign: 'center', padding: '40px', color: '#6b7280'}}>
            <div style={{fontSize: '3rem', marginBottom: '15px'}}>🛍️</div>
            <h3 style={{fontSize: '1.1rem', marginBottom: '10px'}}>No orders yet</h3>
            <p style={{fontSize: '0.9rem', marginBottom: '20px'}}>Start shopping to see your orders here</p>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '12px 24px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div>
            {/* Orders list will go here */}
            <p style={{color: '#6b7280'}}>Your orders will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerDashboard;
