import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { adminGet, adminPost, adminPut } from '../../utils/adminApi';

const SellerManagement = () => {
  const navigate = useNavigate();
  const { admin, isLoggedIn, loading: authLoading, authResolved } = useAdmin();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // Wait for authentication to be resolved before checking login status
    if (!authResolved || authLoading) {
      return;
    }

    if (!isLoggedIn || !admin) {
      navigate('/admin/login');
      return;
    }
    fetchSellers();
  }, [isLoggedIn, admin, navigate, authResolved, authLoading]);

  const fetchSellers = async () => {
    try {
      setLoading(true);
      const response = await adminGet('http://localhost:5000/api/admin/sellers');
      if (response.ok) {
        const data = await response.json();
        setSellers(data.sellers || []);
      }
    } catch (error) {
      console.error('Error fetching sellers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSellerProducts = async (sellerId) => {
    try {
      setLoadingProducts(true);
      const response = await adminGet(`http://localhost:5000/api/products/admin/seller/${sellerId}`);
      if (response.ok) {
        const data = await response.json();
        setSellerProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching seller products:', error);
      setSellerProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSellerClick = (seller) => {
    setSelectedSeller(seller);
    fetchSellerProducts(seller._id);
  };

  const approveProduct = async (productId) => {
    try {
      const response = await adminPut(`http://localhost:5000/api/products/admin/approve/${productId}`, {});
      if (response.ok) {
        // Refresh seller products
        if (selectedSeller) {
          fetchSellerProducts(selectedSeller._id);
        }
        alert('Product approved successfully!');
      }
    } catch (error) {
      console.error('Error approving product:', error);
      alert('Failed to approve product');
    }
  };

  const rejectProduct = async (productId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const response = await adminPut(`http://localhost:5000/api/products/admin/reject/${productId}`, {
        rejectionReason: reason
      });
      if (response.ok) {
        // Refresh seller products
        if (selectedSeller) {
          fetchSellerProducts(selectedSeller._id);
        }
        alert('Product rejected successfully!');
      }
    } catch (error) {
      console.error('Error rejecting product:', error);
      alert('Failed to reject product');
    }
  };

  const filteredSellers = sellers.filter(seller => {
    const matchesSearch = seller.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         seller.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         seller.supplierId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || seller.verificationStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="container-fluid mt-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading sellers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-md-8">
          <h2><i className="fas fa-users me-2"></i>Seller Management</h2>
          <p className="text-muted">Manage sellers and their listed products</p>
        </div>
        <div className="col-md-4 text-end">
          <button className="btn btn-secondary" onClick={() => navigate('/admin/dashboard')}>
            <i className="fas fa-arrow-left me-1"></i>Back to Dashboard
          </button>
        </div>
      </div>

      <div className="row">
        {/* Sellers List */}
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h5><i className="fas fa-list me-2"></i>Sellers ({filteredSellers.length})</h5>
            </div>
            <div className="card-body">
              {/* Search and Filter */}
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control mb-2"
                  placeholder="Search sellers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="required">Required</option>
                </select>
              </div>

              {/* Sellers List */}
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {filteredSellers.map(seller => (
                  <div
                    key={seller._id}
                    className={`card mb-2 cursor-pointer ${selectedSeller?._id === seller._id ? 'border-primary' : ''}`}
                    onClick={() => handleSellerClick(seller)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">{seller.username}</h6>
                          <small className="text-muted">{seller.supplierId}</small>
                          <div className="mt-1">
                            <span className={`badge ${
                              seller.verificationStatus === 'approved' ? 'bg-success' :
                              seller.verificationStatus === 'pending' ? 'bg-warning' :
                              seller.verificationStatus === 'rejected' ? 'bg-danger' : 'bg-secondary'
                            }`}>
                              {seller.verificationStatus}
                            </span>
                          </div>
                        </div>
                        <div className="text-end">
                          <small className="text-muted d-block">{seller.city}</small>
                          <small className="text-muted">{seller.productCategory}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Seller Details and Products */}
        <div className="col-md-8">
          {selectedSeller ? (
            <>
              {/* Seller Details */}
              <div className="card mb-4">
                <div className="card-header">
                  <h5><i className="fas fa-user me-2"></i>Seller Details</h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <table className="table table-borderless">
                        <tbody>
                          <tr>
                            <td><strong>Username:</strong></td>
                            <td>{selectedSeller.username}</td>
                          </tr>
                          <tr>
                            <td><strong>Email:</strong></td>
                            <td>{selectedSeller.email}</td>
                          </tr>
                          <tr>
                            <td><strong>Supplier ID:</strong></td>
                            <td><span className="badge bg-primary">{selectedSeller.supplierId}</span></td>
                          </tr>
                          <tr>
                            <td><strong>WhatsApp:</strong></td>
                            <td>
                              <a href={`https://wa.me/${selectedSeller.whatsappNo?.replace(/[^0-9]/g, '')}`} 
                                 target="_blank" rel="noopener noreferrer" className="text-success">
                                <i className="fab fa-whatsapp me-1"></i>{selectedSeller.whatsappNo}
                              </a>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="col-md-6">
                      <table className="table table-borderless">
                        <tbody>
                          <tr>
                            <td><strong>Location:</strong></td>
                            <td>{selectedSeller.city}, {selectedSeller.country}</td>
                          </tr>
                          <tr>
                            <td><strong>Category:</strong></td>
                            <td>{selectedSeller.productCategory}</td>
                          </tr>
                          <tr>
                            <td><strong>Status:</strong></td>
                            <td>
                              <span className={`badge ${
                                selectedSeller.verificationStatus === 'approved' ? 'bg-success' :
                                selectedSeller.verificationStatus === 'pending' ? 'bg-warning' :
                                selectedSeller.verificationStatus === 'rejected' ? 'bg-danger' : 'bg-secondary'
                              }`}>
                                {selectedSeller.verificationStatus}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Joined:</strong></td>
                            <td>{new Date(selectedSeller.createdAt).toLocaleDateString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seller Products */}
              <div className="card">
                <div className="card-header">
                  <h5><i className="fas fa-boxes me-2"></i>Listed Products ({sellerProducts.length})</h5>
                </div>
                <div className="card-body">
                  {loadingProducts ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-2">Loading products...</p>
                    </div>
                  ) : sellerProducts.length === 0 ? (
                    <div className="text-center py-4">
                      <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                      <h5 className="text-muted">No products found</h5>
                      <p className="text-muted">This seller hasn't listed any products yet.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Image</th>
                            <th>Product Name</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Listed Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sellerProducts.map(product => (
                            <tr key={product._id}>
                              <td>
                                <img 
                                  src={product.images?.[0] || 'https://via.placeholder.com/50x50?text=No+Image'} 
                                  alt={product.name}
                                  style={{ 
                                    width: '50px', 
                                    height: '50px', 
                                    objectFit: 'contain', 
                                    objectPosition: 'center',
                                    borderRadius: '4px',
                                    padding: '2px',
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #e5e7eb'
                                  }}
                                  onError={(e) => {
                                    e.target.src = 'https://via.placeholder.com/50x50?text=No+Image';
                                  }}
                                />
                              </td>
                              <td>
                                <div style={{ maxWidth: '200px' }}>
                                  <strong className="d-block text-truncate">{product.name}</strong>
                                  {product.originalProductId && (
                                    <small className="text-muted">Listed from Admin Products</small>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className="fw-bold text-success">
                                  £{product.price}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${product.stock > 0 ? 'bg-success' : 'bg-danger'}`}>
                                  {product.stock}
                                </span>
                              </td>
                              <td>
                                <span className="badge bg-info">{product.category}</span>
                              </td>
                              <td>
                                <span className={`badge ${
                                  product.approvalStatus === 'approved' ? 'bg-success' :
                                  product.approvalStatus === 'pending' ? 'bg-warning' : 'bg-danger'
                                }`}>
                                  {product.approvalStatus}
                                </span>
                                {product.isAmazonsChoice && (
                                  <div>
                                    <small className="badge bg-warning text-dark mt-1">Amazon's Choice</small>
                                  </div>
                                )}
                              </td>
                              <td>
                                <small className="text-muted">
                                  {new Date(product.createdAt).toLocaleDateString()}
                                </small>
                              </td>
                              <td>
                                <div className="btn-group btn-group-sm">
                                  {product.approvalStatus === 'pending' && (
                                    <>
                                      <button 
                                        className="btn btn-success btn-sm"
                                        onClick={() => approveProduct(product._id)}
                                        title="Approve Product"
                                      >
                                        <i className="fas fa-check"></i>
                                      </button>
                                      <button 
                                        className="btn btn-danger btn-sm"
                                        onClick={() => rejectProduct(product._id)}
                                        title="Reject Product"
                                      >
                                        <i className="fas fa-times"></i>
                                      </button>
                                    </>
                                  )}
                                  <button 
                                    className="btn btn-info btn-sm"
                                    onClick={() => navigate(`/product/${product._id}`)}
                                    title="View Product"
                                  >
                                    <i className="fas fa-eye"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="card">
              <div className="card-body text-center py-5">
                <i className="fas fa-user-plus fa-3x text-muted mb-3"></i>
                <h5 className="text-muted">Select a Seller</h5>
                <p className="text-muted">Choose a seller from the list to view their details and products.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerManagement;