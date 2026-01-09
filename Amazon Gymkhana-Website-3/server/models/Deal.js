import mongoose from 'mongoose';

const dealSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  dealType: {
    type: String,
    enum: ['lightning', 'daily', 'clearance', 'featured'],
    default: 'featured'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

dealSchema.index({ endDate: 1, isActive: 1 });

export default mongoose.model('Deal', dealSchema);
