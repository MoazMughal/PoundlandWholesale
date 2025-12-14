// Authentication Session Manager
// Handles auto-logout on browser close and inactivity

const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute

class AuthSessionManager {
  constructor() {
    this.activityTimer = null;
    this.init();
  }

  init() {
    // Check if this is a fresh browser session
    this.checkFreshSession();
    
    // Start activity monitoring
    this.startActivityMonitoring();
    
    // Add visibility change listener
    this.handleVisibilityChange();
  }

  checkFreshSession() {
    const sessionId = sessionStorage.getItem('sessionId');
    const lastActivity = localStorage.getItem('lastActivity');
    
    if (!sessionId) {
      // New browser session - but don't clear auth data immediately
      // Only clear if there's no valid token or if session is truly expired
      const hasValidTokens = localStorage.getItem('adminToken') || 
                            localStorage.getItem('sellerToken') || 
                            localStorage.getItem('buyerToken');
      
      if (!hasValidTokens) {
        console.log('🔄 New browser session with no tokens - clearing auth data');
        this.clearAllAuth();
      } else {
        console.log('🔄 New browser session but tokens exist - keeping auth data');
      }
      
      // Create new session ID
      const newSessionId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('sessionId', newSessionId);
      localStorage.setItem('lastActivity', Date.now().toString());
    } else if (lastActivity) {
      // Check if session expired due to inactivity
      const timeSinceActivity = Date.now() - parseInt(lastActivity);
      if (timeSinceActivity > SESSION_TIMEOUT) {
        console.log('⏰ Session expired due to inactivity');
        this.clearAllAuth();
      }
    }
  }

  startActivityMonitoring() {
    // Update last activity on user interaction
    const updateActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString());
    };

    // Track user activity
    ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Periodic check for session timeout
    this.activityTimer = setInterval(() => {
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity) {
        const timeSinceActivity = Date.now() - parseInt(lastActivity);
        if (timeSinceActivity > SESSION_TIMEOUT) {
          console.log('⏰ Auto-logout due to inactivity');
          this.logout();
          window.location.href = '/';
        }
      }
    }, ACTIVITY_CHECK_INTERVAL);
  }

  handleVisibilityChange() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Tab/window hidden - mark timestamp
        sessionStorage.setItem('hiddenAt', Date.now().toString());
      } else {
        // Tab/window visible again - check if too much time passed
        const hiddenAt = sessionStorage.getItem('hiddenAt');
        if (hiddenAt) {
          const timeHidden = Date.now() - parseInt(hiddenAt);
          // If hidden for more than 24 hours, logout
          if (timeHidden > SESSION_TIMEOUT) {
            console.log('⏰ Auto-logout after long inactivity');
            this.logout();
            window.location.href = '/';
          }
        }
      }
    });
  }

  clearAllAuth() {
    // Clear all authentication data
    const keysToRemove = [
      'adminToken', 'adminData',
      'sellerToken', 'sellerData',
      'buyerToken', 'buyerData',
      'token', 'user'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    // Keep session tracking
    const sessionId = sessionStorage.getItem('sessionId');
    if (sessionId) {
      sessionStorage.clear();
      sessionStorage.setItem('sessionId', sessionId);
    }
  }

  logout() {
    this.clearAllAuth();
    
    // Clear activity timer
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
    }
  }

  isAuthenticated(userType) {
    const token = localStorage.getItem(`${userType}Token`) || 
                  sessionStorage.getItem(`${userType}Token`);
    return !!token;
  }

  getUserType() {
    if (this.isAuthenticated('admin')) return 'admin';
    if (this.isAuthenticated('seller')) return 'seller';
    if (this.isAuthenticated('buyer')) return 'buyer';
    return null;
  }
}

// Create singleton instance
const authSessionManager = new AuthSessionManager();

export default authSessionManager;

// Export utility functions
export const clearAllAuth = () => authSessionManager.clearAllAuth();
export const logout = () => authSessionManager.logout();
export const isAuthenticated = (userType) => authSessionManager.isAuthenticated(userType);
export const getUserType = () => authSessionManager.getUserType();
