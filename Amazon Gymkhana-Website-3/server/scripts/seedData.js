import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import Seller from '../models/Seller.js';

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create test seller
    const seller = new Seller({
      businessName: 'Test Fitness Store',
      email: 'seller@test.com',
      password: 'seller123',
      phone: '1234567890',
      address: 'Test Address',
      status: 'pending',
      paymentVerified: false,
      paymentDetails: {
        accountNumber: '1234567890',
        bankName: 'Test Bank',
        ifscCode: 'TEST0001234'
      }
    });
    await seller.save();
    console.log('Test seller created');

    // Create test products
    const products = [
      {
        name: 'Premium Yoga Mat',
        description: 'High-quality non-slip yoga mat',
        price: 1299,
        originalPrice: 1999,
        discount: 35,
        category: 'Yoga',
        brand: 'FitPro',
        rating: 4.5,
        reviews: 120,
        stock: 50,
        seller: seller._id,
        status: 'pending'
      },
      {
        name: 'Adjustable Dumbbells Set',
        description: '20kg adjustable dumbbell set',
        price: 2499,
        originalPrice: 3499,
        discount: 29,
        category: 'Strength Training',
        brand: 'PowerFit',
        rating: 4.7,
        reviews: 85,
        stock: 30,
        seller: seller._id,
        status: 'pending'
      },
      {
        name: 'Resistance Bands Set',
        description: 'Set of 5 resistance bands',
        price: 599,
        originalPrice: 999,
        discount: 40,
        category: 'Accessories',
        brand: 'FlexBand',
        rating: 4.3,
        reviews: 200,
        stock: 100,
        seller: seller._id,
        status: 'active'
      }
    ];

    await Product.insertMany(products);
    console.log('Test products created');

    console.log('\nTest data seeded successfully!');
    console.log('Seller email: seller@test.com');
    console.log('Seller password: seller123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
