// Test script to verify image loading functionality
import { getApiUrl } from './src/utils/api.js';

const testImageLoading = async () => {
  console.log('🧪 Testing image loading functionality...');
  
  // Test ASIN-based image URLs
  const testASINs = ['B08T9472RG', 'B07QXMNF1X', 'B08XYZABC1'];
  
  for (const asin of testASINs) {
    const imageUrl = getApiUrl(`admin-excel/public/images/by-asin/${asin}`);
    console.log(`📸 Testing image URL for ASIN ${asin}: ${imageUrl}`);
    
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      console.log(`✅ ASIN ${asin}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`❌ ASIN ${asin}: ${error.message}`);
    }
  }
  
  console.log('🏁 Image loading test completed');
};

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testImageLoading();
}

export default testImageLoading;