import { createContext, useContext, useState, useEffect } from 'react'
import authManager from '../utils/authManager'

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
  const [authResolved, setAuthResolved] = useState(false)

  // Initialize authentication - Restore sessions on ALL pages (like AdminContext)
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔑 BuyerContext: Starting auth initialization...')

      try {
        // Initialize auth manager and check for valid tokens on ALL pages
        console.log('🔑 BuyerContext: Calling authManager.initializeAuth()...')
        const authData = await authManager.initializeAuth()
        console.log('🔑 BuyerContext: authManager.initializeAuth() returned:', authData)
        
        if (authData && authData.userType === 'buyer') {
          console.log('✅ BuyerContext: Valid buyer auth restored after verification')
          console.log('✅ BuyerContext: Setting buyer user:', authData.user)
          setBuyer(authData.user)
          setIsLoggedIn(true)
        } else {
          console.log('🔍 BuyerContext: No valid buyer auth found')
          console.log('🔍 BuyerContext: authData was:', authData)
          
          // Only redirect if on protected buyer page but no auth
          const currentPath = window.location.pathname
          if (currentPath.startsWith('/buyer/') && !currentPath.startsWith('/login/buyer') && !currentPath.startsWith('/register/buyer')) {
            console.log('🔄 BuyerContext: Redirecting to buyer login')
            window.location.replace('/login/buyer')
            return
          }
        }
      } catch (error) {
        console.error('❌ BuyerContext: Auth initialization error:', error)
        // Don't clear auth on error - might be temporary network issue
      } finally {
        console.log('🔑 BuyerContext: Setting loading=false, authResolved=true')
        setLoading(false)
        setAuthResolved(true)
      }
    }

    initializeAuth()
  }, [])

  // Cross-tab synchronization - Enhanced (like AdminContext)
  useEffect(() => {
    const handleStorageChange = (event) => {
      console.log('🔄 BuyerContext: Storage change detected:', event.key, event.newValue)
      
      if (event.key === 'activeUserType' && event.storageArea === localStorage) {
        console.log('🔄 Active user type changed in another tab:', event.newValue)
        
        if (event.newValue === 'buyer') {
          // Buyer logged in from another tab - verify and update
          console.log('🔄 Buyer logged in from another tab, updating context')
          authManager.loadAuth('buyer').then(authData => {
            if (authData) {
              console.log('✅ Buyer auth loaded from another tab')
              setBuyer(authData.user)
              setIsLoggedIn(true)
            }
          }).catch(error => {
            console.error('❌ Failed to load buyer auth from another tab:', error)
          })
        } else if (event.newValue !== 'buyer' && isLoggedIn) {
          // Different user type logged in, logout buyer
          console.log('🔄 Different user type active, logging out buyer')
          setBuyer(null)
          setIsLoggedIn(false)
        }
      } else if (event.key === 'buyerToken' && event.storageArea === localStorage) {
        if (!event.newValue && event.oldValue && isLoggedIn) {
          // Buyer token removed in another tab
          console.log('🔄 Buyer token removed in another tab, logging out')
          setBuyer(null)
          setIsLoggedIn(false)
        } else if (event.newValue && !event.oldValue && !isLoggedIn) {
          // Buyer token added in another tab
          console.log('🔄 Buyer token added in another tab, checking auth')
          authManager.loadAuth('buyer').then(authData => {
            if (authData) {
              console.log('✅ Buyer auth restored from new token')
              setBuyer(authData.user)
              setIsLoggedIn(true)
            }
          }).catch(error => {
            console.error('❌ Failed to restore buyer auth from new token:', error)
          })
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [isLoggedIn])

  const login = async (buyerData, token) => {
    try {
      console.log('🔑 Buyer login initiated')
      console.log('🔍 Buyer data received:', { 
        id: buyerData?.id, 
        username: buyerData?.username, 
        email: buyerData?.email 
      })
      console.log('🔍 Token received (first 50 chars):', token?.substring(0, 50) + '...')
      
      setLoading(true)
      
      // Save and verify auth with new auth manager
      const result = await authManager.saveAuth('buyer', buyerData, token)
      
      if (!result.success) {
        console.error('❌ Auth manager saveAuth failed:', result.error)
        throw new Error(result.error || 'Failed to save buyer authentication')
      }
      
      console.log('✅ Buyer auth saved and verified')
      
      // Update context state
      setBuyer(result.user)
      setIsLoggedIn(true)
      setAuthResolved(true)
      
      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100))
      
      console.log('✅ Buyer login successful - context updated')
      
      // Navigate to dashboard after successful login
      setTimeout(() => {
        window.location.href = '/buyer/dashboard'
      }, 200)
      
      return { success: true }
    } catch (error) {
      console.error('❌ Buyer login error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    console.log('🔄 Buyer logout initiated')
    
    // Clear auth data
    authManager.logout('buyer')
    
    // Update state
    setBuyer(null)
    setIsLoggedIn(false)
    
    // Redirect to login if on buyer page
    if (window.location.pathname.startsWith('/buyer/') && !window.location.pathname.startsWith('/login/buyer')) {
      window.location.replace('/login/buyer')
    }
  }

  const updateBuyer = (updatedData) => {
    setBuyer(updatedData)
    // Update stored data
    const token = localStorage.getItem('buyerToken')
    if (token) {
      localStorage.setItem('buyerData', JSON.stringify(updatedData))
    }
  }

  const refreshBuyer = async () => {
    // Don't refresh buyer on admin or seller routes
    if (window.location.pathname.startsWith('/admin') || 
        window.location.pathname.startsWith('/seller')) {
      return
    }
    
    try {
      const authData = await authManager.loadAuth('buyer')
      if (authData) {
        setBuyer(authData.user)
        setIsLoggedIn(true)
      }
    } catch (error) {
      console.warn('Failed to refresh buyer:', error)
    }
  }

  // Helper for authenticated API calls
  const makeAuthenticatedRequest = async (endpoint, options = {}) => {
    return authManager.makeAuthenticatedRequest('buyer', endpoint, options)
  }

  const value = {
    buyer,
    isLoggedIn,
    loading,
    authResolved,
    login,
    logout,
    updateBuyer,
    refreshBuyer,
    makeAuthenticatedRequest
  }

  return (
    <BuyerContext.Provider value={value}>
      {children}
    </BuyerContext.Provider>
  )
}