import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Seller from '../models/Seller.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixSellerDataConsistency() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    // Find products that have seller field but seller is not in sellers array
    const productsWithInconsistentData = await Product.find({
      seller: { $exists: true, $ne: null },
      $or: [
        { sellers: { $exists: false } },
        { sellers: { $size: 0 } }
      ]
    });

    console.log(`🔍 Found ${productsWithInconsistentData.length} products with inconsistent seller data`);

    let fixedCount = 0;

    for (const product of productsWithInconsistentData) {
      try {
        // Get seller information
        const seller = await Seller.findById(product.seller);
        
        if (!seller) {
          console.log(`⚠️ Seller not found for product ${product._id}, skipping`);
          continue;
        }

        // Check if seller is already in sellers array
        const sellerExists = product.sellers?.some(
          s => s.sellerId.toString() === product.seller.toString()
        );

        if (!sellerExists) {
          // Initialize sellers array if it doesn't exist
          if (!product.sellers) {
            product.sellers = [];
          }

          // Add seller to sellers array
          const sellerEntry = {
            sellerId: seller._id,
            username: seller.username,
            email: seller.email,
            whatsappNo: seller.whatsappNo,
            city: seller.city,
            country: seller.country,
            verificationStatus: seller.verificationStatus,
            listedAt: product.createdAt || new Date(),
            transactionId: `MIGRATION_${Date.now()}`,
            paymentMethod: 'Legacy Migration',
            notes: 'Added during data consistency migration'
          };

          product.sellers.push(sellerEntry);

          // Ensure sellerInfo is properly set
          if (!product.sellerInfo) {
            product.sellerInfo = {
              username: seller.username,
              email: seller.email,
              whatsappNo: seller.whatsappNo,
              city: seller.city,
              country: seller.country,
              verificationStatus: seller.verificationStatus,
              _id: seller._id
            };
          }

          await product.save();
          fixedCount++;

          console.log(`✅ Fixed product ${product._id} - ${product.name}`);
        }
      } catch (error) {
        console.error(`❌ Error fixing product ${product._id}:`, error.message);
      }
    }

    console.log(`🎉 Migration completed! Fixed ${fixedCount} products`);

    // Verify the fix
    const remainingInconsistent = await Product.find({
      seller: { $exists: true, $ne: null },
      $or: [
        { sellers: { $exists: false } },
        { sellers: { $size: 0 } }
      ]
    });

    console.log(`📊 Remaining inconsistent products: ${remainingInconsistent.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');
  }
}

// Run the migration
fixSellerDataConsistency();