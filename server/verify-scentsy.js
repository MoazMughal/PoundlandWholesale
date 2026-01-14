import mongoose from 'mongoose';
import Product from './models/Product.js';

const MONGODB_URI = 'mongodb+srv://Admin:iW0UgtS1d5Fnf1gt@cluster0.v6qyt5k.mongodb.net/amazon-gymkhana?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas\n');
    
    // Find the Scentsy product
    const product = await Product.findOne({
      name: /15W E14 Scentsy Mini Wax Warmer/i
    }).lean();
    
    if (product) {
      console.log('📦 Scentsy Product Status:\n');
      console.log('   Name:', product.name);
      console.log('   Category:', product.category);
      console.log('   Status:', product.status);
      console.log('   Approval Status:', product.approvalStatus);
      console.log('   Is Amazon\'s Choice:', product.isAmazonsChoice);
      console.log('');
      
      if (product.category === 'Lightning' && 
          product.approvalStatus === 'approved' && 
          product.isAmazonsChoice === true) {
        console.log('✅ SUCCESS! Product will show in Amazon\'s Choice under "Lightning" category!');
      } else {
        console.log('❌ Issue found:');
        if (product.category !== 'Lightning') {
          console.log(`   - Category is "${product.category}" (should be "Lightning")`);
        }
        if (product.approvalStatus !== 'approved') {
          console.log(`   - Approval Status is "${product.approvalStatus}" (should be "approved")`);
        }
        if (!product.isAmazonsChoice) {
          console.log('   - isAmazonsChoice is false (should be true)');
        }
      }
    } else {
      console.log('❌ Product not found');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
