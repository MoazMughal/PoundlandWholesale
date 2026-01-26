import { createContext, useContext, useState, useEffect } from 'react'
import tokenRefreshManager from '../utils/tokenRefresh'

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

  // Simple JWT validation - decode and check expiry locally
  const isTokenValid = (token) => {
    if (!token) return false
    
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return false
      
      const payload = JSON.parse(atob(parts[1]))
      const now = Date.now() / 1000
      
      // Token is valid if not expired
      return payload.exp && payload.exp > now
    } catch (error) {
      return false
    }
  }

  // Initialize authentication - ONLY read from localStorage
  useEffect(() => {
    const initializeAuth = () => {
      console.log('🔑 Initializing auth from localStorage...')
      
      // Skip auto-login on login page
      if (window.location.pathname === '/admin/login') {
        console.log('🔑 On login page, skipping auto-login')
        setLoading(false)
        setAuthResolved(true)
        return
      }

      const token = localStorage.getItem('adminToken')
      const adminData = localStorage.getItem('adminData')

      if (!token || !adminData) {
        console.log('🔑 No auth data found')
        setLoading(false)
        setAuthResolved(true)
        return
      }

      // Validate token locally
      if (!isTokenValid(token)) {
        console.log('🔑 Token expired, clearing auth data')
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminData')
        setLoading(false)
        setAuthResolved(true)
        return
      }

      try {
        const parsedAdmin = JSON.parse(adminData)
        console.log('✅ Valid auth found, setting logged in state')
        setAdmin(parsedAdmin)
        setIsLoggedIn(true)
      } catch (error) {
        console.error('❌ Error parsing admin data:', error)
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminData')
      }

      setLoading(false)
      setAuthResolved(true)
    }

    initializeAuth()
  }, [])

  // Cross-tab synchronization - simple storage events only
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'adminToken') {
        if (!event.newValue && event.oldValue) {
          // Token removed in another tab - logout
          console.log('🔄 Token removed in another tab, logging out')
          setAdmin(null)
          setIsLoggedIn(false)
          tokenRefreshManager.stopAutoRefresh()
        } else if (event.newValue && !event.oldValue) {
          // Token added in another tab - sync login
          console.log('🔄 Token added in another tab, syncing login')
          const adminData = localStorage.getItem('adminData')
          if (adminData && isTokenValid(event.newValue)) {
            try {
              const parsedAdmin = JSON.parse(adminData)
              setAdmin(parsedAdmin)
              setIsLoggedIn(true)
            } catch (error) {
              console.error('Error parsing admin data:', error)
            }
          }
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Token refresh - ONLY start after successful login
  useEffect(() => {
    if (isLoggedIn && authResolved) {
      console.log('🔄 Starting token refresh manager')
      tokenRefreshManager.startAutoRefresh(
        (freshAdmin) => {
          console.log('✅ Token refreshed successfully')
          setAdmin(freshAdmin)
        },
        () => {
          console.log('❌ Token refresh failed, logging out')
          logout()
        }
      )
    } else {
      tokenRefreshManager.stopAutoRefresh()
    }

    return () => tokenRefreshManager.stopAutoRefresh()
  }, [isLoggedIn, authResolved])

  const login = async (adminData, token) => {
    try {
      console.log('🔑 Admin login initiated')
      
      // Save auth data
      localStorage.setItem('adminToken', token)
      localStorage.setItem('adminData', JSON.stringify(adminData))
      
      // Update state
      setAdmin(adminData)
      setIsLoggedIn(true)

      console.log('✅ Admin login successful')
    } catch (error) {
      console.error('❌ Login error:', error)
      throw error
    }
  }

  const logout = () => {
    console.log('🔄 Admin logout initiated')
    
    // Stop token refresh
    tokenRefreshManager.stopAutoRefresh()
    
    // Clear auth data
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminData')
    setAdmin(null)
    setIsLoggedIn(false)
    
    // Redirect to login if on admin page
    if (window.location.pathname.startsWith('/admin/') && window.location.pathname !== '/admin/login') {
      window.location.replace('/admin/login')
    }
  }

  const updateAdmin = (updatedData) => {
    setAdmin(updatedData)
    localStorage.setItem('adminData', JSON.stringify(updatedData))
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
    const token = localStorage.getItem('adminToken')
    
    if (!token || !isTokenValid(token)) {
      throw new Error('Authentication required')
    }

    const defaultHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }

    const requestOptions = {
      ...options,
      headers: defaultHeaders
    }

    const response = await fetch(url, requestOptions)
    
    if (response.status === 401) {
      throw new Error('Authentication expired')
    }
    
    return response
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