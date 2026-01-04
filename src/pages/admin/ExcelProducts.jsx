import { useState, useEffect, useRef } from 'react';
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
  const [pageSize, setPageSize] = useState(50); // Default to 50 products per page
  const [editingCell, setEditingCell] = useState(null); // { productId, field }
  const [editingValue, setEditingValue] = useState('');
  const [savedCell, setSavedCell] = useState(null); // { productId, field } for showing save feedback
  const [availableCategories, setAvailableCategories] = useState([]);

  useEffect(() => {
    // Debounce the search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, searchQuery ? 500 : 0); // 500ms delay for search, immediate for other changes

    return () => clearTimeout(timeoutId);
  }, [uploadId, currentPage, searchQuery, categoryFilter, statusFilter, pageSize]);

  useEffect(() => {
    fetchAvailableCategories();
  }, [uploadId]);

  const fetchAvailableCategories = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/admin-excel/uploads/${uploadId}/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: currentPage,
        limit: pageSize,
        ...(searchQuery && { search: searchQuery }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      console.log('🔍 Fetching products with params:', {
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        category: categoryFilter,
        status: statusFilter
      });

      const response = await fetch(`http://localhost:5000/api/admin-excel/uploads/${uploadId}/products?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Received products:', data.products.length, 'Total:', data.pagination?.totalProducts);
        setProducts(data.products);
        setUpload(data.upload);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalProducts(data.pagination?.totalProducts || data.products.length);
      } else {
        console.error('❌ Failed to fetch products:', response.status, response.statusText);
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

  const handleSyncStatus = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/admin-excel/uploads/${uploadId}/sync-status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Status sync completed!\n\n📊 Synced: ${result.syncedCount} products\n🔧 Fixed: ${result.fixedCount} products\n📦 Total processed: ${result.totalProcessed}`);
        fetchProducts(); // Refresh the list
      } else {
        alert(`❌ Failed to sync status: ${result.message}`);
      }
    } catch (error) {
      console.error('Error syncing status:', error);
      alert('❌ Failed to sync status');
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

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const startEditing = (productId, field, currentValue) => {
    setEditingCell({ productId, field });
    setEditingValue(currentValue || '');
  };

  const handleBlur = (productId, field, originalValue) => {
    // Only save if the value has actually changed
    if (editingValue !== originalValue && editingValue.toString().trim() !== originalValue.toString().trim()) {
      saveEdit(productId, field, editingValue);
    } else {
      cancelEditing();
    }
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const saveEdit = async (productId, field, value) => {
    try {
      const token = localStorage.getItem('adminToken');
      
      // Validate the value based on field type
      let validatedValue = value;
      if (field === 'price') {
        validatedValue = parseFloat(value) || 0;
        if (validatedValue < 0) {
          alert('❌ Price cannot be negative');
          return;
        }
      } else if (field === 'rating') {
        validatedValue = parseFloat(value) || 0;
        if (validatedValue < 0 || validatedValue > 5) {
          alert('❌ Rating must be between 0 and 5');
          return;
        }
      } else if (field === 'reviews') {
        validatedValue = parseInt(value) || 0;
        if (validatedValue < 0) {
          alert('❌ Reviews cannot be negative');
          return;
        }
      } else if (field === 'asin') {
        validatedValue = value.trim().toUpperCase();
        if (validatedValue && !/^[A-Z0-9]{10}$/.test(validatedValue)) {
          alert('❌ ASIN must be exactly 10 alphanumeric characters');
          return;
        }
      }

      const response = await fetch(`http://localhost:5000/api/admin-excel/uploads/${uploadId}/products/${productId}/update-field`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ field, value: validatedValue })
      });

      if (response.ok) {
        // Update the local state
        setProducts(prevProducts => 
          prevProducts.map(product => 
            product._id === productId 
              ? { ...product, [field]: validatedValue }
              : product
          )
        );
        
        // Show save feedback
        setSavedCell({ productId, field });
        setTimeout(() => setSavedCell(null), 2000);
        
        cancelEditing();
      } else {
        const error = await response.json();
        alert(`❌ Failed to update: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating field:', error);
      alert('❌ Failed to update field');
    }
  };

  const handleKeyPress = (e, productId, field) => {
    if (e.key === 'Enter') {
      saveEdit(productId, field, editingValue);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const EditableCell = ({ product, field, value, type = 'text', style = {} }) => {
    const isEditing = editingCell?.productId === product._id && editingCell?.field === field;
    const isSaved = savedCell?.productId === product._id && savedCell?.field === field;
    const inputRef = useRef(null);
    
    // Select text when input becomes active
    useEffect(() => {
      if (isEditing && inputRef.current) {
        // Small delay to ensure input is fully rendered
        const timer = setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.select();
          }
        }, 10);
        return () => clearTimeout(timer);
      }
    }, [isEditing]);
    
    if (isEditing) {
      return (
        <input
          ref={inputRef}
          type={type}
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onKeyDown={(e) => handleKeyPress(e, product._id, field)}
          onBlur={() => handleBlur(product._id, field, value)}
          autoFocus
          style={{
            width: '100%',
            padding: '3px 6px',
            border: '2px solid #3b82f6',
            borderRadius: '3px',
            fontSize: '0.75rem',
            outline: 'none',
            ...style
          }}
        />
      );
    }

    // Format display value based on field type
    let displayValue = value;
    if (field === 'price') {
      displayValue = formatPrice(value);
    } else if (field === 'asin' && !value) {
      displayValue = '-';
    }

    return (
      <div
        onClick={() => startEditing(product._id, field, value)}
        style={{
          cursor: 'pointer',
          padding: '3px 6px',
          borderRadius: '3px',
          minHeight: '16px',
          transition: 'all 0.15s ease',
          border: isSaved ? '1px solid #10b981' : '1px solid transparent',
          backgroundColor: isSaved ? '#f0fdf4' : 'transparent',
          position: 'relative',
          fontSize: '0.75rem',
          ...style
        }}
        onMouseEnter={(e) => {
          if (!isSaved) {
            e.target.style.backgroundColor = '#f8fafc';
            e.target.style.borderColor = '#e2e8f0';
            e.target.style.transform = 'scale(1.02)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSaved) {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.borderColor = 'transparent';
            e.target.style.transform = 'scale(1)';
          }
        }}
        title={`Click to edit ${field} • Enter to save • Escape to cancel`}
      >
        {displayValue}
        {isSaved ? (
          <span style={{
            position: 'absolute',
            top: '-1px',
            right: '-1px',
            fontSize: '0.5rem',
            color: '#10b981',
            pointerEvents: 'none'
          }}>
            ✅
          </span>
        ) : (
          <span style={{
            position: 'absolute',
            top: '-1px',
            right: '-1px',
            fontSize: '0.5rem',
            opacity: 0.4,
            pointerEvents: 'none'
          }}>
            ✏️
          </span>
        )}
      </div>
    );
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
      <div style={{ padding: '12px', maxWidth: '1600px', margin: '0 auto' }}>
        {/* Compact Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #d18344ff 0%, #d83722ff 100%)',
          borderRadius: '8px',
          color: 'white'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold' }}>
              📊 {upload?.originalFileName || 'Excel Products'}
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
              {totalProducts} products • Uploaded {upload ? formatDate(upload.uploadedAt) : ''}
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', opacity: 0.8 }}>
              💡 Click cells to edit inline • Enter to save • Escape to cancel
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/excel-manager')}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            ← Back
          </button>
        </div>

        {/* Compact Filters and Actions */}
        <div style={{
          background: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="🔍 Search products..."
              value={searchQuery}
              onChange={(e) => {
                console.log('Search query changed to:', e.target.value);
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page when search changes
              }}
              style={{
                padding: '6px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.8rem',
                minWidth: '280px'
              }}
            />
            
            <select
              value={categoryFilter}
              onChange={(e) => {
                console.log('Category filter changed to:', e.target.value);
                setCategoryFilter(e.target.value);
                setCurrentPage(1); // Reset to first page when filter changes
              }}
              style={{
                padding: '6px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.8rem'
              }}
            >
              <option value="all">All Categories</option>
              {availableCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => {
                console.log('Status filter changed to:', e.target.value);
                setStatusFilter(e.target.value);
                setCurrentPage(1); // Reset to first page when filter changes
              }}
              style={{
                padding: '6px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.8rem'
              }}
            >
              <option value="all">All Status</option>
              <option value="pending">⏳ Pending</option>
              <option value="listed">🌐 Listed</option>
              <option value="active">✅ Active</option>
              <option value="inactive">❌ Inactive</option>
            </select>

            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
              style={{
                padding: '6px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.8rem'
              }}
            >
              <option value={20}>20/page</option>
              <option value={50}>50/page</option>
              <option value={100}>100/page</option>
            </select>

            {selectedProducts.size > 0 && (
              <button
                onClick={handleConvertProducts}
                style={{
                  padding: '6px 12px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                🌐 Convert ({selectedProducts.size})
              </button>
            )}

            <button
              onClick={handleSyncStatus}
              style={{
                padding: '6px 12px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
              title="Sync status with main products"
            >
              🔄 Sync Status
            </button>
          </div>
        </div>

        {/* Products Table - Main Focus */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          flex: 1
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc'
          }}>
            <h2 style={{ margin: 0, color: '#333', fontSize: '1.1rem', fontWeight: '600' }}>
              📦 Products ({totalProducts} total, showing {products.length}) {loading && <span style={{ fontSize: '0.8rem', color: '#667eea' }}>⏳</span>}
            </h2>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              {selectedProducts.size > 0 && `${selectedProducts.size} selected`}
            </div>
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
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === products.length && products.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>Product</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>ASIN</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>Image</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>Category</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>Price</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>Rating</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>Reviews</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>Row</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr 
                      key={product._id} 
                      style={{ 
                        borderBottom: '1px solid #f3f4f6',
                        background: product.isConverted ? '#f0fdf4' : 'white',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!product.isConverted) {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!product.isConverted) {
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      <td style={{ padding: '8px 10px' }}>
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product._id)}
                          onChange={() => handleSelectProduct(product._id)}
                          disabled={product.isConverted}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '2px', fontSize: '0.8rem' }}>
                          {product.name}
                          {product.isConverted && (
                            <span style={{
                              marginLeft: '6px',
                              padding: '1px 4px',
                              background: '#10b981',
                              color: 'white',
                              borderRadius: '3px',
                              fontSize: '0.6rem'
                            }}>
                              LISTED
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#666' }}>
                          Added: {formatDate(product.createdAt)}
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        <EditableCell 
                          key={`${product._id}-asin`}
                          product={product} 
                          field="asin" 
                          value={product.asin} 
                          style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {product.asin ? (
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '4px',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f8fafc'
                          }}>
                            <img
                              src={`http://localhost:5000/api/admin-excel/public/images/by-asin/${product.asin}`}
                              alt={product.asin}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                              onLoad={(e) => {
                                // Image loaded successfully
                                e.target.style.display = 'block';
                                if (e.target.nextSibling) {
                                  e.target.nextSibling.style.display = 'none';
                                }
                              }}
                              onError={(e) => {
                                // Image failed to load
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) {
                                  e.target.nextSibling.style.display = 'flex';
                                }
                              }}
                            />
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '100%',
                              height: '100%',
                              fontSize: '0.6rem',
                              color: '#9ca3af',
                              flexDirection: 'column'
                            }}>
                              <div>📷</div>
                              <div style={{ fontSize: '0.5rem', marginTop: '2px' }}>No Image</div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            border: '1px dashed #d1d5db', 
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f9fafb',
                            fontSize: '0.6rem',
                            color: '#9ca3af',
                            flexDirection: 'column'
                          }}>
                            <div>❌</div>
                            <div style={{ fontSize: '0.5rem', marginTop: '2px' }}>No ASIN</div>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <EditableCell 
                          key={`${product._id}-category`}
                          product={product} 
                          field="category" 
                          value={product.category}
                          style={{
                            padding: '3px 6px',
                            background: '#f3f4f6',
                            borderRadius: '3px',
                            fontSize: '0.7rem'
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: '600' }}>
                        <EditableCell 
                          key={`${product._id}-price`}
                          product={product} 
                          field="price" 
                          value={product.price}
                          type="number"
                          style={{ fontWeight: '600', fontSize: '0.8rem' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ fontSize: '0.7rem' }}>⭐</span>
                          <EditableCell 
                            key={`${product._id}-rating`}
                            product={product} 
                            field="rating" 
                            value={product.rating?.toFixed(1) || '4.0'}
                            type="number"
                            style={{ width: '50px', fontSize: '0.75rem' }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <EditableCell 
                          key={`${product._id}-reviews`}
                          product={product} 
                          field="reviews" 
                          value={product.reviews || 0}
                          type="number"
                          style={{ fontSize: '0.75rem' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          color: 'white',
                          background: getStatusColor(product.status)
                        }}>
                          <span>{getStatusIcon(product.status, product.isConverted)}</span>
                          <span>{product.isConverted ? 'Listed' : product.status}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: '0.75rem', color: '#666' }}>
                        #{product.rowNumber}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => navigate(`/admin/excel-products/${uploadId}/edit/${product._id}`)}
                            style={{
                              padding: '4px 8px',
                              background: '#667eea',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                          >
                            ✏️ Edit
                          </button>
                          {product.isConverted && product.mainProductId && (
                            <button
                              onClick={() => navigate(`/product/${product.mainProductId}`)}
                              style={{
                                padding: '4px 8px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                fontWeight: '500'
                              }}
                            >
                              👁️ View
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

          {/* Enhanced Pagination with Page Numbers */}
          {!loading && products.length > 0 && totalPages > 1 && (
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#666', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span>Page {currentPage} of {totalPages} ({totalProducts} total)</span>
                
                {/* Quick Jump Input */}
                {totalPages > 10 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '0.7rem' }}>Go to:</span>
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      placeholder={currentPage}
                      style={{
                        width: '50px',
                        padding: '3px 5px',
                        border: '1px solid #d1d5db',
                        borderRadius: '3px',
                        fontSize: '0.7rem',
                        textAlign: 'center'
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const page = parseInt(e.target.value);
                          if (page >= 1 && page <= totalPages) {
                            setCurrentPage(page);
                            e.target.value = '';
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const page = parseInt(e.target.value);
                        if (page >= 1 && page <= totalPages) {
                          setCurrentPage(page);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* First and Previous buttons */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '5px 8px',
                    background: currentPage === 1 ? '#f3f4f6' : '#667eea',
                    color: currentPage === 1 ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '0.7rem',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '5px 8px',
                    background: currentPage === 1 ? '#f3f4f6' : '#667eea',
                    color: currentPage === 1 ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '0.7rem',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  ←
                </button>

                {/* Page Numbers */}
                {(() => {
                  const pageNumbers = [];
                  const maxVisiblePages = 7; // Show up to 7 page numbers
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                  
                  // Adjust start page if we're near the end
                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }

                  // Add first page and ellipsis if needed
                  if (startPage > 1) {
                    pageNumbers.push(
                      <button
                        key={1}
                        onClick={() => setCurrentPage(1)}
                        style={{
                          padding: '5px 8px',
                          background: 1 === currentPage ? '#667eea' : 'white',
                          color: 1 === currentPage ? 'white' : '#667eea',
                          border: '1px solid #667eea',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: 1 === currentPage ? 'bold' : '500',
                          minWidth: '28px'
                        }}
                      >
                        1
                      </button>
                    );
                    
                    if (startPage > 2) {
                      pageNumbers.push(
                        <span key="ellipsis1" style={{ 
                          padding: '5px 4px', 
                          fontSize: '0.7rem', 
                          color: '#9ca3af' 
                        }}>
                          ...
                        </span>
                      );
                    }
                  }

                  // Add visible page numbers
                  for (let i = startPage; i <= endPage; i++) {
                    pageNumbers.push(
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        style={{
                          padding: '5px 8px',
                          background: i === currentPage ? '#667eea' : 'white',
                          color: i === currentPage ? 'white' : '#667eea',
                          border: '1px solid #667eea',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: i === currentPage ? 'bold' : '500',
                          minWidth: '28px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (i !== currentPage) {
                            e.target.style.background = '#f0f4ff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (i !== currentPage) {
                            e.target.style.background = 'white';
                          }
                        }}
                      >
                        {i}
                      </button>
                    );
                  }

                  // Add ellipsis and last page if needed
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pageNumbers.push(
                        <span key="ellipsis2" style={{ 
                          padding: '5px 4px', 
                          fontSize: '0.7rem', 
                          color: '#9ca3af' 
                        }}>
                          ...
                        </span>
                      );
                    }
                    
                    pageNumbers.push(
                      <button
                        key={totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        style={{
                          padding: '5px 8px',
                          background: totalPages === currentPage ? '#667eea' : 'white',
                          color: totalPages === currentPage ? 'white' : '#667eea',
                          border: '1px solid #667eea',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: totalPages === currentPage ? 'bold' : '500',
                          minWidth: '28px'
                        }}
                      >
                        {totalPages}
                      </button>
                    );
                  }

                  return pageNumbers;
                })()}

                {/* Next and Last buttons */}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '5px 8px',
                    background: currentPage === totalPages ? '#f3f4f6' : '#667eea',
                    color: currentPage === totalPages ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '0.7rem',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  →
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '5px 8px',
                    background: currentPage === totalPages ? '#f3f4f6' : '#667eea',
                    color: currentPage === totalPages ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '0.7rem',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
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