// Session management utility
class SessionManager {
  constructor() {
    this.SESSION_KEY = 'admin_session_id';
    this.LOGOUT_FLAG = 'admin_logged_out';
  }

  // Initialize a new session
  initSession() {
    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem(this.SESSION_KEY, sessionId);
    return sessionId;
  }

  // Check if session exists
  hasSession() {
    return !!sessionStorage.getItem(this.SESSION_KEY);
  }

  // Get current session ID
  getSessionId() {
    return sessionStorage.getItem(this.SESSION_KEY);
  }

  // Set logout flag
  setLogoutFlag() {
    sessionStorage.setItem(this.LOGOUT_FLAG, 'true');
  }

  // Check logout flag
  hasLogoutFlag() {
    return sessionStorage.getItem(this.LOGOUT_FLAG) === 'true';
  }

  // Clear logout flag
  clearLogoutFlag() {
    sessionStorage.removeItem(this.LOGOUT_FLAG);
  }

  // Clear all session data
  clearSession() {
    sessionStorage.removeItem(this.SESSION_KEY);
    sessionStorage.removeItem(this.LOGOUT_FLAG);
  }

  // Check if this is a fresh browser session
  isFreshSession() {
    return !this.hasSession();
  }
}

export default new SessionManager();