import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminPost, adminGet } from '../../utils/adminApi';
import cacheManager from '../../utils/cacheManager';
import '../../styles/AdminProductForm.css';

const Approval = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [pendingProducts, setPendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchPendingProducts();
    
    // Show success message if coming from add product
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
    }
  }, [location.state]);

  const fetchPendingProducts = async () => {
    try {
      setLoading(true);
      const response = await adminGet('http://localhost:5000/api/products/pending-approval');
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Pending products received:', data.products);
        // Log images for each product
        data.products?.forEach(product => {
          console.log(`📷 Product "${product.name}" images:`, product.images);
        });
        setPendingProducts(data.products || []);
      } else {
        console.error('Failed to fetch pending products');
      }
    } catch (error) {
      console.error('Error fetching pending products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (productId, action) => {
    setProcessing(productId);
    
    try {
      const response = await adminPost(`http://localhost:5000/api/products/${productId}/approval`, {
        action, // 'approve' or 'disapprove'
        approvalStatus: action === 'approve' ? 'approved' : 'disapproved'
      });
      
      if (response.ok) {
        // Remove from pending list
        setPendingProducts(prev => prev.filter(p => p._id !== productId));
        
        // Clear cache
        cacheManager.clearAll();
        
        // Show success message
        const actionText = action === 'approve' ? 'approved' : 'disapproved';
        setSuccessMessage(`Product ${actionText} successfully!`);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.message || 'Failed to process approval'}`);
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      alert('❌ Failed to process approval. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="admin-product-form">
        <header className="form-header">
          <h1>⏳ Product Approval</h1>
        </header>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>⏳</div>
          <p>Loading pending products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-product-form">
      <header className="form-header">
        <h1>✅ Product Approval</h1>
        <button 
          onClick={() => navigate('/admin/products')} 
          className="back-btn"
        >
          ← Back to Products
        </button>
      </header>

      {pendingProducts.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '50px',
          background: '#f8f9fa',
          borderRadius: '12px',
          margin: '20px 0'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ color: '#28a745', marginBottom: '10px' }}>All Caught Up!</h2>
          <p style={{ color: '#6c757d', fontSize: '16px' }}>
            No products are currently pending approval.
          </p>
          <button
            onClick={() => navigate('/admin/add-product')}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            ➕ Add New Product
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {pendingProducts.map((product) => (
            <div key={product._id} style={{
              background: 'white',
              border: '1px solid #dee2e6',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr auto', gap: '24px', alignItems: 'start' }}>
                {/* Product Image */}
                <div>
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #ddd'
                      }}
                      onError={(e) => {
                        console.error('Image failed to load:', product.images[0]);
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  {(!product.images || product.images.length === 0) && (
                    <div style={{
                      width: '100%',
                      height: '200px',
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #ddd',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6c757d',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '24px' }}>📷</span>
                      <span>No Image Available</span>
                      {product.asin && (
                        <small style={{ fontSize: '12px', color: '#999' }}>
                          ASIN: {product.asin}
                        </small>
                      )}
                    </div>
                  )}
                  {/* Hidden fallback div for image load errors */}
                  <div style={{
                    width: '100%',
                    height: '200px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6c757d',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '24px' }}>❌</span>
                    <span>Image Load Failed</span>
                  </div>
                </div>

                {/* Product Details */}
                <div>
                  <h3 style={{ 
                    margin: '0 0 12px 0', 
                    fontSize: '20px', 
                    fontWeight: 'bold',
                    color: '#212529'
                  }}>
                    {product.name}
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <strong>Price:</strong> {formatPrice(product.price)}
                    </div>
                    <div>
                      <strong>Category:</strong> {product.category}
                    </div>
                    <div>
                      <strong>Brand:</strong> {product.brand || 'N/A'}
                    </div>
                    <div>
                      <strong>SKU:</strong> {product.sku || 'N/A'}
                    </div>
                    <div>
                      <strong>ASIN:</strong> {product.asin || 'N/A'}
                    </div>
                    <div>
                      <strong>Stock:</strong> {product.stock}
                    </div>
                    <div>
                      <strong>Rating:</strong> ⭐ {product.rating}/5
                    </div>
                    <div>
                      <strong>Reviews:</strong> {product.reviews}
                    </div>
                  </div>

                  {product.description && (
                    <div style={{ marginBottom: '16px' }}>
                      <strong>Description:</strong>
                      <p style={{ 
                        margin: '8px 0 0 0', 
                        color: '#6c757d',
                        lineHeight: '1.5'
                      }}>
                        {product.description}
                      </p>
                    </div>
                  )}

                  {product.features && product.features.length > 0 && (
                    <div>
                      <strong>Features:</strong>
                      <ul style={{ 
                        margin: '8px 0 0 0', 
                        paddingLeft: '20px',
                        color: '#6c757d'
                      }}>
                        {product.features.map((feature, index) => (
                          <li key={index} style={{ marginBottom: '4px' }}>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '140px' }}>
                  <button
                    onClick={() => handleApproval(product._id, 'approve')}
                    disabled={processing === product._id}
                    style={{
                      padding: '12px 20px',
                      background: processing === product._id ? '#6c757d' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: processing === product._id ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {processing === product._id ? '⏳' : '✅'} Approve
                  </button>
                  
                  <button
                    onClick={() => handleApproval(product._id, 'disapprove')}
                    disabled={processing === product._id}
                    style={{
                      padding: '12px 20px',
                      background: processing === product._id ? '#6c757d' : '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: processing === product._id ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {processing === product._id ? '⏳' : '❌'} Disapprove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
          color: 'white',
          padding: '20px 25px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(40, 167, 69, 0.3)',
          zIndex: 9999,
          minWidth: '350px',
          maxWidth: '500px',
          animation: 'slideInRight 0.5s ease-out',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              animation: 'bounce 0.6s ease-in-out'
            }}>
              ✅
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                margin: '0 0 5px 0',
                fontSize: '18px',
                fontWeight: 'bold',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                Success!
              </h3>
              <p style={{
                margin: 0,
                fontSize: '14px',
                opacity: 0.9,
                lineHeight: '1.4'
              }}>
                {successMessage}
              </p>
            </div>
            <button
              onClick={() => setShowSuccessToast(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                e.target.style.transform = 'scale(1.1)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }
      `}</style>
    </div>
  );
};

export default Approval;