import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import ExcelProduct from '../models/ExcelProduct.js';
import ImageUpload from '../models/ImageUpload.js';
import { uploadToCloudinary, isCloudinaryConfigured } from '../services/cloudinary.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

/**
 * Complete migration script to move ALL existing images to Cloudinary
 * This ensures the entire website works with Cloudinary
 */
async function completeCloudinaryMigration() {
  try {
    console.log('🚀 Starting COMPLETE Cloudinary migration...');
    console.log('📋 This will migrate ALL existing images to Cloudinary');
    
    // Check Cloudinary configuration
    if (!isCloudinaryConfigured()) {
      console.error('❌ Cloudinary is not configured. Please check environment variables.');
      process.exit(1);
    }
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const results = {
      imageUploads: 0,
      excelProducts: 0,
      products: 0,
      errors: [],
      cloudinaryUploads: 0,
      skipped: 0
    };

    // Step 1: Migrate ImageUpload records (Excel Manager ZIP uploads)
    console.log('\n📦 Step 1: Migrating Excel Manager ImageUpload records...');
    await migrateImageUploads(results);

    // Step 2: Migrate ExcelProducts
    console.log('\n📋 Step 2: Migrating ExcelProducts...');
    await migrateExcelProducts(results);

    // Step 3: Migrate regular Products
    console.log('\n🏪 Step 3: Migrating regular Products...');
    await migrateProducts(results);

    // Step 4: Handle products with local server URLs
    console.log('\n🔗 Step 4: Fixing products with server URLs...');
    await fixServerUrls(results);

    console.log('\n🎉 COMPLETE Cloudinary migration finished!');
    console.log(`📊 Final Results:`);
    console.log(`   📤 New Cloudinary uploads: ${results.cloudinaryUploads}`);
    console.log(`   📦 ImageUpload records updated: ${results.imageUploads}`);
    console.log(`   📋 ExcelProducts updated: ${results.excelProducts}`);
    console.log(`   🏪 Products updated: ${results.products}`);
    console.log(`   ⏭️ Already had Cloudinary URLs (skipped): ${results.skipped}`);
    console.log(`   ❌ Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      results.errors.slice(0, 10).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
      if (results.errors.length > 10) {
        console.log(`   ... and ${results.errors.length - 10} more errors`);
      }
    }

    // Final verification
    console.log('\n🔍 Final verification...');
    await verifyMigration();

    return results;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

/**
 * Migrate ImageUpload records from Excel Manager
 */
async function migrateImageUploads(results) {
  const imageUploads = await ImageUpload.find({ status: 'completed' });
  console.log(`Found ${imageUploads.length} completed image uploads`);

  for (const upload of imageUploads) {
    try {
      console.log(`🔄 Processing upload: ${upload.originalFileName}`);
      let hasChanges = false;

      for (const image of upload.images) {
        // Skip if already has Cloudinary URL
        if (image.cloudinaryUrl || (image.filePath && image.filePath.includes('cloudinary.com'))) {
          results.skipped++;
          continue;
        }

        // Check if local file exists
        if (image.filePath && fs.existsSync(image.filePath)) {
          try {
            console.log(`📤 Uploading ${image.asin} to Cloudinary...`);
            const cloudinaryResult = await uploadToCloudinary(image.filePath, image.asin, 'products');
            
            // Update the image record
            image.cloudinaryUrl = cloudinaryResult.secure_url;
            image.filePath = cloudinaryResult.secure_url;
            hasChanges = true;
            results.cloudinaryUploads++;
            
            console.log(`✅ Uploaded ${image.asin}: ${cloudinaryResult.secure_url}`);
            
            // Update any products that reference this ASIN
            await updateProductsWithCloudinaryUrl(image.asin, cloudinaryResult.secure_url);
            
          } catch (uploadError) {
            console.error(`❌ Failed to upload ${image.asin}:`, uploadError.message);
            results.errors.push(`Failed to upload ${image.asin}: ${uploadError.message}`);
          }
        } else {
          console.log(`⚠️ Local file not found for ${image.asin}: ${image.filePath}`);
        }
      }

      if (hasChanges) {
        await upload.save();
        results.imageUploads++;
      }

    } catch (error) {
      console.error(`❌ Error processing upload ${upload._id}:`, error.message);
      results.errors.push(`Error processing upload ${upload._id}: ${error.message}`);
    }
  }
}

/**
 * Migrate ExcelProducts
 */
async function migrateExcelProducts(results) {
  const excelProducts = await ExcelProduct.find({
    asin: { $exists: true, $ne: null, $ne: '' }
  });

  console.log(`Found ${excelProducts.length} ExcelProducts to check`);

  for (const excelProduct of excelProducts) {
    try {
      let needsUpdate = false;
      let newImages = [...(excelProduct.images || [])];

      // Check if already has Cloudinary URLs
      const hasCloudinaryImages = newImages.some(img => img && img.includes('cloudinary.com'));
      
      if (hasCloudinaryImages) {
        results.skipped++;
        continue;
      }

      // Try to find matching ImageUpload
      const imageUpload = await ImageUpload.findOne({
        'images.asin': excelProduct.asin.toUpperCase(),
        status: 'completed'
      });

      if (imageUpload) {
        const matchingImage = imageUpload.images.find(img => img.asin === excelProduct.asin.toUpperCase());
        if (matchingImage && (matchingImage.cloudinaryUrl || (matchingImage.filePath && matchingImage.filePath.includes('cloudinary.com')))) {
          const cloudinaryUrl = matchingImage.cloudinaryUrl || matchingImage.filePath;
          
          excelProduct.images = [cloudinaryUrl];
          needsUpdate = true;
        }
      }

      // If no ImageUpload found, try to find local files
      if (!needsUpdate && excelProduct.asin) {
        const possiblePaths = [
          path.join(__dirname, '../uploads/images', `${excelProduct.asin}.jpg`),
          path.join(__dirname, '../uploads/images', `${excelProduct.asin}.jpeg`),
          path.join(__dirname, '../uploads/images', `${excelProduct.asin}.png`)
        ];

        for (const imagePath of possiblePaths) {
          if (fs.existsSync(imagePath)) {
            try {
              console.log(`📤 Uploading ExcelProduct ${excelProduct.asin} to Cloudinary...`);
              const cloudinaryResult = await uploadToCloudinary(imagePath, excelProduct.asin, 'products');
              
              excelProduct.images = [cloudinaryResult.secure_url];
              needsUpdate = true;
              results.cloudinaryUploads++;
              
              console.log(`✅ Uploaded ExcelProduct ${excelProduct.asin}: ${cloudinaryResult.secure_url}`);
              break;
            } catch (uploadError) {
              console.error(`❌ Failed to upload ExcelProduct ${excelProduct.asin}:`, uploadError.message);
              results.errors.push(`Failed to upload ExcelProduct ${excelProduct.asin}: ${uploadError.message}`);
            }
          }
        }
      }

      if (needsUpdate) {
        await excelProduct.save();
        results.excelProducts++;
        console.log(`✅ Updated ExcelProduct ${excelProduct.asin}: ${excelProduct.name}`);
      }

    } catch (error) {
      console.error(`❌ Error updating ExcelProduct ${excelProduct._id}:`, error.message);
      results.errors.push(`Error updating ExcelProduct ${excelProduct._id}: ${error.message}`);
    }
  }
}

/**
 * Migrate regular Products
 */
async function migrateProducts(results) {
  const products = await Product.find({
    asin: { $exists: true, $ne: null, $ne: '' }
  });

  console.log(`Found ${products.length} Products to check`);

  for (const product of products) {
    try {
      let needsUpdate = false;

      // Check if already has Cloudinary URLs
      const hasCloudinaryImages = product.images && product.images.some(img => img && img.includes('cloudinary.com'));
      
      if (hasCloudinaryImages) {
        results.skipped++;
        continue;
      }

      // Try to find matching ImageUpload
      const imageUpload = await ImageUpload.findOne({
        'images.asin': product.asin.toUpperCase(),
        status: 'completed'
      });

      if (imageUpload) {
        const matchingImage = imageUpload.images.find(img => img.asin === product.asin.toUpperCase());
        if (matchingImage && (matchingImage.cloudinaryUrl || (matchingImage.filePath && matchingImage.filePath.includes('cloudinary.com')))) {
          const cloudinaryUrl = matchingImage.cloudinaryUrl || matchingImage.filePath;
          
          product.images = [cloudinaryUrl];
          needsUpdate = true;
        }
      }

      // If no ImageUpload found, try to find local files
      if (!needsUpdate && product.asin) {
        const possiblePaths = [
          path.join(__dirname, '../uploads/images', `${product.asin}.jpg`),
          path.join(__dirname, '../uploads/images', `${product.asin}.jpeg`),
          path.join(__dirname, '../uploads/images', `${product.asin}.png`)
        ];

        for (const imagePath of possiblePaths) {
          if (fs.existsSync(imagePath)) {
            try {
              console.log(`📤 Uploading Product ${product.asin} to Cloudinary...`);
              const cloudinaryResult = await uploadToCloudinary(imagePath, product.asin, 'products');
              
              product.images = [cloudinaryResult.secure_url];
              needsUpdate = true;
              results.cloudinaryUploads++;
              
              console.log(`✅ Uploaded Product ${product.asin}: ${cloudinaryResult.secure_url}`);
              break;
            } catch (uploadError) {
              console.error(`❌ Failed to upload Product ${product.asin}:`, uploadError.message);
              results.errors.push(`Failed to upload Product ${product.asin}: ${uploadError.message}`);
            }
          }
        }
      }

      if (needsUpdate) {
        await product.save();
        results.products++;
        console.log(`✅ Updated Product ${product.asin}: ${product.name}`);
      }

    } catch (error) {
      console.error(`❌ Error updating Product ${product._id}:`, error.message);
      results.errors.push(`Error updating Product ${product._id}: ${error.message}`);
    }
  }
}

/**
 * Fix products that have server URLs instead of Cloudinary URLs
 */
async function fixServerUrls(results) {
  const productsWithServerUrls = await Product.find({
    $or: [
      { images: { $regex: /localhost|generic-wholesale-backend\.onrender\.com/ } },
      { image: { $regex: /localhost|generic-wholesale-backend\.onrender\.com/ } }
    ]
  });

  console.log(`Found ${productsWithServerUrls.length} products with server URLs`);

  for (const product of productsWithServerUrls) {
    try {
      if (product.asin) {
        // Try to find Cloudinary version
        const imageUpload = await ImageUpload.findOne({
          'images.asin': product.asin.toUpperCase(),
          status: 'completed'
        });

        if (imageUpload) {
          const matchingImage = imageUpload.images.find(img => img.asin === product.asin.toUpperCase());
          if (matchingImage && (matchingImage.cloudinaryUrl || (matchingImage.filePath && matchingImage.filePath.includes('cloudinary.com')))) {
            const cloudinaryUrl = matchingImage.cloudinaryUrl || matchingImage.filePath;
            
            product.images = [cloudinaryUrl];
            product.image = cloudinaryUrl;
            await product.save();
            
            results.products++;
            console.log(`✅ Fixed server URL for Product ${product.asin}: ${product.name}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error fixing server URL for Product ${product._id}:`, error.message);
      results.errors.push(`Error fixing server URL for Product ${product._id}: ${error.message}`);
    }
  }
}

/**
 * Update products with Cloudinary URL for a specific ASIN
 */
async function updateProductsWithCloudinaryUrl(asin, cloudinaryUrl) {
  try {
    // Update ExcelProducts
    await ExcelProduct.updateMany(
      { asin: asin.toUpperCase() },
      { 
        $set: { 
          images: [cloudinaryUrl],
          image: cloudinaryUrl
        }
      }
    );

    // Update Products
    await Product.updateMany(
      { asin: asin.toUpperCase() },
      { 
        $set: { 
          images: [cloudinaryUrl],
          image: cloudinaryUrl
        }
      }
    );

  } catch (error) {
    console.error(`❌ Failed to update products for ASIN ${asin}:`, error.message);
  }
}

/**
 * Verify migration results
 */
async function verifyMigration() {
  try {
    const stats = {
      totalProducts: await Product.countDocuments(),
      productsWithImages: await Product.countDocuments({ 
        $or: [
          { images: { $exists: true, $ne: [] } },
          { image: { $exists: true, $ne: null, $ne: '' } }
        ]
      }),
      cloudinaryImages: await Product.countDocuments({
        $or: [
          { images: { $regex: /cloudinary\.com/ } },
          { image: { $regex: /cloudinary\.com/ } }
        ]
      }),
      serverImages: await Product.countDocuments({
        $or: [
          { images: { $regex: /localhost|generic-wholesale-backend\.onrender\.com/ } },
          { image: { $regex: /localhost|generic-wholesale-backend\.onrender\.com/ } }
        ]
      }),
      excelProducts: await ExcelProduct.countDocuments(),
      excelCloudinaryImages: await ExcelProduct.countDocuments({
        $or: [
          { images: { $regex: /cloudinary\.com/ } },
          { image: { $regex: /cloudinary\.com/ } }
        ]
      })
    };

    console.log('📊 Migration Verification:');
    console.log(`   📦 Total Products: ${stats.totalProducts}`);
    console.log(`   🖼️ Products with Images: ${stats.productsWithImages}`);
    console.log(`   ☁️ Products with Cloudinary Images: ${stats.cloudinaryImages}`);
    console.log(`   🖥️ Products still with Server Images: ${stats.serverImages}`);
    console.log(`   📋 Total ExcelProducts: ${stats.excelProducts}`);
    console.log(`   ☁️ ExcelProducts with Cloudinary Images: ${stats.excelCloudinaryImages}`);

    const migrationSuccess = stats.serverImages === 0 && stats.cloudinaryImages > 0;
    console.log(`\n${migrationSuccess ? '✅ Migration SUCCESS!' : '⚠️ Migration needs attention'}`);
    
    if (stats.serverImages > 0) {
      console.log(`⚠️ ${stats.serverImages} products still have server URLs - may need manual review`);
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  completeCloudinaryMigration()
    .then(results => {
      console.log('\n✅ Complete migration finished successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Complete migration failed:', error);
      process.exit(1);
    });
}

export default completeCloudinaryMigration;