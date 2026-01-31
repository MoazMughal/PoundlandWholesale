import { createContext, useContext, useState, useEffect } from 'react'
import sessionAuthManager from '../utils/sessionAuth'

const SellerContext = createContext()

export const useSeller = () => {
  const context = useContext(SellerContext)
  if (!context) {
    throw new Error('useSeller must be used within a SellerProvider')
  }
  return context
}

export const SellerProvider = ({ children }) => {
  const [seller, setSeller] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [authResolved, setAuthResolved] = useState(false)

  // Initialize authentication - Load from localStorage and validate token
  useEffect(() => {
    const initializeAuth = () => {
      console.log('🔑 Initializing seller auth from storage...')
      
      // Skip auto-login on seller login page
      if (window.location.pathname === '/login/supplier') {
        console.log('🔑 On seller login page, skipping auto-login')
        setLoading(false)
        setAuthResolved(true)
        return
      }

      // Try to initialize from any stored auth
      const storedAuth = sessionAuthManager.initializeFromStorage();
      
      if (!storedAuth) {
        console.log('🔑 No stored auth found')
        setLoading(false)
        setAuthResolved(true)
        return
      }

      // Check if the stored auth is for seller role
      if (storedAuth.userType !== 'seller') {
        console.log(`🔑 Stored auth is for ${storedAuth.userType}, not seller`)
        setLoading(false)
        setAuthResolved(true)
        return
      }

      console.log('✅ Valid seller auth found, setting logged in state')
      setSeller(storedAuth.user)
      setIsLoggedIn(true)
      setLoading(false)
      setAuthResolved(true)
    }

    // Only run initialization if not already resolved
    if (!authResolved) {
      // Small delay to prevent race conditions
      const timer = setTimeout(initializeAuth, 50);
      return () => clearTimeout(timer);
    }
  }, [authResolved])

  // Cross-tab synchronization for localStorage
  useEffect(() => {
    const handleStorageChange = (event) => {
      // Handle localStorage changes from other tabs
      if (event.key === 'activeUserType' && event.storageArea === localStorage) {
        console.log('🔄 Active user type changed in another tab:', event.newValue);
        
        if (event.newValue === 'seller') {
          // Seller logged in from another tab
          const authData = sessionAuthManager.loadAuth('seller');
          if (authData) {
            setSeller(authData.user);
            setIsLoggedIn(true);
            setAuthResolved(true);
          }
        } else if (event.newValue !== 'seller' && isLoggedIn) {
          // Different user type logged in, logout seller
          console.log('🔄 Different user type active, logging out seller');
          setSeller(null);
          setIsLoggedIn(false);
        }
      } else if (event.key === 'sellerToken' && event.storageArea === localStorage) {
        if (!event.newValue && event.oldValue && isLoggedIn) {
          // Seller token removed in another tab
          console.log('🔄 Seller token removed in another tab, logging out');
          setSeller(null);
          setIsLoggedIn(false);
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [isLoggedIn])

  const login = (sellerData, token) => {
    try {
      console.log('🔑 Seller login initiated', { sellerData, token: token?.substring(0, 20) + '...' })
      
      // Set loading state during login
      setLoading(true);
      
      // Save auth data to localStorage
      const success = sessionAuthManager.saveAuth('seller', sellerData, token)
      
      if (!success) {
        throw new Error('Failed to save seller authentication data')
      }
      
      console.log('🔑 Session auth saved, updating context state...')
      
      // Update state immediately
      setSeller(sellerData)
      setIsLoggedIn(true)
      setAuthResolved(true)
      setLoading(false) // Clear loading state

      console.log('✅ Seller login successful - state updated')
      
    } catch (error) {
      console.error('❌ Seller login error:', error)
      setLoading(false) // Clear loading state on error
      throw error
    }
  }

  const logout = () => {
    console.log('🔄 Seller logout initiated')
    
    // Clear session auth data
    sessionAuthManager.clearAuth('seller')
    
    // Update state
    setSeller(null)
    setIsLoggedIn(false)
    
    // Redirect to seller login if on seller page
    if (window.location.pathname.startsWith('/seller/') || 
        window.location.pathname.startsWith('/login/supplier')) {
      window.location.replace('/login/supplier')
    }
  }

  const updateSeller = (updatedData) => {
    setSeller(updatedData)
    // Update session storage
    const currentAuth = sessionAuthManager.loadAuth('seller')
    if (currentAuth) {
      sessionAuthManager.saveAuth('seller', updatedData, currentAuth.token)
    }
  }

  const refreshSeller = async () => {
    // Don't refresh seller on admin routes
    if (window.location.pathname.startsWith('/admin')) {
      return
    }
    
    const token = sessionAuthManager.getCurrentToken('seller')
    if (token) {
      try {
        const response = await sessionAuthManager.makeAuthenticatedRequest('seller', 'http://localhost:5000/api/sellers/profile')
        if (response.ok) {
          const data = await response.json()
          updateSeller(data)
        }
      } catch (error) {
        // Silent error handling for network issues
        console.log('🔍 Seller refresh network error:', error.message)
        if (error.message === 'Authentication expired') {
          logout()
        }
      }
    }
  }

  // Helper for authenticated API calls
  const makeAuthenticatedRequest = async (url, options = {}) => {
    return sessionAuthManager.makeAuthenticatedRequest('seller', url, options)
  }

  const value = {
    seller,
    isLoggedIn,
    loading,
    authResolved,
    login,
    logout,
    updateSeller,
    refreshSeller,
    makeAuthenticatedRequest
  }

  return (
    <SellerContext.Provider value={value}>
      {children}
    </SellerContext.Provider>
  )
}