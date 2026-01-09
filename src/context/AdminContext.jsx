import { createContext, useContext, useState, useEffect } from 'react'
import sessionManager from '../utils/sessionManager'
import crossTabSync from '../utils/crossTabSync'
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

  // Activity tracking for session management
  useEffect(() => {
    let activityTimer

    const updateActivity = () => {
      if (isLoggedIn && sessionManager.hasSession()) {
        sessionManager.updateSessionActivity()
      }
    }

    const handleActivity = () => {
      // Debounce activity updates to avoid excessive calls
      clearTimeout(activityTimer)
      activityTimer = setTimeout(updateActivity, 30000) // Update every 30 seconds of activity
    }

    if (isLoggedIn) {
      // Listen for user activity
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
      events.forEach(event => {
        document.addEventListener(event, handleActivity, { passive: true })
      })

      // Initial activity update
      updateActivity()

      return () => {
        clearTimeout(activityTimer)
        events.forEach(event => {
          document.removeEventListener(event, handleActivity)
        })
      }
    }
  }, [isLoggedIn])

  // Cross-tab synchronization
  useEffect(() => {
    const handleCrossTabEvent = (event) => {
      if (event.type === 'storage_change') {
        if (event.key === 'adminToken' && !event.newValue && event.oldValue) {
          // Admin token was removed in another tab - logout
          setAdmin(null)
          setIsLoggedIn(false)
          sessionManager.setLogoutFlag()
        } else if (event.key === 'admin_logged_out' && event.newValue === 'true') {
          // Logout flag was set in another tab
          setAdmin(null)
          setIsLoggedIn(false)
          window.location.replace('/admin/login')
        } else if (event.key === 'admin_logout_broadcast') {
          // Explicit logout broadcast from another tab
          setAdmin(null)
          setIsLoggedIn(false)
          localStorage.removeItem('adminToken')
          localStorage.removeItem('adminData')
          window.location.replace('/admin/login')
        }
      } else if (event.type === 'tab_focus') {
        // Tab gained focus - check if auth state is still valid
        const token = localStorage.getItem('adminToken')
        const adminData = localStorage.getItem('adminData')
        
        if (token && adminData && !sessionManager.hasLogoutFlag()) {
          try {
            const parsedAdmin = JSON.parse(adminData)
            if (!admin || admin.id !== parsedAdmin.id) {
              setAdmin(parsedAdmin)
              setIsLoggedIn(true)
            }
          } catch (error) {
            console.error('Error parsing admin data on tab focus:', error)
          }
        } else if (!token && isLoggedIn) {
          // Token was removed, logout
          setAdmin(null)
          setIsLoggedIn(false)
        }
      }
    }

    crossTabSync.startListening(handleCrossTabEvent)

    return () => {
      crossTabSync.stopListening(handleCrossTabEvent)
    }
  }, [admin, isLoggedIn])

  useEffect(() => {
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

    const initializeAuth = async () => {
      try {
        // Check for logout flag first
        if (sessionManager.hasLogoutFlag()) {
          clearAuthData()
          setLoading(false)
          return
        }

        const token = localStorage.getItem('adminToken')
        const adminData = localStorage.getItem('adminData')
        
        if (!token || !adminData) {
          setLoading(false)
          return
        }

        // Check if this is a new tab with existing session
        if (sessionManager.isNewTab()) {
          // This is a new tab but we have a valid session, restore it
          try {
            const parsedAdmin = JSON.parse(adminData)
            
            // Basic token validation
            if (!isValidJWT(token)) {
              clearAuthData()
              setLoading(false)
              return
            }
            
            // Validate with server to ensure session is still valid
            const isServerValid = await sessionManager.isServerSessionValid(token)
            if (!isServerValid) {
              clearAuthData()
              setLoading(false)
              return
            }
            
            // Set auth state for new tab
            setAdmin(parsedAdmin)
            setIsLoggedIn(true)
            
            // Update session activity and sync sessionStorage
            sessionManager.updateSessionActivity()
            
            // Validate token in background
            await validateTokenInBackground(token, parsedAdmin)
            
          } catch (parseError) {
            console.error('❌ Error parsing admin data:', parseError)
            clearAuthData()
          }
          setLoading(false)
          return
        }

        // Check if this is a fresh browser session (browser restart/new instance)
        if (sessionManager.isFreshSession()) {
          // This is a fresh session, require new login for security
          console.log('🔄 Fresh browser session detected, clearing auth data')
          sessionManager.initSession()
          clearAuthData()
          setLoading(false)
          return
        }

        // Additional security check: Clear auth data if no active session exists
        // This ensures admin must login again after server restarts or browser closes
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

        // Validate with server first to ensure session is still valid after potential server restart
        console.log('🔍 Validating admin session with server...')
        const isServerValid = await sessionManager.isServerSessionValid(token)
        if (!isServerValid) {
          console.log('❌ Server session validation failed, clearing auth data')
          clearAuthData()
          setLoading(false)
          return
        }
        console.log('✅ Server session validation passed')

        try {
          const parsedAdmin = JSON.parse(adminData)
          
          // Set optimistic auth state first for better UX
          setAdmin(parsedAdmin)
          setIsLoggedIn(true)
          
          // Update session activity
          sessionManager.updateSessionActivity()
          
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
    
    initializeAuth()
  }, [isAuthenticating])

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

      // Broadcast login to other tabs
      crossTabSync.broadcastLogin()
    } catch (error) {
      console.error('❌ Login error:', error)
      throw error
    }
  }

  const logout = () => {
    // Broadcast logout to other tabs first
    crossTabSync.broadcastLogout()
    
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
      // Update session activity
      sessionManager.updateSessionActivity()
      
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
            
            // Update session activity with new token
            sessionManager.updateSessionActivity()
            
            return true
          }
        } catch (refreshError) {
          // Refresh failed
        }
        
        // Token invalid and refresh failed
        logout()
        return false
      } else {
        return true // Assume valid on server errors
      }
    } catch (error) {
      if (error.name === 'TimeoutError') {
        // Network timeout, assume valid
      } else {
        // Other network errors, assume valid
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