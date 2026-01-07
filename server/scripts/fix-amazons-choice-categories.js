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

const fixAmazonsChoiceCategories = async () => {
  try {
    console.log('🔍 Checking Amazon\'s Choice status for problematic categories...');
    
    // Categories that are having issues
    const problematicCategories = [
      'DIY & tools',
      'Home & Kitchen', 
      'Toys and Games',
      'diy & tools',
      'home & kitchen',
      'toys and games',
      'DIY & Tools',
      'Home & Kitche', // Note: typo in the original request
      'Toys & Games'
    ];
    
    // First, let's see what categories actually exist in the database
    console.log('\n📊 Checking existing categories in database...');
    const allCategories = await Product.distinct('category');
    console.log('All categories found:', allCategories);
    
    // Find products in problematic categories that are NOT marked as Amazon's Choice
    console.log('\n🔍 Finding products in problematic categories...');
    
    for (const category of problematicCategories) {
      const productsInCategory = await Product.find({
        category: { $regex: new RegExp(category, 'i') }, // Case insensitive search
        status: { $in: ['active', 'approved'] }
      }).select('name category isAmazonsChoice status');
      
      if (productsInCategory.length > 0) {
        console.log(`\n📦 Category: "${category}" (${productsInCategory.length} products)`);
        
        const notAmazonsChoice = productsInCategory.filter(p => !p.isAmazonsChoice);
        const alreadyAmazonsChoice = productsInCategory.filter(p => p.isAmazonsChoice);
        
        console.log(`  ✅ Already Amazon's Choice: ${alreadyAmazonsChoice.length}`);
        console.log(`  ❌ NOT Amazon's Choice: ${notAmazonsChoice.length}`);
        
        if (notAmazonsChoice.length > 0) {
          console.log('  Products that need fixing:');
          notAmazonsChoice.slice(0, 5).forEach(p => {
            console.log(`    - ${p.name} (${p.category})`);
          });
          if (notAmazonsChoice.length > 5) {
            console.log(`    ... and ${notAmazonsChoice.length - 5} more`);
          }
        }
      }
    }
    
    // Now let's fix all products in these categories
    console.log('\n🔧 Fixing Amazon\'s Choice status for problematic categories...');
    
    let totalUpdated = 0;
    
    for (const category of problematicCategories) {
      const result = await Product.updateMany(
        {
          category: { $regex: new RegExp(category, 'i') },
          status: { $in: ['active', 'approved'] },
          isAmazonsChoice: { $ne: true }
        },
        {
          $set: {
            isAmazonsChoice: true,
            isBestSeller: true // Also mark as best seller for extra visibility
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ Updated ${result.modifiedCount} products in category: ${category}`);
        totalUpdated += result.modifiedCount;
      }
    }
    
    console.log(`\n🎉 Total products updated: ${totalUpdated}`);
    
    // Verify the fix
    console.log('\n✅ Verification - Checking Amazon\'s Choice products by category:');
    
    const amazonsChoiceByCategory = await Product.aggregate([
      {
        $match: {
          isAmazonsChoice: true,
          status: { $in: ['active', 'approved'] }
        }
      },
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
    
    amazonsChoiceByCategory.forEach(cat => {
      console.log(`  ${cat._id}: ${cat.count} products`);
    });
    
    // Check specifically for the problematic categories
    console.log('\n🔍 Specific check for problematic categories:');
    for (const category of ['DIY & tools', 'Home & Kitchen', 'Toys and Games']) {
      const count = await Product.countDocuments({
        category: { $regex: new RegExp(category, 'i') },
        isAmazonsChoice: true,
        status: { $in: ['active', 'approved'] }
      });
      console.log(`  ${category}: ${count} Amazon's Choice products`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing Amazon\'s Choice categories:', error);
  }
};

// Run the script
const main = async () => {
  await connectDB();
  await fixAmazonsChoiceCategories();
  
  console.log('\n✅ Script completed. You can now check the Amazon\'s Choice page.');
  process.exit(0);
};

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});