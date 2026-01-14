import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import { uploadToCloudinary, isCloudinaryConfigured } from './services/cloudinary.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server directory
dotenv.config({ path: path.join(__dirname, '.env') });

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete the file async
      reject(err);
    });
  });
}

async function fixMissingImages() {
  try {
    console.log('🔧 Fixing missing images...');
    
    if (!isCloudinaryConfigured()) {
      console.error('❌ Cloudinary is not configured');
      return;
    }
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Create a default product image
    const defaultImageUrl = 'https://via.placeholder.com/400x400/ff6600/ffffff?text=Product+Image';
    const defaultImagePath = path.join(__dirname, 'temp-default-image.jpg');
    
    console.log('📥 Downloading default image...');
    await downloadImage(defaultImageUrl, defaultImagePath);
    
    // Upload default image to Cloudinary
    console.log('📤 Uploading default image to Cloudinary...');
    const defaultCloudinaryResult = await uploadToCloudinary(defaultImagePath, 'default-product', 'products');
    console.log('✅ Default image uploaded:', defaultCloudinaryResult.secure_url);
    
    // Clean up temp file
    fs.unlinkSync(defaultImagePath);
    
    // Find products with problematic images
    const problematicProducts = await Product.find({
      $or: [
        { images: { $size: 0 } },
        { images: { $exists: false } },
        { images: null },
        { 
          images: { 
            $elemMatch: { 
              $regex: /B0001K9WB2|default-product/ 
            } 
          } 
        }
      ],
      status: 'active'
    }).limit(50);
    
    console.log(`\n🔍 Found ${problematicProducts.length} products with image issues`);
    
    let fixed = 0;
    
    for (const product of problematicProducts) {
      try {
        console.log(`\n🔧 Fixing: ${product.name}`);
        console.log(`   ASIN: ${product.asin || 'N/A'}`);
        console.log(`   Current images: ${JSON.stringify(product.images)}`);
        
        let newImages = [];
        
        // Try to find a better image based on ASIN
        if (product.asin && product.asin.match(/^[A-Z0-9]{10}$/)) {
          // Try Amazon image URLs
          const amazonImageUrls = [
            `https://images-na.ssl-images-amazon.com/images/P/${product.asin}.01._SCLZZZZZZZ_SX500_.jpg`,
            `https://m.media-amazon.com/images/I/${product.asin}._AC_SL1500_.jpg`,
            `https://images-na.ssl-images-amazon.com/images/I/${product.asin}._AC_SL1500_.jpg`
          ];
          
          // Test if any Amazon image works
          for (const amazonUrl of amazonImageUrls) {
            try {
              const tempPath = path.join(__dirname, `temp-${product.asin}.jpg`);
              await downloadImage(amazonUrl, tempPath);
              
              // Upload to Cloudinary
              const cloudinaryResult = await uploadToCloudinary(tempPath, product.asin, 'products');
              newImages.push(cloudinaryResult.secure_url);
              
              // Clean up
              fs.unlinkSync(tempPath);
              
              console.log(`   ✅ Found and uploaded Amazon image: ${cloudinaryResult.secure_url}`);
              break;
            } catch (error) {
              console.log(`   ⚠️ Amazon image not available: ${amazonUrl}`);
            }
          }
        }
        
        // If no Amazon image found, use default
        if (newImages.length === 0) {
          newImages.push(defaultCloudinaryResult.secure_url);
          console.log(`   📷 Using default image`);
        }
        
        // Update product
        await Product.updateOne(
          { _id: product._id },
          { 
            $set: { 
              images: newImages,
              image: newImages[0] // Also set single image field
            } 
          }
        );
        
        fixed++;
        console.log(`   ✅ Fixed product images`);
        
      } catch (error) {
        console.error(`   ❌ Failed to fix ${product.name}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Fixed ${fixed} products`);
    
    // Update products that are using the old B0001K9WB2 image
    console.log('\n🔄 Updating products with old default image...');
    const updateResult = await Product.updateMany(
      { 
        images: { 
          $elemMatch: { 
            $regex: /B0001K9WB2/ 
          } 
        } 
      },
      { 
        $set: { 
          images: [defaultCloudinaryResult.secure_url],
          image: defaultCloudinaryResult.secure_url
        } 
      }
    );
    
    console.log(`✅ Updated ${updateResult.modifiedCount} products with new default image`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixMissingImages();