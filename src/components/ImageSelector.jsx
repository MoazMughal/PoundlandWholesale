import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api';

const ImageSelector = ({ 
  onImageSelect, 
  currentImages = [], 
  maxImages = 5,
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState('cloudinary');
  const [cloudinaryImages, setCloudinaryImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (activeTab === 'cloudinary') {
      fetchCloudinaryImages();
    }
  }, [activeTab, searchQuery, currentPage]);

  const fetchCloudinaryImages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        ...(searchQuery && { search: searchQuery })
      });

      const response = await fetch(getApiUrl(`admin-excel/cloudinary-images?${params}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCloudinaryImages(data.images || []);
        setTotalPages(Math.ceil((data.total || 0) / 20));
      }
    } catch (error) {
      console.error('Error fetching Cloudinary images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageToggle = (imageUrl) => {
    setSelectedImages(prev => {
      const isSelected = prev.includes(imageUrl);
      if (isSelected) {
        return prev.filter(url => url !== imageUrl);
      } else {
        if (prev.length >= maxImages) {
          alert(`Maximum ${maxImages} images allowed`);
          return prev;
        }
        return [...prev, imageUrl];
      }
    });
  };

  const handleConfirmSelection = () => {
    onImageSelect(selectedImages);
    onClose();
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    onImageSelect(files);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '1000px',
        height: '80%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
            Select Product Images
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <button
            onClick={() => setActiveTab('cloudinary')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'cloudinary' ? '#3b82f6' : 'transparent',
              color: activeTab === 'cloudinary' ? 'white' : '#6b7280',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            🌤️ Cloudinary Images
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'upload' ? '#3b82f6' : 'transparent',
              color: activeTab === 'upload' ? 'white' : '#6b7280',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            📁 Upload from Device
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'cloudinary' ? (
            <>
              {/* Search */}
              <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                <input
                  type="text"
                  placeholder="Search images by ASIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 15px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Images Grid */}
              <div style={{ 
                flex: 1, 
                overflow: 'auto', 
                padding: '20px'
              }}>
                {loading ? (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '200px' 
                  }}>
                    <div>Loading images...</div>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '15px'
                  }}>
                    {cloudinaryImages.map((image, index) => (
                      <div
                        key={index}
                        onClick={() => handleImageToggle(image.url)}
                        style={{
                          position: 'relative',
                          border: selectedImages.includes(image.url) ? '3px solid #3b82f6' : '2px solid #e5e7eb',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <img
                          src={image.url}
                          alt={`Product ${image.asin}`}
                          style={{
                            width: '100%',
                            height: '150px',
                            objectFit: 'contain',
                            objectPosition: 'center',
                            padding: '8px',
                            backgroundColor: '#f8f9fa'
                          }}
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yPC90ZXh0Pjwvc3ZnPg==';
                          }}
                        />
                        {selectedImages.includes(image.url) && (
                          <div style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            background: '#3b82f6',
                            color: 'white',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>
                            ✓
                          </div>
                        )}
                        <div style={{
                          position: 'absolute',
                          bottom: '0',
                          left: '0',
                          right: '0',
                          background: 'rgba(0, 0, 0, 0.7)',
                          color: 'white',
                          padding: '5px',
                          fontSize: '12px',
                          textAlign: 'center'
                        }}>
                          {image.asin}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px',
                    marginTop: '20px'
                  }}>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #d1d5db',
                        background: currentPage === 1 ? '#f9fafb' : 'white',
                        borderRadius: '6px',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #d1d5db',
                        background: currentPage === totalPages ? '#f9fafb' : 'white',
                        borderRadius: '6px',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Upload Tab */
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px'
            }}>
              <div style={{
                border: '2px dashed #d1d5db',
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center',
                width: '100%',
                maxWidth: '400px'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
                  Upload from Device
                </h3>
                <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '14px' }}>
                  Select up to {maxImages} images from your computer
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    background: '#3b82f6',
                    color: 'white',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Choose Files
                </label>
                <p style={{ margin: '16px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                  JPEG, PNG, GIF, WebP (max 5MB each)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'cloudinary' && (
          <div style={{
            padding: '20px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {selectedImages.length} of {maxImages} images selected
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d1d5db',
                  background: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSelection}
                disabled={selectedImages.length === 0}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: selectedImages.length > 0 ? '#3b82f6' : '#d1d5db',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: selectedImages.length > 0 ? 'pointer' : 'not-allowed',
                  fontWeight: '500'
                }}
              >
                Use Selected Images
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageSelector;