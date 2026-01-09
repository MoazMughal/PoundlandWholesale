import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/AdminSellers.css';

const AdminBuyers = () => {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchBuyers();
  }, []);

  const fetchBuyers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/buyer/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBuyers(data.buyers || []);
      }
    } catch (error) {
      console.error('Error fetching buyers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (buyerId, newStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/buyer/${buyerId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        alert('✅ Buyer status updated successfully');
        fetchBuyers();
      } else {
        alert('❌ Failed to update buyer status');
      }
    } catch (error) {
      console.error('Error updating buyer status:', error);
      alert('❌ Error updating buyer status');
    }
  };

  const filteredBuyers = buyers.filter(buyer => {
    const matchesSearch = buyer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         buyer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         buyer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || buyer.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="admin-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading buyers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>👥 Manage Buyers</h1>
          <p>View and manage registered buyers</p>
        </div>
        <button onClick={() => navigate('/admin/dashboard')} className="btn-secondary">
          ← Back to Dashboard
        </button>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search buyers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>Total Buyers</h3>
            <p className="stat-number">{buyers.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>Active</h3>
            <p className="stat-number">{buyers.filter(b => b.status === 'active').length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏸️</div>
          <div className="stat-info">
            <h3>Inactive</h3>
            <p className="stat-number">{buyers.filter(b => b.status === 'inactive').length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🚫</div>
          <div className="stat-info">
            <h3>Suspended</h3>
            <p className="stat-number">{buyers.filter(b => b.status === 'suspended').length}</p>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>User Type</th>
              <th>Status</th>
              <th>Orders</th>
              <th>Favorites</th>
              <th>Joined</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBuyers.length === 0 ? (
              <tr>
                <td colSpan="9" style={{textAlign: 'center', padding: '40px'}}>
                  <div style={{fontSize: '3rem', marginBottom: '10px'}}>📭</div>
                  <p>No buyers found</p>
                </td>
              </tr>
            ) : (
              filteredBuyers.map(buyer => (
                <tr key={buyer.id}>
                  <td>
                    <strong>{buyer.firstName} {buyer.lastName}</strong>
                  </td>
                  <td>{buyer.email}</td>
                  <td>
                    <span className="badge badge-info" style={{textTransform: 'capitalize'}}>
                      {buyer.userType}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      buyer.status === 'active' ? 'badge-success' : 
                      buyer.status === 'inactive' ? 'badge-warning' : 
                      'badge-danger'
                    }`}>
                      {buyer.status}
                    </span>
                  </td>
                  <td>{buyer.orders?.length || 0}</td>
                  <td>{buyer.favorites?.length || 0}</td>
                  <td>{new Date(buyer.createdAt).toLocaleDateString()}</td>
                  <td>{buyer.lastLogin ? new Date(buyer.lastLogin).toLocaleDateString() : 'Never'}</td>
                  <td>
                    <div className="action-buttons">
                      <select
                        value={buyer.status}
                        onChange={(e) => handleStatusChange(buyer.id, e.target.value)}
                        className="status-select"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminBuyers;
