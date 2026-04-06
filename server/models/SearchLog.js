import mongoose from 'mongoose';

const searchLogSchema = new mongoose.Schema({
  query: { type: String, required: true, trim: true },
  page: { type: String, default: 'amazons-choice' },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', default: null },
  buyerName: { type: String, default: 'Guest' },
  buyerEmail: { type: String, default: '' },
  resultsCount: { type: Number, default: 0 },
  searchedAt: { type: Date, default: Date.now }
}, { timestamps: false });

searchLogSchema.index({ query: 1 });
searchLogSchema.index({ searchedAt: -1 });

export default mongoose.model('SearchLog', searchLogSchema);
