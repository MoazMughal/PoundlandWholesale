import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import { uploadToCloudinary, isCloudinaryConfigured } from './services/cloudinary.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server directory
dotenv.config({ path: path.join(__dirname, '.env') });

async function createDefaultImage() {
  try {
    console.log('🎨 Creating default product image...');
    
    if (!isCloudinaryConfigured()) {
      console.error('❌ Cloudinary is not configured');
      return;
    }
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Create a simple default image using Sharp
    const defaultImagePath = path.join(__dirname, 'default-product-image.jpg');
    
    await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 255, g: 102, b: 0 } // Orange background
      }
    })
    .jpeg({ quality: 90 })
    .composite([
      {
        input: Buffer.from(`
          <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
            <rect width="400" height="400" fill="#ff6600"/>
            <rect x="50" y="50" width="300" height="300" fill="white" rx="20"/>
            <circle cx="200" cy="150" r="30" fill="#ff6600"/>
            <rect x="150" y="200" width="100" height="20" fill="#ff6600" rx="10"/>
            <rect x="170" y="240" width="60" height="15" fill="#ff6600" rx="7"/>
            <text x="200" y="320" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#ff6600">Product</text>
            <text x="200" y="350" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#666">Image</text>
          </svg>
        `),
        top: 0,
        left: 0
      }
    ])
    .toFile(defaultImagePath);
    
    console.log('✅ Default image created locally');
    
    // Upload to Cloudinary
    console.log('📤 Uploading to Cloudinary...');
    const cloudinaryResult = await uploadToCloudinary(defaultImagePath, 'default-product', 'products');
    console.log('✅ Uploaded to Cloudinary:', cloudinaryResult.secure_url);
    
    // Clean up local file
    fs.unlinkSync(defaultImagePath);
    
    // Update products that have problematic images
    console.log('\n🔄 Updating products with missing or problematic images...');
    
    // Find products with the old B0001K9WB2 image or no images
    const updateResult = await Product.updateMany(
      {
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
      },
      { 
        $set: { 
          images: [cloudinaryResult.secure_url],
          image: cloudinaryResult.secure_url
        } 
      }
    );
    
    console.log(`✅ Updated ${updateResult.modifiedCount} products with new default image`);
    
    // Check the results
    const sampleProducts = await Product.find({ 
      isAmazonsChoice: true,
      status: 'active'
    }).select('name images').limit(5);
    
    console.log('\n📊 Sample updated products:');
    sampleProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Images: ${JSON.stringify(product.images)}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createDefaultImage();