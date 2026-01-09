import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Seller from '../models/Seller.js';

dotenv.config();

const fixSellerStatus = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all sellers with invalid status 'approved'
    const sellersWithInvalidStatus = await Seller.find({ status: 'approved' });
    
    console.log(`Found ${sellersWithInvalidStatus.length} sellers with invalid status 'approved'`);

    if (sellersWithInvalidStatus.length === 0) {
      console.log('✅ No sellers need status correction');
      process.exit(0);
    }

    // Update all sellers with status 'approved' to 'verified'
    const result = await Seller.updateMany(
      { status: 'approved' },
      { 
        $set: { 
          status: 'verified',
          verificationStatus: 'approved'
        } 
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} sellers`);
    console.log('   - Changed status from "approved" to "verified"');
    console.log('   - Set verificationStatus to "approved"');

    // Verify the fix
    const remainingInvalid = await Seller.find({ status: 'approved' });
    if (remainingInvalid.length === 0) {
      console.log('✅ All seller statuses have been corrected!');
    } else {
      console.log(`⚠️  Warning: ${remainingInvalid.length} sellers still have invalid status`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing seller status:', error);
    process.exit(1);
  }
};

fixSellerStatus();
