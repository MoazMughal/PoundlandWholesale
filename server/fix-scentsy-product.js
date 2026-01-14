import mongoose from 'mongoose';
import Product from './models/Product.js';

mongoose.connect('mongodb://localhost:27017/amazon-choice')
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    // Find the product
    const product = await Product.findOne({ 
      name: /Scentsy Mini Wax Warmer/i 
    });
    
    if (product) {
      console.log('📦 Product Found:');
      console.log('   Name:', product.name);
      console.log('   Category:', product.category);
      console.log('   Status:', product.status);
      console.log('   Approval Status:', product.approvalStatus);
      console.log('   Is Amazon\'s Choice:', product.isAmazonsChoice);
      console.log('   ID:', product._id);
      console.log('');
      
      // Fix the product
      const updates = {};
      let needsUpdate = false;
      
      if (product.approvalStatus !== 'approved') {
        updates.approvalStatus = 'approved';
        needsUpdate = true;
        console.log('🔧 Will set approvalStatus to "approved"');
      }
      
      if (product.status !== 'active') {
        updates.status = 'active';
        needsUpdate = true;
        console.log('🔧 Will set status to "active"');
      }
      
      if (!product.isAmazonsChoice) {
        updates.isAmazonsChoice = true;
        needsUpdate = true;
        console.log('🔧 Will set isAmazonsChoice to true');
      }
      
      // Check category - normalize to "Lighting" if it contains "light"
      if (product.category && product.category.toLowerCase().includes('light')) {
        if (product.category !== 'Lighting') {
          updates.category = 'Lighting';
          needsUpdate = true;
          console.log(`🔧 Will change category from "${product.category}" to "Lighting"`);
        }
      }
      
      if (needsUpdate) {
        console.log('\n🔄 Updating product...');
        await Product.updateOne({ _id: product._id }, { $set: updates });
        console.log('✅ Product updated successfully!\n');
        
        // Fetch updated product
        const updated = await Product.findById(product._id).lean();
        console.log('📦 Updated Product:');
        console.log('   Name:', updated.name);
        console.log('   Category:', updated.category);
        console.log('   Status:', updated.status);
        console.log('   Approval Status:', updated.approvalStatus);
        console.log('   Is Amazon\'s Choice:', updated.isAmazonsChoice);
        console.log('');
        console.log('✅ Product should now appear in Amazon\'s Choice under "Lighting" category!');
      } else {
        console.log('\n✅ Product is already properly configured!');
        console.log('   It should be visible in Amazon\'s Choice under "Lighting" category.');
      }
      
    } else {
      console.log('❌ Product not found with name containing "Scentsy Mini Wax Warmer"\n');
      
      // Search for similar products
      console.log('🔍 Searching for similar products...');
      const similar = await Product.find({
        $or: [
          { name: /Scentsy/i },
          { name: /Wax Warmer/i },
          { name: /15W/i },
          { name: /E14/i }
        ]
      }).select('name category approvalStatus isAmazonsChoice').limit(10).lean();
      
      if (similar.length > 0) {
        console.log(`\nFound ${similar.length} similar products:`);
        similar.forEach((p, i) => {
          console.log(`\n${i + 1}. ${p.name}`);
          console.log(`   Category: ${p.category}`);
          console.log(`   Approved: ${p.approvalStatus}`);
          console.log(`   Amazon's Choice: ${p.isAmazonsChoice}`);
          console.log(`   ID: ${p._id}`);
        });
      } else {
        console.log('No similar products found');
      }
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
