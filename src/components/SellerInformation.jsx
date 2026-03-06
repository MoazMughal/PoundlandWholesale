import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';

const SellerInformation = ({ 
  product, 
  isSellerLoggedIn, 
  currentSeller, 
  onUpdatePrice,
  onRefreshProduct 
}) => {
  const navigate = useNavigate();
  const { convertPrice, currency } = useCurrency();
  const [newPrice, setNewPrice] = useState('');
  const [updating, setUpdating] = useState(false);
  const [unlisting, setUnlisting] = useState(false);
  const [showAllSellers, setShowAllSellers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Track window width for responsive design
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleRefresh = async () => {
    if (!onRefreshProduct) return;
    
    setRefreshing(true);
    try {
      await onRefreshProduct();
      // Show a brief success message
      setTimeout(() => setRefreshing(false), 1000);
    } catch (error) {
      console.error('Error refreshing:', error);
      setRefreshing(false);
    }
  };

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

  // Get current seller's total price (price + shipping) from the sellers array
  const getCurrentSellerPrice = () => {
    if (!currentSeller || !product.sellers) return null;
    const currentSellerEntry = product.sellers.find(s => s.sellerId?.toString() === currentSeller._id?.toString());
    if (!currentSellerEntry) return null;
    
    const price = parseFloat(currentSellerEntry.sellerPrice) || 0;
    const shipping = parseFloat(currentSellerEntry.sellerShipping) || 0;
    return price + shipping;
  };

  // Get the lowest price from all sellers (including shipping)
  const getLowestPrice = () => {
    if (!product) return 0;
    
    // Parse the main product price and shipping, handling currency symbols
    const mainPrice = parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
    const mainShipping = parseFloat(product.shipping) || 0;
    const mainTotal = mainPrice + mainShipping;
    
    if (!product.sellers || product.sellers.length === 0) {
      return mainTotal;
    }
    
    const sellerTotals = product.sellers
      .map(seller => {
        const price = parseFloat(seller.sellerPrice);
        const shipping = parseFloat(seller.sellerShipping) || 0;
        const total = (isNaN(price) ? mainPrice : price) + shipping;
        return total;
      })
      .filter(total => total > 0);
    
    const allTotals = [mainTotal, ...sellerTotals];
    const result = Math.min(...allTotals);
    
    // Final safety check to ensure we never return NaN
    return isNaN(result) ? mainTotal : result;
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
      <h3 className="fw-bold mb-0" style={{fontSize: '0.85rem', color: '#1f2937'}}>
        Seller Information
      </h3>
      
      {/* Show seller information to everyone - ONLY show sellers array if it exists, otherwise show legacy seller info */}
      {product.sellers && product.sellers.length > 0 ? (
        <div className="border rounded p-2 mb-2" style={{background: '#e8f5e9', position: 'relative'}}>
          
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
                      const shippingA = parseFloat(a.sellerShipping) || 0;
                      const totalA = priceA + shippingA;
                      
                      const priceB = parseFloat(b.sellerPrice) || parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
                      const shippingB = parseFloat(b.sellerShipping) || 0;
                      const totalB = priceB + shippingB;
                      
                      return totalA - totalB;
                    })
                    .slice(0, showAllSellers ? uniqueSellers.length : 1)
                    .map((sellerEntry, index) => {
                const sellerPrice = parseFloat(sellerEntry.sellerPrice) || parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
                const sellerShipping = parseFloat(sellerEntry.sellerShipping) || 0;
                const sellerTotal = sellerPrice + sellerShipping;
                const mainPrice = parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
                const mainShipping = parseFloat(product.shipping) || 0;
                const mainTotal = mainPrice + mainShipping;
                
                return (
                  <div key={`seller-${sellerEntry.sellerId || sellerEntry._id}-${sellerEntry.username}-${index}`} className="border rounded p-2 mb-2" style={{background: index === 0 ? '#f0f9ff' : '#f8f9fa'}}>
                    {index === 0 && (
                      <div 
                        className="lowest-price-badge mb-2" 
                        style={{
                          display: 'inline-block',
                          fontSize: windowWidth < 576 ? '0.55rem' : '0.6rem', 
                          color: '#ffffff',
                          backgroundColor: '#16a34a',
                          fontWeight: '700',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: 'none',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}
                      >
                        <i className="fas fa-tag me-1" style={{color: '#ffffff'}}></i>
                        <span style={{color: '#ffffff'}}>Lowest Price</span>
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
                          {(() => {
                            const sellerPrice = parseFloat(sellerEntry.sellerPrice) || parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
                            const sellerShipping = parseFloat(sellerEntry.sellerShipping) || 0;
                            const sellerTotal = sellerPrice + sellerShipping;
                            
                            // Hide shipping if currency is PKR
                            if (currency === 'PKR') {
                              return convertPrice(`£${sellerPrice}`);
                            }
                            
                            return sellerShipping > 0 ? (
                              <div>
                                <div>{convertPrice(`£${sellerTotal}`)}</div>
                                <div style={{fontSize: '0.6rem', color: '#6c757d'}}>
                                  {convertPrice(`£${sellerPrice}`)} + {convertPrice(`£${sellerShipping}`)} shipping
                                </div>
                              </div>
                            ) : (
                              convertPrice(`£${sellerPrice}`)
                            );
                          })()}
                        </div>
                        {/* Show crossed out prices for higher prices */}
                        {index === 0 && sellerTotal < mainTotal && (
                          <div style={{fontSize: '0.6rem', textDecoration: 'line-through', color: '#999'}}>
                            {currency === 'PKR' ? (
                              <span>Admin: {convertPrice(`£${mainPrice}`)}</span>
                            ) : (
                              mainShipping > 0 ? (
                                <span>Admin: {convertPrice(`£${mainTotal}`)} ({convertPrice(`£${mainPrice}`)} + {convertPrice(`£${mainShipping}`)} shipping)</span>
                              ) : (
                                <span>Admin: {convertPrice(`£${mainPrice}`)}</span>
                              )
                            )}
                          </div>
                        )}
                        {/* Show crossed out prices for other sellers with higher prices */}
                        {index > 0 && (
                          <div style={{fontSize: '0.6rem', textDecoration: 'line-through', color: '#999'}}>
                            {(() => {
                              const firstSellerPrice = parseFloat(uniqueSellers[0].sellerPrice) || mainPrice;
                              const firstSellerShipping = parseFloat(uniqueSellers[0].sellerShipping) || 0;
                              const firstSellerTotal = firstSellerPrice + firstSellerShipping;
                              
                              // Hide shipping if currency is PKR
                              if (currency === 'PKR') {
                                return `Was: ${convertPrice(`£${firstSellerPrice}`)}`;
                              }
                              
                              return firstSellerShipping > 0 ? 
                                `Was: ${convertPrice(`£${firstSellerTotal}`)} (${convertPrice(`£${firstSellerPrice}`)} + ${convertPrice(`£${firstSellerShipping}`)} shipping)` :
                                `Was: ${convertPrice(`£${firstSellerPrice}`)}`;
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{fontSize: '0.7rem'}}>
                      <strong>Chat with Seller:</strong> 
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
                      <strong>Listed:</strong> {new Date(sellerEntry.listedAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
                  
                  {/* See More Button */}
                  {uniqueSellers.length > 1 && !showAllSellers && (
                    <button
                      onClick={() => setShowAllSellers(true)}
                      className="btn btn-outline-success btn-sm w-100 mt-2"
                      style={{fontSize: '0.7rem', padding: '6px 12px'}}
                    >
                      <i className="fas fa-chevron-down me-1"></i>
                      See More ({uniqueSellers.length - 1} more seller{uniqueSellers.length - 1 > 1 ? 's' : ''})
                    </button>
                  )}
                  
                  {/* See Less Button */}
                  {uniqueSellers.length > 1 && showAllSellers && (
                    <button
                      onClick={() => setShowAllSellers(false)}
                      className="btn btn-outline-secondary btn-sm w-100 mt-2"
                      style={{fontSize: '0.7rem', padding: '6px 12px'}}
                    >
                      <i className="fas fa-chevron-up me-1"></i>
                      See Less
                    </button>
                  )}
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
                    <strong>Chat with Seller:</strong> 
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
                </div>
                <div className="text-end">
                  <div className="fw-bold text-success" style={{fontSize: '0.8rem'}}>
                    {(() => {
                      const sellerPrice = parseFloat(sellerData.sellerPrice) || parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
                      const sellerShipping = parseFloat(sellerData.sellerShipping) || 0;
                      const sellerTotal = sellerPrice + sellerShipping;
                      
                      // Hide shipping if currency is PKR
                      if (currency === 'PKR') {
                        return convertPrice(`£${sellerPrice}`);
                      }
                      
                      if (sellerShipping > 0) {
                        return (
                          <div>
                            <div>{convertPrice(`£${sellerTotal}`)}</div>
                            <div style={{fontSize: '0.6rem', color: '#6c757d'}}>
                              {convertPrice(`£${sellerPrice}`)} + {convertPrice(`£${sellerShipping}`)} shipping
                            </div>
                          </div>
                        );
                      } else {
                        return convertPrice(`£${sellerPrice}`);
                      }
                    })()}
                  </div>
                  {(() => {
                    const sellerPrice = parseFloat(sellerData.sellerPrice);
                    const sellerShipping = parseFloat(sellerData.sellerShipping) || 0;
                    const sellerTotal = sellerPrice + sellerShipping;
                    const mainPrice = parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
                    const mainShipping = parseFloat(product.shipping) || 0;
                    const mainTotal = mainPrice + mainShipping;
                    
                    return sellerData.sellerPrice && !isNaN(sellerPrice) && sellerTotal < mainTotal && (
                      <div style={{fontSize: '0.6rem', textDecoration: 'line-through', color: '#999'}}>
                        {currency === 'PKR' ? (
                          convertPrice(`£${mainPrice}`)
                        ) : (
                          mainShipping > 0 ? (
                            <span>{convertPrice(`£${mainTotal}`)} ({convertPrice(`£${mainPrice}`)} + {convertPrice(`£${mainShipping}`)} shipping)</span>
                          ) : (
                            convertPrice(`£${mainPrice}`)
                          )
                        )}
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
            const currentSellerEntry = currentSeller && product.sellers ? 
              product.sellers.find(s => s.sellerId?.toString() === currentSeller._id?.toString()) : null;
            
            if (currentSellerEntry) {
              const price = parseFloat(currentSellerEntry.sellerPrice) || 0;
              const shipping = parseFloat(currentSellerEntry.sellerShipping) || 0;
              const total = price + shipping;
              
              return (
                <div className="mb-2" style={{fontSize: '0.7rem'}}>
                  <strong>Your Current Price:</strong> 
                  <div className="text-success ms-1 fw-bold">
                    {currency === 'PKR' ? (
                      convertPrice(`£${price}`)
                    ) : (
                      shipping > 0 ? (
                        <div>
                          <div>{convertPrice(`£${total}`)}</div>
                          <div style={{fontSize: '0.6rem', color: '#6c757d'}}>
                            {convertPrice(`£${price}`)} + {convertPrice(`£${shipping}`)} shipping
                          </div>
                        </div>
                      ) : (
                        convertPrice(`£${price}`)
                      )
                    )}
                  </div>
                </div>
              );
            }
            return null;
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
              const mainShipping = parseFloat(product.shipping) || 0;
              const mainTotal = mainPrice + mainShipping;
              const lowestPrice = getLowestPrice();
              
              return lowestPrice < mainTotal && (
                <div className="mt-1">
                  <i className="fas fa-exclamation-triangle text-warning me-1"></i>
                  Current lowest total: {convertPrice(`£${lowestPrice}`)}
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