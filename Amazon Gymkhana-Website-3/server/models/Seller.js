import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const sellerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  contactNo: {
    type: String,
    required: false // Made optional since we're adding WhatsApp
  },
  whatsappNo: {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  productCategory: {
    type: String,
    required: true
  },
  supplierId: {
    type: String,
    unique: true
  },
  status: {
    type: String,
    enum: ['active', 'verification_required', 'verification_pending', 'verified', 'suspended', 'rejected'],
    default: 'active' // Can login immediately after registration
  },
  verificationStatus: {
    type: String,
    enum: ['not_required', 'required', 'pending', 'approved', 'rejected'],
    default: 'required'
  },
  dashboardAccessExpiry: {
    type: Date,
    default: function() {
      // 15 days from registration
      return new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    }
  },
  verificationDocuments: {
    cnicNumber: String,
    idCardFront: String,
    idCardBack: String,
    idCardWithFace: String,
    submittedAt: Date
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: Date,
  verificationApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  verificationApprovedAt: Date,
  verificationRejectionReason: String,
  paymentHistory: [{
    amount: Number,
    paymentDate: Date,
    paymentMethod: String,
    transactionId: String,
    purpose: String, // 'registration', 'product_listing'
    productId: String, // For product listing payments
    productName: String, // For product listing payments
    paymentDetails: {
      receiptImage: String, // For JazzCash
      cardNumber: String, // For card payments (encrypted)
      cardHolderName: String, // For card payments
      expiryDate: String, // For card payments
      cvv: String // For card payments (encrypted)
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    }
  }],
  canListProducts: {
    type: Boolean,
    default: false
  },
  hasRegistrationPayment: {
    type: Boolean,
    default: false
  },
  dashboardAccessible: {
    type: Boolean,
    default: true
  },
  productListingRequests: [{
    productId: String,
    productName: String,
    productPrice: Number,
    transactionId: String,
    paymentMethod: String,
    notes: String,
    receiptImage: String, // Base64 encoded image
    status: {
      type: String,
      enum: ['pending_approval', 'approved', 'rejected'],
      default: 'pending_approval'
    },
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    rejectionReason: String
  }],
  // Password reset fields (OTP-based)
  passwordResetOTP: String,
  passwordResetOTPSalt: String,
  passwordResetOTPExpiry: Date,
  passwordResetOTPAttempts: {
    type: Number,
    default: 0
  },
  // Password reset fields (Token-based)
  passwordResetToken: String,
  passwordResetTokenExpiry: Date
}, { timestamps: true });

// Generate unique supplier ID
sellerSchema.pre('save', async function(next) {
  if (!this.isModified('password') && this.supplierId) return next();
  
  // Hash password
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  
  // Generate supplier ID if new seller
  if (!this.supplierId) {
    const count = await mongoose.model('Seller').countDocuments();
    this.supplierId = `SUP${String(count + 1).padStart(6, '0')}`;
  }
  
  next();
});

sellerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Check if seller can access dashboard
sellerSchema.methods.canAccessDashboard = function() {
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((this.dashboardAccessExpiry - now) / (1000 * 60 * 60 * 24)));
  
  // If verification is approved, always allow access
  if (this.verificationStatus === 'approved') {
    return { canAccess: true, reason: null, daysRemaining: null };
  }
  
  // If verification is pending, allow access but show notification
  if (this.verificationStatus === 'pending') {
    return { 
      canAccess: true, 
      reason: 'verification_pending',
      message: 'Your verification documents are under review. Please wait for admin approval.',
      showNotification: true,
      daysRemaining: null
    };
  }
  
  // If verification was rejected, allow access but show notification
  if (this.verificationStatus === 'rejected') {
    return { 
      canAccess: true, 
      reason: 'verification_rejected',
      message: 'Your verification was rejected. Please resubmit your documents.',
      showNotification: true,
      daysRemaining: null
    };
  }
  
  // For sellers who need verification (required or not_required)
  if (this.verificationStatus === 'required' || this.verificationStatus === 'not_required') {
    // If 15 days have passed, block access
    if (now > this.dashboardAccessExpiry) {
      return { 
        canAccess: false, 
        reason: 'trial_expired',
        message: 'Your 15-day trial period has expired. Please submit verification documents to continue accessing your dashboard.',
        daysRemaining: 0
      };
    }
    
    // If within 15 days, allow access with warning
    return { 
      canAccess: true, 
      reason: 'verification_required',
      message: `You have ${daysRemaining} days remaining in your trial period. Please submit verification documents to avoid dashboard access interruption.`,
      showNotification: daysRemaining <= 5, // Show notification when 5 days or less remaining
      daysRemaining: daysRemaining
    };
  }
  
  return { canAccess: false, reason: 'unknown', daysRemaining: 0 };
};

export default mongoose.model('Seller', sellerSchema);
