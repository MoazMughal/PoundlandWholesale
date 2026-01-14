import mongoose from 'mongoose';
import Product from '../models/Product.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixApprovedProductsStatus() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all approved products that are not active
    const approvedButNotActive = await Product.find({
      approvalStatus: 'approved',
      status: { $ne: 'active' }
    });

    console.log(`\n📊 Found ${approvedButNotActive.length} approved products that are not active`);

    if (approvedButNotActive.length === 0) {
      console.log('✅ All approved products are already active');
      
      // Check the specific products mentioned
      console.log('\n🔍 Checking specific products (SKU: M0011, M0010)...');
      const specificProducts = await Product.find({
        sku: { $in: ['M0011', 'M0010'] }
      });
      
      if (specificProducts.length > 0) {
        console.log(`\nFound ${specificProducts.length} products:`);
        specificProducts.forEach(product => {
          console.log(`  - ${product.name}`);
          console.log(`    SKU: ${product.sku}`);
          console.log(`    Category: ${product.category}`);
          console.log(`    Status: ${product.status}`);
          console.log(`    Approval Status: ${product.approvalStatus}`);
          console.log(`    Is Amazon's Choice: ${product.isAmazonsChoice}`);
          console.log('');
        });
      } else {
        console.log('❌ Products with SKU M0011 and M0010 not found');
      }
      
      process.exit(0);
    }

    // Show sample products
    console.log('\n📋 Sample products to be fixed:');
    approvedButNotActive.slice(0, 10).forEach(product => {
      console.log(`  - ${product.name}`);
      console.log(`    SKU: ${product.sku || 'N/A'}`);
      console.log(`    Category: ${product.category}`);
      console.log(`    Current Status: ${product.status}`);
      console.log(`    Approval Status: ${product.approvalStatus}`);
      console.log('');
    });

    if (approvedButNotActive.length > 10) {
      console.log(`  ... and ${approvedButNotActive.length - 10} more`);
    }

    // Update all approved products to active status
    const updateResult = await Product.updateMany(
      {
        approvalStatus: 'approved',
        status: { $ne: 'active' }
      },
      {
        $set: { status: 'active' }
      }
    );

    console.log(`\n✅ Updated ${updateResult.modifiedCount} products to active status`);

    // Verify the specific products
    console.log('\n🔍 Verifying specific products (SKU: M0011, M0010)...');
    const specificProducts = await Product.find({
      sku: { $in: ['M0011', 'M0010'] }
    });
    
    if (specificProducts.length > 0) {
      console.log(`\nFound ${specificProducts.length} products:`);
      specificProducts.forEach(product => {
        console.log(`  - ${product.name}`);
        console.log(`    SKU: ${product.sku}`);
        console.log(`    Category: ${product.category}`);
        console.log(`    Status: ${product.status}`);
        console.log(`    Approval Status: ${product.approvalStatus}`);
        console.log(`    Is Amazon's Choice: ${product.isAmazonsChoice}`);
        console.log('');
      });
    }

    // Show category counts
    console.log('\n📊 Category counts for active, approved products:');
    const categoryCounts = await Product.aggregate([
      {
        $match: {
          status: 'active',
          approvalStatus: 'approved',
          category: { $exists: true, $ne: null, $ne: '' }
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

    categoryCounts.forEach(cat => {
      console.log(`  - ${cat._id}: ${cat.count} products`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixApprovedProductsStatus();
