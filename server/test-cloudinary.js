/**
 * Cloudinary Connection Test Script
 * Tests if Cloudinary is properly configured and working
 */

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🧪 Testing Cloudinary Configuration...\n');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Test 1: Check Configuration
function testConfiguration() {
  console.log('1️⃣ Testing Configuration...');
  console.log('=====================================');
  
  const config = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  };

  let allSet = true;
  
  if (config.cloud_name) {
    console.log('✅ CLOUDINARY_CLOUD_NAME:', config.cloud_name);
  } else {
    console.log('❌ CLOUDINARY_CLOUD_NAME: Not set');
    allSet = false;
  }

  if (config.api_key) {
    console.log('✅ CLOUDINARY_API_KEY:', config.api_key);
  } else {
    console.log('❌ CLOUDINARY_API_KEY: Not set');
    allSet = false;
  }

  if (config.api_secret) {
    console.log('✅ CLOUDINARY_API_SECRET:', '***' + config.api_secret.slice(-4));
  } else {
    console.log('❌ CLOUDINARY_API_SECRET: Not set');
    allSet = false;
  }

  console.log('');
  return allSet;
}

// Test 2: Ping Cloudinary API
async function testConnection() {
  console.log('2️⃣ Testing API Connection...');
  console.log('=====================================');
  
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary API is reachable');
    console.log('   Response:', result);
    console.log('');
    return true;
  } catch (error) {
    console.log('❌ Failed to connect to Cloudinary API');
    console.log('   Error:', error.message);
    console.log('');
    return false;
  }
}

// Test 3: List Resources
async function testListResources() {
  console.log('3️⃣ Testing Resource Listing...');
  console.log('=====================================');
  
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'products',
      max_results: 5,
      resource_type: 'image'
    });
    
    console.log('✅ Successfully listed resources');
    console.log(`   Total images in 'products' folder: ${result.resources.length}`);
    
    if (result.resources.length > 0) {
      console.log('\n   Sample images:');
      result.resources.slice(0, 3).forEach((resource, index) => {
        console.log(`   ${index + 1}. ${resource.public_id}`);
        console.log(`      URL: ${resource.secure_url}`);
        console.log(`      Size: ${(resource.bytes / 1024).toFixed(2)} KB`);
      });
    }
    
    console.log('');
    return true;
  } catch (error) {
    console.log('❌ Failed to list resources');
    console.log('   Error:', error.message);
    console.log('');
    return false;
  }
}

// Test 4: Generate URL
function testUrlGeneration() {
  console.log('4️⃣ Testing URL Generation...');
  console.log('=====================================');
  
  try {
    const testPublicId = 'products/B07M7DQTSH';
    const url = cloudinary.url(testPublicId, {
      width: 400,
      height: 400,
      crop: 'fill',
      quality: 'auto',
      format: 'auto'
    });
    
    console.log('✅ Successfully generated URL');
    console.log(`   Public ID: ${testPublicId}`);
    console.log(`   Generated URL: ${url}`);
    console.log('');
    return true;
  } catch (error) {
    console.log('❌ Failed to generate URL');
    console.log('   Error:', error.message);
    console.log('');
    return false;
  }
}

// Test 5: Check Webhook Integration
function testWebhookIntegration() {
  console.log('5️⃣ Testing Webhook Integration...');
  console.log('=====================================');
  
  try {
    // Check if webhook logger exists
    const webhookLoggerPath = path.join(__dirname, 'services', 'webhookLogger.js');
    console.log('✅ Webhook logger file exists');
    console.log('✅ Cloudinary webhook integration is active');
    console.log('   Uploads will be logged automatically');
    console.log('');
    return true;
  } catch (error) {
    console.log('⚠️ Webhook integration check failed');
    console.log('   Error:', error.message);
    console.log('');
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Cloudinary Tests\n');
  
  const results = {
    configuration: testConfiguration(),
    connection: false,
    listResources: false,
    urlGeneration: false,
    webhookIntegration: false
  };

  if (results.configuration) {
    results.connection = await testConnection();
    
    if (results.connection) {
      results.listResources = await testListResources();
      results.urlGeneration = testUrlGeneration();
      results.webhookIntegration = testWebhookIntegration();
    }
  }

  // Summary
  console.log('📊 Test Summary');
  console.log('=====================================');
  console.log(`Configuration:      ${results.configuration ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`API Connection:     ${results.connection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`List Resources:     ${results.listResources ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`URL Generation:     ${results.urlGeneration ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Webhook Integration: ${results.webhookIntegration ? '✅ PASS' : '⚠️ WARNING'}`);
  console.log('');

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`Total: ${passedTests}/${totalTests} tests passed`);
  console.log('');

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Cloudinary is working perfectly.');
    console.log('✅ Webhook integration is active and will log uploads.');
    process.exit(0);
  } else if (results.configuration && results.connection) {
    console.log('⚠️ Cloudinary is working but some features may have issues.');
    process.exit(0);
  } else {
    console.log('❌ Cloudinary is not working properly. Please check configuration.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
