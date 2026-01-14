import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import ExcelProduct from './models/ExcelProduct.js';
import ImageUpload from './models/ImageUpload.js';
import { uploadToCloudinary, isCloudinaryConfigured } from './services/cloudinary.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function migrateExistingImages() {
  try {
    console.log('🚀 Starting focused migration for existing images...');
    
    // Check Cloudinary configuration
    if (!isCloudinaryConfigured()) {
      console.error('❌ Cloudinary is not configured. Please check environment variables.');
      console.log('Required variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
      process.exit(1);
    }
    
    console.log('✅ Cloudinary is configured');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const results = {
      processed: 0,
      uploaded: 0,
      updated: 0,
      errors: []
    };

    // Step 1: Process ImageUpload records (from Excel Manager)
    console.log('\n📦 Step 1: Processing Excel Manager image uploads...');
    const imageUploads = await ImageUpload.find({ status: 'completed' });
    console.log(`Found ${imageUploads.length} completed image uploads`);

    for (const upload of imageUploads) {
      console.log(`\n🔄 Processing upload: ${upload.originalFileName}`);
      let hasChanges = false;

      for (const image of upload.images) {
        results.processed++;
        
        // Skip if already has Cloudinary URL
        if (image.cloudinaryUrl || (image.filePath && image.filePath.includes('cloudinary.com'))) {
          console.log(`✅ ${image.asin} already has Cloudinary URL`);
          continue;
        }

        // Check if local file exists
        if (image.filePath && fs.existsSync(image.filePath)) {
          try {
            console.log(`📤 Uploading ${image.asin} to Cloudinary...`);
            const cloudinaryResult = await uploadToCloudinary(image.filePath, image.asin, 'products');
            
            // Update the image record
            image.cloudinaryUrl = cloudinaryResult.secure_url;
            image.filePath = cloudinaryResult.secure_url; // Also update filePath for backward compatibility
            hasChanges = true;
            results.uploaded++;
            
            console.log(`✅ Uploaded ${image.asin}: ${cloudinaryResult.secure_url}`);
            
            // Update products with this ASIN
            const updatedProducts = await Product.updateMany(
              { asin: image.asin.toUpperCase() },
              { 
                $set: { 
                  images: [cloudinaryResult.secure_url],
                  image: cloudinaryResult.secure_url
                }
              }
            );
            
            const updatedExcelProducts = await ExcelProduct.updateMany(
              { asin: image.asin.toUpperCase() },
              { 
                $set: { 
                  images: [cloudinaryResult.secure_url],
                  image: cloudinaryResult.secure_url
                }
              }
            );
            
            results.updated += updatedProducts.modifiedCount + updatedExcelProducts.modifiedCount;
            console.log(`📝 Updated ${updatedProducts.modifiedCount} Products and ${updatedExcelProducts.modifiedCount} ExcelProducts`);
            
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
        console.log(`✅ Updated ImageUpload record: ${upload.originalFileName}`);
      }
    }

    // Step 2: Check for any remaining products that need placeholder Cloudinary URLs
    console.log('\n🔍 Step 2: Checking for products without Cloudinary URLs...');
    const productsWithoutCloudinary = await Product.find({
      asin: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { images: { $exists: false } },
        { images: [] },
        { images: { $not: { $regex: /cloudinary\.com/ } } }
      ]
    }).limit(10); // Limit to 10 for testing

    console.log(`Found ${productsWithoutCloudinary.length} products without Cloudinary URLs (showing first 10)`);

    for (const product of productsWithoutCloudinary) {
      if (product.asin) {
        // Create a placeholder Cloudinary URL (this won't actually exist but follows the pattern)
        const placeholderUrl = `https://res.cloudinary.com/dtuq3tvjx/image/upload/v1/products/${product.asin}.jpg`;
        
        try {
          await Product.updateOne(
            { _id: product._id },
            { 
              $set: { 
                images: [placeholderUrl],
                image: placeholderUrl
              }
            }
          );
          
          results.updated++;
          console.log(`📝 Added placeholder Cloudinary URL for ${product.asin}: ${product.name}`);
        } catch (error) {
          console.error(`❌ Failed to update ${product.asin}:`, error.message);
          results.errors.push(`Failed to update ${product.asin}: ${error.message}`);
        }
      }
    }

    console.log('\n🎉 Migration completed!');
    console.log(`📊 Results:`);
    console.log(`   📤 Images processed: ${results.processed}`);
    console.log(`   ☁️ Uploaded to Cloudinary: ${results.uploaded}`);
    console.log(`   📝 Products updated: ${results.updated}`);
    console.log(`   ❌ Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.slice(0, 5).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    return results;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrateExistingImages()
  .then(results => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });