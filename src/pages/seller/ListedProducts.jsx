import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeller } from '../../context/SellerContext';

const ListedProducts = () => {
  const navigate = useNavigate();
  const { seller, isLoggedIn, loading, authResolved } = useSeller();
  const [products, setProducts] = useState([]);
  const [pageLoading, setPageLoading] = useState(false);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [activeTab, setActiveTab] = useState('all');
  const [editingCell, setEditingCell] = useState(null); // Track which cell is being edited (productId-field)
  const [editValues, setEditValues] = useState({}); // Store edit values
  const [updatingProducts, setUpdatingProducts] = useState(new Set()); // Track which products are being updated

  useEffect(() => {
    // Wait for authentication to be resolved before checking login status
    if (!authResolved || loading) {
      return;
    }

    if (!isLoggedIn || !seller) {
      navigate('/login/supplier');
      return;
    }
    
    loadProducts();
  }, [isLoggedIn, seller, navigate, activeTab, authResolved, loading]);

  const loadProducts = async () => {
    try {
      setPageLoading(true);
      const token = localStorage.getItem('sellerToken');
      
      if (!token) {
        alert('❌ No authentication token found. Please login again.');
        navigate('/login/supplier');
        return;
      }
      
      const statusParam = activeTab !== 'all' ? `&status=${activeTab}` : '';
      
      console.log('Loading products with token:', token ? 'Token exists' : 'No token');
      console.log('API URL:', `http://localhost:5000/api/products/seller/listed-products?limit=50${statusParam}`);
      
      const response = await fetch(`http://localhost:5000/api/products/seller/listed-products?limit=50${statusParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log('API Response:', { status: response.status, data });
      
      if (response.ok) {
        setProducts(data.products || []);
        setCounts(data.counts || { total: 0, pending: 0, approved: 0, rejected: 0 });
        // Products loaded
      } else {
        console.error('Listed products error:', data);
        if (response.status === 401) {
          alert('❌ Authentication failed. Please login again.');
          navigate('/login/supplier');
        } else {
          alert('❌ ' + (data.message || 'Failed to load products'));
        }
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('❌ Could not load products: ' + error.message);
    } finally {
      setPageLoading(false);
    }
  };

  const handleUnlistProduct = async (product) => {
    if (!confirm(`Are you sure you want to unlist "${product.name}"? This will remove your seller information from this product.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('sellerToken');
      
      const response = await fetch(`http://localhost:5000/api/sellers/unlist-product/${product._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert('✅ Product unlisted successfully!');
        loadProducts(); // Refresh the list
      } else {
        alert('❌ ' + data.message);
      }
    } catch (error) {
      console.error('Unlist product error:', error);
      alert('❌ Failed to unlist product');
    }
  };

  const handleCellClick = (productId, field, currentValue) => {
    setEditingCell(`${productId}-${field}`)
    setEditValues({ ...editValues, [`${productId}-${field}`]: currentValue || '' })
  }

  const handleEditChange = (productId, field, value) => {
    setEditValues({ ...editValues, [`${productId}-${field}`]: value })
  }

  const handleInputEvent = (e, productId, field) => {
    // Handle keyboard up/down arrows and direct input
    const value = e.target.value
    handleEditChange(productId, field, value)
  }

  const handleMouseWheel = (e, productId, field) => {
    // Handle mouse wheel up/down on number inputs
    if (e.deltaY < 0) {
      // Wheel up - increment
      const currentValue = parseFloat(editValues[`${productId}-${field}`] || 0)
      const step = (field === 'price' || field === 'shipping') ? 0.01 : 1
      const newValue = (currentValue + step).toFixed((field === 'price' || field === 'shipping') ? 2 : 0)
      handleEditChange(productId, field, newValue)
    } else if (e.deltaY > 0) {
      // Wheel down - decrement
      const currentValue = parseFloat(editValues[`${productId}-${field}`] || 0)
      const step = (field === 'price' || field === 'shipping') ? 0.01 : 1
      const newValue = Math.max(0, currentValue - step).toFixed((field === 'price' || field === 'shipping') ? 2 : 0)
      handleEditChange(productId, field, newValue)
    }
  }

  const handleSaveEdit = async (productId, field) => {
    const cellKey = `${productId}-${field}`
    const newValue = editValues[cellKey]

    if (!newValue || newValue === '' || isNaN(newValue)) {
      setEditingCell(null)
      return
    }

    const numericValue = (field === 'price' || field === 'shipping') ? parseFloat(newValue) : parseInt(newValue)
    if (numericValue < 0) {
      setEditingCell(null)
      return
    }

    // Add product to updating set
    setUpdatingProducts(prev => new Set(prev).add(productId))
    setEditingCell(null) // Exit edit mode

    try {
      const token = localStorage.getItem('sellerToken')
      const updateData = {}
      updateData[field] = numericValue

      const response = await fetch(`http://localhost:5000/api/sellers/update-inventory/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        // Update the local state to reflect the change
        setProducts(prevProducts => 
          prevProducts.map(product => 
            product._id === productId 
              ? { 
                  ...product, 
                  [field]: numericValue,
                  // Update seller's specific price if it's a price update
                  ...(field === 'price' && {
                    sellerInfo: {
                      ...product.sellerInfo,
                      sellerPrice: numericValue
                    }
                  }),
                  // Update seller's specific shipping if it's a shipping update
                  ...(field === 'shipping' && {
                    sellerInfo: {
                      ...product.sellerInfo,
                      sellerShipping: numericValue
                    }
                  })
                }
              : product
          )
        )
      } else {
        const data = await response.json()
        console.error('Update failed:', data.message)
      }
    } catch (error) {
      console.error('Update error:', error)
    } finally {
      // Remove product from updating set
      setUpdatingProducts(prev => {
        const newSet = new Set(prev)
        newSet.delete(productId)
        return newSet
      })
    }
  }

  const handleKeyPress = (e, productId, field) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleSaveEdit(productId, field)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditingCell(null)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-warning text-dark',
      approved: 'bg-success',
      rejected: 'bg-danger'
    };
    return badges[status] || 'bg-secondary';
  };

  const getMarketplaceBadge = (marketplace) => {
    const badges = {
      UK: 'bg-primary',
      UAE: 'bg-info',
      US: 'bg-success',
      Amazon10: 'bg-warning text-dark'
    };
    return badges[marketplace] || 'bg-secondary';
  };

  if (loading || !authResolved) {
    return (
      <div className="container-fluid mt-3">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (pageLoading) {
    return (
      <div className="container-fluid mt-3">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading your products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid" style={{ fontSize: '0.85rem', padding: '8px' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-1">
            <i className="fas fa-boxes text-primary me-2"></i>
            My Listed Products
          </h5>
          <small className="text-muted">
            Manage your product inventory and pricing
          </small>
        </div>
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={() => navigate('/seller/dashboard')}
        >
          <i className="fas fa-arrow-left me-1"></i>Back to Dashboard
        </button>
      </div>

      {/* Stats Cards */}
      <div className="row g-2 mb-3">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body py-2">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title mb-0">Total Products</h6>
                  <h4 className="mb-0">{counts.total}</h4>
                </div>
                <i className="fas fa-boxes fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body py-2">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title mb-0">Approved</h6>
                  <h4 className="mb-0">{counts.approved}</h4>
                </div>
                <i className="fas fa-check-circle fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-dark">
            <div className="card-body py-2">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title mb-0">Pending</h6>
                  <h4 className="mb-0">{counts.pending}</h4>
                </div>
                <i className="fas fa-clock fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-danger text-white">
            <div className="card-body py-2">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title mb-0">Rejected</h6>
                  <h4 className="mb-0">{counts.rejected}</h4>
                </div>
                <i className="fas fa-times-circle fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Products ({counts.total})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            Approved ({counts.approved})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending ({counts.pending})
          </button>
        </li>
        {counts.rejected > 0 && (
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'rejected' ? 'active' : ''}`}
              onClick={() => setActiveTab('rejected')}
            >
              Rejected ({counts.rejected})
            </button>
          </li>
        )}
      </ul>

      {/* Products Table */}
      <div className="card">
        <div className="card-body">
          {products.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">No products found</h5>
              <p className="text-muted">
                {activeTab === 'all' 
                  ? "You haven't listed any products yet." 
                  : `No ${activeTab} products found.`}
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/seller/dashboard')}
              >
                <i className="fas fa-plus me-1"></i>List Products
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Image</th>
                    <th>Product Name</th>
                    <th>Price</th>
                    <th>Shipping</th>
                    <th>Stock</th>
                    <th>Category</th>
                    <th>Marketplace</th>
                    <th>Status</th>
                    <th>Listed Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product._id}>
                      <td>
                        {!product.isListingRequest ? (
                          <a 
                            href={`/product/${product._id}`}
                            style={{ cursor: 'pointer', display: 'block' }}
                          >
                            <img 
                              src={product.images?.[0] || 'https://via.placeholder.com/50x50?text=No+Image'} 
                              alt={product.name}
                              style={{ 
                                width: '40px', 
                                height: '40px', 
                                objectFit: 'contain', 
                                objectPosition: 'center',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                padding: '2px',
                                backgroundColor: '#f8f9fa',
                                border: '1px solid #e5e7eb',
                                transition: 'transform 0.2s ease'
                              }}
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/40x40?text=No+Image';
                              }}
                              onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                            />
                          </a>
                        ) : (
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#f8f9fa',
                            border: '1px solid #e5e7eb',
                            borderRadius: '4px'
                          }}>
                            <i className="fas fa-clock text-muted" title="Listing request pending"></i>
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ maxWidth: '200px' }}>
                          {product.isListingRequest ? (
                            <div>
                              <span className="d-block text-truncate fw-bold" style={{ color: '#0066cc' }} title={product.name}>
                                {product.name}
                              </span>
                              <small className="badge bg-info">Listing Request</small>
                            </div>
                          ) : (
                            <a 
                              href={`/product/${product._id}`}
                              style={{
                                textDecoration: 'none',
                                color: '#0066cc',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                              className="d-block text-truncate"
                              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                              title={product.name}
                            >
                              {product.name}
                            </a>
                          )}
                          {product.asin && (
                            <small className="text-muted">ASIN: {product.asin}</small>
                          )}
                        </div>
                      </td>
                      <td
                        style={{ 
                          cursor: product.isListingRequest ? 'default' : 'pointer', 
                          transition: 'background 0.2s',
                          padding: '8px'
                        }}
                        onClick={() => !product.isListingRequest && handleCellClick(product._id, 'price', product.sellerInfo?.sellerPrice || product.price)}
                        onMouseEnter={(e) => !product.isListingRequest && (e.target.style.background = '#f0f0ff')}
                        onMouseLeave={(e) => e.target.style.background = ''}
                        title={product.isListingRequest ? "Cannot edit price for listing requests" : "Click to edit price"}
                      >
                        {editingCell === `${product._id}-price` && !product.isListingRequest ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editValues[`${product._id}-price`] || ''}
                            onChange={(e) => handleEditChange(product._id, 'price', e.target.value)}
                            onInput={(e) => handleInputEvent(e, product._id, 'price')}
                            onWheel={(e) => handleMouseWheel(e, product._id, 'price')}
                            onBlur={() => handleSaveEdit(product._id, 'price')}
                            onKeyDown={(e) => handleKeyPress(e, product._id, 'price')}
                            autoFocus
                            disabled={updatingProducts.has(product._id)}
                            style={{
                              width: '80px',
                              padding: '4px',
                              fontSize: '0.85rem',
                              border: '2px solid #667eea',
                              borderRadius: '4px',
                              outline: 'none'
                            }}
                          />
                        ) : (
                          <div>
                            <span className="fw-bold text-success">
                              {product.currency || 'GBP'} {product.sellerInfo?.sellerPrice || product.price}
                              {!product.isListingRequest && (
                                <span style={{ marginLeft: '4px', fontSize: '0.6rem', color: '#999' }}>✏️</span>
                              )}
                            </span>
                            {/* Show admin price comparison for listing requests */}
                            {product.isListingRequest && product.sellerInfo?.sellerPrice && (
                              <div>
                                <small className="text-muted">
                                  Requested price
                                </small>
                              </div>
                            )}
                            {/* Show admin price if different */}
                            {!product.isListingRequest && product.sellerInfo?.sellerPrice && product.sellerInfo.sellerPrice !== product.price && (
                              <div>
                                <small className="text-muted">
                                  Admin: {product.currency || 'GBP'} {product.price}
                                </small>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td
                        style={{ 
                          cursor: product.isListingRequest ? 'default' : 'pointer', 
                          transition: 'background 0.2s',
                          padding: '8px'
                        }}
                        onClick={() => !product.isListingRequest && handleCellClick(product._id, 'shipping', product.sellerInfo?.sellerShipping || product.shipping || 0)}
                        onMouseEnter={(e) => !product.isListingRequest && (e.target.style.background = '#f0f0ff')}
                        onMouseLeave={(e) => e.target.style.background = ''}
                        title={product.isListingRequest ? "Cannot edit shipping for listing requests" : "Click to edit shipping"}
                      >
                        {editingCell === `${product._id}-shipping` && !product.isListingRequest ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editValues[`${product._id}-shipping`] || ''}
                            onChange={(e) => handleEditChange(product._id, 'shipping', e.target.value)}
                            onInput={(e) => handleInputEvent(e, product._id, 'shipping')}
                            onWheel={(e) => handleMouseWheel(e, product._id, 'shipping')}
                            onBlur={() => handleSaveEdit(product._id, 'shipping')}
                            onKeyDown={(e) => handleKeyPress(e, product._id, 'shipping')}
                            autoFocus
                            disabled={updatingProducts.has(product._id)}
                            style={{
                              width: '80px',
                              padding: '4px',
                              fontSize: '0.85rem',
                              border: '2px solid #667eea',
                              borderRadius: '4px',
                              outline: 'none'
                            }}
                          />
                        ) : (
                          <div>
                            <span className="fw-bold text-info">
                              £{(product.sellerInfo?.sellerShipping || product.shipping || 0).toFixed(2)}
                              {!product.isListingRequest && (
                                <span style={{ marginLeft: '4px', fontSize: '0.6rem', color: '#999' }}>✏️</span>
                              )}
                            </span>
                            {/* Show admin shipping if different */}
                            {!product.isListingRequest && product.sellerInfo?.sellerShipping && product.sellerInfo.sellerShipping !== product.shipping && (
                              <div>
                                <small className="text-muted">
                                  Admin: £{(product.shipping || 0).toFixed(2)}
                                </small>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td
                        style={{ 
                          cursor: product.isListingRequest ? 'default' : 'pointer', 
                          transition: 'background 0.2s',
                          padding: '8px'
                        }}
                        onClick={() => !product.isListingRequest && handleCellClick(product._id, 'stock', product.stock)}
                        onMouseEnter={(e) => !product.isListingRequest && (e.target.style.background = '#f0f0ff')}
                        onMouseLeave={(e) => e.target.style.background = ''}
                        title={product.isListingRequest ? "Stock not available for listing requests" : "Click to edit stock"}
                      >
                        {editingCell === `${product._id}-stock` && !product.isListingRequest ? (
                          <input
                            type="number"
                            value={editValues[`${product._id}-stock`] || ''}
                            onChange={(e) => handleEditChange(product._id, 'stock', e.target.value)}
                            onInput={(e) => handleInputEvent(e, product._id, 'stock')}
                            onWheel={(e) => handleMouseWheel(e, product._id, 'stock')}
                            onBlur={() => handleSaveEdit(product._id, 'stock')}
                            onKeyDown={(e) => handleKeyPress(e, product._id, 'stock')}
                            autoFocus
                            disabled={updatingProducts.has(product._id)}
                            style={{
                              width: '70px',
                              padding: '4px',
                              fontSize: '0.85rem',
                              border: '2px solid #667eea',
                              borderRadius: '4px',
                              outline: 'none'
                            }}
                          />
                        ) : (
                          <span className={`badge ${
                            product.isListingRequest ? 'bg-secondary' : 
                            product.stock > 0 ? 'bg-success' : 'bg-danger'
                          }`}>
                            {product.isListingRequest ? 'Pending' : product.stock}
                            {!product.isListingRequest && (
                              <span style={{ marginLeft: '4px', fontSize: '0.6rem', color: '#999' }}>✏️</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-info">{product.category}</span>
                      </td>
                      <td>
                        <span className={`badge ${getMarketplaceBadge(product.marketplace)}`}>
                          {product.marketplace}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(product.approvalStatus)}`}>
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
                          {!product.isListingRequest ? (
                            <>
                              <a
                                href={`/product/${product._id}`}
                                className="btn btn-info btn-sm"
                                title="View Product"
                                style={{ 
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  textDecoration: 'none',
                                  color: 'white'
                                }}
                              >
                                <i className="fas fa-eye"></i>
                              </a>
                              <button 
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleUnlistProduct(product)}
                                title="Remove your listing from this product"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </>
                          ) : (
                            <div className="d-flex gap-1">
                              <span className="badge bg-info" title="This is a listing request pending admin approval">
                                <i className="fas fa-clock me-1"></i>
                                {product.approvalStatus === 'pending' ? 'Pending Review' : 
                                 product.approvalStatus === 'rejected' ? 'Rejected' : 'Request'}
                              </span>
                              {product.rejectionReason && (
                                <span 
                                  className="badge bg-danger" 
                                  title={`Rejection reason: ${product.rejectionReason}`}
                                  style={{ cursor: 'help' }}
                                >
                                  <i className="fas fa-info-circle"></i>
                                </span>
                              )}
                            </div>
                          )}
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
    </div>
  );
};

export default ListedProducts;