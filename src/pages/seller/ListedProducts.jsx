import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeller } from '../../context/SellerContext';
import { getApiUrl } from '../../utils/api';

const COUNTRY_OPTIONS = [
  { code: 'GBP', label: 'UK (£ GBP)' },
  { code: 'PKR', label: 'Pakistan (Rs PKR)' },
  { code: 'AED', label: 'UAE (AED)' },
  { code: 'USD', label: 'USA ($ USD)' },
];

// Render flag using regional indicator letters (encoding-safe)
const countryFlag = (code) => {
  const flags = { GBP: 'GB', PKR: 'PK', AED: 'AE', USD: 'US' };
  const cc = flags[code];
  if (!cc) return '\uD83C\uDF0D'; // 🌍 globe fallback
  return String.fromCodePoint(...[...cc].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};

const ListedProducts = () => {
  const navigate = useNavigate();
  const { seller, isLoggedIn, loading, authResolved } = useSeller();
  const [products, setProducts] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [activeTab, setActiveTab] = useState('approved');
  const [editingCell, setEditingCell] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [updatingProducts, setUpdatingProducts] = useState(new Set());
  const [retryCount, setRetryCount] = useState(0);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingCountry, setUpdatingCountry] = useState(new Set());
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const itemsPerPage = 50;

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
  }, [isLoggedIn, seller, navigate, activeTab, authResolved, loading, currentPage]);

  // Reset to page 1 when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const loadProducts = async (isRetry = false) => {
    try {
      setPageLoading(true);
      setShowRetryButton(false);
      
      const token = localStorage.getItem('sellerToken');
      
      if (!token) {
        alert('❌ No authentication token found. Please login again.');
        navigate('/login/supplier');
        return;
      }
      
      const statusParam = activeTab !== 'all' ? `&status=${activeTab}` : '';
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout (increased from 10s)
      
      const response = await fetch(getApiUrl(`products/seller/listed-products?limit=${itemsPerPage}&page=${currentPage}${statusParam}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (response.ok) {
        // Enrich each product with the current seller's listingCountry
        const enriched = (data.products || []).map(p => {
          const sellerId = seller?._id?.toString();
          const sellerEntry = p.sellers?.find(s => s.sellerId?.toString() === sellerId);
          return { ...p, sellerListingCountries: sellerEntry?.listingCountries || [] };
        });
        setProducts(enriched);
        setCounts(data.counts || { total: 0, pending: 0, approved: 0, rejected: 0 });
        setTotalPages(data.totalPages || 1);
        setRetryCount(0); // Reset retry count on success
        // Products loaded successfully
      } else {
        console.error('Listed products error:', data);
        if (response.status === 401) {
          alert('❌ Authentication failed. Please login again.');
          navigate('/login/supplier');
        } else if (response.status >= 500) {
          // Server error - show retry option
          setShowRetryButton(true);
          alert('❌ Server error. Please try again.');
        } else {
          alert('❌ ' + (data.message || 'Failed to load products'));
        }
      }
    } catch (error) {
      console.error('Network error:', error);
      
      if (error.name === 'AbortError') {
        setShowRetryButton(true);
        alert('❌ Request timed out. Please check your connection and try again.');
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setShowRetryButton(true);
        alert('❌ Could not connect to server. Please check your internet connection and try again.');
      } else {
        // Auto-retry up to 2 times for network errors
        if (!isRetry && retryCount < 2) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => loadProducts(true), 2000); // Retry after 2 seconds
          return;
        }
        setShowRetryButton(true);
        alert('❌ Could not load products. Please try again.');
      }
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
      
      const response = await fetch(getApiUrl(`sellers/unlist-product/${product._id}`), {
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

  const handleUpdateCountry = async (productId, countries) => {
    setUpdatingCountry(prev => new Set(prev).add(productId));
    try {
      const token = localStorage.getItem('sellerToken');
      const response = await fetch(getApiUrl(`sellers/update-inventory/${productId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ listingCountries: countries })
      });
      const data = await response.json();
      if (response.ok) {
        setProducts(prev => prev.map(p =>
          p._id === productId ? { ...p, sellerListingCountries: countries } : p
        ));
      } else {
        alert('❌ ' + (data.message || 'Failed to update countries'));
      }
    } catch (err) {
      alert('❌ Failed to update countries');
    } finally {
      setUpdatingCountry(prev => { const n = new Set(prev); n.delete(productId); return n; });
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

    // MOQ must be at least 1
    if (field === 'moq' && numericValue < 1) {
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

      const response = await fetch(getApiUrl(`sellers/update-inventory/${productId}`), {
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
                  }),
                  // Update MOQ
                  ...(field === 'moq' && { sellerMoq: numericValue })
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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    let aVal, bVal;
    switch (sortField) {
      case 'name': aVal = a.name?.toLowerCase(); bVal = b.name?.toLowerCase(); break;
      case 'price': aVal = parseFloat(a.sellerInfo?.sellerPrice || a.price || 0); bVal = parseFloat(b.sellerInfo?.sellerPrice || b.price || 0); break;
      case 'stock': aVal = a.stock || 0; bVal = b.stock || 0; break;
      case 'status': aVal = a.approvalStatus; bVal = b.approvalStatus; break;
      case 'createdAt': aVal = new Date(a.createdAt); bVal = new Date(b.createdAt); break;
      default: aVal = new Date(a.createdAt); bVal = new Date(b.createdAt);
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }) => (
    <span style={{ marginLeft: '4px', opacity: sortField === field ? 1 : 0.3, fontSize: '0.7rem' }}>
      {sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  if (loading || !authResolved) {
    return null;
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
            className={`nav-link ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
            style={{ 
              color: '#212529',
              fontWeight: activeTab === 'approved' ? 'bold' : '600'
            }}
          >
            Approved ({counts.approved})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
            style={{ 
              color: '#212529',
              fontWeight: activeTab === 'pending' ? 'bold' : '600'
            }}
          >
            Pending ({counts.pending})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
            style={{ 
              color: '#212529',
              fontWeight: activeTab === 'all' ? 'bold' : '600'
            }}
          >
            All Products ({counts.total})
          </button>
        </li>
        {counts.rejected > 0 && (
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'rejected' ? 'active' : ''}`}
              onClick={() => setActiveTab('rejected')}
              style={{ 
                color: '#212529',
                fontWeight: activeTab === 'rejected' ? 'bold' : '600'
              }}
            >
              Rejected ({counts.rejected})
            </button>
          </li>
        )}
      </ul>

      {/* Products Table */}
      {showRetryButton && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center mb-3">
          <div>
            <i className="fas fa-exclamation-triangle me-2"></i>
            Failed to load products. Please check your connection and try again.
          </div>
          <button 
            className="btn btn-warning btn-sm"
            onClick={() => loadProducts()}
            disabled={pageLoading}
          >
            <i className="fas fa-redo me-1"></i>
            {pageLoading ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      )}
      
      <div className="card">
        <div className="card-body">
          {pageLoading ? (
            /* Inline skeleton — page stays visible, table area shows loading */
            <div>
              {[1,2,3,4,5].map(i => (
                <div key={i} className="placeholder-glow d-flex align-items-center gap-2 py-2 border-bottom">
                  <div className="placeholder rounded" style={{ width: '36px', height: '36px', flexShrink: 0 }}></div>
                  <div className="flex-grow-1">
                    <div className="placeholder col-7 mb-1" style={{ height: '12px', borderRadius: '3px' }}></div>
                    <div className="placeholder col-4" style={{ height: '10px', borderRadius: '3px' }}></div>
                  </div>
                  <div className="placeholder col-1" style={{ height: '12px', borderRadius: '3px' }}></div>
                  <div className="placeholder col-1" style={{ height: '12px', borderRadius: '3px' }}></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
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
              <table className="table table-hover table-sm" style={{ fontSize: '0.78rem' }}>
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '44px', padding: '6px 4px' }}>Img</th>
                    <th style={{ minWidth: '140px', cursor: 'pointer', padding: '6px 4px' }} onClick={() => handleSort('name')}>
                      Product Name <SortIcon field="name" />
                    </th>
                    <th style={{ width: '80px', padding: '6px 4px' }}>SKU</th>
                    <th style={{ width: '80px', cursor: 'pointer', padding: '6px 4px' }} onClick={() => handleSort('price')}>
                      Price <SortIcon field="price" />
                    </th>
                    <th style={{ width: '70px', padding: '6px 4px' }}>Ship</th>
                    <th style={{ width: '55px', cursor: 'pointer', padding: '6px 4px' }} onClick={() => handleSort('stock')}>
                      Stock <SortIcon field="stock" />
                    </th>
                    <th style={{ width: '55px', padding: '6px 4px' }}>MOQ</th>
                    <th style={{ width: '110px', padding: '6px 4px' }}>Country</th>
                    <th style={{ width: '80px', padding: '6px 4px' }}>Category</th>
                    <th style={{ width: '70px', padding: '6px 4px' }}>Market</th>
                    <th style={{ width: '90px', cursor: 'pointer', padding: '6px 4px' }} onClick={() => handleSort('status')}>
                      Status <SortIcon field="status" />
                    </th>
                    <th style={{ width: '70px', cursor: 'pointer', padding: '6px 4px' }} onClick={() => handleSort('createdAt')}>
                      Date <SortIcon field="createdAt" />
                    </th>
                    <th style={{ width: '60px', padding: '6px 4px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProducts.map((product) => (
                    <tr key={product._id} style={{ verticalAlign: 'middle' }}>
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
                      {/* SKU Column */}
                      <td style={{ padding: '4px 3px', verticalAlign: 'middle' }}>
                        {product.sku ? (
                          <span style={{
                            display: 'inline-block',
                            background: '#f0f4ff',
                            border: '1px solid #c7d2fe',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: '#3730a3',
                            fontFamily: 'monospace'
                          }}>
                            {product.sku}
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>—</span>
                        )}
                      </td>
                      <td
                        style={{ 
                          cursor: product.isListingRequest ? 'default' : 'pointer', 
                          transition: 'background 0.2s',
                          padding: '4px 3px'
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
                          padding: '4px 3px'
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
                          padding: '4px 3px'
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
                      {/* MOQ Column - editable like Price */}
                      <td
                        style={{
                          cursor: product.isListingRequest ? 'default' : 'pointer',
                          transition: 'background 0.2s',
                          padding: '4px 3px', verticalAlign: 'middle'
                        }}
                        onClick={() => !product.isListingRequest && handleCellClick(product._id, 'moq', product.sellerMoq || 1)}
                        onMouseEnter={(e) => !product.isListingRequest && (e.currentTarget.style.background = '#fffbeb')}
                        onMouseLeave={(e) => e.currentTarget.style.background = ''}
                        title={product.isListingRequest ? 'MOQ not editable for pending requests' : 'Click to edit MOQ'}
                      >
                        {editingCell === `${product._id}-moq` && !product.isListingRequest ? (
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={editValues[`${product._id}-moq`] || ''}
                            onChange={(e) => handleEditChange(product._id, 'moq', e.target.value)}
                            onInput={(e) => handleInputEvent(e, product._id, 'moq')}
                            onWheel={(e) => handleMouseWheel(e, product._id, 'moq')}
                            onBlur={() => handleSaveEdit(product._id, 'moq')}
                            onKeyDown={(e) => handleKeyPress(e, product._id, 'moq')}
                            autoFocus
                            disabled={updatingProducts.has(product._id)}
                            style={{
                              width: '70px',
                              padding: '4px',
                              fontSize: '0.85rem',
                              border: '2px solid #ffc107',
                              borderRadius: '4px',
                              outline: 'none'
                            }}
                          />
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            background: '#fff3cd',
                            border: '1px solid #ffc107',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            color: '#856404',
                            whiteSpace: 'nowrap'
                          }}>
                            <i className="fas fa-boxes" style={{ fontSize: '0.65rem' }}></i>
                            {product.sellerMoq || 1}
                            {!product.isListingRequest && (
                              <span style={{ fontSize: '0.6rem', color: '#999' }}>✏️</span>
                            )}
                          </span>
                        )}
                      </td>
                      {/* Country Column - multi-select inline toggles */}
                      <td style={{ verticalAlign: 'middle', minWidth: '160px' }}>
                        {!product.isListingRequest ? (
                          <div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '3px' }}>
                              {COUNTRY_OPTIONS.map(c => {
                                const selected = (product.sellerListingCountries || []).includes(c.code)
                                return (
                                  <button
                                    key={c.code}
                                    type="button"
                                    disabled={updatingCountry.has(product._id)}
                                    onClick={() => {
                                      const current = product.sellerListingCountries || []
                                      const next = selected
                                        ? current.filter(x => x !== c.code)
                                        : [...current, c.code]
                                      handleUpdateCountry(product._id, next)
                                    }}
                                    title={c.label}
                                    style={{
                                      fontSize: '14px', padding: '2px 5px',
                                      borderRadius: '5px', cursor: 'pointer',
                                      border: selected ? '2px solid #ff6600' : '2px solid #dee2e6',
                                      background: selected ? '#fff5f0' : '#f8f9fa',
                                      opacity: updatingCountry.has(product._id) ? 0.5 : 1,
                                      transition: 'all 0.15s', lineHeight: 1
                                    }}
                                  >
                                    {countryFlag(c.code)}
                                  </button>
                                )
                              })}
                            </div>
                            <div style={{ fontSize: '9px', color: '#888' }}>
                              {updatingCountry.has(product._id)
                                ? <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                                : (product.sellerListingCountries || []).length === 0
                                  ? <span style={{ color: '#28a745' }}>All countries</span>
                                  : (product.sellerListingCountries || []).map(c => (
                                      <span key={c} style={{ marginRight: '3px' }}>{countryFlag(c)} {c}</span>
                                    ))
                              }
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#aaa' }}>—</span>
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

      {/* Pagination */}
      {!pageLoading && products.length > 0 && totalPages > 1 && (
        <div className="d-flex justify-content-center align-items-center gap-2 mt-3 flex-wrap">
          {/* Previous Button */}
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn btn-sm btn-outline-primary"
            style={{
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 1 ? 0.5 : 1
            }}
          >
            ← Prev
          </button>

          {/* Page Numbers */}
          {(() => {
            const pages = [];
            const maxVisible = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
            let endPage = Math.min(totalPages, startPage + maxVisible - 1);
            
            if (endPage - startPage < maxVisible - 1) {
              startPage = Math.max(1, endPage - maxVisible + 1);
            }

            // First page + ellipsis
            if (startPage > 1) {
              pages.push(
                <button
                  key={1}
                  onClick={() => setCurrentPage(1)}
                  className="btn btn-sm btn-outline-primary"
                >
                  1
                </button>
              );
              if (startPage > 2) {
                pages.push(<span key="ellipsis1" className="px-2">...</span>);
              }
            }

            // Page numbers
            for (let i = startPage; i <= endPage; i++) {
              pages.push(
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`btn btn-sm ${currentPage === i ? 'btn-primary' : 'btn-outline-primary'}`}
                  style={{
                    fontWeight: currentPage === i ? 'bold' : 'normal'
                  }}
                >
                  {i}
                </button>
              );
            }

            // Ellipsis + last page
            if (endPage < totalPages) {
              if (endPage < totalPages - 1) {
                pages.push(<span key="ellipsis2" className="px-2">...</span>);
              }
              pages.push(
                <button
                  key={totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="btn btn-sm btn-outline-primary"
                >
                  {totalPages}
                </button>
              );
            }

            return pages;
          })()}

          {/* Next Button */}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn btn-sm btn-outline-primary"
            style={{
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage === totalPages ? 0.5 : 1
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default ListedProducts;

