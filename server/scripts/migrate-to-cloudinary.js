import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import ExcelProduct from '../models/ExcelProduct.js';
import { uploadToCloudinary, isCloudinaryConfigured } from '../services/cloudinary.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

/**
 * Migration script to move existing images to Cloudinary
 */
async function migrateToCloudinary() {
  try {
    console.log('🚀 Starting Cloudinary migration...');
    
    // Check Cloudinary configuration
    if (!isCloudinaryConfigured()) {
      console.error('❌ Cloudinary is not configured. Please check environment variables.');
      process.exit(1);
    }
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get products that need migration
    const products = await Product.find({
      $or: [
        { images: { $regex: /localhost|generic-wholesale-backend\.onrender\.com/ } },
        { image: { $regex: /localhost|generic-wholesale-backend\.onrender\.com/ } }
      ]
    });
    
    console.log(`📊 Found ${products.length} products that need migration`);
    
    let migrated = 0;
    let errors = 0;
    
    for (const product of products) {
      try {
        console.log(`🔄 Processing product: ${product.name} (${product._id})`);
        
        let updated = false;
        const newImages = [];
        
        // Process images array
        if (product.images && product.images.length > 0) {
          for (const imageUrl of product.images) {
            if (imageUrl && !imageUrl.includes('cloudinary.com')) {
              // Try to extract ASIN from the URL or use product ASIN
              let asin = product.asin;
              
              // Try to extract ASIN from image URL
              const asinMatch = imageUrl.match(/([A-Z0-9]{10})/);
              if (asinMatch) {
                asin = asinMatch[1];
              }
              
              if (asin) {
                // Check if image file exists locally
                const imagePath = path.join(__dirname, '../uploads/images', `${asin}.jpg`);
                
                if (fs.existsSync(imagePath)) {
                  try {
                    console.log(`📤 Uploading ${asin} to Cloudinary...`);
                    const result = await uploadToCloudinary(imagePath, asin, 'products');
                    newImages.push(result.secure_url);
                    console.log(`✅ Uploaded: ${result.secure_url}`);
                  } catch (uploadError) {
                    console.error(`❌ Failed to upload ${asin}:`, uploadError.message);
                    newImages.push(imageUrl); // Keep original URL as fallback
                  }
                } else {
                  console.log(`⚠️ Local image not found for ${asin}, keeping original URL`);
                  newImages.push(imageUrl);
                }
              } else {
                newImages.push(imageUrl);
              }
            } else {
              newImages.push(imageUrl); // Already Cloudinary or external URL
            }
          }
          
          if (newImages.length > 0) {
            product.images = newImages;
            updated = true;
          }
        }
        
        // Process single image field
        if (product.image && !product.image.includes('cloudinary.com')) {
          let asin = product.asin;
          const asinMatch = product.image.match(/([A-Z0-9]{10})/);
          if (asinMatch) {
            asin = asinMatch[1];
          }
          
          if (asin) {
            const imagePath = path.join(__dirname, '../uploads/images', `${asin}.jpg`);
            
            if (fs.existsSync(imagePath)) {
              try {
                console.log(`📤 Uploading single image ${asin} to Cloudinary...`);
                const result = await uploadToCloudinary(imagePath, asin, 'products');
                product.image = result.secure_url;
                updated = true;
                console.log(`✅ Updated single image: ${result.secure_url}`);
              } catch (uploadError) {
                console.error(`❌ Failed to upload single image ${asin}:`, uploadError.message);
              }
            }
          }
        }
        
        // Save if updated
        if (updated) {
          await product.save();
          migrated++;
          console.log(`✅ Updated product: ${product.name}`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing product ${product._id}:`, error.message);
        errors++;
      }
    }
    
    // Also migrate ExcelProducts
    console.log('\n🔄 Migrating ExcelProducts...');
    const excelProducts = await ExcelProduct.find({
      $or: [
        { images: { $regex: /localhost|generic-wholesale-backend\.onrender\.com/ } },
        { image: { $regex: /localhost|generic-wholesale-backend\.onrender\.com/ } }
      ]
    });
    
    console.log(`📊 Found ${excelProducts.length} Excel products that need migration`);
    
    for (const product of excelProducts) {
      try {
        console.log(`🔄 Processing Excel product: ${product.name} (${product.asin})`);
        
        let updated = false;
        
        if (product.asin) {
          const imagePath = path.join(__dirname, '../uploads/images', `${product.asin}.jpg`);
          
          if (fs.existsSync(imagePath)) {
            try {
              console.log(`📤 Uploading Excel product ${product.asin} to Cloudinary...`);
              const result = await uploadToCloudinary(imagePath, product.asin, 'products');
              product.images = [result.secure_url];
              updated = true;
              console.log(`✅ Updated Excel product: ${result.secure_url}`);
            } catch (uploadError) {
              console.error(`❌ Failed to upload Excel product ${product.asin}:`, uploadError.message);
            }
          }
        }
        
        if (updated) {
          await product.save();
          migrated++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing Excel product ${product._id}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log(`✅ Successfully migrated: ${migrated} products`);
    console.log(`❌ Errors: ${errors}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToCloudinary();
}

export default migrateToCloudinary;