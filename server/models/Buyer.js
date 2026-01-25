import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const buyerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  userType: {
    type: String,
    enum: ['buyer', 'supplier', 'both'],
    default: 'buyer'
  },
  phone: {
    type: String,
    trim: true
  },
  whatsappNo: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'Pakistan' }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  orders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  unlockedSuppliers: [{
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller'
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    },
    paymentId: String
  }],
  paymentHistory: [{
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'PKR'
    },
    paymentMethod: {
      type: String,
      enum: ['jazzcash', 'easypaisa', 'bank_transfer', 'visa', 'mastercard'],
      required: true
    },
    transactionId: String,
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller'
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'failed'],
      default: 'pending'
    },
    paymentReceipt: {
      type: String // Base64 encoded image or URL
    },
    adminNotes: String,
    paymentDate: {
      type: Date,
      default: Date.now
    },
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    description: String
  }],
  lastLogin: {
    type: Date
  },
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
  passwordResetTokenExpiry: Date,
  supplierUnlocked: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

buyerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

buyerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

buyerSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

export default mongoose.model('Buyer', buyerSchema);
