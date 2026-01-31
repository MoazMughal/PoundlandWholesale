import { createContext, useContext, useState, useEffect } from 'react'
import sessionAuthManager from '../utils/sessionAuth'

const AdminContext = createContext()

export const useAdmin = () => {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}

export const AdminProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [authResolved, setAuthResolved] = useState(false)

  // Initialize authentication - Load from localStorage and validate token
  useEffect(() => {
    const initializeAuth = () => {
      console.log('🔑 Initializing admin auth from storage...')
      
      // Skip auto-login on login page
      if (window.location.pathname === '/admin/login') {
        console.log('🔑 On admin login page, skipping auto-login')
        setLoading(false)
        setAuthResolved(true)
        return
      }

      try {
        // Try to initialize from any stored auth
        const storedAuth = sessionAuthManager.initializeFromStorage();
        
        if (storedAuth && storedAuth.userType === 'admin') {
          console.log('✅ Valid admin auth found, setting logged in state')
          setAdmin(storedAuth.user)
          setIsLoggedIn(true)
          setLoading(false)
          setAuthResolved(true)
        } else {
          console.log('🔑 No admin auth found')
          setLoading(false)
          setAuthResolved(true)
        }
      } catch (error) {
        console.error('❌ Admin auth initialization error:', error)
        setLoading(false)
        setAuthResolved(true)
      }
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
        
        if (event.newValue === 'admin') {
          // Admin logged in from another tab
          const authData = sessionAuthManager.loadAuth('admin');
          if (authData) {
            setAdmin(authData.user);
            setIsLoggedIn(true);
            setAuthResolved(true);
          }
        } else if (event.newValue !== 'admin' && isLoggedIn) {
          // Different user type logged in, logout admin
          console.log('🔄 Different user type active, logging out admin');
          setAdmin(null);
          setIsLoggedIn(false);
        }
      } else if (event.key === 'adminToken' && event.storageArea === localStorage) {
        if (!event.newValue && event.oldValue && isLoggedIn) {
          // Admin token removed in another tab
          console.log('🔄 Admin token removed in another tab, logging out');
          setAdmin(null);
          setIsLoggedIn(false);
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [isLoggedIn])

  const login = async (adminData, token) => {
    try {
      console.log('🔑 Admin login initiated', { adminData, token: token?.substring(0, 20) + '...' })
      
      // Set loading state during login
      setLoading(true);
      
      // Save auth data to session
      const success = sessionAuthManager.saveAuth('admin', adminData, token)
      
      if (!success) {
        throw new Error('Failed to save authentication data')
      }
      
      console.log('🔑 Session auth saved, updating context state...')
      
      // Update state immediately
      setAdmin(adminData)
      setIsLoggedIn(true)
      setAuthResolved(true)
      setLoading(false) // Clear loading state

      console.log('✅ Admin login successful - state updated')
      
      // Add a small delay to ensure state is fully updated before any redirects
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify the state was actually set
      console.log('🔍 Verifying login state after delay...')
      const verifyAuth = sessionAuthManager.loadAuth('admin')
      const activeUserType = sessionStorage.getItem('activeUserType')
      console.log('🔍 Verification:', { 
        hasSessionAuth: !!verifyAuth, 
        activeUserType,
        contextAdmin: !!adminData,
        contextIsLoggedIn: true,
        contextAuthResolved: true,
        contextLoading: false
      })
      
    } catch (error) {
      console.error('❌ Admin login error:', error)
      setLoading(false) // Clear loading state on error
      throw error
    }
  }

  const logout = () => {
    console.log('🔄 Admin logout initiated')
    
    // Clear session auth data
    sessionAuthManager.clearAuth('admin')
    
    // Update state
    setAdmin(null)
    setIsLoggedIn(false)
    
    // Redirect to login if on admin page
    if (window.location.pathname.startsWith('/admin/') && window.location.pathname !== '/admin/login') {
      window.location.replace('/admin/login')
    }
  }

  const updateAdmin = (updatedData) => {
    setAdmin(updatedData)
    // Update session storage
    const currentAuth = sessionAuthManager.loadAuth('admin')
    if (currentAuth) {
      sessionAuthManager.saveAuth('admin', updatedData, currentAuth.token)
    }
  }

  // Simple navigation helper for product pages
  const navigateToProduct = (productId, options = {}) => {
    console.log('🔗 Admin navigating to product:', productId, options)
    // This is just a helper function for logging/tracking
    // The actual navigation is handled by the calling component
    return { productId, options }
  }

  // Helper for authenticated API calls
  const makeAuthenticatedRequest = async (url, options = {}) => {
    return sessionAuthManager.makeAuthenticatedRequest('admin', url, options)
  }

  const value = {
    admin,
    isLoggedIn,
    loading,
    authResolved,
    login,
    logout,
    updateAdmin,
    navigateToProduct,
    makeAuthenticatedRequest
  }

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  )
}