// Fix for category filtering issue in Amazon's Choice page
// The issue: "DIY & Tools" category is stored in DB but URL becomes "diy-%26-tools" (URL encoded)
// This script will test and fix the category filtering logic

async function testCategoryFiltering() {
  console.log('🔍 Testing category filtering issue...\n');
  
  // Test the current broken URL
  console.log('1. Testing current broken URL:');
  const brokenUrl = 'http://localhost:5000/api/products/public?isAmazonsChoice=true&category=diy-%26-tools';
  console.log('URL:', brokenUrl);
  
  try {
    const response = await fetch(brokenUrl);
    const data = await response.json();
    console.log('Results:', data.products?.length || 0, 'products found');
    console.log('Source:', data.source);
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  console.log('\n2. Testing debug endpoint:');
  const debugUrl = 'http://localhost:5000/api/products/public/debug/category/diy-%26-tools';
  console.log('URL:', debugUrl);
  
  try {
    const response = await fetch(debugUrl);
    const data = await response.json();
    console.log('Debug results:');
    console.log('- Searched for:', data.searchedFor);
    console.log('- Total found:', data.totalFound);
    console.log('- Sample products:', data.sampleProducts?.length || 0);
    console.log('- Matching categories:', data.matchingCategories);
    
    if (data.sampleProducts && data.sampleProducts.length > 0) {
      console.log('- First product category:', data.sampleProducts[0].category);
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  console.log('\n3. Testing with proper category name:');
  const properUrl = 'http://localhost:5000/api/products/public?isAmazonsChoice=true&category=DIY%20%26%20Tools';
  console.log('URL:', properUrl);
  
  try {
    const response = await fetch(properUrl);
    const data = await response.json();
    console.log('Results:', data.products?.length || 0, 'products found');
    console.log('Source:', data.source);
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  console.log('\n4. Testing all categories endpoint:');
  const categoriesUrl = 'http://localhost:5000/api/products/public/categories';
  
  try {
    const response = await fetch(categoriesUrl);
    const data = await response.json();
    console.log('Available categories:');
    data.categories?.forEach(cat => {
      if (cat.label.toLowerCase().includes('diy') || cat.label.toLowerCase().includes('tools')) {
        console.log(`- Label: "${cat.label}", Value: "${cat.value}"`);
      }
    });
  } catch (error) {
    console.log('Error:', error.message);
  }
}

// Run the test
testCategoryFiltering().catch(console.error);