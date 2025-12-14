// Test script to check price consistency across pages
async function testPriceConsistency() {
  console.log('🧪 Testing price consistency across pages...\n');
  
  try {
    // 1. Fetch products from the API
    console.log('1. Fetching products from API...');
    const response = await fetch('http://localhost:5000/api/products/public/fast');
    const data = await response.json();
    
    if (data.products && data.products.length > 0) {
      const sampleProduct = data.products[0];
      console.log('Sample product from database:');
      console.log('- Name:', sampleProduct.name);
      console.log('- Price:', sampleProduct.price);
      console.log('- Currency:', sampleProduct.currency || 'Not set');
      console.log('- Original Price:', sampleProduct.originalPrice || 'Not set');
      
      console.log('\n2. How prices should display:');
      
      // Admin Products page logic
      const adminPrice = sampleProduct.currency === 'GBP' ? 
        `£${parseFloat(sampleProduct.price).toFixed(2)}` : 
        `₨${parseFloat(sampleProduct.price).toFixed(2)}`;
      console.log('- Admin Products page:', adminPrice);
      
      // ProductDetail page logic (with currency conversion)
      const detailPrice = sampleProduct.currency === 'GBP' ? 
        `£${sampleProduct.price}` : 
        sampleProduct.currency === 'USD' ? `$${sampleProduct.price}` :
        sampleProduct.currency === 'AED' ? `د.إ${sampleProduct.price}` :
        `₨${sampleProduct.price}`;
      console.log('- Product Detail page:', detailPrice);
      
      // Amazon Choice page logic (after fix)
      const amazonPrice = sampleProduct.currency === 'GBP' ? 
        `£${sampleProduct.price}` : 
        sampleProduct.currency === 'USD' ? `$${sampleProduct.price}` :
        sampleProduct.currency === 'AED' ? `د.إ${sampleProduct.price}` :
        `₨${sampleProduct.price}`;
      console.log('- Amazon Choice pa();ConsistencyriceestP

t
} }ssage);
 ', error.mest failed:Te('❌ le.error consor) {
   rro(etch   } ca  }
    
onse');
  I respn APund ifos uctodog('❌ No prnsole.l
      cose {  } el      
  }
   s.');
    differencey conversioncurrenc to might be dueThis g('console.lo      ;
  !')oss pagescrfferent are di'❌ Prices ag(console.lo  t) {
      stennsi!isCo      if (      
);
isConsistentme price:',  show sa pages.log('✅ All  console);
    zonPrice= amatailPrice == de && detailPrice ===ceinPriadm = (ntt isConsiste  cons');
    tency check:Price consisg('\n3. le.lo      conso   
Price);
   ge:', amazon