import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import ExcelProduct from './models/ExcelProduct.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server directory
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkImageStatus() {
  try {
    console.log('🔍 Checking image status...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check Amazon's Choice products
    const amazonChoiceProducts = await Product.find({ 
      isAmazonsChoice: true,
      status: 'active'
    }).select('name asin images image').limit(10);
    
    console.log(`\n📊 Found ${amazonChoiceProducts.length} Amazon's Choice products (showing first 10):`);
    
    let cloudinaryCount = 0;
    let localCount = 0;
    let noImageCount = 0;
    
    amazonChoiceProducts.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log(`   ASIN: ${product.asin || 'N/A'}`);
      console.log(`   Images array: ${product.images ? product.images.length : 0} items`);
      
      if (product.images && product.images.length > 0) {
        const firstImage = product.images[0];
        console.log(`   First image: ${firstImage}`);
        
        if (firstImage.includes('cloudinary.com')) {
          console.log(`   ✅ Using Cloudinary`);
          cloudinaryCount++;
        } else {
          console.log(`   ⚠️ Not using Cloudinary`);
          localCount++;
        }
      } else {
        console.log(`   ❌ No images`);
        noImageCount++;
      }
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`   Cloudinary images: ${cloudinaryCount}`);
    console.log(`   Local/other images: ${localCount}`);
    console.log(`   No images: ${noImageCount}`);
    
    // Check total counts
    const totalProducts = await Product.countDocuments({ status: 'active' });
    const totalAmazonsChoice = await Product.countDocuments({ 
      isAmazonsChoice: true, 
      status: 'active' 
    });
    const totalWithImages = await Product.countDocuments({ 
      status: 'active',
      images: { $exists: true, $ne: [], $not: { $size: 0 } }
    });
    const totalCloudinaryImages = await Product.countDocuments({
      status: 'active',
      images: { $regex: 'cloudinary.com' }
    });
    
    console.log(`\n🎯 Overall Statistics:`);
    console.log(`   Total active products: ${totalProducts}`);
    console.log(`   Amazon's Choice products: ${totalAmazonsChoice}`);
    console.log(`   Products with images: ${totalWithImages}`);
    console.log(`   Products using Cloudinary: ${totalCloudinaryImages}`);
    
    // Test a sample API call
    console.log(`\n🧪 Testing API response format...`);
    const sampleProducts = await Product.find({ 
      isAmazonsChoice: true,
      status: 'active'
    }).select('name price category brand images rating reviews dealUnits currency asin').limit(3).lean();
    
    console.log('Sample API response structure:');
    sampleProducts.forEach((product, index) => {
      console.log(`\nProduct ${index + 1}:`);
      console.log(`  Name: ${product.name}`);
      console.log(`  Price: ${product.price}`);
      console.log(`  Images: ${JSON.stringify(product.images)}`);
      console.log(`  ASIN: ${product.asin}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkImageStatus();