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
      console.log('🔑 AdminContext: Starting auth initialization...')
      
      try {
        // Initialize auth manager and check for valid tokens on ALL pages
        console.log('🔑 AdminContext: Calling authManager.initializeAuth()...')
        const authData = await authManager.initializeAuth()
        console.log('🔑 AdminContext: authManager.initializeAuth() returned:', authData)
        
        if (authData && authData.userType === 'admin') {
          console.log('✅ AdminContext: Valid admin auth restored after verification')
          console.log('✅ AdminContext: Setting admin user:', authData.user)
          setAdmin(authData.user)
          setIsLoggedIn(true)
        } else {
          console.log('🔍 AdminContext: No valid admin auth found')
          console.log('🔍 AdminContext: authData was:', authData)
          
          // Only redirect if on protected admin page but no auth
          const currentPath = window.location.pathname
          if (currentPath.startsWith('/admin/') && currentPath !== '/admin/login') {
            console.log('🔄 AdminContext: Redirecting to admin login')
            window.location.replace('/admin/login')
            return
          }
        }
      } catch (error) {
        console.error('❌ AdminContext: Auth initialization error:', error)
        // Don't clear auth on error - might be temporary network issue
      } finally {
        console.log('🔑 AdminContext: Setting loading=false, authResolved=true')
        setLoading(false)
        setAuthResolved(true)
      }
    }

    initializeAuth()
  }, [])

  // Cross-tab synchronization - Enhanced
  useEffect(() => {
    const handleStorageChange = (event) => {
      console.log('🔄 AdminContext: Storage change detected:', event.key, event.newValue)
      
      if (event.key === 'activeUserType' && event.storageArea === localStorage) {
        console.log('🔄 Active user type changed in another tab:', event.newValue)
        
        if (event.newValue === 'admin') {
          // Admin logged in from another tab - verify and update
          console.log('🔄 Admin logged in from another tab, updating context')
          authManager.loadAuth('admin').then(authData => {
            if (authData) {
              console.log('✅ Admin auth loaded from another tab')
              setAdmin(authData.user)
              setIsLoggedIn(true)
            }
          }).catch(error => {
            console.error('❌ Failed to load admin auth from another tab:', error)
          })
        } else if (event.newValue !== 'admin' && isLoggedIn) {
          // Different user type logged in, logout admin
          console.log('🔄 Different user type active, logging out admin')
          setAdmin(null)
          setIsLoggedIn(false)
        }
      } else if (event.key === 'adminToken' && event.storageArea === localStorage) {
        if (!event.newValue && event.oldValue && isLoggedIn) {
          // Admin token removed in another tab
          console.log('🔄 Admin token removed in another tab, logging out')
          setAdmin(null)
          setIsLoggedIn(false)
        } else if (event.newValue && !event.oldValue && !isLoggedIn) {
          // Admin token added in another tab
          console.log('🔄 Admin token added in another tab, checking auth')
          authManager.loadAuth('admin').then(authData => {
            if (authData) {
              console.log('✅ Admin auth restored from new token')
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
      console.log('🔑 Admin login initiated')
      console.log('🔍 Admin data received:', { 
        id: adminData?.id, 
        username: adminData?.username, 
        role: adminData?.role 
      })
      console.log('🔍 Token received (first 50 chars):', token?.substring(0, 50) + '...')
      
      setLoading(true)
      
      // Save and verify auth with new auth manager
      const result = await authManager.saveAuth('admin', adminData, token)
      
      if (!result.success) {
        console.error('❌ Auth manager saveAuth failed:', result.error)
        throw new Error(result.error || 'Failed to save authentication')
      }
      
      console.log('✅ Admin auth saved and verified')
      
      // Update context state
      setAdmin(result.user)
      setIsLoggedIn(true)
      setAuthResolved(true)
      
      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100))
      
      console.log('✅ Admin login successful - context updated')
      
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
    console.log('🔄 Admin logout initiated')
    
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