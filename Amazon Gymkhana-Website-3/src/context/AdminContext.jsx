import { createContext, useContext, useState, useEffect } from 'react'
import sessionManager from '../utils/sessionManager'

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
          console.log('🚫 Logout flag detected, clearing auth data')
          clearAuthData()
          setLoading(false)
          return
        }

        // Initialize session if fresh browser session
        if (sessionManager.isFreshSession()) {
          console.log('🔄 Fresh browser session detected')
          sessionManager.initSession()
          // Don't clear auth data on fresh session - let token validation handle it
        }

        const token = localStorage.getItem('adminToken')
        const adminData = localStorage.getItem('adminData')
        
        if (!token || !adminData) {
          console.log('🔐 No auth data found')
          setLoading(false)
          return
        }

        // Basic token validation
        if (!isValidJWT(token)) {
          console.log('❌ Invalid token format')
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
          console.log('❌ Token expired')
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
        const response = await fetch('http://localhost:5000/api/auth/verify', {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        })
        
        if (response.ok) {
          const freshData = await response.json()
          const freshAdmin = freshData.admin || freshData
          
          // Update with fresh data
          setAdmin(freshAdmin)
          localStorage.setItem('adminData', JSON.stringify(freshAdmin))
          console.log('✅ Token validated successfully')
          
        } else if (response.status === 401) {
          console.log('❌ Token invalid, attempting refresh')
          await attemptTokenRefresh(token)
        } else {
          console.log('⚠️ Server error during validation, keeping current auth state')
        }
      } catch (error) {
        if (error.name === 'TimeoutError') {
          console.log('⚠️ Token validation timeout, keeping current auth state')
        } else {
          console.log('⚠️ Network error during validation, keeping current auth state')
        }
      } finally {
        setIsAuthenticating(false)
      }
    }

    const attemptTokenRefresh = async (token) => {
      try {
        const refreshResponse = await fetch('http://localhost:5000/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        })
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          console.log('✅ Token refreshed successfully')
          
          localStorage.setItem('adminToken', refreshData.token)
          localStorage.setItem('adminData', JSON.stringify(refreshData.admin))
          setAdmin(refreshData.admin)
          setIsLoggedIn(true)
        } else {
          throw new Error('Refresh failed')
        }
      } catch (refreshError) {
        console.log('❌ Token refresh failed, clearing auth')
        clearAuthData()
      }
    }
    
    initializeAuth()
  }, [])

  const login = async (adminData, token) => {
    try {
      console.log('🔐 Admin login initiated')
      
      // Clear any existing auth data first
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminData')
      sessionManager.clearLogoutFlag()
      
      // Set new auth data
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
    console.log('🚪 Admin logout initiated')
    
    // Clear all auth data
    setAdmin(null)
    setIsLoggedIn(false)
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminData')
    
    // Set logout flag to prevent back button access
    sessionManager.setLogoutFlag()
    
    // Redirect to login
    window.location.replace('/admin/login')
    
    console.log('✅ Admin logout completed')
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
        await fetch('http://localhost:5000/api/products/admin/clear-cache', {
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
      
      console.log('✅ Product cache cleared successfully')
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
      console.log('⏳ Authentication already in progress')
      return isLoggedIn
    }
    
    setIsAuthenticating(true)

    try {
      const response = await fetch('http://localhost:5000/api/auth/verify', {
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
        console.log('🔄 Token expired, attempting refresh')
        
        try {
          const refreshResponse = await fetch('http://localhost:5000/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(5000)
          })
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            console.log('✅ Token refreshed successfully')
            
            localStorage.setItem('adminToken', refreshData.token)
            localStorage.setItem('adminData', JSON.stringify(refreshData.admin))
            setAdmin(refreshData.admin)
            setIsLoggedIn(true)
            return true
          }
        } catch (refreshError) {
          console.log('❌ Token refresh failed')
        }
        
        // Token invalid and refresh failed
        logout()
        return false
      } else {
        console.log('⚠️ Server error during token check, assuming valid')
        return true // Assume valid on server errors
      }
    } catch (error) {
      if (error.name === 'TimeoutError') {
        console.log('⚠️ Token validation timeout, assuming valid')
      } else {
        console.log('⚠️ Network error during token check, assuming valid')
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
