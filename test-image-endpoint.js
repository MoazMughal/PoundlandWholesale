// Test the image endpoint directly
const testImageEndpoint = async () => {
  const testAsin = 'B08T9472RG'; // From your screenshot
  const productionUrl = `https://generic-wholesale-backend.onrender.com/api/admin-excel/public/images/by-asin/${testAsin}`;
  const developmentUrl = `http://localhost:5000/api/admin-excel/public/images/by-asin/${testAsin}`;
  
  console.log('Testing image endpoints...');
  
  // Test production URL
  try {
    console.log('Testing production URL:', productionUrl);
    const response = await fetch(productionUrl);
    console.log('Production response status:', response.status);
    console.log('Production response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      console.log('✅ Production URL works');
    } else {
      console.log('❌ Production URL failed:', response.statusText);
      const text = await response.text();
      console.log('Response body:', text);
    }
  } catch (error) {
    console.log('❌ Production URL error:', error.message);
  }
  
  // Test development URL (if running locally)
  try {
    console.log('Testing development URL:', developmentUrl);
    const response = await fetch(developmentUrl);
    console.log('Development response status:', response.status);
    
    if (response.ok) {
      console.log('✅ Development URL works');
    } else {
      console.log('❌ Development URL failed:', response.statusText);
    }
  } catch (error) {
    console.log('❌ Development URL error:', error.message);
  }
};

// Run the test
testImageEndpoint();