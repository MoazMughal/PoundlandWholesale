import { createContext, useContext, useState, useEffect } from 'react'
import authManager from '../utils/authManager'

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

  // Initialize authentication - Restore sessions on ALL pages
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Initialize auth manager and check for valid tokens on ALL pages
        const authData = await authManager.initializeAuth()
        
        if (authData && authData.userType === 'admin') {
          setAdmin(authData.user)
          setIsLoggedIn(true)
        } else {
          // Only redirect if on protected admin page but no auth
          const currentPath = window.location.pathname
          if (currentPath.startsWith('/admin/') && currentPath !== '/admin/login') {
            window.location.replace('/admin/login')
            return
          }
        }
      } catch (error) {
        console.error('❌ AdminContext: Auth initialization error:', error)
        // Don't clear auth on error - might be temporary network issue
      } finally {
        setLoading(false)
        setAuthResolved(true)
      }
    }

    initializeAuth()
  }, [])

  // Cross-tab synchronization - Enhanced
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'activeUserType' && event.storageArea === localStorage) {
        if (event.newValue === 'admin') {
          // Admin logged in from another tab - verify and update
          authManager.loadAuth('admin').then(authData => {
            if (authData) {
              setAdmin(authData.user)
              setIsLoggedIn(true)
            }
          }).catch(error => {
            console.error('❌ Failed to load admin auth from another tab:', error)
          })
        } else if (event.newValue !== 'admin' && isLoggedIn) {
          // Different user type logged in, logout admin
          setAdmin(null)
          setIsLoggedIn(false)
        }
      } else if (event.key === 'adminToken' && event.storageArea === localStorage) {
        if (!event.newValue && event.oldValue && isLoggedIn) {
          // Admin token removed in another tab
          setAdmin(null)
          setIsLoggedIn(false)
        } else if (event.newValue && !event.oldValue && !isLoggedIn) {
          // Admin token added in another tab
          authManager.loadAuth('admin').then(authData => {
            if (authData) {
              setAdmin(authData.user)
              setIsLoggedIn(true)
            }
          }).catch(error => {
            console.error('❌ Failed to restore admin auth from new token:', error)
          })
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [isLoggedIn])

  const login = async (adminData, token) => {
    try {
      setLoading(true)
      
      // Save and verify auth with new auth manager
      const result = await authManager.saveAuth('admin', adminData, token)
      
      if (!result.success) {
        console.error('❌ Auth manager saveAuth failed:', result.error)
        throw new Error(result.error || 'Failed to save authentication')
      }
      
      // Update context state
      setAdmin(result.user)
      setIsLoggedIn(true)
      setAuthResolved(true)
      
      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Navigate to dashboard after successful login
      setTimeout(() => {
        window.location.href = '/admin/dashboard'
      }, 200)
      
      return { success: true }
    } catch (error) {
      console.error('❌ Admin login error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    // Clear auth data
    authManager.logout('admin')
    
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
    // Update stored data
    const token = localStorage.getItem('adminToken')
    if (token) {
      localStorage.setItem('adminData', JSON.stringify(updatedData))
    }
  }

  // Helper for authenticated API calls
  const makeAuthenticatedRequest = async (endpoint, options = {}) => {
    return authManager.makeAuthenticatedRequest('admin', endpoint, options)
  }

  const value = {
    admin,
    isLoggedIn,
    loading,
    authResolved,
    login,
    logout,
    updateAdmin,
    makeAuthenticatedRequest
  }

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  )
}