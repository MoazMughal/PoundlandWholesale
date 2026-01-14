// Production-optimized image loading utility
class ProductionImageLoader {
  constructor() {
    this.imageCache = new Map();
    this.loadingQueue = [];
    this.isProcessing = false;
    this.maxConcurrent = 6; // Limit concurrent image loads
    this.retryAttempts = 2;
  }

  // Preload critical images (first visible products)
  preloadCriticalImages(products, count = 20) {
    if (process.env.NODE_ENV !== 'production') return;
    
    const criticalProducts = products.slice(0, count);
    criticalProducts.forEach((product, index) => {
      if (product.image) {
        this.queueImageLoad(product.image, true, index);
      }
    });
  }

  // Queue image for loading
  queueImageLoad(src, priority = false, index = 0) {
    if (!src || this.imageCache.has(src)) return;
    
    const loadItem = {
      src,
      priority,
      index,
      attempts: 0,
      timestamp: Date.now()
    };

    if (priority) {
      this.loadingQueue.unshift(loadItem);
    } else {
      this.loadingQueue.push(loadItem);
    }

    this.processQueue();
  }

  // Process the loading queue
  async processQueue() {
    if (this.isProcessing || this.loadingQueue.length === 0) return;
    
    this.isProcessing = true;
    const concurrent = Math.min(this.maxConcurrent, this.loadingQueue.length);
    
    const promises = [];
    for (let i = 0; i < concurrent; i++) {
      const item = this.loadingQueue.shift();
      if (item) {
        promises.push(this.loadImage(item));
      }
    }

    await Promise.allSettled(promises);
    this.isProcessing = false;

    // Continue processing if there are more items
    if (this.loadingQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  // Load individual image with retry logic
  async loadImage(item) {
    const { src, attempts } = item;
    
    try {
      const processedSrc = this.processImageUrl(src);
      const success = await this.attemptImageLoad(processedSrc);
      
      if (success) {
        this.imageCache.set(src, processedSrc);
        return processedSrc;
      } else {
        throw new Error('Image load failed');
      }
    } catch (error) {
      if (attempts < this.retryAttempts) {
        // Retry with delay
        item.attempts++;
        setTimeout(() => {
          this.loadingQueue.unshift(item);
          this.processQueue();
        }, 1000 * (attempts + 1));
      }
    }
  }

  // Process image URL for production
  processImageUrl(url) {
    if (!url) return '';
    
    // If it's already a full URL, ensure HTTPS in production
    if (url.startsWith('http')) {
      if (process.env.NODE_ENV === 'production' && url.startsWith('http://') && !url.includes('localhost')) {
        return url.replace('http://', 'https://');
      }
      return url;
    }
    
    // Handle ASIN-based images
    if (url.includes('admin-excel/public/images/by-asin/') || url.match(/^[A-Z0-9]{10}$/)) {
      const asin = url.match(/^[A-Z0-9]{10}$/) ? url : url.split('/').pop();
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://generic-wholesale-backend.onrender.com' 
        : 'http://localhost:5000';
      return `${baseUrl}/api/admin-excel/public/images/by-asin/${asin}`;
    }
    
    return url;
  }

  // Attempt to load image
  attemptImageLoad(src) {
    return new Promise((resolve) => {
      const img = new Image();
      
      const timeout = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        resolve(false);
      }, 8000); // 8 second timeout
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve(true);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
      
      img.src = src;
    });
  }

  // Check if image is cached
  isCached(src) {
    return this.imageCache.has(src);
  }

  // Get cached image URL
  getCachedUrl(src) {
    return this.imageCache.get(src) || src;
  }

  // Clear old cache entries
  clearOldCache(maxAge = 300000) { // 5 minutes
    const now = Date.now();
    for (const [key, value] of this.imageCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.imageCache.delete(key);
      }
    }
  }
}

// Export singleton instance
export default new ProductionImageLoader();