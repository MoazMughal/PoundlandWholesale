import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function fixAmazonsChoiceComplete() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Get all Cloudinary images
    console.log('☁️ Fetching images from Cloudinary...');
    let allCloudinaryImages = [];
    let nextCursor = null;
    
    do {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'products',
        max_results: 500,
        next_cursor: nextCursor
      });
      
      allCloudinaryImages = allCloudinaryImages.concat(result.resources);
      nextCursor = result.next_cursor;
    } while (nextCursor);

    console.log(`✅ Found ${allCloudinaryImages.length} images in Cloudinary\n`);

    // Create a Set of ASINs that have images
    const cloudinaryASINs = new Set(
      allCloudinaryImages.map(img => {
        const publicId = img.public_id;
        const parts = publicId.split('/');
        return parts[parts.length - 1];
      })
    );

    // Step 2: Get all Amazon's Choice products
    const amazonsChoiceProducts = await Product.find({
      isAmazonsChoice: true
    });

    console.log(`📊 Total Amazon's Choice products in database: ${amazonsChoiceProducts.length}\n`);

    // Step 3: Categorize and fix products
    let deletedCount = 0;
    let fixedCount = 0;
    let validCount = 0;

    for (const product of amazonsChoiceProducts) {
      // Delete if no ASIN
      if (!product.asin || product.asin.trim() === '') {
        await Product.deleteOne({ _id: product._id });
        deletedCount++;
        console.log(`🗑️ Deleted (no ASIN): ${product.name}`);
        continue;
      }

      // Delete if ASIN but no Cloudinary image
      if (!cloudinaryASINs.has(product.asin)) {
        await Product.deleteOne({ _id: product._id });
        deletedCount++;
        console.log(`🗑️ Deleted (no image): ${product.name} (ASIN: ${product.asin})`);
        continue;
      }

      // Fix status and approval if needed
      let needsUpdate = false;
      const updates = {};

      if (product.status !== 'active') {
        updates.status = 'active';
        needsUpdate = true;
      }

      if (product.approvalStatus !== 'approved') {
        updates.approvalStatus = 'approved';
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Product.updateOne({ _id: product._id }, { $set: updates });
        fixedCount++;
        console.log(`✅ Fixed: ${product.name} (ASIN: ${product.asin})`);
      } else {
        validCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  🗑️ Deleted: ${deletedCount} products`);
    console.log(`  ✅ Fixed: ${fixedCount} products`);
    console.log(`  ✓ Already valid: ${validCount} products`);

    // Step 4: Verify final state
    const finalCount = await Product.countDocuments({
      isAmazonsChoice: true,
      status: 'active',
      approvalStatus: 'approved',
      asin: { $exists: true, $ne: null, $ne: '' }
    });

    console.log(`\n🎯 Final Amazon's Choice products (active, approved, with ASIN): ${finalCount}\n`);

    // Step 5: Show category breakdown
    console.log('📂 Category breakdown:');
    const categoryBreakdown = await Product.aggregate([
      {
        $match: {
          isAmazonsChoice: true,
          status: 'active',
          approvalStatus: 'approved'
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    categoryBreakdown.forEach(cat => {
      console.log(`  - ${cat._id}: ${cat.count} products`);
    });

    // Step 6: Check specific products (M0011, M0010)
    console.log('\n🔍 Checking specific products (SKU: M0011, M0010):');
    const specificProducts = await Product.find({
      sku: { $in: ['M0011', 'M0010'] }
    });

    if (specificProducts.length > 0) {
      specificProducts.forEach(product => {
        console.log(`\n  Product: ${product.name}`);
        console.log(`    SKU: ${product.sku}`);
        console.log(`    ASIN: ${product.asin || 'N/A'}`);
        console.log(`    Category: ${product.category}`);
        console.log(`    Status: ${product.status}`);
        console.log(`    Approval: ${product.approvalStatus}`);
        console.log(`    Amazon's Choice: ${product.isAmazonsChoice}`);
        console.log(`    Has Cloudinary Image: ${product.asin && cloudinaryASINs.has(product.asin) ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('  ❌ Products not found');
    }

    console.log('\n✅ Complete! All Amazon\'s Choice products now have:');
    console.log('  - Valid ASIN');
    console.log('  - Cloudinary image');
    console.log('  - Active status');
    console.log('  - Approved status\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAmazonsChoiceComplete();
