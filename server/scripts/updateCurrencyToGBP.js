import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

async function updateAllProductsToGBP() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🔄 Updating all products to use GBP currency...');
    
    const result = await Product.updateMany(
      {}, // Update all products
      { 
        $set: { 
          currency: 'GBP' 
        } 
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} products to use GBP currency`);
    
    // Verify the update
    const gbpCount = await Product.countDocuments({ currency: 'GBP' });
    const totalCount = await Product.countDocuments({});
    
    console.log(`📊 Verification: ${gbpCount}/${totalCount} products now use GBP currency`);
    
    if (gbpCount === totalCount) {
      console.log('🎉 All products successfully updated to GBP!');
    } else {
      console.log('⚠️ Some products may not have been updated. Please check manually.');
    }

  } catch (error) {
    console.error('❌ Error updating products:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

updateAllProductsToGBP();