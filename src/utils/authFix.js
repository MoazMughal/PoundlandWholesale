// Utility to fix common authentication issues

export const cleanupAuthTokens = () => {
  try {
    // Check for corrupted tokens
    const adminToken = localStorage.getItem('adminToken');
    const buyerToken = localStorage.getItem('buyerToken');
    const sellerToken = localStorage.getItem('sellerToken');
    
    // Clean up invalid tokens (only if they're clearly corrupted)
    if (adminToken && (adminToken === 'null' || adminToken === 'undefined' || adminToken.length < 20)) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
    }
    
    if (buyerToken && (buyerToken === 'null' || buyerToken === 'undefined' || buyerToken.length < 20)) {
      localStorage.removeItem('buyerToken');
    }
    
    if (sellerToken && (sellerToken === 'null' || sellerToken === 'undefined' || sellerToken.length < 20)) {
      localStorage.removeItem('sellerToken');
    }
    
    return true;
  } catch (error) {
    console.error('Error cleaning up auth tokens:', error);
    return false;
  }
};

export const validateJWTToken = (token) => {
  if (!token) return false;
  
  try {
    // Basic JWT format validation (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Check if header and payload exist (signature can be empty in development)
    if (!parts[0] || !parts[1]) return false;
    
    // Try to decode the payload to check if it's valid JSON
    try {
      const payload = JSON.parse(atob(parts[1]));
      
      // Check if token is expired (with 5 minute grace period for network delays)
      if (payload.exp && payload.exp < (Date.now() / 1000) - 300) {
        console.log('🔑 Token expired (with grace period), removing...');
        return false;
      }
      
      return true;
    } catch (decodeError) {
      // If we can't decode the payload, but the format looks right, be lenient
      console.log('🔑 Token payload decode failed, but format is valid:', decodeError.message);
      return true; // Be more lenient - let the server validate
    }
    
  } catch (error) {
    console.log('🔑 Token validation failed:', error.message);
    return false;
  }
};

export const getValidAdminToken = () => {
  const token = localStorage.getItem('adminToken');
  
  if (!token) {
    return null;
  }
  
  if (validateJWTToken(token)) {
    return token;
  }
  
  // Clean up invalid token
  console.log('🔑 Removing invalid admin token');
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminData');
  return null;
};

// Auto-cleanup can be called manually when needed
// cleanupAuthTokens();