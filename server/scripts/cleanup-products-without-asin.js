import mongoose from 'mongoose';
import Product from '../models/Product.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function cleanupProductsWithoutASIN() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all Amazon's Choice products without ASIN
    const productsWithoutASIN = await Product.find({
      isAmazonsChoice: true,
      $or: [
        { asin: { $exists: false } },
        { asin: null },
        { asin: '' }
      ]
    });

    console.log(`\n📊 Found ${productsWithoutASIN.length} Amazon's Choice products without ASIN`);

    if (productsWithoutASIN.length === 0) {
      console.log('✅ No products to delete');
      process.exit(0);
    }

    // Show sample products
    console.log('\n📋 Sample products to be deleted:');
    productsWithoutASIN.slice(0, 5).forEach(product => {
      console.log(`  - ${product.name} (ID: ${product._id})`);
    });

    if (productsWithoutASIN.length > 5) {
      console.log(`  ... and ${productsWithoutASIN.length - 5} more`);
    }

    // Delete products without ASIN
    const deleteResult = await Product.deleteMany({
      isAmazonsChoice: true,
      $or: [
        { asin: { $exists: false } },
        { asin: null },
        { asin: '' }
      ]
    });

    console.log(`\n✅ Deleted ${deleteResult.deletedCount} products without ASIN`);

    // Show remaining Amazon's Choice products count
    const remainingCount = await Product.countDocuments({
      isAmazonsChoice: true,
      asin: { $exists: true, $ne: null, $ne: '' }
    });

    console.log(`\n📊 Remaining Amazon's Choice products with ASIN: ${remainingCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupProductsWithoutASIN();
