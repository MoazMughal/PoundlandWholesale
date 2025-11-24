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

  useEffect(() => {
    const initializeAuth = async () => {
      // Only initialize admin auth on admin routes
      if (!window.location.pathname.startsWith('/admin')) {
        setLoading(false)
        return
      }
      
      // Check for logout flag (set when user logs out)
      const logoutFlag = sessionStorage.getItem('admin_logged_out')
      if (logoutFlag) {
        // User has logged out, clear everything
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
          
          // Then validate with server in background
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
            } else if (response.status === 401) {
              // Only clear on 401 (unauthorized) - token is definitely invalid
              console.log('Admin token is invalid (401), clearing localStorage')
              localStorage.removeItem('adminToken')
              localStorage.removeItem('adminData')
              setAdmin(null)
              setIsLoggedIn(false)
            }
            // For other errors (500, network issues), keep existing auth state
          } catch (networkError) {
            console.log('Network error during admin token validation, keeping existing auth state')
            // Keep the admin logged in if it's just a network issue
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

  const login = (adminData, token) => {
    setAdmin(adminData)
    setIsLoggedIn(true)
    localStorage.setItem('adminToken', token)
    localStorage.setItem('adminData', JSON.stringify(adminData))
    // Clear logout flag on successful login
    sessionStorage.removeItem('admin_logged_out')
  }

  const logout = () => {
    setAdmin(null)
    setIsLoggedIn(false)
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminData')
    // Set logout flag to prevent back button access
    sessionStorage.setItem('admin_logged_out', 'true')
    // Force page reload to clear all state and redirect to admin login
    window.location.href = '/admin/login'
  }

  const updateAdmin = (updatedData) => {
    setAdmin(updatedData)
    localStorage.setItem('adminData', JSON.stringify(updatedData))
  }

  const value = {
    admin,
    isLoggedIn,
    loading,
    login,
    logout,
    updateAdmin
  }

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  )
}
