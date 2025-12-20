import mongoose from 'mongoose';

const excelUploadSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
    trim: true
  },
  originalFileName: {
    type: String,
    required: true,
    trim: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: false // Make it optional for now
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  summary: {
    totalRows: { type: Number, default: 0 },
    processedProducts: { type: Number, default: 0 },
    insertedProducts: { type: Number, default: 0 },
    updatedProducts: { type: Number, default: 0 },
    errors: { type: Number, default: 0 },
    categories: [String]
  },
  errorDetails: [String],
  processingTime: Number, // in milliseconds
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Indexes for better performance
excelUploadSchema.index({ uploadedAt: -1 });
excelUploadSchema.index({ uploadedBy: 1 });
excelUploadSchema.index({ status: 1 });
excelUploadSchema.index({ isActive: 1 });

export default mongoose.model('ExcelUpload', excelUploadSchema);