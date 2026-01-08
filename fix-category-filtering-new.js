// Fix category filtering to handle both old (&) and new (and) formats

async function fixCategoryFiltering() {
  console.log('🔧 Testing category filtering with new format...\n');
  
  // Test the new format
  console.log('1. Testing new format (diy-and-tools):');
  try {
    const response = await fetch('http://localhost:5000/api/products/public?isAmazonsChoice=true&category=diy-and-tools');
    const data = await response.json();
    console.log('- Products found:', data.products?.length || 0);
    console.log('- Source:', data.source);
  } catch (error) {
    console.log('- Error:', error.message);
  }
  
  // Test the old format for comparison
  console.log('\n2. Testing old format (diy-&-tools):');
  try {
    const response = await fetch('http://localhost:5000/api/products/public?isAmazonsChoice=true&category=diy-%26-tools');
    const data = await response.json();
    console.log('- Products found:', data.products?.length || 0);
    console.log('- Source:', data.source);
  } catch (error) {
    console.log('- Error:', error.message);
  }
  
  // Test debug endpoint
  console.log('\n3. Testing debug endpoint:');
  try {
    const response = await fetch('http://localhost:5000/api/products/public/debug/category/diy-and-tools');
    const data = await response.json();
    console.log('- Total found:', data.totalFound);
    console.log('- Sample products:', data.sampleProducts?.length || 0);
    if (data.sampleProducts && data.sampleProducts.length > 0) {
      console.log('- First product category:', data.sampleProducts[0].category);
    }
  } catch (error) {
    console.log('- Error:', error.message);
  }
  
  // Test other categories
  console.log('\n4. Testing other new format categories:');
  const testCategories = ['home-and-kitchen', 'toys-and-games'];
  
  for (const category of testCategories) {
    try {
      const response = await fetch(`http://localhost:5000/api/products/public?isAmazonsChoice=true&category=${category}`);
      const data = await response.json();
      console.log(`- ${category}: ${data.products?.length || 0} products`);
    } catch (error) {
      console.log(`- ${category}: Error - ${error.message}`);
    }
  }
}

fixCategoryFiltering().catch(console.error);