// Authentication Flow Test
// This script tests the new authentication behavior

console.log('🧪 Testing Authentication Flow...\n')

// Test 1: Check if localStorage is cleared on fresh start
console.log('Test 1: Fresh Start Behavior')
console.log('Current localStorage keys:', Object.keys(localStorage))
console.log('Current sessionStorage keys:', Object.keys(sessionStorage))

// Test 2: Simulate server session check
async function testServerSession() {
  try {
    console.log('\nTest 2: Server Session Check')
    const response = await fetch('http://localhost:5000/api/auth/server-session')
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Server session response:', data)
      return data
    } else {
      console.log('❌ Server session check failed:', response.status)
      return null
    }
  } catch (error) {
    console.log('❌ Server session error:', error.message)
    return null
  }
}

// Test 3: Test authManager initialization
async function testAuthManager() {
  console.log('\nTest 3: AuthManager Initialization')
  
  // Import authManager (this would be done differently in a real test)
  // For now, we'll just test the localStorage behavior
  
  // Clear all auth data
  const userTypes = ['admin', 'seller', 'buyer']
  userTypes.forEach(userType => {
    localStorage.removeItem(`${userType}Token`)
    localStorage.removeItem(`${userType}Data`)
    sessionStorage.removeItem(`${userType}Token`)
    sessionStorage.removeItem(`${userType}Data`)
  })
  
  localStorage.removeItem('activeUserType')
  localStorage.removeItem('currentAuthToken')
  sessionStorage.removeItem('activeUserType')
  sessionStorage.removeItem('browserSessionId')
  
  console.log('✅ All auth data cleared')
  console.log('localStorage after clear:', Object.keys(localStorage).filter(key => 
    key.includes('Token') || key.includes('Data') || key.includes('activeUserType')
  ))
}

// Test 4: Test login behavior
async function testLogin() {
  console.log('\nTest 4: Login Test')
  
  const credentials = {
    username: 'admin', // This should be replaced with actual test credentials
    password: 'password123'
  }
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Login successful')
      console.log('Token received:', !!data.token)
      console.log('Admin data:', !!data.admin)
      return data
    } else {
      const error = await response.json()
      console.log('❌ Login failed:', error.message)
      return null
    }
  } catch (error) {
    console.log('❌ Login error:', error.message)
    return null
  }
}

// Run all tests
async function runTests() {
  await testServerSession()
  await testAuthManager()
  
  // Only test login if we have valid credentials
  console.log('\n⚠️  Login test skipped - requires valid admin credentials')
  
  console.log('\n🎉 Authentication flow tests completed!')
  console.log('\nTo test manually:')
  console.log('1. Open http://localhost:3001 in browser')
  console.log('2. Check browser console for auth logs')
  console.log('3. Verify no auto-login occurs')
  console.log('4. Navigate to /admin/login and test login')
  console.log('5. Refresh page and verify session persistence')
  console.log('6. Open new tab to / and verify no auto-login')
}

// Run tests if this script is executed directly
if (typeof window !== 'undefined') {
  runTests()
} else {
  console.log('This script should be run in a browser environment')
}