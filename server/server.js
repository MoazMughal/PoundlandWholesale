import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import sellerRoutes from './routes/sellers.js';
import dashboardRoutes from './routes/dashboard.js';
import excelRoutes from './routes/excel.js';
import adminExcelRoutes from './routes/admin-excel.js';
import buyerRoutes from './routes/buyer.js';
import easypaisaRoutes from './routes/easypaisa.js';
import bulkUploadRoutes from './routes/bulk-upload-cloudinary.js';
import cloudinaryTestRoutes from './routes/cloudinary-test.js';
import imageTestRoutes from './routes/image-test.js';

dotenv.config();

const app = express();

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files (uploaded images) for both development and production
// Serve uploaded images from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Enable gzip compression for all responses
app.use(compression());

// CORS configuration for both development and production
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173', 
    'https://www.genericwholesale.pk',
    'https://genericwholesale.pk',
    'https://genericwholesale.co.uk',
    'https://www.genericwholesale.co.uk',
    'https://generic-wholesale-frontend.onrender.com',
    process.env.FRONTEND_URL
  ].filter(Boolean), // Remove any undefined values
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
// Increase payload limit for large Excel uploads and image uploads (base64 encoded images can be large)
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ extended: true, limit: '1gb' }));

// Enhanced MongoDB connection with comprehensive error handling and fallbacks
// Only show essential connection info in production

// Connection options optimized for Atlas free tier and production
const mongoOptions = {
  maxPoolSize: process.env.NODE_ENV === 'production' ? 5 : 10, // Smaller pool for free tier
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  serverSelectionTimeoutMS: 20000, // Increased for production
  socketTimeoutMS: 60000, // Increased for production
  connectTimeoutMS: 20000, // Increased for production
  heartbeatFrequencyMS: 10000,
  family: 4, // Use IPv4
  retryWrites: true,
  w: 'majority'
};

// Connection retry mechanism
let connectionAttempts = 0;
const maxRetries = 3;

async function connectWithRetry() {
  try {
    connectionAttempts++;
    
    await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
    
    // Only show essential connection info
    console.log('✅ MongoDB connected successfully');
    
    // Test the connection with a simple query
    const testResult = await mongoose.connection.db.admin().ping();
    
  } catch (err) {
    console.error(`❌ MongoDB connection attempt ${connectionAttempts} failed:`, err.message);
    
    if (connectionAttempts < maxRetries) {
      const delay = connectionAttempts * 2000; // Exponential backoff
      setTimeout(connectWithRetry, delay);
    } else {
      console.error('💥 MongoDB connection failed after all attempts');
    }
  }
}

// Handle connection events
mongoose.connection.on('connected', () => {
  // Connected successfully
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🟡 Mongoose disconnected from MongoDB');
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔒 MongoDB connection closed through app termination');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error closing MongoDB connection:', err);
    process.exit(1);
  }
});

// Start connection
connectWithRetry();

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/excel', excelRoutes);
app.use('/api/admin-excel', adminExcelRoutes);
app.use('/api/buyer', buyerRoutes);
app.use('/api/easypaisa', easypaisaRoutes);
app.use('/api/bulk-upload', bulkUploadRoutes);
app.use('/api/cloudinary-test', cloudinaryTestRoutes);
app.use('/api/image-test', imageTestRoutes);

// Server startup time for restart detection
const serverStartTime = Date.now();

// Enhanced health check endpoint with database status and startup time
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    serverStartTime: serverStartTime, // Add server start time for restart detection
    environment: process.env.NODE_ENV,
    database: {
      connected: mongoose.connection.readyState === 1,
      state: mongoose.connection.readyState,
      stateDescription: {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      }[mongoose.connection.readyState]
    }
  };

  // Test database connection if connected
  if (mongoose.connection.readyState === 1) {
    try {
      const pingResult = await mongoose.connection.db.admin().ping();
      health.database.ping = pingResult;
      health.database.lastPing = new Date().toISOString();
    } catch (error) {
      health.database.pingError = error.message;
      health.status = 'degraded';
    }
  } else {
    health.status = 'degraded';
    health.message = 'Database not connected';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Test endpoint for email service
app.post('/api/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Import email service
    const { sendEmailOTP, testEmailConnection } = await import('./services/email.js');
    
    // Test connection first
    const connectionTest = await testEmailConnection();
    if (!connectionTest.success) {
      return res.status(500).json({
        success: false,
        message: `Email connection failed: ${connectionTest.message}`
      });
    }

    // Send test OTP
    const testOTP = '123456';
    const result = await sendEmailOTP(email, testOTP, 'Test User');
    
    res.json({
      success: result.success,
      message: result.message,
      connectionTest: connectionTest.message
    });
    
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Database connection test endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test connection state
    const connectionState = mongoose.connection.readyState;
    const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Database test requested - Connection state:', stateNames[connectionState]);
    }
    
    if (connectionState !== 1) {
      console.error('❌ Database not connected:', stateNames[connectionState]);
      return res.status(503).json({
        success: false,
        message: `Database ${stateNames[connectionState]}`,
        connectionState,
        mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not set',
        suggestion: 'Database is not connected. Check MongoDB Atlas status.'
      });
    }
    
    // Test ping
    const pingResult = await mongoose.connection.db.admin().ping();
    const pingTime = Date.now() - startTime;
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Database ping successful:', pingTime + 'ms');
    }
    
    // Test simple query
    const queryStart = Date.now();
    const productCount = await mongoose.connection.db.collection('products').countDocuments({ status: 'active' });
    const amazonsChoiceCount = await mongoose.connection.db.collection('products').countDocuments({ 
      status: 'active', 
      isAmazonsChoice: true 
    });
    const queryTime = Date.now() - queryStart;
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Database query successful:', queryTime + 'ms', 'Products:', productCount, 'Amazon Choice:', amazonsChoiceCount);
    }
    
    res.json({
      success: true,
      message: 'Database connection healthy',
      environment: process.env.NODE_ENV,
      tests: {
        ping: { success: true, time: pingTime, result: pingResult },
        query: { success: true, time: queryTime, productCount, amazonsChoiceCount },
        connection: { state: stateNames[connectionState], readyState: connectionState }
      },
      totalTime: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection test failed',
      error: error.message,
      mongoUri: process.env.MONGODB_URI ? 'Set' : 'Not set',
      suggestion: 'Check MongoDB Atlas connection string and network access'
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
