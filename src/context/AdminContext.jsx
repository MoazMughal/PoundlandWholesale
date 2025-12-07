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
        setAdmin(null)
        setIsLoggedIn(false)
        setLoading(false)
        return
      }
      
      const token = localStorage.getItem('adminToken')
      const adminData = localStorage.getItem('adminData')
      
      if (token && adminData) {
        try {
          const parsedAdmin = JSON.parse(adminData)
          // Set admin data from localStorage first (optimistic)
          setAdmin(parsedAdmin)
          setIsLoggedIn(true)
          
          // Only validate with server if we haven't validated recently
          const lastValidation = localStorage.getItem('admin_last_validation');
          const now = Date.now();
          const shouldValidate = !lastValidation || (now - parseInt(lastValidation)) > 300000; // 5 minutes
          
          if (shouldValidate) {
            try {
              const response = await fetch('http://localhost:5000/api/auth/verify', {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              })
              
              if (response.ok) {
                const freshAdminData = await response.json()
                setAdmin(freshAdminData)
                localStorage.setItem('adminData', JSON.stringify(freshAdminData))
                localStorage.setItem('admin_last_validation', now.toString())
              } else if (response.status === 401) {
                // Token is invalid or expired
                console.log('Admin token is invalid (401), attempting refresh or clearing localStorage')
                
                // Try to refresh token if refresh endpoint exists
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
                    setIsLoggedIn(true);
                    console.log('Admin token refreshed successfully');
                  } else {
                    throw new Error('Token refresh failed');
                  }
                } catch (refreshError) {
                  // Refresh failed, clear everything
                  console.log('Token refresh failed, clearing localStorage');
                  localStorage.removeItem('adminToken');
                  localStorage.removeItem('adminData');
                  setAdmin(null);
                  setIsLoggedIn(false);
                }
              }
              // For other errors (500, network issues), keep existing auth state
            } catch (networkError) {
              console.log('Network error during admin token validation, keeping existing auth state')
              // Keep the admin logged in if it's just a network issue
            }
          }
        } catch (parseError) {
          console.error('Error parsing admin data:', parseError)
          localStorage.removeItem('adminToken')
          localStorage.removeItem('adminData')
          setAdmin(null)
          setIsLoggedIn(false)
        }
      }
      setLoading(false)
    }
    
    initializeAuth()
  }, [])

  // Re-check auth when navigating to admin routes
  useEffect(() => {
    const handlePathChange = () => {
      const newPath = window.location.pathname
      if (newPath !== currentPath) {
        setCurrentPath(newPath)
        
        // If navigating to admin route and we have a token, ensure we're logged in
        if (newPath.startsWith('/admin') && !newPath.includes('/login')) {
          const token = localStorage.getItem('adminToken')
          const adminData = localStorage.getItem('adminData')
          const logoutFlag = sessionStorage.getItem('admin_logged_out')
          
          if (token && adminData && !logoutFlag && !isLoggedIn) {
            try {
              const parsedAdmin = JSON.parse(adminData)
              setAdmin(parsedAdmin)
              setIsLoggedIn(true)
            } catch (error) {
              console.error('Error restoring admin session:', error)
            }
          }
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
  }, [currentPath, isLoggedIn])

  const login = (adminData, token) => {
    setAdmin(adminData)
    setIsLoggedIn(true)
    localStorage.setItem('adminToken', token)
    localStorage.setItem('adminData', JSON.stringify(adminData))
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
    // Set logout flag to prevent back button access
    sessionStorage.setItem('admin_logged_out', 'true')
    // Use replace to avoid adding logout to history
    window.location.replace('/admin/login')
  }

  const updateAdmin = (updatedData) => {
    setAdmin(updatedData)
    localStorage.setItem('adminData', JSON.stringify(updatedData))
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
    checkTokenValidity
  }

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  )
}
