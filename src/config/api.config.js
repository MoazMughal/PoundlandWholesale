// API Configuration
// This file centralizes all API endpoint configurations

// Dynamic API URL based on current domain
const getApiBaseUrl = () => {
  // In development, use environment variable or localhost
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  }
  
  // In production, determine API URL based on current domain
  const currentDomain = window.location.hostname;
  
  // Map domains to their respective backend URLs
  const domainToApiMap = {
    'genericwholesale.pk': 'https://generic-wholesale-backend.onrender.com/api',
    'www.genericwholesale.pk': 'https://generic-wholesale-backend.onrender.com/api',
    'poundlandwholesale.com': 'https://generic-wholesale-backend.onrender.com/api',
    'www.poundlandwholesale.com': 'https://generic-wholesale-backend.onrender.com/api',
    'genericwholesale.co.uk': 'https://generic-wholesale-backend.onrender.com/api',
    'www.genericwholesale.co.uk': 'https://generic-wholesale-backend.onrender.com/api'
  };
  
  // Return mapped API URL or fallback to environment variable or default
  const apiUrl = domainToApiMap[currentDomain] || 
         import.meta.env.VITE_API_URL || 
         'https://generic-wholesale-backend.onrender.com/api';
  
  // Debug logging in development
  if (import.meta.env.DEV) {
    console.log('🔧 API Configuration:', {
      currentDomain,
      selectedApiUrl: apiUrl,
      isDev: import.meta.env.DEV,
      envApiUrl: import.meta.env.VITE_API_URL
    });
  }
  
  return apiUrl;
};

// Get API base URL dynamically
export const API_BASE_URL = getApiBaseUrl();

// New authentication API endpoints (v2)
export const AUTH_API_BASE_URL = API_BASE_URL.replace('/api', '/api/v2');

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
