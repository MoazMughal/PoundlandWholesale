// Ultra-fast image caching and preloading system

class ImageCache {
  constructor() {
    this.cache = new Map();
    this.preloadQueue = new Set();
    this.isPreloading = false;
    this.maxCacheSize = 200; // Maximum number of cached images
    this.preloadBatchSize = 10; // Images to preload simultaneously
  }

  /**
   * Get cached image or start loading
   * @param {string} url - Image URL
   * @returns {Promise<string>} - Cached or loaded image URL
   */
  async get(url) {
    if (!url) return null;

    // Return immediately if cached
    if (this.cache.has(url)) {
      const cached = this.cache.get(url);
      if (cached.status === 'loaded') {
        return cached.url;
      }
      if (cached.status === 'loading') {
        return cached.promise;
      }
    }

    // Start loading if not in cache
    return this.load(url);
  }

  /**
   * Load and cache image
   * @param {string} url - Image URL
   * @returns {Promise<string>} - Loaded image URL
   */
  load(url) {
    if (this.cache.has(url)) {
      const cached = this.cache.get(url);
      if (cached.status === 'loaded') return Promise.resolve(cached.url);
      if (cached.status === 'loading') return cached.promise;
    }

    const promise = this.loadImage(url)
      .then((loadedUrl) => {
        this.cache.set(url, {
          status: 'loaded',
          url: loadedUrl,
          timestamp: Date.now()
        });
        return loadedUrl;
      })
      .catch((error) => {
        this.cache.delete(url);
        throw error;
      });

    this.cache.set(url, {
      status: 'loading',
      promise,
      timestamp: Date.now()
    });

    return promise;
  }

  /**
   * Load image with optimizations
   * @param {string} url - Image URL
   * @returns {Promise<string>} - Loaded image URL
   */
  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Optimize loading attributes
      img.loading = 'eager';
      img.decoding = 'sync';
      img.fetchPriority = 'high';
      
      // Add crossorigin for external images
      if (url.startsWith('http') && !url.includes(window.location.hostname)) {
        img.crossOrigin = 'anonymous';
      }

      const timeout = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        reject(new Error(`Image load timeout: ${url}`));
      }, 5000);

      img.onload = () => {
        clearTimeout(timeout);
        resolve(url);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Image load failed: ${url}`));
      };

      img.src = url;
    });
  }

  /**
   * Preload multiple images aggressively
   * @param {Array<string>} urls - Array of image URLs
   * @returns {Promise<void>}
   */
  async preloadBatch(urls) {
    if (!urls || urls.length === 0) return;

    // Filter out already cached images
    const uncachedUrls = urls.filter(url => 
      !this.cache.has(url) || this.cache.get(url).status !== 'loaded'
    );

    if (uncachedUrls.length === 0) return;

    // Process in batches for better performance
    const batches = [];
    for (let i = 0; i < uncachedUrls.length; i += this.preloadBatchSize) {
      batches.push(uncachedUrls.slice(i, i + this.preloadBatchSize));
    }

    for (const batch of batches) {
      const promises = batch.map(url => this.load(url).catch(() => null));
      await Promise.allSettled(promises);
      
      // Small delay between batches to avoid overwhelming the browser
      if (batches.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  /**
   * Preload images in background
   * @param {Array<string>} urls - Array of image URLs
   */
  preloadInBackground(urls) {
    if (!urls || urls.length === 0) return;

    // Add to preload queue
    urls.forEach(url => this.preloadQueue.add(url));

    // Start background preloading if not already running
    if (!this.isPreloading) {
      this.startBackgroundPreloading();
    }
  }

  /**
   * Start background preloading process
   */
  async startBackgroundPreloading() {
    if (this.isPreloading) return;
    this.isPreloading = true;

    while (this.preloadQueue.size > 0) {
      const batch = Array.from(this.preloadQueue).slice(0, this.preloadBatchSize);
      batch.forEach(url => this.preloadQueue.delete(url));

      try {
        await this.preloadBatch(batch);
      } catch (error) {
        // Continue preloading even if some images fail
      }

      // Yield control to prevent blocking the main thread
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isPreloading = false;
  }

  /**
   * Clear old cached images to prevent memory issues
   */
  cleanup() {
    if (this.cache.size <= this.maxCacheSize) return;

    // Sort by timestamp and remove oldest entries
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, entries.length - this.maxCacheSize);
    toRemove.forEach(([url]) => this.cache.delete(url));
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    const loaded = Array.from(this.cache.values()).filter(item => item.status === 'loaded').length;
    const loading = Array.from(this.cache.values()).filter(item => item.status === 'loading').length;
    
    return {
      total: this.cache.size,
      loaded,
      loading,
      queueSize: this.preloadQueue.size,
      isPreloading: this.isPreloading
    };
  }

  /**
   * Clear all cached images
   */
  clear() {
    this.cache.clear();
    this.preloadQueue.clear();
    this.isPreloading = false;
  }
}

// Create global image cache instance
const imageCache = new ImageCache();

// Cleanup cache periodically
setInterval(() => {
  imageCache.cleanup();
}, 60000); // Every minute

export default imageCache;