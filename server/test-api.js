import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';

dotenv.config();

const app = express();
app.use(express.json());

// Simple test endpoint
app.get('/test-products', async (req, res) => {
  try {
    console.log('🔍 Testing products API...');
    const startTime = Date.now();
    
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000
      });
    }
    
    // Query Amazon Choice products
    const products = await Product.find({
      status: 'active',
      isAmazonsChoice: true,
      originalAdminProductId: { $exists: false }
    })
    .select('name price originalPrice category brand images rating reviews stock isAmazonsChoice dealUnits')
    .limit(10)
    .maxTimeMS(10000)
    .lean();
    
    const queryTime = Date.now() - startTime;
    
    console.log(`✅ Found ${products.length} products in ${queryTime}ms`);
    
    res.json({
      success: true,
      products: products,
      totalPages: 1,
      currentPage: 1,
      total: products.length,
      source: 'database',
      responseTime: queryTime
    });
    
  } catch (error) {
    console.error('❌ API Test Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      products: [],
      source: 'error'
    });
  }
});

const PORT = 5001; // Use different port to avoid conflicts
app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📡 Test URL: http://localhost:${PORT}/test-products`);
});