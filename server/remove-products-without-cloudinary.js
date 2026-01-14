import mongoose from 'mongoose';
import Product from './models/Product.js';

const MONGODB_URI = 'mongodb+srv://Admin:iW0UgtS1d5Fnf1gt@cluster0.v6qyt5k.mongodb.net/amazon-gymkhana?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas\n');
    
    // Find all Amazon's Choice products
    const amazonsChoiceProducts = await Product.find({
      isAmazonsChoice: true
    }).select('name images image category').lean();
    
    console.log(`📊 Total Amazon's Choice products: ${amazonsChoiceProducts.length}\n`);
    
    // Check which products have Cloudinary images
    const productsWithoutCloudinary = [];
    const productsWithCloudinary = [];
    
    amazonsChoiceProducts.forEach(product => {
      const hasCloudinaryImage = 
        (product.images && product.images.some(img => img && img.includes('cloudinary.com'))) ||
        (product.image && product.image.includes('cloudinary.com'));
      
      if (hasCloudinaryImage) {
        productsWithCloudinary.push(product);
      } else {
        productsWithoutCloudinary.push(product);
      }
    });
    
    console.log(`✅ Products WITH Cloudinary images: ${productsWithCloudinary.length}`);
    console.log(`❌ Products WITHOUT Cloudinary images: ${productsWithoutCloudinary.length}\n`);
    
    if (productsWithoutCloudinary.length > 0) {
      console.log('📋 Sample products WITHOUT Cloudinary images (first 10):');
      productsWithoutCloudinary.slice(0, 10).forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   Category: ${p.category || 'N/A'}`);
        console.log(`   Images: ${p.images?.length || 0}`);
        console.log(`   Image URLs: ${p.images?.join(', ') || p.image || 'None'}`);
        console.log('');
      });
      
      console.log('\n🔄 Removing these products from Amazon\'s Choice...\n');
      
      // Get IDs of products without Cloudinary images
      const idsToUpdate = productsWithoutCloudinary.map(p => p._id);
      
      // Update products - remove from Amazon's Choice
      const result = await Product.updateMany(
        { _id: { $in: idsToUpdate } },
        { $set: { isAmazonsChoice: false } }
      );
      
      console.log(`✅ Removed ${result.modifiedCount} products from Amazon's Choice!\n`);
      
      // Verify the update
      const remainingAmazonsChoice = await Product.countDocuments({
        isAmazonsChoice: true
      });
      
      console.log(`📊 Amazon's Choice products remaining: ${remainingAmazonsChoice}`);
      console.log(`   (All have Cloudinary images)\n`);
      
      console.log('✅ SUCCESS! Only products with Cloudinary images will show in Amazon\'s Choice now!');
    } else {
      console.log('✅ All Amazon\'s Choice products already have Cloudinary images!');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
