// Test the API response to see what images are being returned
async function testAPIResponse() {
  try {
    console.log('🔍 Testing API response...');
    
    const response = await fetch('https://generic-wholesale-backend.onrender.com/api/products/public?isAmazonsChoice=true&limit=5');
    const data = await response.json();
    
    console.log('📊 API Response Status:', response.status);
    console.log('📊 Products found:', data.products ? data.products.length : 0);
    
    if (data.products && data.products.length > 0) {
      console.log('\n📋 Sample products:');
      data.products.forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   ASIN: ${product.asin || 'N/A'}`);
        console.log(`   Price: ${product.price || 'N/A'}`);
        console.log(`   Images array: ${product.images ? JSON.stringify(product.images) : 'No images'}`);
        console.log(`   Image field: ${product.image || 'No image field'}`);
        console.log(`   Category: ${product.category || 'N/A'}`);
        console.log(`   Amazon's Choice: ${product.isAmazonsChoice ? 'Yes' : 'No'}`);
        
        // Check if image URL is accessible
        if (product.images && product.images[0]) {
          console.log(`   Image URL check: Testing ${product.images[0]}`);
        }
      });
    } else {
      console.log('❌ No products found in API response');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testAPIResponse();