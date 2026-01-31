import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';

const AdminListingRequests = () => {
  const navigate = useNavigate();
  const { makeAuthenticatedRequest } = useAdmin();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending_approval');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  useEffect(() => {
    loadListingRequests();
  }, [statusFilter]);

  useEffect(() => {
    let filtered = requests;
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(request => 
        request.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.sellerUsername?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredRequests(filtered);
  }, [searchQuery, requests]);

  const loadListingRequests = async () => {
    try {
      setLoading(true);
      
      const response = await makeAuthenticatedRequest(
        `http://localhost:5000/api/sellers/admin/listing-requests?status=${statusFilter}&limit=100`
      );

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
        setFilteredRequests(data.requests || []);
        
        // Calculate stats - we need to fetch all statuses for stats
        if (statusFilter === 'pending_approval') {
          await loadStats();
        }
      } else {
        console.error('Failed to load listing requests:', response.status);
        alert('❌ Failed to load listing requests');
      }
    } catch (error) {
      console.error('Error loading listing requests:', error);
      alert('❌ Could not load listing requests');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Load all requests to calculate stats
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        makeAuthenticatedRequest('http://localhost:5000/api/sellers/admin/listing-requests?status=pending_approval&limit=1000'),
        makeAuthenticatedRequest('http://localhost:5000/api/sellers/admin/listing-requests?status=approved&limit=1000'),
        makeAuthenticatedRequest('http://localhost:5000/api/sellers/admin/listing-requests?status=rejected&limit=1000')
      ]);

      const pending = pendingRes.ok ? (await pendingRes.json()).requests.length : 0;
      const approved = approvedRes.ok ? (await approvedRes.json()).requests.length : 0;
      const rejected = rejectedRes.ok ? (await rejectedRes.json()).requests.length : 0;

      setStats({
        total: pending + approved + rejected,
        pending,
        approved,
        rejected
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleApprove = async (sellerId, requestId) => {
    if (!confirm('Approve this listing request? The product will be added to the seller\'s inventory.')) return;

    try {
      const response = await makeAuthenticatedRequest(
        `http://localhost:5000/api/sellers/admin/listing-requests/${sellerId}/${requestId}/approve`,
        { method: 'PUT' }
      );

      if (response.ok) {
        alert('✅ Listing request approved successfully! Product has been added to seller\'s inventory.');
        loadListingRequests();
        loadStats();
      } else {
        const data = await response.json();
        alert('❌ Failed to approve request: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert('❌ Error approving request');
    }
  };

  const handleReject = async (sellerId, requestId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const response = await makeAuthenticatedRequest(
        `http://localhost:5000/api/sellers/admin/listing-requests/${sellerId}/${requestId}/reject`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason })
        }
      );

      if (response.ok) {
        alert('✅ Listing request rejected');
        loadListingRequests();
        loadStats();
      } else {
        const data = await response.json();
        alert('❌ Failed to reject request: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('❌ Error rejecting request');
    }
  };

  if (loading) {
    return (
      <div className="container-fluid mt-3">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading listing requests...</p>
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
            <i className="fas fa-clipboard-list text-primary me-2"></i>
            Product Listing Requests
          </h5>
          <small className="text-muted">Review and approve seller product listing requests</small>
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
            onClick={loadListingRequests}
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
              <h6 style={{fontSize: '0.75rem', marginBottom: '5px'}}>Total Requests</h6>
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
        <div className="col-md-3">
          <select
            className="form-select form-select-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="col-md-5">
          <div className="text-muted" style={{fontSize: '0.75rem', padding: '6px 0'}}>
            Showing {filteredRequests.length} {statusFilter.replace('_', ' ')} requests
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th style={{fontSize: '0.75rem'}}>Product</th>
                  <th style={{fontSize: '0.75rem'}}>Seller</th>
                  <th style={{fontSize: '0.75rem'}}>Prices</th>
                  <th style={{fontSize: '0.75rem'}}>Submitted</th>
                  <th style={{fontSize: '0.75rem'}}>Status</th>
                  <th style={{fontSize: '0.75rem'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={`${request.sellerId}-${request._id}`} style={{fontSize: '0.8rem'}}>
                    <td>
                      <div style={{maxWidth: '300px'}}>
                        <strong>{request.productName}</strong>
                        <div className="text-muted" style={{fontSize: '0.7rem'}}>
                          ID: {request.productId}
                        </div>
                        {request.notes && (
                          <div className="text-muted" style={{fontSize: '0.7rem'}}>
                            <i className="fas fa-sticky-note me-1"></i>
                            {request.notes}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{request.sellerUsername}</strong>
                        <div className="text-muted" style={{fontSize: '0.7rem'}}>
                          {request.sellerEmail}
                        </div>
                        <div className="text-muted" style={{fontSize: '0.7rem'}}>
                          Status: <span className={`badge bg-${
                            request.sellerVerificationStatus === 'approved' ? 'success' : 'warning'
                          }`} style={{fontSize: '0.6rem'}}>
                            {request.sellerVerificationStatus || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div><strong>Admin:</strong> £{parseFloat(request.productPrice || 0).toFixed(2)}</div>
                        <div><strong>Seller:</strong> £{parseFloat(request.sellerPrice || 0).toFixed(2)}</div>
                        {request.sellerPrice && request.productPrice && (
                          <div className="text-muted" style={{fontSize: '0.7rem'}}>
                            {parseFloat(request.sellerPrice) < parseFloat(request.productPrice) ? (
                              <span className="text-success">
                                <i className="fas fa-arrow-down me-1"></i>
                                Lower by £{(parseFloat(request.productPrice) - parseFloat(request.sellerPrice)).toFixed(2)}
                              </span>
                            ) : parseFloat(request.sellerPrice) > parseFloat(request.productPrice) ? (
                              <span className="text-warning">
                                <i className="fas fa-arrow-up me-1"></i>
                                Higher by £{(parseFloat(request.sellerPrice) - parseFloat(request.productPrice)).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-info">Same price</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <small>{new Date(request.submittedAt).toLocaleDateString()}</small>
                      <div className="text-muted" style={{fontSize: '0.7rem'}}>
                        {new Date(request.submittedAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td>
                      <span className={`badge bg-${
                        request.status === 'approved' ? 'success' : 
                        request.status === 'rejected' ? 'danger' : 'warning'
                      }`}>
                        {request.status === 'pending_approval' ? 'PENDING' : request.status?.toUpperCase()}
                      </span>
                      {request.status === 'rejected' && request.rejectionReason && (
                        <div className="text-danger" style={{fontSize: '0.7rem', marginTop: '2px'}}>
                          <i className="fas fa-info-circle me-1"></i>
                          {request.rejectionReason}
                        </div>
                      )}
                      {request.status === 'approved' && request.approvedAt && (
                        <div className="text-success" style={{fontSize: '0.7rem', marginTop: '2px'}}>
                          <i className="fas fa-check me-1"></i>
                          {new Date(request.approvedAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td>
                      {request.status === 'pending_approval' ? (
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleApprove(request.sellerId, request._id)}
                            title="Approve Request"
                          >
                            <i className="fas fa-check"></i>
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleReject(request.sellerId, request._id)}
                            title="Reject Request"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted" style={{fontSize: '0.7rem'}}>
                          {request.status === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRequests.length === 0 && (
            <div className="text-center py-5">
              <i className="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
              <p className="text-muted">
                {statusFilter === 'pending_approval' ? 'No pending requests' : 
                 statusFilter === 'approved' ? 'No approved requests' : 'No rejected requests'}
              </p>
              {statusFilter === 'pending_approval' && (
                <small className="text-muted">
                  New listing requests will appear here when sellers submit them.
                </small>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminListingRequests;