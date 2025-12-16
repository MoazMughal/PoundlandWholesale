// Test script to verify price updates are working correctly
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

async function testPriceUpdate() {
  try {
    console.log('🧪 Testing price update functionality...\n');
    
    // 1. Get current products from fast endpoint
    console.log('1. Fetching products from fast endpoint...');
    const fastResponse = await fetch(`${API_BASE}/products/public/fast`);
    const fastData = await fastResponse.json();
    
    if (fastData.products && fastData.products.length > 0) {
      const firstProduct = fastData.products[0];
      console.log('✅ First product from fast endpoint:');
      console.log(`   ID: ${firstProduct._id}`);
      console.log(`   Name: ${firstProduct.name}`);
      console.log(`   Price: ${firstProduct.price}`);
      console.log(`   Currency: ${firstProduct.currency}`);
      console.log(`   Source: ${fastData.source}`);
      console.log(`   Cache Version: ${fastData.cacheVersion}\n`);
      
      // 2. Get the same product from public endpoint
      console.log('2. Fetching same product from public endpoint...');
      const publicResponse = await fetch(`${API_BASE}/products/public?limit=50`);
      const publicData = await publicResponse.json();
      
      const sameProduct = publicData.products.find(p => p._id === firstProduct._id);
      if (sameProduct) {
        console.log('✅ Same product from public endpoint:');
        console.log(`   ID: ${sameProduct._id}`);
        console.log(`   Name: ${sameProduct.name}`);
        console.log(`   Price: ${sameProduct.price}`);
        console.log(`   Currency: ${sameProduct.currency}`);
        
        // Compare prices
        if (firstProduct.price === sameProduct.price) {
          console.log('✅ Prices match between endpoints!\n');
        } else {
          console.log('❌ Price mismatch between endpoints!');
          console.log(`   Fast endpoint: ${firstProduct.price}`);
          console.log(`   Public endpoint: ${sameProduct.price}\n`);
        }
      } else {
        console.log('⚠️ Product not found in public endpoint\n');
      }
      
      // 3. Check cache version
      console.log('3. Checking cache version...');
      const versionResponse = await fetch(`${API_BASE}/products/public/cache-version`);
      const versionData = await versionResponse.json();
      console.log('✅ Cache version info:');
      console.log(`   Version: ${versionData.version}`);
      console.log(`   Cache Active: ${versionData.cacheActive}`);
      
    } else {
      console.log('❌ No products found in fast endpoint');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testPriceUpdate();