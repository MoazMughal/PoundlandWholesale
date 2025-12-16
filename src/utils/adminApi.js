// Admin API utility with automatic token refresh and error handling
import { useNavigate } from 'react-router-dom';

class AdminApiError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.response = response;
  }
}

// Admin API call wrapper with authentication handling
export const adminApiCall = async (url, options = {}) => {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    // No token available, let AdminContext handle the redirect
    throw new AdminApiError('No admin token available', 401);
  }

  // Prepare headers
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle authentication errors
    if (response.status === 401) {
      console.log('Admin token expired or invalid, attempting refresh');
      
      // Check if we've already tried refreshing recently to prevent loops
      const lastRefreshAttempt = localStorage.getItem('admin_last_refresh_attempt');
      const now = Date.now();
      
      if (lastRefreshAttempt && (now - parseInt(lastRefreshAttempt)) < 30000) {
        console.log('Recent refresh attempt failed, not retrying');
        throw new AdminApiError('Authentication failed - recent refresh attempt failed', 401, response);
      }
      
      try {
        localStorage.setItem('admin_last_refresh_attempt', now.toString());
        
        // Try to refresh token
        const refreshResponse = await fetch('http://localhost:5000/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          localStorage.setItem('adminToken', refreshData.token);
          localStorage.setItem('adminData', JSON.stringify(refreshData.admin));
          localStorage.removeItem('admin_last_refresh_attempt'); // Clear on success
          console.log('Admin token refreshed successfully, retrying original request');
          
          // Retry the original request with new token
          const retryResponse = await fetch(url, {
            ...options,
            headers: {
              ...headers,
              'Authorization': `Bearer ${refreshData.token}`
            }
          });
          
          return retryResponse; // Return response regardless of status, let caller handle
        } else {
          throw new Error('Token refresh failed');
        }
      } catch (refreshError) {
        console.log('Token refresh failed:', refreshError.message);
        
        // Only throw auth error if it's a real auth failure, not network issues
        if (refreshError.message.includes('fetch')) {
          // Network error - return original response and let caller handle
          console.log('Network error during refresh, returning original 401 response');
          return response;
        }
        
        throw new AdminApiError('Authentication failed', 401, response);
      }
    }

    // Handle other HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new AdminApiError(errorData.message || `HTTP ${response.status}`, response.status, response);
    }

    return response;
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error;
    }
    
    // Network or other errors
    console.error('Admin API call failed:', error);
    throw new AdminApiError('Network error or server unavailable', 0, null);
  }
};

// Convenience methods for common HTTP methods
export const adminGet = (url) => adminApiCall(url);

export const adminPost = async (url, data) => {
  const response = await adminApiCall(url, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  
  // If this is a product creation, invalidate cache
  if (url.includes('/products') && !url.includes('/seller/')) {
    console.log('🗑️ Product created via admin API, invalidating cache');
    // Import cache manager dynamically to avoid circular imports
    const { default: cacheManager } = await import('./cacheManager.js');
    cacheManager.remove('amazons_choice_products');
  }
  
  return response;
};

export const adminPut = async (url, data) => {
  const response = await adminApiCall(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  
  // If this is a product update, invalidate cache
  if (url.includes('/products/') && !url.includes('/seller/')) {
    console.log('🗑️ Product updated via admin API, invalidating cache');
    // Import cache manager dynamically to avoid circular imports
    const { default: cacheManager } = await import('./cacheManager.js');
    cacheManager.remove('amazons_choice_products');
  }
  
  return response;
};

export const adminDelete = async (url) => {
  const response = await adminApiCall(url, {
    method: 'DELETE'
  });
  
  // If this is a product deletion, invalidate cache
  if (url.includes('/products/') && !url.includes('/seller/')) {
    console.log('🗑️ Product deleted via admin API, invalidating cache');
    // Import cache manager dynamically to avoid circular imports
    const { default: cacheManager } = await import('./cacheManager.js');
    cacheManager.remove('amazons_choice_products');
  }
  
  return response;
};

// Hook for handling admin API errors in components
export const useAdminApi = () => {
  const navigate = useNavigate();

  const handleApiError = (error) => {
    if (error instanceof AdminApiError && error.status === 401) {
      // Authentication error already handled by adminApiCall
      return;
    }
    
    // Handle other errors
    console.error('Admin API Error:', error);
    alert(`Error: ${error.message}`);
  };

  return {
    adminApiCall,
    adminGet,
    adminPost,
    adminPut,
    adminDelete,
    handleApiError
  };
};

export default adminApiCall;