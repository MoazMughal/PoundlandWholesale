import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../utils/api';

const AdminSellerListings = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sellerFilter, setSellerFilter] = useState('all');
  const [sellers, setSellers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  useEffect(() => {
    loadSellerListings();
    loadSellers();
  }, []);

  useEffect(() => {
    let filtered = listings;
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(listing => 
        listing.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.seller?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(listing => listing.approvalStatus === statusFilter);
    }
    
    // Apply seller filter
    if (sellerFilter !== 'all') {
      filtered = filtered.filter(listing => listing.seller?._id === sellerFilter);
    }
    
    setFilteredListings(filtered);
  }, [searchQuery, statusFilter, sellerFilter, listings]);

  const loadSellerListings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      // Use the correct admin seller-products endpoint that populates seller info
      const response = await fetch(getApiUrl('products/admin/seller-products?limit=1000&status=all'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const sellerListings = data.products || [];
        setListings(sellerListings);
        setFilteredListings(sellerListings);
        
        // Calculate stats
        const stats = {
          total: sellerListings.length,
          pending: sellerListings.filter(p => p.approvalStatus === 'pending').length,
          approved: sellerListings.filter(p => p.approvalStatus === 'approved').length,
          rejected: sellerListings.filter(p => p.approvalStatus === 'rejected').length
        };
        setStats(stats);
      } else {
        alert('❌ Failed to load seller listings');
      }
    } catch (error) {
      console.error('Error loading seller listings:', error);
      alert('❌ Could not load seller listings');
    } finally {
      setLoading(false);
    }
  };

  const loadSellers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl('sellers'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSellers(data.sellers || []);
      }
    } catch (error) {
      console.error('Error loading sellers:', error);
    }
  };

  const handleApprove = async (productId) => {
    if (!confirm('Approve this product listing?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl(`products/admin/approve/${productId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('✅ Product approved successfully');
        loadSellerListings();
      } else {
        alert('❌ Failed to approve product');
      }
    } catch (error) {
      alert('❌ Error approving product');
    }
  };

  const handleReject = async (productId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl(`products/admin/reject/${productId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        alert('✅ Product rejected');
        loadSellerListings();
      } else {
        alert('❌ Failed to reject product');
      }
    } catch (error) {
      alert('❌ Error rejecting product');
    }
  };

  const handleDelete = async (productId) => {
    if (!confirm('Delete this product listing? This action cannot be undone.')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl(`products/${productId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('✅ Product deleted successfully');
        loadSellerListings();
      } else {
        alert('❌ Failed to delete product');
      }
    } catch (error) {
      alert('❌ Error deleting product');
    }
  };

  if (loading) {
    return (
      <div className="container-fluid mt-3">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading seller listings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid" style={{fontSize: '0.85rem', padding: '8px'}}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-1" style={{fontSize: '1.1rem', fontWeight: '600'}}>
            <i className="fas fa-list-alt text-success me-2"></i>
            Seller Product Listings
          </h5>
          <small className="text-muted">Manage products listed by sellers</small>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => navigate('/admin/dashboard')}
            style={{fontSize: '0.75rem'}}
          >
            <i className="fas fa-arrow-left me-1"></i>Back to Dashboard
          </button>
          <button 
            className="btn btn-info btn-sm" 
            onClick={loadSellerListings}
            disabled={loading}
            style={{fontSize: '0.75rem'}}
          >
            <i className="fas fa-sync me-1"></i>Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-3">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body" style={{padding: '12px'}}>
              <h6 style={{fontSize: '0.75rem', marginBottom: '5px'}}>Total Listings</h6>
              <h4 style={{fontSize: '1.5rem', marginBottom: '0'}}>{stats.total}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-white">
            <div className="card-body" style={{padding: '12px'}}>
              <h6 style={{fontSize: '0.75rem', marginBottom: '5px'}}>Pending Approval</h6>
              <h4 style={{fontSize: '1.5rem', marginBottom: '0'}}>{stats.pending}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body" style={{padding: '12px'}}>
              <h6 style={{fontSize: '0.75rem', marginBottom: '5px'}}>Approved</h6>
              <h4 style={{fontSize: '1.5rem', marginBottom: '0'}}>{stats.approved}</h4>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-danger text-white">
            <div className="card-body" style={{padding: '12px'}}>
              <h6 style={{fontSize: '0.75rem', marginBottom: '5px'}}>Rejected</h6>
              <h4 style={{fontSize: '1.5rem', marginBottom: '0'}}>{stats.rejected}</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="row g-2 mb-3">
        <div className="col-md-4">
          <div className="input-group input-group-sm">
            <span className="input-group-text">
              <i className="fas fa-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search products or sellers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-2">
          <select
            className="form-select form-select-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="col-md-3">
          <select
            className="form-select form-select-sm"
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
          >
            <option value="all">All Sellers</option>
            {sellers.map(seller => (
              <option key={seller._id} value={seller._id}>
                {seller.username} ({seller.supplierId})
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
          <div className="text-muted" style={{fontSize: '0.75rem', padding: '6px 0'}}>
            Showing {filteredListings.length} of {listings.length} listings
          </div>
        </div>
      </div>

      {/* Listings Table */}
      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th style={{fontSize: '0.75rem', width: '60px'}}>Image</th>
                  <th style={{fontSize: '0.75rem'}}>Product</th>
                  <th style={{fontSize: '0.75rem'}}>Seller</th>
                  <th style={{fontSize: '0.75rem'}}>Price</th>
                  <th style={{fontSize: '0.75rem'}}>Category</th>
                  <th style={{fontSize: '0.75rem'}}>Status</th>
                  <th style={{fontSize: '0.75rem'}}>Listed Date</th>
                  <th style={{fontSize: '0.75rem'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredListings.map((listing) => (
                  <tr key={listing._id} style={{fontSize: '0.8rem'}}>
                    <td>
                      <a 
                        href={`/product/${listing._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none' }}
                      >
                        <img 
                          src={listing.images?.[0] || 'https://via.placeholder.com/50x50?text=No+Image'} 
                          alt={listing.name}
                          style={{ 
                            width: '40px', 
                            height: '40px', 
                            objectFit: 'cover', 
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                          }}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/40x40?text=No+Image';
                          }}
                          onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        />
                      </a>
                    </td>
                    <td>
                      <div style={{maxWidth: '250px'}}>
                        <a 
                          href={`/product/${listing._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            textDecoration: 'none',
                            color: '#0066cc',
                            fontWeight: 'bold'
                          }}
                          onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                        >
                          {listing.name}
                        </a>
                        <div className="text-muted" style={{fontSize: '0.7rem'}}>
                          {listing.marketplace && <span className="badge bg-info me-1">{listing.marketplace}</span>}
                          {listing.isAmazonsChoice && <span className="badge bg-warning">Amazon's Choice</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{listing.seller?.username || 'Unknown'}</strong>
                        <div className="text-muted" style={{fontSize: '0.7rem'}}>
                          {listing.seller?.supplierId}
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{listing.currency === 'PKR' ? 'Rs' : listing.currency === 'USD' ? '$' : listing.currency === 'AED' ? 'د.إ' : '£'}{listing.price}</strong>
                      <div className="text-muted" style={{fontSize: '0.7rem'}}>Stock: {listing.stock}</div>
                    </td>
                    <td>
                      <span className="badge bg-secondary">{listing.category}</span>
                    </td>
                    <td>
                      <span className={`badge bg-${
                        listing.approvalStatus === 'approved' ? 'success' : 
                        listing.approvalStatus === 'rejected' ? 'danger' : 'warning'
                      }`}>
                        {listing.approvalStatus?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <small>{new Date(listing.listedAt || listing.createdAt).toLocaleDateString()}</small>
                    </td>
                    <td>
                      <div className="btn-group" role="group">
                        <a
                          href={`/product/${listing._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-info btn-sm"
                          title="View Product"
                        >
                          <i className="fas fa-eye"></i>
                        </a>
                        {listing.approvalStatus === 'pending' && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleApprove(listing._id)}
                              title="Approve"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleReject(listing._id)}
                              title="Reject"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </>
                        )}
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleDelete(listing._id)}
                          title="Delete"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredListings.length === 0 && (
            <div className="text-center py-5">
              <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
              <p className="text-muted">No seller listings found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSellerListings;