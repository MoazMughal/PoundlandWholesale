import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBasket } from '../context/BasketContext'
import { useCurrency } from '../context/CurrencyContext'
import { useBuyer } from '../context/BuyerContext'
import { getImageUrl } from '../utils/imageImports'
import { optimizeImageUrl } from '../utils/imageOptimization'
import { getApiUrl } from '../utils/api'
import MobileImage from '../components/MobileImage'
import ScrollToTop from '../components/ScrollToTop'
import '../styles/basket-responsive.css'

const Basket = () => {
  const navigate = useNavigate()
  const { basket, userType, removeFromBasket, updateQuantity, clearBasket, getBasketTotal } = useBasket()
  const { formatPrice, currency } = useCurrency()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [basketUpdated, setBasketUpdated] = useState(false)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [selectedItems, setSelectedItems] = useState({})

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Keep selectedItems in sync with basket (auto-select new items, remove deleted ones)
  // Use a ref to avoid stale closure issues and prevent cascading re-renders
  const prevBasketRef = useRef([])

  // Local quantity map for immediate UI response (avoids stale closure on rapid clicks)
  const [quantities, setQuantities] = useState({})
  const debounceTimers = useRef({})

  // Sync quantities map when basket items are added/removed
  useEffect(() => {
    setQuantities(prev => {
      const next = { ...prev }
      basket.forEach(item => {
        const iId  = item.id || item._id
        const iSid = item.selectedSeller?.sellerId || item.selectedSeller?._id || ''
        const key  = iSid ? `${iId}_${iSid}` : iId
        if (!(key in next)) next[key] = item.quantity || 1
      })
      Object.keys(next).forEach(k => {
        const exists = basket.some(item => {
          const iId  = item.id || item._id
          const iSid = item.selectedSeller?.sellerId || item.selectedSeller?._id || ''
          return (iSid ? `${iId}_${iSid}` : iId) === k
        })
        if (!exists) delete next[k]
      })
      return next
    })
  }, [basket])

  const handleQtyChange = (key, itemId, sellerId, newQty) => {
    setQuantities(prev => ({ ...prev, [key]: newQty }))
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key])
    debounceTimers.current[key] = setTimeout(() => {
      updateQuantity(itemId, newQty, sellerId)
    }, 150)
  }
  useEffect(() => {
    const prev = prevBasketRef.current
    const prevKeys = new Set(prev.map(item => {
      const iId  = item.id || item._id
      const iSid = item.selectedSeller?.sellerId || item.selectedSeller?._id || ''
      return iSid ? `${iId}_${iSid}` : iId
    }))
    const currKeys = new Set(basket.map(item => {
      const iId  = item.id || item._id
      const iSid = item.selectedSeller?.sellerId || item.selectedSeller?._id || ''
      return iSid ? `${iId}_${iSid}` : iId
    }))

    // Only update selectedItems if items were added or removed (not on quantity change)
    const added   = [...currKeys].filter(k => !prevKeys.has(k))
    const removed = [...prevKeys].filter(k => !currKeys.has(k))

    if (added.length > 0 || removed.length > 0) {
      setSelectedItems(prev => {
        const next = { ...prev }
        added.forEach(k => { next[k] = true })
        removed.forEach(k => { delete next[k] })
        return next
      })
    }

    prevBasketRef.current = basket
  }, [basket])

  const handleItemSelect = (key) => {
    setSelectedItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSelectAll = () => {
    const allSelected = Object.values(selectedItems).every(v => v === true)
    const newSelected = {}
    basket.forEach(item => {
      const iId  = item.id || item._id
      const iSid = item.selectedSeller?.sellerId || item.selectedSeller?._id || ''
      const key  = iSid ? `${iId}_${iSid}` : iId
      newSelected[key] = !allSelected
    })
    setSelectedItems(newSelected)
  }
  const getSelectedCount = () => {
    return Object.values(selectedItems).filter(v => v === true).length
  }

  const getSelectedTotal = () => {
    let total = 0
    basket.forEach(item => {
      const iId  = item.id || item._id
      const iSid = item.selectedSeller?.sellerId || item.selectedSeller?._id || ''
      const key  = iSid ? `${iId}_${iSid}` : iId
      if (selectedItems[key]) {
        // Use local quantities map for up-to-date value (before debounce fires)
        const quantity = quantities[key] ?? item.quantity ?? 1
        const priceStr = typeof item.price === 'string' ? item.price : String(item.price)
        const price = parseFloat(priceStr.replace(/[£$₨€]/g, '').replace('د.إ', '').replace('Rs', '').trim()) || 0
        total += price * quantity
      }
    })
    return total
  }

  const getUserTypeLabel = () => {
    switch (userType) {
      case 'admin': return 'Admin'
      case 'seller': return 'Seller'
      case 'buyer': return 'Buyer'
      default: return 'Guest'
    }
  }

  const handleCheckout = async () => {
    // Only process selected items
    const selectedBasket = basket.filter(item => {
      const iId  = item.id || item._id
      const iSid = item.selectedSeller?.sellerId || item.selectedSeller?._id || ''
      const key  = iSid ? `${iId}_${iSid}` : iId
      return selectedItems[key] === true
    })

    if (selectedBasket.length === 0) {
      alert('Please select at least one item to proceed')
      return
    }

    // Get user information
    const buyerToken = localStorage.getItem('buyerToken')
    const sellerToken = localStorage.getItem('sellerToken')
    const adminToken = localStorage.getItem('adminToken')
    
    if (!buyerToken && !sellerToken && !adminToken) {
      alert('Please login to proceed with checkout')
      navigate('/login')
      return
    }

    try {
      // Fetch full product details for selected items only
      const productsWithSellers = await Promise.all(
        selectedBasket.map(async (item) => {
          try {
            const itemId = item.id || item._id
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/products/public/${itemId}`)
            if (response.ok) {
              const productData = await response.json()
              console.log(`✅ Product data received for ${item.name}:`, productData)
              return {
                ...item,
                sellers: productData.sellers || [],
                sellerInfo: productData.sellerInfo
              }
            }
            console.log(`⚠️ Failed to fetch product data for ${item.name}`)
            return item
          } catch (error) {
            console.error(`❌ Error fetching product ${item.name}:`, error)
            return item
          }
        })
      )

      // Group products by seller WhatsApp number
      const sellerGroups = {}
      let productsWithoutSeller = []

      console.log('🔍 Starting to group products by seller...')
      console.log('📦 Products with sellers data:', productsWithSellers)

      productsWithSellers.forEach((product) => {
        let sellerWhatsApp = null
        let sellerName = 'Seller'
        let sellerId = null

        // Priority 1: use the specific seller the buyer chose (from SellerInformation Add to Cart)
        if (product.selectedSeller?.whatsappNo) {
          sellerWhatsApp = product.selectedSeller.whatsappNo
          sellerName = product.selectedSeller.username || product.selectedSeller.businessName || 'Seller'
          sellerId = product.selectedSeller.sellerId || product.selectedSeller._id || null
        }
        // Priority 2: sellers array from API — pick lowest price
        else if (product.sellers && product.sellers.length > 0) {
          const lowestSeller = product.sellers.reduce((lowest, current) => {
            const ct = (parseFloat(current.sellerPrice) || 0) + (parseFloat(current.sellerShipping) || 0)
            const lt = (parseFloat(lowest.sellerPrice) || 0) + (parseFloat(lowest.sellerShipping) || 0)
            return ct < lt ? current : lowest
          })
          sellerWhatsApp = lowestSeller.whatsappNo
          sellerName = lowestSeller.username || 'Seller'
          sellerId = lowestSeller.sellerId || lowestSeller._id || null
        }
        // Priority 3: legacy sellerInfo
        else if (product.sellerInfo?.whatsappNo) {
          sellerWhatsApp = product.sellerInfo.whatsappNo
          sellerName = product.sellerInfo.username || 'Seller'
        }

        // Validate WhatsApp number — must have digits
        const cleanNo = (sellerWhatsApp || '').replace(/[^0-9+]/g, '')
        if (cleanNo.length >= 7) {
          if (!sellerGroups[cleanNo]) {
            sellerGroups[cleanNo] = { sellerName, sellerId, products: [] }
          }
          sellerGroups[cleanNo].products.push({ ...product, _resolvedSellerId: sellerId })
        } else {
          productsWithoutSeller.push(product)
        }
      })

      // Get user information
      let userName = 'User'
      let userEmail = ''
      let userPhone = ''
      let userType = 'Guest'

      if (buyerToken) {
        const buyerData = JSON.parse(localStorage.getItem('buyerData') || localStorage.getItem('buyer') || '{}')
        userName = buyerData.name || 
                   (buyerData.firstName && buyerData.lastName ? `${buyerData.firstName} ${buyerData.lastName}` : '') ||
                   buyerData.email?.split('@')[0] || 
                   'Buyer'
        userEmail = buyerData.email || ''
        userPhone = buyerData.phone || buyerData.whatsappNo || ''
        userType = 'Buyer'
      } else if (sellerToken) {
        const sellerData = JSON.parse(localStorage.getItem('seller') || '{}')
        userName = sellerData.username || sellerData.businessName || sellerData.name || 'Seller'
        userEmail = sellerData.email || ''
        userPhone = sellerData.whatsappNo || ''
        userType = 'Seller'
      } else if (adminToken) {
        const adminData = JSON.parse(localStorage.getItem('admin') || '{}')
        userName = adminData.username || adminData.name || 'Admin'
        userEmail = adminData.email || ''
        userType = 'Admin'
      }

      // If there are products without sellers, ask if they want to contact admin
      if (productsWithoutSeller.length > 0 && Object.keys(sellerGroups).length === 0) {
        const contactAdmin = window.confirm(
          `⚠️ The selected products don't have seller information.\n\nWould you like to send a quotation request to the Admin?`
        )
        
        if (contactAdmin) {
          alert('🚧 Admin quotation feature is under maintenance. Please try again later or contact support.')
          return
        } else {
          return
        }
      }

      // Send quotations to each seller
      let quotationsSent = 0
      console.log(`\n🚀 Starting to send quotations to ${Object.keys(sellerGroups).length} seller(s)...`)
      
      for (const [cleanWhatsApp, group] of Object.entries(sellerGroups)) {
        const { sellerName, products } = group

        // Calculate total for this seller
        let sellerTotal = 0
        const productsList = products.map(product => {
          const iId  = product.id || product._id
          const iSid = product.selectedSeller?.sellerId || product.selectedSeller?._id || ''
          const key  = iSid ? `${iId}_${iSid}` : iId
          const quantity = quantities[key] ?? product.quantity ?? 1
          const priceStr = typeof product.price === 'string' ? product.price : String(product.price)
          const price = parseFloat(priceStr.replace(/[£$₨€]/g, '').replace('د.إ', '').replace('Rs', '').trim()) || 0
          const subtotal = price * quantity
          sellerTotal += subtotal

          return `• ${product.name}\n  Qty: ${quantity} × ${formatPrice(price)} = ${formatPrice(subtotal)}`
        }).join('\n\n')

        // Format WhatsApp message
        const message = `
🛍️ *BULK QUOTATION REQUEST*

📦 *Products (${products.length} items):*
${productsList}

💰 *Total Amount: ${formatPrice(sellerTotal)}*

👤 *Buyer Information:*
• Name: ${userName}
• Type: ${userType}
• Email: ${userEmail}
${userPhone ? `• Phone: ${userPhone}` : ''}

📝 *Message:*
Hello ${sellerName}, I'm interested in purchasing these products from my basket. Please confirm availability and provide further details.

---
_This quotation was generated from PoundlandWholesale.com_
        `.trim()

        // Clean WhatsApp number (already cleaned as the key, but ensure)
        const finalWhatsApp = cleanWhatsApp.startsWith('+') ? cleanWhatsApp : `+${cleanWhatsApp}`
        
        // Save quotation to DB for each product in this seller group
        for (const product of products) {
          try {
            const lowestSeller = product.sellers?.length > 0
              ? product.sellers.reduce((lowest, current) => {
                  const ct = (parseFloat(current.sellerPrice) || 0) + (parseFloat(current.sellerShipping) || 0);
                  const lt = (parseFloat(lowest.sellerPrice) || 0) + (parseFloat(lowest.sellerShipping) || 0);
                  return ct < lt ? current : lowest;
                })
              : null;
            const sellerId = lowestSeller?.sellerId || lowestSeller?._id || null;
            const sellerPrice = lowestSeller?.sellerPrice || null;
            const productId = product._id || product.id;

            if (!productId) continue; // skip if no product ID

            await fetch(getApiUrl('sellers/quotation'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId,
                sellerId,
                sellerUsername: sellerName,
                sellerWhatsapp: cleanWhatsApp,
                buyerName: userName,
                buyerEmail: userEmail,
                buyerPhone: userPhone,
                quantity: (() => {
                  const iId  = product.id || product._id
                  const iSid = product.selectedSeller?.sellerId || product.selectedSeller?._id || ''
                  const key  = iSid ? `${iId}_${iSid}` : iId
                  return quantities[key] ?? product.quantity ?? 1
                })(),
                sellerPrice,
                message: `Basket checkout — ${products.length} product(s) in order to ${sellerName}`
              })
            });
          } catch (err) {
            console.error('Failed to save quotation for', product.name, err);
          }
        }

        // Create WhatsApp URL — strip everything except digits, then open
        const whatsappUrl = `https://wa.me/${finalWhatsApp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
        
        // Open WhatsApp in new tab with a small delay between each
        setTimeout(() => {
          window.open(whatsappUrl, '_blank')
        }, quotationsSent * 600)
        
        quotationsSent++
      }

      if (quotationsSent > 0) {
        alert(`✅ Quotation requests sent to ${quotationsSent} seller${quotationsSent > 1 ? 's' : ''}!\n\nPlease check your browser for the WhatsApp tabs.`)
      }

      // If there are products without sellers but some with sellers, notify user
      if (productsWithoutSeller.length > 0 && quotationsSent > 0) {
        setTimeout(() => {
          alert(`⚠️ Note: ${productsWithoutSeller.length} product${productsWithoutSeller.length > 1 ? 's' : ''} in your basket don't have seller information and were not included in the quotation.`)
        }, 1000)
      }

    } catch (error) {
      console.error('Error processing checkout:', error)
      alert('❌ An error occurred while processing your request. Please try again.')
    }
  }

  const totalItems = basket.reduce((sum, item) => {
    const iId  = item.id || item._id
    const iSid = item.selectedSeller?.sellerId || item.selectedSeller?._id || ''
    const key  = iSid ? `${iId}_${iSid}` : iId
    return sum + (quantities[key] ?? item.quantity ?? 1)
  }, 0)
  const selectedCount = getSelectedCount()
  const selectedTotal = getSelectedTotal()

  if (basket.length === 0) {
    return (
      <div className="basket-empty-container">
        <div className="basket-empty-content">
          <i className="fas fa-shopping-basket basket-empty-icon"></i>
          <h2 className="basket-empty-title">Your Basket is Empty</h2>
          <p className="basket-empty-text">
            Start adding products to your basket to see them here
          </p>
          <Link to="/" className="basket-continue-shopping-btn">
            Continue Shopping
          </Link>
        </div>
        <ScrollToTop />
      </div>
    )
  }

  return (
    <>
      {/* Animation styles */}
      <style>
        {`
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
          
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
        `}
      </style>
      
      <div className="basket-page-wrapper">
        {/* Update Notification */}
        {basketUpdated && (
          <div className="basket-update-notification">
            <i className="fas fa-check-circle"></i>
            <span>Basket updated!</span>
          </div>
        )}
        
        {/* Amazon-style Header with Basket Icon */}
        <div className="basket-header">
          <div className="basket-header-content">
            {/* Basket Icon with Count */}
            <div className="basket-header-left">
              <div className="basket-icon-container">
                <i className="fas fa-shopping-basket basket-header-icon"></i>
                <span className="basket-header-count">
                  {totalItems}
                </span>
              </div>
              <div className="basket-header-title-section">
                <h1 className="basket-header-title">
                  Shopping Cart
                </h1>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="basket-deselect-btn"
                >
                  Deselect all items
                </button>
              </div>
            </div>
            <div className="basket-header-price">
              Price
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="basket-main-content">
          <div className="basket-grid" style={{ gridTemplateColumns: window.innerWidth < 992 ? '1fr' : '2fr 1fr' }}>
            
            {/* Left: Cart Items */}
            <div className="basket-items-section">
              {/* Select All Bar */}
              <div className="basket-select-all-bar">
                <div className="basket-select-all-left">
                  <input 
                    type="checkbox" 
                    className="basket-select-all-checkbox"
                    checked={selectedCount === basket.length && basket.length > 0}
                    onChange={handleSelectAll}
                  />
                  <span className="basket-select-all-text">
                    Select all items
                  </span>
                  <button className="basket-select-all-action">
                    {selectedCount > 0 ? `Selected ${selectedCount} items` : ''}
                  </button>
                </div>
                <div className="basket-select-all-right">
                  {selectedCount > 0 && (
                    <button className="basket-delete-selected-btn">
                      Delete selected
                    </button>
                  )}
                </div>
              </div>

              {basket.map((item, index) => {
                const itemId  = item.id || item._id;
                const sellerId = item.selectedSeller?.sellerId || item.selectedSeller?._id || '';
                const basketKey = sellerId ? `${itemId}_${sellerId}` : itemId;
                return (
                <div 
                  key={basketKey}
                  className="basket-item-card"
                >
                  <div className="basket-item-content">
                    {/* Checkbox */}
                    <input 
                      type="checkbox" 
                      className="basket-item-checkbox"
                      checked={selectedItems[basketKey] || false}
                      onChange={() => handleItemSelect(basketKey)}
                    />

                    {/* Product Image */}
                    <div 
                      onClick={() => {
                        const params = new URLSearchParams({
                          name: item.name,
                          img: item.image,
                          price: item.price.replace(/[£$₨]/g, ''),
                          rating: item.rating || 4.5,
                          reviews: item.reviews || 0,
                          category: item.category || 'General',
                          brand: item.brand || '',
                          discount: item.discount || 0
                        })
                        navigate(`/product/${itemId}?${params.toString()}`)
                      }}
                      className="basket-item-image-container"
                    >
                      {item.image ? (
                        <MobileImage
                          src={item.image}
                          alt={item.name}
                          className="basket-item-image"
                        />
                      ) : (
                        <img 
                          src="https://via.placeholder.com/140x140?text=No+Image"
                          alt="No image available"
                          className="basket-item-image"
                        />
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="basket-item-details">
                      <h3 
                        onClick={() => {
                          const params = new URLSearchParams({
                            name: item.name,
                            img: item.image,
                            price: item.price.replace(/[£$₨]/g, ''),
                            rating: item.rating || 4.5,
                            reviews: item.reviews || 0,
                            category: item.category || 'General',
                            brand: item.brand || '',
                            discount: item.discount || 0
                          })
                          navigate(`/product/${itemId}?${params.toString()}`)
                        }}
                        className="basket-item-name"
                      >
                        {item.name}
                      </h3>

                      {item.sku && (
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '2px 0 4px', fontFamily: 'monospace' }}>
                          SKU: {item.sku}
                        </p>
                      )}

                      {item.selectedSeller && (
                        <p style={{ fontSize: '0.75rem', color: '#059669', margin: '2px 0 4px', fontWeight: 600 }}>
                          Seller: {item.selectedSeller.username || item.selectedSeller.businessName || '—'}
                        </p>
                      )}

                      {item.stock && item.stock < 10 && (
                        <p className="basket-item-stock-warning">
                          Only {item.stock} left in stock.
                        </p>
                      )}

                      {item.category && (
                        <p className="basket-item-category">
                          Category: {item.category}
                        </p>
                      )}

                      {/* Gift checkbox */}
                      <div className="basket-gift-option">
                        <label className="basket-gift-label">
                          <input type="checkbox" className="basket-gift-checkbox" />
                          <span className="basket-gift-text">
                            This will be a gift <span className="basket-gift-learn-more">Learn more</span>
                          </span>
                        </label>
                      </div>

                      {/* Item Package Quantity — shows actual MOQ */}
                      <div className="basket-package-quantity">
                        <span>
                          Min Order Qty (MOQ): <strong>{item.lowestMoq || item.selectedSeller?.moq || 1}</strong>
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="basket-item-actions">
                        {/* Quantity Selector */}
                        {(() => {
                          const moq = item.lowestMoq || item.selectedSeller?.moq || 1
                          const currentQty = quantities[basketKey] ?? (item.quantity || moq)
                          return (
                            <div className="basket-quantity-selector">
                              <button
                                onClick={() => handleQtyChange(basketKey, itemId, sellerId, Math.max(moq, currentQty - 1))}
                                className="basket-quantity-btn basket-quantity-minus"
                                disabled={currentQty <= moq}
                                title={currentQty <= moq ? `Minimum order is ${moq}` : ''}
                                style={{ opacity: currentQty <= moq ? 0.4 : 1, cursor: currentQty <= moq ? 'not-allowed' : 'pointer' }}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                value={currentQty}
                                min={moq}
                                onChange={e => {
                                  const val = parseInt(e.target.value) || moq
                                  handleQtyChange(basketKey, itemId, sellerId, Math.max(moq, val))
                                }}
                                onBlur={e => {
                                  const val = parseInt(e.target.value) || moq
                                  handleQtyChange(basketKey, itemId, sellerId, Math.max(moq, val))
                                }}
                                style={{
                                  width: '56px', textAlign: 'center', fontWeight: 700,
                                  fontSize: '0.9rem', border: '1px solid #d1d5db',
                                  borderRadius: '4px', padding: '2px 4px',
                                  MozAppearance: 'textfield', WebkitAppearance: 'none'
                                }}
                              />
                              <button
                                onClick={() => handleQtyChange(basketKey, itemId, sellerId, currentQty + 1)}
                                className="basket-quantity-btn basket-quantity-plus"
                              >
                                +
                              </button>
                            </div>
                          )
                        })()}

                        <span className="basket-action-separator">|</span>

                        <button
                          onClick={() => removeFromBasket(itemId, sellerId)}
                          className="basket-action-btn basket-delete-btn"
                        >
                          Delete
                        </button>

                        <span className="basket-action-separator">|</span>

                        <button className="basket-action-btn basket-save-btn">
                          Save for later
                        </button>

                        {window.innerWidth > 768 && (
                          <>
                            <span className="basket-action-separator">|</span>
                            <button className="basket-action-btn basket-more-btn">
                              See more like this
                            </button>

                            <span className="basket-action-separator">|</span>

                            <button className="basket-action-btn basket-share-btn">
                              Share
                            </button>
                          </>
                        )}
                      </div>

                      {/* Mobile-only action buttons */}
                      {window.innerWidth <= 768 && (
                        <div className="basket-mobile-actions">
                          <button className="basket-action-btn basket-more-btn">
                            See more like this
                          </button>
                          <span className="basket-action-separator">|</span>
                          <button className="basket-action-btn basket-share-btn">
                            Share
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="basket-item-price">
                      {(() => {
                        if (typeof item.price === 'string' && item.price.includes('£') && currency === 'GBP') {
                          return item.price;
                        }
                        return formatPrice(item.price);
                      })()}
                    </div>
                  </div>
                </div>
                )
              })}

              {/* Subtotal at bottom */}
              <div className="basket-subtotal-bottom">
                <span className="basket-subtotal-text">
                  Subtotal ({selectedCount} items): 
                </span>
                <span className="basket-subtotal-value">
                  {currency === 'GBP' ? `£${selectedTotal.toFixed(2)}` : formatPrice(selectedTotal.toFixed(2))}
                </span>
              </div>
            </div>

            {/* Right: Sticky Sidebar */}
            <div className="basket-sidebar">
              <div className="basket-summary-card">
                {/* Subtotal */}
                <div className="basket-summary-subtotal">
                  <div className="basket-subtotal-row">
                    <span>Subtotal ({selectedCount} items): </span>
                    <span className="basket-subtotal-amount">
                      {currency === 'GBP' ? `£${selectedTotal.toFixed(2)}` : formatPrice(selectedTotal.toFixed(2))}
                    </span>
                  </div>
                  <label className="basket-gift-checkbox-label">
                    <input type="checkbox" className="basket-gift-checkbox-input" />
                    <span className="basket-gift-checkbox-text">
                      This order contains a gift
                    </span>
                  </label>
                </div>

                {/* Proceed to Checkout Button */}
                <button
                  onClick={handleCheckout}
                  className="basket-checkout-btn"
                  disabled={selectedCount === 0}
                >
                  Proceed to checkout
                </button>

                {/* EMI Available */}
                <div className="basket-emi-info">
                  <i className="fas fa-credit-card"></i>
                  <span>EMI available</span>
                </div>
              </div>

              {/* Customers who shopped section */}
              <div className="basket-related-section">
                <h3 className="basket-related-title">
                  Customers who shopped for items in your cart also shopped for:
                </h3>
                <div className="basket-related-content">
                  <p>Related products will appear here</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Clear Confirmation Modal */}
        {showClearConfirm && (
          <div 
            className="basket-modal-overlay"
            onClick={() => setShowClearConfirm(false)}
          >
            <div 
              className="basket-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="basket-modal-title">
                Clear Basket?
              </h3>
              <p className="basket-modal-text">
                Are you sure you want to remove all items from your basket?
              </p>
              <div className="basket-modal-actions">
                <button 
                  onClick={() => setShowClearConfirm(false)}
                  className="basket-modal-btn basket-modal-cancel"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    clearBasket()
                    setShowClearConfirm(false)
                  }}
                  className="basket-modal-btn basket-modal-confirm"
                >
                  Clear Basket
                </button>
              </div>
            </div>
          </div>
        )}

        <ScrollToTop />
      </div>
    </>
  )
}

export default Basket
