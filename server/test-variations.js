const mongoose = require('mongoose');

// Import the Product model
const productSchema = new mongoose.Schema({
  name: String,
  variations: [{
    type: String,
    name: String,
    options: [{
      value: String,
      productId: mongoose.Schema.Types.ObjectId
    }]
  }]
}, { collection: 'products' });

const Product = mongoose.model('Product', productSchema);

async function testVariations() {
  try {
    await mongoose.connect('mongodb://localhost:27017/wholesale-platform', { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Find products with variations
    const productsWithVariations = await Product.find({ 
      variations: { $exists: true, $ne: [] } 
    }).select('name variations').limit(5);
    
    console.log(`📊 Products with variations found: ${productsWithVariations.length}`);
    
    if (productsWithVariations.length > 0) {
      console.log('\n🎨 Existing variations:');
      productsWithVariations.forEach(product => {
        console.log(`\n- ${product.name}`);
        console.log(`  ID: ${product._id}`);
        console.log(`  Variations: ${product.variations.length}`);
        product.variations.forEach((variation, idx) => {
          console.log(`    ${idx + 1}. ${variation.type} (${variation.name}): ${variation.options.length} options`);
          variation.options.forEach((option, optIdx) => {
            console.log(`       - ${option.value}${option.productId ? ' (linked to ' + option.productId + ')' : ''}`);
          });
        });
      });
    } else {
      console.log('\n📝 No products with variations found. You can test by:');
      console.log('1. Going to admin panel (/admin/products)');
      console.log('2. Click the 🎨 button on any product');
      console.log('3. Add variations with the new format');
      console.log('4. The display will show: Current(type): value, variation1(type): value');
    }
    
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('Make sure MongoDB is running and the database exists.');
    process.exit(1);
  }
}

testVariations();