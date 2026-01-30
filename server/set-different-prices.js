// Script to set different prices for Maaz and Qasim to test individual pricing
import mongoose from 'mongoose';
import Product from './models/Product.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const setDifferentPrices = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the Travel Folding Hair Brush product
    const product = await Product.findOne({ 
      name: { $regex: 'Travel.*Hair.*Brush', $options: 'i' }
    });

    if (!product) {
      console.log('❌ Travel Folding Hair Brush product not found');
      return;
    }

    console.log('🔍 Current product state BEFORE setting prices:');
    console.log('- Product ID:', product._id);
    console.log('- Sellers array length:', product.sellers?.length || 0);
    if (product.sellers && product.sellers.length > 0) {
      product.sellers.forEach((seller, index) => {
        console.log(`  ${index + 1}. ${seller.username} - Price: £${seller.sellerPrice || 'null'}`);
      });
    }

    // Set different prices for each seller
    if (product.sellers && product.sellers.length >= 2) {
      // Maaz Javed - set to £15.99 (lower price)
      const maazIndex = product.sellers.findIndex(s => s.username === 'Maaz Javed');
      if (maazIndex !== -1) {
        product.sellers[maazIndex].sellerPrice = 15.99;
        console.log('✅ Set Maaz Javed price to £15.99');
      }

      // Qasim Shahzad - set to £18.50 (higher price)
      const qasimIndex = product.sellers.findIndex(s => s.username === 'Qasim Shahzad');
      if (qasimIndex !== -1) {
        product.sellers[qasimIndex].sellerPrice = 18.50;
        console.log('✅ Set Qasim Shahzad price to £18.50');
      }

      // Also update the primary sellerInfo if it exists (for Maaz since he's primary)
      if (product.sellerInfo && maazIndex !== -1) {
        product.sellerInfo.sellerPrice = 15.99;
        console.log('✅ Updated primary sellerInfo price for consistency');
      }

      // Save the product
      await product.save();

      console.log('\n✅ PRICES SET SUCCESSFULLY!');
      console.log('🔍 Product state AFTER setting prices:');
      console.log('- Sellers array length:', product.sellers?.length || 0);
      if (product.sellers && product.sellers.length > 0) {
        product.sellers.forEach((seller, index) => {
          console.log(`  ${index + 1}. ${seller.username} - Price: £${seller.sellerPrice || 'null'}`);
        });
      }

      console.log('\n🎯 EXPECTED BEHAVIOR:');
      console.log('- Maaz Javed should show £15.99 (lowest price, appears first)');
      console.log('- Qasim Shahzad should show £18.50 (higher price, appears second)');
      console.log('- Maaz\'s price should cross out any higher admin price');
      console.log('- Each seller should be able to update only their own price');

    } else {
      console.log('❌ Not enough sellers found to set different prices');
    }

    mongoose.disconnect();
    console.log('\n✅ Price setting completed');

  } catch (error) {
    console.error('❌ Error setting prices:', error);
    mongoose.disconnect();
  }
};

setDifferentPrices();