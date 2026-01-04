// Token refresh utility for admin authentication

export const checkAndRefreshAdminToken = async () => {
  try {
    const token = localStorage.getItem('adminToken');
    
    if (!token) {
      return { valid: false, message: 'No token found' };
    }
    
    // Test the token with a simple API call
    const response = await fetch('http://localhost:5000/api/products/admin/fast?limit=1', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      return { valid: true, token };
    } else if (response.status === 401) {
      // Token is invalid or expired
      localStorage.removeItem('adminToken');
      return { valid: false, message: 'Token expired or invalid' };
    } else {
      return { valid: false, message: `Server error: ${response.status}` };
    }
    
  } catch (error) {
    console.error('Token validation error:', error);
    return { valid: false, message: error.message };
  }
};

export const handleAuthError = (error, redirectToLogin = true) => {
  console.error('Authentication error:', error);
  
  // Clean up invalid token
  localStorage.removeItem('adminToken');
  
  if (redirectToLogin) {
    alert('❌ Authentication failed. Please log in again.');
    window.location.href = '/admin/login';
  }
  
  return false;
};

export const makeAuthenticatedRequest = async (url, options = {}) => {
  try {
    const tokenCheck = await checkAndRefreshAdminToken();
    
    if (!tokenCheck.valid) {
      throw new Error(tokenCheck.message || 'Authentication failed');
    }
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${tokenCheck.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401) {
      handleAuthError(new Error('Token expired during request'));
      throw new Error('Authentication failed');
    }
    
    return response;
    
  } catch (error) {
    if (error.message.includes('Authentication')) {
      handleAuthError(error);
    }
    throw error;
  }
};