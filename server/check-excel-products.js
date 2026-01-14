import mongoose from 'mongoose';
import ExcelProduct from './models/ExcelProduct.js';
import Product from './models/Product.js';

mongoose.connect('mongodb://localhost:27017/amazon-choice')
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    // Check Excel products
    const excelCount = await ExcelProduct.countDocuments();
    console.log(`📊 Excel Products: ${excelCount}`);
    
    if (excelCount > 0) {
      console.log('\n🔍 Searching for Scentsy/Wax Warmer in Excel products...');
      const excelProducts = await ExcelProduct.find({
        $or: [
          { name: /Scentsy/i },
          { name: /Wax Warmer/i },
          { name: /15W/i }
        ]
      }).select('name category status isConverted mainProductId').limit(10).lean();
      
      if (excelProducts.length > 0) {
        console.log(`\nFound ${excelProducts.length} matching Excel products:\n`);
        excelProducts.forEach((p, i) => {
          console.log(`${i + 1}. ${p.name}`);
          console.log(`   Category: ${p.category || 'N/A'}`);
          console.log(`   Status: ${p.status || 'N/A'}`);
          console.log(`   Converted: ${p.isConverted || false}`);
          console.log(`   Main Product ID: ${p.mainProductId || 'N/A'}`);
          console.log(`   Excel Product ID: ${p._id}\n`);
        });
      } else {
        console.log('No matching Excel products found');
      }
      
      // Show recent Excel products
      console.log('\n📋 Recent Excel products:');
      const recent = await ExcelProduct.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name category status isConverted')
        .lean();
      
      recent.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name} (${p.category || 'N/A'}) - Status: ${p.status || 'N/A'}`);
      });
    }
    
    // Check main products
    const productCount = await Product.countDocuments();
    console.log(`\n\n📊 Main Products: ${productCount}`);
    
    if (productCount > 0) {
      const recent = await Product.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name category approvalStatus isAmazonsChoice')
        .lean();
      
      console.log('\n📋 Recent main products:');
      recent.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name} (${p.category || 'N/A'})`);
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
