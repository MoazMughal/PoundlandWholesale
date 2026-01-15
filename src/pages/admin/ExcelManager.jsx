import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../utils/api';
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
  
  // Cloudinary states
  const [showCloudinaryModal, setShowCloudinaryModal] = useState(false);
  const [cloudinaryImages, setCloudinaryImages] = useState([]);
  const [cloudinaryLoading, setCloudinaryLoading] = useState(false);
  const [cloudinarySearch, setCloudinarySearch] = useState('');

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
      const response = await fetch(getApiUrl(`admin-excel/uploads?page=${currentPage}&limit=20`), {
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
      const response = await fetch(getApiUrl('admin-excel/stats'), {
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
      const response = await fetch(getApiUrl('admin-excel/image-uploads'), {
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
      const response = await fetch(getApiUrl('admin-excel/upload-images'), {
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
      const response = await fetch(getApiUrl(`admin-excel/image-uploads/${uploadId}`), {
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
      const response = await fetch(getApiUrl('admin-excel/debug/images'), {
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
      const response = await fetch(getApiUrl('admin-excel/migrate/fix-image-paths'), {
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
      const response = await fetch(getApiUrl('admin-excel/migrate/add-images-to-converted'), {
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
      const response = await fetch(getApiUrl('admin-excel/migrate/set-converted-as-amazons-choice'), {
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

  const handleFixAmazonsChoiceCategories = async () => {
    if (!confirm('🔧 This will fix Amazon\'s Choice status for products in problematic categories (DIY & tools, Home & Kitchen, Toys and Games). Continue?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl('admin-excel/fix-amazons-choice-categories'), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        let message = `✅ Amazon's Choice categories fix completed!\n\n📊 Results:\n- Total products updated: ${result.results.totalUpdated}\n- Categories processed: ${result.results.categoriesProcessed}\n\n`;
        
        if (result.results.categoryResults.length > 0) {
          message += `Updated categories:\n`;
          result.results.categoryResults.forEach(cat => {
            message += `- ${cat.category}: ${cat.updated} products\n`;
          });
        }
        
        if (result.results.verification.specificCounts) {
          message += `\nVerification - Amazon's Choice products:\n`;
          Object.entries(result.results.verification.specificCounts).forEach(([cat, count]) => {
            message += `- ${cat}: ${count} products\n`;
          });
        }
        
        alert(message);
        fetchStats(); // Refresh stats
      } else {
        const error = await response.json();
        alert(`❌ Failed to fix categories: ${error.message}`);
      }
    } catch (error) {
      console.error('Error fixing Amazon\'s Choice categories:', error);
      alert('❌ Failed to fix Amazon\'s Choice categories');
    }
  };

  const handleFixProductCategories = async () => {
    if (!confirm('🔧 This will fix products with missing or invalid categories. Products without categories will be set to "uncategorized". Continue?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl('admin-excel/fix-product-categories'), {
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

  const fetchCloudinaryImages = async () => {
    setCloudinaryLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      // Remove maxResults to fetch ALL images
      const response = await fetch(getApiUrl('admin-excel/cloudinary-images?folder=products'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Loaded ${data.images?.length || 0} Cloudinary images`);
        setCloudinaryImages(data.images || []);
      } else {
        const error = await response.json();
        alert(`❌ Failed to fetch Cloudinary images: ${error.message}`);
      }
    } catch (error) {
      console.error('Error fetching Cloudinary images:', error);
      alert('❌ Failed to fetch Cloudinary images');
    } finally {
      setCloudinaryLoading(false);
    }
  };

  const handleShowCloudinaryImages = () => {
    setShowCloudinaryModal(true);
    fetchCloudinaryImages();
  };

  const filteredCloudinaryImages = cloudinaryImages.filter(img => {
    const searchLower = cloudinarySearch.toLowerCase();
    // Search by name (filename) or ASIN
    return img.name.toLowerCase().includes(searchLower) || 
           (img.asin && img.asin.toLowerCase().includes(searchLower));
  });

  const handleDeleteUpload = async (uploadId, fileName) => {
    if (!confirm(`Are you sure you want to delete "${fileName}" and all its products? This cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl(`admin-excel/uploads/${uploadId}`), {
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
      const response = await fetch(getApiUrl('admin-excel/sync-excel-products'), {
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
    <>
      <style>{`
        /* Responsive Styles for Excel Manager */
        @media (max-width: 768px) {
          .admin-layout {
            padding: 0 !important;
          }
          
          /* Header responsive */
          .excel-manager-header {
            flex-direction: column !important;
            gap: 10px !important;
            padding: 10px !important;
          }
          
          .excel-manager-header > div:last-child {
            width: 100% !important;
            flex-direction: column !important;
          }
          
          .excel-manager-header button {
            width: 100% !important;
            padding: 8px 12px !important;
            font-size: 0.8rem !important;
          }
          
          /* Stats cards responsive */
          .stats-container {
            flex-direction: column !important;
            gap: 8px !important;
          }
          
          .stats-container > div {
            width: 100% !important;
            min-width: auto !important;
          }
          
          /* Image upload section */
          .image-upload-form {
            flex-direction: column !important;
          }
          
          .image-upload-form > div,
          .image-upload-form button {
            width: 100% !important;
            min-width: auto !important;
          }
          
          /* Tables responsive - hide on mobile, show cards */
          .excel-table {
            display: none !important;
          }
          
          .mobile-excel-cards {
            display: block !important;
          }
          
          /* Image uploads table */
          .image-uploads-table {
            font-size: 0.7rem !important;
          }
          
          .image-uploads-table th,
          .image-uploads-table td {
            padding: 6px 8px !important;
            font-size: 0.7rem !important;
          }
        }
        
        @media (min-width: 769px) and (max-width: 1024px) {
          /* Tablet styles */
          .excel-table th,
          .excel-table td {
            padding: 6px 8px !important;
            font-size: 0.75rem !important;
          }
          
          .stats-container {
            gap: 8px !important;
          }
          
          .stats-container > div {
            min-width: 120px !important;
          }
        }
        
        @media (min-width: 769px) {
          .mobile-excel-cards {
            display: none !important;
          }
        }
        
        /* Mobile Excel cards */
        .mobile-excel-cards {
          display: none;
        }
        
        .mobile-excel-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 10px;
        }
        
        .mobile-excel-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .mobile-excel-card-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          font-size: 0.75rem;
          margin-bottom: 10px;
        }
        
        .mobile-excel-card-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        
        .mobile-excel-card-actions button {
          flex: 1;
          min-width: calc(50% - 3px);
          padding: 6px;
          font-size: 0.7rem;
          border-radius: 4px;
          border: none;
          cursor: pointer;
        }
      `}</style>
      
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
          <div className="stats-container" style={{
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
            <div className="image-upload-form" style={{
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
                onClick={handleFixAmazonsChoiceCategories}
                style={{
                  padding: '8px 16px',
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🏆 Fix Amazon's Choice Categories
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
              <button
                onClick={handleShowCloudinaryImages}
                style={{
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ☁️ Cloudinary Images
              </button>
            </div>

            {/* Image Uploads Table */}
            {imageUploads.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table className="image-uploads-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
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
            <>
              {/* Desktop Table View */}
              <div className="excel-table" style={{ overflowX: 'auto' }}>
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
            
            {/* Mobile Cards View */}
            <div className="mobile-excel-cards">
              {uploads.map((upload) => (
                <div key={upload._id} className="mobile-excel-card">
                  <div className="mobile-excel-card-header">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: 4 }}>
                        {upload.originalFileName}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#666' }}>
                        ID: {upload._id.slice(-8)}
                      </div>
                    </div>
                    <div style={{
                      padding: '3px 6px',
                      borderRadius: '4px',
                      fontSize: '0.65rem',
                      fontWeight: '600',
                      color: 'white',
                      background: getStatusColor(upload.status)
                    }}>
                      {getStatusIcon(upload.status)} {upload.status}
                    </div>
                  </div>
                  
                  <div className="mobile-excel-card-body">
                    <div>
                      <div style={{ color: '#666', fontSize: '0.65rem' }}>Products</div>
                      <div style={{ fontWeight: 'bold' }}>{upload.summary?.insertedProducts || 0}</div>
                    </div>
                    <div>
                      <div style={{ color: '#666', fontSize: '0.65rem' }}>Size</div>
                      <div style={{ fontWeight: 'bold' }}>{formatFileSize(upload.fileSize)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#666', fontSize: '0.65rem' }}>Errors</div>
                      <div style={{ fontWeight: 'bold', color: upload.summary?.errors > 0 ? '#ef4444' : '#10b981' }}>
                        {upload.summary?.errors || 0}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#666', fontSize: '0.65rem' }}>Uploaded</div>
                      <div style={{ fontSize: '0.7rem' }}>{formatDate(upload.uploadedAt)}</div>
                    </div>
                  </div>
                  
                  <div className="mobile-excel-card-actions">
                    <button
                      onClick={() => navigate(`/admin/excel-products/${upload._id}`)}
                      style={{ background: '#667eea', color: 'white' }}
                    >
                      👁️ View
                    </button>
                    <button
                      onClick={() => navigate(`/admin/excel-manager/images/${upload._id}`)}
                      style={{ background: '#10b981', color: 'white' }}
                    >
                      🖼️ Images
                    </button>
                    <button
                      onClick={() => handleDeleteUpload(upload._id)}
                      style={{ background: '#ef4444', color: 'white' }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </>
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

      {/* Cloudinary Images Modal */}
      {showCloudinaryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '1200px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '12px 12px 0 0'
            }}>
              <div>
                <h2 style={{ margin: 0, color: 'white', fontSize: '1.3rem', fontWeight: 'bold' }}>
                  ☁️ Cloudinary Images
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.9)' }}>
                  {cloudinaryLoading ? 'Loading...' : `${filteredCloudinaryImages.length} images in products folder`}
                </p>
              </div>
              <button
                onClick={() => setShowCloudinaryModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: 'white',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                ✕
              </button>
            </div>

            {/* Search Bar */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <input
                type="text"
                placeholder="🔍 Search by ASIN or image name..."
                value={cloudinarySearch}
                onChange={(e) => setCloudinarySearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Modal Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px'
            }}>
              {cloudinaryLoading ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '300px',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ fontSize: '2rem' }}>⏳</div>
                  <div style={{ fontSize: '1.1rem', color: '#666' }}>Loading Cloudinary images...</div>
                </div>
              ) : filteredCloudinaryImages.length === 0 ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '300px',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ fontSize: '2rem' }}>📭</div>
                  <div style={{ fontSize: '1.1rem', color: '#666' }}>
                    {cloudinarySearch ? 'No images match your search' : 'No images found in Cloudinary'}
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  {filteredCloudinaryImages.map((image, index) => (
                    <div
                      key={index}
                      style={{
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {/* Image */}
                      <div style={{
                        width: '100%',
                        height: '200px',
                        background: '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}>
                        <img
                          src={image.url}
                          alt={image.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '<div style="font-size: 2rem; color: #9ca3af;">🖼️</div>';
                          }}
                        />
                      </div>

                      {/* Image Info */}
                      <div style={{ padding: '12px' }}>
                        <div style={{
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          color: '#333',
                          marginBottom: '4px',
                          wordBreak: 'break-word'
                        }}>
                          {image.name}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#666',
                          marginBottom: '8px'
                        }}>
                          {image.width} × {image.height} • {image.format.toUpperCase()}
                        </div>
                        <div style={{
                          fontSize: '0.7rem',
                          color: '#999'
                        }}>
                          {formatFileSize(image.size)}
                        </div>
                        <a
                          href={image.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            marginTop: '8px',
                            padding: '4px 8px',
                            background: '#3b82f6',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}
                        >
                          🔗 Open
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>
                Total: {filteredCloudinaryImages.length} images
                {cloudinarySearch && ` (filtered from ${cloudinaryImages.length})`}
              </div>
              <button
                onClick={() => setShowCloudinaryModal(false)}
                style={{
                  padding: '8px 16px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default ExcelManager;