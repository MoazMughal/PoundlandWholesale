// API Configuration
// This file centralizes all API endpoint configurations

// Get API base URL from environment variable
// In development: uses .env file (VITE_API_URL=http://localhost:5000/api)
// In production: uses Render environment variable or fallback to production URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? 'https://generic-wholesale-backend.onrender.com/api' : 'http://localhost:5000/api');

console.log('🔧 API Configuration:', {
  isDev: !import.meta.env.PROD,
  envApiUrl: import.meta.env.VITE_API_URL,
  finalApiUrl: API_BASE_URL
});

// Remove /api suffix if present to get base server URL
export const SERVER_BASE_URL = API_BASE_URL.replace('/api', '');

// Export for easy use in components
export default {
  API_BASE_URL,
  SERVER_BASE_URL,
  
  // Helper to build full API URLs
  getApiUrl: (endpoint) => {
    // Remove leading slash if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${API_BASE_URL}/${cleanEndpoint}`;
  },
  
  // Common headers
  getHeaders: (includeAuth = false, tokenKey = 'buyerToken') => {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (includeAuth) {
      const token = localStorage.getItem(tokenKey);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    return headers;
  }
};
