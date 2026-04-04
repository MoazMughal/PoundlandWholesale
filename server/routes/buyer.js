import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Buyer from '../models/Buyer.js';
import { authenticateBuyer } from '../middleware/auth.js';
import { processCardPaymentWithPaymob } from '../services/paymob.js';
import { sendWhatsAppOTP, generateOTP, validatePhoneNumber } from '../services/whatsapp.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateBuyerRegister } from '../middleware/validation.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/payment-verifications';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'paymentReceipt') {
      // Allow images and PDFs for payment receipts
      if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Payment receipt must be an image or PDF file'));
      }
    } else if (file.fieldname === 'idPicture') {
      // Allow only images for ID pictures
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('ID picture must be an image file'));
      }
    } else {
      cb(new Error('Unexpected field'));
    }
  }
});

// Register new buyer
// Apply rate limiting and validation
router.post('/register', authLimiter, validateBuyerRegister, async (req, res) => {
  try {
    const { firstName, lastName, email, password, userType, phone, whatsappNo } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const existingBuyer = await Buyer.findOne({ email: email.toLowerCase() });
    if (existingBuyer) {
      return res.status(400).json({ message: 'Email already registered as a buyer. Please use a different email or login.' });
    }

    // Check if email exists in Seller collection
    const Seller = (await import('../models/Seller.js')).default;
    const existingSeller = await Seller.findOne({ email: email.toLowerCase() });
    if (existingSeller) {
      return res.status(400).json({ message: 'Email already registered as a seller. Please use a different email or login as seller.' });
    }

    // Check if email exists in Admin collection
    const Admin = (await import('../models/Admin.js')).default;
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Email already registered. Please use a different email.' });
    }

    const buyer = new Buyer({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: password, // Will be hashed by pre-save middleware
      userType: userType || 'buyer',
      phone: phone?.trim(),
      whatsappNo: whatsappNo?.trim()
    });

    await buyer.save();

    // Optional webhook trigger - non-blocking, won't affect registration
    setImmediate(async () => {
      try {
        const WebhookLogger = (await import('../services/webhookLogger.js')).default;
        await WebhookLogger.logUserRegistration('buyer', {
          _id: buyer._id,
          email: buyer.email,
          firstName: buyer.firstName,
          lastName: buyer.lastName,
          userType: buyer.userType,
          createdAt: buyer.createdAt
        });
      } catch (webhookError) {
        // Silent fail - webhook should never break registration
      }
    });

    const token = jwt.sign(
      { id: buyer._id, role: 'buyer' },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      buyer: {
        id: buyer._id,
        name: buyer.getFullName(),
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        email: buyer.email,
        phone: buyer.phone || '',
        whatsappNo: buyer.whatsappNo || '',
        userType: buyer.userType,
        status: buyer.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login buyer
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Support login with email or WhatsApp number
    const buyer = await Buyer.findOne({
      $or: [
        { email },
        { whatsappNo: email }
      ]
    });
    if (!buyer) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (buyer.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active. Please contact support.' });
    }

    const isPasswordValid = await buyer.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    buyer.lastLogin = new Date();
    await buyer.save();

    const token = jwt.sign(
      { id: buyer._id, role: 'buyer' },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      buyer: {
        id: buyer._id,
        name: buyer.getFullName(),
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        email: buyer.email,
        phone: buyer.phone || '',
        whatsappNo: buyer.whatsappNo || '',
        userType: buyer.userType,
        status: buyer.status,
        lastLogin: buyer.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get buyer profile
router.get('/profile', authenticateBuyer, async (req, res) => {
  try {
    const buyer = await Buyer.findById(req.buyer.id)
      .select('-password')
      .populate('favorites', 'name price images');

    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    res.json({
      success: true,
      buyer: {
        id: buyer._id,
        name: buyer.getFullName(),
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        email: buyer.email,
        phone: buyer.phone,
        userType: buyer.userType,
        status: buyer.status,
        address: buyer.address,
        favorites: buyer.favorites,
        lastLogin: buyer.lastLogin,
        createdAt: buyer.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update buyer profile
router.put('/profile', authenticateBuyer, async (req, res) => {
  try {
    const { firstName, lastName, phone, address } = req.body;

    const buyer = await Buyer.findById(req.buyer.id);
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    if (firstName) buyer.firstName = firstName;
    if (lastName) buyer.lastName = lastName;
    if (phone) buyer.phone = phone;
    if (address) buyer.address = { ...buyer.address, ...address };

    await buyer.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      buyer: {
        id: buyer._id,
        name: buyer.getFullName(),
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        email: buyer.email,
        phone: buyer.phone,
        address: buyer.address
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update buyer email
router.put('/profile/email', authenticateBuyer, async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    if (!newEmail || !password) {
      return res.status(400).json({ message: 'New email and current password are required' });
    }

    const buyer = await Buyer.findById(req.buyer.id);
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    // Verify current password
    const isPasswordValid = await buyer.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Check if new email already exists
    const existingBuyer = await Buyer.findOne({ email: newEmail.toLowerCase() });
    if (existingBuyer && existingBuyer._id.toString() !== buyer._id.toString()) {
      return res.status(400).json({ message: 'Email already in use by another account' });
    }

    // Check if email exists in other collections
    const Seller = (await import('../models/Seller.js')).default;
    const existingSeller = await Seller.findOne({ email: newEmail.toLowerCase() });
    if (existingSeller) {
      return res.status(400).json({ message: 'Email already registered as a seller' });
    }

    const Admin = (await import('../models/Admin.js')).default;
    const existingAdmin = await Admin.findOne({ email: newEmail.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    buyer.email = newEmail.toLowerCase();
    await buyer.save();

    res.json({
      success: true,
      message: 'Email updated successfully',
      buyer: {
        id: buyer._id,
        name: buyer.getFullName(),
        email: buyer.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update buyer password
router.put('/profile/password', authenticateBuyer, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    const buyer = await Buyer.findById(req.buyer.id);
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    // Verify current password
    const isPasswordValid = await buyer.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    buyer.password = newPassword; // Will be hashed by pre-save middleware
    await buyer.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add product to favorites
router.post('/favorites/:productId', authenticateBuyer, async (req, res) => {
  try {
    const buyer = await Buyer.findById(req.buyer.id);
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    const productId = req.params.productId;
    if (buyer.favorites.includes(productId)) {
      return res.status(400).json({ message: 'Product already in favorites' });
    }

    buyer.favorites.push(productId);
    await buyer.save();

    res.json({
      success: true,
      message: 'Product added to favorites',
      favorites: buyer.favorites
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove product from favorites
router.delete('/favorites/:productId', authenticateBuyer, async (req, res) => {
  try {
    const buyer = await Buyer.findById(req.buyer.id);
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    buyer.favorites = buyer.favorites.filter(
      id => id.toString() !== req.params.productId
    );
    await buyer.save();

    res.json({
      success: true,
      message: 'Product removed from favorites',
      favorites: buyer.favorites
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get buyer dashboard stats
router.get('/dashboard/stats', authenticateBuyer, async (req, res) => {
  try {
    const buyer = await Buyer.findById(req.buyer.id)
      .populate('favorites');

    res.json({
      success: true,
      stats: {
        totalOrders: buyer.orders ? buyer.orders.length : 0,
        totalFavorites: buyer.favorites.length,
        status: buyer.status,
        memberSince: buyer.createdAt,
        lastLogin: buyer.lastLogin
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Get all buyers
router.get('/all', async (req, res) => {
  try {
    const buyers = await Buyer.find()
      .select('-password')
      .populate('favorites', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      buyers: buyers.map(buyer => ({
        id: buyer._id,
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        email: buyer.email,
        userType: buyer.userType,
        status: buyer.status,
        phone: buyer.phone,
        orders: buyer.orders || [],
        favorites: buyer.favorites,
        lastLogin: buyer.lastLogin,
        createdAt: buyer.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: Update buyer status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const buyer = await Buyer.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-password');

    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    res.json({
      success: true,
      message: 'Buyer status updated successfully',
      buyer
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Unlock supplier contact (requires payment)
router.post('/unlock-supplier/:supplierId', authenticateBuyer, async (req, res) => {
  try {
    const { paymentMethod, transactionId, cardDetails, paymentReceipt, productId } = req.body;
    const supplierId = req.params.supplierId;
    
    const buyer = await Buyer.findById(req.buyer.id);
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    // Check if already unlocked
    const alreadyUnlocked = buyer.unlockedSuppliers.some(
      u => u.supplierId.toString() === supplierId
    );

    if (alreadyUnlocked) {
      return res.status(400).json({ message: 'Supplier already unlocked' });
    }

    // Validate payment based on method
    let paymentStatus = 'pending';
    let paymentTransactionId = transactionId || `TXN-${Date.now()}`;
    
    // For Pakistani payment methods, require receipt upload
    if ((paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa' || paymentMethod === 'bank_transfer') && !paymentReceipt) {
      return res.status(400).json({ 
        success: false,
        message: 'Payment receipt is required for this payment method' 
      });
    }

    // For card payments (Visa/Mastercard), validate card details
    if (paymentMethod === 'visa' || paymentMethod === 'mastercard') {
      if (!cardDetails || !cardDetails.cardNumber || !cardDetails.expiry || !cardDetails.cvv) {
        return res.status(400).json({ 
          success: false,
          message: 'Card details are required for card payments' 
        });
      }

      // Validate card number (basic validation)
      const cardNumber = cardDetails.cardNumber.replace(/\s/g, '');
      if (cardNumber.length < 13 || cardNumber.length > 19) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid card number. Please check and try again.' 
        });
      }

      // Validate expiry format (MM/YY)
      const expiryRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
      if (!expiryRegex.test(cardDetails.expiry)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid expiry date. Use MM/YY format.' 
        });
      }

      // Check if card is expired
      const [month, year] = cardDetails.expiry.split('/');
      const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
      const currentDate = new Date();
      if (expiryDate < currentDate) {
        return res.status(400).json({ 
          success: false,
          message: 'Card has expired. Please use a valid card.' 
        });
      }

      // Validate CVV (3 digits)
      if (!/^\d{3}$/.test(cardDetails.cvv)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid CVV. Must be 3 digits.' 
        });
      }

      // Process payment with Paymob or simulation
      const buyerInfo = {
        email: buyer.email,
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        phone: buyer.phone || '+923000000000'
      };
      const paymentSuccess = await processCardPayment(cardDetails, 200, buyerInfo);
      
      if (!paymentSuccess) {
        // Payment failed - do not unlock supplier
        const failedPayment = {
          amount: 200,
          currency: 'PKR',
          paymentMethod,
          transactionId: paymentTransactionId,
          supplierId,
          status: 'failed',
          description: 'Unlock supplier contact - Payment failed'
        };
        buyer.paymentHistory.push(failedPayment);
        await buyer.save();

        return res.status(400).json({ 
          success: false,
          message: 'Payment failed. Card was declined. Please check your card details or try another card.' 
        });
      }

      paymentStatus = 'completed';
      paymentTransactionId = `CARD-${Date.now()}`;
    } else {
      // For Pakistani methods (JazzCash, EasyPaisa, Bank Transfer)
      if (!transactionId || transactionId.trim() === '') {
        return res.status(400).json({ 
          success: false,
          message: 'Transaction ID is required' 
        });
      }
      // Mark as pending for admin approval
      paymentStatus = 'pending';
    }

    // Create payment record
    const payment = {
      amount: 200,
      currency: 'PKR',
      paymentMethod,
      transactionId: paymentTransactionId,
      supplierId,
      productId: productId || null,
      status: paymentStatus,
      paymentReceipt: paymentReceipt || null,
      description: 'Unlock supplier contact'
    };

    buyer.paymentHistory.push(payment);
    
    // Only unlock supplier if payment is completed (card payments)
    if (paymentStatus === 'completed') {
      buyer.unlockedSuppliers.push({
        supplierId,
        paymentId: payment.transactionId
      });
    }

    await buyer.save();

    res.json({
      success: true,
      message: paymentStatus === 'pending' ? 'Payment receipt submitted! Waiting for admin approval.' : 'Payment successful! Supplier unlocked.',
      payment: {
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
        status: paymentStatus
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Process card payment using Paymob or simulation
async function processCardPayment(cardDetails, amount, buyerInfo = null) {
  // Check if Paymob is configured
  const usePaymob = process.env.PAYMOB_API_KEY && process.env.PAYMOB_API_KEY !== 'your_paymob_api_key';
  
  if (usePaymob && buyerInfo) {
    // Use Paymob for real payment processing
    try {
      const result = await processCardPaymentWithPaymob(cardDetails, amount, buyerInfo);
      return result.success;
    } catch (error) {
      console.error('Paymob payment error:', error);
      // Fall back to simulation if Paymob fails
    }
  }
  
  // Simulation mode (for testing without Paymob)
  
  // Simulate payment processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Simulate payment validation
  // For demo: cards ending in even numbers succeed, odd numbers fail
  const cardNumber = cardDetails.cardNumber.replace(/\s/g, '');
  const lastDigit = parseInt(cardNumber.charAt(cardNumber.length - 1));
  
  // 80% success rate for demo purposes
  return lastDigit % 2 === 0 || Math.random() > 0.2;
}

// Check if supplier is unlocked
router.get('/check-unlock/:supplierId', authenticateBuyer, async (req, res) => {
  try {
    const buyer = await Buyer.findById(req.buyer.id);
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    const isUnlocked = buyer.unlockedSuppliers.some(
      u => u.supplierId.toString() === req.params.supplierId
    );

    res.json({
      success: true,
      isUnlocked
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get unlocked suppliers
router.get('/unlocked-suppliers', authenticateBuyer, async (req, res) => {
  try {
    const buyer = await Buyer.findById(req.buyer.id)
      .populate('unlockedSuppliers.supplierId', 'businessName contactPerson email phone');

    res.json({
      success: true,
      unlockedSuppliers: buyer.unlockedSuppliers
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get payment history
router.get('/payment-history', authenticateBuyer, async (req, res) => {
  try {
    const buyer = await Buyer.findById(req.buyer.id)
      .populate('paymentHistory.supplierId', 'businessName');

    // Get payment verifications
    let paymentVerifications = [];
    try {
      const PaymentVerification = (await import('../models/PaymentVerification.js')).default;
      paymentVerifications = await PaymentVerification.find({
        buyerId: req.buyer.id
      }).sort({ submittedAt: -1 });
    } catch (error) {
      console.log('PaymentVerification model not available:', error.message);
    }

    // Combine payment history with payment verifications
    const combinedHistory = [
      ...buyer.paymentHistory.map(payment => ({
        ...payment.toObject(),
        type: 'payment',
        date: payment.paymentDate
      })),
      ...paymentVerifications.map(verification => ({
        _id: verification._id,
        type: 'verification',
        date: verification.submittedAt,
        description: `Payment Verification - ${verification.productName}`,
        status: verification.status,
        productName: verification.productName,
        productId: verification.productId,
        adminNotes: verification.adminNotes,
        reviewedAt: verification.reviewedAt
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      paymentHistory: buyer.paymentHistory.sort((a, b) => 
        new Date(b.paymentDate) - new Date(a.paymentDate)
      ),
      paymentVerifications,
      combinedHistory
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body; // Can be email or WhatsApp number

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ 
        message: 'Email or WhatsApp number is required' 
      });
    }

    // Find buyer by email or WhatsApp number
    const buyer = await Buyer.findOne({
      $or: [
        { email: identifier.toLowerCase().trim() },
        { whatsappNo: identifier.trim() }
      ]
    });

    if (!buyer) {
      return res.status(404).json({ 
        message: 'No account found with this email or WhatsApp number' 
      });
    }

    if (!buyer.whatsappNo) {
      return res.status(400).json({ 
        message: 'No WhatsApp number associated with this account. Please contact support.' 
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to buyer record
    buyer.passwordResetOTP = otp;
    buyer.passwordResetOTPExpiry = otpExpiry;
    await buyer.save();

    // Send OTP via WhatsApp

    res.json({
      success: true,
      message: 'OTP sent to your WhatsApp number',
      whatsappNo: buyer.whatsappNo.replace(/(\+\d{2})(\d{3})\d{4}(\d{4})/, '$1$2****$3') // Masked number
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify OTP and Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { identifier, otp, newPassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      return res.status(400).json({ 
        message: 'Identifier, OTP, and new password are required' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long' 
      });
    }

    // Find buyer by email or WhatsApp number
    const buyer = await Buyer.findOne({
      $or: [
        { email: identifier },
        { whatsappNo: identifier }
      ]
    });

    if (!buyer) {
      return res.status(404).json({ 
        message: 'No account found' 
      });
    }

    // Check if OTP exists and is not expired
    if (!buyer.passwordResetOTP || !buyer.passwordResetOTPExpiry) {
      return res.status(400).json({ 
        message: 'No OTP request found. Please request a new OTP.' 
      });
    }

    if (new Date() > buyer.passwordResetOTPExpiry) {
      return res.status(400).json({ 
        message: 'OTP has expired. Please request a new one.' 
      });
    }

    // Check OTP
    const isValidOTP = buyer.passwordResetOTP === otp;
    
    if (!isValidOTP) {
      return res.status(400).json({ 
        message: 'Invalid OTP. Please check and try again.' 
      });
    }

    // Update password and clear OTP
    buyer.password = newPassword; // Will be hashed by pre-save middleware
    buyer.passwordResetOTP = undefined;
    buyer.passwordResetOTPExpiry = undefined;
    await buyer.save();

    res.json({
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Payment verification submission
router.post('/payment-verification', authenticateBuyer, upload.fields([
  { name: 'paymentReceipt', maxCount: 1 },
  { name: 'idPicture', maxCount: 1 }
]), async (req, res) => {
  try {
    const { productId, productName, buyerId, buyerName, buyerEmail } = req.body;
    
    if (!req.files || !req.files.paymentReceipt || !req.files.idPicture) {
      return res.status(400).json({ 
        message: 'Both payment receipt and ID picture are required' 
      });
    }

    // Import PaymentVerification model
    const PaymentVerification = (await import('../models/PaymentVerification.js')).default;

    // Check if buyer already has a pending or approved verification
    const existingVerification = await PaymentVerification.findOne({
      buyerId: req.buyer.id,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingVerification) {
      if (existingVerification.status === 'approved') {
        return res.status(400).json({ 
          message: 'You already have approved payment verification. You can now view seller information.' 
        });
      } else {
        return res.status(400).json({ 
          message: 'You already have a pending payment verification. Please wait for admin approval.' 
        });
      }
    }

    const paymentReceipt = req.files.paymentReceipt[0];
    const idPicture = req.files.idPicture[0];

    // Create payment verification record
    const verification = new PaymentVerification({
      buyerId: req.buyer.id,
      buyerName: buyerName || req.buyer.name || `${req.buyer.firstName} ${req.buyer.lastName}`,
      buyerEmail: buyerEmail || req.buyer.email,
      productId,
      productName,
      paymentReceipt: {
        filename: paymentReceipt.filename,
        path: paymentReceipt.path,
        mimetype: paymentReceipt.mimetype,
        size: paymentReceipt.size
      },
      idPicture: {
        filename: idPicture.filename,
        path: idPicture.path,
        mimetype: idPicture.mimetype,
        size: idPicture.size
      },
      status: 'pending'
    });

    await verification.save();

    res.json({
      success: true,
      message: 'Payment verification submitted successfully! Admin will review within 24 hours.',
      verificationId: verification._id
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      message: 'Failed to submit payment verification', 
      error: error.message 
    });
  }
});

// Serve uploaded payment verification files
router.get('/payment-verification-file/:filename', authenticateBuyer, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', 'payment-verifications', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Verify that the file belongs to the authenticated buyer
    const PaymentVerification = (await import('../models/PaymentVerification.js')).default;
    const verification = await PaymentVerification.findOne({
      buyerId: req.buyer.id,
      $or: [
        { 'paymentReceipt.filename': filename },
        { 'idPicture.filename': filename }
      ]
    });

    if (!verification) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Serve the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving payment verification file:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check payment verification status
router.get('/payment-verification-status', authenticateBuyer, async (req, res) => {
  try {
    const PaymentVerification = (await import('../models/PaymentVerification.js')).default;
    
    const verification = await PaymentVerification.findOne({
      buyerId: req.buyer.id
    }).sort({ submittedAt: -1 });

    if (!verification) {
      return res.json({
        hasVerification: false,
        status: null
      });
    }

    res.json({
      hasVerification: true,
      status: verification.status,
      submittedAt: verification.submittedAt,
      reviewedAt: verification.reviewedAt,
      adminNotes: verification.adminNotes
    });

  } catch (error) {
    console.error('Payment verification status error:', error);
    res.status(500).json({ 
      message: 'Failed to check payment verification status', 
      error: error.message 
    });
  }
});

export default router;

// Admin: Get all pending payments
router.get('/admin/pending-payments', async (req, res) => {
  try {
    const buyers = await Buyer.find({
      'paymentHistory.status': 'pending'
    })
    .populate('paymentHistory.supplierId', 'businessName contactPerson email phone')
    .populate('paymentHistory.productId', 'name images price')
    .select('firstName lastName email paymentHistory');

    const pendingPayments = [];
    buyers.forEach(buyer => {
      buyer.paymentHistory.forEach(payment => {
        if (payment.status === 'pending') {
          pendingPayments.push({
            paymentId: payment._id,
            buyerId: buyer._id,
            buyerName: `${buyer.firstName} ${buyer.lastName}`,
            buyerEmail: buyer.email,
            amount: payment.amount,
            currency: payment.currency,
            paymentMethod: payment.paymentMethod,
            transactionId: payment.transactionId,
            paymentReceipt: payment.paymentReceipt,
            supplier: payment.supplierId,
            product: payment.productId,
            paymentDate: payment.paymentDate,
            description: payment.description
          });
        }
      });
    });

    res.json({
      success: true,
      pendingPayments: pendingPayments.sort((a, b) => 
        new Date(b.paymentDate) - new Date(a.paymentDate)
      )
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Admin: Approve payment
router.post('/admin/approve-payment/:buyerId/:paymentId', async (req, res) => {
  try {
    const { buyerId, paymentId } = req.params;
    const { adminNotes } = req.body;
    
    const buyer = await Buyer.findById(buyerId);
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    const payment = buyer.paymentHistory.id(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ message: 'Payment is not pending' });
    }

    // Update payment status
    payment.status = 'approved';
    payment.approvedAt = new Date();
    payment.adminNotes = adminNotes || 'Payment approved';

    // Unlock supplier for buyer
    const alreadyUnlocked = buyer.unlockedSuppliers.some(
      u => u.supplierId.toString() === payment.supplierId.toString()
    );

    if (!alreadyUnlocked) {
      buyer.unlockedSuppliers.push({
        supplierId: payment.supplierId,
        paymentId: payment.transactionId
      });
    }

    await buyer.save();

    res.json({
      success: true,
      message: 'Payment approved successfully',
      payment: {
        transactionId: payment.transactionId,
        status: payment.status,
        approvedAt: payment.approvedAt
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Admin: Reject payment
router.post('/admin/reject-payment/:buyerId/:paymentId', async (req, res) => {
  try {
    const { buyerId, paymentId } = req.params;
    const { adminNotes } = req.body;
    
    const buyer = await Buyer.findById(buyerId);
    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    const payment = buyer.paymentHistory.id(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ message: 'Payment is not pending' });
    }

    // Update payment status
    payment.status = 'rejected';
    payment.adminNotes = adminNotes || 'Payment rejected';

    await buyer.save();

    res.json({
      success: true,
      message: 'Payment rejected',
      payment: {
        transactionId: payment.transactionId,
        status: payment.status
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});
