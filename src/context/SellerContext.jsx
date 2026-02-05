import { createContext, useContext, useState, useEffect } from 'react'
import authManager from '../utils/authManager'

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

  // Initialize authentication - Only restore sessions on seller pages
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔑 Initializing seller auth...')

      try {
        // Check if we're on a seller page - only restore auth on seller pages
        const currentPath = window.location.pathname
        const isSellerPage = currentPath.startsWith('/seller/') || 
                            currentPath.startsWith('/login/supplier') ||
                            currentPath.startsWith('/register/supplier') ||
                            currentPath.startsWith('/product/') // Allow product pages for sellers
        
        if (!isSellerPage) {
          console.log('🔍 SellerContext: Not on seller page, skipping auth restoration')
          setLoading(false)
          setAuthResolved(true)
          return
        }

        // Initialize auth manager and check for valid tokens
        const authData = await authManager.initializeAuth()
        
        if (authData && authData.userType === 'seller') {
          console.log('✅ Valid seller auth found after verification')
          setSeller(authData.user)
          setIsLoggedIn(true)
        } else {
          console.log('🔍 No valid seller auth found')
          setSeller(null)
          setIsLoggedIn(false)
          
          // If on protected seller page but no auth, redirect to login
          if (currentPath.startsWith('/seller/')) {
            console.log('🔄 SellerContext: Redirecting to seller login')
            window.location.replace('/login/supplier')
            return
          }
        }
      } catch (error) {
        console.error('❌ Seller auth initialization error:', error)
        // Clear auth on error to prevent stuck states
        setSeller(null)
        setIsLoggedIn(false)
      } finally {
        setLoading(false)
        setAuthResolved(true)
      }
    }

    initializeAuth()
  }, [])

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'activeUserType' && event.storageArea === localStorage) {
        console.log('🔄 Active user type changed in another tab:', event.newValue)
        
        if (event.newValue === 'seller') {
          // Seller logged in from another tab - verify and update
          authManager.loadAuth('seller').then(authData => {
            if (authData) {
              setSeller(authData.user)
              setIsLoggedIn(true)
            }
          })
        } else if (event.newValue !== 'seller' && isLoggedIn) {
          // Different user type logged in, logout seller
          console.log('🔄 Different user type active, logging out seller')
          setSeller(null)
          setIsLoggedIn(false)
        }
      } else if (event.key === 'sellerToken' && event.storageArea === localStorage) {
        if (!event.newValue && event.oldValue && isLoggedIn) {
          // Seller token removed in another tab
          console.log('🔄 Seller token removed in another tab, logging out')
          setSeller(null)
          setIsLoggedIn(false)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [isLoggedIn])

  const login = async (sellerData, token) => {
    try {
      console.log('🔑 Seller login initiated')
      setLoading(true)
      
      // Save and verify auth with new auth manager
      const result = await authManager.saveAuth('seller', sellerData, token)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save seller authentication')
      }
      
      console.log('✅ Seller auth saved and verified')
      
      // Update context state
      setSeller(result.user)
      setIsLoggedIn(true)
      setAuthResolved(true)
      
      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100))
      
      console.log('✅ Seller login successful - context updated')
      
      // Navigate to dashboard after successful login
      setTimeout(() => {
        window.location.href = '/seller/dashboard'
      }, 200)
      
      return { success: true }
    } catch (error) {
      console.error('❌ Seller login error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    console.log('🔄 Seller logout initiated')
    
    // Clear auth data
    authManager.logout('seller')
    
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
    // Update stored data
    const token = localStorage.getItem('sellerToken')
    if (token) {
      localStorage.setItem('sellerData', JSON.stringify(updatedData))
    }
  }

  const refreshSeller = async () => {
    // Don't refresh seller on admin routes
    if (window.location.pathname.startsWith('/admin')) {
      return
    }
    
    try {
      const authData = await authManager.loadAuth('seller')
      if (authData) {
        setSeller(authData.user)
        setIsLoggedIn(true)
      }
    } catch (error) {
      console.warn('Failed to refresh seller:', error)
      if (error.message === 'Authentication expired') {
        logout()
      }
    }
  }

  // Helper for authenticated API calls
  const makeAuthenticatedRequest = async (endpoint, options = {}) => {
    return authManager.makeAuthenticatedRequest('seller', endpoint, options)
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