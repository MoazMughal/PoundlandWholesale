// React hook for aggressive image preloading

import { useEffect, useRef, useState } from 'react';
import imageCache from '../utils/imageCache';
import { getImageUrl } from '../utils/imageImports';

/**
 * Process image URL to get the actual loadable URL
 * @param {string} imagePath - Raw image path
 * @param {string} asin - Product ASIN
 * @returns {string} - Processed image URL
 */
const processImageUrl = (imagePath, asin = null) => {
  if (!imagePath) return null;
  
  // If it's already a full URL, return as-is
  if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  
  // Handle ASIN-based images
  if (imagePath.includes('admin-excel/public/images/by-asin/') || imagePath.match(/^[A-Z0-9]{10}$/)) {
    const asinCode = imagePath.match(/^[A-Z0-9]{10}$/) ? imagePath : imagePath.split('/').pop();
    const baseUrl = import.meta.env.PROD 
      ? 'https://generic-wholesale-backend.onrender.com' 
      : 'http://localhost:5000';
    return `${baseUrl}/api/admin-excel/public/images/by-asin/${asinCode}`;
  }
  
  // Use ASIN if provided
  if (asin && asin.match(/^[A-Z0-9]{10}$/)) {
    const baseUrl = import.meta.env.PROD 
      ? 'https://generic-wholesale-backend.onrender.com' 
      : 'http://localhost:5000';
    return `${baseUrl}/api/admin-excel/public/images/by-asin/${asin}`;
  }
  
  // Process through getImageUrl for local assets
  return getImageUrl(imagePath);
};

/**
 * Hook for aggressive image preloading
 * @param {Array} products - Array of products with images
 * @param {Object} options - Preloading options
 * @returns {Object} - Preloading state and functions
 */
export const useImagePreloader = (products = [], options = {}) => {
  const {
    immediate = true, // Start preloading immediately
    priority = 20, // Number of priority images to load first
    background = true // Continue loading in background
  } = options;

  const [preloadedCount, setPreloadedCount] = useState(0);
  const [isPreloading, setIsPreloading] = useState(false);
  const preloadedRef = useRef(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!products || products.length === 0 || !immediate) return;

    const preloadImages = async () => {
      if (!mountedRef.current) return;
      
      setIsPreloading(true);
      
      // Extract all image URLs
      const imageUrls = [];
      
      products.forEach(product => {
        // Main product image
        if (product.image) {
          const url = processImageUrl(product.image, product.asin);
          if (url && !preloadedRef.current.has(url)) {
            imageUrls.push(url);
          }
        }
        
        // Additional images
        if (product.images && Array.isArray(product.images)) {
          product.images.forEach(img => {
            const url = processImageUrl(img, product.asin);
            if (url && !preloadedRef.current.has(url)) {
              imageUrls.push(url);
            }
          });
        }
      });

      if (imageUrls.length === 0) {
        setIsPreloading(false);
        return;
      }

      // Split into priority and background images
      const priorityUrls = imageUrls.slice(0, priority);
      const backgroundUrls = imageUrls.slice(priority);

      try {
        // Load priority images first (blocking)
        if (priorityUrls.length > 0) {
          await imageCache.preloadBatch(priorityUrls);
          
          if (mountedRef.current) {
            priorityUrls.forEach(url => preloadedRef.current.add(url));
            setPreloadedCount(prev => prev + priorityUrls.length);
          }
        }

        // Load background images (non-blocking)
        if (background && backgroundUrls.length > 0) {
          imageCache.preloadInBackground(backgroundUrls);
          
          // Monitor background loading progress
          const checkProgress = setInterval(() => {
            if (!mountedRef.current) {
              clearInterval(checkProgress);
              return;
            }

            const stats = imageCache.getStats();
            const newCount = backgroundUrls.filter(url => {
              const cached = imageCache.cache.get(url);
              return cached && cached.status === 'loaded';
            }).length;

            if (newCount > 0) {
              backgroundUrls.forEach(url => {
                const cached = imageCache.cache.get(url);
                if (cached && cached.status === 'loaded' && !preloadedRef.current.has(url)) {
                  preloadedRef.current.add(url);
                  setPreloadedCount(prev => prev + 1);
                }
              });
            }

            // Stop monitoring when all images are loaded or preloading stops
            if (!stats.isPreloading && stats.queueSize === 0) {
              clearInterval(checkProgress);
            }
          }, 500);
        }

      } catch (error) {
        console.warn('Image preloading failed:', error);
      } finally {
        if (mountedRef.current) {
          setIsPreloading(false);
        }
      }
    };

    preloadImages();
  }, [products, immediate, priority, background]);

  /**
   * Get cached image URL
   * @param {string} imagePath - Image path
   * @param {string} asin - Product ASIN
   * @returns {string|null} - Cached image URL or null
   */
  const getCachedImage = (imagePath, asin = null) => {
    const url = processImageUrl(imagePath, asin);
    if (!url) return null;

    const cached = imageCache.cache.get(url);
    return cached && cached.status === 'loaded' ? cached.url : null;
  };

  /**
   * Preload specific image immediately
   * @param {string} imagePath - Image path
   * @param {string} asin - Product ASIN
   * @returns {Promise<string>} - Loaded image URL
   */
  const preloadImage = async (imagePath, asin = null) => {
    const url = processImageUrl(imagePath, asin);
    if (!url) return null;

    try {
      return await imageCache.get(url);
    } catch (error) {
      return null;
    }
  };

  return {
    preloadedCount,
    isPreloading,
    totalImages: products.reduce((count, product) => {
      let imageCount = product.image ? 1 : 0;
      if (product.images && Array.isArray(product.images)) {
        imageCount += product.images.length;
      }
      return count + imageCount;
    }, 0),
    getCachedImage,
    preloadImage,
    cacheStats: imageCache.getStats()
  };
};

export default useImagePreloader;