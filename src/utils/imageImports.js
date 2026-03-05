// Dynamic image imports for all product images
// This file centralizes all image imports to work with Vite's build system

import { getOptimizedCloudinaryUrl, isCloudinaryUrl, getFallbackImageUrl } from './cloudinary.js';

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
 * Get the optimized image URL for a given image path
 * @param {string} imagePath - Path like '/main-pics/image.jpg' or 'image.jpg' or Cloudinary URL
 * @param {Object} options - Optimization options (width, height, quality, etc.)
 * @returns {string} - The optimized image URL
 */
export const getImageUrl = (imagePath, options = {}) => {
  if (!imagePath) return getFallbackImageUrl();
  
  // If it's a Cloudinary URL, optimize it
  if (isCloudinaryUrl(imagePath)) {
    return getOptimizedCloudinaryUrl(imagePath, {
      width: options.width || 400,
      height: options.height || 400,
      quality: options.quality || 'auto',
      format: options.format || 'auto',
      crop: options.crop || 'fit' // Changed from 'fill' to 'fit' to show full image
    });
  }
  
  // If it's already a full URL or imported module, return as is
  if (imagePath.startsWith('http') || imagePath.startsWith('data:') || imagePath.startsWith('blob:')) {
    return imagePath;
  }
  
  // Handle API URLs for Excel uploaded images - convert to full URL
  if (imagePath.includes('admin-excel/public/images/by-asin/')) {
    // Get the base URL from environment
    const baseUrl = import.meta.env.PROD 
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
    const baseUrl = import.meta.env.PROD 
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
  
  // For production, if it's a relative path that doesn't match any imported asset,
  // it might be a server-side image that should be served directly
  if (import.meta.env.PROD && !imagePath.startsWith('http')) {
    // Check if it looks like an ASIN or server path
    if (imagePath.match(/^[A-Z0-9]{10}$/)) {
      const baseUrl = 'https://generic-wholesale-backend.onrender.com';
      return `${baseUrl}/api/admin-excel/public/images/by-asin/${imagePath}`;
    }
  }
  
  // Fallback: return original path (will likely 404 but won't break the app)
  return imagePath || getFallbackImageUrl();
};

/**
 * Process product data to convert image paths to optimized URLs
 * @param {Object|Array} data - Product object or array of products
 * @param {Object} options - Image optimization options
 * @returns {Object|Array} - Processed data with converted image URLs
 */
export const processProductImages = (data, options = {}) => {
  if (Array.isArray(data)) {
    return data.map(item => processProductImages(item, options));
  }
  
  if (data && typeof data === 'object') {
    const processed = { ...data };
    
    // Convert image field if it exists
    if (processed.image) {
      processed.image = getImageUrl(processed.image, options);
    }
    
    // Convert images array if it exists
    if (Array.isArray(processed.images)) {
      processed.images = processed.images.map(img => getImageUrl(img, options));
    }
    
    return processed;
  }
  
  return data;
};

export default imageMap;
