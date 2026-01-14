import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import ExcelProduct from './models/ExcelProduct.js';
import ImageUpload from './models/ImageUpload.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server directory
dotenv.config({ path: path.join(__dirname, '.env') });

async function fixASINImageMatching() {
  try {
    console.log('🔧 Fixing ASIN image matching...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get all uploaded images with Cloudinary URLs
    const imageUploads = await ImageUpload.find({
      status: 'completed',
      'images.filePath': { $regex: 'cloudinary.com' }
    });
    
    console.log(`📊 Found ${imageUploads.length} completed image uploads`);
    
    // Create ASIN to Cloudinary URL mapping
    const asinImageMap = new Map();
    let totalCloudinaryImages = 0;
    
    imageUploads.forEach(upload => {
      if (upload.images) {
        upload.images.forEach(img => {
          if (img.asin && img.filePath && img.filePath.includes('cloudinary.com')) {
            // Use the most recent upload for each ASIN
            if (!asinImageMap.has(img.asin) || upload.uploadedAt > asinImageMap.get(img.asin).uploadedAt) {
              asinImageMap.set(img.asin, {
                cloudinaryUrl: img.filePath,
                uploadedAt: upload.uploadedAt,
                matched: img.matched
              });
            }
            totalCloudinaryImages++;
          }
        });
      }
    });
    
    console.log(`📋 Created mapping for ${asinImageMap.size} unique ASINs`);
    console.log(`📊 Total Cloudinary images: ${totalCloudinaryImages}`);
    
    // Fix main products
    console.log('\n🔧 Fixing main products...');
    
    const asinList = Array.from(asinImageMap.keys());
    const productsToFix = await Product.find({
      asin: { $in: asinList },
      status: 'active'
    });
    
    console.log(`📊 Found ${productsToFix.length} products with matching ASINs`);
    
    let mainProductsFixed = 0;
    let mainProductsAlreadyCorrect = 0;
    
    for (const product of productsToFix) {
      const correctImage = asinImageMap.get(product.asin);
      const currentImage = product.images && product.images[0] ? product.images[0] : null;
      
      if (currentImage !== correctImage.cloudinaryUrl) {
        // Update product with correct image
        await Product.updateOne(
          { _id: product._id },
          { 
            $set: { 
              images: [correctImage.cloudinaryUrl],
              image: correctImage.cloudinaryUrl
            } 
          }
        );
        
        mainProductsFixed++;
        
        if (mainProductsFixed <= 10) {
          console.log(`✅ Fixed: ${product.name} (${product.asin})`);
          console.log(`   Old: ${currentImage}`);
          console.log(`   New: ${correctImage.cloudinaryUrl}`);
        }
      } else {
        mainProductsAlreadyCorrect++;
      }
    }
    
    console.log(`\n📈 Main Products Summary:`);
    console.log(`   Fixed: ${mainProductsFixed}`);
    console.log(`   Already correct: ${mainProductsAlreadyCorrect}`);
    console.log(`   Total processed: ${productsToFix.length}`);
    
    // Fix Excel products
    console.log('\n🔧 Fixing Excel products...');
    
    const excelProductsToFix = await ExcelProduct.find({
      asin: { $in: asinList },
      status: { $in: ['pending', 'listed', 'active'] }
    });
    
    console.log(`📊 Found ${excelProductsToFix.length} Excel products with matching ASINs`);
    
    let excelProductsFixed = 0;
    let excelProductsAlreadyCorrect = 0;
    
    for (const product of excelProductsToFix) {
      const correctImage = asinImageMap.get(product.asin);
      const currentImage = product.images && product.images[0] ? product.images[0] : null;
      
      if (currentImage !== correctImage.cloudinaryUrl) {
        // Update Excel product with correct image
        await ExcelProduct.updateOne(
          { _id: product._id },
          { 
            $set: { 
              images: [correctImage.cloudinaryUrl],
              image: correctImage.cloudinaryUrl
            } 
          }
        );
        
        excelProductsFixed++;
        
        if (excelProductsFixed <= 5) {
          console.log(`✅ Fixed Excel: ${product.name} (${product.asin})`);
        }
      } else {
        excelProductsAlreadyCorrect++;
      }
    }
    
    console.log(`\n📈 Excel Products Summary:`);
    console.log(`   Fixed: ${excelProductsFixed}`);
    console.log(`   Already correct: ${excelProductsAlreadyCorrect}`);
    console.log(`   Total processed: ${excelProductsToFix.length}`);
    
    // Update main products that were converted from Excel products
    console.log('\n🔧 Fixing converted Excel products in main collection...');
    
    const convertedProducts = await Product.find({
      asin: { $in: asinList },
      'excelSource.uploadId': { $exists: true },
      status: 'active'
    });
    
    console.log(`📊 Found ${convertedProducts.length} converted products with matching ASINs`);
    
    let convertedFixed = 0;
    
    for (const product of convertedProducts) {
      const correctImage = asinImageMap.get(product.asin);
      const currentImage = product.images && product.images[0] ? product.images[0] : null;
      
      if (currentImage !== correctImage.cloudinaryUrl) {
        await Product.updateOne(
          { _id: product._id },
          { 
            $set: { 
              images: [correctImage.cloudinaryUrl],
              image: correctImage.cloudinaryUrl
            } 
          }
        );
        
        convertedFixed++;
      }
    }
    
    console.log(`   Fixed converted products: ${convertedFixed}`);
    
    // Final verification
    console.log('\n🔍 Final verification...');
    
    const verificationProducts = await Product.find({
      asin: { $in: asinList },
      status: 'active'
    }).select('name asin images isAmazonsChoice');
    
    let nowUsingCorrectImages = 0;
    let stillUsingGenericImages = 0;
    
    verificationProducts.forEach(product => {
      const correctImage = asinImageMap.get(product.asin);
      const currentImage = product.images && product.images[0] ? product.images[0] : null;
      
      if (currentImage === correctImage.cloudinaryUrl) {
        nowUsingCorrectImages++;
      } else {
        stillUsingGenericImages++;
      }
    });
    
    console.log(`\n🎉 Final Results:`);
    console.log(`   Products now using correct images: ${nowUsingCorrectImages}`);
    console.log(`   Products still using generic images: ${stillUsingGenericImages}`);
    console.log(`   Success rate: ${((nowUsingCorrectImages / verificationProducts.length) * 100).toFixed(1)}%`);
    
    // Show sample of Amazon's Choice products with correct images
    const amazonChoiceWithImages = await Product.find({
      asin: { $in: asinList },
      status: 'active',
      isAmazonsChoice: true
    }).select('name asin images').limit(10);
    
    console.log(`\n🏆 Sample Amazon's Choice products with uploaded images:`);
    amazonChoiceWithImages.forEach((product, index) => {
      const correctImage = asinImageMap.get(product.asin);
      const currentImage = product.images && product.images[0] ? product.images[0] : null;
      const isCorrect = currentImage === correctImage.cloudinaryUrl;
      
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   ASIN: ${product.asin}`);
      console.log(`   Status: ${isCorrect ? '✅ Using uploaded image' : '❌ Using generic image'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixASINImageMatching();