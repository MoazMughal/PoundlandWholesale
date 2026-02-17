/**
 * Webhook Testing Script
 * Tests all webhook endpoints to ensure they're working correctly
 */

import axios from 'axios';
import crypto from 'crypto';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const INTERNAL_TOKEN = process.env.INTERNAL_WEBHOOK_TOKEN || 'internal-webhook-token';

console.log('🧪 Testing Webhooks...\n');
console.log(`Base URL: ${BASE_URL}\n`);

// Test 1: Health Check
async function testHealthCheck() {
  console.log('1️⃣ Testing Health Check...');
  try {
    const response = await axios.get(`${BASE_URL}/api/webhook/health`);
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

// Test 2: GitHub Webhook
async function testGithubWebhook() {
  console.log('\n2️⃣ Testing GitHub Webhook...');
  try {
    const payload = {
      ref: 'refs/heads/main',
      repository: { name: 'test-repo' },
      pusher: { name: 'test-user' },
      commits: [{ message: 'Test commit' }]
    };

    const response = await axios.post(
      `${BASE_URL}/api/webhook/github`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-github-event': 'push'
        }
      }
    );

    console.log('✅ GitHub webhook passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ GitHub webhook failed:', error.message);
    return false;
  }
}

// Test 3: Cloudinary Webhook
async function testCloudinaryWebhook() {
  console.log('\n3️⃣ Testing Cloudinary Webhook...');
  try {
    const payload = {
      notification_type: 'upload',
      public_id: 'test/image',
      format: 'jpg',
      resource_type: 'image',
      bytes: 12345,
      secure_url: 'https://res.cloudinary.com/test/image.jpg'
    };

    const response = await axios.post(
      `${BASE_URL}/api/webhook/cloudinary`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Cloudinary webhook passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Cloudinary webhook failed:', error.message);
    return false;
  }
}

// Test 4: User Registration Webhook (Internal)
async function testUserRegistrationWebhook() {
  console.log('\n4️⃣ Testing User Registration Webhook...');
  try {
    const payload = {
      userType: 'buyer',
      userData: {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date().toISOString()
      }
    };

    const response = await axios.post(
      `${BASE_URL}/api/webhook/user-registration`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': INTERNAL_TOKEN
        }
      }
    );

    console.log('✅ User registration webhook passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ User registration webhook failed:', error.message);
    return false;
  }
}

// Test 5: Generic Webhook
async function testGenericWebhook() {
  console.log('\n5️⃣ Testing Generic Webhook...');
  try {
    const payload = {
      event: 'test_event',
      data: { test: true }
    };

    const response = await axios.post(
      `${BASE_URL}/api/webhook/generic/test-source`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Generic webhook passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Generic webhook failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  const results = {
    healthCheck: await testHealthCheck(),
    github: await testGithubWebhook(),
    cloudinary: await testCloudinaryWebhook(),
    userRegistration: await testUserRegistrationWebhook(),
    generic: await testGenericWebhook()
  };

  console.log('\n📊 Test Results:');
  console.log('================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log('\n📈 Summary:');
  console.log(`${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Webhooks are working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️ Some tests failed. Check the logs above for details.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
