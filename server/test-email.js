// Quick email test script
import { config } from 'dotenv';
import { sendPasswordResetEmail, sendEmailOTP } from './services/email.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from server/.env
config({ path: join(__dirname, '.env') });

console.log('📁 Loading .env from:', join(__dirname, '.env'));

console.log('🧪 Testing Email Configuration...\n');

console.log('Environment Variables:');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***configured***' : 'NOT SET');
console.log('');

// Test email address (change this to your email)
const testEmail = process.env.EMAIL_USER || 'test@example.com';
const testName = 'Test User';
const testOTP = '123456';
const testResetUrl = 'http://localhost:5173/reset-password/test-token?type=buyer';

console.log(`📧 Sending test OTP email to: ${testEmail}\n`);

// Test OTP email
sendEmailOTP(testEmail, testOTP, testName)
  .then(result => {
    console.log('\n✅ OTP Email Test Result:', result);
    
    console.log(`\n📧 Sending test password reset email to: ${testEmail}\n`);
    
    // Test password reset email
    return sendPasswordResetEmail(testEmail, testName, testResetUrl);
  })
  .then(result => {
    console.log('\n✅ Password Reset Email Test Result:', result);
    console.log('\n🎉 Email test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Email test failed:', error);
    process.exit(1);
  });
