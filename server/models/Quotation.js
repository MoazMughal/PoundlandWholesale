import mongoose from 'mongoose';

const quotationSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, required: true },
  sellerUsername: { type: String, required: true },
  sellerWhatsapp: { type: String },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer' },
  buyerName: { type: String },
  buyerEmail: { type: String },
  buyerPhone: { type: String },
  quantity: { type: Number, default: 1 },
  sellerPrice: { type: Number },
  message: { type: String },
  status: {
    type: String,
    enum: ['pending', 'viewed', 'responded', 'closed'],
    default: 'pending'
  },
  ipAddress: { type: String },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Quotation', quotationSchema);
