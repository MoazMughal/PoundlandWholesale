import mongoose from 'mongoose';
import Product from '../models/Product.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/genericwholesale');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const checkDatabase = async () => {
  try {
    // Check total products
    const totalProducts = await Product.countDocuments();
    console.log(`📊 Total products in database: ${totalProducts}`);
    
    if (totalProducts === 0) {
      console.log('❌ No products found in database');
      return;
    }
    
    // Check products by status
    const productsByStatus = await Product.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('\n📊 Products by status:');
    productsByStatus.forEach(status => {
      console.log(`  ${status._id || 'undefined'}: ${status.count}`);
    });
    
    // Check products by category
    const productsByCategory = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    console.log('\n📊 Products by category:');
    productsByCategory.slice(0, 20).forEach(cat => {
      console.log(`  ${cat._id || 'undefined'}: ${cat.count}`);
    });
    
    // Check Amazon's Choice products
    const amazonsChoiceCount = await Product.countDocuments({ isAmazonsChoice: true });
    console.log(`\n🏆 Amazon's Choice products: ${amazonsChoiceCount}`);
    
    // Sample some products
    const sampleProducts = await Product.find().limit(5).select('name category status isAmazonsChoice');
    console.log('\n📦 Sample products:');
    sampleProducts.forEach(p => {
      console.log(`  - ${p.name} (${p.category}) - Status: ${p.status}, Amazon's Choice: ${p.isAmazonsChoice}`);
    });
    
    // Check for specific problematic categories
    const problematicCategories = ['DIY', 'Home', 'Kitchen', 'Toys', 'Games', 'tools'];
    
    console.log('\n🔍 Searching for products with problematic category keywords:');
    for (const keyword of problematicCategories) {
      const count = await Product.countDocuments({
        category: { $regex: new RegExp(keyword, 'i') }
      });
      if (count > 0) {
        console.log(`  Products with "${keyword}" in category: ${count}`);
        
        // Show sample products
        const samples = await Product.find({
          category: { $regex: new RegExp(keyword, 'i') }
        }).limit(3).select('name category isAmazonsChoice');
        
        samples.forEach(p => {
          console.log(`    - ${p.name} (${p.category}) - Amazon's Choice: ${p.isAmazonsChoice}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
};

// Run the script
const main = async () => {
  await connectDB();
  await checkDatabase();
  
  console.log('\n✅ Database check completed.');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});