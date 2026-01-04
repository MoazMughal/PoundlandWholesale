import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/AdminLayout.css';

// Add some inline styles for better table interaction
const tableRowStyle = {
  transition: 'background-color 0.2s ease',
  cursor: 'pointer'
};

const tableRowHoverStyle = {
  backgroundColor: '#f8fafc'
};

const ExcelManager = () => {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false); // Start with false to show table structure immediately
  const [stats, setStats] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Image upload states
  const [imageUploads, setImageUploads] = useState([]);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);

  useEffect(() => {
    // Show table structure immediately, then load data
    if (initialLoad) {
      setInitialLoad(false);
    }
    setLoading(true);
    fetchUploads();
    fetchStats();
    fetchImageUploads();
  }, [currentPage]);

  const fetchUploads = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/admin-excel/uploads?page=${currentPage}&limit=20`, {
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

  const fetchImageUploads = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/admin-excel/image-uploads', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setImageUploads(data.uploads || []);
      }
    } catch (error) {
      console.error('Error fetching image uploads:', error);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedImageFile) {
      alert('Please select a ZIP file containing images');
      return;
    }

    if (!selectedImageFile.name.toLowerCase().endsWith('.zip')) {
      alert('Please select a ZIP file');
      return;
    }

    setImageUploadLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('imageZip', selectedImageFile);

      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/admin-excel/upload-images', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ Images uploaded successfully!\n\n📊 Summary:\n- Total images: ${result.summary.totalImages}\n- Valid images: ${result.summary.validImages}\n- Matched ASINs: ${result.summary.matchedAsins}\n- Errors: ${result.summary.errors}`);
        setSelectedImageFile(null);
        fetchImageUploads();
      } else {
        alert(`❌ Upload failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('❌ Failed to upload images');
    } finally {
      setImageUploadLoading(false);
    }
  };

  const handleDeleteImageUpload = async (uploadId, fileName) => {
    if (!confirm(`Are you sure you want to delete "${fileName}" and all its images? This cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/admin-excel/image-uploads/${uploadId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Successfully deleted "${fileName}" and ${result.deletedImages} images`);
        fetchImageUploads();
      } else {
        const error = await response.json();
        alert(`❌ Failed to delete: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting image upload:', error);
      alert('❌ Failed to delete image upload');
    }
  };

  const handleDebugImages = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/admin-excel/debug/images', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 Debug Images Result:', result);
        
        const debugInfo = result.debug;
        let message = `📊 Debug Info:\n\n`;
        message += `Total Uploads: ${debugInfo.totalUploads}\n`;
        message += `Total Images: ${debugInfo.images.length}\n\n`;
        
        if (debugInfo.images.length > 0) {
          message += `Sample Images:\n`;
          debugInfo.images.slice(0, 5).forEach((img, index) => {
            message += `${index + 1}. ASIN: ${img.asin}\n`;
            message += `   File: ${img.fileName}\n`;
            message += `   Exists: ${img.fileExists ? '✅' : '❌'}\n`;
            message += `   Matched: ${img.matched ? '✅' : '❌'}\n\n`;
          });
        }
        
        alert(message);
      } else {
        alert('❌ Failed to get debug info');
      }
    } catch (error) {
      console.error('Error getting debug info:', error);
      alert('❌ Error getting debug info');
    }
  };

  const handleFixImagePaths = async () => {
    if (!confirm('🔧 This will attempt to fix existing image file paths. This may take a few minutes. Continue?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/admin-excel/migrate/fix-image-paths', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Image path migration completed!\n\n📊 Results:\n- Fixed: ${result.fixedCount} images\n- Errors: ${result.errorCount} images\n\nPlease refresh the page to see the updated images.`);
        fetchImageUploads(); // Refresh the list
      } else {
        const error = await response.json();
        alert(`❌ Migration failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error running migration:', error);
      alert('❌ Failed to run migration');
    }
  };

  const handleAddImagesToConverted = async () => {
    if (!confirm('🖼️ This will add uploaded images to already converted products that are missing images. Continue?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/admin-excel/migrate/add-images-to-converted', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Image migration completed!\n\n📊 Results:\n- Products checked: ${result.totalChecked}\n- Images added: ${result.updatedCount}\n- Errors: ${result.errorCount}\n\nConverted products now have their uploaded images!`);
      } else {
        const error = await response.json();
        alert(`❌ Migration failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error running migration:', error);
      alert('❌ Failed to run migration');
    }
  };

  const handleSetConvertedAsAmazonsChoice = async () => {
    if (!confirm('🏆 This will set all converted Excel products as Amazon\'s Choice so they appear on the Amazon\'s Choice page. Continue?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/admin-excel/migrate/set-converted-as-amazons-choice', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Amazon's Choice migration completed!\n\n📊 Results:\n- Products checked: ${result.totalChecked}\n- Updated to Amazon's Choice: ${result.updatedCount}\n- Errors: ${result.errorCount}\n\nConverted products will now appear on the Amazon's Choice page!`);
      } else {
        const error = await response.json();
        alert(`❌ Migration failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Error running migration:', error);
      alert('❌ Failed to run migration');
    }
  };

  const handleFixProductCategories = async () => {
    if (!confirm('🔧 This will fix products with missing or invalid categories. Products without categories will be set to "uncategorized". Continue?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/admin-excel/fix-product-categories', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Category fix completed!\n\n📊 Results:\n- Products without categories: ${result.results.productsWithoutCategory}\n- Categories fixed: ${result.results.fixedCount}\n- Categories normalized: ${result.results.normalizedCount}\n- Total processed: ${result.results.totalProcessed}\n\nProducts now have valid categories!`);
        
        // Refresh stats to show updated data
        fetchStats();
      } else {
        const error = await response.json();
        alert(`❌ Failed to fix categories: ${error.message}`);
      }
    } catch (error) {
      console.error('Error fixing categories:', error);
      alert('❌ Failed to fix categories');
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
      <div style={{ padding: '12px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Compact Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #ee6940ff 0%, #db2525ff 100%)',
          borderRadius: '8px',
          color: 'white'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold' , color: 'white'}}>
              📊 Excel Manager
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', opacity: 0.9 , color: 'white' }}>
              Manage Excel uploads and products
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => navigate('/admin/products')}
              style={{
                background: 'rgba(255, 255, 255, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              ← Back to Products
            </button>
            <button
              onClick={() => navigate('/admin/excel-import')}
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
              📤 Upload
            </button>
            <button
              onClick={handleSyncExcelProducts}
              style={{
                background: 'rgba(255, 193, 7, 0.2)',
                border: '1px solid rgba(255, 193, 7, 0.4)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🔄 Sync
            </button>
          </div>
        </div>

        {/* Compact Statistics */}
        {stats && (
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{
              background: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: '140px'
            }}>
              <div style={{ fontSize: '1.2rem' }}>📊</div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>{stats.totalUploads}</div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Excel Files</div>
              </div>
            </div>
            <div style={{
              background: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: '140px'
            }}>
              <div style={{ fontSize: '1.2rem' }}>📦</div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>{stats.totalExcelProducts}</div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Total Products</div>
              </div>
            </div>
            <div style={{
              background: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: '140px'
            }}>
              <div style={{ fontSize: '1.2rem' }}>✅</div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>{stats.convertedProducts}</div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Listed</div>
              </div>
            </div>
            <div style={{
              background: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: '140px'
            }}>
              <div style={{ fontSize: '1.2rem' }}>⏳</div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>{stats.pendingProducts}</div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Pending</div>
              </div>
            </div>
          </div>
        )}

        {/* Image Upload Section */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '16px'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            background: '#f8fafc'
          }}>
            <h2 style={{ margin: 0, color: '#333', fontSize: '1.1rem', fontWeight: '600' }}>
              🖼️ Image Management
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#666' }}>
              Upload ZIP files containing product images named by ASIN
            </p>
          </div>

          <div style={{ padding: '16px' }}>
            {/* Upload Form */}
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap'
            }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setSelectedImageFile(e.target.files[0])}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '2px dashed #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                  Select a ZIP file containing images named by ASIN (e.g., B07ABC123.jpg)
                </div>
              </div>
              <button
                onClick={handleImageUpload}
                disabled={!selectedImageFile || imageUploadLoading}
                style={{
                  padding: '8px 16px',
                  background: (!selectedImageFile || imageUploadLoading) ? '#d1d5db' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: (!selectedImageFile || imageUploadLoading) ? 'not-allowed' : 'pointer',
                  minWidth: '120px'
                }}
              >
                {imageUploadLoading ? '⏳ Uploading...' : '📤 Upload Images'}
              </button>
              <button
                onClick={handleDebugImages}
                style={{
                  padding: '8px 16px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🔍 Debug Images
              </button>
              <button
                onClick={handleFixImagePaths}
                style={{
                  padding: '8px 16px',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🔧 Fix Image Paths
              </button>
              <button
                onClick={handleAddImagesToConverted}
                style={{
                  padding: '8px 16px',
                  background: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🖼️ Add Images to Listed
              </button>
              <button
                onClick={handleSetConvertedAsAmazonsChoice}
                style={{
                  padding: '8px 16px',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🏆 Set as Amazon's Choice
              </button>
              <button
                onClick={handleFixProductCategories}
                style={{
                  padding: '8px 16px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🔧 Fix Categories
              </button>
            </div>

            {/* Image Uploads Table */}
            {imageUploads.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.8rem' }}>ZIP File</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.8rem' }}>Images</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.8rem' }}>Matched ASINs</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.8rem' }}>Uploaded</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.8rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {imageUploads.map((upload) => (
                      <tr 
                        key={upload._id}
                        style={{ 
                          borderBottom: '1px solid #f3f4f6',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                            {upload.originalFileName}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#666' }}>
                            {formatFileSize(upload.fileSize)}
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                            {upload.summary?.totalImages || 0}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#666' }}>
                            {upload.summary?.validImages || 0} valid
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ fontWeight: '600', fontSize: '0.85rem', color: '#10b981' }}>
                            {upload.summary?.matchedAsins || 0}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#666' }}>
                            products matched
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#666' }}>
                          {formatDate(upload.uploadedAt)}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={() => navigate(`/admin/excel-manager/images/${upload._id}`)}
                              style={{
                                padding: '4px 8px',
                                background: '#667eea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: '500'
                              }}
                            >
                              👁️ View
                            </button>
                            <button
                              onClick={() => handleDeleteImageUpload(upload._id, upload.originalFileName)}
                              style={{
                                padding: '4px 8px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: '500'
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

            {imageUploads.length === 0 && (
              <div style={{ 
                padding: '20px', 
                textAlign: 'center', 
                background: '#f8fafc', 
                borderRadius: '6px',
                border: '1px dashed #d1d5db'
              }}>
                <div style={{ fontSize: '1rem', color: '#666', marginBottom: '8px' }}>📁</div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>No image uploads yet</div>
                <div style={{ fontSize: '0.8rem', color: '#999' }}>Upload a ZIP file to get started</div>
              </div>
            )}
          </div>
        </div>

        {/* Excel Uploads Table - Main Focus */}
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
              📁 Excel File Uploads ({uploads.length}) {loading && <span style={{ fontSize: '0.8rem', color: '#667eea' }}>⏳</span>}
            </h2>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              {loading ? '⏳ Loading...' : `${uploads.length} files`}
            </div>
          </div>

          {loading && uploads.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', color: '#666' }}>⏳ Loading uploads...</div>
            </div>
          ) : uploads.length === 0 && !loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', color: '#666', marginBottom: '10px' }}>📭</div>
              <div style={{ fontSize: '1.1rem', color: '#666' }}>No Excel files uploaded yet</div>
              <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: '16px' }}>Upload your first Excel file to get started</div>
              <button
                onClick={() => navigate('/admin/excel-import')}
                style={{
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                📤 Upload Excel File
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.8rem' }}>File Name</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.8rem' }}>Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.8rem' }}>Products</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.8rem' }}>Size</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.8rem' }}>Uploaded</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontWeight: '600', fontSize: '0.8rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map((upload) => (
                    <tr 
                      key={upload._id} 
                      style={{ 
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '2px', fontSize: '0.85rem' }}>
                          {upload.originalFileName}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#666' }}>
                          ID: {upload._id.slice(-8)}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          color: 'white',
                          background: getStatusColor(upload.status)
                        }}>
                          <span>{getStatusIcon(upload.status)}</span>
                          <span>{upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                          {upload.summary?.insertedProducts || 0} inserted
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#666' }}>
                          {upload.summary?.errors || 0} errors
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: '#666' }}>
                        {formatFileSize(upload.fileSize)}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: '#666' }}>
                        {formatDate(upload.uploadedAt)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => navigate(`/admin/excel-products/${upload._id}`)}
                            style={{
                              padding: '5px 10px',
                              background: '#667eea',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                          >
                            👁️ View
                          </button>
                          <button
                            onClick={() => handleDeleteUpload(upload._id, upload.originalFileName)}
                            style={{
                              padding: '5px 10px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              fontWeight: '500'
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

          {/* Compact Pagination */}
          {!loading && uploads.length > 0 && totalPages > 1 && (
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              background: '#f8fafc'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 10px',
                  background: currentPage === 1 ? '#f3f4f6' : '#667eea',
                  color: currentPage === 1 ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
              >
                ← Prev
              </button>
              <span style={{ padding: '6px 10px', fontSize: '0.8rem', color: '#666', fontWeight: '500' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '6px 10px',
                  background: currentPage === totalPages ? '#f3f4f6' : '#667eea',
                  color: currentPage === totalPages ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
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