import mongoose from 'mongoose';
import Product from '../models/Product.js';
import dotenv from 'dotenv';

dotenv.config();

const removeDuplicateProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all products
    const allProducts = await Product.find({});
    console.log(`📦 Total products: ${allProducts.length}`);

    // Group by name
    const productsByName = {};
    allProducts.forEach(product => {
      if (!productsByName[product.name]) {
        productsByName[product.name] = [];
      }
      productsByName[product.name].push(product);
    });

    // Find duplicates
    const duplicates = Object.entries(productsByName).filter(([name, products]) => products.length > 1);
    console.log(`🔍 Found ${duplicates.length} duplicate product names`);

    let removedCount = 0;

    for (const [name, products] of duplicates) {
      console.log(`\n📝 Processing: ${name}`);
      console.log(`   Found ${products.length} copies`);

      // Sort by updatedAt (keep the most recent)
      products.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      // Keep the first (most recent), delete the rest
      const toKeep = products[0];
      const toDelete = products.slice(1);

      console.log(`   ✅ Keeping: ID ${toKeep._id} (Updated: ${toKeep.updatedAt})`);

      for (const product of toDelete) {
        console.log(`   ❌ Deleting: ID ${product._id} (Updated: ${product.updatedAt})`);
        await Product.findByIdAndDelete(product._id);
        removedCount++;
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`📊 Removed ${removedCount} duplicate products`);
    console.log(`📦 Remaining products: ${allProducts.length - removedCount}`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

removeDuplicateProducts();
