// Script to clear server cache
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

async function clearCache() {
  try {
    console.log('🗑️ Clearing server cache...');
    
    // This will force the server to fetch fresh data
    const response = await fetch(`${API_BASE}/products/public/fast?_t=${Date.now()}`);
    const data = await response.json();
    
    console.log('✅ Cache cleared, fetched fresh data:');
    console.log(`   Products: ${data.products.length}`);
    console.log(`   Source: ${data.source}`);
    console.log(`   Cache Version: ${data.cacheVersion}`);
    
    if (data.products.length > 0) {
      const firstProduct = data.products[0];
      console.log('✅ First product after cache clear:');
      console.log(`   ID: ${firstProduct._id}`);
      console.log(`   Name: ${firstProduct.name}`);
      console.log(`   Price: ${firstProduct.price}`);
      console.log(`   Currency: ${firstProduct.currency}`);
    }
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error.message);
  }
}

clearCache();