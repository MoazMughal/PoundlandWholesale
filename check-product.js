const mongoose = require('mongoose');
const Product = require('./server/models/Product.js');

mongoose.connect('mongodb://localhost:27017/amazon-choice')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Find the product
    const product = await Product.findOne({ 
      name: /Scentsy Mini Wax Warmer/i 
    }).lean();
    
    if (product) {
      console.log('\n✅ Product Found:');
      console.log('Name:', product.name);
      console.log('Category:', product.category);
      console.log('Status:', product.status);
      console.log('Approval Status:', product.approvalStatus);
      console.log('Is Amazon\'s Choice:', product.isAmazonsChoice);
      console.log('ID:', product._id);
      
      // Check if it should be visible
      if (product.approvalStatus === 'approved' && product.isAmazonsChoice) {
        console.log('\n✅ Product SHOULD be visible in Amazon\'s Choice');
      } else {
        console.log('\n❌ Product will NOT be visible because:');
        if (product.approvalStatus !== 'approved') {
          console.log('  - Approval Status is:', product.approvalStatus, '(needs to be "approved")');
        }
        if (!product.isAmazonsChoice) {
          console.log('  - isAmazonsChoice is:', product.isAmazonsChoice, '(needs to be true)');
        }
      }
      
      // Check category spelling
      if (product.category) {
        const categoryLower = product.category.toLowerCase();
        if (categoryLower.includes('light')) {
          console.log('\n💡 Category contains "light"');
          if (categoryLower === 'lightning') {
            console.log('   Category is: "Lightning" (with "n")');
          } else if (categoryLower === 'lighting') {
            console.log('   Category is: "Lighting" (without "n")');
          } else {
            console.log('   Category is:', product.category);
          }
        }
      }
      
    } else {
      console.log('\n❌ Product not found with name containing "Scentsy Mini Wax Warmer"');
      
      // Search for similar products
      console.log('\nSearching for products with "Scentsy" or "Wax Warmer"...');
      const similar = await Product.find({
        $or: [
          { name: /Scentsy/i },
          { name: /Wax Warmer/i },
          { name: /15W E14/i }
        ]
      }).select('name category approvalStatus isAmazonsChoice').limit(5).lean();
      
      if (similar.length > 0) {
        console.log('\nFound similar products:');
        similar.forEach(p => {
          console.log(`- ${p.name} (Category: ${p.category}, Approved: ${p.approvalStatus}, Amazon's Choice: ${p.isAmazonsChoice})`);
        });
      } else {
        console.log('No similar products found');
      }
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
