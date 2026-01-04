// Fix duplicate Car-bulb categories
const fixDuplicateCategories = async () => {
  try {
    console.log('🔧 Fixing Duplicate Car-bulb Categories');
    console.log('======================================');
    
    // Check products in both Car-bulb variations
    console.log('\n1. Checking products in Car-bulb variations...');
    
    const response1 = await fetch('http://localhost:5000/api/products/public?category=Car-bulb&limit=50');
    const result1 = await response1.json();
    console.log(`📦 Products in "Car-bulb" (capital): ${result1.products?.length || 0}`);
    
    const response2 = await fetch('http://localhost:5000/api/products/public?category=car-bulb&limit=50');
    const result2 = await response2.json();
    console.log(`📦 Products in "car-bulb" (lowercase): ${result2.products?.length || 0}`);
    
    // Show sample products from each
    if (result1.products?.length > 0) {
      console.log('\nSample from "Car-bulb":');
      result1.products.slice(0, 3).forEach(p => {
        console.log(`   - ${p.name}`);
      });
    }
    
    if (result2.products?.length > 0) {
      console.log('\nSample from "car-bulb":');
      result2.products.slice(0, 3).forEach(p => {
        console.log(`   - ${p.name}`);
      });
    }
    
    console.log('\n🎯 Recommended Actions:');
    console.log('======================');
    console.log('1. Use Category Management Modal to rename one category');
    console.log('2. Move all products to a single consistent category name');
    console.log('3. Delete the empty duplicate category');
    
    console.log('\n📋 Steps to Fix:');
    console.log('================');
    console.log('1. Go to Admin → Products → "📂 Manage Categories"');
    console.log('2. Go to "🔄 Move Products" tab');
    console.log('3. Move all products from "car-bulb" to "Car-bulb"');
    console.log('4. Or rename "car-bulb" to merge with "Car-bulb"');
    
  } catch (error) {
    console.error('❌ Error checking categories:', error);
  }
};

fixDuplicateCategories();