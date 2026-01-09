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
    setBasket(prev => {
      const existingIndex = prev.findIndex(item => item.id === product.id)
      if (existingIndex >= 0) {
        // Update quantity if product already exists
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: (updated[existingIndex].quantity || 1) + 1
        }
        return updated
      } else {
        // Add new product
        return [...prev, { ...product, quantity: 1, addedAt: Date.now() }]
      }
    })
  }

  const removeFromBasket = (productId) => {
    setBasket(prev => prev.filter(item => item.id !== productId))
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromBasket(productId)
      return
    }
    setBasket(prev => {
      const updated = [...prev]
      const index = updated.findIndex(item => item.id === productId)
      if (index >= 0) {
        updated[index] = { ...updated[index], quantity }
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
      const price = parseFloat(item.price.replace(/[£$₨]/g, ''))
      return total + (price * (item.quantity || 1))
    }, 0)
  }

  const isInBasket = (productId) => {
    return basket.some(item => item.id === productId)
  }

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
      isInBasket
    }}>
      {children}
    </BasketContext.Provider>
  )
}
