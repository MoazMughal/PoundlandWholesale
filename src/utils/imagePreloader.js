// Enhanced image preloader with retry logic and fallback handling
import { getImageUrl } from './imageImports';
import { getApiUrl } from './api';
import { getOptimalLoadingConfig } from './networkDetection';

/**
 * Preload a single image with multiple fallback URLs and network optimization
 * @param {string} src - Primary image source
 * @param {string} asin - Product ASIN for Excel images
 * @param {Object} options - Preload options
 * @returns {Promise<string>} - Resolved image URL
 */
export const preloadSingleImage = async (src, asin = null, options = {}) => {
  // Get optimal loading config based on network conditions
  const networkConfig = getOptimalLoadingConfig();
  
  const {
    timeout = networkConfig.timeout,
    retries = networkConfig.retries,
    quality = networkConfig.quality,
    isMobile = window.innerWidth <= 768
  } = { ...networkConfig, ...options };

  // Generate all possible image URLs with mobile optimization
  const imageUrls = [];
  
  // If we have an ASIN, try ASIN-based URLs first
  if (asin && asin.match(/^[A-Z0-9]{10}$/)) {
    const baseUrl = import.meta.env.PROD 
      ? 'https://generic-wholesale-backend.onrender.com' 
      : 'http://localhost:5000';
    
    // For mobile or slow connections, try to get optimized version first
    if (isMobile || networkConfig.networkInfo.isSlowNet) {
      imageUrls.push(`${baseUrl}/api/admin-excel/public/images/by-asin/${asin}?mobile=1`);
    }
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
  
  // Add high-quality fallback placeholder
  const placeholderSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNFNUU3RUIiIHN0cm9rZS13aWR0aD0iMiIvPgo8Y2lyY2xlIGN4PSIxNTAiIGN5PSIxMjAiIHI9IjQwIiBmaWxsPSIjRDFENURCIi8+CjxwYXRoIGQ9Ik0xMTAgMTgwaDgwdjIwaC04MHoiIGZpbGw9IiNEMUQ1REIiLz4KPHA+dGggZD0iTTEyMCAyMTBoNjB2MTBoLTYweiIgZmlsbD0iI0QxRDVEQiIvPgo8dGV4dCB4PSIxNTAiIHk9IjI2MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNkI3NjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Qcm9kdWN0PC90ZXh0Pgo8L3N2Zz4=';
  imageUrls.push(placeholderSvg);

  // Try each URL in sequence with adaptive timeout
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const loadedUrl = await loadImageWithTimeout(url, timeout);
        return loadedUrl;
        
      } catch (error) {
        // If this is the last attempt for this URL, try next URL
        if (attempt === retries - 1) {
          break;
        }
        
        // Wait before retry (shorter wait for mobile/slow connections)
        const waitTime = networkConfig.networkInfo.isSlowNet ? 500 : 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // If all URLs failed, return the placeholder
  return placeholderSvg;
};

/**
 * Load image with timeout and network-aware optimization
 * @param {string} url - Image URL
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<string>} - Loaded image URL
 */
const loadImageWithTimeout = (url, timeout) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // Add crossorigin for external images to avoid CORS issues
    if (url.startsWith('http') && !url.includes(window.location.hostname)) {
      img.crossOrigin = 'anonymous';
    }
    
    // Set loading priority based on device and network
    const networkConfig = getOptimalLoadingConfig();
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile || networkConfig.networkInfo.isSlowNet) {
      img.loading = 'eager';
      img.decoding = 'sync'; // Synchronous decoding for faster display
    } else {
      img.loading = 'lazy';
      img.decoding = 'async';
    }
    
    // Add fetchpriority for modern browsers
    if ('fetchPriority' in img) {
      img.fetchPriority = networkConfig.networkInfo.isSlowNet ? 'low' : 'high';
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
 * Preload multiple product images with network-aware optimization
 * @param {Array} products - Array of product objects
 * @param {string} quality - Image quality ('high', 'medium', 'low')
 * @returns {Promise<Object>} - Map of product IDs to loaded image URLs
 */
export const preloadProductImages = async (products, quality = 'medium') => {
  const imageMap = {};
  const networkConfig = getOptimalLoadingConfig();
  
  // Use network-aware concurrent limit
  const concurrentLimit = networkConfig.concurrentLimit;
  const batchDelay = networkConfig.batchDelay;
  
  // Process products in batches
  for (let i = 0; i < products.length; i += concurrentLimit) {
    const batch = products.slice(i, i + concurrentLimit);
    
    const batchPromises = batch.map(async (product) => {
      try {
        const loadedUrl = await preloadSingleImage(
          product.image, 
          product.asin, 
          { 
            quality,
            ...networkConfig
          }
        );
        imageMap[product.id] = loadedUrl;
      } catch (error) {
        // Use high-quality placeholder for failed images
        imageMap[product.id] = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNFNUU3RUIiIHN0cm9rZS13aWR0aD0iMiIvPgo8Y2lyY2xlIGN4PSIxNTAiIGN5PSIxMjAiIHI9IjQwIiBmaWxsPSIjRDFENURCIi8+CjxwYXRoIGQ9Ik0xMTAgMTgwaDgwdjIwaC04MHoiIGZpbGw9IiNEMUQ1REIiLz4KPHA+dGggZD0iTTEyMCAyMTBoNjB2MTBoLTYweiIgZmlsbD0iI0QxRDVEQiIvPgo8dGV4dCB4PSIxNTAiIHk9IjI2MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNkI3NjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Qcm9kdWN0PC90ZXh0Pgo8L3N2Zz4=';
      }
    });
    
    await Promise.allSettled(batchPromises);
    
    // Network-aware delay between batches
    if (i + concurrentLimit < products.length) {
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }
  
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