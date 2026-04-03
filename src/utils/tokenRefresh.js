import { getApiUrl } from './api'
import authPersistence from './authPersistence'

// TOKEN REFRESH IS DISABLED - Sessions expire after 2 hours and require re-login
// This is intentional: tokens are set to 2h expiry on the server.
// Users must log in again after 2 hours.

class TokenRefreshManager {
  constructor() {
    this.refreshInterval = null
    this.isRefreshing = false
  }

  // Auto-refresh disabled - 2h forced re-login policy
  startAutoRefresh(onTokenRefreshed, onRefreshFailed) {
    console.log('🔄 Token auto-refresh is disabled (2h session policy)')
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
  }

  async refreshToken(onTokenRefreshed, onRefreshFailed) {
    // Disabled - users must re-login after 2 hours
    console.log('🔄 Token refresh disabled - 2h session policy enforced')
  }
}

export default new TokenRefreshManager()
