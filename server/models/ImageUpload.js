import mongoose from 'mongoose';

const imageUploadSchema = new mongoose.Schema({
  originalFileName: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  summary: {
    totalImages: { type: Number, default: 0 },
    validImages: { type: Number, default: 0 },
    matchedAsins: { type: Number, default: 0 },
    errors: { type: Number, default: 0 }
  },
  images: [{
    fileName: String,
    asin: String,
    imageNumber: { type: Number, default: 1 }, // New field for numbered images
    filePath: String,
    cloudinaryUrl: String, // New field for Cloudinary URL
    fileSize: Number,
    matched: { type: Boolean, default: false },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }
  }],
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  }
});

export default mongoose.model('ImageUpload', imageUploadSchema);