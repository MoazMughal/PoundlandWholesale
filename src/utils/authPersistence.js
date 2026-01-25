// Simple authentication persistence utility
class AuthPersistence {
  constructor() {
    this.ADMIN_TOKEN_KEY = 'adminToken'
    this.ADMIN_DATA_KEY = 'adminData'
    this.SESSION_START_KEY = 'adminSessionStart'
    this.SERVER_START_KEY = 'serverStartTime'
    this.BROWSER_SESSION_KEY = 'browserSessionId'
  }

  // Save authentication data
  saveAuth(admin, token) {
    try {
      localStorage.setItem(this.ADMIN_TOKEN_KEY, token)
      localStorage.setItem(this.ADMIN_DATA_KEY, JSON.stringify(admin))
      localStorage.setItem(this.SESSION_START_KEY, Date.now().toString())
      
      // Generate browser session ID if not exists
      if (!sessionStorage.getItem(this.BROWSER_SESSION_KEY)) {
        sessionStorage.setItem(this.BROWSER_SESSION_KEY, Date.now().toString())
      }
      
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
    localStorage.removeItem(this.SERVER_START_KEY)
    sessionStorage.removeItem(this.BROWSER_SESSION_KEY)
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

  // Check if server has restarted since last login
  async checkServerRestart() {
    try {
      const storedServerStart = localStorage.getItem(this.SERVER_START_KEY)
      
      // Fetch current server start time
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      
      if (!response.ok) {
        return false // Assume no restart if can't check
      }
      
      const healthData = await response.json()
      const currentServerStart = healthData.serverStartTime
      
      if (!currentServerStart) {
        return false // Can't determine, assume no restart
      }
      
      // If we have auth data but no stored server start time, this means server restarted
      // or this is the first time checking after server start
      if (this.hasToken() && !storedServerStart) {
        console.log('🔄 Server restart detected (no stored server start time), clearing auth data')
        this.clearAuth()
        localStorage.setItem(this.SERVER_START_KEY, currentServerStart.toString())
        return true
      }
      
      // If we have a stored server start time and it's different, server restarted
      if (storedServerStart && storedServerStart !== currentServerStart.toString()) {
        console.log('🔄 Server restart detected (different server start time), clearing auth data')
        this.clearAuth()
        localStorage.setItem(this.SERVER_START_KEY, currentServerStart.toString())
        return true
      }
      
      // Update stored server start time if not set
      if (!storedServerStart) {
        localStorage.setItem(this.SERVER_START_KEY, currentServerStart.toString())
      }
      
      return false
      
    } catch (error) {
      console.log('🔍 Could not check server restart status:', error.message)
      return false // Assume no restart on error
    }
  }

  // Check if this is a fresh browser session
  isFreshBrowserSession() {
    return !sessionStorage.getItem(this.BROWSER_SESSION_KEY)
  }

  // Initialize browser session
  initializeBrowserSession() {
    if (!sessionStorage.getItem(this.BROWSER_SESSION_KEY)) {
      sessionStorage.setItem(this.BROWSER_SESSION_KEY, Date.now().toString())
    }
  }
}

export default new AuthPersistence()