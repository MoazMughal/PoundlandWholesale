import { createContext, useContext, useState, useEffect } from 'react'

const BasketContext = createContext()

export const useBasket = () => {
  const context = useContext(BasketContext)
  if (!context) {
    throw new Error('useBasket must be used within a BasketProvider')
  }
  return context
}

export const BasketProvider = ({ children }) => {

  // Get a unique basket key for the current user
  const getBasketKey = () => {
    try {
      const adminToken  = localStorage.getItem('adminToken')
      const sellerToken = localStorage.getItem('sellerToken')
      const buyerToken  = localStorage.getItem('buyerToken')

      if (adminToken) {
        const admin = JSON.parse(localStorage.getItem('adminData') || localStorage.getItem('admin') || '{}')
        const id = admin._id || admin.id || 'admin'
        return `basket_admin_${id}`
      }
      if (sellerToken) {
        const seller = JSON.parse(localStorage.getItem('sellerData') || localStorage.getItem('seller') || '{}')
        const id = seller._id || seller.id || 'seller'
        return `basket_seller_${id}`
      }
      if (buyerToken) {
        const buyer = JSON.parse(localStorage.getItem('buyerData') || localStorage.getItem('buyer') || '{}')
        const id = buyer._id || buyer.id || 'buyer'
        return `basket_buyer_${id}`
      }
    } catch {}
    return 'basket_guest'
  }

  // ── Initialize basket synchronously from localStorage ──
  const [basketKey, setBasketKey] = useState(() => getBasketKey())
  const [basket, setBasket] = useState(() => {
    try {
      const key = getBasketKey()
      const saved = localStorage.getItem(key)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  const [userType, setUserType] = useState('guest')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showAddedNotification, setShowAddedNotification] = useState(false)
  const [autoCloseTimer, setAutoCloseTimer] = useState(null)

  // Determine user type on mount
  useEffect(() => {
    const buyerToken  = localStorage.getItem('buyerToken')
    const sellerToken = localStorage.getItem('sellerToken')
    const adminToken  = localStorage.getItem('adminToken')
    let type = 'guest'
    if (adminToken) type = 'admin'
    else if (sellerToken) type = 'seller'
    else if (buyerToken) type = 'buyer'
    setUserType(type)
  }, [])

  // Listen for auth changes (login/logout) — switch basket to the new user's key
  useEffect(() => {
    const handleAuthChange = () => {
      const newKey = getBasketKey()
      if (newKey !== basketKey) {
        setBasketKey(newKey)
        // Load the new user's basket
        try {
          const saved = localStorage.getItem(newKey)
          setBasket(saved ? JSON.parse(saved) : [])
        } catch { setBasket([]) }

        // Update userType
        const buyerToken  = localStorage.getItem('buyerToken')
        const sellerToken = localStorage.getItem('sellerToken')
        const adminToken  = localStorage.getItem('adminToken')
        let type = 'guest'
        if (adminToken) type = 'admin'
        else if (sellerToken) type = 'seller'
        else if (buyerToken) type = 'buyer'
        setUserType(type)
      }
    }
    window.addEventListener('storage', handleAuthChange)
    return () => window.removeEventListener('storage', handleAuthChange)
  }, [basketKey])

  // Save basket to the current user's key whenever it changes
  useEffect(() => {
    localStorage.setItem(basketKey, JSON.stringify(basket))
  }, [basket, basketKey])

  // Cross-tab sync — listen for basket changes from other tabs (same user)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === basketKey && e.newValue) {
        try { setBasket(JSON.parse(e.newValue)) } catch {}
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [basketKey])

  const addToBasket = (product) => {
    const addQty = product.quantity || 1;
    // Unique key: productId + sellerId (so same product from different sellers = separate entries)
    const productId = product.id || product._id;
    const sellerId  = product.selectedSeller?.sellerId || product.selectedSeller?._id || '';
    const basketKey = sellerId ? `${productId}_${sellerId}` : productId;

    setBasket(prev => {
      const existingIndex = prev.findIndex(item => {
        const iId  = item.id || item._id;
        const iSid = item.selectedSeller?.sellerId || item.selectedSeller?._id || '';
        const iKey = iSid ? `${iId}_${iSid}` : iId;
        return iKey === basketKey;
      });

      if (existingIndex >= 0) {
        // Same product + same seller → accumulate quantity
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: (updated[existingIndex].quantity || 1) + addQty
        };
        return updated;
      } else {
        // Different product OR same product from different seller → new entry
        return [...prev, { ...product, quantity: addQty, addedAt: Date.now() }];
      }
    });
    
    // Show sidebar with "Added to basket" notification
    setIsSidebarOpen(true)
    setShowAddedNotification(true)
    
    // Auto-close entire sidebar after 2 seconds (unless mouse is hovering)
    const timer = setTimeout(() => {
      setIsSidebarOpen(false)
      setShowAddedNotification(false)
    }, 2000)
    
    setAutoCloseTimer(timer)
  }
  
  const cancelAutoClose = () => {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer)
      setAutoCloseTimer(null)
    }
  }
  
  const resumeAutoClose = () => {
    // When mouse leaves, start a new 2-second timer
    const timer = setTimeout(() => {
      setIsSidebarOpen(false)
      setShowAddedNotification(false)
    }, 2000)
    
    setAutoCloseTimer(timer)
  }

  const removeFromBasket = (productId, sellerId = '') => {
    const basketKey = sellerId ? `${productId}_${sellerId}` : productId;
    setBasket(prev => prev.filter(item => {
      const iId  = item.id || item._id;
      const iSid = item.selectedSeller?.sellerId || item.selectedSeller?._id || '';
      const iKey = iSid ? `${iId}_${iSid}` : iId;
      return iKey !== basketKey;
    }));
  }

  const updateQuantity = (productId, quantity, sellerId = '') => {
    if (quantity <= 0) { removeFromBasket(productId, sellerId); return; }
    const basketKey = sellerId ? `${productId}_${sellerId}` : productId;
    setBasket(prev => prev.map(item => {
      const iId  = item.id || item._id;
      const iSid = item.selectedSeller?.sellerId || item.selectedSeller?._id || '';
      const iKey = iSid ? `${iId}_${iSid}` : iId;
      return iKey === basketKey ? { ...item, quantity } : item;
    }));
  }

  const clearBasket = () => {
    setBasket([])
  }

  const getBasketCount = () => {
    return basket.reduce((total, item) => total + (item.quantity || 1), 0)
  }

  const getBasketTotal = () => {
    return basket.reduce((total, item) => {
      // Handle different price formats more robustly
      let priceStr = item.price || '0';
      if (typeof priceStr === 'number') {
        priceStr = priceStr.toString();
      }
      
      // Extract numeric value and detect currency
      let numericPrice = 0;
      if (typeof priceStr === 'string') {
        // Remove all currency symbols and parse
        numericPrice = parseFloat(priceStr.replace(/[£$₨€]/g, '').replace('د.إ', '').replace('Rs', '').trim()) || 0;
      }
      
      const quantity = item.quantity || 1;
      const subtotal = numericPrice * quantity;
      
      console.log(`Basket calculation - Item: ${item.name}, Price: ${priceStr} -> ${numericPrice}, Quantity: ${quantity}, Subtotal: ${subtotal}`);
      
      return total + subtotal;
    }, 0)
  }

  const isInBasket = (productId, sellerId = '') => {
    const basketKey = sellerId ? `${productId}_${sellerId}` : productId;
    return basket.some(item => {
      const iId  = item.id || item._id;
      const iSid = item.selectedSeller?.sellerId || item.selectedSeller?._id || '';
      const iKey = iSid ? `${iId}_${iSid}` : iId;
      return iKey === basketKey;
    });
  }

  const getTotalPrice = () => {
    return getBasketTotal()
  }

  const openSidebar = () => setIsSidebarOpen(true)
  const closeSidebar = () => setIsSidebarOpen(false)

  return (
    <BasketContext.Provider value={{
      basket,
      userType,
      addToBasket,
      removeFromBasket,
      updateQuantity,
      clearBasket,
      getBasketCount,
      getBasketTotal,
      getTotalPrice,
      isInBasket,
      isSidebarOpen,
      openSidebar,
      closeSidebar,
      showAddedNotification,
      cancelAutoClose,
      resumeAutoClose
    }}>
      {children}
    </BasketContext.Provider>
  )
}
