import { createContext, useContext, useState, useEffect } from 'react'

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
  const [isAuthenticating, setIsAuthenticating] = useState(false) // Prevent multiple auth attempts
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

  useEffect(() => {
    const initializeAuth = async () => {
      // Check for logout flag (set when user logs out)
      const logoutFlag = sessionStorage.getItem('admin_logged_out')
      if (logoutFlag && window.location.pathname.startsWith('/admin')) {
        // User has logged out, clear everything only on admin routes
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminData')
        localStorage.removeItem('server_start_time')
        setAdmin(null)
        setIsLoggedIn(false)
        setLoading(false)
        return
      }
      
      // Check if this is a fresh browser session (no session storage)
      const sessionId = sessionStorage.getItem('admin_session_id')
      if (!sessionId) {
        console.log('🔄 Fresh browser session detected, clearing all auth data for security')
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminData')
        localStorage.removeItem('admin_last_validation')
        localStorage.removeItem('server_start_time')
        // Create new session ID
        sessionStorage.setItem('admin_session_id', Date.now() + '-' + Math.random().toString(36).substr(2, 9))
        setAdmin(null)
        setIsLoggedIn(false)
        setLoading(false)
        return
      }
      
      const token = localStorage.getItem('adminToken')
      const adminData = localStorage.getItem('adminData')
      
      // Always clear auth data first, then validate if we have tokens
      console.log('🔐 Starting fresh auth validation...')
      setAdmin(null)
      setIsLoggedIn(false)
      
      if (token && adminData) {
        // Basic token format validation
        if (!token.includes('.') || token.split('.').length !== 3) {
          console.log('❌ Invalid JWT token format, clearing auth data')
          localStorage.removeItem('adminToken')
          localStorage.removeItem('adminData')
          localStorage.removeItem('admin_last_validation')
          localStorage.removeItem('server_start_time')
          setLoading(false)
          return
        }
        
        // Check if token is too old (more than 7 days)
        try {
          const tokenPayload = JSON.parse(atob(token.split('.')[1]))
          const tokenAge = Date.now() - (tokenPayload.iat * 1000)
          if (tokenAge > 7 * 24 * 60 * 60 * 1000) { // 7 days
            console.log('❌ Token is too old, clearing auth data')
            localStorage.removeItem('adminToken')
            localStorage.removeItem('adminData')
            localStorage.removeItem('admin_last_validation')
            localStorage.removeItem('server_start_time')
            setLoading(false)
            return
          }
        } catch (tokenParseError) {
          console.log('❌ Could not parse token, clearing auth data')
          localStorage.removeItem('adminToken')
          localStorage.removeItem('adminData')
          localStorage.removeItem('admin_last_validation')
          localStorage.removeItem('server_start_time')
          setLoading(false)
          return
        }
        try {
          const parsedAdmin = JSON.parse(adminData)
          
          // Check if server has restarted by comparing startup times
          console.log('🔐 Checking server status and validating admin token...')
          setIsAuthenticating(true)
          
          try {
            // First check server health to detect restarts
            const healthResponse = await fetch('http://localhost:5000/api/health')
            if (healthResponse.ok) {
              const healthData = await healthResponse.json()
              const currentServerStartTime = healthData.serverStartTime
              const lastKnownStartTime = localStorage.getItem('server_start_time')
              
              // If no stored start time, this might be a fresh start - clear auth data to be safe
              if (!lastKnownStartTime) {
                console.log('🔄 No stored server start time found, clearing auth data for security')
                localStorage.removeItem('adminToken')
                localStorage.removeItem('adminData')
                localStorage.removeItem('admin_last_validation')
                localStorage.removeItem('server_start_time')
                setAdmin(null)
                setIsLoggedIn(false)
                setLoading(false)
                setIsAuthenticating(false)
                return
              }
              
              // If stored start time is different, server restarted
              if (currentServerStartTime !== parseInt(lastKnownStartTime)) {
                console.log('🔄 Server restart detected, clearing all auth data')
                console.log('Stored start time:', parseInt(lastKnownStartTime))
                console.log('Current start time:', currentServerStartTime)
                localStorage.removeItem('adminToken')
                localStorage.removeItem('adminData')
                localStorage.removeItem('admin_last_validation')
                localStorage.removeItem('server_start_time')
                setAdmin(null)
                setIsLoggedIn(false)
                setLoading(false)
                setIsAuthenticating(false)
                return
              }
              
              console.log('✅ Server start time matches, proceeding with token validation')
              // Store current server start time (refresh it)
              localStorage.setItem('server_start_time', currentServerStartTime.toString())
            } else {
              console.log('❌ Health check failed, clearing auth data for security')
              localStorage.removeItem('adminToken')
              localStorage.removeItem('adminData')
              localStorage.removeItem('admin_last_validation')
              localStorage.removeItem('server_start_time')
              setAdmin(null)
              setIsLoggedIn(false)
              setLoading(false)
              setIsAuthenticating(false)
              return
            }
            
            // Now validate the token
            const response = await fetch('http://localhost:5000/api/auth/verify', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            
            if (response.ok) {
              const freshAdminData = await response.json()
              console.log('✅ Admin token is valid')
              setAdmin(freshAdminData.admin || freshAdminData)
              setIsLoggedIn(true)
              localStorage.setItem('adminData', JSON.stringify(freshAdminData.admin || freshAdminData))
              localStorage.setItem('admin_last_validation', Date.now().toString())
            } else if (response.status === 401) {
              console.log('❌ Admin token is invalid (401), attempting refresh')
              
              try {
                const refreshResponse = await fetch('http://localhost:5000/api/auth/refresh', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (refreshResponse.ok) {
                  const refreshData = await refreshResponse.json();
                  console.log('✅ Admin token refreshed successfully');
                  localStorage.setItem('adminToken', refreshData.token);
                  localStorage.setItem('adminData', JSON.stringify(refreshData.admin));
                  setAdmin(refreshData.admin);
                  setIsLoggedIn(true);
                  localStorage.setItem('admin_last_validation', Date.now().toString())
                } else {
                  throw new Error('Token refresh failed');
                }
              } catch (refreshError) {
                console.log('❌ Token refresh failed, clearing auth data');
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminData');
                localStorage.removeItem('admin_last_validation');
                setAdmin(null);
                setIsLoggedIn(false);
              }
            } else {
              console.log('❌ Server error during token validation, clearing auth data');
              localStorage.removeItem('adminToken');
              localStorage.removeItem('adminData');
              localStorage.removeItem('admin_last_validation');
              setAdmin(null);
              setIsLoggedIn(false);
            }
          } catch (networkError) {
            console.log('❌ Network error during token validation, clearing auth data');
            // On network errors, also clear auth data to be safe
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminData');
            localStorage.removeItem('admin_last_validation');
            setAdmin(null);
            setIsLoggedIn(false);
          } finally {
            setIsAuthenticating(false)
            setLoading(false)
          }
        } catch (parseError) {
          console.error('Error parsing admin data:', parseError)
          localStorage.removeItem('adminToken')
          localStorage.removeItem('adminData')
          setAdmin(null)
          setIsLoggedIn(false)
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }
    
    initializeAuth()
  }, []) // Remove isAuthenticating from dependencies to prevent loops

  // Track path changes but don't do optimistic loading
  useEffect(() => {
    const handlePathChange = () => {
      const newPath = window.location.pathname
      if (newPath !== currentPath) {
        setCurrentPath(newPath)
        
        // If navigating to admin route but not logged in, redirect to login
        if (newPath.startsWith('/admin') && !newPath.includes('/login') && !isLoggedIn && !loading) {
          console.log('🚫 Accessing admin route without authentication, redirecting to login')
          window.location.replace('/admin/login')
        }
      }
    }
    
    // Listen for navigation events
    window.addEventListener('popstate', handlePathChange)
    
    // Check on mount and when path changes
    handlePathChange()
    
    return () => {
      window.removeEventListener('popstate', handlePathChange)
    }
  }, [currentPath, isLoggedIn, loading])

  const login = async (adminData, token) => {
    setAdmin(adminData)
    setIsLoggedIn(true)
    localStorage.setItem('adminToken', token)
    localStorage.setItem('adminData', JSON.stringify(adminData))
    
    // Store server start time for restart detection
    try {
      const healthResponse = await fetch('http://localhost:5000/api/health')
      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        localStorage.setItem('server_start_time', healthData.serverStartTime.toString())
      }
    } catch (error) {
      console.log('Could not fetch server start time:', error)
    }
    
    // Clear logout flag on successful login
    sessionStorage.removeItem('admin_logged_out')
    // Clear any browser history of login page
    if (window.history.length > 1) {
      window.history.replaceState(null, '', '/admin/dashboard')
    }
  }

  const logout = () => {
    setAdmin(null)
    setIsLoggedIn(false)
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminData')
    localStorage.removeItem('admin_last_validation')
    localStorage.removeItem('server_start_time') // Clear server start time
    // Set logout flag to prevent back button access
    sessionStorage.setItem('admin_logged_out', 'true')
    // Use replace to avoid adding logout to history
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
    const token = localStorage.getItem('adminToken');
    if (!token) return false;
    
    // Prevent multiple simultaneous authentication attempts
    if (isAuthenticating) {
      console.log('Authentication already in progress, skipping');
      return false;
    }
    
    setIsAuthenticating(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        return true;
      } else if (response.status === 401) {
        // Token expired, try to refresh
        try {
          const refreshResponse = await fetch('http://localhost:5000/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            localStorage.setItem('adminToken', refreshData.token);
            localStorage.setItem('adminData', JSON.stringify(refreshData.admin));
            setAdmin(refreshData.admin);
            return true;
          }
        } catch (refreshError) {
          console.log('Token refresh failed');
        }
        
        // If we get here, token is invalid and refresh failed
        logout();
        return false;
      }
    } catch (error) {
      console.log('Token validation error:', error);
      return true; // Assume valid on network errors
    } finally {
      setIsAuthenticating(false);
    }
    
    return false;
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
