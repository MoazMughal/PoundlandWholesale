/**
 * Image performance optimization utilities
 */

// Preload critical images
export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Preload multiple images
export const preloadImages = async (srcArray) => {
  try {
    const promises = srcArray.map(src => preloadImage(src));
    return await Promise.all(promises);
  } catch (error) {
    console.warn('Some images failed to preload:', error);
    return [];
  }
};

// Get optimal image dimensions based on device
export const getOptimalDimensions = (containerWidth, containerHeight, devicePixelRatio = window.devicePixelRatio || 1) => {
  // Account for device pixel ratio but cap it to avoid huge images
  const maxDPR = Math.min(devicePixelRatio, 2);
  
  return {
    width: Math.ceil(containerWidth * maxDPR),
    height: Math.ceil(containerHeight * maxDPR)
  };
};

// Detect if user is on a slow connection
export const isSlowConnection = () => {
  if ('connection' in navigator) {
    const connection = navigator.connection;
    return connection.effectiveType === 'slow-2g' || 
           connection.effectiveType === '2g' || 
           connection.saveData === true;
  }
  return false;
};

// Get quality setting based on connection
export const getOptimalQuality = () => {
  if (isSlowConnection()) {
    return 'auto:low';
  }
  return 'auto';
};

// Image loading priority manager
class ImageLoadingManager {
  constructor() {
    this.loadingQueue = [];
    this.maxConcurrent = 3;
    this.currentLoading = 0;
  }

  addToQueue(imageElement, src, priority = 'normal') {
    this.loadingQueue.push({ imageElement, src, priority });
    this.processQueue();
  }

  processQueue() {
    if (this.currentLoading >= this.maxConcurrent || this.loadingQueue.length === 0) {
      return;
    }

    // Sort by priority (high -> normal -> low)
    this.loadingQueue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const { imageElement, src } = this.loadingQueue.shift();
    this.currentLoading++;

    const img = new Image();
    img.onload = () => {
      imageElement.src = src;
      this.currentLoading--;
      this.processQueue();
    };
    img.onerror = () => {
      this.currentLoading--;
      this.processQueue();
    };
    img.src = src;
  }
}

export const imageLoadingManager = new ImageLoadingManager();

// Intersection Observer for lazy loading with performance optimizations
export const createOptimizedIntersectionObserver = (callback, options = {}) => {
  const defaultOptions = {
    threshold: 0.1,
    rootMargin: '50px',
    ...options
  };

  return new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Use requestIdleCallback if available for better performance
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => callback(entry));
        } else {
          setTimeout(() => callback(entry), 0);
        }
      }
    });
  }, defaultOptions);
};

// Image format detection and optimization
export const getSupportedImageFormat = () => {
  // Check for WebP support
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  // Check WebP support
  const webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  
  // Check AVIF support (newer format)
  let avifSupported = false;
  try {
    const avifCanvas = document.createElement('canvas');
    avifSupported = avifCanvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  } catch (e) {
    avifSupported = false;
  }

  if (avifSupported) return 'avif';
  if (webpSupported) return 'webp';
  return 'auto';
};

// Performance monitoring
export const trackImagePerformance = (src, startTime) => {
  const loadTime = performance.now() - startTime;
  
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Image loaded in ${loadTime.toFixed(2)}ms:`, src);
  }
  
  // Send to analytics in production (if you have analytics)
  if (process.env.NODE_ENV === 'production' && window.gtag) {
    window.gtag('event', 'image_load_time', {
      custom_parameter: loadTime,
      image_src: src
    });
  }
};

// Responsive image breakpoints
export const getResponsiveBreakpoints = () => {
  return {
    mobile: 320,
    tablet: 768,
    desktop: 1024,
    large: 1440
  };
};

// Generate responsive sizes attribute
export const generateSizesAttribute = (breakpoints = getResponsiveBreakpoints()) => {
  return [
    `(max-width: ${breakpoints.mobile}px) ${breakpoints.mobile}px`,
    `(max-width: ${breakpoints.tablet}px) ${breakpoints.tablet}px`,
    `(max-width: ${breakpoints.desktop}px) ${breakpoints.desktop}px`,
    `${breakpoints.large}px`
  ].join(', ');
};