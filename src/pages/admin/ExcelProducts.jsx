import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../../styles/AdminLayout.css';

const ExcelProducts = () => {
  const navigate = useNavigate();
  const { uploadId } = useParams();
  const [products, setProducts] = useState([]);
  const [upload, setUpload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchProducts();
  }, [uploadId, currentPage, searchQuery, categoryFilter, statusFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...(searchQuery && { search: searchQuery }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      const response = await fetch(`http://localhost:5000/api/admin-excel/uploads/${uploadId}/products?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
        setUpload(data.upload);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalProducts(data.pagination?.totalProducts || data.products.length);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p._id)));
    }
  };

  const handleConvertProducts = async () => {
    if (selectedProducts.size === 0) {
      alert('Please select at least one product to convert');
      return;
    }

    if (!confirm(`Are you sure you want to convert ${selectedProducts.size} selected products to main products? They will appear on the website.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/admin-excel/uploads/${uploadId}/convert-products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productIds: Array.from(selectedProducts) })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Successfully converted ${result.convertedProducts.length} products to main products!`);
        setSelectedProducts(new Set());
        fetchProducts();
      } else {
        alert(`❌ Failed to convert products: ${result.message}`);
      }
    } catch (error) {
      console.error('Error converting products:', error);
      alert('❌ Failed to convert products');
    }
  };

  const formatPrice = (price) => `£${parseFloat(price || 0).toFixed(2)}`;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'listed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'active': return '#3b82f6';
      case 'inactive': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status, isConverted) => {
    if (isConverted) return '✅';
    switch (status) {
      case 'listed': return '🌐';
      case 'pending': return '⏳';
      case 'active': return '✅';
      case 'inactive': return '❌';
      default: return '❓';
    }
  };

  if (!upload && !loading) {
    return (
      <div className="admin-layout">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '20px' }}>❌</div>
          <h2>Excel Upload Not Found</h2>
          <button onClick={() => navigate('/admin/excel-manager')} style={{ marginTop: '20px', padding: '10px 20px' }}>
            ← Back to Excel Manager
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          padding: '20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          color: 'white'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold' }}>
              📊 {upload?.originalFileName || 'Excel Products'}
            </h1>
            <p style={{ margin: '8px 0 0 0', fontSize: '1rem', opacity: 0.9 }}>
              {totalProducts} products from Excel file
              {upload && (
                <span style={{ marginLeft: '10px', fontSize: '0.9rem' }}>
                  • Uploaded {formatDate(upload.uploadedAt)}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/excel-manager')}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            ← Back to Excel Manager
          </button>
        </div>

        {/* Filters and Actions */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="🔍 Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                minWidth: '200px'
              }}
            />
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem'
              }}
            >
              <option value="all">All Categories</option>
              {/* Categories will be populated dynamically */}
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem'
              }}
            >
              <option value="all">All Status</option>
              <option value="pending">⏳ Pending</option>
              <option value="listed">🌐 Listed</option>
              <option value="active">✅ Active</option>
              <option value="inactive">❌ Inactive</option>
            </select>

            {selectedProducts.size > 0 && (
              <button
                onClick={handleConvertProducts}
                style={{
                  padding: '8px 16px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                🌐 Convert to Main Products ({selectedProducts.size})
              </button>
            )}
          </div>
        </div>

        {/* Products Table */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ margin: 0, color: '#333' }}>
              📦 Products ({totalProducts} total, showing {products.length})
            </h2>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', color: '#666' }}>⏳ Loading products...</div>
            </div>
          ) : products.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', color: '#666', marginBottom: '10px' }}>📭</div>
              <div style={{ fontSize: '1.1rem', color: '#666' }}>No products found</div>
              <div style={{ fontSize: '0.9rem', color: '#999' }}>Try adjusting your search or filters</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === products.length && products.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Product</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>ASIN</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Category</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Price</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Rating</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Reviews</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Row</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product._id} style={{ 
                      borderBottom: '1px solid #f3f4f6',
                      background: product.isConverted ? '#f0fdf4' : 'white'
                    }}>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product._id)}
                          onChange={() => handleSelectProduct(product._id)}
                          disabled={product.isConverted}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                          {product.name}
                          {product.isConverted && (
                            <span style={{
                              marginLeft: '8px',
                              padding: '2px 6px',
                              background: '#10b981',
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '0.7rem'
                            }}>
                              LISTED
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                          Added: {formatDate(product.createdAt)}
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        {product.asin || '-'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          background: '#f3f4f6',
                          borderRadius: '4px',
                          fontSize: '0.8rem'
                        }}>
                          {product.category}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: '600' }}>
                        {formatPrice(product.price)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>⭐</span>
                          <span>{product.rating?.toFixed(1) || '4.0'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {product.reviews || 0}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          color: 'white',
                          background: getStatusColor(product.status)
                        }}>
                          <span>{getStatusIcon(product.status, product.isConverted)}</span>
                          <span>{product.isConverted ? 'Listed' : product.status}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.9rem', color: '#666' }}>
                        #{product.rowNumber}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => navigate(`/admin/excel-products/${uploadId}/edit/${product._id}`)}
                            style={{
                              padding: '6px 12px',
                              background: '#667eea',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            ✏️ Edit
                          </button>
                          {product.isConverted && product.mainProductId && (
                            <button
                              onClick={() => navigate(`/product/${product.mainProductId}`)}
                              style={{
                                padding: '6px 12px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              👁️ View Live
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && products.length > 0 && totalPages > 1 && (
            <div style={{
              padding: '20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>
                Page {currentPage} of {totalPages} ({totalProducts} total products)
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    background: currentPage === 1 ? '#f3f4f6' : '#667eea',
                    color: currentPage === 1 ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    background: currentPage === 1 ? '#f3f4f6' : '#667eea',
                    color: currentPage === 1 ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 12px',
                    background: currentPage === totalPages ? '#f3f4f6' : '#667eea',
                    color: currentPage === totalPages ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next →
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 12px',
                    background: currentPage === totalPages ? '#f3f4f6' : '#667eea',
                    color: currentPage === totalPages ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelProducts;