const mongoose = require('mongoose');
require('dotenv').config();

async function fixHomeGardenProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Update all Home & Garden products to be Amazon's Choice
    const result = await mongoose.connection.db.collection('products').updateMany(
      { 
        category: 'Home & Garden',
        $or: [
          { status: 'active' },
          { status: { $exists: false } }
        ]
      },
      { 
        $set: { 
          isAmazonsChoice: true,
          isBestSeller: true
        } 
      }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} Home & Garden products to Amazon's Choice`);
    
    // Check the results
    const homeGardenAmazonsChoice = await mongoose.connection.db.collection('products').countDocuments({
      category: 'Home & Garden',
      isAmazonsChoice: true
    });
    
    console.log(`📊 Total Home & Garden Amazon's Choice products: ${homeGardenAmazonsChoice}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixHomeGardenProducts();