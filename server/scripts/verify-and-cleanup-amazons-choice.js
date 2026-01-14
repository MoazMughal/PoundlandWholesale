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

async function verifyAndCleanupAmazonsChoice() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all Amazon's Choice products
    const amazonsChoiceProducts = await Product.find({
      isAmazonsChoice: true
    });

    console.log(`📊 Total Amazon's Choice products: ${amazonsChoiceProducts.length}\n`);

    // Get all images from Cloudinary products folder
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

    // Create a Set of ASINs that have images in Cloudinary
    const cloudinaryASINs = new Set(
      allCloudinaryImages.map(img => {
        const publicId = img.public_id;
        // Extract ASIN from public_id (format: products/ASIN)
        const parts = publicId.split('/');
        return parts[parts.length - 1];
      })
    );

    console.log(`📋 Cloudinary ASINs: ${cloudinaryASINs.size}\n`);

    // Categorize products
    const productsWithImages = [];
    const productsWithoutASIN = [];
    const productsWithASINButNoImage = [];
    const productsToDelete = [];

    for (const product of amazonsChoiceProducts) {
      if (!product.asin || product.asin.trim() === '') {
        productsWithoutASIN.push(product);
        productsToDelete.push(product);
      } else if (!cloudinaryASINs.has(product.asin)) {
        productsWithASINButNoImage.push(product);
        productsToDelete.push(product);
      } else {
        productsWithImages.push(product);
      }
    }

    console.log('📊 Analysis Results:');
    console.log(`  ✅ Products with ASIN and Cloudinary images: ${productsWithImages.length}`);
    console.log(`  ❌ Products without ASIN: ${productsWithoutASIN.length}`);
    console.log(`  ❌ Products with ASIN but no Cloudinary image: ${productsWithASINButNoImage.length}`);
    console.log(`  🗑️ Total products to delete: ${productsToDelete.length}\n`);

    // Show samples of products to delete
    if (productsWithoutASIN.length > 0) {
      console.log('📋 Sample products without ASIN (will be deleted):');
      productsWithoutASIN.slice(0, 5).forEach(p => {
        console.log(`  - ${p.name} (ID: ${p._id})`);
      });
      if (productsWithoutASIN.length > 5) {
        console.log(`  ... and ${productsWithoutASIN.length - 5} more\n`);
      }
    }

    if (productsWithASINButNoImage.length > 0) {
      console.log('📋 Sample products with ASIN but no Cloudinary image (will be deleted):');
      productsWithASINButNoImage.slice(0, 5).forEach(p => {
        console.log(`  - ${p.name} (ASIN: ${p.asin}, ID: ${p._id})`);
      });
      if (productsWithASINButNoImage.length > 5) {
        console.log(`  ... and ${productsWithASINButNoImage.length - 5} more\n`);
      }
    }

    // Delete products without images
    if (productsToDelete.length > 0) {
      console.log(`\n🗑️ Deleting ${productsToDelete.length} products without Cloudinary images...`);
      
      const deleteResult = await Product.deleteMany({
        _id: { $in: productsToDelete.map(p => p._id) }
      });

      console.log(`✅ Deleted ${deleteResult.deletedCount} products\n`);
    }

    // Verify remaining products
    const remainingProducts = await Product.countDocuments({
      isAmazonsChoice: true
    });

    console.log(`\n📊 Final Results:`);
    console.log(`  ✅ Remaining Amazon's Choice products: ${remainingProducts}`);
    console.log(`  ☁️ All remaining products have Cloudinary images\n`);

    // Show category breakdown
    console.log('📂 Category breakdown of remaining products:');
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
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyAndCleanupAmazonsChoice();
