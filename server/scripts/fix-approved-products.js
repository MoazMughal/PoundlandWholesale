import mongoose from 'mongoose';
import Product from '../models/Product.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const fixApprovedProducts = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all approved products that are not marked as Amazon's Choice
    const approvedProducts = await Product.find({
      approvalStatus: 'approved',
      status: 'active',
      $or: [
        { isAmazonsChoice: { $ne: true } },
        { isAmazonsChoice: { $exists: false } }
      ]
    });

    console.log(`\n📊 Found ${approvedProducts.length} approved products that need to be added to Amazon's Choice\n`);

    if (approvedProducts.length === 0) {
      console.log('✅ All approved products are already in Amazon\'s Choice!');
      process.exit(0);
    }

    // Show products that will be updated
    console.log('Products to be updated:');
    approvedProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (${product.category || 'No category'})`);
    });

    console.log('\n🔄 Updating products...\n');

    // Update all approved products to be Amazon's Choice
    const result = await Product.updateMany(
      {
        approvalStatus: 'approved',
        status: 'active',
        $or: [
          { isAmazonsChoice: { $ne: true } },
          { isAmazonsChoice: { $exists: false } }
        ]
      },
      {
        $set: { isAmazonsChoice: true }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} products`);
    console.log(`   - Set isAmazonsChoice: true for all approved products`);

    // Verify the update
    const verifyCount = await Product.countDocuments({
      approvalStatus: 'approved',
      status: 'active',
      isAmazonsChoice: true
    });

    console.log(`\n✅ Verification: ${verifyCount} products are now in Amazon's Choice`);

    // Show category breakdown
    const categoryBreakdown = await Product.aggregate([
      {
        $match: {
          approvalStatus: 'approved',
          status: 'active',
          isAmazonsChoice: true
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📊 Amazon\'s Choice products by category:');
    categoryBreakdown.forEach(cat => {
      console.log(`   - ${cat._id || 'No category'}: ${cat.count} products`);
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('🎉 All approved products are now visible in Amazon\'s Choice category');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

fixApprovedProducts();
