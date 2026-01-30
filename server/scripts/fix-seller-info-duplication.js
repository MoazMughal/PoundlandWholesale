import mongoose from 'mongoose';
import Product from '../models/Product.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/amazon-gymkhana';

async function fixSellerInfoDuplication() {
  try {
    console.log('🔧 Starting seller information duplication fix...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all products that have both sellers array and sellerInfo
    const productsWithBoth = await Product.find({
      $and: [
        { sellers: { $exists: true, $ne: [] } },
        { sellerInfo: { $exists: true, $ne: null } }
      ]
    }).lean();

    console.log(`📊 Found ${productsWithBoth.length} products with both sellers array and sellerInfo`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const product of productsWithBoth) {
      console.log(`\n🔍 Processing product: ${product.name} (${product._id})`);
      
      // Check if sellerInfo matches any seller in the sellers array
      const sellerInfoMatchesSellersArray = product.sellers.some(seller => 
        seller.sellerId?.toString() === product.sellerInfo?._id?.toString() ||
        seller.username === product.sellerInfo?.username
      );

      if (sellerInfoMatchesSellersArray) {
        console.log('ℹ️ sellerInfo matches a seller in sellers array - this is expected for backward compatibility');
        skippedCount++;
        continue;
      }

      // Check if sellerInfo represents a different seller not in the array
      const sellerInfoIsUnique = !product.sellers.some(seller => 
        seller.username === product.sellerInfo?.username &&
        seller.whatsappNo === product.sellerInfo?.whatsappNo
      );

      if (sellerInfoIsUnique && product.sellerInfo?.username) {
        console.log('⚠️ sellerInfo represents a unique seller not in sellers array');
        console.log('   This might indicate a data inconsistency that needs manual review');
        console.log(`   sellerInfo: ${product.sellerInfo.username}`);
        console.log(`   sellers array: ${product.sellers.map(s => s.username).join(', ')}`);
        skippedCount++;
        continue;
      }

      // If we reach here, the sellerInfo might be redundant or inconsistent
      console.log('🔧 Product has consistent seller data - no action needed');
      skippedCount++;
    }

    // Find products with duplicate sellers in the sellers array
    const productsWithDuplicates = await Product.find({
      sellers: { $exists: true, $ne: [] }
    }).lean();

    console.log(`\n🔍 Checking ${productsWithDuplicates.length} products for duplicate sellers...`);

    let duplicatesFixed = 0;

    for (const product of productsWithDuplicates) {
      const sellerIds = product.sellers.map(s => s.sellerId?.toString()).filter(Boolean);
      const uniqueSellerIds = [...new Set(sellerIds)];
      
      if (sellerIds.length !== uniqueSellerIds.length) {
        console.log(`\n🚨 Found duplicates in product: ${product.name} (${product._id})`);
        console.log(`   Original sellers: ${sellerIds.length}, Unique: ${uniqueSellerIds.length}`);
        
        // Remove duplicates based on sellerId
        const uniqueSellers = product.sellers.reduce((acc, seller) => {
          const sellerId = seller.sellerId?.toString();
          if (sellerId && !acc.find(s => s.sellerId?.toString() === sellerId)) {
            acc.push(seller);
          }
          return acc;
        }, []);

        // Update the product
        await Product.findByIdAndUpdate(product._id, {
          sellers: uniqueSellers
        });

        console.log(`✅ Fixed duplicates: ${product.sellers.length} → ${uniqueSellers.length} sellers`);
        duplicatesFixed++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Products with both sellers array and sellerInfo: ${productsWithBoth.length}`);
    console.log(`   Products skipped (consistent data): ${skippedCount}`);
    console.log(`   Products with duplicate sellers fixed: ${duplicatesFixed}`);
    console.log(`   Total products processed: ${productsWithBoth.length + productsWithDuplicates.length}`);

    console.log('\n✅ Seller information duplication fix completed');

  } catch (error) {
    console.error('❌ Error fixing seller information duplication:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixSellerInfoDuplication();