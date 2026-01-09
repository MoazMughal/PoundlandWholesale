// Cross-tab synchronization utility for admin authentication
class CrossTabSync {
  constructor() {
    this.STORAGE_KEY = 'admin_auth_sync';
    this.listeners = new Set();
    this.isListening = false;
  }

  // Start listening for cross-tab events
  startListening(onAuthChange) {
    if (this.isListening) return;
    
    this.isListening = true;
    this.listeners.add(onAuthChange);
    
    // Listen for storage changes (cross-tab communication)
    window.addEventListener('storage', this.handleStorageChange.bind(this));
    
    // Listen for focus events to sync state when switching tabs
    window.addEventListener('focus', this.handleTabFocus.bind(this));
  }

  // Stop listening for cross-tab events
  stopListening(onAuthChange) {
    this.listeners.delete(onAuthChange);
    
    if (this.listeners.size === 0) {
      this.isListening = false;
      window.removeEventListener('storage', this.handleStorageChange.bind(this));
      window.removeEventListener('focus', this.handleTabFocus.bind(this));
    }
  }

  // Handle storage changes from other tabs
  handleStorageChange(event) {
    if (event.key === 'adminToken' || event.key === 'adminData' || event.key === 'admin_logged_out') {
      // Notify all listeners about auth changes
      this.listeners.forEach(callback => {
        try {
          callback({
            type: 'storage_change',
            key: event.key,
            oldValue: event.oldValue,
            newValue: event.newValue
          });
        } catch (error) {
          console.error('Error in cross-tab sync callback:', error);
        }
      });
    }
  }

  // Handle tab focus to sync state
  handleTabFocus() {
    // Notify listeners that tab gained focus
    this.listeners.forEach(callback => {
      try {
        callback({
          type: 'tab_focus'
        });
      } catch (error) {
        console.error('Error in tab focus callback:', error);
      }
    });
  }

  // Broadcast logout to all tabs
  broadcastLogout() {
    // Set a temporary flag that other tabs can detect
    localStorage.setItem('admin_logout_broadcast', Date.now().toString());
    
    // Remove it immediately (the storage event will still fire)
    setTimeout(() => {
      localStorage.removeItem('admin_logout_broadcast');
    }, 100);
  }

  // Broadcast login to all tabs
  broadcastLogin() {
    // Set a temporary flag that other tabs can detect
    localStorage.setItem('admin_login_broadcast', Date.now().toString());
    
    // Remove it immediately (the storage event will still fire)
    setTimeout(() => {
      localStorage.removeItem('admin_login_broadcast');
    }, 100);
  }
}

export default new CrossTabSync();