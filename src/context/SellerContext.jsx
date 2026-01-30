import { createContext, useContext, useState, useEffect } from 'react'

const SellerContext = createContext()

export const useSeller = () => {
  const context = useContext(SellerContext)
  if (!context) {
    throw new Error('useSeller must be used within a SellerProvider')
  }
  return context
}

export const SellerProvider = ({ children }) => {
  const [seller, setSeller] = useState(null)
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

  // Initialize authentication - EXACTLY like admin
  useEffect(() => {
    const initializeAuth = () => {
      console.log('🔑 Initializing seller auth from localStorage...')
      console.log('🔑 Current path:', window.location.pathname)
      
      // Skip auto-login on seller login page
      if (window.location.pathname === '/login/supplier') {
        console.log('🔑 On seller login page, skipping auto-login')
        setLoading(false)
        setAuthResolved(true)
        return
      }

      const token = localStorage.getItem('sellerToken')
      const sellerData = localStorage.getItem('sellerData')

      console.log('🔑 Auth data check:', {
        hasToken: !!token,
        hasSellerData: !!sellerData,
        tokenLength: token ? token.length : 0
      })

      if (!token || !sellerData) {
        console.log('🔑 No seller auth data found')
        setLoading(false)
        setAuthResolved(true)
        return
      }

      // Validate token locally
      if (!isTokenValid(token)) {
        console.log('🔑 Seller token expired, clearing auth data')
        localStorage.removeItem('sellerToken')
        localStorage.removeItem('sellerData')
        setLoading(false)
        setAuthResolved(true)
        return
      }

      try {
        const parsedSeller = JSON.parse(sellerData)
        console.log('✅ Valid seller auth found, setting logged in state')
        console.log('🔑 Seller info:', {
          id: parsedSeller._id,
          username: parsedSeller.username,
          email: parsedSeller.email
        })
        setSeller(parsedSeller)
        setIsLoggedIn(true)
      } catch (error) {
        console.error('❌ Error parsing seller data:', error)
        localStorage.removeItem('sellerToken')
        localStorage.removeItem('sellerData')
      }

      setLoading(false)
      setAuthResolved(true)
    }

    initializeAuth()
  }, [])

  // Cross-tab synchronization - simple storage events only
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'sellerToken') {
        if (!event.newValue && event.oldValue) {
          // Token removed in another tab - logout
          console.log('🔄 Seller token removed in another tab, logging out')
          setSeller(null)
          setIsLoggedIn(false)
        } else if (event.newValue && !event.oldValue) {
          // Token added in another tab - sync login
          console.log('🔄 Seller token added in another tab, syncing login')
          const sellerData = localStorage.getItem('sellerData')
          if (sellerData && isTokenValid(event.newValue)) {
            try {
              const parsedSeller = JSON.parse(sellerData)
              setSeller(parsedSeller)
              setIsLoggedIn(true)
            } catch (error) {
              console.error('Error parsing seller data:', error)
            }
          }
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const login = (sellerData, token) => {
    console.log('🔑 Seller login initiated')
    
    // Save auth data
    localStorage.setItem('sellerToken', token)
    localStorage.setItem('sellerData', JSON.stringify(sellerData))
    
    // Update state
    setSeller(sellerData)
    setIsLoggedIn(true)

    console.log('✅ Seller login successful')
  }

  const logout = () => {
    console.log('🔄 Seller logout initiated')
    
    // Clear auth data
    localStorage.removeItem('sellerToken')
    localStorage.removeItem('sellerData')
    setSeller(null)
    setIsLoggedIn(false)
    
    // Redirect to seller login if on seller page
    if (window.location.pathname.startsWith('/seller/') || 
        window.location.pathname.startsWith('/login/supplier')) {
      window.location.replace('/login/supplier')
    }
  }

  const updateSeller = (updatedData) => {
    setSeller(updatedData)
    localStorage.setItem('sellerData', JSON.stringify(updatedData))
  }

  const refreshSeller = async () => {
    // Don't refresh seller on admin routes
    if (window.location.pathname.startsWith('/admin')) {
      return
    }
    
    const token = localStorage.getItem('sellerToken')
    if (token && isTokenValid(token)) {
      try {
        const response = await fetch('http://localhost:5000/api/sellers/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          updateSeller(data)
        } else if (response.status === 401) {
          // Token is invalid, logout
          logout()
        }
      } catch (error) {
        // Silent error handling for network issues
        console.log('🔍 Seller refresh network error:', error.message)
      }
    }
  }

  // Helper for authenticated API calls
  const makeAuthenticatedRequest = async (url, options = {}) => {
    const token = localStorage.getItem('sellerToken')
    
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
    seller,
    isLoggedIn,
    loading,
    authResolved,
    login,
    logout,
    updateSeller,
    refreshSeller,
    makeAuthenticatedRequest
  }

  return (
    <SellerContext.Provider value={value}>
      {children}
    </SellerContext.Provider>
  )
}