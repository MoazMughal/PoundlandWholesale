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

async function createCategoryImages() {
  try {
    console.log('🎨 Creating category-specific images...');
    
    if (!isCloudinaryConfigured()) {
      console.error('❌ Cloudinary is not configured');
      return;
    }
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Define category-specific images
    const categoryImages = [
      {
        name: 'watch-strap',
        color: '#8B4513', // Brown
        icon: '⌚',
        text: 'Watch Strap',
        categories: ['Watch Strap', 'watch strap', 'watch', 'strap']
      },
      {
        name: 'lampshade',
        color: '#FFD700', // Gold
        icon: '💡',
        text: 'Lampshade',
        categories: ['Lampshades', 'lampshade', 'lamp', 'light']
      },
      {
        name: 'nose-ring',
        color: '#C0C0C0', // Silver
        icon: '💍',
        text: 'Jewelry',
        categories: ['Jewelry', 'jewelry', 'nose ring', 'ring']
      },
      {
        name: 'cutlery',
        color: '#4169E1', // Royal Blue
        icon: '🍴',
        text: 'Cutlery',
        categories: ['Kitchen', 'cutlery', 'spoon', 'fork', 'knife', 'plastic']
      },
      {
        name: 'automotive',
        color: '#DC143C', // Crimson
        icon: '🚗',
        text: 'Automotive',
        categories: ['Automotive', 'automotive', 'car', 'bulb', 'fuse']
      }
    ];
    
    const uploadedImages = {};
    
    // Create and upload category images
    for (const category of categoryImages) {
      console.log(`\n🎨 Creating ${category.name} image...`);
      
      const imagePath = path.join(__dirname, `${category.name}-image.jpg`);
      
      await sharp({
        create: {
          width: 400,
          height: 400,
          channels: 3,
          background: { r: 255, g: 255, b: 255 } // White background
        }
      })
      .jpeg({ quality: 90 })
      .composite([
        {
          input: Buffer.from(`
            <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
              <rect width="400" height="400" fill="white"/>
              <rect x="20" y="20" width="360" height="360" fill="${category.color}" rx="20" opacity="0.1"/>
              <rect x="40" y="40" width="320" height="320" fill="white" rx="15" stroke="${category.color}" stroke-width="3"/>
              <text x="200" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="60" fill="${category.color}">${category.icon}</text>
              <text x="200" y="220" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="${category.color}">${category.text}</text>
              <text x="200" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#666">Quality Product</text>
              <text x="200" y="320" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#999">Amazon's Choice</text>
            </svg>
          `),
          top: 0,
          left: 0
        }
      ])
      .toFile(imagePath);
      
      // Upload to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(imagePath, category.name, 'products');
      uploadedImages[category.name] = cloudinaryResult.secure_url;
      
      console.log(`✅ Uploaded ${category.name}: ${cloudinaryResult.secure_url}`);
      
      // Clean up local file
      fs.unlinkSync(imagePath);
    }
    
    // Update products with category-specific images
    for (const category of categoryImages) {
      console.log(`\n🔄 Updating products for ${category.name}...`);
      
      const query = {
        $or: category.categories.map(cat => ({
          $or: [
            { name: { $regex: cat, $options: 'i' } },
            { category: { $regex: cat, $options: 'i' } }
          ]
        })),
        status: 'active'
      };
      
      const updateResult = await Product.updateMany(
        query,
        { 
          $set: { 
            images: [uploadedImages[category.name]],
            image: uploadedImages[category.name]
          } 
        }
      );
      
      console.log(`✅ Updated ${updateResult.modifiedCount} products with ${category.name} image`);
    }
    
    // Check the results
    console.log('\n📊 Sample updated products by category:');
    
    for (const category of categoryImages) {
      const sampleProduct = await Product.findOne({
        $or: category.categories.map(cat => ({
          $or: [
            { name: { $regex: cat, $options: 'i' } },
            { category: { $regex: cat, $options: 'i' } }
          ]
        })),
        status: 'active'
      }).select('name images category');
      
      if (sampleProduct) {
        console.log(`${category.icon} ${sampleProduct.name} (${sampleProduct.category})`);
        console.log(`   Image: ${sampleProduct.images[0]}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createCategoryImages();