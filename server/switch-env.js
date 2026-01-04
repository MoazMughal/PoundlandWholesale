#!/usr/bin/env node

// Script to switch between development and production environments
import fs from 'fs';
import path from 'path';

const mode = process.argv[2];

if (!mode || !['dev', 'prod'].includes(mode)) {
  console.log('Usage: node switch-env.js [dev|prod]');
  console.log('  dev  - Switch to development mode (shows reset URLs in console)');
  console.log('  prod - Switch to production mode (only sends emails)');
  process.exit(1);
}

const envFile = '.env';
const devEnvFile = '.env.development';

try {
  if (mode === 'dev') {
    if (fs.existsSync(devEnvFile)) {
      fs.copyFileSync(devEnvFile, envFile);
      console.log('✅ Switched to DEVELOPMENT mode');
      console.log('   - Reset URLs will be shown in console');
      console.log('   - Frontend URL: http://localhost:3000');
      console.log('   - Restart your server to apply changes');
    } else {
      console.log('❌ Development environment file not found');
    }
  } else if (mode === 'prod') {
    // Create production .env content
    const prodEnv = `# Working MongoDB connection with optimized timeouts
MONGODB_URI=mongodb+srv://Admin:iW0UgtS1d5Fnf1gt@cluster0.v6qyt5k.mongodb.net/amazon-gymkhana?retryWrites=true&w=majority&maxPoolSize=10&minPoolSize=2&maxIdleTimeMS=30000&serverSelectionTimeoutMS=15000&socketTimeoutMS=45000&connectTimeoutMS=15000&heartbeatFrequencyMS=10000&appName=Cluster0
JWT_SECRET=my_secret_key_12345
NODE_ENV=production

# Email Configuration for Password Reset (Nodemailer)
# Using Gmail with App Password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=Moazmughal786@gmail.com
EMAIL_PASS=cvxowgzqhgqbarsd
EMAIL_FROM_NAME=Generic Wholesale

# Set to 'production' to hide OTP from response (only send via email)
NODE_ENV=production

# Frontend URL (for password reset links)
# For development: http://localhost:3000
# For production: https://genericwholesale.pk
FRONTEND_URL=https://genericwholesale.pk`;

    fs.writeFileSync(envFile, prodEnv);
    console.log('✅ Switched to PRODUCTION mode');
    console.log('   - Reset URLs will only be sent via email');
    console.log('   - Frontend URL: https://www.genericwholesale.pk');
    console.log('   - Restart your server to apply changes');
  }
} catch (error) {
  console.error('❌ Error switching environment:', error.message);
}