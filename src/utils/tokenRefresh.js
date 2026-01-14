import { getApiUrl } from './api'
import authPersistence from './authPersistence'

class TokenRefreshManager {
  constructor() {
    this.refreshInterval = null
    this.isRefreshing = false
    this.REFRESH_INTERVAL = 30 * 60 * 1000 // 30 minutes
  }

  startAutoRefresh(onTokenRefreshed, onRefreshFailed) {
    // Clear any existing interval
    this.stopAutoRefresh()

    this.refreshInterval = setInterval(async () => {
      await this.refreshToken(onTokenRefreshed, onRefreshFailed)
    }, this.REFRESH_INTERVAL)

    console.log('🔄 Token auto-refresh started (every 30 minutes)')
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
      console.log('🔄 Token auto-refresh stopped')
    }
  }

  async refreshToken(onTokenRefreshed, onRefreshFailed) {
    if (this.isRefreshing) return

    const authData = authPersistence.loadAuth()
    if (!authData) return

    const { token } = authData
    this.isRefreshing = true

    try {
      const response = await fetch(getApiUrl('auth/refresh'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update stored token and admin data
        authPersistence.saveAuth(data.admin, data.token)
        
        console.log('✅ Token refreshed successfully')
        
        if (onTokenRefreshed) {
          onTokenRefreshed(data.admin, data.token)
        }
      } else if (response.status === 401) {
        console.log('🔑 Token refresh failed - token expired')
        if (onRefreshFailed) {
          onRefreshFailed()
        }
      }
    } catch (error) {
      console.log('🔑 Token refresh error:', error.message)
      // Don't call onRefreshFailed for network errors
    } finally {
      this.isRefreshing = false
    }
  }
}

export default new TokenRefreshManager()