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
          // Set seller data from localStorage first (optimistic)
          setSeller(parsedSeller)
          setIsLoggedIn(true)
          
          // Then validate with server in background
          try {
            const response = await fetch('http://localhost:5000/api/sellers/profile', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            })
            
            if (response.ok) {
              const freshSellerData = await response.json()
              setSeller(freshSellerData)
              localStorage.setItem('sellerData', JSON.stringify(freshSellerData))
            } else if (response.status === 401) {
              // Only clear on 401 (unauthorized) - token is definitely invalid
              console.log('Token is invalid (401), clearing localStorage')
              localStorage.removeItem('sellerToken')
              localStorage.removeItem('sellerData')
              setSeller(null)
              setIsLoggedIn(false)
            }
            // For other errors (500, network issues), keep existing auth state
          } catch (networkError) {
            console.log('Network error during token validation, keeping existing auth state')
            // Keep the seller logged in if it's just a network issue
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
  }

  const logout = () => {
    setSeller(null)
    setIsLoggedIn(false)
    localStorage.removeItem('sellerToken')
    localStorage.removeItem('sellerData')
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