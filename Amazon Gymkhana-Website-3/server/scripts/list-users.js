// Script to list all buyers and sellers in database
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Buyer from '../models/Buyer.js';
import Seller from '../models/Seller.js';
import Admin from '../models/Admin.js';

dotenv.config();

const listUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all admins
    const admins = await Admin.find({}).select('username email role');
    console.log('═══════════════════════════════════════');
    console.log('👑 ADMINS (' + admins.length + ')');
    console.log('═══════════════════════════════════════');
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. Username: ${admin.username}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Password: [Encrypted - use "admin123" if default]\n`);
    });

    // Get all buyers
    const buyers = await Buyer.find({}).select('firstName lastName email whatsappNo');
    console.log('═══════════════════════════════════════');
    console.log('🛒 BUYERS (' + buyers.length + ')');
    console.log('═══════════════════════════════════════');
    buyers.forEach((buyer, index) => {
      console.log(`${index + 1}. Name: ${buyer.firstName} ${buyer.lastName}`);
      console.log(`   Email: ${buyer.email}`);
      console.log(`   WhatsApp: ${buyer.whatsappNo || 'N/A'}`);
      console.log(`   Password: [Encrypted - check registration]\n`);
    });

    // Get all sellers
    const sellers = await Seller.find({}).select('username email whatsappNo verificationStatus');
    console.log('═══════════════════════════════════════');
    console.log('🏪 SELLERS (' + sellers.length + ')');
    console.log('═══════════════════════════════════════');
    sellers.forEach((seller, index) => {
      console.log(`${index + 1}. Username: ${seller.username}`);
      console.log(`   Email: ${seller.email}`);
      console.log(`   WhatsApp: ${seller.whatsappNo || 'N/A'}`);
      console.log(`   Status: ${seller.verificationStatus}`);
      console.log(`   Password: [Encrypted - check registration]\n`);
    });

    console.log('═══════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Total Admins: ${admins.length}`);
    console.log(`Total Buyers: ${buyers.length}`);
    console.log(`Total Sellers: ${sellers.length}`);
    console.log(`Total Users: ${admins.length + buyers.length + sellers.length}`);
    console.log('═══════════════════════════════════════\n');

    console.log('💡 NOTE: Passwords are encrypted in database.');
    console.log('   You need to either:');
    console.log('   1. Remember the password you used during registration');
    console.log('   2. Use "Forgot Password" to reset');
    console.log('   3. Create new test accounts\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

listUsers();
