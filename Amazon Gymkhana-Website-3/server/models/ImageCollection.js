import mongoose from 'mongoose';

const imageCollectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  imageCount: {
    type: Number,
    default: 0
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  extractedPath: {
    type: String
  },
  status: {
    type: String,
    enum: ['uploaded', 'extracting', 'extracted', 'error'],
    default: 'uploaded'
  }
}, {
  timestamps: true
});

const ImageCollection = mongoose.model('ImageCollection', imageCollectionSchema);

export default ImageCollection;