const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import models (adjust paths as needed)
const ExcelProduct = require('./server/models/ExcelProduct.js');
const ImageUpload = require('./server/models/ImageUpload.js');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database-name');

async function debugImageServing(uploadId) {
  try {
    console.log('🔍 Debugging image serving for upload:', uploadId);
    
    // Get all Excel products from this upload that have ASINs
    const excelProducts = await ExcelProduct.find({
      excelUploadId: uploadId,
      asin: { $exists: true, $ne: '' }
    }).select('_id name asin isConverted').lean();
    
    console.log(`📦 Found ${excelProducts.length} Excel products with ASINs`);
    
    // Get all image uploads
    const imageUploads = await ImageUpload.find({
      status: 'completed'
    }).lean();
    
    console.log(`🖼️ Found ${imageUploads.length} completed image uploads`);
    
    // Check each Excel product
    for (const product of excelProducts) {
      const asin = product.asin.toUpperCase();
      console.log(`\n🔍 Checking product: ${product.name} (ASIN: ${asin})`);
      
      // Find matching image upload
      const imageUpload = imageUploads.find(upload => 
        upload.images.some(img => img.asin === asin)
      );
      
      if (imageUpload) {
        const matchingImage = imageUpload.images.find(img => img.asin === asin);
        console.log(`  ✅ Found image upload for ASIN: ${asin}`);
        console.log(`  📁 File path: ${matchingImage.filePath}`);
        console.log(`  📊 File exists: ${fs.existsSync(matchingImage.filePath)}`);
        
        if (!fs.existsSync(matchingImage.filePath)) {
          console.log(`  ❌ Image file missing for ASIN: ${asin}`);
          console.log(`  🔧 Expected path: ${matchingImage.filePath}`);
        }
      } else {
        console.log(`  ❌ No image upload found for ASIN: ${asin}`);
        
        // Check if there's a case mismatch
        const caseInsensitiveMatch = imageUploads.find(upload => 
          upload.images.some(img => img.asin.toLowerCase() === asin.toLowerCase())
        );
        
        if (caseInsensitiveMatch) {
          const matchingImage = caseInsensitiveMatch.images.find(img => 
            img.asin.toLowerCase() === asin.toLowerCase()
          );
          console.log(`  ⚠️ Found case mismatch: Expected ${asin}, found ${matchingImage.asin}`);
        }
      }
    }
    
    // Summary of all ASINs in image uploads
    console.log('\n📋 All ASINs in image uploads:');
    const allImageAsins = [];
    imageUploads.forEach(upload => {
      upload.images.forEach(img => {
        if (img.asin) {
          allImageAsins.push(img.asin);
        }
      });
    });
    console.log(allImageAsins.sort());
    
    // Summary of all ASINs in Excel products
    console.log('\n📋 All ASINs in Excel products:');
    const allExcelAsins = excelProducts.map(p => p.asin.toUpperCase()).sort();
    console.log(allExcelAsins);
    
    // Find mismatches
    console.log('\n🔍 ASIN Mismatches:');
    const imageAsinsSet = new Set(allImageAsins);
    const excelAsinsSet = new Set(allExcelAsins);
    
    const missingInImages = allExcelAsins.filter(asin => !imageAsinsSet.has(asin));
    const missingInExcel = allImageAsins.filter(asin => !excelAsinsSet.has(asin));
    
    if (missingInImages.length > 0) {
      console.log('❌ ASINs in Excel but not in images:', missingInImages);
    }
    
    if (missingInExcel.length > 0) {
      console.log('❌ ASINs in images but not in Excel:', missingInExcel);
    }
    
    if (missingInImages.length === 0 && missingInExcel.length === 0) {
      console.log('✅ All ASINs match between Excel and images');
    }
    
  } catch (error) {
    console.error('❌ Error debugging image serving:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Get uploadId from command line argument
const uploadId = process.argv[2];
if (!uploadId) {
  console.log('Usage: node debug-image-serving.js <uploadId>');
  process.exit(1);
}

debugImageServing(uploadId);