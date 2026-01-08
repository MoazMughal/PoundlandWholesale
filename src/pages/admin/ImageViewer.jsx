import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getApiUrl } from '../../utils/api';
import '../../styles/AdminLayout.css';

const ImageViewer = () => {
  const navigate = useNavigate();
  const { uploadId } = useParams();
  const [upload, setUpload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMatched, setFilterMatched] = useState('all'); // all, matched, unmatched

  useEffect(() => {
    fetchImageUpload();
  }, [uploadId]);

  const fetchImageUpload = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/admin-excel/image-uploads/${uploadId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUpload(data.upload);
      } else {
        alert('Failed to load image upload');
        navigate('/admin/excel-manager');
      }
    } catch (error) {
      console.error('Error fetching image upload:', error);
      alert('Error loading image upload');
      navigate('/admin/excel-manager');
    } finally {
      setLoading(false);
    }
  };

  const filteredImages = upload?.images?.filter(image => {
    const matchesSearch = !searchQuery || 
      image.asin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      image.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterMatched === 'all' || 
      (filterMatched === 'matched' && image.matched) ||
      (filterMatched === 'unmatched' && !image.matched);

    return matchesSearch && matchesFilter;
  }) || [];

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

  if (loading) {
    return (
      <div className="admin-layout">
        <div style={{ padding: '50px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', color: '#666' }}>⏳ Loading images...</div>
        </div>
      </div>
    );
  }

  if (!upload) {
    return (
      <div className="admin-layout">
        <div style={{ padding: '50px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', color: '#666' }}>❌ Image upload not found</div>
          <button
            onClick={() => navigate('/admin/excel-manager')}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ← Back to Excel Manager
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <div style={{ padding: '12px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '8px',
          color: 'white'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold', color: 'white' }}>
              🖼️ Image Viewer
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', opacity: 0.9, color: 'white' }}>
              {upload.originalFileName} - {upload.summary.validImages} images
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/excel-manager')}
            style={{
              background: 'rgba(255, 255, 255, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ← Back to Manager
          </button>
        </div>

        {/* Summary Stats */}
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
            gap: '8px'
          }}>
            <div style={{ fontSize: '1.2rem' }}>📊</div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>{upload.summary.totalImages}</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Total Images</div>
            </div>
          </div>
          <div style={{
            background: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{ fontSize: '1.2rem' }}>✅</div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#333' }}>{upload.summary.validImages}</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Valid Images</div>
            </div>
          </div>
          <div style={{
            background: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{ fontSize: '1.2rem' }}>🎯</div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#10b981' }}>{upload.summary.matchedAsins}</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Matched ASINs</div>
            </div>
          </div>
          <div style={{
            background: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{ fontSize: '1.2rem' }}>❌</div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ef4444' }}>{upload.summary.errors}</div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>Errors</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          background: 'white',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search by ASIN or filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.85rem'
              }}
            />
          </div>
          <select
            value={filterMatched}
            onChange={(e) => setFilterMatched(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.85rem',
              background: 'white'
            }}
          >
            <option value="all">All Images ({upload.summary.validImages})</option>
            <option value="matched">Matched ({upload.summary.matchedAsins})</option>
            <option value="unmatched">Unmatched ({upload.summary.validImages - upload.summary.matchedAsins})</option>
          </select>
          <div style={{ fontSize: '0.85rem', color: '#666' }}>
            Showing {filteredImages.length} images
          </div>
        </div>

        {/* Images Grid */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '16px'
        }}>
          {filteredImages.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', color: '#666', marginBottom: '10px' }}>🔍</div>
              <div style={{ fontSize: '1.1rem', color: '#666' }}>No images found</div>
              <div style={{ fontSize: '0.9rem', color: '#999' }}>Try adjusting your search or filter</div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '16px'
            }}>
              {filteredImages.map((image, index) => (
                <div
                  key={index}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Image */}
                  <div style={{
                    height: '200px',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <img
                      src={getApiUrl(`admin-excel/public/images/by-asin/${image.asin}`)}
                      alt={image.asin}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }}
                      onLoad={(e) => {
                        // Image loaded successfully
                        e.target.style.display = 'block';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'none';
                        }
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) {
                          e.target.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                    <div style={{
                      display: 'none',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: '#666',
                      fontSize: '0.9rem'
                    }}>
                      🖼️ Image not available
                    </div>
                    
                    {/* Match Status Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      background: image.matched ? '#10b981' : '#ef4444',
                      color: 'white'
                    }}>
                      {image.matched ? '✅ Matched' : '❌ No Match'}
                    </div>
                  </div>

                  {/* Image Info */}
                  <div style={{ padding: '12px' }}>
                    <div style={{
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#333',
                      marginBottom: '4px'
                    }}>
                      ASIN: {image.asin}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#666',
                      marginBottom: '4px'
                    }}>
                      {image.fileName}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#999'
                    }}>
                      {formatFileSize(image.fileSize)}
                    </div>
                    
                    {image.matched && image.productId && (
                      <div style={{
                        marginTop: '8px',
                        padding: '6px 8px',
                        background: '#f0f9ff',
                        borderRadius: '4px',
                        fontSize: '0.75rem'
                      }}>
                        <div style={{ color: '#0369a1', fontWeight: '600' }}>
                          🎯 Product Found
                        </div>
                        {image.productId.name && (
                          <div style={{ color: '#0369a1', marginTop: '2px' }}>
                            {image.productId.name}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;