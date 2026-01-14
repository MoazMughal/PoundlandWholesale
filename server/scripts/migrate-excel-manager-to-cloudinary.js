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
 * Migration script specifically for Excel Manager products to Cloudinary
 */
async function migrateExcelManagerToCloudinary() {
  try {
    console.log('🚀 Starting Excel Manager to Cloudinary migration...');
    
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
      cloudinaryUploads: 0
    };

    // Step 1: Migrate ImageUpload records (from ZIP uploads)
    console.log('\n📦 Step 1: Migrating ImageUpload records...');
    const imageUploads = await ImageUpload.find({ status: 'completed' });
    console.log(`Found ${imageUploads.length} completed image uploads`);

    for (const upload of imageUploads) {
      try {
        console.log(`🔄 Processing upload: ${upload.originalFileName}`);
        let hasChanges = false;

        for (const image of upload.images) {
          // Skip if already has Cloudinary URL
          if (image.cloudinaryUrl || (image.filePath && image.filePath.includes('cloudinary.com'))) {
            console.log(`✅ Image ${image.asin} already has Cloudinary URL`);
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
            results.errors.push(`Local file not found for ${image.asin}: ${image.filePath}`);
          }
        }

        if (hasChanges) {
          await upload.save();
          results.imageUploads++;
          console.log(`✅ Updated ImageUpload record: ${upload.originalFileName}`);
        }

      } catch (error) {
        console.error(`❌ Error processing upload ${upload._id}:`, error.message);
        results.errors.push(`Error processing upload ${upload._id}: ${error.message}`);
      }
    }

    // Step 2: Update ExcelProducts that don't have Cloudinary URLs
    console.log('\n📋 Step 2: Updating ExcelProducts...');
    const excelProducts = await ExcelProduct.find({
      asin: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { images: { $exists: false } },
        { images: [] },
        { images: { $not: { $regex: /cloudinary\.com/ } } }
      ]
    });

    console.log(`Found ${excelProducts.length} ExcelProducts that need Cloudinary URLs`);

    for (const excelProduct of excelProducts) {
      try {
        const imageUpload = await ImageUpload.findOne({
          'images.asin': excelProduct.asin.toUpperCase(),
          status: 'completed'
        });

        if (imageUpload) {
          const matchingImage = imageUpload.images.find(img => img.asin === excelProduct.asin.toUpperCase());
          if (matchingImage && (matchingImage.cloudinaryUrl || (matchingImage.filePath && matchingImage.filePath.includes('cloudinary.com')))) {
            const cloudinaryUrl = matchingImage.cloudinaryUrl || matchingImage.filePath;
            
            excelProduct.images = [cloudinaryUrl];
            excelProduct.image = cloudinaryUrl;
            await excelProduct.save();
            
            results.excelProducts++;
            console.log(`✅ Updated ExcelProduct ${excelProduct.asin}: ${excelProduct.name}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error updating ExcelProduct ${excelProduct._id}:`, error.message);
        results.errors.push(`Error updating ExcelProduct ${excelProduct._id}: ${error.message}`);
      }
    }

    // Step 3: Update regular Products that don't have Cloudinary URLs
    console.log('\n🏪 Step 3: Updating Products...');
    const products = await Product.find({
      asin: { $exists: true, $ne: null, $ne: '' },
      $or: [
        { images: { $exists: false } },
        { images: [] },
        { images: { $not: { $regex: /cloudinary\.com/ } } }
      ]
    });

    console.log(`Found ${products.length} Products that need Cloudinary URLs`);

    for (const product of products) {
      try {
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
            console.log(`✅ Updated Product ${product.asin}: ${product.name}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error updating Product ${product._id}:`, error.message);
        results.errors.push(`Error updating Product ${product._id}: ${error.message}`);
      }
    }

    console.log('\n🎉 Excel Manager to Cloudinary migration completed!');
    console.log(`📊 Results:`);
    console.log(`   📤 Cloudinary uploads: ${results.cloudinaryUploads}`);
    console.log(`   📦 ImageUpload records updated: ${results.imageUploads}`);
    console.log(`   📋 ExcelProducts updated: ${results.excelProducts}`);
    console.log(`   🏪 Products updated: ${results.products}`);
    console.log(`   ❌ Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      results.errors.forEach((error, index) => {
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

    console.log(`🔄 Updated all products with ASIN ${asin} to use Cloudinary URL`);
  } catch (error) {
    console.error(`❌ Failed to update products for ASIN ${asin}:`, error.message);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateExcelManagerToCloudinary()
    .then(results => {
      console.log('\n✅ Migration completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

export default migrateExcelManagerToCloudinary;