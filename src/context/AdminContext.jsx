import { createContext, useContext, useState, useEffect } from 'react'
import sessionManager from '../utils/sessionManager'
import { getApiUrl } from '../utils/api'

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

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for logout flag first
        if (sessionManager.hasLogoutFlag()) {
          
          clearAuthData()
          setLoading(false)
          return
        }

        // Initialize session if fresh browser session
        if (sessionManager.isFreshSession()) {
          
          sessionManager.initSession()
          clearAuthData() // Clear auth data on fresh session for security
          setLoading(false)
          return
        }

        const token = localStorage.getItem('adminToken')
        const adminData = localStorage.getItem('adminData')
        
        if (!token || !adminData) {
          
          setLoading(false)
          return
        }

        // Additional security: Clear auth data if no active session exists
        // This prevents automatic login when opening new tabs/windows
        if (!sessionManager.hasSession()) {
          
          clearAuthData()
          setLoading(false)
          return
        }

        // Basic token validation
        if (!isValidJWT(token)) {
          
          clearAuthData()
          setLoading(false)
          return
        }

        try {
          const parsedAdmin = JSON.parse(adminData)
          
          // Set optimistic auth state first for better UX
          setAdmin(parsedAdmin)
          setIsLoggedIn(true)
          
          // Validate token in background
          await validateTokenInBackground(token, parsedAdmin)
          
        } catch (parseError) {
          console.error('❌ Error parsing admin data:', parseError)
          clearAuthData()
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error)
        clearAuthData()
      } finally {
        setLoading(false)
      }
    }

    const clearAuthData = () => {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminData')
      setAdmin(null)
      setIsLoggedIn(false)
    }

    const isValidJWT = (token) => {
      try {
        const parts = token.split('.')
        if (parts.length !== 3) return false
        
        const payload = JSON.parse(atob(parts[1]))
        const now = Date.now() / 1000
        
        // Check if token is expired (with 5 minute buffer)
        if (payload.exp && payload.exp < (now - 300)) {
          
          return false
        }
        
        return true
      } catch (error) {
        return false
      }
    }

    const validateTokenInBackground = async (token, adminData) => {
      if (isAuthenticating) return
      
      setIsAuthenticating(true)
      
      try {
        const response = await fetch(getApiUrl('auth/verify'), {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        })
        
        if (response.ok) {
          const freshData = await response.json()
          const freshAdmin = freshData.admin || freshData
          
          // Update with fresh data
          setAdmin(freshAdmin)
          localStorage.setItem('adminData', JSON.stringify(freshAdmin))

        } else if (response.status === 401) {
          console.log('🔑 Token validation failed, but continuing with cached admin data for public pages')
          // Don't logout immediately for public pages, just log the issue
        } else {
          console.log('🔑 Token validation server error, continuing with cached data')
        }
      } catch (error) {
        if (error.name === 'TimeoutError') {
          console.log('🔑 Token validation timeout, continuing with cached data')
        } else {
          console.log('🔑 Token validation network error, continuing with cached data')
        }
      } finally {
        setIsAuthenticating(false)
      }
    }

    const attemptTokenRefresh = async (token) => {
      try {
        const refreshResponse = await fetch(getApiUrl('auth/refresh'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        })
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()

          localStorage.setItem('adminToken', refreshData.token)
          localStorage.setItem('adminData', JSON.stringify(refreshData.admin))
          setAdmin(refreshData.admin)
          setIsLoggedIn(true)
        } else {
          throw new Error('Refresh failed')
        }
      } catch (refreshError) {
        
        clearAuthData()
      }
    }
    
    initializeAuth()
  }, [])

  const login = async (adminData, token) => {
    try {

      // Clear any existing auth data first
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminData')
      sessionManager.clearLogoutFlag()
      
      // Establish new session
      sessionManager.initSession()
      
      // Set new auth data
      localStorage.setItem('adminToken', token)
      localStorage.setItem('adminData', JSON.stringify(adminData))
      
      // Update state
      setAdmin(adminData)
      setIsLoggedIn(true)

    } catch (error) {
      console.error('❌ Login error:', error)
      throw error
    }
  }

  const logout = () => {

    // Clear all auth data
    setAdmin(null)
    setIsLoggedIn(false)
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminData')
    
    // Set logout flag and clear session
    sessionManager.setLogoutFlag()
    sessionManager.clearSession()
    
    // Redirect to login
    window.location.replace('/admin/login')

  }

  const updateAdmin = (updatedData) => {
    setAdmin(updatedData)
    localStorage.setItem('adminData', JSON.stringify(updatedData))
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
    const token = localStorage.getItem('adminToken')
    if (!token) return false
    
    // Prevent multiple simultaneous checks
    if (isAuthenticating) {
      
      return isLoggedIn
    }
    
    setIsAuthenticating(true)

    try {
      const response = await fetch(getApiUrl('auth/verify'), {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(5000)
      })
      
      if (response.ok) {
        const data = await response.json()
        const freshAdmin = data.admin || data
        
        // Update with fresh data
        setAdmin(freshAdmin)
        localStorage.setItem('adminData', JSON.stringify(freshAdmin))
        return true
        
      } else if (response.status === 401) {

        try {
          const refreshResponse = await fetch(getApiUrl('auth/refresh'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(5000)
          })
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()

            localStorage.setItem('adminToken', refreshData.token)
            localStorage.setItem('adminData', JSON.stringify(refreshData.admin))
            setAdmin(refreshData.admin)
            setIsLoggedIn(true)
            return true
          }
        } catch (refreshError) {
          
        }
        
        // Token invalid and refresh failed
        logout()
        return false
      } else {
        
        return true // Assume valid on server errors
      }
    } catch (error) {
      if (error.name === 'TimeoutError') {
        
      } else {
        
      }
      return true // Assume valid on network errors
    } finally {
      setIsAuthenticating(false)
    }
    
    return false
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
