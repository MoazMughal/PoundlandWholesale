import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: String,
  price: { type: Number, required: true },
  originalPrice: Number,
  discount: Number,
  category: { type: String, required: true },
  subcategory: String,
  brand: String,
  images: [String],
  rating: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller' },
  isAmazonsChoice: { type: Boolean, default: false },
  isBestSeller: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'active' }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

async function markBestSellers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get top 20 products by rating and reviews
    const topProducts = await Product.find({ status: 'active' })
      .sort({ rating: -1, reviews: -1 })
      .limit(20);

    console.log(`📊 Found ${topProducts.length} top-rated products`);

    // Mark them as best sellers
    const productIds = topProducts.map(p => p._id);
    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { isBestSeller: true } }
    );

    console.log(`✅ Marked ${result.modifiedCount} products as Best Sellers`);
    console.log(`📊 Total Best Sellers: ${await Product.countDocuments({ isBestSeller: true })}`);

    // Show the products
    console.log('\n🏆 Best Sellers:');
    topProducts.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} - ⭐${p.rating} (${p.reviews} reviews)`);
    });

  } catch (error) {
    console.error('❌ Update failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

markBestSellers();
