// Enhanced image preloader with retry logic and fallback handling
import { getImageUrl } from './imageImports';
import { getApiUrl } from './api';

/**
 * Preload a single image with multiple fallback URLs
 * @param {string} src - Primary image source
 * @param {string} asin - Product ASIN for Excel images
 * @param {Object} options - Preload options
 * @returns {Promise<string>} - Resolved image URL
 */
export const preloadSingleImage = async (src, asin = null, options = {}) => {
  const {
    timeout = 10000,
    retries = 3,
    quality = 'high'
  } = options;

  // Generate all possible image URLs
  const imageUrls = [];
  
  // If we have an ASIN, try ASIN-based URLs first
  if (asin && asin.match(/^[A-Z0-9]{10}$/)) {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://generic-wholesale-backend.onrender.com' 
      : 'http://localhost:5000';
    imageUrls.push(`${baseUrl}/api/admin-excel/public/images/by-asin/${asin}`);
  }
  
  // Add the original source
  if (src) {
    if (src.startsWith('http')) {
      imageUrls.push(src);
    } else {
      const processedUrl = getImageUrl(src);
      if (processedUrl) {
        imageUrls.push(processedUrl);
      }
    }
  }
  
  // Add fallback placeholder
  const placeholderSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhmOWZhIiBzdHJva2U9IiNlNWU3ZWIiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjEyMCIgcj0iNDAiIGZpbGw9IiNkMWQ1ZGIiLz48cGF0aCBkPSJNMTEwIDE4MGg4MHYyMGgtODB6IiBmaWxsPSIjZDFkNWRiIi8+PHBhdGggZD0iTTEyMCAyMTBoNjB2MTBoLTYweiIgZmlsbD0iI2QxZDVkYiIvPjx0ZXh0IHg9IjE1MCIgeT0iMjYwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2Yjc2ODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkFtYXpvbidzIENob2ljZTwvdGV4dD48L3N2Zz4=';
  imageUrls.push(placeholderSvg);

  console.log('🔄 Preloading image with URLs:', imageUrls);

  // Try each URL in sequence
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        console.log(`🔄 Preload attempt ${attempt + 1}/${retries} for URL ${i + 1}/${imageUrls.length}:`, url);
        
        const loadedUrl = await loadImageWithTimeout(url, timeout);
        console.log('✅ Successfully preloaded:', loadedUrl);
        return loadedUrl;
        
      } catch (error) {
        console.warn(`❌ Preload failed (attempt ${attempt + 1}/${retries}):`, url, error.message);
        
        // If this is the last attempt for this URL, try next URL
        if (attempt === retries - 1) {
          break;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  // If all URLs failed, return the placeholder
  console.warn('⚠️ All image URLs failed, returning placeholder');
  return placeholderSvg;
};

/**
 * Load image with timeout
 * @param {string} url - Image URL
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<string>} - Loaded image URL
 */
const loadImageWithTimeout = (url, timeout) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Add crossorigin for external images
    if (url.startsWith('http') && !url.includes(window.location.hostname)) {
      img.crossOrigin = 'anonymous';
    }
    
    const timeoutId = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      reject(new Error(`Image load timeout: ${url}`));
    }, timeout);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(url);
    };
    
    img.onerror = (error) => {
      clearTimeout(timeoutId);
      reject(new Error(`Image load error: ${url}`));
    };
    
    img.src = url;
  });
};

/**
 * Preload multiple product images
 * @param {Array} products - Array of product objects
 * @param {string} quality - Image quality ('high', 'medium', 'low')
 * @returns {Promise<Object>} - Map of product IDs to loaded image URLs
 */
export const preloadProductImages = async (products, quality = 'medium') => {
  const imageMap = {};
  const concurrentLimit = 5; // Limit concurrent requests to avoid overwhelming the server
  
  console.log(`🚀 Starting preload of ${products.length} product images`);
  
  // Process products in batches
  for (let i = 0; i < products.length; i += concurrentLimit) {
    const batch = products.slice(i, i + concurrentLimit);
    
    const batchPromises = batch.map(async (product) => {
      try {
        const loadedUrl = await preloadSingleImage(product.image, product.asin, { quality });
        imageMap[product.id] = loadedUrl;
        console.log(`✅ Preloaded image for product: ${product.name}`);
      } catch (error) {
        console.warn(`❌ Failed to preload image for product: ${product.name}`, error);
        // Use placeholder for failed images
        imageMap[product.id] = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhmOWZhIiBzdHJva2U9IiNlNWU3ZWIiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjEyMCIgcj0iNDAiIGZpbGw9IiNkMWQ1ZGIiLz48cGF0aCBkPSJNMTEwIDE4MGg4MHYyMGgtODB6IiBmaWxsPSIjZDFkNWRiIi8+PHBhdGggZD0iTTEyMCAyMTBoNjB2MTBoLTYweiIgZmlsbD0iI2QxZDVkYiIvPjx0ZXh0IHg9IjE1MCIgeT0iMjYwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2Yjc2ODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkFtYXpvbidzIENob2ljZTwvdGV4dD48L3N2Zz4=';
      }
    });
    
    await Promise.allSettled(batchPromises);
    
    // Small delay between batches to avoid overwhelming the server
    if (i + concurrentLimit < products.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`✅ Completed preloading ${Object.keys(imageMap).length}/${products.length} images`);
  return imageMap;
};

/**
 * Check if an image URL is accessible
 * @param {string} url - Image URL to check
 * @returns {Promise<boolean>} - True if accessible
 */
export const checkImageAccessibility = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Get optimized image URL based on device and connection
 * @param {string} originalUrl - Original image URL
 * @param {Object} options - Optimization options
 * @returns {string} - Optimized image URL
 */
export const getOptimizedImageUrl = (originalUrl, options = {}) => {
  const {
    width = 400,
    height = 400,
    quality = 80,
    isMobile = false
  } = options;
  
  // For mobile devices, use smaller images
  if (isMobile) {
    // For API images, we can't add optimization parameters, so return as-is
    if (originalUrl.includes('/api/admin-excel/public/images/by-asin/')) {
      return originalUrl;
    }
    
    // For other images, you could add optimization parameters if supported
    return originalUrl;
  }
  
  return originalUrl;
};

export default {
  preloadSingleImage,
  preloadProductImages,
  checkImageAccessibility,
  getOptimizedImageUrl
};