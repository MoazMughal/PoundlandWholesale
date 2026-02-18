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
  const [basket, setBasket] = useState([])
  const [userType, setUserType] = useState('guest') // 'buyer', 'seller', 'admin', 'guest'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showAddedNotification, setShowAddedNotification] = useState(false)
  const [autoCloseTimer, setAutoCloseTimer] = useState(null)

  // Determine user type and load basket from localStorage
  useEffect(() => {
    const buyerToken = localStorage.getItem('buyerToken')
    const sellerToken = localStorage.getItem('sellerToken')
    const adminToken = localStorage.getItem('adminToken')

    let type = 'guest'
    if (adminToken) type = 'admin'
    else if (sellerToken) type = 'seller'
    else if (buyerToken) type = 'buyer'

    setUserType(type)

    // Load basket from localStorage based on user type
    const savedBasket = localStorage.getItem(`basket_${type}`)
    if (savedBasket) {
      try {
        setBasket(JSON.parse(savedBasket))
      } catch (error) {
        console.error('Error loading basket:', error)
        setBasket([])
      }
    }
  }, [])

  // Save basket to localStorage whenever it changes
  useEffect(() => {
    if (basket.length >= 0) {
      localStorage.setItem(`basket_${userType}`, JSON.stringify(basket))
    }
  }, [basket, userType])

  const addToBasket = (product) => {
    console.log('🛒 Adding to basket:', product)
    console.log('   Product ID:', product.id || product._id)
    console.log('   Product Name:', product.name)
    
    setBasket(prev => {
      console.log('   Current basket:', prev)
      
      // Check both id and _id fields for matching
      const productId = product.id || product._id
      const existingIndex = prev.findIndex(item => {
        const itemId = item.id || item._id
        return itemId === productId
      })
      
      console.log('   Existing index:', existingIndex)
      
      if (existingIndex >= 0) {
        // Update quantity if product already exists
        console.log('   ✅ Product exists, incrementing quantity')
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: (updated[existingIndex].quantity || 1) + 1
        }
        console.log('   Updated basket:', updated)
        return updated
      } else {
        // Add new product
        console.log('   ✅ New product, adding to basket')
        const newBasket = [...prev, { ...product, quantity: 1, addedAt: Date.now() }]
        console.log('   New basket:', newBasket)
        return newBasket
      }
    })
    
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

  const removeFromBasket = (productId) => {
    console.log('🗑️ Removing from basket, ID:', productId)
    setBasket(prev => {
      const filtered = prev.filter(item => {
        const itemId = item.id || item._id
        return itemId !== productId
      })
      console.log('   Basket after removal:', filtered)
      return filtered
    })
  }

  const updateQuantity = (productId, quantity) => {
    console.log('🔢 Updating quantity, ID:', productId, 'New quantity:', quantity)
    if (quantity <= 0) {
      removeFromBasket(productId)
      return
    }
    setBasket(prev => {
      const updated = [...prev]
      const index = updated.findIndex(item => {
        const itemId = item.id || item._id
        return itemId === productId
      })
      if (index >= 0) {
        updated[index] = { ...updated[index], quantity }
        console.log('   Updated item:', updated[index])
      }
      return updated
    })
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

  const isInBasket = (productId) => {
    return basket.some(item => {
      const itemId = item.id || item._id
      return itemId === productId
    })
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
