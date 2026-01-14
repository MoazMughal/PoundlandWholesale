const mongoose = require('mongoose');
require('dotenv').config();

// Import the Product model
const Product = require('./server/models/Product');

const checkPartyAccessories = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Search for products with "Party-Accessories" category (case-insensitive)
    console.log('\n🔍 Searching for Party-Accessories products...');
    
    const partyProducts = await Product.find({
      category: { $regex: /party.*accessories/i }
    }).select('name category status price createdAt');

    console.log(`\n📊 Found ${partyProducts.length} products with Party-Accessories category:`);
    
    if (partyProducts.length > 0) {
      console.log('\n📦 Products found:');
      partyProducts.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   Category: ${product.category}`);
        console.log(`   Status: ${product.status}`);
        console.log(`   Price: £${product.price}`);
        console.log(`   Created: ${product.createdAt}`);
        console.log('   ---');
      });

      // Count by status
      const activeCount = partyProducts.filter(p => p.status === 'active').length;
      const inactiveCount = partyProducts.filter(p => p.status !== 'active').length;
      
      console.log(`\n📈 Status Summary:`);
      console.log(`   Active: ${activeCount}`);
      console.log(`   Inactive/Other: ${inactiveCount}`);
    } else {
      console.log('\n❌ No products found with Party-Accessories category');
      
      // Let's also check for similar categories
      console.log('\n🔍 Checking for similar categories...');
      const similarCategories = await Product.distinct('category', {
        category: { $regex: /party/i }
      });
      
      if (similarCategories.length > 0) {
        console.log('📂 Found similar categories:');
        similarCategories.forEach(cat => console.log(`   - ${cat}`));
      } else {
        console.log('❌ No categories containing "party" found');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

checkPartyAccessories();