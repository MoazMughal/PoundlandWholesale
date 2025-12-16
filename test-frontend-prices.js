// Test script to verify what the frontend receives
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

async function testFrontendPrices() {
  try {
    console.log('🧪 Testing frontend price display...\n');
    
    // 1. Get products from fast endpoint (what AmazonsChoice uses)
    console.log('1. Fetching from fast endpoint (AmazonsChoice page)...');
    const fastResponse = await fetch(`${API_BASE}/products/public/fast`);
    const fastData = await fastResponse.json();
    
    if (fastData.products && fastData.products.length > 0) {
      console.log(`✅ Found ${fastData.products.length} products`);
      console.log('✅ First 3 products from fast endpoint:');
      
      fastData.products.slice(0, 3).forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name}`);
        console.log(`      ID: ${product._id}`);
        console.log(`      Price: ${product.price} ${product.currency || 'PKR'}`);
        console.log(`      Original Price: ${product.originalPrice || 'N/A'}`);
        console.log('');
      });
      
      // 2. Simulate frontend transformation
      console.log('2. Simulating frontend price transformation...');
      const transformedProducts = fastData.products.slice(0, 3).map(p => {
        const currency = p.currency || 'PKR';
        const price = currency === 'GBP' ? `£${parseFloat(p.price).toFixed(2)}` : 
                     currency === 'USD' ? `$${parseFloat(p.price).toFixed(2)}` :
                     currency === 'AED' ? `د.إ${parseFloat(p.price).toFixed(2)}` :
                     `₨${parseFloat(p.price).toFixed(2)}`;
        
        return {
          id: p._id,
          name: p.name,
          price: price,
          originalPrice: p.originalPrice || `${currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'AED' ? 'د.إ' : '₨'}${(parseFloat(p.price) * 1.3).toFixed(2)}`,
          currency: currency
        };
      });
      
      console.log('✅ Transformed products (what users see):');
      transformedProducts.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name}`);
        console.log(`      Price: ${product.price}`);
        console.log(`      Original Price: ${product.originalPrice}`);
        console.log('');
      });
      
    } else {
      console.log('❌ No products found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrontendPrices();