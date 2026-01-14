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

async function syncProductsWithCloudinary() {
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

    // Create a map of ASIN -> Cloudinary URL
    const asinToImageMap = new Map();
    allCloudinaryImages.forEach(img => {
      const publicId = img.public_id;
      const asin = publicId.split('/').pop(); // Extract ASIN from public_id
      const cloudinaryUrl = `https://res.cloudinary.com/dtuq3tvjx/image/upload/w_300,h_300,c_fill,f_auto,q_auto/products/${asin}`;
      asinToImageMap.set(asin, cloudinaryUrl);
    });

    console.log(`📋 Created ASIN map with ${asinToImageMap.size} entries\n`);

    // Step 2: Get all Amazon's Choice products
    const amazonsChoiceProducts = await Product.find({
      isAmazonsChoice: true,
      asin: { $exists: true, $ne: null, $ne: '' }
    });

    console.log(`📊 Found ${amazonsChoiceProducts.length} Amazon's Choice products with ASIN\n`);

    // Step 3: Update products with Cloudinary images
    let updatedCount = 0;
    let alreadyCorrectCount = 0;
    let noImageCount = 0;

    for (const product of amazonsChoiceProducts) {
      const cloudinaryUrl = asinToImageMap.get(product.asin);

      if (!cloudinaryUrl) {
        noImageCount++;
        console.log(`❌ No Cloudinary image for ASIN: ${product.asin} (${product.name})`);
        continue;
      }

      // Check if product already has the correct Cloudinary URL
      const hasCorrectImage = product.images && 
                             product.images.length > 0 && 
                             product.images[0] === cloudinaryUrl;

      if (hasCorrectImage) {
        alreadyCorrectCount++;
        continue;
      }

      // Update product with Cloudinary URL
      await Product.updateOne(
        { _id: product._id },
        { 
          $set: { 
            images: [cloudinaryUrl],
            image: cloudinaryUrl // Also update the main image field
          } 
        }
      );

      updatedCount++;
      console.log(`✅ Updated: ${product.name} (ASIN: ${product.asin})`);
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Updated: ${updatedCount} products`);
    console.log(`  ✓ Already correct: ${alreadyCorrectCount} products`);
    console.log(`  ❌ No Cloudinary image: ${noImageCount} products`);
    console.log(`  📊 Total processed: ${amazonsChoiceProducts.length} products\n`);

    // Step 4: Verify final state
    const productsWithImages = await Product.countDocuments({
      isAmazonsChoice: true,
      status: 'active',
      approvalStatus: 'approved',
      asin: { $exists: true, $ne: null, $ne: '' },
      images: { $exists: true, $ne: [], $ne: null }
    });

    const productsWithoutImages = await Product.countDocuments({
      isAmazonsChoice: true,
      status: 'active',
      approvalStatus: 'approved',
      asin: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { images: { $exists: false } },
        { images: { $eq: [] } },
        { images: { $eq: null } }
      ]
    });

    console.log('🎯 Final State:');
    console.log(`  ✅ Products with images: ${productsWithImages}`);
    console.log(`  ❌ Products without images: ${productsWithoutImages}\n`);

    // Step 5: Show products without images
    if (productsWithoutImages > 0) {
      console.log('📋 Products without images:');
      const productsNeedingImages = await Product.find({
        isAmazonsChoice: true,
        status: 'active',
        approvalStatus: 'approved',
        asin: { $exists: true, $ne: null, $ne: '' },
        $or: [
          { images: { $exists: false } },
          { images: { $eq: [] } },
          { images: { $eq: null } }
        ]
      }).limit(10);

      productsNeedingImages.forEach(p => {
        console.log(`  - ${p.name} (ASIN: ${p.asin})`);
        console.log(`    Has Cloudinary image: ${asinToImageMap.has(p.asin) ? 'Yes' : 'No'}`);
      });

      if (productsWithoutImages > 10) {
        console.log(`  ... and ${productsWithoutImages - 10} more\n`);
      }
    }

    console.log('✅ Sync complete!\n');
    console.log('🎉 All Amazon\'s Choice products with matching Cloudinary images have been updated!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

syncProductsWithCloudinary();
