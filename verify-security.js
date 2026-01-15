#!/usr/bin/env node

/**
 * Security Verification Script
 * Checks for exposed secrets in the codebase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log('\n🔒 Security Verification Check\n');

let issues = 0;
let warnings = 0;

// Patterns to check for
const secretPatterns = [
  {
    name: 'MongoDB Connection String',
    pattern: /mongodb\+srv:\/\/[^:]+:[^@]+@/g,
    severity: 'error'
  },
  {
    name: 'Hardcoded Password',
    pattern: /password\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    severity: 'warning'
  },
  {
    name: 'API Key Pattern',
    pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
    severity: 'warning'
  },
  {
    name: 'Secret Pattern',
    pattern: /secret\s*[:=]\s*['"][^'"]+['"]/gi,
    severity: 'warning'
  }
];

// Files to check
const filesToCheck = [
  'render.yaml',
  'server/.env.development',
  'server/.env.example',
  'server/switch-env.js',
  'server/verify-scentsy.js',
  'server/search-all-lighting.js',
  'server/count-products.js',
  'server/fix-lighting-to-lightning.js',
  'server/remove-products-without-cloudinary.js'
];

// Check each file
filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${YELLOW}File not found: ${file}${RESET}`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  let fileHasIssues = false;
  
  secretPatterns.forEach(({ name, pattern, severity }) => {
    const matches = content.match(pattern);
    
    if (matches) {
      // Filter out example/placeholder values
      const realMatches = matches.filter(match => {
        const lower = match.toLowerCase();
        return !lower.includes('your_') &&
               !lower.includes('your-') &&
               !lower.includes('example') &&
               !lower.includes('placeholder') &&
               !lower.includes('username:password') &&
               !lower.includes('localhost') &&
               !lower.includes('sync: false') &&
               !lower.includes('process.env') &&
               !match.includes('iW0UgtS1d5Fnf1gt') === false; // Check if it contains the OLD exposed password
      });
      
      if (realMatches.length > 0) {
        if (!fileHasIssues) {
          console.log(`\n📄 ${file}:`);
          fileHasIssues = true;
        }
        
        if (severity === 'error') {
          console.log(`   ${RED}❌ ${name} detected${RESET}`);
          issues++;
        } else {
          console.log(`   ${YELLOW}⚠️  ${name} detected${RESET}`);
          warnings++;
        }
      }
    }
  });
});

// Check .gitignore
console.log('\n📋 Checking .gitignore...');
const gitignorePath = path.join(__dirname, '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignore = fs.readFileSync(gitignorePath, 'utf8');
  const requiredEntries = ['.env', 'server/.env', '**/.env'];
  const missingEntries = requiredEntries.filter(entry => !gitignore.includes(entry));
  
  if (missingEntries.length === 0) {
    console.log(`   ${GREEN}✅ All .env files are ignored${RESET}`);
  } else {
    console.log(`   ${YELLOW}⚠️  Missing entries: ${missingEntries.join(', ')}${RESET}`);
    warnings++;
  }
} else {
  console.log(`   ${RED}❌ .gitignore not found${RESET}`);
  issues++;
}

// Check if .env files are tracked
console.log('\n📋 Checking Git tracking...');
try {
  const { execSync } = await import('child_process');
  const trackedEnvFiles = execSync('git ls-files | findstr /i "\\.env"', { encoding: 'utf8' });
  
  const dangerousFiles = trackedEnvFiles
    .split('\n')
    .filter(f => f.trim() && !f.includes('.example') && !f.includes('.development'));
  
  if (dangerousFiles.length > 0) {
    console.log(`   ${RED}❌ Tracked .env files found:${RESET}`);
    dangerousFiles.forEach(f => console.log(`      - ${f}`));
    issues++;
  } else {
    console.log(`   ${GREEN}✅ No sensitive .env files are tracked${RESET}`);
  }
} catch (error) {
  console.log(`   ${YELLOW}⚠️  Could not check Git tracking${RESET}`);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Summary:');
console.log('='.repeat(50));

if (issues === 0 && warnings === 0) {
  console.log(`${GREEN}✅ No security issues found!${RESET}`);
  console.log('\nYour codebase appears secure. Remember to:');
  console.log('1. Rotate credentials that were previously exposed');
  console.log('2. Update Render environment variables');
  console.log('3. Clean Git history if needed');
} else {
  if (issues > 0) {
    console.log(`${RED}❌ Critical Issues: ${issues}${RESET}`);
  }
  if (warnings > 0) {
    console.log(`${YELLOW}⚠️  Warnings: ${warnings}${RESET}`);
  }
  console.log('\nPlease review the issues above and:');
  console.log('1. Remove hardcoded secrets from files');
  console.log('2. Use environment variables instead');
  console.log('3. Follow the SECURITY_ROTATION_GUIDE.md');
}

console.log('\n');
process.exit(issues > 0 ? 1 : 0);
