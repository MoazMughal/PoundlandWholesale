import { createContext, useContext, useState, useEffect } from 'react'
import { getApiUrl } from '../utils/api'

const BuyerContext = createContext()

export const useBuyer = () => {
  const context = useContext(BuyerContext)
  if (!context) {
    throw new Error('useBuyer must be used within a BuyerProvider')
  }
  return context
}

export const BuyerProvider = ({ children }) => {
  const [buyer, setBuyer] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      // Don't initialize buyer auth on admin or seller routes
      if (window.location.pathname.startsWith('/admin') || 
          window.location.pathname.startsWith('/seller')) {
        setLoading(false)
        return
      }
      
      // Check for server restart first
      try {
        const storedServerStart = localStorage.getItem('buyerServerStartTime')
        const response = await fetch('/api/health', {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        })
        
        if (response.ok) {
          const healthData = await response.json()
          const currentServerStart = healthData.serverStartTime
          
          // Check if we have buyer auth data
          const hasBuyerAuth = localStorage.getItem('buyerToken') && localStorage.getItem('buyerData')
          
          // If we have auth data but no stored server start time, this means server restarted
          if (hasBuyerAuth && !storedServerStart && currentServerStart) {
            console.log('🔄 Server restart detected for buyer (no stored server start time), clearing auth data')
            localStorage.removeItem('buyerToken')
            localStorage.removeItem('buyerData')
            localStorage.setItem('buyerServerStartTime', currentServerStart.toString())
            sessionStorage.removeItem('buyerBrowserSession')
            sessionStorage.removeItem('buyer_logged_out')
            setBuyer(null)
            setIsLoggedIn(false)
            setLoading(false)
            return
          }
          
          // If we have a stored server start time and it's different, server restarted
          if (currentServerStart && storedServerStart && storedServerStart !== currentServerStart.toString()) {
            console.log('🔄 Server restart detected for buyer (different server start time), clearing auth data')
            localStorage.removeItem('buyerToken')
            localStorage.removeItem('buyerData')
            localStorage.setItem('buyerServerStartTime', currentServerStart.toString())
            sessionStorage.removeItem('buyerBrowserSession')
            sessionStorage.removeItem('buyer_logged_out')
            setBuyer(null)
            setIsLoggedIn(false)
            setLoading(false)
            return
          }
          
          // Update stored server start time if not set
          if (currentServerStart && !storedServerStart) {
            localStorage.setItem('buyerServerStartTime', currentServerStart.toString())
          }
        }
      } catch (error) {
        console.log('🔍 Could not check server restart status for buyer:', error.message)
      }
      
      // Check if this is a fresh browser session (new browser window/tab from scratch)
      const browserSessionId = sessionStorage.getItem('buyerBrowserSession')
      if (!browserSessionId) {
        // Only clear auth on fresh session if we're on buyer-specific pages
        // For product pages and other non-buyer pages, preserve auth state for cross-tab compatibility
        if (window.location.pathname.startsWith('/buyer/') || 
            window.location.pathname.startsWith('/login/buyer') ||
            window.location.pathname.startsWith('/register/buyer')) {
          console.log('🔑 Fresh browser session detected for buyer on buyer page, clearing any existing auth')
          localStorage.removeItem('buyerToken')
          localStorage.removeItem('buyerData')
          sessionStorage.removeItem('buyer_logged_out')
          setBuyer(null)
          setIsLoggedIn(false)
          setLoading(false)
          return
        } else {
          // On non-buyer pages (like product pages), preserve auth but initialize session
          console.log('🔑 Fresh browser session on non-buyer page, preserving auth state for cross-tab compatibility')
          sessionStorage.setItem('buyerBrowserSession', Date.now().toString())
        }
      }
      
      // Check for logout flag (set when user logs out)
      const logoutFlag = sessionStorage.getItem('buyer_logged_out')
      if (logoutFlag) {
        // User has logged out, clear everything
        localStorage.removeItem('buyerToken')
        localStorage.removeItem('buyerData')
        setBuyer(null)
        setIsLoggedIn(false)
        setLoading(false)
        return
      }
      
      const token = localStorage.getItem('buyerToken')
      const buyerData = localStorage.getItem('buyerData')
      
      if (token && buyerData) {
        try {
          const parsedBuyer = JSON.parse(buyerData)
          
          // Basic JWT validation for buyer token
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
            console.log('🔑 Buyer token is invalid or expired, clearing auth data')
            localStorage.removeItem('buyerToken')
            localStorage.removeItem('buyerData')
            setBuyer(null)
            setIsLoggedIn(false)
            setLoading(false)
            return
          }
          
          // Set buyer data from localStorage first (optimistic)
          setBuyer(parsedBuyer)
          setIsLoggedIn(true)
          
          // Then validate with server in background (only for buyer pages)
          if (window.location.pathname.startsWith('/buyer/') || 
              window.location.pathname.startsWith('/login/buyer') ||
              window.location.pathname.startsWith('/register/buyer')) {
            try {
              const response = await fetch(getApiUrl('buyer/profile'), {
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                signal: AbortSignal.timeout(8000)
              })
              
              if (response.ok) {
                const freshBuyerData = await response.json()
                setBuyer(freshBuyerData)
                localStorage.setItem('buyerData', JSON.stringify(freshBuyerData))
              } else if (response.status === 401) {
                // Only clear on 401 (unauthorized) - token is definitely invalid
                console.log('🔑 Buyer token validation failed - unauthorized')
                localStorage.removeItem('buyerToken')
                localStorage.removeItem('buyerData')
                setBuyer(null)
                setIsLoggedIn(false)
              }
              // For other errors (500, network issues), keep existing auth state
            } catch (networkError) {
              // Keep the buyer logged in if it's just a network issue
              console.log('🔑 Buyer token validation network error - keeping auth state')
            }
          }
        } catch (parseError) {
          console.error('Error parsing buyer data:', parseError)
          localStorage.removeItem('buyerToken')
          localStorage.removeItem('buyerData')
          setBuyer(null)
          setIsLoggedIn(false)
        }
      }
      setLoading(false)
    }
    
    initializeAuth()
  }, [])

  const login = (buyerData, token) => {
    setBuyer(buyerData)
    setIsLoggedIn(true)
    localStorage.setItem('buyerToken', token)
    localStorage.setItem('buyerData', JSON.stringify(buyerData))
    // Clear logout flag on successful login
    sessionStorage.removeItem('buyer_logged_out')
    // Initialize browser session if not exists
    if (!sessionStorage.getItem('buyerBrowserSession')) {
      sessionStorage.setItem('buyerBrowserSession', Date.now().toString())
    }
  }

  const logout = () => {
    setBuyer(null)
    setIsLoggedIn(false)
    localStorage.removeItem('buyerToken')
    localStorage.removeItem('buyerData')
    sessionStorage.removeItem('buyerBrowserSession')
    // Set logout flag to prevent back button access
    sessionStorage.setItem('buyer_logged_out', 'true')
    // Force page reload to clear all state and redirect to buyer login
    window.location.href = '/login/buyer'
  }

  const updateBuyer = (updatedData) => {
    setBuyer(updatedData)
    localStorage.setItem('buyerData', JSON.stringify(updatedData))
  }

  const refreshBuyer = async () => {
    // Don't refresh buyer on admin or seller routes
    if (window.location.pathname.startsWith('/admin') || 
        window.location.pathname.startsWith('/seller')) {
      return
    }
    
    const token = localStorage.getItem('buyerToken')
    if (token) {
      try {
        const response = await fetch(getApiUrl('buyer/profile'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (response.ok) {
          const data = await response.json()
          updateBuyer(data)
        }
      } catch (error) {
        // Silent error handling
      }
    }
  }

  const value = {
    buyer,
    isLoggedIn,
    loading,
    login,
    logout,
    updateBuyer,
    refreshBuyer
  }

  return (
    <BuyerContext.Provider value={value}>
      {children}
    </BuyerContext.Provider>
  )
}