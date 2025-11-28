// Test OTP flow with detailed logging
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '.env');
console.log(`📁 Loading .env from: ${envPath}`);
config({ path: envPath });

console.log('\n🧪 Testing OTP Flow...\n');

// Import after env is loaded
const { sendOTP, identifyContactMethod } = await import('./services/otp.js');

const testEmail = 'moazmughal786@gmail.com';
const testOTP = '123456';
const testName = 'Test User';

console.log(`📧 Test Email: ${testEmail}`);
console.log(`🔢 Test OTP: ${testOTP}`);
console.log(`👤 Test Name: ${testName}\n`);

// Identify contact method
const method = identifyContactMethod(testEmail);
console.log(`📱 Contact Method: ${method}\n`);

// Send OTP
console.log('🚀 Sending OTP...\n');
const startTime = Date.now();

try {
  const result = await sendOTP(testEmail, testOTP, testName);
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log(`\n⏱️  Duration: ${duration} seconds`);
  console.log('\n✅ Result:', result);
  
  if (result.success) {
    console.log('\n🎉 OTP sent successfully!');
  } else {
    console.log('\n❌ Failed to send OTP:', result.message);
  }
} catch (error) {
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log(`\n⏱️  Duration: ${duration} seconds`);
  console.error('\n❌ Error:', error.message);
  console.error('Stack:', error.stack);
}

console.log('\n🏁 Test completed!');
process.exit(0);
