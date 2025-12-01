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
    // No token available, redirect to login
    window.location.href = '/admin/login';
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
      console.log('Admin token expired or invalid, redirecting to login');
      
      // Clear admin data
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      sessionStorage.setItem('admin_logged_out', 'true');
      
      // Redirect to login
      window.location.href = '/admin/login';
      throw new AdminApiError('Authentication failed', 401, response);
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

export const adminPost = (url, data) => adminApiCall(url, {
  method: 'POST',
  body: JSON.stringify(data)
});

export const adminPut = (url, data) => adminApiCall(url, {
  method: 'PUT',
  body: JSON.stringify(data)
});

export const adminDelete = (url) => adminApiCall(url, {
  method: 'DELETE'
});

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