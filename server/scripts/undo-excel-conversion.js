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

const undoExcelConversion = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🔄 Starting undo process for Excel conversions...');
    
    // Find all products that were converted from Excel
    const convertedProducts = await Product.find({
      'excelSource.excelProductId': { $exists: true }
    });
    
    console.log(`Found ${convertedProducts.length} products converted from Excel`);
    
    // Show sample structure for debugging
    if (convertedProducts.length > 0) {
      console.log('Sample excelSource structure:', JSON.stringify(convertedProducts[0].excelSource, null, 2));
    }
    
    if (convertedProducts.length === 0) {
      console.log('✅ No converted products found to undo');
      return;
    }
    
    let deletedCount = 0;
    let resetCount = 0;
    let errorCount = 0;
    
    for (const product of convertedProducts) {
      try {
        // Get the Excel product ID - handle different possible structures
        let excelProductId = null;
        
        if (product.excelSource && product.excelSource.excelProductId) {
          excelProductId = product.excelSource.excelProductId;
        } else if (product.excelSource) {
          // If excelSource is just the ID directly
          excelProductId = product.excelSource;
        }
        
        if (!excelProductId) {
          console.log(`⚠️ No Excel product ID found for: ${product.name}`);
          continue;
        }
        
        // Delete the main product
        await Product.deleteOne({ _id: product._id });
        deletedCount++;
        
        // Reset the Excel product back to unconverted state
        await ExcelProduct.updateOne(
          { _id: excelProductId },
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
        resetCount++;
        
        if (deletedCount % 25 === 0) {
          console.log(`🔄 Processed ${deletedCount}/${convertedProducts.length} products...`);
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing product ${product.name}:`, error.message);
      }
    }
    
    console.log('\n🎉 Undo process completed:');
    console.log(`🗑️ Deleted main products: ${deletedCount}`);
    console.log(`🔄 Reset Excel products: ${resetCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    // Final verification
    console.log('\n📊 Final verification:');
    const remainingConvertedProducts = await Product.countDocuments({
      'excelSource.excelProductId': { $exists: true }
    });
    const convertedExcelProducts = await ExcelProduct.countDocuments({ isConverted: true });
    const pendingExcelProducts = await ExcelProduct.countDocuments({ status: 'pending' });
    
    console.log(`Remaining converted products: ${remainingConvertedProducts}`);
    console.log(`Excel products marked as converted: ${convertedExcelProducts}`);
    console.log(`Excel products back to pending: ${pendingExcelProducts}`);
    
    if (remainingConvertedProducts === 0) {
      console.log('✅ All Excel conversions have been successfully undone');
    } else {
      console.log(`⚠️ ${remainingConvertedProducts} converted products still remain`);
    }
    
  } catch (error) {
    console.error('❌ Error during undo process:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

undoExcelConversion();