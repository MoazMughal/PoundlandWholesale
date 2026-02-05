import { createContext, useContext, useState, useEffect } from 'react'
import authManager from '../utils/authManager'

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
      console.log('🔑 Initializing buyer auth...')

      try {
        // Initialize auth manager and check for valid tokens
        const authData = await authManager.initializeAuth()
        
        if (authData && authData.userType === 'buyer') {
          console.log('✅ Valid buyer auth found after verification')
          setBuyer(authData.user)
          setIsLoggedIn(true)
        } else {
          console.log('🔍 No valid buyer auth found')
        }
      } catch (error) {
        console.error('❌ Buyer auth initialization error:', error)
        // Don't clear auth on error - might be temporary
      } finally {
        setLoading(false)
      }
    }
    
    initializeAuth()
  }, [])

  const login = async (buyerData, token) => {
    try {
      console.log('🔑 Buyer login initiated')
      
      // Save and verify auth with new auth manager
      const result = await authManager.saveAuth('buyer', buyerData, token)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save buyer authentication')
      }
      
      console.log('✅ Buyer auth saved and verified')
      
      // Update context state
      setBuyer(result.user)
      setIsLoggedIn(true)
      
      console.log('✅ Buyer login successful - context updated')
      
      return { success: true }
    } catch (error) {
      console.error('❌ Buyer login error:', error)
      throw error
    }
  }

  const logout = () => {
    console.log('🔄 Buyer logout initiated')
    
    // Clear auth data
    authManager.logout('buyer')
    
    // Update state
    setBuyer(null)
    setIsLoggedIn(false)
    
    // Force page reload to clear all state and redirect to buyer login
    window.location.href = '/login/buyer'
  }

  const updateBuyer = (updatedData) => {
    setBuyer(updatedData)
    // Update stored data
    const token = localStorage.getItem('buyerToken')
    if (token) {
      localStorage.setItem('buyerData', JSON.stringify(updatedData))
    }
  }

  const refreshBuyer = async () => {
    // Don't refresh buyer on admin or seller routes
    if (window.location.pathname.startsWith('/admin') || 
        window.location.pathname.startsWith('/seller')) {
      return
    }
    
    try {
      const authData = await authManager.loadAuth('buyer')
      if (authData) {
        setBuyer(authData.user)
        setIsLoggedIn(true)
      }
    } catch (error) {
      console.warn('Failed to refresh buyer:', error)
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