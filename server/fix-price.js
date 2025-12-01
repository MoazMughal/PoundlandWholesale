// Quick fix to restore the price for the RABEEY product
import mongoose from 'mongoose';

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/amazon-gymkhana', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const productSchema = new mongoose.Schema({}, { strict: false });
const Product = mongoose.model('Product', productSchema);

const fixPrice = async () => {
  try {
    const productId = '69204d6f66a7bfb09b2e4e66';
    
    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      console.log('Product not found');
      return;
    }
    
    console.log('Current price:', product.price);
    console.log('Original price:', product.originalPrice);
    
    // If price is 0 but originalPrice exists, restore it
    if (product.price === 0 && product.originalPrice) {
      await Product.findByIdAndUpdate(productId, {
        price: product.originalPrice
      });
      console.log('✅ Price restored from', product.price, 'to', product.originalPrice);
    } else if (product.price === 0) {
      // Set a reasonable default price
      await Product.findByIdAndUpdate(productId, {
        price: 150 // Based on the test data we saw earlier
      });
      console.log('✅ Price set to default: 150');
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
};

fixPrice();