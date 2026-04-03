// Unified Authentication Routes
import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import Admin from '../models/Admin.js';
import Buyer from '../models/Buyer.js';
import Seller from '../models/Seller.js';
import { 
  generateOTP, 
  sendOTP, 
  createOTPRecord, 
  validateOTPRecord, 
  verifyOTP, 
  maskContact,
  identifyContactMethod 
} from '../services/otp.js';
import { sendPasswordResetEmail, sendEmailOTP } from '../services/email.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import { 
  validateLogin, 
  validateSendOTP, 
  validateVerifyOTP,
  validatePasswordReset 
} from '../middleware/validation.js';

const router = express.Router();

// Server session ID for tracking server restarts
let serverSessionId = crypto.randomUUID();
const serverStartTime = Date.now();

// GET /auth/server-session - Get server session ID to detect restarts
router.get('/server-session', (req, res) => {
  try {
    res.json({
      serverSessionId,
      serverStartTime,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error getting server session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /auth/login - Admin login with username/email and password
// Apply rate limiting and validation
router.post('/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Username/email and password are required' 
      });
    }

    // Find admin by username or email
    const admin = await Admin.findOne({
      $or: [
        { username: username.toLowerCase().trim() },
        { email: username.toLowerCase().trim() }
      ]
    });

    if (!admin) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Debug: Log admin data
    console.log('🔍 Admin found:', {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role
    });

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const tokenPayload = { id: admin._id, role: admin.role };
    console.log('🔍 Token payload being signed:', tokenPayload);
    
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Return admin data without password
    const adminData = {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role
    };

    console.log('🔍 Returning admin data:', adminData);

    res.json({
      message: 'Login successful',
      token,
      admin: adminData
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      message: 'Server error. Please try again later.' 
    });
  }
});

// POST /auth/send-otp - Send OTP via email or WhatsApp
// Apply rate limiting and validation
router.post('/send-otp', authLimiter, validateSendOTP, async (req, res) => {
  try {
    const { identifier, userType } = req.body;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'Email or WhatsApp number is required' 
      });
    }

    if (!userType || !['buyer', 'seller'].includes(userType)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid user type (buyer/seller) is required' 
      });
    }

    const cleanEmail = identifier.trim().toLowerCase();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please enter a valid email address' 
      });
    }

    // Find user based on type and email
    let user;
    if (userType === 'buyer') {
      user = await Buyer.findOne({ email: cleanEmail });
    } else {
      user = await Seller.findOne({ email: cleanEmail });
    }

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: `No ${userType} account found with this email address` 
      });
    }

    // Generate truly random OTP and create record
    const otp = generateOTP();
    const otpRecord = createOTPRecord(otp);

    // Save OTP to user record
    user.passwordResetOTP = otpRecord.otpHash;
    user.passwordResetOTPSalt = otpRecord.otpSalt;
    user.passwordResetOTPExpiry = otpRecord.otpExpiry;
    user.passwordResetOTPAttempts = 0;
    
    // Fix invalid status values before saving
    if (userType === 'seller' && user.status === 'approved') {
      user.status = 'verified';
    }
    
    await user.save();

    // Send OTP to email with timeout handling
    const userName = userType === 'buyer' ? user.getFullName() : user.username;
    
    try {
      const sendResult = await sendEmailOTP(cleanEmail, otp, userName);
      
      if (!sendResult.success) {
        // If email fails, still save OTP but inform user
        // In development, show OTP directly for testing
        if (process.env.NODE_ENV === 'development') {
          console.log(`\n🔢 =================================`);
          console.log(`📧 EMAIL: ${cleanEmail}`);
          console.log(`🔑 OTP: ${otp}`);
          console.log(`⏰ EXPIRES: 5 minutes`);
          console.log(`🔢 =================================\n`);
          
          return res.status(200).json({ 
            success: true,
            message: `Email delivery failed. Your OTP is: ${otp}`,
            contactInfo: maskContact(cleanEmail),
            method: 'email',
            expiresIn: '5 minutes',
            emailFailed: true,
            developmentOTP: otp
          });
        }
        
        return res.status(200).json({ 
          success: true,
          message: 'OTP generated but email delivery failed. Please contact support with your email address to get the OTP.',
          contactInfo: maskContact(cleanEmail),
          method: 'email',
          expiresIn: '5 minutes',
          emailFailed: true
        });
      }
    } catch (emailError) {
      // If email service fails completely, still save OTP
      // In development, show OTP directly for testing
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n🔢 =================================`);
        console.log(`📧 EMAIL: ${cleanEmail}`);
        console.log(`🔑 OTP: ${otp}`);
        console.log(`⏰ EXPIRES: 5 minutes`);
        console.log(`❌ EMAIL ERROR: ${emailError.message}`);
        console.log(`🔢 =================================\n`);
        
        return res.status(200).json({ 
          success: true,
          message: `Email service failed. Your OTP is: ${otp}`,
          contactInfo: maskContact(cleanEmail),
          method: 'email',
          expiresIn: '5 minutes',
          emailFailed: true,
          developmentOTP: otp
        });
      }
      
      return res.status(200).json({ 
        success: true,
        message: 'OTP generated but email service is temporarily unavailable. Please contact support.',
        contactInfo: maskContact(cleanEmail),
        method: 'email',
        expiresIn: '5 minutes',
        emailFailed: true
      });
    }
    
    res.json({
      success: true,
      message: 'OTP sent to your email',
      contactInfo: maskContact(cleanEmail),
      method: 'email',
      expiresIn: '5 minutes'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// POST /auth/verify-otp - Verify OTP
// Apply rate limiting and validation
router.post('/verify-otp', authLimiter, validateVerifyOTP, async (req, res) => {
  try {
    const { identifier, otp, userType } = req.body;

    if (!identifier || !otp || !userType) {
      return res.status(400).json({ 
        success: false,
        message: 'Identifier, OTP, and user type are required' 
      });
    }

    if (!['buyer', 'seller'].includes(userType)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid user type (buyer/seller) is required' 
      });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Find user
    let user;
    if (userType === 'buyer') {
      user = await Buyer.findOne({
        $or: [
          { email: cleanIdentifier },
          { whatsappNo: cleanIdentifier }
        ]
      });
    } else {
      user = await Seller.findOne({
        $or: [
          { username: cleanIdentifier },
          { email: cleanIdentifier },
          { whatsappNo: cleanIdentifier }
        ]
      });
    }

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Validate OTP record
    const validation = validateOTPRecord({
      otpHash: user.passwordResetOTP,
      otpSalt: user.passwordResetOTPSalt,
      otpExpiry: user.passwordResetOTPExpiry,
      otpAttempts: user.passwordResetOTPAttempts || 0,
      maxAttempts: 3
    });

    if (!validation.valid) {
      return res.status(400).json({ 
        success: false,
        message: validation.message 
      });
    }

    // Verify OTP
    const isValidOTP = verifyOTP(otp, user.passwordResetOTP, user.passwordResetOTPSalt);

    if (!isValidOTP) {
      // Increment failed attempts
      user.passwordResetOTPAttempts = (user.passwordResetOTPAttempts || 0) + 1;
      
      // Fix invalid status values before saving
      if (userType === 'seller' && user.status === 'approved') {
        user.status = 'verified';
      }
      
      await user.save();

      const remainingAttempts = 3 - user.passwordResetOTPAttempts;
      
      return res.status(400).json({ 
        success: false,
        message: remainingAttempts > 0 
          ? `Invalid OTP. ${remainingAttempts} attempts remaining.`
          : 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // OTP verified successfully
    res.json({
      success: true,
      message: 'OTP verified successfully',
      canResetPassword: true
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error. Please try again later.' 
    });
  }
});

// POST /auth/reset-password - Reset password after OTP verification
router.post('/reset-password', async (req, res) => {
  try {
    const { identifier, otp, newPassword, userType } = req.body;

    if (!identifier || !otp || !newPassword || !userType) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 8 characters long' 
      });
    }

    if (!['buyer', 'seller'].includes(userType)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid user type (buyer/seller) is required' 
      });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Find user
    let user;
    if (userType === 'buyer') {
      user = await Buyer.findOne({
        $or: [
          { email: cleanIdentifier },
          { whatsappNo: cleanIdentifier }
        ]
      });
    } else {
      user = await Seller.findOne({
        $or: [
          { username: cleanIdentifier },
          { email: cleanIdentifier },
          { whatsappNo: cleanIdentifier }
        ]
      });
    }

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Validate OTP record
    const validation = validateOTPRecord({
      otpHash: user.passwordResetOTP,
      otpSalt: user.passwordResetOTPSalt,
      otpExpiry: user.passwordResetOTPExpiry,
      otpAttempts: user.passwordResetOTPAttempts || 0,
      maxAttempts: 3
    });

    if (!validation.valid) {
      return res.status(400).json({ 
        success: false,
        message: validation.message 
      });
    }

    // Verify OTP one final time
    const isValidOTP = verifyOTP(otp, user.passwordResetOTP, user.passwordResetOTPSalt);

    if (!isValidOTP) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid OTP. Please verify OTP first.' 
      });
    }

    // Update password and clear OTP data
    user.password = newPassword; // Will be hashed by pre-save middleware
    user.passwordResetOTP = undefined;
    user.passwordResetOTPSalt = undefined;
    user.passwordResetOTPExpiry = undefined;
    user.passwordResetOTPAttempts = undefined;
    
    // Fix invalid status values before saving
    if (userType === 'seller' && user.status === 'approved') {
      user.status = 'verified';
    }
    
    await user.save();

    console.log(`✅ Password reset successful for ${userType}: ${user.email || user.username}`);

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error. Please try again later.' 
    });
  }
});

// ============================================
// TOKEN-BASED PASSWORD RESET ROUTES
// ============================================

// POST /auth/forgot-password - Send password reset link via email
// Apply stricter rate limiting for password reset
router.post('/forgot-password', passwordResetLimiter, validatePasswordReset, async (req, res) => {
  try {
    const { email, userType } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }

    if (!userType || !['buyer', 'seller', 'admin'].includes(userType)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid user type (buyer/seller/admin) is required' 
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find user based on type
    let user;
    let Model;
    if (userType === 'buyer') {
      Model = Buyer;
      user = await Buyer.findOne({ email: cleanEmail });
    } else if (userType === 'seller') {
      Model = Seller;
      user = await Seller.findOne({ email: cleanEmail });
    } else {
      Model = Admin;
      user = await Admin.findOne({ email: cleanEmail });
    }

    // Always return success message for security (don't reveal if email exists)
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    // Generate reset token using crypto
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token before saving to database
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save hashed token and expiry (10 minutes)
    user.passwordResetToken = hashedToken;
    user.passwordResetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Create reset URL with original (unhashed) token
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}?type=${userType}`;

    console.log('🔗 Generated reset URL:', resetUrl); // Debug log

    // Send email with reset link
    const userName = userType === 'buyer' 
      ? user.getFullName() 
      : userType === 'seller' 
        ? user.username 
        : user.username;

    const emailSent = await sendPasswordResetEmail(cleanEmail, userName, resetUrl);

    if (!emailSent) {
      // Clear the token if email fails
      user.passwordResetToken = undefined;
      user.passwordResetTokenExpiry = undefined;
      await user.save();

      return res.status(500).json({ 
        success: false,
        message: 'Failed to send reset email. Please try again later.' 
      });
    }

    // In development, also return the reset URL for testing
    const responseData = {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    };

    // Add development URL for testing (only in development)
    if (process.env.NODE_ENV !== 'production') {
      responseData.developmentUrl = resetUrl;
      console.log('🔧 Development reset URL:', resetUrl);
    }

    res.json(responseData);

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error. Please try again later.' 
    });
  }
});

// POST /auth/reset-password-token - Reset password using token from email link
router.post('/reset-password-token', async (req, res) => {
  try {
    const { token, newPassword, userType } = req.body;
    console.log('🔄 Password reset request:', { token: token?.substring(0, 10) + '...', userType });

    if (!token || !newPassword || !userType) {
      return res.status(400).json({ 
        success: false,
        message: 'Token, new password, and user type are required' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 8 characters long' 
      });
    }

    if (!['buyer', 'seller', 'admin'].includes(userType)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid user type (buyer/seller/admin) is required' 
      });
    }

    // Hash the token to match with database
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    console.log('🔍 Looking for user with hashed token...');

    // Find user with matching token and valid expiry
    let user;
    if (userType === 'buyer') {
      user = await Buyer.findOne({
        passwordResetToken: hashedToken,
        passwordResetTokenExpiry: { $gt: Date.now() }
      });
    } else if (userType === 'seller') {
      user = await Seller.findOne({
        passwordResetToken: hashedToken,
        passwordResetTokenExpiry: { $gt: Date.now() }
      });
    } else {
      user = await Admin.findOne({
        passwordResetToken: hashedToken,
        passwordResetTokenExpiry: { $gt: Date.now() }
      });
    }

    if (!user) {
      console.log('❌ No user found with valid reset token');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset link.' 
      });
    }

    console.log('✅ User found, updating password...');

    // Update password and clear reset token fields
    user.password = newPassword; // Will be hashed by pre-save middleware
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiry = undefined;
    await user.save();

    console.log('✅ Password reset successfully for user:', user.email);

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('❌ Password reset error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error. Please try again later.' 
    });
  }
});

// GET /auth/verify-reset-token - Verify if reset token is valid
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { type: userType } = req.query;
    console.log('🔍 Token verification request:', { token: token?.substring(0, 10) + '...', userType });

    if (!token || !userType) {
      return res.status(400).json({ 
        success: false,
        message: 'Token and user type are required' 
      });
    }

    if (!['buyer', 'seller', 'admin'].includes(userType)) {
      return res.status(400).json({ 
        success: false,
        message: 'Valid user type is required' 
      });
    }

    // Hash the token to match with database
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    console.log('🔍 Looking for user with hashed token for verification...');

    // Find user with matching token and valid expiry
    let user;
    if (userType === 'buyer') {
      user = await Buyer.findOne({
        passwordResetToken: hashedToken,
        passwordResetTokenExpiry: { $gt: Date.now() }
      });
    } else if (userType === 'seller') {
      user = await Seller.findOne({
        passwordResetToken: hashedToken,
        passwordResetTokenExpiry: { $gt: Date.now() }
      });
    } else {
      user = await Admin.findOne({
        passwordResetToken: hashedToken,
        passwordResetTokenExpiry: { $gt: Date.now() }
      });
    }

    if (!user) {
      console.log('❌ No user found with valid reset token for verification');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired reset token' 
      });
    }

    console.log('✅ Token verification successful for user:', user.email);

    res.json({
      success: true,
      message: 'Token is valid',
      email: user.email
    });

  } catch (error) {
    console.error('❌ Token verification error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error. Please try again later.' 
    });
  }
});

// GET /auth/debug-token - Debug endpoint to decode token (development only)
router.get('/debug-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(400).json({ 
        message: 'No token provided' 
      });
    }

    // Decode without verification to see what's inside
    const parts = token.split('.');
    if (parts.length !== 3) {
      return res.status(400).json({ 
        message: 'Invalid token format' 
      });
    }

    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    // Also try to verify it
    let verified = null;
    try {
      verified = jwt.verify(token, process.env.JWT_SECRET);
    } catch (verifyError) {
      verified = { error: verifyError.message };
    }

    res.json({
      header,
      payload,
      verified,
      tokenLength: token.length,
      hasSecret: !!process.env.JWT_SECRET
    });

  } catch (error) {
    console.error('Debug token error:', error);
    res.status(500).json({ 
      message: 'Debug error',
      error: error.message 
    });
  }
});

// POST /auth/verify - Verify JWT token for any user type
router.post('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { userType } = req.body;
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided' 
      });
    }

    if (!userType || !['admin', 'seller', 'buyer'].includes(userType)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid user type' 
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify the role matches the requested user type
    // For admin userType, accept both 'admin' and 'superadmin' roles
    let roleMatches = false;
    if (userType === 'admin') {
      roleMatches = decoded.role === 'admin' || decoded.role === 'superadmin';
    } else {
      roleMatches = decoded.role === userType;
    }
    
    if (!roleMatches) {
      console.log(`Token role mismatch: expected ${userType}, got ${decoded.role}`);
      return res.status(401).json({ 
        success: false,
        message: `Token role mismatch: expected ${userType}, got ${decoded.role}` 
      });
    }

    let user;
    
    // Find user by type and ID
    if (userType === 'admin') {
      user = await Admin.findById(decoded.id).select('-password');
    } else if (userType === 'seller') {
      user = await Seller.findById(decoded.id).select('-password');
    } else if (userType === 'buyer') {
      user = await Buyer.findById(decoded.id).select('-password');
    }
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: `${userType} not found` 
      });
    }

    // Return user data with role
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: decoded.role,
        ...user.toObject()
      },
      role: decoded.role
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired' 
      });
    }

    console.error('Token verification error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// POST /auth/refresh - Refresh JWT token
router.post('/refresh', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided' 
      });
    }

    // Try to decode token even if expired
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        // Token is expired but we can still decode it
        decoded = jwt.decode(token);
      } else {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid token' 
        });
      }
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token payload' 
      });
    }

    // Find admin by ID
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: 'Admin not found' 
      });
    }

    // Generate new token
    const newToken = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Return new token and admin data
    res.json({
      success: true,
      token: newToken,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Admin: Get all payment verifications
router.get('/admin/payment-verifications', async (req, res) => {
  try {
    // Verify admin token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ message: 'Invalid admin token' });
    }

    const PaymentVerification = (await import('../models/PaymentVerification.js')).default;
    
    const { status = 'all', page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status !== 'all') {
      query.status = status;
    }

    const verifications = await PaymentVerification.find(query)
      .populate('buyerId', 'firstName lastName email')
      .populate('reviewedBy', 'username')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PaymentVerification.countDocuments(query);

    res.json({
      success: true,
      verifications,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: total
      }
    });

  } catch (error) {
    console.error('Get payment verifications error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Approve/Reject payment verification
router.put('/admin/payment-verifications/:id', async (req, res) => {
  try {
    // Verify admin token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ message: 'Invalid admin token' });
    }

    const { status, adminNotes } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const PaymentVerification = (await import('../models/PaymentVerification.js')).default;
    
    const verification = await PaymentVerification.findById(req.params.id);
    if (!verification) {
      return res.status(404).json({ message: 'Payment verification not found' });
    }

    if (verification.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending verifications can be updated' });
    }

    verification.status = status;
    verification.adminNotes = adminNotes || '';
    verification.reviewedAt = new Date();
    verification.reviewedBy = admin._id;

    await verification.save();

    // If approved, update buyer's supplier unlock status
    if (status === 'approved') {
      const Buyer = (await import('../models/Buyer.js')).default;
      await Buyer.findByIdAndUpdate(verification.buyerId, {
        $set: { supplierUnlocked: true }
      });
    }

    res.json({
      success: true,
      message: `Payment verification ${status} successfully`,
      verification
    });

  } catch (error) {
    console.error('Update payment verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Generate temporary file access token
router.post('/admin/payment-verification-file-token', async (req, res) => {
  try {
    // Verify admin token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ message: 'Invalid admin token' });
    }

    const { filename } = req.body;
    
    // Generate temporary token valid for 5 minutes
    const tempToken = jwt.sign(
      { filename, adminId: admin._id, type: 'file_access' },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    res.json({ success: true, tempToken });
  } catch (error) {
    console.error('Error generating file token:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Serve payment verification files with temporary token
router.get('/admin/payment-verification-file/:filename/:tempToken', async (req, res) => {
  try {
    const { filename, tempToken } = req.params;
    
    // Verify temporary token
    const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    if (decoded.type !== 'file_access' || decoded.filename !== filename) {
      return res.status(401).json({ message: 'Invalid file access token' });
    }

    const filePath = path.join(process.cwd(), 'uploads', 'payment-verifications', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Serve the file
    res.sendFile(filePath);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'File access token expired' });
    }
    console.error('Error serving payment verification file:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Serve payment verification files
router.get('/admin/payment-verification-file/:filename', async (req, res) => {
  try {
    // Verify admin token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ message: 'Invalid admin token' });
    }

    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', 'payment-verifications', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Serve the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving payment verification file:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
