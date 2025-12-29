#!/usr/bin/env node

// Environment Switcher for Development/Production
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');

const environments = {
  development: {
    NODE_ENV: 'development',
    FRONTEND_URL: 'http://localhost:3000'
  },
  production: {
    NODE_ENV: 'production', 
    FRONTEND_URL: 'https://www.genericwholesale.pk'
  }
};

function switchEnvironment(env) {
  if (!environments[env]) {
    console.error('❌ Invalid environment. Use: development or production');
    process.exit(1);
  }

  try {
    // Read current .env file
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update environment variables
    const config = environments[env];
    
    Object.entries(config).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    });

    // Write updated .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log(`✅ Environment switched to: ${env}`);
    console.log(`📍 NODE_ENV: ${config.NODE_ENV}`);
    console.log(`🌐 FRONTEND_URL: ${config.FRONTEND_URL}`);
    console.log('\n🔄 Please restart your server to apply changes');
    
  } catch (error) {
    console.error('❌ Error updating .env file:', error.message);
    process.exit(1);
  }
}

// Get command line argument
const targetEnv = process.argv[2];

if (!targetEnv) {
  console.log('🔧 Environment Switcher');
  console.log('Usage: node switch-environment.js [development|production]');
  console.log('\nCurrent environments:');
  console.log('- development: localhost:3000');
  console.log('- production: www.genericwholesale.pk');
  process.exit(0);
}

switchEnvironment(targetEnv);