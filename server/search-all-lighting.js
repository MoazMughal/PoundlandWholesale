import mongoose from 'mongoose';
import Product from './models/Product.js';

const MONGODB_URI = 'mongodb+srv://Admin:iW0UgtS1d5Fnf1gt@cluster0.v6qyt5k.mongodb.net/amazon-gymkhana?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas\n');
    
    // Search for all products with "light" in category or name
    console.log('🔍 Searching for Scentsy/Wax Warmer/Lighting products...\n');
    
    const products = await Product.find({
      $or: [
        { name: /Scentsy/i },
        { name: /Wax Warmer/i },
        { name: /15W/i },
        { name: /E14/i },
        { category: /light/i }
      ]
    }).select('name category approvalStatus isAmazonsChoice status').limit(20).lean();
    
    if (products.length > 0) {
      console.log(`Found ${products.length} matching products:\n`);
      products.forEach((p, i) => {
        const visible = p.approvalStatus === 'approved' && p.isAmazonsChoice;
        const status = visible ? '✅ VISIBLE' : '❌ NOT VISIBLE';
        console.log(`${i + 1}. ${status} - ${p.name}`);
        console.log(`   Category: ${p.category || 'N/A'}`);
        console.log(`   Status: ${p.status || 'N/A'}`);
        console.log(`   Approval: ${p.approvalStatus || 'N/A'}`);
        console.log(`   Amazon's Choice: ${p.isAmazonsChoice || false}`);
        console.log(`   ID: ${p._id}`);
        console.log('');
      });
    } else {
      console.log('No matching products found');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
