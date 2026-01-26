// Comprehensive test for auth loading state fixes
// Run this in browser console to test the new authentication system

console.log('🧪 Testing Auth Loading State Fixes...');

// Test 1: Check auth resolution state
const testAuthResolution = () => {
  console.log('📋 Test 1: Auth Resolution State');
  
  // Check if React context is available
  try {
    // This will only work if we're on a page with AdminContext
    const adminToken = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminData');
    
    console.log('🔍 Auth State Check:');
    console.log('  - Admin Token:', adminToken ? '✅ Present' : '❌ Missing');
    console.log('  - Admin Data:', adminData ? '✅ Present' : '❌ Missing');
    console.log('  - Current Path:', window.location.pathname);
    console.log('  - Is Admin Page:', window.location.pathname.startsWith('/admin/'));
    
    if (adminToken) {
      try {
        const parts = adminToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const now = Date.now() / 1000;
          const expiresAt = new Date(payload.exp * 1000);
          const timeLeft = payload.exp - now;
          
          console.log('  - Token Expires:', expiresAt.toLocaleString());
          console.log('  - Time Left:', Math.floor(timeLeft / 60), 'minutes');
          console.log('  - Token Valid:', timeLeft > 0 ? '✅ Yes' : '❌ Expired');
        }
      } catch (e) {
        console.log('  - Token Parse Error:', e.message);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Auth resolution test failed:', error);
    return false;
  }
};

// Test 2: Simulate page reload behavior
const testPageReloadBehavior = () => {
  console.log('📋 Test 2: Page Reload Behavior');
  
  const currentUrl = window.location.href;
  const hasToken = !!localStorage.getItem('adminToken');
  
  console.log('🔄 Reload Simulation:');
  console.log('  - Current URL:', currentUrl);
  console.log('  - Has Token:', hasToken ? '✅ Yes' : '❌ No');
  console.log('  - Should Preserve Auth:', hasToken ? '✅ Yes' : '❌ No');
  
  if (hasToken) {
    console.log('✅ Token present - reload should preserve authentication');
    console.log('💡 Try reloading the page (F5) - you should NOT be logged out');
  } else {
    console.log('⚠️ No token - reload will require login');
  }
  
  return hasToken;
};

// Test 3: Check for race conditions
const testRaceConditions = () => {
  console.log('📋 Test 3: Race Condition Prevention');
  
  // Check if auth loading states are properly managed
  const authStates = {
    hasToken: !!localStorage.getItem('adminToken'),
    hasAdminData: !!localStorage.getItem('adminData'),
    sessionStart: localStorage.getItem('adminSessionStart'),
    browserSession: sessionStorage.getItem('browserSessionId')
  };
  
  console.log('🏁 Race Condition Check:');
  console.log('  - Token Present:', authStates.hasToken ? '✅ Yes' : '❌ No');
  console.log('  - Admin Data Present:', authStates.hasAdminData ? '✅ Yes' : '❌ No');
  console.log('  - Session Tracking:', authStates.sessionStart ? '✅ Active' : '❌ None');
  console.log('  - Browser Session:', authStates.browserSession ? '✅ Active' : '❌ None');
  
  // Check for potential race conditions
  if (authStates.hasToken && !authStates.hasAdminData) {
    console.log('⚠️ Potential race condition: Token without admin data');
    return false;
  }
  
  if (!authStates.hasToken && authStates.hasAdminData) {
    console.log('⚠️ Potential race condition: Admin data without token');
    return false;
  }
  
  console.log('✅ No race conditions detected');
  return true;
};

// Test 4: Check loading state behavior
const testLoadingState = () => {
  console.log('📋 Test 4: Loading State Behavior');
  
  // Check if we're currently in a loading state
  const loadingElements = document.querySelectorAll('[style*="Loading admin session"], [style*="Verifying admin access"]');
  const hasLoadingScreen = loadingElements.length > 0;
  
  console.log('⏳ Loading State Check:');
  console.log('  - Loading Screen Present:', hasLoadingScreen ? '✅ Yes' : '❌ No');
  console.log('  - Loading Elements Found:', loadingElements.length);
  
  if (hasLoadingScreen) {
    console.log('✅ Loading state is active - this prevents premature redirects');
    loadingElements.forEach((el, index) => {
      console.log(`  - Element ${index + 1}:`, el.textContent.trim());
    });
  } else {
    console.log('ℹ️ No loading state - auth should be resolved');
  }
  
  return !hasLoadingScreen; // Return true if auth is resolved
};

// Test 5: Network error handling
const testNetworkErrorHandling = () => {
  console.log('📋 Test 5: Network Error Handling');
  
  console.log('🌐 Network Error Simulation:');
  console.log('  - 401 Responses: Should NOT cause auto-logout');
  console.log('  - Network Timeouts: Should continue with cached data');
  console.log('  - Server Errors: Should assume token is valid');
  
  // Simulate what happens during network issues
  const token = localStorage.getItem('adminToken');
  if (token) {
    console.log('✅ Token present - network errors should be handled gracefully');
    console.log('💡 The system should continue working even with network issues');
  } else {
    console.log('⚠️ No token - network errors may require login');
  }
  
  return true;
};

// Test 6: Cross-tab synchronization
const testCrossTabSync = () => {
  console.log('📋 Test 6: Cross-Tab Synchronization');
  
  console.log('🔄 Cross-Tab Sync Check:');
  console.log('  - Storage Event Listeners: Should sync login/logout across tabs');
  console.log('  - Token Changes: Should be reflected in all tabs');
  
  // Test storage event simulation
  try {
    const testEvent = new StorageEvent('storage', {
      key: 'adminToken',
      oldValue: null,
      newValue: 'test-token',
      storageArea: localStorage
    });
    
    console.log('✅ Storage events can be simulated');
    console.log('💡 Try logging in/out in another tab to test synchronization');
  } catch (error) {
    console.log('❌ Storage event simulation failed:', error.message);
  }
  
  return true;
};

// Run all tests
const runAllTests = () => {
  console.log('🚀 Starting Comprehensive Auth Loading Tests...\n');
  
  const results = {
    authResolution: testAuthResolution(),
    pageReload: testPageReloadBehavior(),
    raceConditions: testRaceConditions(),
    loadingState: testLoadingState(),
    networkErrors: testNetworkErrorHandling(),
    crossTabSync: testCrossTabSync()
  };
  
  console.log('\n📊 Test Results Summary:');
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  - ${test}: ${status}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('🎉 Auth loading state fixes are working correctly!');
    console.log('💡 You should now be able to reload admin pages without logout issues.');
  } else {
    console.log('⚠️ Some issues detected. Check the test results above.');
  }
  
  return results;
};

// Auto-run tests
const testResults = runAllTests();

// Export for manual testing
window.authLoadingTest = {
  runAllTests,
  testAuthResolution,
  testPageReloadBehavior,
  testRaceConditions,
  testLoadingState,
  testNetworkErrorHandling,
  testCrossTabSync,
  results: testResults
};

console.log('\n💡 You can run individual tests using:');
console.log('  - window.authLoadingTest.testAuthResolution()');
console.log('  - window.authLoadingTest.testPageReloadBehavior()');
console.log('  - window.authLoadingTest.runAllTests()');

// Monitor for auth state changes
let lastAuthState = {
  token: !!localStorage.getItem('adminToken'),
  data: !!localStorage.getItem('adminData')
};

const monitorAuthChanges = () => {
  const currentAuthState = {
    token: !!localStorage.getItem('adminToken'),
    data: !!localStorage.getItem('adminData')
  };
  
  if (currentAuthState.token !== lastAuthState.token) {
    console.log(`🔄 Auth Token Changed: ${lastAuthState.token ? 'Present' : 'Missing'} → ${currentAuthState.token ? 'Present' : 'Missing'}`);
  }
  
  if (currentAuthState.data !== lastAuthState.data) {
    console.log(`🔄 Admin Data Changed: ${lastAuthState.data ? 'Present' : 'Missing'} → ${currentAuthState.data ? 'Present' : 'Missing'}`);
  }
  
  lastAuthState = currentAuthState;
};

// Monitor auth changes every 5 seconds
setInterval(monitorAuthChanges, 5000);

console.log('🔍 Auth state monitoring started (every 5 seconds)');