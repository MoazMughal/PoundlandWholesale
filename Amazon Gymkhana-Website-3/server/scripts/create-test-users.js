// Script to create test buyer and seller accounts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Buyer from '../models/Buyer.js';
import Seller from '../models/Seller.js';
import Admin from '../models/Admin.js';

dotenv.config();

const createTestUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('Creating test accounts...\n');

    // Create Test Admin (if not exists)
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    if (!existingAdmin) {
      const admin = new Admin({
        username: 'admin',
        email: 'admin@genericwholesale.pk',
        password: 'admin123',
        role: 'admin'
      });
      await admin.save();
      console.log('✅ Admin created');
    } else {
      console.log('⏭️  Admin already exists');
    }

    // Create Test Buyer
    const existingBuyer = await Buyer.findOne({ email: 'buyer@test.com' });
    if (!existingBuyer) {
      const buyer = new Buyer({
        firstName: 'Test',
        lastName: 'Buyer',
        email: 'buyer@test.com',
        password: 'buyer123',
        whatsappNo: '+923001234567',
        country: 'Pakistan',
        city: 'Karachi'
      });
      await buyer.save();
      console.log('✅ Test Buyer created');
    } else {
      console.log('⏭️  Test Buyer already exists');
    }

    // Create Test Seller
    const existingSeller = await Seller.findOne({ email: 'seller@test.com' });
    if (!existingSeller) {
      const seller = new Seller({
        username: 'testseller',
        email: 'seller@test.com',
        password: 'seller123',
        whatsappNo: '+923001234568',
        contactNo: '+923001234568',
        country: 'Pakistan',
        city: 'Lahore',
        productCategory: 'Electronics',
        businessName: 'Test Seller Business',
        verificationStatus: 'approved',
        status: 'verified'
      });
      await seller.save();
      console.log('✅ Test Seller created');
    } else {
      console.log('⏭️  Test Seller already exists');
    }

    console.log('\n═══════════════════════════════════════');
    console.log('✅ TEST ACCOUNTS READY');
    console.log('═══════════════════════════════════════\n');

    console.log('👑 ADMIN:');
    console.log('   URL: /admin/login');
    console.log('   Username: admin');
    console.log('   Password: admin123\n');

    console.log('🛒 BUYER:');
    console.log('   URL: /login/buyer');
    console.log('   Email: buyer@test.com');
    console.log('   Password: buyer123\n');

    console.log('🏪 SELLER:');
    console.log('   URL: /login/supplier');
    console.log('   Email: seller@test.com');
    console.log('   Password: seller123\n');

    console.log('═══════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createTestUsers();
