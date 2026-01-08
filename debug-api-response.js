// Debug script to check what the API is actually returning for DIY & Tools category

async function debugApiResponse() {
  console.log('🔍 Debugging API response for DIY & Tools category...\n');
  
  const testUrl = 'http://localhost:5000/api/products/public?isAmazonsChoice=true&category=diy-%26-tools&limit=100&page=1';
  console.log('Testing URL:', testUrl);
  
  try {
    const response = await fetch(testUrl);
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n📊 API Response Structure:');
      console.log('- Type of data:', typeof data);
      console.log('- Keys in data:', Object.keys(data));
      console.log('- data.products exists:', !!data.products);
      console.log('- data.products type:', typeof data.products);
      console.log('- data.products length:', data.products?.length);
      console.log('- data.total:', data.total);
      console.log('- data.totalPages:', data.totalPages);
      console.log('- data.currentPage:', data.currentPage);
      console.log('- data.source:', data.source);
      
      if (data.products && data.products.length > 0) {
        console.log('\n📦 First Product Sample:');
        const firstProduct = data.products[0];
        console.log('- Product keys:', Object.keys(firstProduct));
        console.log('- _id:', firstProduct._id);
        console.log('- name:', firstProduct.name);
        console.log('- category:', firstProduct.category);
        console.log('- isAmazonsChoice:', firstProduct.isAmazonsChoice);
        console.log('- price:', firstProduct.price);
        console.log('- images:', firstProduct.images?.length || 0, 'images');
      } else {
        console.log('\n❌ No products in response or products array is empty');
      }
      
      // Test the exact condition used in the frontend
      const frontendCondition = data.products && data.products.length > 0;
      console.log('\n🔍 Frontend condition (data.products && data.products.length > 0):', frontendCondition);
      
      if (!frontendCondition) {
        console.log('❌ This is why the frontend shows "No Amazing Products Found"');
        console.log('- data.products is:', data.products);
        console.log('- data.products.length is:', data.products?.length);
      }
      
    } else {
      console.log('❌ Response not OK:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Fetch error:', error.message);
  }
}

// Run the debug
debugApiResponse().catch(console.error);