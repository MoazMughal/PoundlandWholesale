// Modern JWT Authentication Manager
// Handles secure login/logout with proper token validation

import { getApiUrl } from './api'

class AuthManager {
  constructor() {
    this.initialized = false
    this.initPromise = null
  }

  // Decode JWT token safely
  decodeToken(token) {
    if (!token || typeof token !== 'string') return null
    
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null
      
      const payload = JSON.parse(atob(parts[1]))
      return payload
    } catch (error) {
      console.error('Failed to decode token:', error)
      return null
    }
  }

  // Check if token is valid (not expired)
  isTokenValid(token) {
    if (!token) return false
    
    const payload = this.decodeToken(token)
    if (!payload || !payload.exp) return false
    
    const now = Math.floor(Date.now() / 1000)
    return payload.exp > now
  }

  // Verify token with backend
  async verifyTokenWithServer(token, userType) {
    if (!token || !this.isTokenValid(token)) {
      return { valid: false, reason: 'Invalid or expired token' }
    }

    try {
      console.log(`🔍 Verifying ${userType} token with server...`)
      
      // Decode token to see what's in it
      const payload = this.decodeToken(token)
      console.log('🔍 Token payload:', { 
        id: payload?.id, 
        role: payload?.role, 
        exp: payload?.exp,
        requestedUserType: userType 
      })
      
      const apiUrl = getApiUrl('auth/verify')
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userType })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Token verification successful:', { 
          userRole: data.role, 
          requestedType: userType 
        })
        return { 
          valid: true, 
          user: data.user, 
          role: data.role,
          tokenPayload: this.decodeToken(token)
        }
      } else {
        const errorData = await response.json()
        console.error('❌ Token verification failed:', errorData)
        return { 
          valid: false, 
          reason: errorData.message || 'Token verification failed' 
        }
      }
    } catch (error) {
      console.error('❌ Token verification error:', error)
      return { 
        valid: false, 
        reason: 'Network error during verification' 
      }
    }
  }

  // Get storage type based on user type
  getStorage(userType) {
    // Sellers use sessionStorage (logout on browser close)
    // Admin and Buyer use localStorage (persist across sessions)
    return userType === 'seller' ? sessionStorage : localStorage
  }

  // Clear all authentication data
  clearAllAuth() {
    const userTypes = ['admin', 'seller', 'buyer']
    
    userTypes.forEach(userType => {
      localStorage.removeItem(`${userType}Token`)
      localStorage.removeItem(`${userType}Data`)
      sessionStorage.removeItem(`${userType}Token`)
      sessionStorage.removeItem(`${userType}Data`)
    })
    
    localStorage.removeItem('activeUserType')
    localStorage.removeItem('currentAuthToken')
    sessionStorage.removeItem('activeUserType')
    
    console.log('🔄 All auth data cleared')
  }

  // Check for server restart and clear auth if detected (disabled for better persistence)
  async checkServerSession() {
    // Disabled server restart detection to prevent unnecessary logouts
    // Users will only be logged out if their token is actually invalid
    return false
  }

  // Save authentication data (single user type only)
  async saveAuth(userType, userData, token) {
    try {
      // Validate token first
      if (!this.isTokenValid(token)) {
        throw new Error('Invalid or expired token')
      }

      // Verify token with server
      const verification = await this.verifyTokenWithServer(token, userType)
      if (!verification.valid) {
        throw new Error(`Token verification failed: ${verification.reason}`)
      }

      // Clear all other auth data to enforce single login
      this.clearAllAuth()

      // Save new auth data
      localStorage.setItem(`${userType}Token`, token)
      localStorage.setItem(`${userType}Data`, JSON.stringify(userData))
      localStorage.setItem('activeUserType', userType)
      localStorage.setItem('currentAuthToken', token)

      console.log(`✅ ${userType} auth saved successfully`)
      return { success: true, user: verification.user, role: verification.role }
    } catch (error) {
      console.error(`❌ Failed to save ${userType} auth:`, error)
      this.clearAllAuth()
      return { success: false, error: error.message }
    }
  }

  // Load and verify authentication data
  async loadAuth(userType) {
    try {
      const token = localStorage.getItem(`${userType}Token`)
      const userData = localStorage.getItem(`${userType}Data`)
      const activeUserType = localStorage.getItem('activeUserType')

      // Check if this user type is active
      if (activeUserType !== userType) {
        return null
      }

      if (!token || !userData) {
        return null
      }

      // Verify token with server
      const verification = await this.verifyTokenWithServer(token, userType)
      if (!verification.valid) {
        console.log(`🔑 ${userType} token verification failed: ${verification.reason}`)
        this.clearAuth(userType)
        return null
      }

      return {
        user: verification.user,
        token,
        role: verification.role,
        tokenPayload: verification.tokenPayload
      }
    } catch (error) {
      console.error(`❌ Failed to load ${userType} auth:`, error)
      this.clearAuth(userType)
      return null
    }
  }

  // Clear specific user type auth
  clearAuth(userType) {
    localStorage.removeItem(`${userType}Token`)
    localStorage.removeItem(`${userType}Data`)
    sessionStorage.removeItem(`${userType}Token`)
    sessionStorage.removeItem(`${userType}Data`)
    
    const activeUserType = localStorage.getItem('activeUserType')
    if (activeUserType === userType) {
      localStorage.removeItem('activeUserType')
      localStorage.removeItem('currentAuthToken')
    }
    
    console.log(`🔄 ${userType} auth cleared`)
  }

  // Initialize authentication on app load - UNIVERSAL MODE
  async initializeAuth() {
    if (this.initialized) {
      return this.initPromise
    }

    this.initPromise = this._performInitialization()
    return this.initPromise
  }

  async _performInitialization() {
    try {
      console.log('🔄 Initializing authentication - UNIVERSAL MODE...')
      
      // STEP 1: Check if we have any auth data at all
      const activeUserType = localStorage.getItem('activeUserType')
      
      if (!activeUserType) {
        console.log('🔍 No active user type found - clean slate')
        this.initialized = true
        return null
      }

      // STEP 2: Get the token for the active user type
      const token = localStorage.getItem(`${activeUserType}Token`)
      
      if (!token) {
        console.log('🔍 No token found for active user type')
        this.clearAuth(activeUserType)
        this.initialized = true
        return null
      }

      // STEP 3: Check if token is still valid (not expired)
      if (!this.isTokenValid(token)) {
        console.log('🔄 Token expired - clearing auth')
        this.clearAuth(activeUserType)
        this.initialized = true
        return null
      }

      // STEP 4: Verify token with server (but be more forgiving)
      try {
        const verification = await this.verifyTokenWithServer(token, activeUserType)
        
        if (!verification.valid) {
          console.log('🔄 Token verification failed - clearing auth')
          this.clearAuth(activeUserType)
          this.initialized = true
          return null
        }

        console.log(`✅ Valid session restored for ${activeUserType}`)
        this.initialized = true
        return {
          userType: activeUserType,
          user: verification.user,
          token: token,
          role: verification.role
        }
        
      } catch (error) {
        // If server is unreachable, don't clear auth - might be network issue
        console.log('🔍 Server verification failed (network issue?) - keeping auth:', error.message)
        
        // Try to get user data from localStorage as fallback
        const userData = localStorage.getItem(`${activeUserType}Data`)
        if (userData) {
          try {
            const user = JSON.parse(userData)
            console.log(`✅ Using cached session for ${activeUserType} (server unreachable)`)
            this.initialized = true
            return {
              userType: activeUserType,
              user: user,
              token: token,
              role: activeUserType // Use userType as role fallback
            }
          } catch (parseError) {
            console.log('🔄 Failed to parse cached user data - clearing auth')
            this.clearAuth(activeUserType)
          }
        }
        
        this.initialized = true
        return null
      }
      
    } catch (error) {
      console.error('❌ Auth initialization error:', error)
      // Don't clear auth on general errors - might be temporary
      console.log('🔍 General error during init - keeping existing auth')
      this.initialized = true
      return null
    }
  }

  // Get current authenticated user
  async getCurrentUser() {
    if (!this.initialized) {
      await this.initializeAuth()
    }

    const activeUserType = localStorage.getItem('activeUserType')
    if (!activeUserType) return null

    return await this.loadAuth(activeUserType)
  }

  // Check if user is authenticated
  async isAuthenticated(userType) {
    const authData = await this.loadAuth(userType)
    return !!authData
  }

  // Make authenticated API request
  async makeAuthenticatedRequest(userType, endpoint, options = {}) {
    const authData = await this.loadAuth(userType)
    
    if (!authData) {
      throw new Error('Authentication required')
    }

    const apiUrl = getApiUrl(endpoint)
    const defaultHeaders = {
      'Authorization': `Bearer ${authData.token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }

    const requestOptions = {
      ...options,
      headers: defaultHeaders
    }

    const response = await fetch(apiUrl, requestOptions)
    
    if (response.status === 401) {
      // Token expired or invalid, clear auth
      this.clearAuth(userType)
      throw new Error('Authentication expired')
    }
    
    return response
  }

  // Logout user
  logout(userType) {
    console.log(`🔄 ${userType} logout initiated`)
    this.clearAuth(userType)
    
    // Reset initialization flag to force re-check on next login
    this.initialized = false
    this.initPromise = null
  }

  // Logout all users
  logoutAll() {
    console.log('🔄 Logging out all users')
    this.clearAllAuth()
    this.initialized = false
    this.initPromise = null
  }
}

// Create singleton instance
const authManager = new AuthManager()

export default authManager