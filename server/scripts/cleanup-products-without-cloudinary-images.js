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

async function cleanupProductsWithoutCloudinaryImages() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Fetch ALL images from Cloudinary
    console.log('☁️ Fetching ALL images from Cloudinary...');
    let allCloudinaryImages = [];
    let nextCursor = null;
    let pageCount = 0;
    
    do {
      pageCount++;
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'products',
        max_results: 500,
        next_cursor: nextCursor
      });
      
      allCloudinaryImages = allCloudinaryImages.concat(result.resources);
      nextCursor = result.next_cursor;
      console.log(`  Page ${pageCount}: ${result.resources.length} images (Total: ${allCloudinaryImages.length})`);
    } while (nextCursor);

    console.log(`✅ Found ${allCloudinaryImages.length} total images in Cloudinary\n`);

    // Create a Set of ASINs that have images in Cloudinary
    const cloudinaryASINs = new Set(
      allCloudinaryImages.map(img => {
        const publicId = img.public_id;
        const asin = publicId.split('/').pop();
        return asin;
      })
    );

    console.log(`📋 Cloudinary ASINs: ${cloudinaryASINs.size}\n`);

    // Step 2: Get all Amazon's Choice products
    const amazonsChoiceProducts = await Product.find({
      isAmazonsChoice: true
    });

    console.log(`📊 Total Amazon's Choice products: ${amazonsChoiceProducts.length}\n`);

    // Step 3: Categorize products
    const productsWithCloudinaryImages = [];
    const productsWithoutASIN = [];
    const productsWithASINButNoCloudinaryImage = [];
    const productsToDelete = [];

    for (const product of amazonsChoiceProducts) {
      // Check if product has ASIN
      if (!product.asin || product.asin.trim() === '') {
        productsWithoutASIN.push(product);
        productsToDelete.push(product);
        continue;
      }

      // Check if Cloudinary has image for this ASIN
      if (!cloudinaryASINs.has(product.asin)) {
        productsWithASINButNoCloudinaryImage.push(product);
        productsToDelete.push(product);
        continue;
      }

      // Product has ASIN and Cloudinary image
      productsWithCloudinaryImages.push(product);
    }

    console.log('📊 Analysis:');
    console.log(`  ✅ Products with Cloudinary images: ${productsWithCloudinaryImages.length}`);
    console.log(`  ❌ Products without ASIN: ${productsWithoutASIN.length}`);
    console.log(`  ❌ Products with ASIN but no Cloudinary image: ${productsWithASINButNoCloudinaryImage.length}`);
    console.log(`  🗑️ Total to delete: ${productsToDelete.length}\n`);

    // Show samples
    if (productsWithoutASIN.length > 0) {
      console.log('📋 Sample products without ASIN (will be deleted):');
      productsWithoutASIN.slice(0, 5).forEach(p => {
        console.log(`  - ${p.name} (ID: ${p._id})`);
      });
      if (productsWithoutASIN.length > 5) {
        console.log(`  ... and ${productsWithoutASIN.length - 5} more\n`);
      }
    }

    if (productsWithASINButNoCloudinaryImage.length > 0) {
      console.log('📋 Sample products with ASIN but no Cloudinary image (will be deleted):');
      productsWithASINButNoCloudinaryImage.slice(0, 10).forEach(p => {
        console.log(`  - ${p.name} (ASIN: ${p.asin})`);
      });
      if (productsWithASINButNoCloudinaryImage.length > 10) {
        console.log(`  ... and ${productsWithASINButNoCloudinaryImage.length - 10} more\n`);
      }
    }

    // Step 4: Delete products without Cloudinary images
    if (productsToDelete.length > 0) {
      console.log(`\n🗑️ Deleting ${productsToDelete.length} products without Cloudinary images...`);
      
      const deleteResult = await Product.deleteMany({
        _id: { $in: productsToDelete.map(p => p._id) }
      });

      console.log(`✅ Deleted ${deleteResult.deletedCount} products\n`);
    } else {
      console.log('✅ No products to delete - all have Cloudinary images!\n');
    }

    // Step 5: Verify remaining products
    const remainingProducts = await Product.countDocuments({
      isAmazonsChoice: true,
      status: 'active',
      approvalStatus: 'approved',
      asin: { $exists: true, $ne: null, $ne: '' }
    });

    console.log('🎯 Final Results:');
    console.log(`  ✅ Remaining Amazon's Choice products: ${remainingProducts}`);
    console.log(`  ☁️ All have Cloudinary images available\n`);

    // Step 6: Show category breakdown
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

    console.log('\n✅ Cleanup complete!');
    console.log('🎉 Only products with Cloudinary images remain in Amazon\'s Choice!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupProductsWithoutCloudinaryImages();
