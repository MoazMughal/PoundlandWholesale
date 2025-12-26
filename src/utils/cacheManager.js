// Cache Manager for API responses
const CACHE_PREFIX = 'amazon_gymkhana_cache_'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

export const cacheManager = {
  /**
   * Set data in cache with expiration
   */
  set: (key, data, duration = CACHE_DURATION) => {
    try {
      const cacheData = {
        data: data,
        timestamp: Date.now(),
        expiration: Date.now() + duration
      }
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData))
      return true
    } catch (error) {
      console.error('Cache set error:', error)
      // If localStorage is full, clear old cache
      if (error.name === 'QuotaExceededError') {
        cacheManager.clearExpired()
        try {
          localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData))
          return true
        } catch (retryError) {
          console.error('Cache set retry failed:', retryError)
          return false
        }
      }
      return false
    }
  },

  /**
   * Get data from cache if not expired
   */
  get: (key) => {
    try {
      const cached = localStorage.getItem(CACHE_PREFIX + key)
      if (!cached) return null

      const cacheData = JSON.parse(cached)
      
      // Check if cache is expired
      if (Date.now() > cacheData.expiration) {
        localStorage.removeItem(CACHE_PREFIX + key)
        return null
      }

      return cacheData.data
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  },

  /**
   * Remove specific cache entry
   */
  remove: (key) => {
    try {
      localStorage.removeItem(CACHE_PREFIX + key)
      return true
    } catch (error) {
      console.error('Cache remove error:', error)
      return false
    }
  },

  /**
   * Clear all expired cache entries
   */
  clearExpired: () => {
    try {
      const keys = Object.keys(localStorage)
      const now = Date.now()
      let clearedCount = 0

      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          try {
            const cached = localStorage.getItem(key)
            if (cached) {
              const cacheData = JSON.parse(cached)
              if (now > cacheData.expiration) {
                localStorage.removeItem(key)
                clearedCount++
              }
            }
          } catch (error) {
            // If parsing fails, remove the corrupted cache
            localStorage.removeItem(key)
            clearedCount++
          }
        }
      })

      return clearedCount
    } catch (error) {
      console.error('Clear expired cache error:', error)
      return 0
    }
  },

  /**
   * Clear all cache entries
   */
  clearAll: () => {
    try {
      const keys = Object.keys(localStorage)
      let clearedCount = 0

      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key)
          clearedCount++
        }
      })

      return clearedCount
    } catch (error) {
      console.error('Clear all cache error:', error)
      return 0
    }
  },

  /**
   * Get cache statistics
   */
  getStats: () => {
    try {
      const keys = Object.keys(localStorage)
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX))
      const now = Date.now()
      
      let totalSize = 0
      let validCount = 0
      let expiredCount = 0

      cacheKeys.forEach(key => {
        const value = localStorage.getItem(key)
        if (value) {
          totalSize += value.length
          try {
            const cacheData = JSON.parse(value)
            if (now > cacheData.expiration) {
              expiredCount++
            } else {
              validCount++
            }
          } catch (error) {
            expiredCount++
          }
        }
      })

      return {
        totalEntries: cacheKeys.length,
        validEntries: validCount,
        expiredEntries: expiredCount,
        totalSizeKB: (totalSize / 1024).toFixed(2)
      }
    } catch (error) {
      console.error('Get cache stats error:', error)
      return null
    }
  }
}

// Auto-clear expired cache on page load
if (typeof window !== 'undefined') {
  // Clear expired cache when page loads
  setTimeout(() => {
    cacheManager.clearExpired()
  }, 1000)
}

export default cacheManager
