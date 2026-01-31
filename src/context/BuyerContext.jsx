import { createContext, useContext, useState, useEffect } from 'react'
import sessionAuthManager from '../utils/sessionAuth'
import { getApiUrl } from '../utils/api'

const BuyerContext = createContext()

export const useBuyer = () => {
  const context = useContext(BuyerContext)
  if (!context) {
    throw new Error('useBuyer must be used within a BuyerProvider')
  }
  return context
}

export const BuyerProvider = ({ children }) => {
  const [buyer, setBuyer] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = () => {
      // Don't initialize buyer auth on admin or seller routes
      if (window.location.pathname.startsWith('/admin') || 
          window.location.pathname.startsWith('/seller')) {
        setLoading(false)
        return
      }
      
      console.log('🔑 Initializing buyer auth from storage...')

      try {
        // Try to initialize from any stored auth
        const storedAuth = sessionAuthManager.initializeFromStorage();
        
        if (storedAuth && storedAuth.userType === 'buyer') {
          console.log('✅ Valid buyer auth found, setting logged in state')
          setBuyer(storedAuth.user)
          setIsLoggedIn(true)
        } else {
          console.log('🔑 No buyer auth found')
        }
        
        setLoading(false)
      } catch (error) {
        console.error('❌ Buyer auth initialization error:', error)
        setLoading(false)
      }
    }
    
    // Small delay to prevent race conditions
    const timer = setTimeout(initializeAuth, 50);
    return () => clearTimeout(timer);
  }, [])

  const login = async (buyerData, token) => {
    try {
      console.log('🔑 Buyer login initiated', { buyerData, token: token?.substring(0, 20) + '...' })
      
      // Save auth data to localStorage
      const success = await sessionAuthManager.saveAuth('buyer', buyerData, token)
      
      if (!success) {
        throw new Error('Failed to save buyer authentication data')
      }
      
      console.log('🔑 Session auth saved, updating context state...')
      
      // Update state immediately
      setBuyer(buyerData)
      setIsLoggedIn(true)

      console.log('✅ Buyer login successful - state updated')
      
    } catch (error) {
      console.error('❌ Buyer login error:', error)
      throw error
    }
  }

  const logout = () => {
    console.log('🔄 Buyer logout initiated')
    
    // Clear session auth data
    sessionAuthManager.clearAuth('buyer')
    
    // Update state
    setBuyer(null)
    setIsLoggedIn(false)
    
    // Force page reload to clear all state and redirect to buyer login
    window.location.href = '/login/buyer'
  }

  const updateBuyer = (updatedData) => {
    setBuyer(updatedData)
    // Update session storage - make this async safe
    try {
      const currentAuth = sessionAuthManager.loadAuth ? sessionAuthManager.loadAuth('buyer') : null
      if (currentAuth) {
        sessionAuthManager.saveAuth('buyer', updatedData, currentAuth.token)
      }
    } catch (error) {
      console.warn('Failed to update buyer in storage:', error)
    }
  }

  const refreshBuyer = () => {
    // Don't refresh buyer on admin or seller routes
    if (window.location.pathname.startsWith('/admin') || 
        window.location.pathname.startsWith('/seller')) {
      return
    }
    
    // Simple refresh - just reload from storage
    try {
      const storedAuth = sessionAuthManager.initializeFromStorage();
      if (storedAuth && storedAuth.userType === 'buyer') {
        setBuyer(storedAuth.user)
        setIsLoggedIn(true)
      }
    } catch (error) {
      console.warn('Failed to refresh buyer:', error)
    }
  }

  const value = {
    buyer,
    isLoggedIn,
    loading,
    login,
    logout,
    updateBuyer,
    refreshBuyer
  }

  return (
    <BuyerContext.Provider value={value}>
      {children}
    </BuyerContext.Provider>
  )
}