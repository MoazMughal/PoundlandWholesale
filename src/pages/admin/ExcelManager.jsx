import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/AdminLayout.css';

const ExcelManager = () => {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchUploads();
    fetchStats();
  }, [currentPage]);

  const fetchUploads = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/admin-excel/uploads?page=${currentPage}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUploads(data.uploads);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error fetching uploads:', error);
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

  const handleDeleteUpload = async (uploadId, fileName) => {
    if (!confirm(`Are you sure you want to delete "${fileName}" and all its products? This cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/admin-excel/uploads/${uploadId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Successfully deleted "${fileName}" and ${result.deletedProducts} products`);
        fetchUploads();
        fetchStats();
      } else {
        const error = await response.json();
        alert(`❌ Failed to delete: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting upload:', error);
      alert('❌ Failed to delete upload');
    }
  };

  const handleSyncExcelProducts = async () => {
    if (!confirm('🔄 This will sync Excel products with main products and fix any inconsistencies. Continue?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/admin-excel/sync-excel-products', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Sync completed successfully!\n\n📊 Summary:\n- Total checked: ${result.summary.totalChecked}\n- Valid products: ${result.summary.validProducts}\n- Orphaned products fixed: ${result.summary.orphanedProductsFixed}\n- Errors: ${result.summary.errors}`);
        fetchUploads();
        fetchStats();
      } else {
        const error = await response.json();
        alert(`❌ Sync failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error syncing Excel products:', error);
      alert('❌ Failed to sync Excel products');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
      case 'completed': return '#10b981';
      case 'processing': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '⏳';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

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
              📊 Excel Upload Manager
            </h1>
            <p style={{ margin: '8px 0 0 0', fontSize: '1rem', opacity: 0.9 }}>
              Manage Excel file uploads and their products
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => navigate('/admin/excel-import')}
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
              📤 Upload New File
            </button>
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
              📦 All Products
            </button>
            <button
              onClick={handleSyncExcelProducts}
              style={{
                background: 'rgba(255, 193, 7, 0.2)',
                border: '2px solid rgba(255, 193, 7, 0.4)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              🔄 Sync Products
            </button>
          </div>
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
              <div style={{ fontSize: '2rem', color: '#667eea', marginBottom: '8px' }}>📊</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>{stats.totalUploads}</div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Excel Files</div>
            </div>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', color: '#10b981', marginBottom: '8px' }}>📦</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>{stats.totalExcelProducts}</div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Total Products</div>
            </div>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', color: '#f59e0b', marginBottom: '8px' }}>✅</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>{stats.convertedProducts}</div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Listed Products</div>
            </div>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', color: '#ef4444', marginBottom: '8px' }}>⏳</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>{stats.pendingProducts}</div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Pending Products</div>
            </div>
          </div>
        )}

        {/* Excel Uploads Table */}
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
            <h2 style={{ margin: 0, color: '#333' }}>📁 Excel File Uploads</h2>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', color: '#666' }}>⏳ Loading uploads...</div>
            </div>
          ) : uploads.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', color: '#666', marginBottom: '10px' }}>📭</div>
              <div style={{ fontSize: '1.1rem', color: '#666' }}>No Excel files uploaded yet</div>
              <div style={{ fontSize: '0.9rem', color: '#999' }}>Upload your first Excel file to get started</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>File Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Products</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Size</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Uploaded</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((upload) => (
                    <tr key={upload._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                          {upload.originalFileName}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                          ID: {upload._id.slice(-8)}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          color: 'white',
                          background: getStatusColor(upload.status)
                        }}>
                          <span>{getStatusIcon(upload.status)}</span>
                          <span>{upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600' }}>
                          {upload.summary?.insertedProducts || 0} inserted
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                          {upload.summary?.errors || 0} errors
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.9rem' }}>
                        {formatFileSize(upload.fileSize)}
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.9rem' }}>
                        {formatDate(upload.uploadedAt)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => navigate(`/admin/excel-products/${upload._id}`)}
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
                            👁️ View Products
                          </button>
                          <button
                            onClick={() => handleDeleteUpload(upload._id, upload.originalFileName)}
                            style={{
                              padding: '6px 12px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && uploads.length > 0 && totalPages > 1 && (
            <div style={{
              padding: '20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'center',
              gap: '8px'
            }}>
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
              <span style={{ padding: '8px 12px', fontSize: '0.9rem', color: '#666' }}>
                Page {currentPage} of {totalPages}
              </span>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelManager;