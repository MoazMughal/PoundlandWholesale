// Script to find the lost electronics products
const findLostProducts = async () => {
  try {
    console.log('🔍 Finding Lost Electronics Products');
    console.log('====================================');
    
    // Get all products to see where they went
    console.log('\n1. Fetching ALL products...');
    const allResponse = await fetch('http://localhost:5000/api/products/public?limit=200');
    const allResult = await allResponse.json();
    
    console.log(`📦 Total products found: ${allResult.products?.length || 0}`);
    
    if (allResult.products?.length > 0) {
      // Group by category to see distribution
      const categoryGroups = {};
      allResult.products.forEach(product => {
        const category = product.category || 'NO_CATEGORY';
        if (!categoryGroups[category]) {
          categoryGroups[category] = [];
        }
        categoryGroups[category].push(product);
      });
      
      console.log('\n2. Current product distribution:');
      Object.keys(categoryGroups).sort().forEach(category => {
        const count = categoryGroups[category].length;
        console.log(`   📂 "${category}": ${count} products`);
        
        // Show sample products for each category
        if (count > 0 && count <= 3) {
          categoryGroups[category].forEach(p => {
            console.log(`      - ${p.name}`);
          });
        } else if (count > 3) {
          categoryGroups[category].slice(0, 2).forEach(p => {
            console.log(`      - ${p.name}`);
          });
          console.log(`      ... and ${count - 2} more`);
        }
      });
      
      // Look for electronics-related products by name
      console.log('\n3. Searching for electronics products by name...');
      const electronicsProducts = allResult.products.filter(p => 
        p.name?.toLowerCase().includes('keyboard') ||
        p.name?.toLowerCase().includes('usb') ||
        p.name?.toLowerCase().includes('camera') ||
        p.name?.toLowerCase().includes('charging') ||
        p.name?.toLowerCase().includes('webcam') ||
        p.name?.toLowerCase().includes('power bank') ||
        p.name?.toLowerCase().includes('mouse') ||
        p.name?.toLowerCase().includes('speaker') ||
        p.name?.toLowerCase().includes('watch') ||
        p.name?.toLowerCase().includes('headphones') ||
        p.name?.toLowerCase().includes('mechanical') ||
        p.name?.toLowerCase().includes('wireless') ||
        p.name?.toLowerCase().includes('bluetooth') ||
        p.name?.toLowerCase().includes('smart')
      );
      
      console.log(`🔍 Found ${electronicsProducts.length} electronics-like products:`);
      electronicsProducts.forEach(p => {
        console.log(`   - "${p.name}" → Category: "${p.category}" (ID: ${p._id})`);
      });
      
      // Look for specific categories that might contain the lost products
      console.log('\n4. Checking specific categories...');
      const suspiciousCategories = [
        'Car-bulb', 'Car-Bulb', 'car-bulb', 'car-Bulb',
        'Electronics', 'electronics', 'ELECTRONICS',
        'Electronic', 'electronic', 'ELECTRONIC'
      ];
      
      suspiciousCategories.forEach(catName => {
        const products = categoryGroups[catName] || [];
        if (products.length > 0) {
          console.log(`   📂 "${catName}": ${products.length} products`);
          products.forEach(p => {
            console.log(`      - ${p.name}`);
          });
        }
      });
      
      // Check for products with null/undefined categories
      const noCategoryProducts = allResult.products.filter(p => !p.category || p.category.trim() === '');
      console.log(`\n5. Products with no category: ${noCategoryProducts.length}`);
      noCategoryProducts.forEach(p => {
        console.log(`   - "${p.name}" (ID: ${p._id})`);
      });
      
    }
    
    console.log('\n🎯 Recovery Plan:');
    console.log('================');
    console.log('Based on the results above, we can:');
    console.log('1. Identify where the electronics products ended up');
    console.log('2. Move them back to the correct category');
    console.log('3. Fix any category naming issues');
    
  } catch (error) {
    console.error('❌ Error finding products:', error);
  }
};

findLostProducts();