// Quick startup test to verify all imports work
console.log('🧪 Testing server startup...\n');

try {
  console.log('1️⃣ Testing imports...');
  
  // Test security middleware imports
  await import('./middleware/rateLimiter.js');
  console.log('   ✅ rateLimiter.js');
  
  await import('./middleware/errorHandler.js');
  console.log('   ✅ errorHandler.js');
  
  await import('./middleware/validation.js');
  console.log('   ✅ validation.js');
  
  await import('./utils/logger.js');
  console.log('   ✅ logger.js');
  
  console.log('\n2️⃣ Testing route imports...');
  
  await import('./routes/auth.js');
  console.log('   ✅ auth.js');
  
  await import('./routes/buyer.js');
  console.log('   ✅ buyer.js');
  
  await import('./routes/sellers.js');
  console.log('   ✅ sellers.js');
  
  console.log('\n✅ All imports successful!');
  console.log('✅ Server should start without errors.\n');
  console.log('Run: npm run dev');
  
  process.exit(0);
} catch (error) {
  console.error('\n❌ Import failed:', error.message);
  console.error('\nStack trace:', error.stack);
  process.exit(1);
}
