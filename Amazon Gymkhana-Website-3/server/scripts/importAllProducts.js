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

async function importAllProducts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Read the extracted products JSON
    const productsPath = path.join(__dirname, '../../src/data/extracted-products.json');
    const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

    console.log(`📦 Found ${productsData.length} products in JSON file`);

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const product of productsData) {
      try {
        // Parse price (remove currency symbols)
        const priceStr = product.price?.toString().replace(/[£$₨,]/g, '') || '0';
        const price = parseFloat(priceStr) || 0;
        
        // Parse original price if available
        const originalPriceStr = product.originalPrice?.toString().replace(/[£$₨,]/g, '');
        const originalPrice = originalPriceStr ? parseFloat(originalPriceStr) : price;

        // Calculate discount if not provided
        let discount = product.discount || 0;
        if (!discount && originalPrice > price) {
          discount = Math.round(((originalPrice - price) / originalPrice) * 100);
        }

        // Prepare product data
        const productData = {
          name: product.name || 'Unnamed Product',
          description: product.description || '',
          price: price,
          originalPrice: originalPrice,
          discount: discount,
          category: product.category || 'Uncategorized',
          subcategory: product.subcategory || '',
          brand: product.brand || '',
          images: Array.isArray(product.images) ? product.images : [product.image || ''],
          rating: parseFloat(product.rating) || 4.0,
          reviews: parseInt(product.reviews) || 0,
          stock: parseInt(product.stock) || 50,
          isAmazonsChoice: true, // All products are Amazon's Choice
          isBestSeller: product.isBestSeller || false,
          status: 'active'
        };

        // Make name unique by appending product ID if duplicate exists
        let uniqueName = productData.name;
        const existingProduct = await Product.findOne({ name: uniqueName });
        
        if (existingProduct) {
          // Check if it's truly the same product (same category and similar price)
          const priceDiff = Math.abs(existingProduct.price - productData.price);
          const isSameProduct = existingProduct.category === productData.category && priceDiff < 1;
          
          if (isSameProduct) {
            // Update existing product
            await Product.findByIdAndUpdate(existingProduct._id, productData);
            updated++;
          } else {
            // Different product with same name - make it unique
            uniqueName = `${productData.name} (${product.id || product.category})`;
            productData.name = uniqueName;
            
            const newProduct = new Product(productData);
            await newProduct.save();
            imported++;
          }
        } else {
          // Create new product
          const newProduct = new Product(productData);
          await newProduct.save();
          imported++;
        }

        if ((imported + updated) % 50 === 0) {
          console.log(`✅ Processed ${imported + updated} products...`);
        }
      } catch (err) {
        errors.push({ name: product.name, error: err.message });
        skipped++;
      }
    }

    console.log('\n🎉 Import Complete!');
    console.log(`✅ Newly imported: ${imported} products`);
    console.log(`🔄 Updated existing: ${updated} products`);
    console.log(`⏭️ Skipped (errors): ${skipped} products`);
    console.log(`📊 Total in database: ${await Product.countDocuments()}`);

    if (errors.length > 0 && errors.length <= 10) {
      console.log('\n❌ Errors:');
      errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
    } else if (errors.length > 10) {
      console.log(`\n❌ ${errors.length} errors occurred (showing first 10):`);
      errors.slice(0, 10).forEach(e => console.log(`  - ${e.name}: ${e.error}`));
    }

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

importAllProducts();
