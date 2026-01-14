import mongoose from 'mongoose';
import Product from '../models/Product.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkCloudinaryUrls() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check sample products
    const sampleProducts = await Product.find({ 
      images: { $exists: true, $ne: [] } 
    })
    .limit(5)
    .select('images asin name');

    console.log('\n📊 Sample Products with Images:');
    sampleProducts.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log(`   ASIN: ${product.asin || 'N/A'}`);
      console.log(`   Images (${product.images.length}):`);
      product.images.slice(0, 2).forEach((img, i) => {
        const isCloudinary = img.includes('cloudinary.com') || img.includes('res.cloudinary.com');
        console.log(`   ${i + 1}. ${isCloudinary ? '✅ Cloudinary' : '❌ Local'}: ${img.substring(0, 80)}...`);
      });
    });

    // Count products with Cloudinary vs local images
    const allProducts = await Product.find({ 
      images: { $exists: true, $ne: [] } 
    }).select('images');

    let cloudinaryCount = 0;
    let localCount = 0;
    let mixedCount = 0;

    allProducts.forEach(product => {
      const hasCloudinary = product.images.some(img => 
        img.includes('cloudinary.com') || img.includes('res.cloudinary.com')
      );
      const hasLocal = product.images.some(img => 
        !img.includes('cloudinary.com') && !img.includes('res.cloudinary.com') && !img.startsWith('http')
      );

      if (hasCloudinary && hasLocal) {
        mixedCount++;
      } else if (hasCloudinary) {
        cloudinaryCount++;
      } else if (hasLocal) {
        localCount++;
      }
    });

    console.log('\n\n📈 Statistics:');
    console.log(`Total products with images: ${allProducts.length}`);
    console.log(`✅ Using Cloudinary only: ${cloudinaryCount}`);
    console.log(`❌ Using local paths only: ${localCount}`);
    console.log(`⚠️  Mixed (both): ${mixedCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCloudinaryUrls();
