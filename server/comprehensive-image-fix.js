import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import ImageUpload from './models/ImageUpload.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function comprehensiveImageFix() {
  try {
    console.log('🔧 Running comprehensive image fix...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Step 1: Get all ASIN-matched images from uploads
    const imageUploads = await ImageUpload.find({
      status: 'completed',
      'images.filePath': { $regex: 'cloudinary.com' }
    });
    
    const asinImageMap = new Map();
    imageUploads.forEach(upload => {
      if (upload.images) {
        upload.images.forEach(img => {
          if (img.asin && img.filePath && img.filePath.includes('cloudinary.com')) {
            asinImageMap.set(img.asin, img.filePath);
          }
        });
      }
    });
    
    console.log(`📋 Found ${asinImageMap.size} ASIN-matched images`);
    
    // Step 2: Update all products with correct images
    const amazonChoiceProducts = await Product.find({
      isAmazonsChoice: true,
      status: 'active'
    });
    
    let updated = 0;
    
    for (const product of amazonChoiceProducts) {
      let needsUpdate = false;
      let newImages = product.images || [];
      
      // If product has ASIN and we have a real image for it
      if (product.asin && asinImageMap.has(product.asin)) {
        const realImageUrl = asinImageMap.get(product.asin);
        
        // Check if product is using generic image instead of real image
        const currentImage = product.images && product.images[0] ? product.images[0] : null;
        
        if (currentImage !== realImageUrl) {
          newImages = [realImageUrl];
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        await Product.updateOne(
          { _id: product._id },
          { $set: { images: newImages, image: newImages[0] } }
        );
        updated++;
      }
    }
    
    console.log(`✅ Updated ${updated} products with real images`);
    
    // Step 3: Test API response
    console.log('\n🧪 Testing API response...');
    const testResponse = await fetch('https://generic-wholesale-backend.onrender.com/api/products/public?isAmazonsChoice=true&limit=5');
    const testData = await testResponse.json();
    
    if (testData.products) {
      console.log(`API returned ${testData.products.length} products`);
      testData.products.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name.substring(0, 50)}...`);
        console.log(`   Image: ${product.images ? product.images[0] : 'No image'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

comprehensiveImageFix();