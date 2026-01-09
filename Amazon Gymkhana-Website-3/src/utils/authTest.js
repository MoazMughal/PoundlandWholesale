// Simple authentication test utility
export const testAdminAuth = () => {
  console.log('🧪 Testing Admin Authentication State');
  
  const token = localStorage.getItem('adminToken');
  const adminData = localStorage.getItem('adminData');
  const logoutFlag = sessionStorage.getItem('admin_logged_out');
  const sessionId = sessionStorage.getItem('admin_session_id');
  
  console.log('📊 Auth State:');
  console.log('  Token:', token ? '✅ Present' : '❌ Missing');
  console.log('  Admin Data:', adminData ? '✅ Present' : '❌ Missing');
  console.log('  Logout Flag:', logoutFlag ? '🚫 Set' : '✅ Clear');
  console.log('  Session ID:', sessionId ? '✅ Present' : '❌ Missing');
  console.log('  Current Path:', window.location.pathname);
  
  if (token && adminData && !logoutFlag) {
    console.log('✅ Authentication state looks good');
    return true;
  } else {
    console.log('❌ Authentication issues detected');
    return false;
  }
};

// Clear all auth data for testing
export const clearAllAuth = () => {
  console.log('🧹 Clearing all authentication data');
  
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminData');
  localStorage.removeItem('sellerToken');
  localStorage.removeItem('sellerData');
  localStorage.removeItem('buyerToken');
  localStorage.removeItem('buyerData');
  
  sessionStorage.removeItem('admin_logged_out');
  sessionStorage.removeItem('seller_logged_out');
  sessionStorage.removeItem('admin_session_id');
  
  console.log('✅ All auth data cleared');
};

// Add to window for easy testing in console
if (typeof window !== 'undefined') {
  window.testAdminAuth = testAdminAuth;
  window.clearAllAuth = clearAllAuth;
}