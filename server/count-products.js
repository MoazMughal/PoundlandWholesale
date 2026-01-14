import mongoose from 'mongoose';
import Product from './models/Product.js';

const MONGODB_URI = 'mongodb+srv://Admin:iW0UgtS1d5Fnf1gt@cluster0.v6qyt5k.mongodb.net/amazon-gymkhana?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas (amazon-gymkhana)\n');
    
    const total = await Product.countDocuments();
    console.log(`📊 Total products in database: ${total}\n`);
    
    if (total > 0) {
      // Show breakdown
      const approved = await Product.countDocuments({ approvalStatus: 'approved' });
      const pending = await Product.countDocuments({ approvalStatus: 'pending' });
      const amazonsChoice = await Product.countDocuments({ isAmazonsChoice: true });
      
      console.log('Breakdown:');
      console.log(`  ✅ Approved: ${approved}`);
      console.log(`  🟡 Pending: ${pending}`);
      console.log(`  ⭐ Amazon's Choice: ${amazonsChoice}\n`);
      
      // Show some recent products
      console.log('Recent products:');
      const recent = await Product.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('name category approvalStatus isAmazonsChoice')
        .lean();
      
      recent.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   Category: ${p.category || 'N/A'}`);
        console.log(`   Approved: ${p.approvalStatus || 'N/A'}`);
        console.log(`   Amazon's Choice: ${p.isAmazonsChoice || false}\n`);
      });
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
