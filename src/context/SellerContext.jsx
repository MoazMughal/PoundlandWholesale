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

  useEffect(() => {
    const initializeAuth = async () => {
      // Don't initialize seller auth on admin routes
      if (window.location.pathname.startsWith('/admin')) {
        setLoading(false)
        return
      }
      
      // Check for server restart first
      try {
        const storedServerStart = localStorage.getItem('sellerServerStartTime')
        const response = await fetch('/api/health', {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        })
        
        if (response.ok) {
          const healthData = await response.json()
          const currentServerStart = healthData.serverStartTime
          
          // Check if we have seller auth data
          const hasSellerAuth = localStorage.getItem('sellerToken') && localStorage.getItem('sellerData')
          
          // If we have auth data but no stored server start time, this means server restarted
          if (hasSellerAuth && !storedServerStart && currentServerStart) {
            console.log('🔄 Server restart detected for seller (no stored server start time), clearing auth data')
            localStorage.removeItem('sellerToken')
            localStorage.removeItem('sellerData')
            localStorage.setItem('sellerServerStartTime', currentServerStart.toString())
            sessionStorage.removeItem('sellerBrowserSession')
            sessionStorage.removeItem('seller_logged_out')
            setSeller(null)
            setIsLoggedIn(false)
            setLoading(false)
            return
          }
          
          // If we have a stored server start time and it's different, server restarted
          if (currentServerStart && storedServerStart && storedServerStart !== currentServerStart.toString()) {
            console.log('🔄 Server restart detected for seller (different server start time), clearing auth data')
            localStorage.removeItem('sellerToken')
            localStorage.removeItem('sellerData')
            localStorage.setItem('sellerServerStartTime', currentServerStart.toString())
            sessionStorage.removeItem('sellerBrowserSession')
            sessionStorage.removeItem('seller_logged_out')
            setSeller(null)
            setIsLoggedIn(false)
            setLoading(false)
            return
          }
          
          // Update stored server start time if not set
          if (currentServerStart && !storedServerStart) {
            localStorage.setItem('sellerServerStartTime', currentServerStart.toString())
          }
        }
      } catch (error) {
        console.log('🔍 Could not check server restart status for seller:', error.message)
      }
      
      // Check if this is a fresh browser session (new browser window/tab from scratch)
      const browserSessionId = sessionStorage.getItem('sellerBrowserSession')
      if (!browserSessionId) {
        // Only clear auth on fresh session if we're on seller-specific pages
        // For product pages and other non-seller pages, preserve auth state for cross-tab compatibility
        if (window.location.pathname.startsWith('/seller/') || 
            window.location.pathname.startsWith('/login/supplier') ||
            window.location.pathname.startsWith('/register/supplier')) {
          console.log('🔑 Fresh browser session detected for seller on seller page, clearing any existing auth')
          localStorage.removeItem('sellerToken')
          localStorage.removeItem('sellerData')
          sessionStorage.removeItem('seller_logged_out')
          setSeller(null)
          setIsLoggedIn(false)
          setLoading(false)
          return
        } else {
          // On non-seller pages (like product pages), preserve auth but initialize session
          console.log('🔑 Fresh browser session on non-seller page, preserving auth state for cross-tab compatibility')
          sessionStorage.setItem('sellerBrowserSession', Date.now().toString())
        }
      }
      
      // Check for logout flag (set when user logs out)
      const logoutFlag = sessionStorage.getItem('seller_logged_out')
      if (logoutFlag) {
        // User has logged out, clear everything
        localStorage.removeItem('sellerToken')
        localStorage.removeItem('sellerData')
        setSeller(null)
        setIsLoggedIn(false)
        setLoading(false)
        return
      }
      
      const token = localStorage.getItem('sellerToken')
      const sellerData = localStorage.getItem('sellerData')
      
      if (token && sellerData) {
        try {
          const parsedSeller = JSON.parse(sellerData)
          
          // Basic JWT validation for seller token
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

          if (!isValidJWT(token)) {
            console.log('🔑 Seller token is invalid or expired, clearing auth data')
            localStorage.removeItem('sellerToken')
            localStorage.removeItem('sellerData')
            setSeller(null)
            setIsLoggedIn(false)
            setLoading(false)
            return
          }
          
          // Set seller data from localStorage first (optimistic)
          setSeller(parsedSeller)
          setIsLoggedIn(true)
          
          // Then validate with server in background (only for seller pages)
          if (window.location.pathname.startsWith('/seller/') || 
              window.location.pathname.startsWith('/login/supplier') ||
              window.location.pathname.startsWith('/register/supplier')) {
            try {
              const response = await fetch('http://localhost:5000/api/sellers/profile', {
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                signal: AbortSignal.timeout(8000)
              })
              
              if (response.ok) {
                const freshSellerData = await response.json()
                setSeller(freshSellerData)
                localStorage.setItem('sellerData', JSON.stringify(freshSellerData))
              } else if (response.status === 401) {
                // Only clear on 401 (unauthorized) - token is definitely invalid
                console.log('🔑 Seller token validation failed - unauthorized')
                localStorage.removeItem('sellerToken')
                localStorage.removeItem('sellerData')
                setSeller(null)
                setIsLoggedIn(false)
              }
              // For other errors (500, network issues), keep existing auth state
            } catch (networkError) {
              // Keep the seller logged in if it's just a network issue
              console.log('🔑 Seller token validation network error - keeping auth state')
            }
          }
        } catch (parseError) {
          console.error('Error parsing seller data:', parseError)
          localStorage.removeItem('sellerToken')
          localStorage.removeItem('sellerData')
          setSeller(null)
          setIsLoggedIn(false)
        }
      }
      setLoading(false)
    }
    
    initializeAuth()
  }, [])

  const login = (sellerData, token) => {
    setSeller(sellerData)
    setIsLoggedIn(true)
    localStorage.setItem('sellerToken', token)
    localStorage.setItem('sellerData', JSON.stringify(sellerData))
    // Clear logout flag on successful login
    sessionStorage.removeItem('seller_logged_out')
    // Initialize browser session if not exists
    if (!sessionStorage.getItem('sellerBrowserSession')) {
      sessionStorage.setItem('sellerBrowserSession', Date.now().toString())
    }
  }

  const logout = () => {
    setSeller(null)
    setIsLoggedIn(false)
    localStorage.removeItem('sellerToken')
    localStorage.removeItem('sellerData')
    sessionStorage.removeItem('sellerBrowserSession')
    // Set logout flag to prevent back button access
    sessionStorage.setItem('seller_logged_out', 'true')
    // Force page reload to clear all state and redirect to supplier login
    window.location.href = '/login/supplier'
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
    if (token) {
      try {
        const response = await fetch('http://localhost:5000/api/sellers/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          updateSeller(data)
        }
      } catch (error) {
        // Silent error handling
      }
    }
  }

  const value = {
    seller,
    isLoggedIn,
    loading,
    login,
    logout,
    updateSeller,
    refreshSeller
  }

  return (
    <SellerContext.Provider value={value}>
      {children}
    </SellerContext.Provider>
  )
}