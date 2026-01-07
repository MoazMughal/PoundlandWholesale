import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Define Product schema inline
    const productSchema = new mongoose.Schema({
      name: String,
      category: String,
      status: String,
      isAmazonsChoice: Boolean
    });
    
    const Product = mongoose.model('Product', productSchema);
    
    // Check Home & Kitchen products and their Amazon's Choice status
    const homeKitchenProducts = await Product.find({
      category: 'Home & Kitchen',
      status: 'active'
    }).select('name category status isAmazonsChoice');
    
    console.log('\n🏠 Home & Kitchen products:');
    homeKitchenProducts.forEach(p => {
      console.log(`  - ${p.name}`);
      console.log(`    Category: ${p.category}`);
      console.log(`    Status: ${p.status}`);
      console.log(`    Amazon's Choice: ${p.isAmazonsChoice ? '✅ YES' : '❌ NO'}`);
      console.log('');
    });
    
    // Check other categories with similar issues
    const problematicCategories = ['DIY & Tools', 'Toys & Games'];
    
    for (const cat of problematicCategories) {
      const products = await Product.find({
        category: cat,
        status: 'active'
      }).select('name category status isAmazonsChoice');
      
      console.log(`\n📂 ${cat} products:`);
      products.forEach(p => {
        console.log(`  - ${p.name}`);
        console.log(`    Amazon's Choice: ${p.isAmazonsChoice ? '✅ YES' : '❌ NO'}`);
      });
      
      const amazonChoiceCount = products.filter(p => p.isAmazonsChoice).length;
      console.log(`  📊 Total: ${products.length}, Amazon's Choice: ${amazonChoiceCount}`);
    }
    
    // Check how many products are marked as Amazon's Choice overall
    const totalProducts = await Product.countDocuments({ status: 'active' });
    const amazonChoiceProducts = await Product.countDocuments({ 
      status: 'active', 
      isAmazonsChoice: true 
    });
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`  Total active products: ${totalProducts}`);
    console.log(`  Amazon's Choice products: ${amazonChoiceProducts}`);
    console.log(`  Percentage: ${((amazonChoiceProducts / totalProducts) * 100).toFixed(1)}%`);
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  });