import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBasket } from '../context/BasketContext'
import { useCurrency } from '../context/CurrencyContext'
import { getImageUrl } from '../utils/imageImports'
import { optimizeImageUrl } from '../utils/imageOptimization'
import MobileImage from '../components/MobileImage'
import ScrollToTop from '../components/ScrollToTop'
import '../styles/basket-responsive.css'

const Basket = () => {
  const navigate = useNavigate()
  const { basket, userType, removeFromBasket, updateQuantity, clearBasket, getBasketTotal } = useBasket()
  const { formatPrice, currency } = useCurrency()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [localBasket, setLocalBasket] = useState(basket)
  const [basketUpdated, setBasketUpdated] = useState(false)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [selectedItems, setSelectedItems] = useState({})

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Update local basket whenever context basket changes
  useEffect(() => {
    console.log('🔄 Basket updated:', basket)
    setLocalBasket(basket)
    
    // Initialize selected items
    const initialSelected = {}
    basket.forEach(item => {
      const itemId = item.id || item._id
      initialSelected[itemId] = true
    })
    setSelectedItems(initialSelected)
    
    // Show update notification briefly
    if (basket.length > 0) {
      setBasketUpdated(true)
      setTimeout(() => setBasketUpdated(false), 2000)
    }
  }, [basket])

  // Also listen to localStorage changes (for cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === `basket_${userType}`) {
        console.log('📦 Basket changed in localStorage')
        try {
          const newBasket = JSON.parse(e.newValue || '[]')
          setLocalBasket(newBasket)
        } catch (error) {
          console.error('Error parsing basket from localStorage:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [userType])

  const handleItemSelect = (itemId) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const handleSelectAll = () => {
    const allSelected = Object.values(selectedItems).every(value => value === true)
    const newSelected = {}
    localBasket.forEach(item => {
      const itemId = item.id || item._id
      newSelected[itemId] = !allSelected
    })
    setSelectedItems(newSelected)
  }

  const getSelectedCount = () => {
    return Object.values(selectedItems).filter(value => value === true).length
  }

  const getSelectedTotal = () => {
    let total = 0
    localBasket.forEach(item => {
      const itemId = item.id || item._id
      if (selectedItems[itemId]) {
        const quantity = item.quantity || 1
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
    console.log('\n🛒 ========== CHECKOUT STARTED ==========')
    console.log('📦 Local Basket:', localBasket)
    console.log(`   Total products in basket: ${localBasket.length}`)
    localBasket.forEach((item, idx) => {
      const itemId = item.id || item._id
      console.log(`   ${idx + 1}. ${item.name} (ID: ${itemId}, Qty: ${item.quantity || 1})`)
    })
    console.log('==========================================\n')
    
    if (localBasket.length === 0) {
      alert('Your basket is empty')
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
      // Fetch full product details for all basket items to get seller information
      const productsWithSellers = await Promise.all(
        localBasket.map(async (item) => {
          try {
            const itemId = item.id || item._id
            console.log(`📡 Fetching product data for: ${item.name} (ID: ${itemId})`)
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

      productsWithSellers.forEach((product, index) => {
        console.log(`\n--- Processing Product ${index + 1}: ${product.name} ---`)
        let sellerWhatsApp = null
        let sellerName = 'Seller'

        // Check if product has sellers array
        if (product.sellers && product.sellers.length > 0) {
          console.log(`✅ Product has ${product.sellers.length} seller(s) in array`)
          // Get the seller with the lowest price
          const lowestSeller = product.sellers.reduce((lowest, current) => {
            const currentTotal = (parseFloat(current.sellerPrice) || 0) + (parseFloat(current.sellerShipping) || 0)
            const lowestTotal = (parseFloat(lowest.sellerPrice) || 0) + (parseFloat(lowest.sellerShipping) || 0)
            return currentTotal < lowestTotal ? current : lowest
          })
          
          sellerWhatsApp = lowestSeller.whatsappNo
          sellerName = lowestSeller.username || 'Seller'
          console.log(`📱 Selected seller: ${sellerName} (${sellerWhatsApp})`)
        } 
        // Check if product has sellerInfo
        else if (product.sellerInfo && product.sellerInfo.whatsappNo) {
          console.log('✅ Product has sellerInfo')
          sellerWhatsApp = product.sellerInfo.whatsappNo
          sellerName = product.sellerInfo.username || 'Seller'
          console.log(`📱 Seller from sellerInfo: ${sellerName} (${sellerWhatsApp})`)
        } else {
          console.log('❌ No seller information found for this product')
        }

        if (sellerWhatsApp) {
          if (!sellerGroups[sellerWhatsApp]) {
            console.log(`🆕 Creating new group for seller: ${sellerName}`)
            sellerGroups[sellerWhatsApp] = {
              sellerName,
              products: []
            }
          } else {
            console.log(`➕ Adding to existing group for seller: ${sellerName}`)
          }
          sellerGroups[sellerWhatsApp].products.push(product)
        } else {
          console.log('⚠️ Adding to products without seller list')
          productsWithoutSeller.push(product)
        }
      })

      console.log('\n📊 Final Grouping Results:')
      console.log(`Total seller groups: ${Object.keys(sellerGroups).length}`)
      console.log('Seller groups:', sellerGroups)
      console.log(`Products without seller: ${productsWithoutSeller.length}`)
      console.log('---\n')

      // Get user information
      let userName = 'User'
      let userEmail = ''
      let userPhone = ''
      let userType = 'Guest'

      if (buyerToken) {
        const buyerData = JSON.parse(localStorage.getItem('buyer') || '{}')
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
      
      for (const [whatsappNo, group] of Object.entries(sellerGroups)) {
        const { sellerName, products } = group
        console.log(`\n📤 Preparing quotation for: ${sellerName} (${whatsappNo})`)
        console.log(`   Products: ${products.length}`)

        // Calculate total for this seller
        let sellerTotal = 0
        const productsList = products.map(product => {
          const quantity = product.quantity || 1
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

        // Clean WhatsApp number
        const cleanWhatsApp = whatsappNo.replace(/[^0-9+]/g, '')
        console.log(`   Cleaned WhatsApp: ${cleanWhatsApp}`)
        
        // Create WhatsApp URL
        const whatsappUrl = `https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(message)}`
        console.log(`   Opening WhatsApp tab in ${quotationsSent * 500}ms...`)
        
        // Open WhatsApp in new tab with a small delay between each
        setTimeout(() => {
          console.log(`✅ Opening WhatsApp for ${sellerName}`)
          window.open(whatsappUrl, '_blank')
        }, quotationsSent * 500) // 500ms delay between each window
        
        quotationsSent++
      }

      console.log(`\n✅ Total quotations sent: ${quotationsSent}`)

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

  const totalItems = localBasket.reduce((sum, item) => sum + (item.quantity || 1), 0)
  const selectedCount = getSelectedCount()
  const selectedTotal = getSelectedTotal()

  if (localBasket.length === 0) {
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
                    checked={selectedCount === localBasket.length && localBasket.length > 0}
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

              {localBasket.map((item, index) => {
                const itemId = item.id || item._id
                return (
                <div 
                  key={itemId}
                  className="basket-item-card"
                >
                  <div className="basket-item-content">
                    {/* Checkbox */}
                    <input 
                      type="checkbox" 
                      className="basket-item-checkbox"
                      checked={selectedItems[itemId] || false}
                      onChange={() => handleItemSelect(itemId)}
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

                      {/* Item Package Quantity */}
                      <div className="basket-package-quantity">
                        <span>
                          Item Package Quantity: <strong>1</strong>
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="basket-item-actions">
                        {/* Quantity Selector */}
                        <div className="basket-quantity-selector">
                          <button
                            onClick={() => updateQuantity(itemId, Math.max(1, (item.quantity || 1) - 1))}
                            className="basket-quantity-btn basket-quantity-minus"
                          >
                            −
                          </button>
                          <span className="basket-quantity-value">
                            {item.quantity || 1}
                          </span>
                          <button
                            onClick={() => updateQuantity(itemId, (item.quantity || 1) + 1)}
                            className="basket-quantity-btn basket-quantity-plus"
                          >
                            +
                          </button>
                        </div>

                        <span className="basket-action-separator">|</span>

                        <button
                          onClick={() => removeFromBasket(itemId)}
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