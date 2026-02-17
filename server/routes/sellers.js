import express from 'express';
import jwt from 'jsonwebtoken';
import Seller from '../models/Seller.js';
import { authenticateAdmin, authenticateSeller } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateSellerRegister } from '../middleware/validation.js';

const router = express.Router();

// Seller Registration
// Apply rate limiting and validation
router.post('/register', authLimiter, validateSellerRegister, async (req, res) => {
  try {
    const { username, email, password, whatsappNo, country, city, productCategory } = req.body;

    // Check if seller already exists
    const existingSeller = await Seller.findOne({
      $or: [{ email }, { username }]
    });

    if (existingSeller) {
      if (existingSeller.email === email) {
        return res.status(400).json({ 
          message: 'Email already registered. Please use a different email.' 
        });
      }
      return res.status(400).json({ 
        message: 'Username already taken. Please choose a different username.' 
      });
    }

    // Check if email exists in Buyer collection
    const Buyer = (await import('../models/Buyer.js')).default;
    const existingBuyer = await Buyer.findOne({ email });
    if (existingBuyer) {
      return res.status(400).json({ 
        message: 'Email already registered as a buyer. Please use a different email or login as buyer.' 
      });
    }

    // Check if email exists in Admin collection
    const Admin = (await import('../models/Admin.js')).default;
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ 
        message: 'Email already registered. Please use a different email.' 
      });
    }

    // Create new seller
    const seller = new Seller({
      username,
      email,
      password,
      whatsappNo,
      country,
      city,
      productCategory
    });

    await seller.save();

    // Optional webhook trigger - non-blocking, won't affect registration
    setImmediate(async () => {
      try {
        const WebhookLogger = (await import('../services/webhookLogger.js')).default;
        await WebhookLogger.logUserRegistration('seller', {
          _id: seller._id,
          email: seller.email,
          username: seller.username,
          country: seller.country,
          createdAt: seller.createdAt
        });
      } catch (webhookError) {
        // Silent fail - webhook should never break registration
      }
    });

    res.status(201).json({
      message: 'Registration successful! You can now login to your account.',
      supplierId: seller.supplierId
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Seller Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Support login with username, email, or WhatsApp number
    const seller = await Seller.findOne({
      $or: [
        { username }, 
        { email: username },
        { whatsappNo: username }
      ]
    });

    if (!seller || !(await seller.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if seller is suspended or rejected
    if (seller.status === 'suspended' || seller.status === 'rejected') {
      return res.status(403).json({ 
        message: 'Your account has been suspended or rejected. Please contact support.',
        status: seller.status
      });
    }

    // Check dashboard access
    const dashboardAccess = seller.canAccessDashboard();
    
    // Update verification status if 15 days have passed (for legacy sellers)
    if (!dashboardAccess.canAccess && dashboardAccess.reason === 'verification_required' && seller.verificationStatus === 'not_required') {
      seller.verificationStatus = 'required';
      await seller.save();
    }

    const token = jwt.sign(
      { id: seller._id, role: 'seller', supplierId: seller.supplierId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      seller: {
        id: seller._id,
        _id: seller._id,
        username: seller.username,
        email: seller.email,
        whatsappNo: seller.whatsappNo,
        contactNo: seller.contactNo,
        country: seller.country,
        city: seller.city,
        productCategory: seller.productCategory,
        supplierId: seller.supplierId,
        status: seller.status,
        verificationStatus: seller.verificationStatus,
        canListProducts: seller.canListProducts,
        hasRegistrationPayment: seller.hasRegistrationPayment,
        dashboardAccessible: seller.dashboardAccessible,
        createdAt: seller.createdAt,
        updatedAt: seller.updatedAt,
        dashboardAccess: dashboardAccess,
        dashboardAccessExpiry: seller.dashboardAccessExpiry,
        paymentHistory: seller.paymentHistory || [],
        productListingRequests: seller.productListingRequests || []
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    
    const query = {};
    
    // Filter based on verification status logic
    if (status && status !== 'all') {
      if (status === 'approved') {
        // Only sellers with completed verification (ID card approved)
        query.verificationStatus = 'approved';
      } else if (status === 'pending') {
        // Sellers who registered and can login but haven't completed verification
        query.verificationStatus = { $in: ['required', 'not_required'] };
      } else if (status === 'rejected') {
        // Sellers who were rejected by admin
        query.$or = [
          { verificationStatus: 'rejected' },
          { status: 'rejected' }
        ];
      }
    }
    
    if (search) {
      query.$or = [
        { username: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    const sellers = await Seller.find(query)
      .select('-password')
      .populate('approvedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Seller.countDocuments(query);

    res.json({
      sellers,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Sellers API error:', error); // Debug log
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id)
      .select('-password')
      .populate('approvedBy', 'username email');
    
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    res.json(seller);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      {
        status: 'verified',
        verificationStatus: 'approved',
        approvedBy: req.admin._id,
        approvedAt: new Date(),
        canListProducts: true,
        dashboardAccessible: true
      },
      { new: true }
    ).select('-password');

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    res.json({ message: 'Seller approved successfully', seller });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    ).select('-password');

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    res.json({ message: 'Seller rejected', seller });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete seller (Admin only)
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id);
    
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    // Delete the seller
    await Seller.findByIdAndDelete(req.params.id);

    res.json({ 
      message: 'Seller deleted successfully',
      deletedSeller: {
        id: seller._id,
        username: seller.username,
        email: seller.email,
        supplierId: seller.supplierId
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get seller profile
router.get('/profile', authenticateSeller, async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller._id).select('-password');
    
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    
    res.json(seller);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update seller profile
router.put('/profile', authenticateSeller, async (req, res) => {
  try {
    const { whatsappNo, contactNo, country, city, productCategory, password } = req.body;
    
    // Require password for profile updates
    if (!password) {
      return res.status(400).json({ message: 'Password is required to update profile' });
    }
    
    // Find seller and verify password
    const seller = await Seller.findById(req.seller._id);
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    
    // Verify password
    const isPasswordValid = await seller.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password. Please enter your correct password to update profile.' });
    }
    
    // Update profile
    const updatedSeller = await Seller.findByIdAndUpdate(
      req.seller._id,
      { whatsappNo, contactNo, country, city, productCategory },
      { new: true }
    ).select('-password');

    res.json({ message: 'Profile updated successfully', seller: updatedSeller });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Change seller password
router.put('/change-password', authenticateSeller, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }
    
    // Find seller and verify current password
    const seller = await Seller.findById(req.seller._id);
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await seller.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Update password (will be hashed by pre-save middleware)
    seller.password = newPassword;
    await seller.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Record payment for listing products
router.post('/payment', authenticateSeller, async (req, res) => {
  try {
    const { amount, paymentMethod, transactionId, purpose, productId, productName, paymentDetails, status } = req.body;

    const seller = await Seller.findById(req.seller._id);
    
    const paymentRecord = {
      amount,
      paymentDate: new Date(),
      paymentMethod,
      transactionId,
      purpose,
      status: status || 'completed'
    };

    // Add product details for product listing payments
    if (purpose === 'product_listing' && productId) {
      paymentRecord.productId = productId;
      paymentRecord.productName = productName;
    }

    // Add payment details (receipt, card info, etc.)
    if (paymentDetails) {
      paymentRecord.paymentDetails = paymentDetails;
    }

    seller.paymentHistory.push(paymentRecord);

    if (purpose === 'registration') {
      seller.hasRegistrationPayment = true;
      seller.canListProducts = true;
    }

    await seller.save();

    res.json({ 
      message: 'Payment recorded successfully',
      canListProducts: seller.canListProducts 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get payment history
router.get('/payments', authenticateSeller, async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller._id).select('paymentHistory');
    res.json(seller.paymentHistory);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit verification documents
router.post('/verification/submit', authenticateSeller, async (req, res) => {
  try {
    const { cnicNumber, idCardFront, idCardBack, idCardWithFace } = req.body;

    if (!cnicNumber || !idCardFront || !idCardBack || !idCardWithFace) {
      return res.status(400).json({ 
        success: false,
        message: 'CNIC number and all three documents are required: CNIC front, CNIC back, and CNIC with selfie' 
      });
    }

    const seller = await Seller.findByIdAndUpdate(
      req.seller._id,
      {
        verificationDocuments: {
          cnicNumber,
          idCardFront,
          idCardBack,
          idCardWithFace,
          submittedAt: new Date()
        },
        verificationStatus: 'pending'
      },
      { new: true }
    ).select('-password');

    if (!seller) {
      return res.status(404).json({ 
        success: false,
        message: 'Seller not found' 
      });
    }

    res.json({ 
      success: true,
      message: 'Verification documents submitted successfully. Please wait for admin approval.',
      seller 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error: ' + error.message 
    });
  }
});

// Check dashboard access
router.get('/dashboard-access', authenticateSeller, async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller._id);
    
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    
    const dashboardAccess = seller.canAccessDashboard();
    
    res.json({
      canAccess: dashboardAccess.canAccess,
      reason: dashboardAccess.reason,
      message: dashboardAccess.message,
      verificationStatus: seller.verificationStatus,
      dashboardAccessExpiry: seller.dashboardAccessExpiry,
      daysRemaining: seller.dashboardAccessExpiry ? 
        Math.max(0, Math.ceil((seller.dashboardAccessExpiry - new Date()) / (1000 * 60 * 60 * 24))) : 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin routes for verification management

// Get sellers requiring verification
router.get('/admin/verification-pending', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const query = { verificationStatus: 'pending' };

    const sellers = await Seller.find(query)
      .select('-password')
      .sort({ 'verificationDocuments.submittedAt': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Seller.countDocuments(query);

    res.json({
      sellers,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Approve seller verification
router.put('/admin/verification/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      {
        verificationStatus: 'approved',
        verificationApprovedBy: req.admin._id,
        verificationApprovedAt: new Date(),
        dashboardAccessible: true,
        canListProducts: true
      },
      { new: true }
    ).select('-password');

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    res.json({ message: 'Seller verification approved successfully', seller });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reject seller verification
router.put('/admin/verification/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      {
        verificationStatus: 'rejected',
        verificationRejectionReason: reason,
        dashboardAccessible: false
      },
      { new: true }
    ).select('-password');

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    res.json({ message: 'Seller verification rejected', seller });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Fix existing sellers without verification status
router.post('/admin/fix-verification-status', async (req, res) => {
  try {
    const result = await Seller.updateMany(
      { verificationStatus: { $exists: false } },
      { $set: { verificationStatus: 'required' } }
    );
    
    res.json({ 
      message: 'Verification status updated for existing sellers',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test route to check if seller API is working
router.get('/test', authenticateSeller, async (req, res) => {
  try {
    res.json({ 
      message: 'Seller API is working',
      sellerId: req.seller._id,
      sellerName: req.seller.username,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Simple test route without authentication
router.get('/health', async (req, res) => {
  try {
    const sellerCount = await Seller.countDocuments();
    res.json({ 
      message: 'Seller service is healthy',
      totalSellers: sellerCount,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ message: 'Database connection error', error: error.message });
  }
});

// Debug route to check seller verification statuses
router.get('/debug/statuses', authenticateAdmin, async (req, res) => {
  try {
    const sellers = await Seller.find({}).select('username email verificationStatus status');
    
    const statusCounts = {
      approved: 0,
      pending: 0,
      required: 0,
      not_required: 0,
      rejected: 0,
      undefined: 0
    };
    
    sellers.forEach(seller => {
      const status = seller.verificationStatus || 'undefined';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    res.json({
      message: 'Seller verification status debug info',
      totalSellers: sellers.length,
      statusCounts,
      sellers: sellers.map(s => ({
        username: s.username,
        email: s.email,
        verificationStatus: s.verificationStatus,
        status: s.status
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test route to set a seller as approved (for testing)
router.put('/debug/approve/:id', authenticateAdmin, async (req, res) => {
  try {
    const seller = await Seller.findByIdAndUpdate(
      req.params.id,
      { 
        verificationStatus: 'approved',
        canListProducts: true,
        dashboardAccessible: true
      },
      { new: true }
    ).select('-password');
    
    res.json({
      message: 'Seller verification status set to approved',
      seller
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body; // Can be username, email, or WhatsApp number

    // Find seller by username, email, or WhatsApp number
    const seller = await Seller.findOne({
      $or: [
        { username: identifier },
        { email: identifier },
        { whatsappNo: identifier }
      ]
    });

    if (!seller) {
      return res.status(404).json({ 
        message: 'No account found with this username, email, or WhatsApp number' 
      });
    }

    if (!seller.whatsappNo) {
      return res.status(400).json({ 
        message: 'No WhatsApp number associated with this account. Please contact support.' 
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to seller record
    seller.passwordResetOTP = otp;
    seller.passwordResetOTPExpiry = otpExpiry;
    await seller.save();

    // Send OTP via WhatsApp
    res.json({
      success: true,
      message: 'OTP sent to your WhatsApp number',
      whatsappNo: seller.whatsappNo.replace(/(\+\d{2})(\d{3})\d{4}(\d{4})/, '$1$2****$3') // Masked number
    });
  } catch (error) {
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

    // Find seller by username, email, or WhatsApp number
    const seller = await Seller.findOne({
      $or: [
        { username: identifier },
        { email: identifier },
        { whatsappNo: identifier }
      ]
    });

    if (!seller) {
      return res.status(404).json({ 
        message: 'No account found' 
      });
    }

    // Check if OTP exists and is not expired
    if (!seller.passwordResetOTP || !seller.passwordResetOTPExpiry) {
      return res.status(400).json({ 
        message: 'No OTP request found. Please request a new OTP.' 
      });
    }

    if (new Date() > seller.passwordResetOTPExpiry) {
      return res.status(400).json({ 
        message: 'OTP has expired. Please request a new one.' 
      });
    }

    // Check OTP
    const isValidOTP = seller.passwordResetOTP === otp;
    
    if (!isValidOTP) {
      return res.status(400).json({ 
        message: 'Invalid OTP. Please check and try again.' 
      });
    }

    // Update password and clear OTP
    seller.password = newPassword; // Will be hashed by pre-save middleware
    seller.passwordResetOTP = undefined;
    seller.passwordResetOTPExpiry = undefined;
    await seller.save();

    res.json({
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit product listing request with payment (simplified version)
router.post('/submit-product-listing', authenticateSeller, async (req, res) => {
  try {
    const {
      productId,
      productName,
      productPrice,
      transactionId,
      paymentMethod,
      notes,
      receiptImageUrl // For now, we'll accept image URL instead of file upload
    } = req.body;

    // Create a product listing request
    const listingRequest = {
      productId,
      productName,
      productPrice,
      transactionId,
      paymentMethod,
      notes,
      receiptImage: receiptImageUrl,
      status: 'pending_approval',
      submittedAt: new Date()
    };

    // Add to seller's listing requests
    const seller = await Seller.findById(req.seller._id);
    if (!seller.productListingRequests) {
      seller.productListingRequests = [];
    }
    seller.productListingRequests.push(listingRequest);
    await seller.save();

    res.json({
      message: 'Product listing request submitted successfully. Please wait for admin approval.',
      requestId: seller.productListingRequests[seller.productListingRequests.length - 1]._id
    });
  } catch (error) {
    console.error('Product listing submission error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Debug route to test seller authentication and data
router.get('/debug/seller-info', authenticateSeller, async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller._id);
    
    res.json({
      success: true,
      message: 'Seller authentication working',
      authSeller: {
        id: req.seller._id,
        username: req.seller.username,
        email: req.seller.email,
        verificationStatus: req.seller.verificationStatus,
        whatsappNo: req.seller.whatsappNo,
        city: req.seller.city,
        country: req.seller.country
      },
      dbSeller: seller ? {
        id: seller._id,
        username: seller.username,
        email: seller.email,
        verificationStatus: seller.verificationStatus,
        whatsappNo: seller.whatsappNo,
        city: seller.city,
        country: seller.country
      } : null
    });
  } catch (error) {
    console.error('❌ Debug seller info error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Debug failed', 
      error: error.message 
    });
  }
});

// Request to list admin product (requires admin approval)
router.post('/request-admin-product-listing', authenticateSeller, async (req, res) => {
  try {
    const {
      adminProductId,
      productName,
      productPrice,
      sellerPrice,
      sellerShipping = 0, // Add shipping field with default value
      notes = 'Seller requested to list admin product'
    } = req.body;

    console.log('🔄 Processing admin product listing request:', {
      adminProductId,
      sellerId: req.seller._id,
      sellerUsername: req.seller.username,
      sellerPrice,
      sellerShipping
    });

    // Import Product model
    const Product = (await import('../models/Product.js')).default;
    
    // Check if admin product exists
    const adminProduct = await Product.findById(adminProductId);
    if (!adminProduct) {
      return res.status(404).json({ message: 'Admin product not found' });
    }

    // Check if seller already has a pending or approved request for this product
    const seller = await Seller.findById(req.seller._id);
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    // Check for existing requests
    const existingRequest = seller.productListingRequests?.find(
      request => request.productId.toString() === adminProductId && 
                 (request.status === 'pending_approval' || request.status === 'approved')
    );

    if (existingRequest) {
      return res.status(400).json({ 
        success: false,
        message: `You already have a ${existingRequest.status === 'pending_approval' ? 'pending' : existingRequest.status} request for this product.`,
        error: 'REQUEST_EXISTS'
      });
    }

    // Check if seller is already listed on the product
    const alreadyListed = adminProduct.sellers?.some(
      sellerEntry => sellerEntry.sellerId.toString() === req.seller._id.toString()
    );

    if (alreadyListed) {
      return res.status(400).json({ 
        success: false,
        message: 'You have already listed this product.',
        error: 'ALREADY_LISTED'
      });
    }

    // Create listing request
    if (!seller.productListingRequests) {
      seller.productListingRequests = [];
    }
    
    const listingRequest = {
      productId: adminProduct._id,
      productName: adminProduct.name,
      productPrice: adminProduct.price,
      sellerPrice: sellerPrice ? parseFloat(sellerPrice) : parseFloat(adminProduct.price),
      sellerShipping: sellerShipping ? parseFloat(sellerShipping) : 0, // Add shipping to request
      transactionId: `REQ_${Date.now()}`,
      paymentMethod: 'Pending Admin Approval',
      notes,
      status: 'pending_approval',
      submittedAt: new Date(),
      requestType: 'admin_product_listing'
    };
    
    seller.productListingRequests.push(listingRequest);
    await seller.save();

    console.log('✅ Product listing request created:', {
      sellerId: seller._id,
      productId: adminProduct._id,
      requestId: listingRequest._id,
      status: 'pending'
    });

    // TODO: Send notification to admin about new listing request
    try {
      console.log(`📧 Admin notification: New listing request from ${seller.username} for ${adminProduct.name}`);
    } catch (notificationError) {
      console.error('Failed to send admin notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'Product listing request submitted successfully! Admin will review your request.',
      requestId: listingRequest._id,
      status: 'pending_approval',
      productName: adminProduct.name,
      sellerPrice: listingRequest.sellerPrice
    });
  } catch (error) {
    console.error('Request admin product listing error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DEPRECATED: Direct listing route - now requires admin approval
// Use /request-admin-product-listing instead
router.post('/list-admin-product', authenticateSeller, async (req, res) => {
  try {
    console.log('⚠️ DEPRECATED: Direct listing attempt blocked - admin approval required');
    
    return res.status(403).json({
      success: false,
      message: 'Direct product listing is no longer allowed. Please use the request system instead.',
      error: 'DIRECT_LISTING_DISABLED',
      redirectTo: '/request-admin-product-listing',
      instructions: 'All product listings now require admin approval. Please submit a request instead.'
    });
  } catch (error) {
    console.error('Deprecated list admin product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin routes for product listing requests
router.get('/admin/listing-requests', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'pending_approval' } = req.query;
    
    // Import Product model
    const Product = (await import('../models/Product.js')).default;
    
    // Find all sellers with listing requests
    const sellers = await Seller.find({
      'productListingRequests.status': status
    });
    
    // Extract and flatten all requests with product details
    const allRequests = [];
    for (const seller of sellers) {
      for (const request of seller.productListingRequests.filter(r => r.status === status)) {
        // Fetch the admin product to get shipping information
        const adminProduct = await Product.findById(request.productId);
        
        allRequests.push({
          ...request.toObject(),
          sellerId: seller._id,
          sellerUsername: seller.username,
          sellerEmail: seller.email,
          sellerVerificationStatus: seller.verificationStatus,
          productShipping: adminProduct?.shipping || 0 // Add admin product shipping
        });
      }
    }
    
    // Sort by submission date (newest first)
    allRequests.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    // Paginate
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedRequests = allRequests.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      requests: paginatedRequests,
      totalRequests: allRequests.length,
      totalPages: Math.ceil(allRequests.length / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Get listing requests error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Approve product listing request
router.put('/admin/listing-requests/:sellerId/:requestId/approve', authenticateAdmin, async (req, res) => {
  try {
    const { sellerId, requestId } = req.params;
    
    // Find seller and request
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    
    const request = seller.productListingRequests.id(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Listing request not found' });
    }
    
    if (request.status !== 'pending_approval') {
      return res.status(400).json({ message: 'Request is not pending approval' });
    }
    
    // Import Product model
    const Product = (await import('../models/Product.js')).default;
    
    // Get the admin product
    const adminProduct = await Product.findById(request.productId);
    if (!adminProduct) {
      return res.status(404).json({ message: 'Admin product not found' });
    }
    
    // Check if seller is already listed (safety check)
    const alreadyListed = adminProduct.sellers?.some(
      sellerEntry => sellerEntry.sellerId.toString() === sellerId
    );
    
    if (alreadyListed) {
      return res.status(400).json({ message: 'Seller is already listed on this product' });
    }
    
    // Add seller to product
    if (!adminProduct.sellers) {
      adminProduct.sellers = [];
    }
    
    const sellerInfo = {
      sellerId: seller._id,
      username: seller.username,
      email: seller.email,
      whatsappNo: seller.whatsappNo,
      city: seller.city,
      country: seller.country,
      verificationStatus: seller.verificationStatus,
      sellerPrice: request.sellerPrice,
      sellerShipping: request.sellerShipping || 0, // Add seller shipping
      listedAt: new Date(),
      transactionId: request.transactionId,
      paymentMethod: 'Admin Approved',
      notes: request.notes
    };
    
    adminProduct.sellers.push(sellerInfo);
    
    // Update main sellerInfo if this is the first seller
    if (adminProduct.sellers.length === 1 && !adminProduct.seller) {
      adminProduct.sellerInfo = {
        username: seller.username,
        email: seller.email,
        whatsappNo: seller.whatsappNo,
        city: seller.city,
        country: seller.country,
        verificationStatus: seller.verificationStatus,
        sellerPrice: request.sellerPrice,
        sellerShipping: request.sellerShipping || 0, // Add seller shipping
        _id: seller._id
      };
      adminProduct.seller = seller._id;
    }
    
    await adminProduct.save();
    
    // Update request status
    request.status = 'approved';
    request.approvedAt = new Date();
    request.approvedBy = req.admin._id;
    
    await seller.save();
    
    console.log('✅ Product listing request approved:', {
      sellerId,
      requestId,
      productId: request.productId,
      adminId: req.admin._id
    });
    
    res.json({
      success: true,
      message: 'Product listing request approved successfully',
      request: request,
      productName: adminProduct.name
    });
  } catch (error) {
    console.error('Approve listing request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reject product listing request
router.put('/admin/listing-requests/:sellerId/:requestId/reject', authenticateAdmin, async (req, res) => {
  try {
    const { sellerId, requestId } = req.params;
    const { reason = 'Request rejected by admin' } = req.body;
    
    // Find seller and request
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    
    const request = seller.productListingRequests.id(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Listing request not found' });
    }
    
    if (request.status !== 'pending_approval') {
      return res.status(400).json({ message: 'Request is not pending approval' });
    }
    
    // Update request status
    request.status = 'rejected';
    request.rejectedAt = new Date();
    request.rejectedBy = req.admin._id;
    request.rejectionReason = reason;
    
    await seller.save();
    
    console.log('❌ Product listing request rejected:', {
      sellerId,
      requestId,
      reason,
      adminId: req.admin._id
    });
    
    res.json({
      success: true,
      message: 'Product listing request rejected',
      request: request,
      reason: reason
    });
  } catch (error) {
    console.error('Reject listing request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cleanup duplicate sellers in products (admin utility)
router.post('/cleanup-duplicate-sellers', authenticateAdmin, async (req, res) => {
  try {
    const Product = (await import('../models/Product.js')).default;
    
    const products = await Product.find({ sellers: { $exists: true, $ne: [] } });
    let cleanedCount = 0;
    
    for (const product of products) {
      const uniqueSellers = [];
      const seenSellerIds = new Set();
      
      for (const seller of product.sellers) {
        const sellerId = seller.sellerId.toString();
        if (!seenSellerIds.has(sellerId)) {
          seenSellerIds.add(sellerId);
          uniqueSellers.push(seller);
        }
      }
      
      if (uniqueSellers.length !== product.sellers.length) {
        product.sellers = uniqueSellers;
        await product.save();
        cleanedCount++;
        console.log(`🧹 Cleaned duplicates from product: ${product.name} (${product._id})`);
      }
    }
    
    res.json({
      success: true,
      message: `Cleanup completed. ${cleanedCount} products had duplicate sellers removed.`,
      cleanedProducts: cleanedCount
    });
    
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ message: 'Cleanup failed', error: error.message });
  }
});

// Update seller's inventory for a listed product
router.put('/update-inventory/:productId', authenticateSeller, async (req, res) => {
  try {
    const { productId } = req.params;
    const { price, stock, shipping } = req.body;
    
    // Import Product model
    const Product = (await import('../models/Product.js')).default;
    
    // Find the product and check if seller has listed it
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find the seller's entry in the sellers array
    const sellerIndex = product.sellers?.findIndex(
      s => s.sellerId.toString() === req.seller._id.toString()
    );

    if (sellerIndex === -1) {
      return res.status(403).json({ message: 'You have not listed this product' });
    }

    console.log('🔄 Updating seller-specific inventory:', {
      productId: product._id,
      sellerId: req.seller._id,
      sellerUsername: req.seller.username,
      sellerIndex,
      currentSellerPrice: product.sellers[sellerIndex].sellerPrice,
      currentSellerShipping: product.sellers[sellerIndex].sellerShipping,
      newPrice: price,
      newStock: stock,
      newShipping: shipping
    });

    // Update the seller's specific price in the sellers array
    if (price !== undefined) {
      product.sellers[sellerIndex].sellerPrice = parseFloat(price);
      console.log('✅ Updated seller price in sellers array:', {
        sellerUsername: product.sellers[sellerIndex].username,
        oldPrice: product.sellers[sellerIndex].sellerPrice,
        newPrice: parseFloat(price)
      });
    }

    // Update the seller's specific shipping in the sellers array
    if (shipping !== undefined) {
      product.sellers[sellerIndex].sellerShipping = parseFloat(shipping);
      console.log('✅ Updated seller shipping in sellers array:', {
        sellerUsername: product.sellers[sellerIndex].username,
        oldShipping: product.sellers[sellerIndex].sellerShipping,
        newShipping: parseFloat(shipping)
      });
    }

    // Update the seller's specific stock in the sellers array
    if (stock !== undefined) {
      product.sellers[sellerIndex].stock = parseInt(stock);
      console.log('✅ Updated seller stock in sellers array:', {
        sellerUsername: product.sellers[sellerIndex].username,
        oldStock: product.sellers[sellerIndex].stock,
        newStock: parseInt(stock)
      });
    }

    // Also update the primary sellerInfo if this seller is the primary seller
    if (product.seller && product.seller.toString() === req.seller._id.toString() && product.sellerInfo) {
      if (price !== undefined) {
        product.sellerInfo.sellerPrice = parseFloat(price);
        console.log('✅ Updated primary sellerInfo price for consistency');
      }
      if (shipping !== undefined) {
        product.sellerInfo.sellerShipping = parseFloat(shipping);
        console.log('✅ Updated primary sellerInfo shipping for consistency');
      }
    }

    await product.save();

    console.log('✅ Seller updated inventory successfully:', {
      productId: product._id,
      sellerId: req.seller._id,
      sellerUsername: req.seller.username,
      newSellerPrice: product.sellers[sellerIndex].sellerPrice,
      newSellerStock: product.sellers[sellerIndex].stock,
      totalSellers: product.sellers.length
    });

    res.json({
      success: true,
      message: 'Your inventory updated successfully',
      product: {
        _id: product._id,
        sellerPrice: product.sellers[sellerIndex].sellerPrice,
        sellerStock: product.sellers[sellerIndex].stock,
        sellerShipping: product.sellers[sellerIndex].sellerShipping
      },
      sellerInfo: {
        username: product.sellers[sellerIndex].username,
        sellerPrice: product.sellers[sellerIndex].sellerPrice,
        stock: product.sellers[sellerIndex].stock
      }
    });
  } catch (error) {
    console.error('Error updating seller inventory:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get seller's listed products (products where seller added their info to admin products)
router.get('/my-listed-products', authenticateSeller, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, marketplace } = req.query;
    
    // Import Product model
    const Product = (await import('../models/Product.js')).default;
    
    // Find products where this seller has added their info
    const query = {
      'sellers.sellerId': req.seller._id,
      $or: [
        { status: 'active' },
        { status: { $exists: false } } // Include products without status field for backward compatibility
      ]
    };
    
    if (status) query.approvalStatus = status;
    if (marketplace) query.marketplace = marketplace;

    const products = await Product.find(query)
      .populate('seller', 'username email whatsappNo city country verificationStatus _id') // Populate seller info
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('name price stock category marketplace currency approvalStatus status isAmazonsChoice createdAt images sellers seller sellerInfo');

    const count = await Product.countDocuments(query);

    // Process products to show seller-specific info and ensure seller can see their own info
    const processedProducts = products.map(product => {
      const sellerEntry = product.sellers.find(s => s.sellerId.toString() === req.seller._id.toString());
      const productObj = product.toObject();
      
      // Ensure seller can see their own information
      if (product.seller && product.seller._id.toString() === req.seller._id.toString()) {
        // This seller owns the product - show full seller info
        if (!productObj.sellerInfo) {
          productObj.sellerInfo = {
            username: product.seller.username,
            email: product.seller.email,
            whatsappNo: product.seller.whatsappNo,
            city: product.seller.city,
            country: product.seller.country,
            verificationStatus: product.seller.verificationStatus,
            _id: product.seller._id
          };
        }
        console.log('✅ Showing seller their own info for product:', product.name);
      } else if (product.seller && product.seller.verificationStatus === 'approved') {
        // Other seller's product - show limited info if verified
        if (!productObj.sellerInfo) {
          productObj.sellerInfo = {
            username: product.seller.username,
            whatsappNo: product.seller.whatsappNo,
            city: product.seller.city,
            country: product.seller.country,
            verificationStatus: product.seller.verificationStatus,
            _id: product.seller._id
          };
        } else {
          // Remove email from cached info for other sellers
          delete productObj.sellerInfo.email;
        }
        console.log('✅ Showing limited seller info for verified seller');
      } else {
        // Hide seller info for unverified sellers
        delete productObj.sellerInfo;
        delete productObj.seller;
        console.log('❌ Hiding seller info for unverified seller');
      }
      
      return {
        ...productObj,
        sellerListedAt: sellerEntry?.listedAt,
        sellerTransactionId: sellerEntry?.transactionId,
        sellerPaymentMethod: sellerEntry?.paymentMethod,
        sellerNotes: sellerEntry?.notes,
        // Add seller's individual price if they have one
        ...(sellerEntry?.sellerPrice && {
          sellerInfo: {
            ...productObj.sellerInfo,
            sellerPrice: sellerEntry.sellerPrice
          }
        })
      };
    });

    // Get counts by status for seller's listed products
    const statusCounts = await Product.aggregate([
      { $match: { 'sellers.sellerId': req.seller._id } },
      { $group: { _id: '$approvalStatus', count: { $sum: 1 } } }
    ]);

    const counts = {
      total: count,
      pending: statusCounts.find(s => s._id === 'pending')?.count || 0,
      approved: statusCounts.find(s => s._id === 'approved')?.count || 0,
      rejected: statusCounts.find(s => s._id === 'rejected')?.count || 0
    };

    console.log('📋 Seller listed products response:', {
      sellerId: req.seller._id,
      sellerUsername: req.seller.username,
      totalProducts: processedProducts.length,
      productsWithSellerInfo: processedProducts.filter(p => p.sellerInfo).length
    });

    res.json({
      success: true,
      products: processedProducts,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page),
      total: count,
      counts
    });
  } catch (error) {
    console.error('Error fetching seller listed products:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete seller's listing (remove seller info from admin product)
router.delete('/unlist-product/:productId', authenticateSeller, async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Import Product model
    const Product = (await import('../models/Product.js')).default;
    
    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if seller has listed this product (check both seller field and sellers array)
    const isPrimarySeller = product.seller && product.seller.toString() === req.seller._id.toString();
    const sellerIndex = product.sellers?.findIndex(
      s => s.sellerId.toString() === req.seller._id.toString()
    );
    const isInSellersArray = sellerIndex !== -1;

    if (!isPrimarySeller && !isInSellersArray) {
      return res.status(400).json({ message: 'You have not listed this product' });
    }

    console.log('🔍 Unlist check:', {
      productId: product._id,
      sellerId: req.seller._id,
      isPrimarySeller,
      isInSellersArray,
      sellerIndex,
      sellersCount: product.sellers?.length || 0
    });

    // Remove seller from the sellers array if present
    if (isInSellersArray) {
      product.sellers.splice(sellerIndex, 1);
    }

    // Handle primary seller field
    if (isPrimarySeller) {
      if (product.sellers && product.sellers.length > 0) {
        // Set the first remaining seller as primary
        const newPrimarySeller = product.sellers[0];
        product.seller = newPrimarySeller.sellerId;
        product.sellerInfo = {
          username: newPrimarySeller.username,
          email: newPrimarySeller.email,
          whatsappNo: newPrimarySeller.whatsappNo,
          city: newPrimarySeller.city,
          country: newPrimarySeller.country,
          verificationStatus: newPrimarySeller.verificationStatus,
          _id: newPrimarySeller.sellerId
        };
      } else {
        // No sellers left, remove seller info
        product.seller = undefined;
        product.sellerInfo = undefined;
      }
    }

    await product.save();

    // Also remove from seller's listing requests
    const seller = await Seller.findById(req.seller._id);
    if (seller && seller.productListingRequests) {
      seller.productListingRequests = seller.productListingRequests.filter(
        request => request.productId.toString() !== productId
      );
      await seller.save();
    }

    console.log('✅ Seller unlisted from product:', {
      productId: product._id,
      sellerId: req.seller._id,
      remainingSellers: product.sellers?.length || 0,
      newPrimarySeller: product.seller
    });

    res.json({
      success: true,
      message: 'Product unlisted successfully. Your seller information has been removed.',
      productId: product._id,
      remainingSellers: product.sellers?.length || 0
    });
  } catch (error) {
    console.error('Error unlisting product:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all sellers for admin management
router.get('/admin/sellers', authenticateAdmin, async (req, res) => {
  try {
    const sellers = await Seller.find({})
      .select('username email supplierId whatsappNo city country productCategory verificationStatus status createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      sellers
    });
  } catch (error) {
    console.error('Error fetching sellers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get products by seller ID for admin
router.get('/admin/seller/:sellerId', authenticateAdmin, async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    const products = await Product.find({ seller: sellerId })
      .select('name price stock category marketplace currency approvalStatus status isAmazonsChoice createdAt images originalProductId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Error fetching seller products:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get seller's product listing requests
router.get('/listing-requests', authenticateSeller, async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller._id).select('productListingRequests');
    res.json({
      requests: seller.productListingRequests || []
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Debug route to check seller verification statuses
router.get('/debug/statuses', authenticateAdmin, async (req, res) => {
  try {
    const sellers = await Seller.find({}).select('username email verificationStatus status');
    
    const statusCounts = {
      approved: 0,
      pending: 0,
      required: 0,
      not_required: 0,
      rejected: 0,
      undefined: 0
    };
    
    sellers.forEach(seller => {
      const status = seller.verificationStatus || 'undefined';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    res.json({
      message: 'Seller verification status debug info',
      totalSellers: sellers.length,
      statusCounts,
      sellers: sellers.map(s => ({
        username: s.username,
        email: s.email,
        verificationStatus: s.verificationStatus,
        status: s.status
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Debug route to check recent seller products
router.get('/debug/recent-products', authenticateSeller, async (req, res) => {
  try {
    const Product = (await import('../models/Product.js')).default;
    
    // Get recent products created by this seller
    const recentProducts = await Product.find({
      seller: req.seller._id,
      $or: [
        { status: 'active' },
        { status: { $exists: false } } // Include products without status field for backward compatibility
      ]
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

    console.log('🔍 Debug - Recent seller products:', {
      sellerId: req.seller._id,
      productCount: recentProducts.length,
      products: recentProducts.map(p => ({
        id: p._id,
        name: p.name,
        hasSeller: !!p.seller,
        hasSellerInfo: !!p.sellerInfo,
        sellerInfo: p.sellerInfo,
        status: p.status,
        approvalStatus: p.approvalStatus
      }))
    });

    res.json({
      success: true,
      sellerId: req.seller._id,
      productCount: recentProducts.length,
      products: recentProducts.map(p => ({
        id: p._id,
        name: p.name,
        hasSeller: !!p.seller,
        hasSellerInfo: !!p.sellerInfo,
        sellerInfo: p.sellerInfo,
        status: p.status,
        approvalStatus: p.approvalStatus,
        createdAt: p.createdAt
      }))
    });
  } catch (error) {
    console.error('❌ Debug recent products error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Debug failed', 
      error: error.message 
    });
  }
});

// Debug route to check specific product's seller info
router.get('/debug/product-seller-info/:productId', authenticateSeller, async (req, res) => {
  try {
    const { productId } = req.params;
    const Product = (await import('../models/Product.js')).default;
    
    const product = await Product.findById(productId).lean();
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    console.log('🔍 Debug - Product seller info check:', {
      productId: product._id,
      productName: product.name,
      hasSeller: !!product.seller,
      sellerValue: product.seller,
      hasSellerInfo: !!product.sellerInfo,
      sellerInfoContent: product.sellerInfo,
      sellerInfoKeys: product.sellerInfo ? Object.keys(product.sellerInfo) : [],
      status: product.status,
      approvalStatus: product.approvalStatus,
      originalProductId: product.originalProductId,
      isAmazonsChoice: product.isAmazonsChoice
    });
    
    res.json({
      success: true,
      productId: product._id,
      productName: product.name,
      hasSeller: !!product.seller,
      sellerValue: product.seller,
      hasSellerInfo: !!product.sellerInfo,
      sellerInfo: product.sellerInfo,
      status: product.status,
      approvalStatus: product.approvalStatus
    });
  } catch (error) {
    console.error('❌ Debug product seller info error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Debug failed', 
      error: error.message 
    });
  }
});

export default router;