// Test script to check image URL generation
import { getApiUrl } from './src/utils/api.js';

console.log('Testing image URL generation...');

const testAsin = 'B08T9472RG';
const imageUrl = `${getApiUrl('admin-excel/public/images/by-asin')}/${testAsin}`;

console.log('Generated URL:', imageUrl);
console.log('Environment:', import.meta.env.PROD ? 'production' : 'development');
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);

// Test if the URL is accessible
fetch(imageUrl)
  .then(response => {
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    return response;
  })
  .then(response => {
    if (response.ok) {
      console.log('✅ Image URL is accessible');
    } else {
      console.log('❌ Image URL returned error:', response.status, response.statusText);
    }
  })
  .catch(error => {
    console.log('❌ Failed to fetch image:', error.message);
  });