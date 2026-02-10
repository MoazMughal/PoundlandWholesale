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

  // Initialize authentication - Restore sessions on ALL pages (like AdminContext should work)
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔑 SellerContext: Starting auth initialization...')
      
      try {
        // Initialize auth manager and check for valid tokens on ALL pages
        console.log('🔑 SellerContext: Calling authManager.initializeAuth()...')
        const authData = await authManager.initializeAuth()
        console.log('🔑 SellerContext: authManager.initializeAuth() returned:', authData)
        
        if (authData && authData.userType === 'seller') {
          console.log('✅ SellerContext: Valid seller auth restored after verification')
          console.log('✅ SellerContext: Setting seller user:', authData.user)
          setSeller(authData.user)
          setIsLoggedIn(true)
        } else {
          console.log('🔍 SellerContext: No valid seller auth found')
          console.log('🔍 SellerContext: authData was:', authData)
          setSeller(null)
          setIsLoggedIn(false)
          
          // Only redirect if on protected seller page but no auth
          const currentPath = window.location.pathname
          if (currentPath.startsWith('/seller/') && currentPath !== '/login/supplier') {
            console.log('🔄 SellerContext: Redirecting to seller login')
            window.location.replace('/login/supplier')
            return
          }
        }
      } catch (error) {
        console.error('❌ SellerContext: Auth initialization error:', error)
        // Don't clear auth on error - might be temporary network issue
      } finally {
        console.log('🔑 SellerContext: Setting loading=false, authResolved=true')
        setLoading(false)
        setAuthResolved(true)
      }
    }

    initializeAuth()
  }, [])

  // Cross-tab synchronization - Enhanced like AdminContext
  useEffect(() => {
    const handleStorageChange = (event) => {
      console.log('🔄 SellerContext: Storage change detected:', event.key, event.newValue)
      
      if (event.key === 'activeUserType' && event.storageArea === localStorage) {
        console.log('🔄 Active user type changed in another tab:', event.newValue)
        
        if (event.newValue === 'seller') {
          // Seller logged in from another tab - verify and update
          console.log('🔄 Seller logged in from another tab, updating context')
          authManager.loadAuth('seller').then(authData => {
            if (authData) {
              console.log('✅ Seller auth loaded from another tab')
              setSeller(authData.user)
              setIsLoggedIn(true)
            }
          }).catch(error => {
            console.error('❌ Failed to load seller auth from another tab:', error)
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
        } else if (event.newValue && !event.oldValue && !isLoggedIn) {
          // Seller token added in another tab
          console.log('🔄 Seller token added in another tab, checking auth')
          authManager.loadAuth('seller').then(authData => {
            if (authData) {
              console.log('✅ Seller auth restored from new token')
              setSeller(authData.user)
              setIsLoggedIn(true)
            }
          }).catch(error => {
            console.error('❌ Failed to restore seller auth from new token:', error)
          })
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