const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import models (adjust paths as needed)
const ExcelProduct = require('./server/models/ExcelProduct.js');
const ImageUpload = require('./server/models/ImageUpload.js');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database-name');

async function fixImageServing(uploadId) {
  try {
    console.log('🔧 Fixing image serving for upload:', uploadId);
    
    // Get all Excel products from this upload that have ASINs
    const excelProducts = await ExcelProduct.find({
      excelUploadId: uploadId,
      asin: { $exists: true, $ne: '' }
    });
    
    console.log(`📦 Found ${excelProducts.length} Excel products with ASINs`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const product of excelProducts) {
      try {
        const asin = product.asin.toUpperCase();
        console.log(`\n🔍 Processing product: ${product.name} (ASIN: ${asin})`);
        
        // Find image upload for this ASIN (case insensitive)
        const imageUpload = await ImageUpload.findOne({
          'images.asin': { $regex: new RegExp(`^${asin}$`, 'i') },
          status: 'completed'
        });
        
        if (imageUpload) {
          const matchingImage = imageUpload.images.find(img => 
            img.asin.toUpperCase() === asin
          );
          
          if (matchingImage) {
            // Check if file exists
            if (fs.existsSync(matchingImage.filePath)) {
              console.log(`  ✅ Image file exists for ASIN: ${asin}`);
              
              // Update the Excel product to ensure it has the correct image reference
              if (!product.images || product.images.length === 0) {
                const baseUrl = process.env.NODE_ENV === 'production' 
                  ? 'https://generic-wholesale-backend.onrender.com' 
                  : 'http://localhost:5000';
                const imageUrl = `${baseUrl}/api/admin-excel/public/images/by-asin/${asin}`;
                
                await ExcelProduct.updateOne(
                  { _id: product._id },
                  { $set: { images: [imageUrl] } }
                );
                
                console.log(`  🔧 Added image URL to Excel product: ${imageUrl}`);
                fixedCount++;
              } else {
                console.log(`  ✅ Excel product already has images`);
              }
            } else {
              console.log(`  ❌ Image file missing: ${matchingImage.filePath}`);
              errorCount++;
            }
          } else {
            // Fix case mismatch
            const caseInsensitiveMatch = imageUpload.images.find(img => 
              img.asin.toUpperCase() === asin
            );
            
            if (caseInsensitiveMatch) {
              console.log(`  🔧 Fixing case mismatch: ${caseInsensitiveMatch.asin} -> ${asin}`);
              
              // Update the ASIN in the image upload to match
              await ImageUpload.updateOne(
                { 
                  _id: imageUpload._id,
                  'images.asin': caseInsensitiveMatch.asin
                },
                { 
                  $set: { 'images.$.asin': asin }
                }
              );
              
              fixedCount++;
            } else {
              console.log(`  ❌ No matching image found for ASIN: ${asin}`);
              errorCount++;
            }
          }
        } else {
          console.log(`  ❌ No image upload found for ASIN: ${asin}`);
          errorCount++;
        }
        
      } catch (error) {
        console.error(`  ❌ Error processing product ${product.name}:`, error);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Fixed: ${fixedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('❌ Error fixing image serving:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Get uploadId from command line argument
const uploadId = process.argv[2];
if (!uploadId) {
  console.log('Usage: node fix-image-serving.js <uploadId>');
  process.exit(1);
}

fixImageServing(uploadId);