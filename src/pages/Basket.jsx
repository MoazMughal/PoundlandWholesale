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
  const { basket, userType, removeFromBasket, updateQuantity, clearBasket, getBasketTotal, addToBasket } = useBasket()
  const { formatPrice, currency } = useCurrency()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [basketUpdated, setBasketUpdated] = useState(false)
  const [whatsappLinks, setWhatsappLinks] = useState([]) // seller quotation links modal
  const [showOrderSummary, setShowOrderSummary] = useState(false)
  const [orderSummaryData, setOrderSummaryData] = useState(null)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [selectedItems, setSelectedItems] = useState({})
  const [savedForLater, setSavedForLater] = useState(() => {
    try { return JSON.parse(localStorage.getItem('savedForLater') || '[]') } catch { return [] }
  })
  const [shareModal, setShareModal] = useState({ open: false, url: '', name: '' })
  const [relatedProducts, setRelatedProducts] = useState([])
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [relatedTitle, setRelatedTitle] = useState('')
  const [showRelated, setShowRelated] = useState(false)

  const handleSaveForLater = (item, itemId, sellerId) => {
    const updated = [...savedForLater.filter(s => (s.id || s._id) !== itemId), item]
    setSavedForLater(updated)
    localStorage.setItem('savedForLater', JSON.stringify(updated))
    removeFromBasket(itemId, sellerId)
  }

  const handleMoveSelectedToSaved = () => {
    const selectedBasket = basket.filter(item => {
      const iId  = item.id || item._id
      const iSid = item.selectedSeller?.sellerId || item.selectedSeller?._id || ''
      const key  = iSid ? `${iId}_${iSid}` : iId
      return selectedItems[key] === true
    })
    if (selectedBasket.length === 0) return
    const updated = [...savedForLater]
    selectedBasket.forEach(item => {
      const iId = item.id || item._id
      if (!updated.find(s => (s.id || s._id) === iId)) updated.push(item)
      const iSid = item.selectedSeller?.sellerId || item.selectedSeller?._id || ''
      removeFromBasket(iId, iSid)
    })
    setSavedForLater(updated)
    localStorage.setItem('savedForLater', JSON.stringify(updated))
    setSelectedItems({})
  }

  const handleMoveToBasket = (item) => {
    addToBasket({ ...item, quantity: 1 })
    const updated = savedForLater.filter(s => (s.id || s._id) !== (item.id || item._id))
    setSavedForLater(updated)
    localStorage.setItem('savedForLater', JSON.stringify(updated))
  }

  const handleShare = (item, itemId) => {
    const productUrl = `${window.location.origin}/product/${itemId}`
    setShareModal({ open: true, url: productUrl, name: item.name })
  }

  const getShareLinks = (url, name) => {
    const encoded = encodeURIComponent(url)
    const text = encodeURIComponent(`Check out: ${name} - ${url}`)
    return {
      whatsapp: `https://wa.me/?text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      twitter: `https://twitter.com/intent/tweet?url=${encoded}&text=${encodeURIComponent(name)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
      email: `mailto:?subject=${encodeURIComponent(name)}&body=${text}`,
    }
  }

  const fetchRelated = async (item) => {
    setRelatedLoading(true)
    setShowRelated(true)
    setRelatedTitle(`More like "${item.name?.slice(0, 40)}..."`)
    try {
      const category = item.category || ''
      const name = item.name || ''
      // Search by category first, fallback to name keywords
      const keyword = category || name.split(' ').slice(0, 2).join(' ')
      const params = new URLSearchParams({
        isAmazonsChoice: 'true',
        limit: '8',
        page: '1',
        hasSellerListings: 'true',
      })
      if (category) params.append('category', category)
      else params.append('search', keyword)
      const res = await fetch(`${getApiUrl('products/public')}?${params}`)
      const data = await res.json()
      // Exclude items already in basket
      const basketIds = new Set(basket.map(b => b.id || b._id))
      const filtered = (data.products || []).filter(p => !basketIds.has(p._id))
      setRelatedProducts(filtered.slice(0, 8))
    } catch {
      setRelatedProducts([])
    } finally {
      setRelatedLoading(false)
    }
  }

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

  const handleCheckout = async (preOpenedTabs = []) => {
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
      const whatsappUrls = []
      
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

        // Create WhatsApp URL
        const whatsappUrl = `https://wa.me/${finalWhatsApp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
        whatsappUrls.push({
          url: whatsappUrl,
          sellerName,
          productCount: products.length,
          items: products.map(product => {
            const iId  = product.id || product._id
            const iSid = product.selectedSeller?.sellerId || product.selectedSeller?._id || ''
            const key  = iSid ? `${iId}_${iSid}` : iId
            return {
              name: product.name,
              qty: quantities[key] ?? product.quantity ?? 1
            }
          })
        })
        quotationsSent++
      }

      if (quotationsSent > 0) {
        // Show order summary modal first, then WhatsApp links on confirm
        const selectedBasket = basket.filter(item => {
          const iId  = item.id || item._id
          const iSid = item.selectedSeller?.sellerId || item.selectedSeller?._id || ''
          const key  = iSid ? `${iId}_${iSid}` : iId
          return selectedItems[key] === true
        })
        let grandTotal = 0
        const summaryItems = selectedBasket.map(item => {
          const iId  = item.id || item._id
          const iSid = item.selectedSeller?.sellerId || item.selectedSeller?._id || ''
          const key  = iSid ? `${iId}_${iSid}` : iId
          const qty = quantities[key] ?? item.quantity ?? 1
          const priceStr = typeof item.price === 'string' ? item.price : String(item.price)
          const price = parseFloat(priceStr.replace(/[£$₨€]/g, '').replace('د.إ','').replace('Rs','').trim()) || 0
          const subtotal = price * qty
          const sellerName = item.selectedSeller?.username || item.selectedSeller?.businessName || item.sellerInfo?.username || '—'
          grandTotal += subtotal
          return { name: item.name, image: item.image || item.images?.[0] || '', qty, price, subtotal, sellerName }
        })
        setOrderSummaryData({ items: summaryItems, grandTotal, whatsappUrls, userName, userEmail, userPhone })
        setShowOrderSummary(true)
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
                    <>
                      <button className="basket-delete-selected-btn"
                        onClick={() => {
                          const selectedBasket = basket.filter(item => {
                            const iId  = item.id || item._id
                            const iSid = item.selectedSeller?.sellerId || item.selectedSeller?._id || ''
                            return selectedItems[iSid ? `${iId}_${iSid}` : iId] === true
                          })
                          selectedBasket.forEach(item => {
                            const iId  = item.id || item._id
                            const iSid = item.selectedSeller?.sellerId || item.selectedSeller?._id || ''
                            removeFromBasket(iId, iSid)
                          })
                          setSelectedItems({})
                        }}>
                        Delete selected
                      </button>
                      <button
                        onClick={handleMoveSelectedToSaved}
                        style={{ background: 'none', border: 'none', color: '#059669', fontSize: '13px', cursor: 'pointer', fontWeight: '600', marginLeft: '12px', textDecoration: 'underline' }}>
                        Save selected for later
                      </button>
                    </>
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
                        const priceVal = typeof item.price === 'string' ? item.price.replace(/[£$₨€]/g, '') : String(item.price || 0)
                        const params = new URLSearchParams({
                          name: item.name,
                          img: item.image || item.images?.[0] || '',
                          price: priceVal,
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
                      {(() => {
                        const imgSrc = item.image || item.images?.[0] || ''
                        return imgSrc ? (
                          <MobileImage
                            src={imgSrc}
                            alt={item.name}
                            className="basket-item-image"
                          />
                        ) : (
                          <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#f5f5f5',borderRadius:'4px',fontSize:'0.65rem',color:'#999',textAlign:'center',padding:'8px'}}>
                            No image
                          </div>
                        )
                      })()}
                    </div>

                    {/* Product Details */}
                    <div className="basket-item-details">
                      <h3 
                        onClick={() => {
                          const priceVal = typeof item.price === 'string' ? item.price.replace(/[£$₨€]/g, '') : String(item.price || 0)
                          const params = new URLSearchParams({
                            name: item.name,
                            img: item.image || item.images?.[0] || '',
                            price: priceVal,
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

                      {item.stock > 0 && item.stock < 10 && (
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
                                  width: '90px', textAlign: 'center', fontWeight: 700,
                                  fontSize: '0.9rem', border: '1px solid #d1d5db',
                                  borderRadius: '4px', padding: '4px 8px',
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

                        <button className="basket-action-btn basket-save-btn"
                          onClick={() => handleSaveForLater(item, itemId, sellerId)}>
                          Save for later
                        </button>

                        {window.innerWidth > 768 && (
                          <>
                            <span className="basket-action-separator">|</span>
                            <button className="basket-action-btn basket-more-btn"
                              onClick={() => fetchRelated(item)}>
                              See more like this
                            </button>

                            <span className="basket-action-separator">|</span>

                            <button className="basket-action-btn basket-share-btn"
                              onClick={() => handleShare(item, itemId)}>
                              Share
                            </button>
                          </>
                        )}
                      </div>

                      {/* Mobile-only action buttons */}
                      {window.innerWidth <= 768 && (
                        <div className="basket-mobile-actions">
                          <button className="basket-action-btn basket-more-btn"
                            onClick={() => fetchRelated(item)}>
                            See more like this
                          </button>
                          <span className="basket-action-separator">|</span>
                          <button className="basket-action-btn basket-share-btn"
                            onClick={() => handleShare(item, itemId)}>
                            Share
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="basket-item-price">
                      {(() => {
                        const p = item.price
                        if (typeof p === 'number') return formatPrice(p)
                        if (typeof p === 'string') {
                          // Already formatted with currency symbol — return as-is if GBP matches
                          if (p.includes('£') && currency === 'GBP') return p
                          if (p.includes('Rs') && currency === 'PKR') return p
                          if (p.includes('$') && currency === 'USD') return p
                          // Strip and reformat
                          const num = parseFloat(p.replace(/[£$₨€]/g, '').replace('د.إ','').replace('Rs','').trim())
                          return isNaN(num) ? p : formatPrice(num)
                        }
                        return formatPrice(0)
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
                  onClick={() => handleCheckout()}
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
                  {showRelated ? relatedTitle : 'Customers who shopped for items in your cart also shopped for:'}
                </h3>
                <div className="basket-related-content">
                  {!showRelated && <p style={{fontSize:'0.8rem',color:'#666'}}>Click "See more like this" on any item to see suggestions.</p>}
                  {relatedLoading && <p style={{fontSize:'0.8rem',color:'#666'}}>Loading suggestions...</p>}
                  {showRelated && !relatedLoading && relatedProducts.length === 0 && (
                    <p style={{fontSize:'0.8rem',color:'#666'}}>No related products found.</p>
                  )}
                  {showRelated && !relatedLoading && relatedProducts.length > 0 && (
                    <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                      {relatedProducts.map((p) => {
                        const img = p.images?.[0] || p.image || ''
                        const price = p.price || 0
                        const priceStr = String(price)
                        const params = new URLSearchParams({
                          name: p.name || '',
                          img,
                          price: priceStr,
                          rating: p.rating || 4.5,
                          reviews: p.reviews || 0,
                          category: p.category || '',
                          brand: p.brand || '',
                          discount: p.discount || 0
                        })
                        const productUrl = `/product/${p._id}?${params.toString()}`
                        return (
                          <div key={p._id} style={{display:'flex',gap:'10px',alignItems:'center',padding:'8px',background:'#f9f9f9',borderRadius:'8px',border:'1px solid #e5e7eb'}}>
                            <Link to={productUrl} style={{flexShrink:0}}>
                              {img ? (
                                <img src={img} alt={p.name}
                                  style={{width:'60px',height:'60px',objectFit:'contain',borderRadius:'4px',background:'#fff',border:'1px solid #eee'}}
                                  onError={e => { e.target.style.display='none' }} />
                              ) : (
                                <div style={{width:'60px',height:'60px',background:'#f0f0f0',borderRadius:'4px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.6rem',color:'#999'}}>No img</div>
                              )}
                            </Link>
                            <div style={{flex:1,minWidth:0}}>
                              <Link to={productUrl} style={{textDecoration:'none'}}>
                                <div style={{fontSize:'0.72rem',fontWeight:'600',color:'#111',overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',marginBottom:'3px',lineHeight:'1.3'}}>
                                  {p.name}
                                </div>
                              </Link>
                              <div style={{fontSize:'0.78rem',fontWeight:'700',color:'#B12704',marginBottom:'5px'}}>
                                {formatPrice(price)}
                              </div>
                              <button
                                onClick={() => addToBasket({
                                  ...p,
                                  id: p._id,
                                  image: img,
                                  price: price, // store as raw number — basket display handles formatting
                                  quantity: 1
                                })}
                                style={{fontSize:'0.65rem',padding:'4px 10px',background:'#ff9900',border:'none',borderRadius:'4px',fontWeight:'700',cursor:'pointer',color:'#111',display:'flex',alignItems:'center',gap:'4px'}}>
                                <i className="fas fa-cart-plus"></i>Add to Cart
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Saved for Later Section */}
        {savedForLater.length > 0 && (
          <div style={{ maxWidth: '900px', margin: '20px auto', padding: '0 15px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f1111', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
              <i className="fas fa-bookmark" style={{ color: '#ff9900', marginRight: '8px' }}></i>
              Saved for Later ({savedForLater.length})
            </h3>
            {savedForLater.map((item) => {
              const sid = item.id || item._id
              const img = item.image || item.images?.[0] || ''
              return (
                <div key={sid} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '10px' }}>
                  {img && <img src={img} alt={item.name} style={{ width: '70px', height: '70px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #eee', flexShrink: 0 }} onError={e => e.target.style.display='none'} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#007185', marginBottom: '4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.name}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#B12704', marginBottom: '8px' }}>{typeof item.price === 'number' ? formatPrice(item.price) : item.price}</div>
                    <button onClick={() => handleMoveToBasket(item)}
                      style={{ fontSize: '0.75rem', padding: '5px 12px', background: '#ff9900', border: 'none', borderRadius: '4px', fontWeight: '700', cursor: 'pointer', color: '#111', marginRight: '8px' }}>
                      Move to Cart
                    </button>
                    <button onClick={() => { const u = savedForLater.filter(s => (s.id||s._id) !== sid); setSavedForLater(u); localStorage.setItem('savedForLater', JSON.stringify(u)) }}
                      style={{ fontSize: '0.75rem', padding: '5px 12px', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: '600' }}>
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Share Modal */}
        {shareModal.open && (
          <div onClick={() => setShareModal({ open: false, url: '', name: '' })}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>Share this product</h3>
                <button onClick={() => setShareModal({ open: false, url: '', name: '' })}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#666' }}>✕</button>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shareModal.name}</p>
              {/* Copy link */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input readOnly value={shareModal.url} style={{ flex: 1, padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.75rem', color: '#374151' }} />
                <button onClick={() => { navigator.clipboard.writeText(shareModal.url); alert('Link copied!') }}
                  style={{ padding: '8px 12px', background: '#ff9900', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer' }}>
                  Copy
                </button>
              </div>
              {/* Social platforms */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25d366', href: getShareLinks(shareModal.url, shareModal.name).whatsapp },
                  { label: 'Facebook', icon: 'fab fa-facebook', color: '#1877f2', href: getShareLinks(shareModal.url, shareModal.name).facebook },
                  { label: 'Twitter / X', icon: 'fab fa-twitter', color: '#1da1f2', href: getShareLinks(shareModal.url, shareModal.name).twitter },
                  { label: 'LinkedIn', icon: 'fab fa-linkedin', color: '#0a66c2', href: getShareLinks(shareModal.url, shareModal.name).linkedin },
                  { label: 'Email', icon: 'fas fa-envelope', color: '#6b7280', href: getShareLinks(shareModal.url, shareModal.name).email },
                ].map(({ label, icon, color, href }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: color, color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: '600' }}>
                    <i className={icon} style={{ fontSize: '1rem' }}></i>
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Order Summary Modal */}
        {showOrderSummary && orderSummaryData && (
          <div onClick={() => setShowOrderSummary(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ background: 'linear-gradient(135deg, #ff9900, #ff7700)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: '700', fontSize: '1rem' }}>
                    <i className="fas fa-receipt" style={{ marginRight: '8px' }}></i>Order Summary
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem' }}>Review before sending to seller</div>
                </div>
                <button onClick={() => setShowOrderSummary(false)}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: '#fff', fontSize: '1rem' }}>✕</button>
              </div>

              {/* Items */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '16px' }}>
                {/* Buyer info */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: '700', color: '#166534', marginBottom: '4px' }}>
                    <i className="fas fa-user" style={{ marginRight: '6px' }}></i>Buyer: {orderSummaryData.userName}
                  </div>
                  {orderSummaryData.userEmail && <div style={{ color: '#374151' }}>Email: {orderSummaryData.userEmail}</div>}
                  {orderSummaryData.userPhone && <div style={{ color: '#374151' }}>Phone: {orderSummaryData.userPhone}</div>}
                </div>

                {/* Product list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                  {orderSummaryData.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      {item.image && <img src={item.image} alt={item.name} style={{ width: '50px', height: '50px', objectFit: 'contain', borderRadius: '4px', background: '#fff', border: '1px solid #eee', flexShrink: 0 }} onError={e => e.target.style.display='none'} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: '600', color: '#111', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: '4px' }}>{item.name}</div>
                        {item.sellerName && item.sellerName !== '—' && (
                          <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: '600', marginBottom: '3px' }}>
                            <i className="fas fa-store" style={{ marginRight: '4px', fontSize: '0.65rem' }}></i>
                            {item.sellerName}
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280' }}>
                          <span>Qty: <strong style={{ color: '#111' }}>{item.qty}</strong> × {formatPrice(item.price)}</span>
                          <span style={{ fontWeight: '700', color: '#B12704' }}>{formatPrice(item.subtotal)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grand total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', marginBottom: '14px' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#92400e' }}>Grand Total</span>
                  <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#B12704' }}>{formatPrice(orderSummaryData.grandTotal)}</span>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#6b7280', background: '#f3f4f6', borderRadius: '6px', padding: '10px', marginBottom: '14px' }}>
                  <i className="fab fa-whatsapp" style={{ color: '#25d366', marginRight: '6px' }}></i>
                  Clicking "Confirm & Send" will open WhatsApp to send this order to {orderSummaryData.whatsappUrls.length} seller{orderSummaryData.whatsappUrls.length > 1 ? 's' : ''}.
                </div>
              </div>

              {/* Footer actions */}
              <div style={{ padding: '14px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowOrderSummary(false)}
                  style={{ flex: 1, padding: '10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '8px', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', color: '#374151' }}>
                  Edit Basket
                </button>
                <button
                  onClick={() => {
                    setShowOrderSummary(false)
                    setWhatsappLinks(orderSummaryData.whatsappUrls)
                  }}
                  style={{ flex: 2, padding: '10px', background: 'linear-gradient(135deg, #25d366, #128c7e)', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <i className="fab fa-whatsapp" style={{ fontSize: '1rem' }}></i>
                  Confirm & Send to Seller
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* WhatsApp Quotation Links Modal */}
        {whatsappLinks.length > 0 && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.65)', zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
          }}>
            <div style={{
              background: '#fff', borderRadius: '14px', padding: '28px',
              maxWidth: '480px', width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.3)'
            }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: '#1f2937' }}>
                ✅ Quotations ready — {whatsappLinks.length} seller{whatsappLinks.length > 1 ? 's' : ''}
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#6b7280' }}>
                Click each button to open WhatsApp and send your quotation:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {whatsappLinks.map((w, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <a
                      href={w.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '12px 16px', background: '#25d366', color: '#fff',
                        borderRadius: '8px', textDecoration: 'none', fontWeight: '700',
                        fontSize: '0.9rem', transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#1ebe5d'}
                      onMouseLeave={e => e.currentTarget.style.background = '#25d366'}
                    >
                      <span style={{ fontSize: '1.2rem' }}>📲</span>
                      <span>Send to {w.sellerName} ({w.productCount} product{w.productCount !== 1 ? 's' : ''})</span>
                    </a>
                    {/* Product list under each seller button */}
                    <div style={{ paddingLeft: '8px', background: '#f9fafb', borderRadius: '6px', padding: '6px 10px' }}>
                      {w.items?.map((item, j) => (
                        <div key={j} style={{ fontSize: '0.75rem', color: '#374151', display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: j < w.items.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }}>{item.name}</span>
                          <span style={{ fontWeight: 700, color: '#059669', flexShrink: 0 }}>Qty: {item.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setWhatsappLinks([])}
                style={{
                  marginTop: '18px', width: '100%', padding: '10px',
                  background: '#f3f4f6', border: '1px solid #d1d5db',
                  borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem',
                  fontWeight: '600', color: '#374151'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        <ScrollToTop />
      </div>
    </>
  )
}

export default Basket
