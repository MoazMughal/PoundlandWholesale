// Global API utility - works in both development and production
import apiConfig from '../config/api.config';

// Get the correct API URL based on environment
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${apiConfig.API_BASE_URL}/${cleanEndpoint}`;
};

// Fetch wrapper with automatic API URL handling
export const apiFetch = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  
  // Add default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  return response;
};

// Fetch with auth token
export const apiFetchAuth = async (endpoint, tokenKey = 'adminToken', options = {}) => {
  const token = localStorage.getItem(tokenKey);
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return apiFetch(endpoint, {
    ...options,
    headers
  });
};

export default {
  getApiUrl,
  apiFetch,
  apiFetchAuth
};
