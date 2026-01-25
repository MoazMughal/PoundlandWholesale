import mongoose from 'mongoose';

const paymentVerificationSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Buyer',
    required: true
  },
  buyerName: {
    type: String,
    required: true
  },
  buyerEmail: {
    type: String,
    required: true
  },
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  paymentReceipt: {
    filename: String,
    path: String,
    mimetype: String,
    size: Number
  },
  idPicture: {
    filename: String,
    path: String,
    mimetype: String,
    size: Number
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    default: ''
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Index for efficient queries
paymentVerificationSchema.index({ buyerId: 1, status: 1 });
paymentVerificationSchema.index({ status: 1, submittedAt: -1 });

const PaymentVerification = mongoose.model('PaymentVerification', paymentVerificationSchema);

export default PaymentVerification;