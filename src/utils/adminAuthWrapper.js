import React from 'react';
import { getValidAdminToken, cleanupAuthTokens } from './authFix';

// Global authentication wrapper for admin pages
export const withAdminAuth = (WrappedComponent) => {
  return function AuthenticatedComponent(props) {
    const checkAuth = () => {
      cleanupAuthTokens();
      const token = getValidAdminToken();
      if (!token) {
        // Redirect to login if no valid token
        window.location.href = '/admin/login';
        return false;
      }
      return true;
    };

    // Check auth on component mount
    React.useEffect(() => {
      checkAuth();
    }, []);

    // Check auth on window focus (when user comes back to tab)
    React.useEffect(() => {
      const handleFocus = () => {
        checkAuth();
      };

      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }, []);

    return React.createElement(WrappedComponent, props);
  };
};

// Helper function for making authenticated API calls
export const makeAuthenticatedRequest = async (url, options = {}) => {
  cleanupAuthTokens();
  const token = getValidAdminToken();
  
  if (!token) {
    window.location.href = '/admin/login';
    throw new Error('No valid authentication token');
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

  try {
    const response = await fetch(url, requestOptions);
    
    if (response.status === 401) {
      // Token expired - clean up and redirect
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      window.location.href = '/admin/login';
      throw new Error('Authentication failed');
    }
    
    return response;
  } catch (error) {
    if (error.message.includes('Authentication failed')) {
      throw error;
    }
    throw new Error(`Request failed: ${error.message}`);
  }
};

// Simple helper to get authenticated token (for backward compatibility)
export const getAuthToken = () => {
  cleanupAuthTokens();
  const token = getValidAdminToken();
  if (!token) {
    window.location.href = '/admin/login';
    return null;
  }
  return token;
};