// Script to migrate existing products from single-seller format to multi-seller format
import mongoose from 'mongoose';
import Product from './models/Product.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const migrateExistingSellers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find products that have seller/sellerInfo but empty or missing sellers array
    const productsToMigrate = await Product.find({
      $and: [
        { seller: { $exists: true, $ne: null } }, // Has a seller
        { 
          $or: [
            { sellers: { $exists: false } }, // No sellers array
            { sellers: { $size: 0 } } // Empty sellers array
          ]
        }
      ]
    });

    console.log(`🔍 Found ${productsToMigrate.length} products to migrate`);

    let migratedCount = 0;

    for (const product of productsToMigrate) {
      console.log(`\n🔄 Migrating product: ${product.name.substring(0, 80)}...`);
      console.log(`   - Current seller: ${product.seller}`);
      console.log(`   - Has sellerInfo: ${!!product.sellerInfo}`);
      console.log(`   - Current sellers array length: ${product.sellers?.length || 0}`);

      // Initialize sellers array if it doesn't exist
      if (!product.sellers) {
        product.sellers = [];
      }

      // Create seller entry from existing seller/sellerInfo
      const sellerEntry = {
        sellerId: product.seller,
        username: product.sellerInfo?.username || 'Unknown',
        email: product.sellerInfo?.email || '',
        whatsappNo: product.sellerInfo?.whatsappNo || '',
        city: product.sellerInfo?.city || '',
        country: product.sellerInfo?.country || '',
        verificationStatus: product.sellerInfo?.verificationStatus || 'unknown',
        sellerPrice: product.sellerInfo?.sellerPrice || null,
        listedAt: product.createdAt || new Date(),
        transactionId: `MIGRATED_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        paymentMethod: 'Legacy Migration',
        notes: 'Migrated from old single-seller format'
      };

      // Add to sellers array
      product.sellers.push(sellerEntry);

      // Save the product
      await product.save();

      console.log(`   ✅ Migrated successfully`);
      console.log(`   - New sellers array length: ${product.sellers.length}`);
      console.log(`   - Migrated seller: ${sellerEntry.username}`);

      migratedCount++;
    }

    console.log(`\n✅ Migration completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Products found: ${productsToMigrate.length}`);
    console.log(`   - Products migrated: ${migratedCount}`);

    // Verify the specific Travel Folding Hair Brush product
    console.log(`\n🔍 Verifying Travel Folding Hair Brush product...`);
    const travelBrushProduct = await Product.findOne({ 
      name: { $regex: 'Travel.*Hair.*Brush', $options: 'i' }
    });

    if (travelBrushProduct) {
      console.log(`✅ Found Travel Folding Hair Brush product:`);
      console.log(`   - ID: ${travelBrushProduct._id}`);
      console.log(`   - Seller: ${travelBrushProduct.seller}`);
      console.log(`   - SellerInfo username: ${travelBrushProduct.sellerInfo?.username}`);
      console.log(`   - Sellers array length: ${travelBrushProduct.sellers?.length || 0}`);
      if (travelBrushProduct.sellers && travelBrushProduct.sellers.length > 0) {
        travelBrushProduct.sellers.forEach((seller, index) => {
          console.log(`   - Seller ${index + 1}: ${seller.username} (${seller.sellerId})`);
        });
      }
    } else {
      console.log(`❌ Travel Folding Hair Brush product not found`);
    }

    mongoose.disconnect();
    console.log('\n✅ Migration script completed');

  } catch (error) {
    console.error('❌ Error during migration:', error);
    mongoose.disconnect();
  }
};

migrateExistingSellers();