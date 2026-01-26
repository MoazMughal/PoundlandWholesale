import { getValidAdminToken, cleanupAuthTokens } from './authFix';

// Admin API utility with improved error handling
export const adminApiCall = async (url, options = {}) => {
  // Clean up any invalid tokens first
  cleanupAuthTokens();
  
  const token = getValidAdminToken();
  
  if (!token) {
    // Redirect to login if no valid token
    window.location.href = '/admin/login';
    throw new Error('No valid authentication token found');
  }

  const defaultOptions = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, finalOptions);
    
    if (response.status === 401) {
      // Token expired or invalid - clean up and redirect
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      window.location.href = '/admin/login';
      throw new Error('Authentication failed. Please log in again.');
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
};

// Helper for GET requests
export const adminGet = (url) => adminApiCall(url);

// Helper for POST requests
export const adminPost = (url, data) => adminApiCall(url, {
  method: 'POST',
  body: JSON.stringify(data)
});

// Helper for PUT requests
export const adminPut = (url, data) => adminApiCall(url, {
  method: 'PUT',
  body: JSON.stringify(data)
});

// Helper for DELETE requests
export const adminDelete = (url) => adminApiCall(url, {
  method: 'DELETE'
});