// Image preloader utility for better performance

class ImagePreloader {
  constructor() {
    this.cache = new Map();
    this.preloadQueue = [];
    this.isProcessing = false;
    this.maxConcurrent = 3; // Limit concurrent preloads
    this.currentLoading = 0;
  }

  // Preload a single image
  async preloadImage(src, priority = 'normal') {
    if (!src || this.cache.has(src)) {
      return this.cache.get(src) || src;
    }

    return new Promise((resolve, reject) => {
      const request = {
        src,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      };

      if (priority === 'high') {
        this.preloadQueue.unshift(request);
      } else {
        this.preloadQueue.push(request);
      }

      this.processQueue();
    });
  }

  // Process the preload queue
  async processQueue() {
    if (this.isProcessing || this.currentLoading >= this.maxConcurrent) {
      return;
    }

    this.isProcessing = true;

    while (this.preloadQueue.length > 0 && this.currentLoading < this.maxConcurrent) {
      const request = this.preloadQueue.shift();
      this.loadImage(request);
    }

    this.isProcessing = false;
  }

  // Load individual image
  async loadImage(request) {
    const { src, resolve, reject } = request;
    this.currentLoading++;

    try {
      const img = new Image();
      
      // Set loading attributes for better performance
      img.loading = 'eager';
      img.decoding = 'async';
      img.crossOrigin = 'anonymous';

      const timeout = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        this.currentLoading--;
        this.cache.set(src, null); // Cache the failure
        reject(new Error(`Image load timeout: ${src}`));
        this.processQueue(); // Continue with next images
      }, 8000);

      img.onload = () => {
        clearTimeout(timeout);
        this.currentLoading--;
        this.cache.set(src, src); // Cache successful load
        resolve(src);
        this.processQueue(); // Continue with next images
      };

      img.onerror = () => {
        clearTimeout(timeout);
        this.currentLoading--;
        this.cache.set(src, null); // Cache the failure
        reject(new Error(`Failed to load image: ${src}`));
        this.processQueue(); // Continue with next images
      };

      img.src = src;

    } catch (error) {
      this.currentLoading--;
      this.cache.set(src, null);
      reject(error);
      this.processQueue();
    }
  }

  // Preload multiple images
  async preloadImages(sources, priority = 'normal') {
    const promises = sources.map(src => this.preloadImage(src, priority));
    return Promise.allSettled(promises);
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get cache status
  getCacheStatus() {
    return {
      size: this.cache.size,
      queueLength: this.preloadQueue.length,
      currentLoading: this.currentLoading
    };
  }

  // Preload images for a product list
  async preloadProductImages(products, priority = 'normal') {
    const imageUrls = [];
    
    products.forEach(product => {
      if (product.image) {
        imageUrls.push(product.image);
      }
      if (product.images && Array.isArray(product.images)) {
        imageUrls.push(...product.images);
      }
    });

    // Remove duplicates
    const uniqueUrls = [...new Set(imageUrls)];
    
    return this.preloadImages(uniqueUrls, priority);
  }
}

// Create singleton instance
const imagePreloader = new ImagePreloader();

export default imagePreloader;

// Utility functions
export const preloadImage = (src, priority = 'normal') => {
  return imagePreloader.preloadImage(src, priority);
};

export const preloadImages = (sources, priority = 'normal') => {
  return imagePreloader.preloadImages(sources, priority);
};

export const preloadProductImages = (products, priority = 'normal') => {
  return imagePreloader.preloadProductImages(products, priority);
};

export const clearImageCache = () => {
  imagePreloader.clearCache();
};

export const getImageCacheStatus = () => {
  return imagePreloader.getCacheStatus();
};