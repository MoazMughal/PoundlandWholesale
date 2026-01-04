// Check admin filtering and category visibility
const checkAdminFiltering = async () => {
  try {
    console.log('🔍 Checking Admin Filtering Issues');
    console.log('==================================');
    
    // Check categories endpoint
    console.log('\n1. Checking categories endpoint...');
    const categoriesResponse = await fetch('http://localhost:5000/api/products/public/categories');
    const categoriesResult = await categoriesResponse.json();
    
    console.log('📂 Available categories from API:');
    categoriesResult.categories.forEach(cat => {
      if (cat.value !== 'all') {
        console.log(`   - Label: "${cat.label}" | Value: "${cat.value}"`);
      }
    });
    
    // Check if Electronics and Car-bulb are in the categories list
    const electronicsCategory = categoriesResult.categories.find(c => 
      c.label.toLowerCase().includes('electronic') || c.value.toLowerCase().includes('electronic')
    );
    const carBulbCategory = categoriesResult.categories.find(c => 
      c.label.toLowerCase().includes('car') && c.label.toLowerCase().includes('bulb')
    );
    
    console.log('\n2. Specific category check:');
    console.log(`📂 Electronics category found: ${electronicsCategory ? 'YES' : 'NO'}`);
    if (electronicsCategory) {
      console.log(`   - Label: "${electronicsCategory.label}" | Value: "${electronicsCategory.value}"`);
    }
    console.log(`📂 Car-bulb category found: ${carBulbCategory ? 'YES' : 'NO'}`);
    if (carBulbCategory) {
      console.log(`   - Label: "${carBulbCategory.label}" | Value: "${carBulbCategory.value}"`);
    }
    
    // Check products with specific category filters
    console.log('\n3. Testing category filtering...');
    
    // Test Electronics filter
    const electronicsFilterResponse = await fetch('http://localhost:5000/api/products/public?category=Electronics&limit=20');
    const electronicsFilterResult = await electronicsFilterResponse.json();
    console.log(`📦 Products with category "Electronics": ${electronicsFilterResult.products?.length || 0}`);
    
    // Test Car-bulb filter
    const carBulbFilterResponse = await fetch('http://localhost:5000/api/products/public?category=Car-bulb&limit=20');
    const carBulbFilterResult = await carBulbFilterResponse.json();
    console.log(`📦 Products with category "Car-bulb": ${carBulbFilterResult.products?.length || 0}`);
    
    // Check hidden categories in localStorage
    console.log('\n4. Checking for hidden categories...');
    console.log('Note: This would need to be checked in browser localStorage');
    console.log('Check browser localStorage for "hiddenCategories" key');
    
    console.log('\n🎯 Diagnosis:');
    console.log('=============');
    console.log('If categories are missing from the API response, they might be:');
    console.log('1. Hidden in the CategoryVisibilityToggle');
    console.log('2. Not properly generated due to case sensitivity');
    console.log('3. Filtered out by the categories endpoint logic');
    
    console.log('\n🔧 Solutions:');
    console.log('=============');
    console.log('1. Check browser localStorage for hiddenCategories');
    console.log('2. Clear category cache and refresh');
    console.log('3. Verify category names match exactly');
    
  } catch (error) {
    console.error('❌ Error checking admin filtering:', error);
  }
};

checkAdminFiltering();