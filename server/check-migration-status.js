import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import ExcelProduct from './models/ExcelProduct.js';
import ImageUpload from './models/ImageUpload.js';

dotenv.config();

async function checkMigrationStatus() {
  try {
    console.log('🔍 Checking migration status...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check current status
    const stats = {
      totalProducts: await Product.countDocuments(),
      productsWithImages: await Product.countDocuments({ 
        $or: [
          { images: { $exists: true, $ne: [] } },
          { image: { $exists: true, $ne: null, $ne: '' } }
        ]
      }),
      cloudinaryImages: await Product.countDocuments({
        $or: [
          { images: { $regex: /cloudinary\.com/ } },
          { image: { $regex: /cloudinary\.com/ } }
        ]
      }),
      serverImages: await Product.countDocuments({
        $or: [
          { images: { $regex: /localhost|generic-wholesale-backend\.onrender\.com/ } },
          { image: { $regex: /localhost|generic-wholesale-backend\.onrender\.com/ } }
        ]
      }),
      excelProducts: await ExcelProduct.countDocuments(),
      excelCloudinaryImages: await ExcelProduct.countDocuments({
        $or: [
          { images: { $regex: /cloudinary\.com/ } },
          { image: { $regex: /cloudinary\.com/ } }
        ]
      }),
      imageUploads: await ImageUpload.countDocuments({ status: 'completed' })
    };

    console.log('\n📊 Migration Status Report:');
    console.log('================================');
    console.log(`📦 Total Products: ${stats.totalProducts}`);
    console.log(`🖼️ Products with Images: ${stats.productsWithImages}`);
    console.log(`☁️ Products with Cloudinary Images: ${stats.cloudinaryImages}`);
    console.log(`🖥️ Products still with Server Images: ${stats.serverImages}`);
    console.log(`📋 Total ExcelProducts: ${stats.excelProducts}`);
    console.log(`☁️ ExcelProducts with Cloudinary Images: ${stats.excelCloudinaryImages}`);
    console.log(`📦 Completed Image Uploads: ${stats.imageUploads}`);
    
    // Calculate migration progress
    const migrationProgress = stats.totalProducts > 0 ? 
      Math.round((stats.cloudinaryImages / stats.totalProducts) * 100) : 0;
    
    console.log(`\n🎯 Migration Progress: ${migrationProgress}%`);
    
    if (stats.serverImages === 0 && stats.cloudinaryImages > 0) {
      console.log('✅ Migration COMPLETE! All products use Cloudinary URLs');
    } else if (stats.cloudinaryImages > 0) {
      console.log(`⚠️ Migration IN PROGRESS: ${stats.serverImages} products still need migration`);
    } else {
      console.log('❌ Migration NOT STARTED: No Cloudinary URLs found');
    }
    
    // Sample products check
    console.log('\n🔍 Sample Products:');
    const sampleProducts = await Product.find({})
      .select('name asin images image')
      .limit(3)
      .lean();
    
    sampleProducts.forEach((product, index) => {
      const hasCloudinary = product.images?.some(img => img?.includes('cloudinary.com')) || 
                           product.image?.includes('cloudinary.com');
      console.log(`${index + 1}. ${product.name} (${product.asin}) - ${hasCloudinary ? '✅ Cloudinary' : '❌ No Cloudinary'}`);
    });

    return stats;

  } catch (error) {
    console.error('❌ Error checking migration status:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run status check
checkMigrationStatus()
  .then(stats => {
    console.log('\n✅ Status check completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Status check failed:', error);
    process.exit(1);
  });