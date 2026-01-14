// Simple authentication persistence utility
class AuthPersistence {
  constructor() {
    this.ADMIN_TOKEN_KEY = 'adminToken'
    this.ADMIN_DATA_KEY = 'adminData'
    this.SESSION_START_KEY = 'adminSessionStart'
  }

  // Save authentication data
  saveAuth(admin, token) {
    try {
      localStorage.setItem(this.ADMIN_TOKEN_KEY, token)
      localStorage.setItem(this.ADMIN_DATA_KEY, JSON.stringify(admin))
      localStorage.setItem(this.SESSION_START_KEY, Date.now().toString())
      return true
    } catch (error) {
      console.error('Failed to save auth data:', error)
      return false
    }
  }

  // Load authentication data
  loadAuth() {
    try {
      const token = localStorage.getItem(this.ADMIN_TOKEN_KEY)
      const adminData = localStorage.getItem(this.ADMIN_DATA_KEY)
      
      if (!token || !adminData) {
        return null
      }

      const admin = JSON.parse(adminData)
      return { admin, token }
    } catch (error) {
      console.error('Failed to load auth data:', error)
      this.clearAuth()
      return null
    }
  }

  // Clear authentication data
  clearAuth() {
    localStorage.removeItem(this.ADMIN_TOKEN_KEY)
    localStorage.removeItem(this.ADMIN_DATA_KEY)
    localStorage.removeItem(this.SESSION_START_KEY)
  }

  // Check if token exists
  hasToken() {
    return !!localStorage.getItem(this.ADMIN_TOKEN_KEY)
  }

  // Get session age in hours
  getSessionAge() {
    const sessionStart = localStorage.getItem(this.SESSION_START_KEY)
    if (!sessionStart) return 0
    
    const ageMs = Date.now() - parseInt(sessionStart)
    return ageMs / (1000 * 60 * 60) // Convert to hours
  }

  // Check if session is too old (more than 7 days)
  isSessionExpired() {
    return this.getSessionAge() > (7 * 24) // 7 days in hours
  }

  // Update admin data only
  updateAdminData(admin) {
    try {
      localStorage.setItem(this.ADMIN_DATA_KEY, JSON.stringify(admin))
      return true
    } catch (error) {
      console.error('Failed to update admin data:', error)
      return false
    }
  }

  // Update token only
  updateToken(token) {
    try {
      localStorage.setItem(this.ADMIN_TOKEN_KEY, token)
      return true
    } catch (error) {
      console.error('Failed to update token:', error)
      return false
    }
  }
}

export default new AuthPersistence()