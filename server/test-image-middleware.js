import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import { optimizeProductImages, mobileImageOptimization, addResponsiveImages } from './middleware/imageOptimization.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server directory
dotenv.config({ path: path.join(__dirname, '.env') });

async function testImageMiddleware() {
  try {
    console.log('🧪 Testing image optimization middleware...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get a sample product with Cloudinary image
    const sampleProduct = await Product.findOne({
      isAmazonsChoice: true,
      status: 'active',
      images: { $regex: 'cloudinary.com' }
    }).select('name asin images').lean();
    
    if (!sampleProduct) {
      console.log('❌ No sample product found');
      return;
    }
    
    console.log('\n📋 Sample Product:');
    console.log(`Name: ${sampleProduct.name}`);
    console.log(`ASIN: ${sampleProduct.asin}`);
    console.log(`Original Images: ${JSON.stringify(sampleProduct.images)}`);
    
    // Test the middleware by simulating a request/response
    const mockReq = {
      query: {
        imageWidth: '300',
        imageHeight: '300',
        imageQuality: 'auto',
        imageFormat: 'auto'
      },
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    const mockRes = {
      json: function(data) {
        console.log('\n🔧 Middleware Output:');
        if (data.products && data.products[0]) {
          const processedProduct = data.products[0];
          console.log(`Processed Images: ${JSON.stringify(processedProduct.images)}`);
          console.log(`Responsive Images: ${JSON.stringify(processedProduct.responsiveImages)}`);
          
          // Test if the processed URLs are valid
          if (processedProduct.images && processedProduct.images[0]) {
            console.log('\n🌐 Testing processed URL...');
            testImageUrl(processedProduct.images[0]);
          }
        } else {
          console.log('No products in processed data');
        }
        return data;
      }
    };
    
    const mockNext = () => {};
    
    // Apply middleware
    console.log('\n🔧 Applying image optimization middleware...');
    
    // Apply mobile optimization
    mobileImageOptimization(mockReq, mockRes, mockNext);
    
    // Apply image optimization
    optimizeProductImages(mockReq, mockRes, mockNext);
    
    // Apply responsive images
    addResponsiveImages(mockReq, mockRes, mockNext);
    
    // Simulate the response
    const mockData = {
      products: [sampleProduct]
    };
    
    mockRes.json(mockData);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

async function testImageUrl(url) {
  try {
    console.log(`Testing URL: ${url}`);
    
    // Use node-fetch or similar to test the URL
    const response = await fetch(url);
    
    if (response.ok) {
      console.log(`✅ URL is accessible (${response.status})`);
      console.log(`Content-Type: ${response.headers.get('content-type')}`);
      console.log(`Content-Length: ${response.headers.get('content-length')}`);
    } else {
      console.log(`❌ URL returned ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ URL test failed: ${error.message}`);
  }
}

testImageMiddleware();