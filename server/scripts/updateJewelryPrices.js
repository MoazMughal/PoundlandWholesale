import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

const updateJewelryPrices = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Update all jewelry products
    const result = await Product.updateMany(
      { 
        $or: [
          { category: 'jewelry' },
          { category: 'Jewelry' },
          { name: { $regex: /nose ring/i } },
          { name: { $regex: /jewelry/i } },
          { name: { $regex: /jewellery/i } }
        ]
      },
      {
        $set: {
          price: 99,
          originalPrice: 1299,
          rrp: 1299,
          discount: Math.round(((1299 - 99) / 1299) * 100)
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} jewelry products`);
    console.log('All jewelry prices updated to:');
    console.log('- Price: 99 RS');
    console.log('- RRP: 1299 RS');
    console.log(`- Discount: ${Math.round(((1299 - 99) / 1299) * 100)}%`);

    // Display updated products
    const updatedProducts = await Product.find({
      $or: [
        { category: 'jewelry' },
        { category: 'Jewelry' },
        { name: { $regex: /nose ring/i } }
      ]
    }).select('name price originalPrice rrp category');

    console.log('\nUpdated products:');
    updatedProducts.forEach(p => {
      console.log(`- ${p.name}: ${p.price} RS (RRP: ${p.rrp || p.originalPrice} RS)`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error updating jewelry prices:', error);
    process.exit(1);
  }
};

updateJewelryPrices();
