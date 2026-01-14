import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server directory
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkAllAmazonChoiceImages() {
  try {
    console.log('🔍 Checking ALL Amazon Choice products images...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get ALL Amazon Choice products
    const amazonChoiceProducts = await Product.find({
      isAmazonsChoice: true,
      status: 'active'
    }).select('name asin images category').lean();
    
    console.log(`\n📊 Found ${amazonChoiceProducts.length} Amazon Choice products`);
    
    let cloudinaryImages = 0;
    let localImages = 0;
    let noImages = 0;
    let realProductImages = 0;
    let genericImages = 0;
    let brokenImages = 0;
    
    const imageTypes = {
      'cloudinary_real': 0,      // Real product images on Cloudinary
      'cloudinary_generic': 0,   // Generic category images on Cloudinary
      'local_path': 0,           // Local server paths
      'external_url': 0,         // External URLs (Amazon, etc.)
      'no_image': 0,             // No image at all
      'broken_url': 0            // Malformed URLs
    };
    
    const sampleImages = {
      'cloudinary_real': [],
      'cloudinary_generic': [],
      'local_path': [],
      'external_url': [],
      'broken_url': []
    };
    
    console.log('\n🔍 Analyzing image types...');
    
    amazonChoiceProducts.forEach((product, index) => {
      const imageUrl = product.images && product.images[0] ? product.images[0] : null;
      
      if (!imageUrl) {
        imageTypes.no_image++;
        noImages++;
      } else if (imageUrl.includes('cloudinary.com')) {
        cloudinaryImages++;
        
        // Check if it's a generic category image or real product image
        const isGeneric = imageUrl.includes('default-product') ||
                         imageUrl.includes('watch-strap') ||
                         imageUrl.includes('lampshade') ||
                         imageUrl.includes('nose-ring') ||
                         imageUrl.includes('cutlery') ||
                         imageUrl.includes('automotive');
        
        if (isGeneric) {
          imageTypes.cloudinary_generic++;
          genericImages++;
          if (sampleImages.cloudinary_generic.length < 3) {
            sampleImages.cloudinary_generic.push({
              name: product.name,
              asin: product.asin,
              url: imageUrl
            });
          }
        } else {
          imageTypes.cloudinary_real++;
          realProductImages++;
          if (sampleImages.cloudinary_real.length < 3) {
            sampleImages.cloudinary_real.push({
              name: product.name,
              asin: product.asin,
              url: imageUrl
            });
          }
        }
      } else if (imageUrl.startsWith('/') || imageUrl.includes('localhost') || imageUrl.includes('generic-wholesale-backend')) {
        imageTypes.local_path++;
        localImages++;
        if (sampleImages.local_path.length < 3) {
          sampleImages.local_path.push({
            name: product.name,
            asin: product.asin,
            url: imageUrl
          });
        }
      } else if (imageUrl.startsWith('http')) {
        imageTypes.external_url++;
        if (sampleImages.external_url.length < 3) {
          sampleImages.external_url.push({
            name: product.name,
            asin: product.asin,
            url: imageUrl
          });
        }
      } else {
        imageTypes.broken_url++;
        brokenImages++;
        if (sampleImages.broken_url.length < 3) {
          sampleImages.broken_url.push({
            name: product.name,
            asin: product.asin,
            url: imageUrl
          });
        }
      }
      
      // Show progress for large datasets
      if (index % 100 === 0) {
        console.log(`   Processed ${index + 1}/${amazonChoiceProducts.length} products...`);
      }
    });
    
    console.log('\n📈 Image Analysis Results:');
    console.log(`   Total products: ${amazonChoiceProducts.length}`);
    console.log(`   Real product images (Cloudinary): ${imageTypes.cloudinary_real} (${((imageTypes.cloudinary_real / amazonChoiceProducts.length) * 100).toFixed(1)}%)`);
    console.log(`   Generic category images (Cloudinary): ${imageTypes.cloudinary_generic} (${((imageTypes.cloudinary_generic / amazonChoiceProducts.length) * 100).toFixed(1)}%)`);
    console.log(`   Local server paths: ${imageTypes.local_path} (${((imageTypes.local_path / amazonChoiceProducts.length) * 100).toFixed(1)}%)`);
    console.log(`   External URLs: ${imageTypes.external_url} (${((imageTypes.external_url / amazonChoiceProducts.length) * 100).toFixed(1)}%)`);
    console.log(`   No images: ${imageTypes.no_image} (${((imageTypes.no_image / amazonChoiceProducts.length) * 100).toFixed(1)}%)`);
    console.log(`   Broken URLs: ${imageTypes.broken_url} (${((imageTypes.broken_url / amazonChoiceProducts.length) * 100).toFixed(1)}%)`);
    
    console.log('\n🎯 Issues to Fix:');
    const problemProducts = imageTypes.local_path + imageTypes.no_image + imageTypes.broken_url;
    console.log(`   Products with image issues: ${problemProducts} (${((problemProducts / amazonChoiceProducts.length) * 100).toFixed(1)}%)`);
    console.log(`   Products that should show images: ${amazonChoiceProducts.length - problemProducts} (${(((amazonChoiceProducts.length - problemProducts) / amazonChoiceProducts.length) * 100).toFixed(1)}%)`);
    
    // Show samples of each type
    console.log('\n📋 Sample Images by Type:');
    
    Object.keys(sampleImages).forEach(type => {
      if (sampleImages[type].length > 0) {
        console.log(`\n${type.toUpperCase()}:`);
        sampleImages[type].forEach((sample, index) => {
          console.log(`   ${index + 1}. ${sample.name.substring(0, 50)}...`);
          console.log(`      ASIN: ${sample.asin || 'N/A'}`);
          console.log(`      URL: ${sample.url}`);
        });
      }
    });
    
    // Test a few Cloudinary URLs to see if they're accessible
    console.log('\n🧪 Testing Cloudinary URL accessibility...');
    
    const cloudinaryUrls = sampleImages.cloudinary_real.concat(sampleImages.cloudinary_generic);
    let accessibleUrls = 0;
    let inaccessibleUrls = 0;
    
    for (const sample of cloudinaryUrls.slice(0, 5)) {
      try {
        const response = await fetch(sample.url);
        if (response.ok) {
          accessibleUrls++;
          console.log(`   ✅ ${sample.url.substring(0, 80)}... (${response.status})`);
        } else {
          inaccessibleUrls++;
          console.log(`   ❌ ${sample.url.substring(0, 80)}... (${response.status})`);
        }
      } catch (error) {
        inaccessibleUrls++;
        console.log(`   ❌ ${sample.url.substring(0, 80)}... (Error: ${error.message})`);
      }
    }
    
    console.log(`\n🌐 URL Accessibility Test:`);
    console.log(`   Accessible: ${accessibleUrls}/${cloudinaryUrls.slice(0, 5).length}`);
    console.log(`   Inaccessible: ${inaccessibleUrls}/${cloudinaryUrls.slice(0, 5).length}`);
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (imageTypes.local_path > 0) {
      console.log(`   🔧 Fix ${imageTypes.local_path} products with local paths - migrate to Cloudinary`);
    }
    if (imageTypes.no_image > 0) {
      console.log(`   📷 Add images for ${imageTypes.no_image} products without images`);
    }
    if (imageTypes.broken_url > 0) {
      console.log(`   🛠️ Fix ${imageTypes.broken_url} products with broken URLs`);
    }
    if (inaccessibleUrls > 0) {
      console.log(`   🌐 Check Cloudinary configuration - some URLs are not accessible`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkAllAmazonChoiceImages();