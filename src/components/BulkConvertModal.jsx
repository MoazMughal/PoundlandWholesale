import { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api';

const BulkConvertModal = ({ 
  isOpen, 
  onClose, 
  selectedProducts, 
  products, 
  uploadId, 
  onSuccess 
}) => {
  const [isConverting, setIsConverting] = useState(false);
  const [editedPrices, setEditedPrices] = useState({});

  // Initialize edited prices when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialPrices = {};
      products.filter(p => selectedProducts.has(p._id)).forEach(product => {
        initialPrices[product._id] = parseFloat(product.price || 0).toFixed(2);
      });
      setEditedPrices(initialPrices);
    }
  }, [isOpen, selectedProducts, products]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isConverting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isConverting, onClose]);

  if (!isOpen) return null;

  // Get selected product details with edited prices
  const selectedProductDetails = products.filter(p => selectedProducts.has(p._id)).map(product => ({
    ...product,
    editedPrice: editedPrices[product._id] || parseFloat(product.price || 0).toFixed(2)
  }));

  const handlePriceChange = (productId, newPrice) => {
    setEditedPrices(prev => ({
      ...prev,
      [productId]: newPrice
    }));
  };

  const handleConfirm = async () => {
    setIsConverting(true);
    
    try {
      const token = localStorage.getItem('adminToken');
      
      // Prepare products with updated prices
      const productsWithPrices = Array.from(selectedProducts).map(productId => ({
        productId,
        price: parseFloat(editedPrices[productId] || 0)
      }));
      
      const response = await fetch(getApiUrl(`admin-excel/uploads/${uploadId}/bulk-convert-products`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          productIds: Array.from(selectedProducts),
          productsWithPrices: productsWithPrices
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Get the categories of converted products for navigation
        const convertedCategories = [...new Set(
          selectedProductDetails
            .filter(p => selectedProducts.has(p._id))
            .map(p => p.category)
            .filter(Boolean)
        )];
        
        onSuccess({
          ...result,
          convertedCategories: convertedCategories
        });
        onClose();
      } else {
        alert(`❌ Failed to convert products: ${result.message}`);
      }
    } catch (error) {
      console.error('Error converting products:', error);
      alert('❌ Failed to convert products');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              💡 Convert to Approval Queue
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '0.9rem',
              color: '#6b7280'
            }}>
              Convert {selectedProducts.size} selected products and send to approval queue • Edit prices below • Press Escape to cancel
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isConverting}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: isConverting ? 'not-allowed' : 'pointer',
              color: '#9ca3af',
              padding: '4px',
              borderRadius: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* What will happen section */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', fontWeight: '600' }}>
            📋 What will happen:
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <li>✅ Convert products to main products database</li>
            <li>🏷️ Match existing categories or create new ones</li>
            <li>📋 Send all products to approval queue</li>
            <li>⏳ Require admin approval before going live</li>
            <li>📸 Include product images (if available)</li>
            <li>💰 Update prices with your edited values</li>
            <li>🔍 Validate SKU requirements</li>
          </ul>
        </div>

        {/* Summary Statistics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: '6px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0369a1' }}>
              {selectedProducts.size}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#0369a1' }}>Products</div>
          </div>
          
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #22c55e',
            borderRadius: '6px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#15803d' }}>
              {new Set(selectedProductDetails.map(p => p.category).filter(Boolean)).size}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#15803d' }}>Categories</div>
          </div>
          
          <div style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '6px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#d97706' }}>
              {selectedProductDetails.filter(p => p.asin).length}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#d97706' }}>With Images</div>
          </div>
          
          <div style={{
            background: '#fdf2f8',
            border: '1px solid #ec4899',
            borderRadius: '6px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#be185d' }}>
              £{selectedProductDetails.reduce((sum, p) => sum + parseFloat(p.editedPrice || 0), 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#be185d' }}>Total Value</div>
          </div>
        </div>

        {/* Categories Preview */}
        {(() => {
          const categories = [...new Set(selectedProductDetails.map(p => p.category).filter(Boolean))];
          if (categories.length > 0) {
            return (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px'
              }}>
                <h4 style={{
                  margin: '0 0 8px 0',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  🏷️ Categories that will be created/used:
                </h4>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px'
                }}>
                  {categories.map(category => (
                    <span
                      key={category}
                      style={{
                        padding: '4px 8px',
                        background: '#ddd6fe',
                        color: '#5b21b6',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: '500'
                      }}
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Selected Products Preview */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              📦 Selected Products ({selectedProducts.size})
            </h3>
            
            {/* Bulk Price Actions */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8rem'
            }}>
              <span style={{ color: '#6b7280' }}>Bulk price:</span>
              <button
                onClick={() => {
                  const multiplier = prompt('Enter multiplier (e.g., 1.1 for 10% increase, 0.9 for 10% decrease):');
                  if (multiplier && !isNaN(multiplier)) {
                    const newPrices = {};
                    selectedProductDetails.forEach(product => {
                      newPrices[product._id] = (parseFloat(product.editedPrice) * parseFloat(multiplier)).toFixed(2);
                    });
                    setEditedPrices(prev => ({ ...prev, ...newPrices }));
                  }
                }}
                disabled={isConverting}
                style={{
                  padding: '4px 8px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '0.7rem',
                  cursor: isConverting ? 'not-allowed' : 'pointer'
                }}
              >
                ×% All
              </button>
              <button
                onClick={() => {
                  const amount = prompt('Enter amount to add/subtract (e.g., 5 to add £5, -2 to subtract £2):');
                  if (amount && !isNaN(amount)) {
                    const newPrices = {};
                    selectedProductDetails.forEach(product => {
                      const newPrice = Math.max(0, parseFloat(product.editedPrice) + parseFloat(amount));
                      newPrices[product._id] = newPrice.toFixed(2);
                    });
                    setEditedPrices(prev => ({ ...prev, ...newPrices }));
                  }
                }}
                disabled={isConverting}
                style={{
                  padding: '4px 8px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '0.7rem',
                  cursor: isConverting ? 'not-allowed' : 'pointer'
                }}
              >
                +/- All
              </button>
            </div>
          </div>
          
          <div style={{
            maxHeight: '300px',
            overflow: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}>
            {selectedProductDetails.map((product, index) => (
              <div
                key={product._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderBottom: index < selectedProductDetails.length - 1 ? '1px solid #f3f4f6' : 'none',
                  background: index % 2 === 0 ? '#f9fafb' : 'white'
                }}
              >
                {/* Product Image */}
                <div style={{
                  width: '50px',
                  height: '50px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f8fafc',
                  flexShrink: 0
                }}>
                  {product.asin ? (
                    <img
                      src={`${getApiUrl('admin-excel/public/images/by-asin')}/${product.asin}`}
                      alt={product.asin}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        objectPosition: 'center',
                        padding: '2px'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div style={{
                    display: product.asin ? 'none' : 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    fontSize: '0.7rem',
                    color: '#9ca3af',
                    flexDirection: 'column'
                  }}>
                    <div>📷</div>
                    <div style={{ fontSize: '0.5rem', marginTop: '2px' }}>
                      {product.asin ? 'No Image' : 'No ASIN'}
                    </div>
                  </div>
                </div>

                {/* Product Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    color: '#1f2937',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {product.name}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    fontSize: '0.8rem',
                    color: '#6b7280',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                  }}>
                    <span>
                      <strong>ASIN:</strong> {product.asin || 'N/A'}
                    </span>
                    <span>
                      <strong>Category:</strong> {product.category || 'N/A'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <strong>Price:</strong>
                      <span>£</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={product.editedPrice}
                        onChange={(e) => handlePriceChange(product._id, e.target.value)}
                        disabled={isConverting}
                        style={{
                          width: '70px',
                          padding: '2px 4px',
                          border: '1px solid #d1d5db',
                          borderRadius: '3px',
                          fontSize: '0.8rem',
                          background: isConverting ? '#f3f4f6' : 'white'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  background: '#fef3c7',
                  color: '#92400e'
                }}>
                  Ready to Convert
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            onClick={onClose}
            disabled={isConverting}
            style={{
              padding: '10px 20px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white',
              color: '#374151',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: isConverting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={isConverting}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '6px',
              background: isConverting 
                ? '#9ca3af' 
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: isConverting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isConverting ? (
              <>
                <span style={{ 
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid #ffffff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Converting...
              </>
            ) : (
              <>
                📋 Convert to Approval
              </>
            )}
          </button>
        </div>

        {/* Add spinning animation */}
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default BulkConvertModal;