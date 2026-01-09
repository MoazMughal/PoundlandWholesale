// Dynamic image imports for all product images
// This file centralizes all image imports to work with Vite's build system

// Import images from all asset folders
const imageModules = import.meta.glob('../assets/**/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', { eager: true });

// Create a mapping of image filenames to their imported URLs
const imageMap = {};

Object.keys(imageModules).forEach((path) => {
  // Extract filename from path: '../assets/main-pics/image.jpg' -> 'image.jpg'
  const filename = path.split('/').pop();
  imageMap[filename] = imageModules[path].default;
  
  // Also store with lowercase for case-insensitive matching
  imageMap[filename.toLowerCase()] = imageModules[path].default;
});

/**
 * Get the imported image URL for a given image path
 * @param {string} imagePath - Path like '/main-pics/image.jpg' or 'image.jpg'
 * @returns {string} - The imported image URL
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  
  // If it's already a full URL or imported module, return as is
  if (imagePath.startsWith('http') || imagePath.startsWith('data:') || imagePath.startsWith('blob:')) {
    return imagePath;
  }
  
  // Handle API URLs for Excel uploaded images - convert to full URL
  if (imagePath.includes('admin-excel/public/images/by-asin/')) {
    // Get the base URL from environment
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://generic-wholesale-backend.onrender.com' 
      : 'http://localhost:5000';
    
    // Ensure the path starts with /api/
    let cleanPath = imagePath;
    if (!cleanPath.startsWith('/api/')) {
      if (cleanPath.startsWith('/')) {
        cleanPath = `/api${cleanPath}`;
      } else {
        cleanPath = `/api/${cleanPath}`;
      }
    }
    
    const fullUrl = `${baseUrl}${cleanPath}`;
    return fullUrl;
  }
  
  // Handle ASIN-only strings (for Excel products)
  if (imagePath.match(/^[A-Z0-9]{10}$/)) {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://generic-wholesale-backend.onrender.com' 
      : 'http://localhost:5000';
    const asinUrl = `${baseUrl}/api/admin-excel/public/images/by-asin/${imagePath}`;
    return asinUrl;
  }
  
  // Extract just the filename for local assets
  const filename = imagePath.split('/').pop();
  
  // Try exact match first
  if (imageMap[filename]) {
    return imageMap[filename];
  }
  
  // Try lowercase match
  if (imageMap[filename.toLowerCase()]) {
    return imageMap[filename.toLowerCase()];
  }
  
  // Fallback: return original path (will likely 404 but won't break the app)
  return imagePath;
};

/**
 * Process product data to convert image paths to imported URLs
 * @param {Object|Array} data - Product object or array of products
 * @returns {Object|Array} - Processed data with converted image URLs
 */
export const processProductImages = (data) => {
  if (Array.isArray(data)) {
    return data.map(item => processProductImages(item));
  }
  
  if (data && typeof data === 'object') {
    const processed = { ...data };
    
    // Convert image field if it exists
    if (processed.image) {
      processed.image = getImageUrl(processed.image);
    }
    
    // Convert images array if it exists
    if (Array.isArray(processed.images)) {
      processed.images = processed.images.map(img => getImageUrl(img));
    }
    
    return processed;
  }
  
  return data;
};

export default imageMap;
