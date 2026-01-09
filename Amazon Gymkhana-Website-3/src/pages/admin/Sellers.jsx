import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import '../../styles/AdminSellers.css';

const AdminSellers = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // Default to "All Sellers"
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    all: 0
  });
  const navigate = useNavigate();
  const { isLoggedIn: isAdminLoggedIn, loading: adminLoading } = useAdmin();

  useEffect(() => {
    if (!adminLoading && isAdminLoggedIn) {
      fetchSellers();
      fetchCounts();
    }
  }, [filter, adminLoading, isAdminLoggedIn]);

  const fetchCounts = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      // Fetch counts for each status
      const [pendingRes, approvedRes, rejectedRes, allRes] = await Promise.all([
        fetch('http://localhost:5000/api/sellers?status=pending', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/sellers?status=approved', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/sellers?status=rejected', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/sellers?status=all', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const [pendingData, approvedData, rejectedData, allData] = await Promise.all([
        pendingRes.json(),
        approvedRes.json(),
        rejectedRes.json(),
        allRes.json()
      ]);

      setCounts({
        pending: pendingData.sellers?.length || 0,
        approved: approvedData.sellers?.length || 0,
        rejected: rejectedData.sellers?.length || 0,
        all: allData.sellers?.length || 0
      });
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  const fetchSellers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({ status: filter });
      
      const response = await fetch(`http://localhost:5000/api/sellers?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch sellers');
      
      const data = await response.json();
      setSellers(data.sellers);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!confirm('Are you sure you want to approve this seller?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/sellers/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Seller approved successfully');
        fetchSellers();
        fetchCounts();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleReject = async (id) => {
    if (!confirm('Are you sure you want to reject this seller?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/sellers/${id}/reject`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('Seller rejected');
        fetchSellers();
        fetchCounts();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('⚠️ Are you sure you want to permanently delete this seller? This action cannot be undone!')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/sellers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('✅ Seller deleted successfully');
        fetchSellers();
        fetchCounts();
      } else {
        const data = await response.json();
        alert('❌ ' + data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Failed to delete seller');
    }
  };

  return (
    <div className="admin-sellers" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: '30px 20px'
    }}>
      <div className="container" style={{maxWidth: '1400px', margin: '0 auto'}}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '25px 30px',
          marginBottom: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#2d3748',
              margin: 0,
              marginBottom: '5px'
            }}>
              <i className="fas fa-users-cog" style={{marginRight: '12px', color: '#667eea'}}></i>
              Manage Sellers
            </h1>
            <p style={{
              margin: 0,
              color: '#718096',
              fontSize: '0.95rem'
            }}>
              View and manage all registered sellers
            </p>
          </div>
          <button 
            onClick={() => navigate('/admin/dashboard')} 
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '10px',
              fontSize: '0.95rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)'
            }}
          >
            <i className="fas fa-arrow-left" style={{marginRight: '8px'}}></i>
            Back to Dashboard
          </button>
        </div>

        {/* Filter Tabs */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                background: filter === 'all' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                color: filter === 'all' ? 'white' : '#4a5568',
                border: filter === 'all' ? 'none' : '2px solid #e2e8f0',
                padding: '18px 20px',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: filter === 'all' ? '0 4px 15px rgba(102, 126, 234, 0.3)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (filter !== 'all') {
                  e.target.style.borderColor = '#667eea'
                  e.target.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== 'all') {
                  e.target.style.borderColor = '#e2e8f0'
                  e.target.style.transform = 'translateY(0)'
                }
              }}
            >
              <div style={{fontSize: '1.5rem'}}>👥</div>
              <div>All Sellers</div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                opacity: filter === 'all' ? 1 : 0.7
              }}>
                {counts.all}
              </div>
            </button>

            <button
              onClick={() => setFilter('approved')}
              style={{
                background: filter === 'approved' ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)' : 'white',
                color: filter === 'approved' ? 'white' : '#4a5568',
                border: filter === 'approved' ? 'none' : '2px solid #e2e8f0',
                padding: '18px 20px',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: filter === 'approved' ? '0 4px 15px rgba(72, 187, 120, 0.3)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (filter !== 'approved') {
                  e.target.style.borderColor = '#48bb78'
                  e.target.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== 'approved') {
                  e.target.style.borderColor = '#e2e8f0'
                  e.target.style.transform = 'translateY(0)'
                }
              }}
            >
              <div style={{fontSize: '1.5rem'}}>✅</div>
              <div>Verified</div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                opacity: filter === 'approved' ? 1 : 0.7
              }}>
                {counts.approved}
              </div>
            </button>

            <button
              onClick={() => setFilter('pending')}
              style={{
                background: filter === 'pending' ? 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)' : 'white',
                color: filter === 'pending' ? 'white' : '#4a5568',
                border: filter === 'pending' ? 'none' : '2px solid #e2e8f0',
                padding: '18px 20px',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: filter === 'pending' ? '0 4px 15px rgba(237, 137, 54, 0.3)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (filter !== 'pending') {
                  e.target.style.borderColor = '#ed8936'
                  e.target.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== 'pending') {
                  e.target.style.borderColor = '#e2e8f0'
                  e.target.style.transform = 'translateY(0)'
                }
              }}
            >
              <div style={{fontSize: '1.5rem'}}>📝</div>
              <div>Pending</div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                opacity: filter === 'pending' ? 1 : 0.7
              }}>
                {counts.pending}
              </div>
            </button>

            <button
              onClick={() => setFilter('rejected')}
              style={{
                background: filter === 'rejected' ? 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)' : 'white',
                color: filter === 'rejected' ? 'white' : '#4a5568',
                border: filter === 'rejected' ? 'none' : '2px solid #e2e8f0',
                padding: '18px 20px',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: filter === 'rejected' ? '0 4px 15px rgba(245, 101, 101, 0.3)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (filter !== 'rejected') {
                  e.target.style.borderColor = '#f56565'
                  e.target.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== 'rejected') {
                  e.target.style.borderColor = '#e2e8f0'
                  e.target.style.transform = 'translateY(0)'
                }
              }}
            >
              <div style={{fontSize: '1.5rem'}}>❌</div>
              <div>Rejected</div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                opacity: filter === 'rejected' ? 1 : 0.7
              }}>
                {counts.rejected}
              </div>
            </button>
          </div>
        </div>

      {loading ? (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '60px',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <div className="spinner-border text-primary" role="status" style={{width: '3rem', height: '3rem'}}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p style={{marginTop: '20px', color: '#718096', fontSize: '1.1rem'}}>Loading sellers...</p>
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '20px 30px',
            borderBottom: '2px solid #f7fafc',
            background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '1.3rem',
              fontWeight: '700',
              color: '#2d3748'
            }}>
              {filter === 'all' && '👥 All Sellers'}
              {filter === 'approved' && '✅ Verified Sellers'}
              {filter === 'pending' && '📝 Pending Verification'}
              {filter === 'rejected' && '❌ Rejected Sellers'}
              <span style={{
                marginLeft: '12px',
                fontSize: '1rem',
                color: '#718096',
                fontWeight: '500'
              }}>
                ({sellers.length} {sellers.length === 1 ? 'seller' : 'sellers'})
              </span>
            </h2>
          </div>
          <div style={{overflowX: 'auto'}}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
            <thead>
              <tr style={{background: '#f7fafc'}}>
                <th style={{
                  padding: '8px 10px',
                  textAlign: 'left',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  color: '#4a5568',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  borderBottom: '2px solid #e2e8f0',
                  whiteSpace: 'nowrap'
                }}>ID</th>
                <th style={{
                  padding: '8px 10px',
                  textAlign: 'left',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  color: '#4a5568',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  borderBottom: '2px solid #e2e8f0',
                  whiteSpace: 'nowrap'
                }}>Username</th>
                <th style={{
                  padding: '8px 10px',
                  textAlign: 'left',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  color: '#4a5568',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  borderBottom: '2px solid #e2e8f0',
                  maxWidth: '150px'
                }}>Email</th>
                <th style={{
                  padding: '8px 10px',
                  textAlign: 'left',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  color: '#4a5568',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  borderBottom: '2px solid #e2e8f0',
                  whiteSpace: 'nowrap'
                }}>WhatsApp</th>
                <th style={{
                  padding: '8px 10px',
                  textAlign: 'left',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  color: '#4a5568',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  borderBottom: '2px solid #e2e8f0',
                  whiteSpace: 'nowrap'
                }}>Location</th>
                <th style={{
                  padding: '8px 10px',
                  textAlign: 'left',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  color: '#4a5568',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  borderBottom: '2px solid #e2e8f0',
                  whiteSpace: 'nowrap'
                }}>Category</th>
                <th style={{
                  padding: '8px 10px',
                  textAlign: 'center',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  color: '#4a5568',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  borderBottom: '2px solid #e2e8f0',
                  whiteSpace: 'nowrap'
                }}>Status</th>
                <th style={{
                  padding: '8px 10px',
                  textAlign: 'left',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  color: '#4a5568',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  borderBottom: '2px solid #e2e8f0',
                  whiteSpace: 'nowrap'
                }}>Joined</th>
                <th style={{
                  padding: '8px 10px',
                  textAlign: 'center',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  color: '#4a5568',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  borderBottom: '2px solid #e2e8f0',
                  whiteSpace: 'nowrap'
                }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((seller, index) => (
                <tr key={seller._id} style={{
                  background: index % 2 === 0 ? 'white' : '#f7fafc',
                  transition: 'all 0.2s ease'
                }} onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#edf2f7'
                }} onMouseLeave={(e) => {
                  e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#f7fafc'
                }}>
                  <td style={{
                    padding: '8px 10px',
                    fontSize: '0.75rem',
                    color: '#2d3748',
                    fontWeight: '600',
                    borderBottom: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap'
                  }}>{seller.supplierId}</td>
                  <td style={{
                    padding: '8px 10px',
                    fontSize: '0.75rem',
                    color: '#2d3748',
                    fontWeight: '600',
                    borderBottom: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap'
                  }}>{seller.username}</td>
                  <td style={{
                    padding: '8px 10px',
                    fontSize: '0.7rem',
                    color: '#4a5568',
                    borderBottom: '1px solid #e2e8f0',
                    maxWidth: '150px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }} title={seller.email}>{seller.email}</td>
                  <td style={{
                    padding: '8px 10px',
                    fontSize: '0.7rem',
                    color: '#4a5568',
                    borderBottom: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap'
                  }}>
                    {(seller.whatsappNo || seller.contactNo) ? (
                      <a 
                        href={`https://wa.me/${(seller.whatsappNo || seller.contactNo).replace(/[^0-9]/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{
                          color: '#25D366',
                          textDecoration: 'none',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          transition: 'all 0.2s ease',
                          fontSize: '0.7rem'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#e8f5e9'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        <i className="fab fa-whatsapp" style={{fontSize: '0.9rem'}}></i>
                        <span>{seller.whatsappNo || seller.contactNo}</span>
                      </a>
                    ) : (
                      <span style={{color: '#a0aec0', fontSize: '0.7rem'}}>N/A</span>
                    )}
                  </td>
                  <td style={{
                    padding: '8px 10px',
                    fontSize: '0.7rem',
                    color: '#4a5568',
                    borderBottom: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap'
                  }}>{seller.city}, {seller.country}</td>
                  <td style={{
                    padding: '8px 10px',
                    fontSize: '0.7rem',
                    color: '#4a5568',
                    borderBottom: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap'
                  }}>{seller.productCategory}</td>
                  <td style={{
                    padding: '8px 10px',
                    textAlign: 'center',
                    borderBottom: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap'
                  }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '0.65rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px',
                      background: seller.verificationStatus === 'approved' ? '#c6f6d5' : 
                                 seller.verificationStatus === 'pending' ? '#feebc8' : 
                                 seller.verificationStatus === 'rejected' ? '#fed7d7' : '#e2e8f0',
                      color: seller.verificationStatus === 'approved' ? '#22543d' : 
                             seller.verificationStatus === 'pending' ? '#7c2d12' : 
                             seller.verificationStatus === 'rejected' ? '#742a2a' : '#4a5568',
                      whiteSpace: 'nowrap'
                    }}>
                      {(seller.verificationStatus || 'required').replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{
                    padding: '8px 10px',
                    fontSize: '0.7rem',
                    color: '#4a5568',
                    borderBottom: '1px solid #e2e8f0',
                    whiteSpace: 'nowrap'
                  }}>{new Date(seller.createdAt).toLocaleDateString()}</td>
                  <td style={{
                    padding: '8px 10px',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    <div style={{display: 'flex', gap: '3px', flexWrap: 'nowrap', justifyContent: 'center'}}>
                      {/* Show verification review button ONLY for sellers with pending verification (documents submitted) */}
                      {seller.verificationStatus === 'pending' && (
                        <button
                          onClick={() => navigate('/admin/seller-verifications')}
                          className="verify-btn"
                          style={{backgroundColor: '#ffc107', color: '#000', padding: '4px 6px', border: 'none', borderRadius: '3px', fontSize: '0.65rem', whiteSpace: 'nowrap', cursor: 'pointer'}}
                          title="Review ID card verification documents"
                        >
                          🆔 Review
                        </button>
                      )}
                      
                      {/* Show message for sellers who haven't submitted verification yet - NO APPROVE/REJECT */}
                      {(seller.verificationStatus === 'required' || seller.verificationStatus === 'not_required') && (
                        <span style={{fontSize: '0.65rem', color: '#718096', fontStyle: 'italic'}}>
                          Awaiting docs
                        </span>
                      )}
                      
                      {/* Show delete button for approved/rejected sellers */}
                      {(seller.verificationStatus === 'approved' || seller.verificationStatus === 'rejected') && (
                        <button
                          onClick={() => handleDelete(seller._id)}
                          className="delete-btn"
                          style={{backgroundColor: '#dc3545', color: 'white', padding: '4px 6px', border: 'none', borderRadius: '3px', fontSize: '0.65rem', whiteSpace: 'nowrap', cursor: 'pointer'}}
                          title="Delete Seller Permanently"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminSellers;
