import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server directory
dotenv.config({ path: path.join(__dirname, '.env') });

async function testFrontendAPI() {
  try {
    console.log('🧪 Testing the exact API call that frontend makes...');
    
    // Test the actual API endpoint
    const apiUrl = 'https://generic-wholesale-backend.onrender.com/api/products/public?isAmazonsChoice=true&limit=20';
    console.log(`📡 Testing: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    console.log(`📊 API Response:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Products returned: ${data.products ? data.products.length : 0}`);
    console.log(`   Total available: ${data.total || 'Unknown'}`);
    console.log(`   Source: ${data.source || 'Unknown'}`);
    
    if (data.products && data.products.length > 0) {
      console.log('\n📋 First 5 products from API:');
      
      data.products.slice(0, 5).forEach((product, index) => {
        console.log(`\n${index + 1}. ${product.name}`);
        console.log(`   ASIN: ${product.asin || 'N/A'}`);
        console.log(`   Price: ${product.price || 'N/A'}`);
        console.log(`   Category: ${product.category || 'N/A'}`);
        console.log(`   Images: ${product.images ? JSON.stringify(product.images) : 'No images'}`);
        console.log(`   Image field: ${product.image || 'No image field'}`);
        
        // Test if the image URL is accessible
        if (product.images && product.images[0]) {
          testImageUrl(product.images[0], product.name);
        }
      });
      
      // Check image statistics
      let withImages = 0;
      let withoutImages = 0;
      let cloudinaryImages = 0;
      let genericImages = 0;
      let realImages = 0;
      
      data.products.forEach(product => {
        if (product.images && product.images[0]) {
          withImages++;
          
          if (product.images[0].includes('cloudinary.com')) {
            cloudinaryImages++;
            
            const isGeneric = product.images[0].includes('default-product') ||
                             product.images[0].includes('watch-strap') ||
                             product.images[0].includes('lampshade') ||
                             product.images[0].includes('nose-ring') ||
                             product.images[0].includes('cutlery') ||
                             product.images[0].includes('automotive');
            
            if (isGeneric) {
              genericImages++;
            } else {
              realImages++;
            }
          }
        } else {
          withoutImages++;
        }
      });
      
      console.log('\n📊 API Response Statistics:');
      console.log(`   Products with images: ${withImages}/${data.products.length} (${((withImages / data.products.length) * 100).toFixed(1)}%)`);
      console.log(`   Products without images: ${withoutImages}/${data.products.length} (${((withoutImages / data.products.length) * 100).toFixed(1)}%)`);
      console.log(`   Cloudinary images: ${cloudinaryImages}/${withImages} (${withImages > 0 ? ((cloudinaryImages / withImages) * 100).toFixed(1) : 0}%)`);
      console.log(`   Real product images: ${realImages}/${cloudinaryImages} (${cloudinaryImages > 0 ? ((realImages / cloudinaryImages) * 100).toFixed(1) : 0}%)`);
      console.log(`   Generic category images: ${genericImages}/${cloudinaryImages} (${cloudinaryImages > 0 ? ((genericImages / cloudinaryImages) * 100).toFixed(1) : 0}%)`);
      
    } else {
      console.log('❌ No products returned from API');
      console.log('Full response:', JSON.stringify(data, null, 2));
    }
    
    // Test pagination to see more products
    console.log('\n🔄 Testing pagination...');
    const page2Url = 'https://generic-wholesale-backend.onrender.com/api/products/public?isAmazonsChoice=true&limit=20&page=2';
    const page2Response = await fetch(page2Url);
    const page2Data = await page2Response.json();
    
    console.log(`📄 Page 2 Results:`);
    console.log(`   Status: ${page2Response.status}`);
    console.log(`   Products: ${page2Data.products ? page2Data.products.length : 0}`);
    
    if (page2Data.products && page2Data.products.length > 0) {
      console.log(`   Sample product: ${page2Data.products[0].name}`);
      console.log(`   Sample image: ${page2Data.products[0].images ? page2Data.products[0].images[0] : 'No image'}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

async function testImageUrl(url, productName) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      console.log(`   ✅ Image accessible (${response.status})`);
    } else {
      console.log(`   ❌ Image not accessible (${response.status})`);
    }
  } catch (error) {
    console.log(`   ❌ Image test failed: ${error.message}`);
  }
}

testFrontendAPI();