import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true // Index for faster search
  },
  description: String,
  features: [String], // Array of feature strings for "About this item" section
  price: {
    type: Number,
    required: true
  },
  originalPrice: Number,
  rrp: Number, // Recommended Retail Price
  discount: Number,
  category: {
    type: String,
    required: true
  },
  subcategory: String,
  brand: String,
  images: [String],
  rating: {
    type: Number,
    default: 0
  },
  reviews: {
    type: Number,
    default: 0
  },
  stock: {
    type: Number,
    default: 0
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller'
  },
  // Seller contact info (cached for performance)
  sellerInfo: {
    businessName: String,
    whatsappNo: String,
    city: String,
    country: String,
    verificationStatus: String
  },
  isAmazonsChoice: {
    type: Boolean,
    default: false
  },
  isBestSeller: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'approved', 'rejected'],
    default: 'active'
  },
  isAdminProduct: {
    type: Boolean,
    default: true // Admin products are default
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved' // Admin products are auto-approved
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: Date,
  rejectionReason: String,
  weight: String,
  dimensions: String,
  originalAdminProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  paymentTransactionId: String,
  listedAt: Date,
  monthlyProfit: String,
  yearlyProfit: String,
  dealUnits: {
    type: Number,
    default: 1
  },
  platformUnits: {
    type: Number,
    default: 200
  },
  costPrice: {
    type: Number,
    default: 0
  },
  asin: {
    type: String,
    sparse: true,
    index: true
  },
  marketplace: {
    type: String,
    enum: ['UK', 'UAE', 'US', 'Amazon10', 'Other'],
    default: 'UK'
  },
  currency: {
    type: String,
    enum: ['GBP', 'AED', 'USD', 'PKR'],
    default: 'GBP'
  },
  listedBy: {
    type: String,
    enum: ['admin', 'seller'],
    default: 'admin'
  },
  isLatestDeal: {
    type: Boolean,
    default: false
  },
  showOnHome: {
    type: Boolean,
    default: false
  },
  // Platform Comparison Data
  platformComparison: [{
    platform: {
      type: String,
      required: true
    },
    rrpPerUnit: {
      type: Number,
      required: true
    },
    units: {
      type: Number,
      default: 200
    },
    profitFor200Units: {
      type: Number,
      required: true
    },
    markup: {
      type: String,
      required: true
    }
  }],
  // Profit Calculations Data
  profitCalculations: {
    profitPerUnit: {
      type: Number,
      default: 0
    },
    profitFor200Units: {
      type: Number,
      default: 0
    },
    dealUnitsProfit: {
      type: Number,
      default: 0
    },
    profitForDealUnits: {
      type: Number,
      default: 0
    }
  },
  // Profit Evaluation Data
  profitEvaluation: {
    salesProceeds: {
      type: Number,
      default: 0
    },
    commission: {
      type: Number,
      default: 0
    },
    commissionTax: {
      type: Number,
      default: 0
    },
    digitalServicesFee: {
      type: Number,
      default: 0
    },
    digitalServicesTax: {
      type: Number,
      default: 0
    },
    fbaFulfilmentFee: {
      type: Number,
      default: 0
    },
    fbaFulfilmentTax: {
      type: Number,
      default: 0
    },
    balanceChange: {
      type: Number,
      default: 0
    },
    productCost: {
      type: Number,
      default: 0
    },
    netProfit: {
      type: Number,
      default: 0
    }
  },
  // Keep existing field
  showOnHome: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text', brand: 'text' }); // Text search
productSchema.index({ status: 1, isAmazonsChoice: 1, originalAdminProductId: 1 }); // Optimized compound index for main query
productSchema.index({ category: 1, isAmazonsChoice: 1 }); // Category + Amazon's Choice filter
productSchema.index({ category: 1, isBestSeller: 1 }); // Category + Best Seller filter
productSchema.index({ seller: 1, status: 1 }); // Seller products query
productSchema.index({ isAmazonsChoice: 1, status: 1 }); // Amazon's Choice products
productSchema.index({ isBestSeller: 1, status: 1 }); // Best Seller products
productSchema.index({ price: 1 }); // Price sorting
productSchema.index({ rating: -1 }); // Rating sorting
productSchema.index({ createdAt: -1 }); // Latest products

export default mongoose.model('Product', productSchema);
