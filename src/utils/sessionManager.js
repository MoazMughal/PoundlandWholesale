import { getApiUrl } from '../utils/api.js';

// Session management utility
class SessionManager {
  constructor() {
    this.SESSION_KEY = 'admin_session_id';
    this.LOGOUT_FLAG = 'admin_logged_out';
    this.SESSION_TIMESTAMP = 'admin_session_timestamp';
    this.SESSION_TIMEOUT = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
  }

  // Initialize a new session
  initSession() {
    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    
    // Use localStorage for persistence across tabs
    localStorage.setItem(this.SESSION_KEY, sessionId);
    localStorage.setItem(this.SESSION_TIMESTAMP, timestamp.toString());
    
    // Also set in sessionStorage for tab-specific tracking
    sessionStorage.setItem(this.SESSION_KEY, sessionId);
    
    return sessionId;
  }

  // Check if session exists and is valid
  hasSession() {
    const sessionId = localStorage.getItem(this.SESSION_KEY);
    const timestamp = localStorage.getItem(this.SESSION_TIMESTAMP);
    
    if (!sessionId || !timestamp) {
      return false;
    }
    
    // Check if session has expired
    const sessionAge = Date.now() - parseInt(timestamp);
    if (sessionAge > this.SESSION_TIMEOUT) {
      this.clearSession();
      return false;
    }
    
    // Update sessionStorage for current tab
    sessionStorage.setItem(this.SESSION_KEY, sessionId);
    
    return true;
  }

  // Get current session ID
  getSessionId() {
    return localStorage.getItem(this.SESSION_KEY) || sessionStorage.getItem(this.SESSION_KEY);
  }

  // Update session timestamp (for activity tracking)
  updateSessionActivity() {
    if (this.hasSession()) {
      localStorage.setItem(this.SESSION_TIMESTAMP, Date.now().toString());
    }
  }

  // Set logout flag
  setLogoutFlag() {
    localStorage.setItem(this.LOGOUT_FLAG, 'true');
    sessionStorage.setItem(this.LOGOUT_FLAG, 'true');
  }

  // Check logout flag
  hasLogoutFlag() {
    return localStorage.getItem(this.LOGOUT_FLAG) === 'true' || 
           sessionStorage.getItem(this.LOGOUT_FLAG) === 'true';
  }

  // Clear logout flag
  clearLogoutFlag() {
    localStorage.removeItem(this.LOGOUT_FLAG);
    sessionStorage.removeItem(this.LOGOUT_FLAG);
  }

  // Clear all session data
  clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.SESSION_TIMESTAMP);
    localStorage.removeItem(this.LOGOUT_FLAG);
    sessionStorage.removeItem(this.SESSION_KEY);
    sessionStorage.removeItem(this.LOGOUT_FLAG);
  }

  // Check if server has restarted by validating session with server
  async isServerSessionValid(token) {
    if (!token) return false;
    
    try {
      const response = await fetch(getApiUrl('auth/verify'), {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(3000)
      });
      
      return response.ok;
    } catch (error) {
      // On network error, assume session is invalid to be safe
      console.log('🔍 Server session validation failed:', error.message);
      return false;
    }
  }

  // Check if this is a fresh browser session (only for new browser instances)
  isFreshSession() {
    // Check if we have a valid session in localStorage
    const hasValidSession = this.hasSession();
    
    // If we have a valid session in localStorage but not in sessionStorage,
    // it means this is a new tab, not a fresh browser session
    const hasSessionStorage = !!sessionStorage.getItem(this.SESSION_KEY);
    
    // More strict check: if sessionStorage is empty, consider it a fresh session
    // This ensures admin must login again after browser restart
    if (!hasSessionStorage) {
      console.log('🔄 No sessionStorage found, treating as fresh session');
      return true;
    }
    
    // Only consider it fresh if there's no valid session at all
    const isFresh = !hasValidSession;
    if (isFresh) {
      console.log('🔄 No valid session found, treating as fresh session');
    }
    return isFresh;
  }

  // Check if this is a new tab (has localStorage session but no sessionStorage)
  isNewTab() {
    const hasLocalSession = !!localStorage.getItem(this.SESSION_KEY);
    const hasSessionStorage = !!sessionStorage.getItem(this.SESSION_KEY);
    const hasValidSession = this.hasSession();
    
    // Only consider it a new tab if:
    // 1. We have a valid session in localStorage
    // 2. No sessionStorage session exists
    // 3. The session is still valid (not expired)
    return hasLocalSession && !hasSessionStorage && hasValidSession;
  }
}

export default new SessionManager();