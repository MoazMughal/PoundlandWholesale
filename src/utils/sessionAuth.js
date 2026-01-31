// JWT-Based Authentication Manager with Server Session Detection
// Users are logged out when server restarts or browser session ends

class SessionAuthManager {
  constructor() {
    this.SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours
    this.SERVER_SESSION_KEY = 'serverSessionId';
    this.initialized = false;
  }

  // Initialize and check server session
  async initializeServerSession() {
    if (this.initialized) return { serverRestarted: false };
    
    try {
      console.log('🔄 Checking server session...');
      
      // Get current server session ID with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('/api/auth/server-session', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const { serverSessionId } = await response.json();
        const storedServerSessionId = localStorage.getItem(this.SERVER_SESSION_KEY);
        
        if (storedServerSessionId && storedServerSessionId !== serverSessionId) {
          console.log('🔄 Server restarted detected, clearing all auth data');
          this.clearAllAuth();
          localStorage.setItem(this.SERVER_SESSION_KEY, serverSessionId);
          return { serverRestarted: true, oldSessionId: storedServerSessionId, newSessionId: serverSessionId };
        }
        
        // Update stored server session ID
        localStorage.setItem(this.SERVER_SESSION_KEY, serverSessionId);
        console.log('✅ Server session synchronized');
        return { serverRestarted: false, sessionId: serverSessionId };
      } else {
        console.warn('⚠️ Could not get server session, assuming server restart');
        this.clearAllAuth();
        return { serverRestarted: true, error: 'Could not get server session' };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('⚠️ Server session check timed out');
      } else {
        console.warn('⚠️ Server session check failed:', error);
      }
      // Don't clear auth on network errors - just continue
      return { serverRestarted: false, error: error.message };
    } finally {
      this.initialized = true;
    }
  }

  // Decode JWT token to get user info and role
  decodeToken(token) {
    if (!token) return null;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  // Validate JWT token expiration
  isTokenValid(token) {
    if (!token) return false;
    
    try {
      const payload = this.decodeToken(token);
      if (!payload) return false;
      
      const now = Date.now() / 1000;
      return payload.exp && payload.exp > now;
    } catch (error) {
      return false;
    }
  }

  // Get the current active user from any valid token (simplified, no server check)
  getCurrentActiveUser() {
    try {
      const userTypes = ['admin', 'seller', 'buyer'];
      
      for (const userType of userTypes) {
        const token = localStorage.getItem(`${userType}Token`);
        if (token && this.isTokenValid(token)) {
          const userData = localStorage.getItem(`${userType}Data`);
          const decodedToken = this.decodeToken(token);
          
          if (userData && decodedToken) {
            return {
              userType,
              user: JSON.parse(userData),
              token,
              role: decodedToken.role,
              tokenPayload: decodedToken
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current active user:', error);
      return null;
    }
  }

  // Save authentication data with single active user enforcement
  async saveAuth(userType, userData, token) {
    try {
      console.log(`🔑 Saving ${userType} auth, clearing other user types`);
      
      // Ensure server session is initialized
      await this.initializeServerSession();
      
      // Validate the token first
      if (!this.isTokenValid(token)) {
        throw new Error('Invalid or expired token');
      }

      // Decode token to verify role matches userType
      const tokenPayload = this.decodeToken(token);
      if (tokenPayload.role !== userType) {
        console.warn(`Token role (${tokenPayload.role}) doesn't match userType (${userType})`);
      }
      
      // Clear ALL other user types to enforce single login
      const allUserTypes = ['admin', 'seller', 'buyer'];
      allUserTypes.forEach(type => {
        if (type !== userType) {
          this.clearAuth(type);
        }
      });
      
      // Also clear any legacy sessionStorage data
      allUserTypes.forEach(type => {
        sessionStorage.removeItem(`${type}Auth`);
        sessionStorage.removeItem(`${type}Token`);
        sessionStorage.removeItem(`${type}Data`);
      });
      sessionStorage.removeItem('activeUserType');
      
      const authData = {
        user: userData,
        token: token,
        role: tokenPayload.role,
        loginTime: Date.now(),
        lastActivity: Date.now(),
        tokenExpiry: tokenPayload.exp * 1000 // Convert to milliseconds
      };
      
      // Store in localStorage for persistence across browser sessions
      localStorage.setItem(`${userType}Auth`, JSON.stringify(authData));
      localStorage.setItem(`${userType}Token`, token);
      localStorage.setItem(`${userType}Data`, JSON.stringify(userData));
      localStorage.setItem('activeUserType', userType);
      localStorage.setItem('currentAuthToken', token); // Single source of truth
      
      console.log(`✅ ${userType} auth saved to localStorage`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save ${userType} auth:`, error);
      return false;
    }
  }

  // Load authentication data from localStorage
  async loadAuth(userType) {
    try {
      console.log(`🔍 Loading ${userType} auth from localStorage...`);
      
      // Ensure server session is checked first
      await this.initializeServerSession();
      
      const authData = localStorage.getItem(`${userType}Auth`);
      const token = localStorage.getItem(`${userType}Token`);
      const userData = localStorage.getItem(`${userType}Data`);
      
      if (!authData || !token || !userData) {
        console.log(`🔍 Missing auth data for ${userType}`);
        return null;
      }

      const parsedAuthData = JSON.parse(authData);
      const parsedUserData = JSON.parse(userData);
      
      // Check if token is still valid
      if (!this.isTokenValid(token)) {
        console.log(`🔑 ${userType} token expired or invalid`);
        this.clearAuth(userType);
        return null;
      }

      // Verify this is the currently active user type
      const activeUserType = localStorage.getItem('activeUserType');
      if (activeUserType && activeUserType !== userType) {
        console.log(`🔑 ${userType} auth found but ${activeUserType} is active`);
        return null;
      }

      // Decode token to get fresh role info
      const tokenPayload = this.decodeToken(token);
      if (tokenPayload) {
        parsedAuthData.role = tokenPayload.role;
        parsedAuthData.tokenPayload = tokenPayload;
      }

      console.log(`✅ Valid ${userType} auth loaded`);
      return {
        user: parsedUserData,
        token: token,
        role: tokenPayload?.role,
        tokenPayload
      };
    } catch (error) {
      console.error(`❌ Failed to load ${userType} auth:`, error);
      this.clearAuth(userType);
      return null;
    }
  }

  // Clear authentication data for specific user type
  clearAuth(userType) {
    localStorage.removeItem(`${userType}Auth`);
    localStorage.removeItem(`${userType}Token`);
    localStorage.removeItem(`${userType}Data`);
    
    // Clear active user type if it matches
    const activeUserType = localStorage.getItem('activeUserType');
    if (activeUserType === userType) {
      localStorage.removeItem('activeUserType');
      localStorage.removeItem('currentAuthToken');
    }
    
    // Also clear any sessionStorage remnants
    sessionStorage.removeItem(`${userType}Auth`);
    sessionStorage.removeItem(`${userType}Token`);
    sessionStorage.removeItem(`${userType}Data`);
    
    console.log(`🔄 ${userType} auth cleared`);
  }

  // Clear all authentication data
  clearAllAuth() {
    const userTypes = ['admin', 'seller', 'buyer'];
    userTypes.forEach(userType => {
      this.clearAuth(userType);
    });
    
    // Clear global flags
    localStorage.removeItem('activeUserType');
    localStorage.removeItem('currentAuthToken');
    sessionStorage.removeItem('activeUserType');
    
    console.log('🔄 All auth data cleared');
  }

  // Get the currently active user type using token-based detection
  getCurrentUserType() {
    // First check the explicit active user type flag
    const activeUserType = localStorage.getItem('activeUserType');
    if (activeUserType && this.isAuthenticated(activeUserType)) {
      return activeUserType;
    }
    
    // Fallback: check current auth token and decode it
    const currentToken = localStorage.getItem('currentAuthToken');
    if (currentToken && this.isTokenValid(currentToken)) {
      const payload = this.decodeToken(currentToken);
      if (payload && payload.role) {
        // Update the active user type flag
        localStorage.setItem('activeUserType', payload.role);
        return payload.role;
      }
    }
    
    // Last resort: find any valid token
    const activeUser = this.getCurrentActiveUser();
    if (activeUser) {
      localStorage.setItem('activeUserType', activeUser.userType);
      return activeUser.userType;
    }
    
    return null;
  }

  // Check if user is authenticated
  async isAuthenticated(userType) {
    const authData = await this.loadAuth(userType);
    return !!authData;
  }

  // Get current user data
  async getCurrentUser(userType) {
    const authData = await this.loadAuth(userType);
    return authData ? authData.user : null;
  }

  // Get current token
  async getCurrentToken(userType) {
    const authData = await this.loadAuth(userType);
    return authData ? authData.token : null;
  }

  // Make authenticated API request
  async makeAuthenticatedRequest(userType, url, options = {}) {
    const token = this.getCurrentToken(userType);
    
    if (!token) {
      throw new Error('Authentication required');
    }

    const defaultHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const requestOptions = {
      ...options,
      headers: defaultHeaders
    };

    const response = await fetch(url, requestOptions);
    
    if (response.status === 401) {
      // Token expired or invalid, clear auth
      this.clearAuth(userType);
      throw new Error('Authentication expired');
    }
    
    return response;
  }

  // Initialize auth from stored tokens on app load
  initializeFromStorage() {
    console.log('🔄 Initializing auth from storage...');
    
    const activeUser = this.getCurrentActiveUser();
    if (activeUser) {
      console.log(`✅ Found active user: ${activeUser.userType} (${activeUser.role})`);
      return {
        userType: activeUser.userType,
        user: activeUser.user,
        token: activeUser.token,
        role: activeUser.role
      };
    }
    
    console.log('🔍 No active user found');
    return null;
  }
}

// Create singleton instance
const sessionAuthManager = new SessionAuthManager();

export default sessionAuthManager;