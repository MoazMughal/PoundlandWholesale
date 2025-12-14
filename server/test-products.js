import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';

dotenv.config();

console.log('🔄 Testing products query...');

mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 15000,
  heartbeatFrequencyMS: 10000,
  family: 4
})
.then(async () => {
  console.log('✅ Connected to MongoDB');
  
  try {
    // Test Amazon Choice products query
    console.log('🔍 Testing Amazon Choice products query...');
    const startTime = Date.now();
    
    const products = await Product.find({ 
      status: 'active',
      isAmazonsChoice: true,
      originalAdminProductId: { $exists: false }
    })
    .select('name price category isAmazonsChoice')
    .limit(10)
    .maxTimeMS(10000)
    .lean();
    
    const queryTime = Date.now() - startTime;
    
    console.log(`✅ Query successful: ${products.length} products in ${queryTime}ms`);
    console.log('📦 Sample products:');
    products.slice(0, 3).forEach(p => {
      console.log(`  - ${p.name} (£${p.price}) - ${p.category}`);
    });
    
    // Test total count
    const totalCount = await Product.countDocuments({ 
      status: 'active',
      isAmazonsChoice: true,
      originalAdminProductId: { $exists: false }
    }).maxTimeMS(5000);
    
    console.log(`📊 Total Amazon Choice products: ${totalCount}`);
    
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    console.error('Error details:', {
      name: error.name,
      code: error.code,
      codeName: error.codeName
    });
  }
  
  process.exit(0);
})
.catch(err => {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
});