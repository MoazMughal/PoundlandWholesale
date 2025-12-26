// Unified Authentication Routes
import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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

const router = express.Router();

// POST /auth/login - Admin login with username/email and password
router.post('/login', async (req, res) => {
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

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return admin data without password
    const adminData = {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role
    };

    res.json({
      message: 'Login successful',
      token,
      admin: adminData
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Server error. Please try again later.' 
    });
  }
});

// POST /auth/send-otp - Send OTP via email or WhatsApp
router.post('/send-otp', async (req, res) => {
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
        if (process.env.NODE_ENV !== 'production') {
          console.log(`🔢 OTP for ${cleanEmail}: ${otp} (Email delivery failed)`);
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
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔢 OTP for ${cleanEmail}: ${otp} (Email service failed)`);
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
router.post('/verify-otp', async (req, res) => {
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
router.post('/forgot-password', async (req, res) => {
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
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}?type=${userType}`;

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

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });

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
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset link.' 
      });
    }

    // Update password and clear reset token fields
    user.password = newPassword; // Will be hashed by pre-save middleware
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiry = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (error) {
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
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired reset token' 
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      email: user.email
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error. Please try again later.' 
    });
  }
});

// GET /auth/verify - Verify JWT token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided' 
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find admin by ID
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: 'Admin not found' 
      });
    }

    // Return admin data
    res.json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
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
      { expiresIn: '7d' }
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

export default router;
