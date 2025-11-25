import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

const checkProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const products = await Product.find({
      $or: [
        { name: { $regex: /nose ring/i } },
        { name: { $regex: /bulb/i } },
        { name: { $regex: /fuse/i } },
        { name: { $regex: /lampshade/i } }
      ]
    }).select('name category price').limit(10);

    console.log('\nFound products that should show profit calculations:');
    console.log('Total:', products.length);
    products.forEach(p => {
      console.log(`- ${p.name} (${p.category}) - ${p.price} PKR`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkProducts();
