import { createContext, useContext, useState, useEffect } from 'react'
import { getApiUrl } from '../utils/api'
import tokenRefreshManager from '../utils/tokenRefresh'
import authPersistence from '../utils/authPersistence'

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
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  // Cross-tab synchronization - enhanced approach
  useEffect(() => {
    const handleStorageChange = (event) => {
      // Handle logout from another tab
      if (event.key === 'adminToken' && !event.newValue && event.oldValue) {
        console.log('🔄 Admin token removed in another tab, logging out')
        setAdmin(null)
        setIsLoggedIn(false)
        tokenRefreshManager.stopAutoRefresh()
      }
      // Handle login from another tab
      else if (event.key === 'adminToken' && event.newValue && !event.oldValue) {
        console.log('🔄 Admin token added in another tab, syncing login state')
        const adminData = localStorage.getItem('adminData')
        if (adminData) {
          try {
            const parsedAdmin = JSON.parse(adminData)
            setAdmin(parsedAdmin)
            setIsLoggedIn(true)
            startTokenRefresh()
          } catch (error) {
            console.error('Error parsing admin data:', error)
          }
        }
      }
      // Handle admin data updates from another tab
      else if (event.key === 'adminData' && event.newValue) {
        try {
          const parsedAdmin = JSON.parse(event.newValue)
          setAdmin(parsedAdmin)
        } catch (error) {
          console.error('Error parsing updated admin data:', error)
        }
      }
    }

    // Also check for existing auth state when component mounts (for new tabs)
    const checkExistingAuth = () => {
      const token = localStorage.getItem('adminToken')
      const adminData = localStorage.getItem('adminData')
      
      if (token && adminData && !isLoggedIn) {
        try {
          const parsedAdmin = JSON.parse(adminData)
          console.log('🔄 Found existing auth state, syncing to new tab')
          setAdmin(parsedAdmin)
          setIsLoggedIn(true)
        } catch (error) {
          console.error('Error parsing existing admin data:', error)
        }
      }
    }

    // Check for existing auth when this context initializes
    checkExistingAuth()

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [isLoggedIn])

  // Token refresh management
  const startTokenRefresh = () => {
    tokenRefreshManager.startAutoRefresh(
      (freshAdmin, newToken) => {
        // Token refreshed successfully
        setAdmin(freshAdmin)
      },
      () => {
        // Token refresh failed - logout
        console.log('🔑 Token refresh failed, logging out')
        logout()
      }
    )
  }

  const stopTokenRefresh = () => {
    tokenRefreshManager.stopAutoRefresh()
  }

  // Start/stop token refresh based on login state
  useEffect(() => {
    if (isLoggedIn) {
      startTokenRefresh()
    } else {
      stopTokenRefresh()
    }

    return () => stopTokenRefresh()
  }, [isLoggedIn])

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if we're on the admin login page - don't auto-login
        if (window.location.pathname === '/admin/login') {
          console.log('🔑 On login page, skipping auto-login')
          setLoading(false)
          return
        }

        // Check if session is too old
        if (authPersistence.isSessionExpired()) {
          console.log('🔑 Session expired, clearing auth data')
          authPersistence.clearAuth()
          setLoading(false)
          return
        }

        const authData = authPersistence.loadAuth()
        if (!authData) {
          setLoading(false)
          return
        }

        const { admin, token } = authData

        // Basic JWT validation
        const isValidJWT = (token) => {
          try {
            const parts = token.split('.')
            if (parts.length !== 3) return false
            
            const payload = JSON.parse(atob(parts[1]))
            const now = Date.now() / 1000
            
            // Check if token is expired (with 5 minute buffer for network delays)
            if (payload.exp && payload.exp < (now - 300)) {
              return false
            }
            
            return true
          } catch (error) {
            return false
          }
        }

        if (!isValidJWT(token)) {
          console.log('🔑 Token is invalid or expired, clearing auth data')
          authPersistence.clearAuth()
          setLoading(false)
          return
        }

        // Only auto-login if we're on an admin page (not login page)
        if (window.location.pathname.startsWith('/admin/') && window.location.pathname !== '/admin/login') {
          // Set auth state optimistically for better UX
          setAdmin(admin)
          setIsLoggedIn(true)
          
          // Validate token with server in background (non-blocking)
          validateTokenInBackground(token, admin)
        } else if (window.location.pathname === '/admin/login') {
          // Clear auth data only if on login page
          console.log('🔑 On login page, clearing auth data')
          authPersistence.clearAuth()
        } else {
          // For non-admin pages (like product pages), preserve auth state but don't validate
          // This allows users to stay logged in when opening products in new tabs
          console.log('🔑 On non-admin page, preserving auth state for cross-tab compatibility')
          setAdmin(admin)
          setIsLoggedIn(true)
        }
        
      } catch (error) {
        console.error('❌ Auth initialization error:', error)
        authPersistence.clearAuth()
      } finally {
        setLoading(false)
      }
    }

    const validateTokenInBackground = async (token, adminData) => {
      if (isAuthenticating) return
      
      try {
        const response = await fetch(getApiUrl('auth/verify'), {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(8000) // 8 second timeout
        })
        
        if (response.ok) {
          const freshData = await response.json()
          const freshAdmin = freshData.admin || freshData
          
          // Update with fresh data if different
          if (JSON.stringify(freshAdmin) !== JSON.stringify(adminData)) {
            setAdmin(freshAdmin)
            authPersistence.updateAdminData(freshAdmin)
          }
        } else if (response.status === 401) {
          console.log('🔑 Token validation failed - token expired or invalid')
          // Only logout if we're on an admin page
          if (window.location.pathname.startsWith('/admin/') && window.location.pathname !== '/admin/login') {
            logout()
          }
        }
      } catch (error) {
        // Network errors are non-critical, continue with cached data
        if (error.name === 'TimeoutError') {
          console.log('🔑 Token validation timeout - continuing with cached data')
        } else {
          console.log('🔑 Token validation network error - continuing with cached data')
        }
      }
    }
    
    initializeAuth()
  }, [])

  const login = async (adminData, token) => {
    try {
      // Clear any existing auth data first
      authPersistence.clearAuth()
      
      // Save new auth data
      authPersistence.saveAuth(adminData, token)
      
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
    stopTokenRefresh()
    
    // Clear all auth data
    setAdmin(null)
    setIsLoggedIn(false)
    authPersistence.clearAuth()
    
    // Only redirect to login if we're currently on an admin page
    if (window.location.pathname.startsWith('/admin/') && window.location.pathname !== '/admin/login') {
      window.location.replace('/admin/login')
    }
  }

  const updateAdmin = (updatedData) => {
    setAdmin(updatedData)
    authPersistence.updateAdminData(updatedData)
  }

  const clearProductCache = async () => {
    try {
      // Clear server-side cache
      const token = localStorage.getItem('adminToken')
      if (token) {
        await fetch(getApiUrl('products/admin/clear-cache'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      }
      
      // Clear client-side cache
      const { default: cacheManager } = await import('../utils/cacheManager.js')
      cacheManager.remove('amazons_choice_products')

      return true
    } catch (error) {
      console.error('❌ Error clearing product cache:', error)
      return false
    }
  }

  const checkTokenValidity = async () => {
    if (!authPersistence.hasToken()) return false
    
    // Prevent multiple simultaneous checks
    if (isAuthenticating) {
      return isLoggedIn
    }
    
    setIsAuthenticating(true)

    try {
      const authData = authPersistence.loadAuth()
      if (!authData) return false

      const { token } = authData

      const response = await fetch(getApiUrl('auth/verify'), {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(8000)
      })
      
      if (response.ok) {
        const data = await response.json()
        const freshAdmin = data.admin || data
        
        // Update with fresh data
        setAdmin(freshAdmin)
        authPersistence.updateAdminData(freshAdmin)
        return true
        
      } else if (response.status === 401) {
        // Try to refresh token
        try {
          const refreshResponse = await fetch(getApiUrl('auth/refresh'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(8000)
          })
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()

            authPersistence.saveAuth(refreshData.admin, refreshData.token)
            setAdmin(refreshData.admin)
            setIsLoggedIn(true)
            
            return true
          }
        } catch (refreshError) {
          console.log('🔑 Token refresh failed:', refreshError.message)
        }
        
        // Token invalid and refresh failed - only logout if on admin pages
        if (window.location.pathname.startsWith('/admin/') && window.location.pathname !== '/admin/login') {
          logout()
        }
        return false
      } else {
        // Server error - assume token is still valid
        return true
      }
    } catch (error) {
      if (error.name === 'TimeoutError') {
        console.log('🔑 Token validation timeout - assuming valid')
      } else {
        console.log('🔑 Token validation network error - assuming valid')
      }
      return true // Assume valid on network errors
    } finally {
      setIsAuthenticating(false)
    }
  }

  const value = {
    admin,
    isLoggedIn,
    loading,
    login,
    logout,
    updateAdmin,
    checkTokenValidity,
    clearProductCache
  }

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  )
}