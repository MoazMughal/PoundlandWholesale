import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔄 Testing MongoDB connection...');
console.log('📍 URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');

mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  connectTimeoutMS: 30000
})
.then(() => {
  console.log('✅ MongoDB connected successfully!');
  console.log('🏪 Database:', mongoose.connection.db.databaseName);
  
  // Test a simple query
  return mongoose.connection.db.collection('products').countDocuments();
})
.then(count => {
  console.log(`📦 Products in database: ${count}`);
  process.exit(0);
})
.catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
  process.exit(1);
});