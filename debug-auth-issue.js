// Debug Authentication Issue
// This script helps identify why users are logged out after page refresh

console.log('🔍 Starting authentication debug...')

// Function to check localStorage state
function checkLocalStorage() {
    console.log('\n📊 Current localStorage state:')
    const authKeys = []
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key.includes('Token') || key.includes('Data') || key.includes('activeUserType') || key.includes('serverSession')) {
            const value = localStorage.getItem(key)
            authKeys.push({ key, value: key.includes('Token') ? value.substring(0, 50) + '...' : value })
        }
    }
    console.table(authKeys)
    return authKeys
}

// Function to check sessionStorage state
function checkSessionStorage() {
    console.log('\n📊 Current sessionStorage state:')
    const sessionKeys = []
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key.includes('Token') || key.includes('Data') || key.includes('browserSession')) {
            const value = sessionStorage.getItem(key)
            sessionKeys.push({ key, value })
        }
    }
    console.table(sessionKeys)
    return sessionKeys
}

// Function to test token validity
function testTokenValidity() {
    console.log('\n🔍 Testing token validity...')
    
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) {
        console.log('❌ No admin token found')
        return false
    }
    
    try {
        // Decode JWT token (without verification)
        const parts = adminToken.split('.')
        if (parts.length !== 3) {
            console.log('❌ Invalid token format')
            return false
        }
        
        const payload = JSON.parse(atob(parts[1]))
        console.log('🔍 Token payload:', payload)
        
        const now = Math.floor(Date.now() / 1000)
        const isExpired = payload.exp <= now
        
        console.log('🔍 Token expiry:', new Date(payload.exp * 1000))
        console.log('🔍 Current time:', new Date())
        console.log('🔍 Token expired:', isExpired)
        
        return !isExpired
    } catch (error) {
        console.log('❌ Error decoding token:', error)
        return false
    }
}

// Function to test server connectivity
async function testServerConnectivity() {
    console.log('\n🔍 Testing server connectivity...')
    
    try {
        const response = await fetch('http://localhost:5000/api/auth/server-session')
        if (response.ok) {
            const data = await response.json()
            console.log('✅ Server reachable')
            console.log('🔍 Server session:', data)
            
            // Check if we have stored session data
            const storedSessionId = localStorage.getItem('serverSessionId')
            const storedStartTime = localStorage.getItem('serverStartTime')
            
            console.log('🔍 Stored session ID:', storedSessionId)
            console.log('🔍 Current session ID:', data.serverSessionId)
            console.log('🔍 Session ID match:', storedSessionId === data.serverSessionId)
            
            console.log('🔍 Stored start time:', storedStartTime)
            console.log('🔍 Current start time:', data.serverStartTime)
            console.log('🔍 Start time match:', parseInt(storedStartTime) === data.serverStartTime)
            
            return true
        } else {
            console.log('❌ Server not reachable:', response.status)
            return false
        }
    } catch (error) {
        console.log('❌ Server connectivity error:', error)
        return false
    }
}

// Function to test token verification with server
async function testTokenVerification() {
    console.log('\n🔍 Testing token verification with server...')
    
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) {
        console.log('❌ No admin token to verify')
        return false
    }
    
    try {
        const response = await fetch('http://localhost:5000/api/auth/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({ userType: 'admin' })
        })
        
        if (response.ok) {
            const data = await response.json()
            console.log('✅ Token verification successful')
            console.log('🔍 Verified user:', data.user)
            return true
        } else {
            const error = await response.json()
            console.log('❌ Token verification failed:', error)
            return false
        }
    } catch (error) {
        console.log('❌ Token verification error:', error)
        return false
    }
}

// Function to simulate page refresh scenario
async function simulatePageRefresh() {
    console.log('\n🔄 Simulating page refresh scenario...')
    
    // Step 1: Check current state
    console.log('Step 1: Current state before refresh')
    checkLocalStorage()
    checkSessionStorage()
    
    // Step 2: Test token validity
    console.log('Step 2: Token validity check')
    const tokenValid = testTokenValidity()
    
    // Step 3: Test server connectivity
    console.log('Step 3: Server connectivity check')
    const serverReachable = await testServerConnectivity()
    
    // Step 4: Test token verification
    console.log('Step 4: Token verification check')
    const tokenVerified = await testTokenVerification()
    
    // Summary
    console.log('\n📋 Summary:')
    console.log('Token exists:', !!localStorage.getItem('adminToken'))
    console.log('Token valid (not expired):', tokenValid)
    console.log('Server reachable:', serverReachable)
    console.log('Token verified by server:', tokenVerified)
    console.log('Active user type:', localStorage.getItem('activeUserType'))
    console.log('Browser session ID:', sessionStorage.getItem('browserSessionId'))
    
    // Diagnosis
    console.log('\n🩺 Diagnosis:')
    if (!localStorage.getItem('adminToken')) {
        console.log('❌ ISSUE: No admin token found - user needs to login')
    } else if (!tokenValid) {
        console.log('❌ ISSUE: Token is expired - user needs to login again')
    } else if (!serverReachable) {
        console.log('❌ ISSUE: Server not reachable - network problem')
    } else if (!tokenVerified) {
        console.log('❌ ISSUE: Token rejected by server - possible server restart or invalid token')
    } else {
        console.log('✅ All checks passed - authentication should work')
    }
}

// Run the debug
simulatePageRefresh()

// Export functions for manual testing
window.debugAuth = {
    checkLocalStorage,
    checkSessionStorage,
    testTokenValidity,
    testServerConnectivity,
    testTokenVerification,
    simulatePageRefresh
}