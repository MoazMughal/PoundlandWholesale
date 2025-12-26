import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/AdminLayout.css';

const ExcelImport = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchPendingProducts();
    fetchStats();
  }, [currentPage, searchQuery, categoryFilter]);

  const fetchPendingProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...(searchQuery && { search: searchQuery }),
        ...(categoryFilter !== 'all' && { category: categoryFilter })
      });

      const response = await fetch(`http://localhost:5000/api/admin-excel/pending-products?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingProducts(data.products);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalProducts(data.pagination?.totalProducts || data.products.length);
      }
    } catch (error) {
      console.error('Error fetching pending products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/admin-excel/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (validTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setUploadResult(null);
      } else {
        alert('Please select a valid Excel file (.xlsx, .xls) or CSV file');
        e.target.value = '';
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      const token = localStorage.getItem('adminToken');
      const formData = new FormData();
      formData.append('excelFile', file);
      formData.append('updateExisting', updateExisting);

      // Show file size info for large files
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);

      const response = await fetch('http://localhost:5000/api/admin-excel/upload-test', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response. Please check server logs.');
      }

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `Server error: ${response.status}`);
      }
      
      setUploadResult(result);

      if (result.success) {
        setFile(null);
        document.getElementById('fileInput').value = '';
        fetchPendingProducts();
        fetchStats();
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        message: error.message || 'Upload failed: Unknown error',
        error: error.name || 'UPLOAD_ERROR'
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
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
    if (selectedProducts.size === pendingProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(pendingProducts.map(p => p._id)));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedProducts.size === 0) {
      alert('Please select at least one product');
      return;
    }

    const actionText = action === 'list' ? 'list' : action === 'unlist' ? 'unlist' : 'delete';
    const confirmText = action === 'delete' 
      ? `Are you sure you want to delete ${selectedProducts.size} selected products? This cannot be undone.`
      : `Are you sure you want to ${actionText} ${selectedProducts.size} selected products?`;

    if (!confirm(confirmText)) return;

    try {
      const token = localStorage.getItem('adminToken');
      const endpoint = action === 'delete' 
        ? 'http://localhost:5000/api/admin-excel/products'
        : 'http://localhost:5000/api/admin-excel/toggle-listing';

      const method = action === 'delete' ? 'DELETE' : 'POST';
      const body = action === 'delete'
        ? { productIds: Array.from(selectedProducts) }
        : { productIds: Array.from(selectedProducts), action };

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Successfully ${actionText}ed ${result.modifiedCount || result.deletedCount} products`);
        setSelectedProducts(new Set());
        fetchPendingProducts();
        fetchStats();
      } else {
        alert(`❌ Failed to ${actionText} products: ${result.message}`);
      }
    } catch (error) {
      console.error(`Error ${actionText}ing products:`, error);
      alert(`❌ Failed to ${actionText} products`);
    }
  };

  const formatPrice = (price) => `£${parseFloat(price || 0).toFixed(2)}`;

  return (
    <div className="admin-layout">
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
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
              📊 Excel Product Upload
            </h1>
            <p style={{ margin: '8px 0 0 0', fontSize: '1rem', opacity: 0.9 }}>
              Upload and manage products from Excel files
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/products')}
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
            📦 Back to Products
          </button>
        </div>

        {/* Statistics */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', color: '#667eea', marginBottom: '8px' }}>📦</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>{stats.total}</div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Total Products</div>
            </div>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', color: '#10b981', marginBottom: '8px' }}>✅</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>{stats.listed}</div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Listed Products</div>
            </div>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', color: '#f59e0b', marginBottom: '8px' }}>⏳</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>{stats.pending}</div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Pending Products</div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div style={{
          background: 'white',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#333' }}>📤 Upload Excel File</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              padding: '15px',
              background: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: '#0c4a6e'
            }}>
              <strong>📋 Excel Format Requirements:</strong>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                <li><strong>Title/Name:</strong> Product title (required)</li>
                <li><strong>ASIN:</strong> 10-character Amazon product code (optional)</li>
                <li><strong>Category:</strong> Product category</li>
                <li><strong>Price:</strong> Product price in GBP (required)</li>
                <li><strong>Reviews:</strong> Number of reviews</li>
                <li><strong>Deal Units:</strong> Number of units in deal</li>
                <li><strong>Rating:</strong> Product rating (0-5)</li>
              </ul>
              <small>
                <strong>File Requirements:</strong> Maximum file size: 1GB. 
                Column names are flexible - the system will automatically detect variations.
              </small>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'end', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                Select Excel File
              </label>
              <input
                id="fileInput"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
              {file && (
                <div style={{ 
                  marginTop: '8px', 
                  fontSize: '0.9rem', 
                  color: '#666',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>📄 {file.name}</span>
                  <span>📊 {(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                />
                Update existing products
              </label>
            </div>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              style={{
                padding: '12px 24px',
                background: file && !uploading ? '#10b981' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: file && !uploading ? 'pointer' : 'not-allowed',
                minWidth: '140px'
              }}
            >
              {uploading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⏳</span>
                  <span>Processing...</span>
                </div>
              ) : '📤 Upload'}
            </button>
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <div style={{
              padding: '15px',
              borderRadius: '8px',
              background: uploadResult.success ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${uploadResult.success ? '#10b981' : '#ef4444'}`,
              color: uploadResult.success ? '#065f46' : '#991b1b'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '10px' }}>
                {uploadResult.success ? '✅ Upload Successful' : '❌ Upload Failed'}
              </div>
              <div style={{ marginBottom: '10px' }}>{uploadResult.message}</div>
              
              {uploadResult.summary && (
                <div style={{ fontSize: '0.9rem' }}>
                  <div>📊 <strong>Summary:</strong></div>
                  <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    <li>Total rows processed: {uploadResult.summary.totalRows}</li>
                    <li>Valid products: {uploadResult.summary.processedProducts}</li>
                    <li>Products inserted: {uploadResult.summary.insertedProducts}</li>
                    <li>Products updated: {uploadResult.summary.updatedProducts}</li>
                    <li>Errors: {uploadResult.summary.errors}</li>
                    <li>Categories: {uploadResult.summary.categories?.join(', ')}</li>
                  </ul>
                </div>
              )}
              
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <details style={{ marginTop: '10px' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: '600' }}>
                    View Errors ({uploadResult.errors.length})
                  </summary>
                  <div style={{ 
                    marginTop: '10px', 
                    maxHeight: '200px', 
                    overflowY: 'auto',
                    background: 'rgba(0,0,0,0.05)',
                    padding: '10px',
                    borderRadius: '4px'
                  }}>
                    {uploadResult.errors.map((error, index) => (
                      <div key={index} style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
                        {error}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Pending Products Section */}
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
              ⏳ Pending Products ({totalProducts} total, showing {pendingProducts.length})
            </h2>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="🔍 Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.9rem'
                }}
              />
              
              {selectedProducts.size > 0 && (
                <>
                  <button
                    onClick={() => handleBulkAction('list')}
                    style={{
                      padding: '8px 16px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      cursor: 'pointer'
                    }}
                  >
                    ✅ List ({selectedProducts.size})
                  </button>
                  <button
                    onClick={() => handleBulkAction('delete')}
                    style={{
                      padding: '8px 16px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ Delete ({selectedProducts.size})
                  </button>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', color: '#666' }}>⏳ Loading products...</div>
            </div>
          ) : pendingProducts.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', color: '#666', marginBottom: '10px' }}>📭</div>
              <div style={{ fontSize: '1.1rem', color: '#666' }}>No pending products</div>
              <div style={{ fontSize: '0.9rem', color: '#999' }}>Upload an Excel file to get started</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === pendingProducts.length && pendingProducts.length > 0}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Product</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>ASIN</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Category</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Price</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Rating</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Reviews</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingProducts.map((product) => (
                    <tr key={product._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product._id)}
                          onChange={() => handleSelectProduct(product._id)}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>{product.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                          Added: {new Date(product.createdAt).toLocaleDateString()}
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
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleBulkAction('list')}
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
                            ✅ List
                          </button>
                          <button
                            onClick={() => navigate(`/admin/products/edit/${product._id}`)}
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination Controls */}
          {!loading && pendingProducts.length > 0 && totalPages > 1 && (
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

export default ExcelImport;
