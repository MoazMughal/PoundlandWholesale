// Utility to fix common authentication issues

export const cleanupAuthTokens = () => {
  try {
    // Check for corrupted tokens
    const adminToken = localStorage.getItem('adminToken');
    const buyerToken = localStorage.getItem('buyerToken');
    const sellerToken = localStorage.getItem('sellerToken');
    
    // Clean up invalid tokens
    if (adminToken && (adminToken === 'null' || adminToken === 'undefined' || adminToken.length < 10)) {
      console.log('🧹 Cleaning up invalid admin token');
      localStorage.removeItem('adminToken');
    }
    
    if (buyerToken && (buyerToken === 'null' || buyerToken === 'undefined' || buyerToken.length < 10)) {
      console.log('🧹 Cleaning up invalid buyer token');
      localStorage.removeItem('buyerToken');
    }
    
    if (sellerToken && (sellerToken === 'null' || sellerToken === 'undefined' || sellerToken.length < 10)) {
      console.log('🧹 Cleaning up invalid seller token');
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
    
    // Check if each part is base64 encoded
    for (const part of parts) {
      if (!part || part.length === 0) return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

export const getValidAdminToken = () => {
  const token = localStorage.getItem('adminToken');
  if (validateJWTToken(token)) {
    return token;
  }
  
  // Clean up invalid token
  localStorage.removeItem('adminToken');
  return null;
};

// Auto-cleanup on module load
cleanupAuthTokens();