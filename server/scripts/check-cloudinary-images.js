import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with correct credentials
cloudinary.config({
  cloud_name: 'dtuq3tvjx',
  api_key: '579392836352963',
  api_secret: 'KgbN_QCX2X3aAJ8IwKB-k6VNywY'
});

async function checkCloudinaryImages() {
  try {
    console.log('🔍 Checking Cloudinary images...\n');

    // List images in the products folder
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'products/',
      max_results: 10
    });

    console.log(`📊 Found ${result.resources.length} images (showing first 10):\n`);

    result.resources.forEach((resource, index) => {
      console.log(`${index + 1}. Public ID: ${resource.public_id}`);
      console.log(`   URL: ${resource.secure_url}`);
      console.log(`   Format: ${resource.format}`);
      console.log(`   Size: ${(resource.bytes / 1024).toFixed(2)} KB\n`);
    });

    // Check if we can construct URLs correctly
    console.log('\n🔧 Testing URL construction:');
    const testASIN = 'B000GCDAA8';
    const constructedUrl = cloudinary.url(`products/${testASIN}`, {
      secure: true,
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });
    console.log(`Test ASIN: ${testASIN}`);
    console.log(`Constructed URL: ${constructedUrl}`);

    // Try to get resource info for a specific ASIN
    try {
      const resourceInfo = await cloudinary.api.resource(`products/${testASIN}`);
      console.log(`✅ Image exists for ${testASIN}!`);
      console.log(`   URL: ${resourceInfo.secure_url}`);
    } catch (error) {
      console.log(`❌ Image not found for ${testASIN}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.error && error.error.message) {
      console.error('Details:', error.error.message);
    }
    process.exit(1);
  }
}

checkCloudinaryImages();
