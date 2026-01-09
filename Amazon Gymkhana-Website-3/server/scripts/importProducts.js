import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
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

async function importProducts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Read the extracted products JSON
    const productsPath = path.join(__dirname, '../../src/data/extracted-products.json');
    const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

    console.log(`📦 Found ${productsData.length} products to import`);

    // Clear existing products (optional - comment out if you want to keep existing)
    // await Product.deleteMany({});
    // console.log('🗑️ Cleared existing products');

    let imported = 0;
    let skipped = 0;

    for (const product of productsData) {
      try {
        // Check if product already exists (by name to avoid duplicates)
        const exists = await Product.findOne({ name: product.name });
        if (exists) {
          skipped++;
          continue;
        }

        // Map the product data to match your schema
        const newProduct = new Product({
          name: product.name || 'Unnamed Product',
          description: product.description || '',
          price: parseFloat(product.price) || 0,
          originalPrice: parseFloat(product.originalPrice) || parseFloat(product.price) || 0,
          discount: product.discount || 0,
          category: product.category || 'Uncategorized',
          subcategory: product.subcategory || '',
          brand: product.brand || '',
          images: Array.isArray(product.images) ? product.images : [product.image || ''],
          rating: parseFloat(product.rating) || 4.0,
          reviews: parseInt(product.reviews) || 0,
          stock: parseInt(product.stock) || 50,
          isAmazonsChoice: true, // All products from extracted-products.json are Amazon's Choice
          isBestSeller: product.isBestSeller || false,
          status: 'active'
        });

        await newProduct.save();
        imported++;

        if (imported % 10 === 0) {
          console.log(`✅ Imported ${imported} products...`);
        }
      } catch (err) {
        console.error(`❌ Error importing product "${product.name}":`, err.message);
      }
    }

    console.log('\n🎉 Import Complete!');
    console.log(`✅ Successfully imported: ${imported} products`);
    console.log(`⏭️ Skipped (already exists): ${skipped} products`);
    console.log(`📊 Total in database: ${await Product.countDocuments()}`);

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

importProducts();
