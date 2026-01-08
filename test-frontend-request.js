// Test script to simulate the exact request the frontend makes

async function testFrontendRequest() {
  console.log('🔍 Testing frontend request simulation...\n');
  
  // Simulate the exact parameters the frontend would send
  const category = 'diy-&-tools'; // This is what comes from the URL parameter
  const search = null;
  const page = 1;
  const productsPerPage = 100;
  
  // Build API parameters exactly like the frontend does
  const params = new URLSearchParams();
  params.append('isAmazonsChoice', 'true');
  params.append('limit', productsPerPage.toString());
  params.append('page', page.toString());
  
  if (category && category !== 'all') {
    params.append('category', category);
  }
  if (search) {
    params.append('search', search);
  }
  
  const apiUrl = `products/public?${params.toString()}`;
  const fullUrl = `http://localhost:5000/api/${apiUrl}`;
  
  console.log('Frontend simulation:');
  console.log('- Category parameter:', category);
  console.log('- API URL:', apiUrl);
  console.log('- Full URL:', fullUrl);
  console.log('- URL params:', params.toString());
  
  try {
    const response = await fetch(fullUrl, {
      headers: { 'Accept': 'application/json' }
    });
    
    console.log('\nResponse:');
    console.log('- Status:', response.status);
    console.log('- OK:', response.ok);
    
    if (response.ok) {
      const data = await response.json();
      
      console.log('\nData structure:');
      console.log('- data.products exists:', !!data.products);
      console.log('- data.products type:', typeof data.products);
      console.log('- data.products length:', data.products?.length);
      console.log('- data.total:', data.total);
      console.log('- data.source:', data.source);
      
      // Test the exact frontend condition
      const frontendCondition = data.products && data.products.length > 0;
      console.log('\nFrontend condition result:', frontendCondition);
      
      if (frontendCondition) {
        console.log('✅ Frontend should show products');
        console.log('- First product:', data.products[0].name);
        console.log('- First product category:', data.products[0].category);
      } else {
        console.log('❌ Frontend will show "No Amazing Products Found"');
        console.log('- Reason: data.products =', data.products);
      }
      
    } else {
      console.log('❌ Response not OK');
      const errorText = await response.text();
      console.log('Error:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

// Run the test
testFrontendRequest().catch(console.error);