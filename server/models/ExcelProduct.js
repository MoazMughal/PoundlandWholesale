import mongoose from 'mongoose';

const excelProductSchema = new mongoose.Schema({
  // Reference to the Excel upload
  excelUploadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExcelUpload',
    required: true,
    index: true
  },
  
  // Product data from Excel
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  asin: {
    type: String,
    sparse: true,
    trim: true,
    uppercase: true,
    index: true,
    validate: {
      validator: function(v) {
        return !v || /^[A-Z0-9]{10}$/.test(v);
      },
      message: 'ASIN must be exactly 10 alphanumeric characters'
    }
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: Number,
  category: {
    type: String,
    required: true,
    index: true
  },
  rating: {
    type: Number,
    default: 4.0,
    min: 0,
    max: 5
  },
  reviews: {
    type: Number,
    default: 0,
    min: 0
  },
  dealUnits: {
    type: Number,
    default: 1,
    min: 1
  },
  stock: {
    type: Number,
    default: 100,
    min: 0
  },
  description: String,
  brand: String,
  images: [String],
  currency: {
    type: String,
    default: 'GBP'
  },
  
  // Excel-specific fields
  rowNumber: {
    type: Number,
    required: true
  },
  rawData: mongoose.Schema.Types.Mixed, // Store original Excel row data
  
  // Status management
  status: {
    type: String,
    enum: ['pending', 'active', 'inactive', 'listed'],
    default: 'pending',
    index: true
  },
  
  // Listing management
  isListed: {
    type: Boolean,
    default: false,
    index: true
  },
  listedAt: Date,
  listedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // If converted to main product
  mainProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  isConverted: {
    type: Boolean,
    default: false,
    index: true
  },
  convertedAt: Date
  
}, { timestamps: true });

// Compound indexes for efficient queries
excelProductSchema.index({ excelUploadId: 1, status: 1 });
excelProductSchema.index({ excelUploadId: 1, isListed: 1 });
excelProductSchema.index({ excelUploadId: 1, category: 1 });
excelProductSchema.index({ asin: 1, excelUploadId: 1 }, { sparse: true });

export default mongoose.model('ExcelProduct', excelProductSchema);