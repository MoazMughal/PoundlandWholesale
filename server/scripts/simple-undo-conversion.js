import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import Product from '../models/Product.js';
import ExcelProduct from '../models/ExcelProduct.js';

const simpleUndoConversion = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🔄 Simple undo: Deleting recently created products and resetting Excel products...');
    
    // Get current time and calculate 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    // Find products created in the last hour (these are the ones I just converted)
    const recentProducts = await Product.find({
      createdAt: { $gte: oneHourAgo },
      isAmazonsChoice: true,
      isAdminProduct: true
    });
    
    console.log(`Found ${recentProducts.length} recently created products to delete`);
    
    if (recentProducts.length === 0) {
      console.log('✅ No recent products found to delete');
      return;
    }
    
    // Delete the recent products
    const deleteResult = await Product.deleteMany({
      createdAt: { $gte: oneHourAgo },
      isAmazonsChoice: true,
      isAdminProduct: true
    });
    
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} recent products`);
    
    // Reset all Excel products that were marked as converted back to pending
    const resetResult = await ExcelProduct.updateMany(
      { isConverted: true },
      {
        $set: {
          isConverted: false,
          status: 'pending'
        },
        $unset: {
          convertedAt: 1,
          mainProductId: 1
        }
      }
    );
    
    console.log(`🔄 Reset ${resetResult.modifiedCount} Excel products back to pending`);
    
    // Final verification
    console.log('\n📊 Final verification:');
    const remainingRecentProducts = await Product.countDocuments({
      createdAt: { $gte: oneHourAgo },
      isAmazonsChoice: true,
      isAdminProduct: true
    });
    const convertedExcelProducts = await ExcelProduct.countDocuments({ isConverted: true });
    const pendingExcelProducts = await ExcelProduct.countDocuments({ status: 'pending' });
    
    console.log(`Remaining recent products: ${remainingRecentProducts}`);
    console.log(`Excel products still marked as converted: ${convertedExcelProducts}`);
    console.log(`Excel products back to pending: ${pendingExcelProducts}`);
    
    if (remainingRecentProducts === 0) {
      console.log('✅ All recent conversions have been successfully undone');
    } else {
      console.log(`⚠️ ${remainingRecentProducts} recent products still remain`);
    }
    
  } catch (error) {
    console.error('❌ Error during undo process:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

simpleUndoConversion();