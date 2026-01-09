import mongoose from 'mongoose';

const excelFileSchema = new mongoose.Schema({
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
  productCount: {
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
  lastProcessed: {
    type: Date
  },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'processed', 'error'],
    default: 'uploaded'
  },
  metadata: {
    sheets: [String],
    columns: [String],
    totalRows: Number
  }
}, {
  timestamps: true
});

const ExcelFile = mongoose.model('ExcelFile', excelFileSchema);

export default ExcelFile;