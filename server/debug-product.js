// Script to debug the specific product showing in the screenshot
import mongoose from 'mongoose';
import Product from './models/Product.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const debugProduct = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the specific product from the screenshot
    const productName = "Travel Folding Hair Brush - Collapsible Pocket Size, Mini Travel Brush, Massage Comb, Compact Hair Styling Tool for Gym, Trip, Purse, Swimming (Removable Mirror)";
    
    const product = await Product.findOne({ 
      name: { $regex: productName.substring(0, 50), $options: 'i' }
    });

    if (product) {
      console.log('🔍 Found product:', product.name);
      console.log('📋 Product details:');
      console.log('- ID:', product._id);
      console.log('- Seller ID:', product.seller);
      console.log('- Has sellerInfo:', !!product.sellerInfo);
      console.log('- SellerInfo details:', product.sellerInfo);
      console.log('- Is Admin Product:', product.isAdminProduct);
      console.log('- Original Product ID:', product.originalProductId);
      console.log('- Original Admin Product ID:', product.originalAdminProductId);
      console.log('- Status:', product.status);
      console.log('- Approval Status:', product.approvalStatus);
      console.log('- Created At:', product.createdAt);
      console.log('- Listed At:', product.listedAt);
      console.log('- Has sellers array:', !!product.sellers);
      console.log('- Sellers array length:', product.sellers?.length || 0);
      console.log('- Sellers array details:', product.sellers);
      
      // Check if there's a seller with this ID
      if (product.seller) {
        console.log('\n🔍 Checking if seller exists...');
        try {
          const Seller = (await import('./models/Seller.js')).default;
          const seller = await Seller.findById(product.seller);
          if (seller) {
            console.log('✅ Seller found:');
            console.log('- Username:', seller.username);
            console.log('- Email:', seller.email);
            console.log('- Verification Status:', seller.verificationStatus);
            console.log('- WhatsApp:', seller.whatsappNo);
            console.log('- City:', seller.city);
            console.log('- Country:', seller.country);
          } else {
            console.log('❌ Seller not found in database');
          }
        } catch (sellerError) {
          console.log('❌ Error fetching seller:', sellerError.message);
        }
      } else {
        console.log('❌ No seller ID assigned to this product');
      }
      
      // Also search for products with Qasim Shahzad
      console.log('\n🔍 Searching for products with Qasim Shahzad...');
      const qasimProducts = await Product.find({ 
        $or: [
          { 'sellerInfo.username': { $regex: 'Qasim', $options: 'i' } },
          { 'sellers.username': { $regex: 'Qasim', $options: 'i' } }
        ]
      }).limit(10);
      
      console.log(`Found ${qasimProducts.length} products with Qasim:`);
      qasimProducts.forEach((p, index) => {
        console.log(`${index + 1}. ${p.name.substring(0, 80)}...`);
        console.log(`   - Seller: ${p.seller || 'None'}`);
        console.log(`   - SellerInfo username: ${p.sellerInfo?.username || 'None'}`);
        console.log(`   - Sellers array length: ${p.sellers?.length || 0}`);
        if (p.sellers && p.sellers.length > 0) {
          p.sellers.forEach((seller, idx) => {
            console.log(`     Seller ${idx + 1}: ${seller.username}`);
          });
        }
      });
      
    } else {
      console.log('❌ Product not found');
      
      // Search for similar products
      console.log('\n🔍 Searching for similar products...');
      const similarProducts = await Product.find({ 
        name: { $regex: 'Travel.*Hair.*Brush', $options: 'i' }
      }).limit(5);
      
      console.log(`Found ${similarProducts.length} similar products:`);
      similarProducts.forEach((p, index) => {
        console.log(`${index + 1}. ${p.name}`);
        console.log(`   - Seller: ${p.seller || 'None'}`);
        console.log(`   - Has sellerInfo: ${!!p.sellerInfo}`);
        console.log(`   - SellerInfo username: ${p.sellerInfo?.username || 'None'}`);
        console.log(`   - Sellers array length: ${p.sellers?.length || 0}`);
      });
      
      // Also search for products with Qasim Shahzad
      console.log('\n🔍 Searching for products with Qasim Shahzad...');
      const qasimProducts = await Product.find({ 
        $or: [
          { 'sellerInfo.username': { $regex: 'Qasim', $options: 'i' } },
          { 'sellers.username': { $regex: 'Qasim', $options: 'i' } }
        ]
      }).limit(10);
      
      console.log(`Found ${qasimProducts.length} products with Qasim:`);
      qasimProducts.forEach((p, index) => {
        console.log(`${index + 1}. ${p.name.substring(0, 80)}...`);
        console.log(`   - Seller: ${p.seller || 'None'}`);
        console.log(`   - SellerInfo username: ${p.sellerInfo?.username || 'None'}`);
        console.log(`   - Sellers array length: ${p.sellers?.length || 0}`);
        if (p.sellers && p.sellers.length > 0) {
          p.sellers.forEach((seller, idx) => {
            console.log(`     Seller ${idx + 1}: ${seller.username}`);
          });
        }
      });
    }

    mongoose.disconnect();
    console.log('\n✅ Debug completed');

  } catch (error) {
    console.error('❌ Error debugging product:', error);
    mongoose.disconnect();
  }
};

debugProduct();