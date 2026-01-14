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

async function checkImageUploads() {
  try {
    console.log('🔍 Checking image uploads and ASIN matching...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check ImageUploads
    const imageUploads = await ImageUpload.find({}).sort({ uploadedAt: -1 });
    console.log(`\n📊 Found ${imageUploads.length} image upload records`);
    
    let totalUploadedImages = 0;
    let totalMatchedASINs = 0;
    let cloudinaryImages = 0;
    
    imageUploads.forEach((upload, index) => {
      console.log(`\n${index + 1}. Upload: ${upload.originalFileName}`);
      console.log(`   Status: ${upload.status}`);
      console.log(`   Uploaded: ${upload.uploadedAt}`);
      console.log(`   Images: ${upload.images ? upload.images.length : 0}`);
      
      if (upload.images && upload.images.length > 0) {
        totalUploadedImages += upload.images.length;
        
        const matchedImages = upload.images.filter(img => img.matched);
        const cloudinaryUrls = upload.images.filter(img => 
          img.filePath && img.filePath.includes('cloudinary.com')
        );
        
        totalMatchedASINs += matchedImages.length;
        cloudinaryImages += cloudinaryUrls.length;
        
        console.log(`   Matched ASINs: ${matchedImages.length}`);
        console.log(`   Cloudinary URLs: ${cloudinaryUrls.length}`);
        
        // Show sample ASINs
        const sampleASINs = upload.images.slice(0, 5).map(img => 
          `${img.asin} (${img.matched ? 'matched' : 'unmatched'})`
        );
        console.log(`   Sample ASINs: ${sampleASINs.join(', ')}`);
      }
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total uploaded images: ${totalUploadedImages}`);
    console.log(`   Total matched ASINs: ${totalMatchedASINs}`);
    console.log(`   Cloudinary images: ${cloudinaryImages}`);
    
    // Check products that should have ASIN-matched images
    console.log(`\n🔍 Checking products with ASIN-matched images...`);
    
    // Get all ASINs from image uploads
    const allUploadedASINs = [];
    imageUploads.forEach(upload => {
      if (upload.images) {
        upload.images.forEach(img => {
          if (img.asin && img.filePath && img.filePath.includes('cloudinary.com')) {
            allUploadedASINs.push({
              asin: img.asin,
              cloudinaryUrl: img.filePath,
              matched: img.matched
            });
          }
        });
      }
    });
    
    console.log(`\n📋 Found ${allUploadedASINs.length} ASINs with Cloudinary images`);
    
    // Check how many products have these ASINs
    const asinList = allUploadedASINs.map(item => item.asin);
    const productsWithUploadedASINs = await Product.find({
      asin: { $in: asinList },
      status: 'active'
    }).select('name asin images isAmazonsChoice');
    
    console.log(`\n🎯 Products that should have uploaded images:`);
    console.log(`   Products with matching ASINs: ${productsWithUploadedASINs.length}`);
    
    let usingUploadedImages = 0;
    let usingGenericImages = 0;
    
    productsWithUploadedASINs.forEach((product, index) => {
      const uploadedImage = allUploadedASINs.find(item => item.asin === product.asin);
      const currentImage = product.images && product.images[0] ? product.images[0] : 'No image';
      
      const isUsingUploadedImage = currentImage === uploadedImage?.cloudinaryUrl;
      
      if (isUsingUploadedImage) {
        usingUploadedImages++;
      } else {
        usingGenericImages++;
      }
      
      if (index < 10) { // Show first 10
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   ASIN: ${product.asin}`);
        console.log(`   Amazon's Choice: ${product.isAmazonsChoice ? 'Yes' : 'No'}`);
        console.log(`   Current image: ${currentImage}`);
        console.log(`   Should be: ${uploadedImage?.cloudinaryUrl || 'Not found'}`);
        console.log(`   Status: ${isUsingUploadedImage ? '✅ Using uploaded image' : '❌ Using generic image'}`);
      }
    });
    
    console.log(`\n📊 Image Usage Summary:`);
    console.log(`   Using uploaded images: ${usingUploadedImages}`);
    console.log(`   Using generic images: ${usingGenericImages}`);
    console.log(`   Should be fixed: ${usingGenericImages}`);
    
    // Check Excel products too
    const excelProductsWithASINs = await ExcelProduct.find({
      asin: { $in: asinList },
      status: { $in: ['pending', 'listed', 'active'] }
    }).select('name asin images isConverted');
    
    console.log(`\n📋 Excel products with matching ASINs: ${excelProductsWithASINs.length}`);
    
    let excelUsingUploaded = 0;
    let excelUsingGeneric = 0;
    
    excelProductsWithASINs.forEach(product => {
      const uploadedImage = allUploadedASINs.find(item => item.asin === product.asin);
      const currentImage = product.images && product.images[0] ? product.images[0] : 'No image';
      const isUsingUploadedImage = currentImage === uploadedImage?.cloudinaryUrl;
      
      if (isUsingUploadedImage) {
        excelUsingUploaded++;
      } else {
        excelUsingGeneric++;
      }
    });
    
    console.log(`   Excel using uploaded images: ${excelUsingUploaded}`);
    console.log(`   Excel using generic images: ${excelUsingGeneric}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkImageUploads();