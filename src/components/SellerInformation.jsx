import { useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';

const SellerInformation = ({ 
  product, 
  isSellerLoggedIn, 
  currentSeller, 
  onUpdatePrice,
  onRefreshProduct 
}) => {
  const { convertPrice } = useCurrency();
  const [newPrice, setNewPrice] = useState('');
  const [updating, setUpdating] = useState(false);
  const [unlisting, setUnlisting] = useState(false);

  const handleUpdatePrice = async () => {
    if (!newPrice || newPrice <= 0) return;
    
    setUpdating(true);
    try {
      await onUpdatePrice(newPrice);
      setNewPrice('');
      // Refresh the product data to show updated price
      if (onRefreshProduct) {
        await onRefreshProduct();
      }
    } catch (error) {
      console.error('Error updating price:', error);
      alert('❌ Failed to update price. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleUnlistProduct = async () => {
    if (!window.confirm('Are you sure you want to remove your listing for this product? This action cannot be undone.')) {
      return;
    }

    setUnlisting(true);
    try {
      const token = localStorage.getItem('sellerToken');
      const response = await fetch(`http://localhost:5000/api/sellers/unlist-product/${product.id || product._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert('✅ Product unlisted successfully! Your listing has been removed.');
        // Refresh the product data to show updated seller list
        if (onRefreshProduct) {
          await onRefreshProduct();
        }
      } else {
        alert('❌ ' + (data.message || 'Failed to unlist product'));
      }
    } catch (error) {
      console.error('Error unlisting product:', error);
      alert('❌ Failed to unlist product. Please try again.');
    } finally {
      setUnlisting(false);
    }
  };

  // Get current seller's price from the sellers array
  const getCurrentSellerPrice = () => {
    if (!currentSeller || !product.sellers) return null;
    const currentSellerEntry = product.sellers.find(s => s.sellerId?.toString() === currentSeller._id?.toString());
    return currentSellerEntry ? parseFloat(currentSellerEntry.sellerPrice) : null;
  };

  // Get the lowest price from all sellers
  const getLowestPrice = () => {
    if (!product) return 0;
    
    // Parse the main product price, handling currency symbols
    const mainPrice = parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
    
    if (!product.sellers || product.sellers.length === 0) {
      return mainPrice;
    }
    
    const sellerPrices = product.sellers
      .map(seller => {
        const price = parseFloat(seller.sellerPrice);
        return isNaN(price) ? mainPrice : price;
      })
      .filter(price => price > 0);
    
    const allPrices = [mainPrice, ...sellerPrices];
    const result = Math.min(...allPrices);
    
    // Final safety check to ensure we never return NaN
    return isNaN(result) ? mainPrice : result;
  };

  const lowestPrice = getLowestPrice();

  // Debug: Log the product data to understand the structure
  console.log('🔍 SellerInformation Debug:', {
    productId: product?.id || product?._id,
    hasSellerInfo: !!product?.sellerInfo,
    hasSellerData: !!product?.sellerData,
    hasSeller: !!product?.seller,
    hasSellersArray: !!(product?.sellers && product.sellers.length > 0),
    sellersCount: product?.sellers?.length || 0,
    sellerInfoUsername: product?.sellerInfo?.username,
    sellersArrayUsernames: product?.sellers?.map(s => s.username) || [],
    sellersArrayIds: product?.sellers?.map(s => s.sellerId || s._id) || [],
    duplicateSellerIds: product?.sellers ? 
      product.sellers.map(s => s.sellerId || s._id).filter((id, index, arr) => arr.indexOf(id) !== index) : [],
    showingSellersArray: !!(product?.sellers && product.sellers.length > 0),
    willShowLegacySellerInfo: !(product?.sellers && product.sellers.length > 0) && (product?.sellerInfo || product?.sellerData || product?.seller)
  });

  return (
    <div className="mb-2">
      <h3 className="fw-bold mb-2" style={{fontSize: '0.85rem', color: '#1f2937'}}>
        Seller Information
      </h3>
      
      {/* Show seller information to everyone - ONLY show sellers array if it exists, otherwise show legacy seller info */}
      {product.sellers && product.sellers.length > 0 ? (
        <div className="border rounded p-2 mb-2" style={{background: '#e8f5e9'}}>
          <div className="mb-2">
            <div className="d-flex align-items-center mb-1">
              <i className="fas fa-store text-success me-1" style={{fontSize: '0.75rem'}}></i>
              <span className="fw-semibold text-success" style={{fontSize: '0.75rem'}}>
                Available Sellers
              </span>
            </div>
          </div>
          
          <div>
            {(() => {
              // Remove duplicates based on sellerId and ensure unique sellers
              const uniqueSellers = product.sellers.reduce((acc, seller) => {
                const sellerId = seller.sellerId || seller._id;
                if (!sellerId) return acc; // Skip sellers without valid ID
                
                // Check if this seller is already in our unique list
                const existingSeller = acc.find(s => (s.sellerId || s._id) === sellerId);
                if (!existingSeller) {
                  acc.push(seller);
                }
                return acc;
              }, []);
              
              return (
                <>
                  <div style={{fontSize: '0.7rem', marginBottom: '8px'}}>
                    <strong>Available from {uniqueSellers.length} seller{uniqueSellers.length > 1 ? 's' : ''}:</strong>
                  </div>
                  {uniqueSellers
                    .sort((a, b) => {
                      const priceA = parseFloat(a.sellerPrice) || parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
                      const priceB = parseFloat(b.sellerPrice) || parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
                      return priceA - priceB;
                    })
                    .map((sellerEntry, index) => {
                const sellerPrice = parseFloat(sellerEntry.sellerPrice) || parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
                const mainPrice = parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
                
                return (
                  <div key={`seller-${sellerEntry.sellerId || sellerEntry._id}-${sellerEntry.username}-${index}`} className="border rounded p-2 mb-2" style={{background: index === 0 ? '#f0f9ff' : '#f8f9fa'}}>
                    {index === 0 && (
                      <div className="badge bg-success mb-2" style={{fontSize: '0.6rem'}}>
                        <i className="fas fa-tag me-1"></i>
                        Lowest Price
                      </div>
                    )}
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <div style={{fontSize: '0.7rem'}}>
                          <strong>Seller:</strong> {sellerEntry.username}
                        </div>
                        <div style={{fontSize: '0.7rem'}}>
                          <strong>Location:</strong> 📍 {sellerEntry.city}, {sellerEntry.country}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold text-success" style={{fontSize: '0.8rem'}}>
                          {convertPrice(`£${sellerPrice}`)}
                        </div>
                        {/* Show crossed out prices for higher prices */}
                        {index === 0 && sellerPrice < mainPrice && (
                          <div style={{fontSize: '0.6rem', textDecoration: 'line-through', color: '#999'}}>
                            Admin: {convertPrice(`£${mainPrice}`)}
                          </div>
                        )}
                        {/* Show crossed out prices for other sellers with higher prices */}
                        {index > 0 && (
                          <div style={{fontSize: '0.6rem', textDecoration: 'line-through', color: '#999'}}>
                            Was: {convertPrice(`£${parseFloat(uniqueSellers[0].sellerPrice) || mainPrice}`)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{fontSize: '0.7rem'}}>
                      <strong>Contact:</strong> 
                      <a 
                        href={`https://wa.me/${sellerEntry.whatsappNo?.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-success ms-1"
                      >
                        <i className="fab fa-whatsapp me-1"></i>
                        {sellerEntry.whatsappNo}
                      </a>
                    </div>
                    <div style={{fontSize: '0.7rem'}}>
                      <strong>Status:</strong> 
                      <span className="badge bg-success ms-1" style={{fontSize: '0.65rem'}}>
                        {sellerEntry.verificationStatus}
                      </span>
                    </div>
                    <div style={{fontSize: '0.7rem'}}>
                      <strong>Listed:</strong> {new Date(sellerEntry.listedAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
                </>
              );
            })()}
          </div>
        </div>
      ) : (product.sellerInfo || product.sellerData || product.seller) ? (
        /* FALLBACK: Show legacy single seller info only if sellers array is empty */
        <div className="border rounded p-2 mb-2" style={{background: '#e8f5e9'}}>
          <div className="mb-2">
            <div className="d-flex align-items-center mb-1">
              <i className="fas fa-store text-success me-1" style={{fontSize: '0.75rem'}}></i>
              <span className="fw-semibold text-success" style={{fontSize: '0.75rem'}}>
                Available from Seller
              </span>
            </div>
          </div>
          
          {(() => {
            const sellerData = product.sellerData || product.sellerInfo || (product.seller && typeof product.seller === 'object' ? product.seller : null);
            if (!sellerData) {
              return (
                <div style={{fontSize: '0.7rem'}}>
                  <strong>Seller ID:</strong> {product.seller}<br/>
                  <small className="text-muted">Loading seller information...</small>
                </div>
              );
            }
            
            return (
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="mb-1" style={{fontSize: '0.7rem'}}>
                    <strong>Seller:</strong> {sellerData.username}
                  </div>
                  {sellerData.supplierId && (
                    <div className="mb-1" style={{fontSize: '0.7rem'}}>
                      <strong>Supplier ID:</strong> {sellerData.supplierId}
                    </div>
                  )}
                  <div className="mb-1" style={{fontSize: '0.7rem'}}>
                    <strong>Location:</strong> 📍 {sellerData.city}, {sellerData.country}
                  </div>
                  <div className="mb-1" style={{fontSize: '0.7rem'}}>
                    <strong>Contact:</strong> 
                    <a 
                      href={`https://wa.me/${sellerData.whatsappNo?.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-success ms-1"
                    >
                      <i className="fab fa-whatsapp me-1"></i>
                      {sellerData.whatsappNo}
                    </a>
                  </div>
                  <div className="mb-1" style={{fontSize: '0.7rem'}}>
                    <strong>Status:</strong> 
                    <span className="badge bg-success ms-1" style={{fontSize: '0.65rem'}}>
                      {sellerData.verificationStatus}
                    </span>
                  </div>
                </div>
                <div className="text-end">
                  <div className="fw-bold text-success" style={{fontSize: '0.8rem'}}>
                    {(() => {
                      const sellerPrice = parseFloat(sellerData.sellerPrice) || parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
                      return convertPrice(`£${sellerPrice}`);
                    })()}
                  </div>
                  {(() => {
                    const sellerPrice = parseFloat(sellerData.sellerPrice);
                    const mainPrice = parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
                    return sellerData.sellerPrice && !isNaN(sellerPrice) && sellerPrice < mainPrice && (
                      <div style={{fontSize: '0.6rem', textDecoration: 'line-through', color: '#999'}}>
                        {convertPrice(`£${mainPrice}`)}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* No seller information available */
        <div className="alert alert-info border-0 p-2 mb-2" style={{fontSize: '0.7rem'}}>
          <i className="fas fa-info-circle me-1"></i>
          No seller information available for this product
        </div>
      )}

      {/* Price Management for Current Seller */}
      {isSellerLoggedIn && currentSeller && (
        (product.sellers && product.sellers.some(s => s.sellerId?.toString() === currentSeller._id?.toString())) ||
        (product.seller && product.seller?.toString() === currentSeller._id?.toString())
      ) && (
        <div className="border rounded p-2 mb-2" style={{background: '#fff3cd'}}>
          <div className="mb-2">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <div className="d-flex align-items-center">
                <i className="fas fa-edit text-warning me-1" style={{fontSize: '0.75rem'}}></i>
                <span className="fw-semibold text-warning" style={{fontSize: '0.75rem'}}>
                  Manage Your Listing
                </span>
              </div>
              <button 
                className="btn btn-danger btn-sm" 
                style={{fontSize: '0.6rem', padding: '2px 6px'}}
                onClick={handleUnlistProduct}
                disabled={unlisting}
                title="Remove your listing for this product"
              >
                {unlisting ? (
                  <>
                    <i className="fas fa-spinner fa-spin me-1"></i>
                    Removing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash me-1"></i>
                    Unlist
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Show current seller's price */}
          {(() => {
            const currentPrice = getCurrentSellerPrice();
            return currentPrice && (
              <div className="mb-2" style={{fontSize: '0.7rem'}}>
                <strong>Your Current Price:</strong> 
                <span className="text-success ms-1 fw-bold">
                  {convertPrice(`£${currentPrice}`)}
                </span>
              </div>
            );
          })()}
          
          <div className="mb-2">
            <label style={{fontSize: '0.7rem', fontWeight: 'bold'}}>Update Your Price:</label>
            <div className="input-group input-group-sm">
              <span className="input-group-text">£</span>
              <input 
                type="number" 
                className="form-control" 
                placeholder={getCurrentSellerPrice() || parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0}
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                step="0.01"
                style={{fontSize: '0.7rem'}}
                disabled={updating}
              />
              <button 
                className="btn btn-success" 
                type="button" 
                style={{fontSize: '0.7rem'}}
                onClick={handleUpdatePrice}
                disabled={updating || !newPrice}
              >
                {updating ? (
                  <>
                    <i className="fas fa-spinner fa-spin me-1"></i>
                    Updating...
                  </>
                ) : (
                  'Update Price'
                )}
              </button>
            </div>
          </div>
          <div style={{fontSize: '0.65rem', color: '#666'}}>
            <i className="fas fa-info-circle me-1"></i>
            Set your competitive price. Lower prices appear first.
            {(() => {
              const mainPrice = parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
              return lowestPrice < mainPrice && (
                <div className="mt-1">
                  <i className="fas fa-exclamation-triangle text-warning me-1"></i>
                  Current lowest price: {convertPrice(`£${lowestPrice}`)}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerInformation;