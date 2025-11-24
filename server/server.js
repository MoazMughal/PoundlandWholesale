import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import sellerRoutes from './routes/sellers.js';
import dashboardRoutes from './routes/dashboard.js';
import excelRoutes from './routes/excel.js';
import buyerRoutes from './routes/buyer.js';
import easypaisaRoutes from './routes/easypaisa.js';

dotenv.config();

const app = express();

// Enable gzip compression for all responses
app.use(compression());

// CORS configuration for both development and production
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173', 
    'https://www.genericwholesale.pk',
    'https://generic-wholesale-frontend.onrender.com',
    process.env.FRONTEND_URL
  ].filter(Boolean), // Remove any undefined values
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
// Increase payload limit for image uploads (base64 encoded images can be large)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB connection with optimizations
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2,  // Minimum number of connections
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  serverSelectionTimeoutMS: 5000, // Timeout for server selection
  family: 4 // Use IPv4, skip trying IPv6
})
  .then(() => console.log('✅ MongoDB connected with connection pooling'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/excel', excelRoutes);
app.use('/api/buyer', buyerRoutes);
app.use('/api/easypaisa', easypaisaRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
