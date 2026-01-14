import mongoose from 'mongoose';
import Product from './models/Product.js';

const MONGODB_URI = 'mongodb+srv://Admin:iW0UgtS1d5Fnf1gt@cluster0.v6qyt5k.mongodb.net/amazon-gymkhana?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas\n');
    
    // Find all products with "Lighting" category
    const lightingProducts = await Product.find({
      category: 'Lighting'
    }).select('name category').lean();
    
    console.log(`📊 Found ${lightingProducts.length} products with "Lighting" category\n`);
    
    if (lightingProducts.length > 0) {
      console.log('🔄 Updating category from "Lighting" to "Lightning"...\n');
      
      // Update all products
      const result = await Product.updateMany(
        { category: 'Lighting' },
        { $set: { category: 'Lightning' } }
      );
      
      console.log(`✅ Updated ${result.modifiedCount} products!\n`);
      
      // Verify the update
      const updated = await Product.find({
        category: 'Lightning'
      }).select('name category approvalStatus isAmazonsChoice').limit(10).lean();
      
      console.log('📋 Sample of updated products:');
      updated.forEach((p, i) => {
        const visible = p.approvalStatus === 'approved' && p.isAmazonsChoice;
        const status = visible ? '✅ VISIBLE' : '❌ NOT VISIBLE';
        console.log(`${i + 1}. ${status} - ${p.name}`);
        console.log(`   Category: ${p.category}`);
        console.log(`   Approved: ${p.approvalStatus || 'N/A'}`);
        console.log(`   Amazon's Choice: ${p.isAmazonsChoice || false}\n`);
      });
      
      console.log('✅ All "Lighting" products are now in "Lightning" category!');
      console.log('   They will now appear under the "Lightning" header in Amazon\'s Choice page.');
    } else {
      console.log('No products found with "Lighting" category');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
