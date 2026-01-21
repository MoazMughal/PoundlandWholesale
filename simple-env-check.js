// Simple check without external dependencies
import { readFileSync } from 'fs';

try {
  const envContent = readFileSync('./server/.env', 'utf8');
  console.log('🔧 Current .env Configuration');
  console.log('=============================');
  
  const lines = envContent.split('\n');
  const frontendUrlLine = lines.find(line => line.startsWith('FRONTEND_URL='));
  
  if (frontendUrlLine) {
    console.log(`Found: ${frontendUrlLine}`);
    
    if (frontendUrlLine.includes('localhost:3000')) {
      console.log('✅ FRONTEND_URL is set for development');
    } else if (frontendUrlLine.includes('genericwholesale.pk')) {
      console.log('⚠️  FRONTEND_URL is set for production');
    }
  } else {
    console.log('❌ FRONTEND_URL not found in .env file');
  }
  
  console.log('');
  console.log('🔍 The Issue:');
  console.log('The email still shows production URL because:');
  console.log('1. You might be testing on the production website (genericwholesale.pk)');
  console.log('2. OR your local server needs to be restarted');
  console.log('');
  console.log('🔧 Solution:');
  console.log('1. Make sure you are testing on: http://localhost:3000');
  console.log('2. NOT on: https://genericwholesale.pk');
  console.log('3. Restart your local server: npm run dev (in server folder)');
  console.log('4. Then test password reset from localhost');
  
} catch (error) {
  console.error('Error reading .env file:', error.message);
}