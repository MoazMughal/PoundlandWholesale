import mongoose from 'mongoose';
import Product from './models/Product.js';
import ImageUpload from './models/ImageUpload.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkAvailableImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get all available image ASINs
    const imageUploads = await ImageUpload.find({ status: 'completed' });
    const availableASINs = new Set();
    
    imageUploads.forEach(upload => {
      if (upload.images && upload.images.length > 0) {
        upload.images.forEach(image => {
          if (image.asin) {
            availableASINs.add(image.asin.toUpperCase());
          }
        });
      }
    });
    
    console.log(`Available image ASINs: ${availableASINs.size}`);
    console.log('Sample available ASINs:', Array.from(availableASINs).slice(0, 10));
    
    // Get Amazon's Choice products
    const products = await Product.find({ isAmazonsChoice: true }).limit(10);
    console.log(`\nChecking first 10 Amazon's Choice products:`);
    
    let withImages = 0;
    let withoutImages = 0;
    
    products.forEach((product, index) => {
      const hasImage = availableASINs.has(product.asin?.toUpperCase());
      console.log(`${index + 1}. ${product.name.substring(0, 50)}...`);
      console.log(`   ASIN: ${product.asin} - ${hasImage ? '✅ HAS IMAGE' : '❌ NO IMAGE'}`);
      
      if (hasImage) {
        withImages++;
      } else {
        withoutImages++;
      }
    });
    
    console.log(`\nSummary of first 10 products:`);
    console.log(`- With images: ${withImages}`);
    console.log(`- Without images: ${withoutImages}`);
    
    // Check total counts
    const totalProducts = await Product.countDocuments({ isAmazonsChoice: true });
    const productsWithMatchingImages = await Product.countDocuments({
      isAmazonsChoice: true,
      asin: { $in: Array.from(availableASINs) }
    });
    
    console.log(`\nTotal Amazon's Choice products: ${totalProducts}`);
    console.log(`Products with matching images: ${productsWithMatchingImages}`);
    console.log(`Products without matching images: ${totalProducts - productsWithMatchingImages}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAvailableImages();