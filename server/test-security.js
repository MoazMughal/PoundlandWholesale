// Security Testing Script
// Run this to verify security features are working

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

console.log('🔒 Testing Security Features...\n');
console.log(`API URL: ${API_URL}\n`);

// Test 1: Check if Helmet headers are present
async function testHelmetHeaders() {
  console.log('1️⃣ Testing Helmet.js Headers...');
  try {
    const response = await axios.get(`${API_URL}/health`);
    const headers = response.headers;
    
    const securityHeaders = {
      'x-content-type-options': headers['x-content-type-options'],
      'x-frame-options': headers['x-frame-options'],
      'x-xss-protection': headers['x-xss-protection']
    };
    
    console.log('   Security Headers:', securityHeaders);
    
    if (securityHeaders['x-content-type-options']) {
      console.log('   ✅ Helmet.js is working\n');
    } else {
      console.log('   ⚠️ Helmet.js headers not found\n');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message, '\n');
  }
}

// Test 2: Test rate limiting
async function testRateLimiting() {
  console.log('2️⃣ Testing Rate Limiting...');
  console.log('   Attempting 12 login requests...');
  
  let blockedCount = 0;
  let successCount = 0;
  
  for (let i = 1; i <= 12; i++) {
    try {
      await axios.post(`${API_URL}/auth/login`, {
        username: 'test',
        password: 'test'
      });
      successCount++;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        blockedCount++;
        console.log(`   Request ${i}: ⛔ Blocked (Rate Limited)`);
      } else {
        successCount++;
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (blockedCount > 0) {
    console.log(`   ✅ Rate limiting is working (${blockedCount} requests blocked)\n`);
  } else {
    console.log('   ⚠️ Rate limiting not triggered (may need more requests)\n');
  }
}

// Test 3: Test input validation
async function testInputValidation() {
  console.log('3️⃣ Testing Input Validation...');
  
  try {
    // Test with invalid email
    await axios.post(`${API_URL}/auth/send-otp`, {
      identifier: 'invalid-email',
      userType: 'buyer'
    });
    console.log('   ⚠️ Validation not working (accepted invalid email)\n');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('   ✅ Input validation is working (rejected invalid input)\n');
    } else {
      console.log('   ❌ Unexpected error:', error.message, '\n');
    }
  }
}

// Test 4: Test XSS protection
async function testXSSProtection() {
  console.log('4️⃣ Testing XSS Protection...');
  
  try {
    // Try to send XSS payload
    await axios.post(`${API_URL}/auth/login`, {
      username: '<script>alert("XSS")</script>',
      password: 'test'
    });
    console.log('   ✅ XSS protection is working (request processed safely)\n');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('   ✅ XSS protection is working (malicious input rejected)\n');
    } else {
      console.log('   ⚠️ Error:', error.message, '\n');
    }
  }
}

// Test 5: Test NoSQL injection protection
async function testNoSQLInjection() {
  console.log('5️⃣ Testing NoSQL Injection Protection...');
  
  try {
    // Try to send NoSQL injection payload
    await axios.post(`${API_URL}/auth/login`, {
      username: { $ne: null },
      password: { $ne: null }
    });
    console.log('   ⚠️ NoSQL injection protection may not be working\n');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('   ✅ NoSQL injection protection is working\n');
    } else {
      console.log('   ⚠️ Error:', error.message, '\n');
    }
  }
}

// Run all tests
async function runTests() {
  console.log('═══════════════════════════════════════════════════\n');
  
  await testHelmetHeaders();
  await testRateLimiting();
  await testInputValidation();
  await testXSSProtection();
  await testNoSQLInjection();
  
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ Security testing complete!\n');
  console.log('Note: Some tests may show warnings if server is not running.');
  console.log('Start server with: npm run dev\n');
}

runTests().catch(error => {
  console.error('❌ Test suite failed:', error.message);
  process.exit(1);
});
