import mongoose from 'mongoose';

const wishlistQuerySchema = new mongoose.Schema({
  // Sender type
  senderType: { type: String, enum: ['buyer', 'guest'], default: 'buyer' },

  // Buyer who created this (optional for guests)
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Buyer', default: null },
  buyerName: String,
  buyerEmail: String,
  buyerWhatsapp: String,

  // Product details (buyer describes what they want)
  productName: { type: String, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null }, // linked product if from Amazon's Choice
  productDescription: String,
  quantity: { type: Number, default: 1 },
  targetPrice: Number,          // buyer's budget per unit
  currency: { type: String, default: 'GBP' },
  category: String,
  imageUrl: String,             // optional reference image URL

  // Tagged sellers (buyer can tag specific sellers)
  taggedSellers: [{
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
    username: String,
    whatsappNo: String,
    notifiedAt: Date
  }],

  // Seller responses
  responses: [{
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
    sellerUsername: String,
    sellerWhatsapp: String,
    message: String,
    offerPrice: Number,
    status: { type: String, enum: ['interested', 'not_available', 'offer_sent'], default: 'interested' },
    respondedAt: { type: Date, default: Date.now }
  }],

  status: {
    type: String,
    enum: ['open', 'in_progress', 'fulfilled', 'closed'],
    default: 'open'
  },
  notes: String
}, { timestamps: true });

export default mongoose.model('WishlistQuery', wishlistQuerySchema);
