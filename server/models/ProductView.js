import mongoose from 'mongoose';

const productViewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, default: '' },
  viewerType: { type: String, enum: ['buyer', 'seller', 'guest'], default: 'guest' },
  buyerId: { type: mongoose.Schema.Types.ObjectId, default: null },   // works for both buyer & seller IDs
  buyerName: { type: String, default: 'Guest' },
  buyerEmail: { type: String, default: '' },
  viewedAt: { type: Date, default: Date.now }
}, { timestamps: false });

productViewSchema.index({ productId: 1, viewedAt: -1 });
productViewSchema.index({ buyerId: 1 });

export default mongoose.model('ProductView', productViewSchema);
