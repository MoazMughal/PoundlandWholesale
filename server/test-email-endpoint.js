import express from 'express';
import { sendEmailOTP, testEmailConnection } from './services/email.js';

const router = express.Router();

// Test email configuration
router.get('/test-email-config', async (req, res) => {
  try {
    console.log('🧪 Testing email configuration...');
    
    const config = {
      EMAIL_HOST: process.env.EMAIL_HOST,
      EMAIL_PORT: process.env.EMAIL_PORT,
      EMAIL_SECURE: process.env.EMAIL_SECURE,
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS ? '***configured***' : 'NOT SET',
      EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
      FRONTEND_URL: process.env.FRONTEND_URL
    };
    
    console.log('📧 Email Configuration:', config);
    
    const connectionTest = await testEmailConnection();
    
    res.json({
      message: 'Email configuration test',
      config: config,
      connectionTest: connectionTest,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Email test error:', error);
    res.status(500).json({
      message: 'Email test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test sending OTP
router.post('/test-send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    console.log(`🧪 Testing OTP send to: ${email}`);
    
    const testOTP = '123456';
    const result = await sendEmailOTP(email, testOTP, 'Test User');
    
    res.json({
      message: 'OTP send test completed',
      result: result,
      email: email,
      otp: testOTP,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ OTP send test error:', error);
    res.status(500).json({
      message: 'OTP send test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;