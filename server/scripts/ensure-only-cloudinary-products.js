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

async function ensureOnlyCloudinaryProducts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('  STEP 1: Fetch ALL Cloudinary Images');
    console.log('═══════════════════════════════════════════════════════\n');

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
      console.log(`  📄 Page ${pageCount}: ${result.resources.length} images (Total: ${allCloudinaryImages.length})`);
    } while (nextCursor);

    console.log(`\n✅ Found ${allCloudinaryImages.length} total images in Cloudinary\n`);

    // Create ASIN -> Image URL map
    const asinToImageMap = new Map();
    const cloudinaryASINs = new Set();
    
    allCloudinaryImages.forEach(img => {
      const publicId = img.public_id;
      const asin = publicId.split('/').pop();
      const cloudinaryUrl = `https://res.cloudinary.com/dtuq3tvjx/image/upload/w_300,h_300,c_fill,f_auto,q_auto/products/${asin}`;
      asinToImageMap.set(asin, cloudinaryUrl);
      cloudinaryASINs.add(asin);
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('  STEP 2: Analyze Amazon\'s Choice Products');
    console.log('═══════════════════════════════════════════════════════\n');

    const amazonsChoiceProducts = await Product.find({
      isAmazonsChoice: true
    });

    console.log(`📊 Total Amazon's Choice products: ${amazonsChoiceProducts.length}\n`);

    const productsWithImages = [];
    const productsToDelete = [];
    const productsToUpdate = [];

    for (const product of amazonsChoiceProducts) {
      // No ASIN - delete
      if (!product.asin || product.asin.trim() === '') {
        productsToDelete.push(product);
        continue;
      }

      // ASIN but no Cloudinary image - delete
      if (!cloudinaryASINs.has(product.asin)) {
        productsToDelete.push(product);
        continue;
      }

      // Has ASIN and Cloudinary image
      const cloudinaryUrl = asinToImageMap.get(product.asin);
      const hasCorrectImage = product.images && 
                             product.images.length > 0 && 
                             product.images[0] === cloudinaryUrl;

      if (!hasCorrectImage) {
        productsToUpdate.push({ product, cloudinaryUrl });
      }

      productsWithImages.push(product);
    }

    console.log('📊 Analysis Results:');
    console.log(`  ✅ Products with Cloudinary images: ${productsWithImages.length}`);
    console.log(`  🔄 Products needing image update: ${productsToUpdate.length}`);
    console.log(`  🗑️ Products to delete: ${productsToDelete.length}\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('  STEP 3: Update Products with Cloudinary Images');
    console.log('═══════════════════════════════════════════════════════\n');

    if (productsToUpdate.length > 0) {
      console.log(`🔄 Updating ${productsToUpdate.length} products with Cloudinary images...\n`);
      
      for (const { product, cloudinaryUrl } of productsToUpdate) {
        await Product.updateOne(
          { _id: product._id },
          { 
            $set: { 
              images: [cloudinaryUrl],
              image: cloudinaryUrl
            } 
          }
        );
        console.log(`  ✅ Updated: ${product.name} (ASIN: ${product.asin})`);
      }
      console.log(`\n✅ Updated ${productsToUpdate.length} products\n`);
    } else {
      console.log('✅ All products already have correct Cloudinary images\n');
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('  STEP 4: Delete Products Without Cloudinary Images');
    console.log('═══════════════════════════════════════════════════════\n');

    if (productsToDelete.length > 0) {
      console.log(`🗑️ Deleting ${productsToDelete.length} products without Cloudinary images...\n`);
      
      // Show samples
      console.log('Sample products to delete:');
      productsToDelete.slice(0, 10).forEach(p => {
        console.log(`  - ${p.name} (ASIN: ${p.asin || 'N/A'})`);
      });
      if (productsToDelete.length > 10) {
        console.log(`  ... and ${productsToDelete.length - 10} more\n`);
      }

      const deleteResult = await Product.deleteMany({
        _id: { $in: productsToDelete.map(p => p._id) }
      });

      console.log(`\n✅ Deleted ${deleteResult.deletedCount} products\n`);
    } else {
      console.log('✅ No products to delete - all have Cloudinary images!\n');
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log('  STEP 5: Final Verification');
    console.log('═══════════════════════════════════════════════════════\n');

    const finalCount = await Product.countDocuments({
      isAmazonsChoice: true,
      status: 'active',
      approvalStatus: 'approved',
      asin: { $exists: true, $ne: null, $ne: '' },
      images: { $exists: true, $ne: [], $ne: null }
    });

    const withoutImages = await Product.countDocuments({
      isAmazonsChoice: true,
      status: 'active',
      approvalStatus: 'approved',
      $or: [
        { asin: { $exists: false } },
        { asin: null },
        { asin: '' },
        { images: { $exists: false } },
        { images: { $eq: [] } },
        { images: { $eq: null } }
      ]
    });

    console.log('🎯 Final Results:');
    console.log(`  ✅ Products with images: ${finalCount}`);
    console.log(`  ❌ Products without images: ${withoutImages}`);
    console.log(`  ☁️ Cloudinary images available: ${allCloudinaryImages.length}\n`);

    // Category breakdown
    console.log('📂 Category Breakdown:');
    const categoryBreakdown = await Product.aggregate([
      {
        $match: {
          isAmazonsChoice: true,
          status: 'active',
          approvalStatus: 'approved',
          images: { $exists: true, $ne: [], $ne: null }
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

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ COMPLETE!');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('🎉 Amazon\'s Choice now shows ONLY products with Cloudinary images!');
    console.log(`📊 Total products: ${finalCount}`);
    console.log(`☁️ All images load from Cloudinary CDN\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

ensureOnlyCloudinaryProducts();
