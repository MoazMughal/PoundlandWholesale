// Image optimization utilities
export const optimizeImageUrl = (imageUrl, options = {}) => {
  if (!imageUrl) return null;
  
  const {
    width = 400,
    height = 400,
    quality = 80,
    format = 'webp'
  } = options;
  
  // If it's already an optimized URL, return as is
  if (imageUrl.includes('w_') || imageUrl.includes('q_')) {
    return imageUrl;
  }
  
  // For external URLs (like from CDNs), add optimization parameters
  if (imageUrl.startsWith('http')) {
    // Check if it's a Cloudinary URL
    if (imageUrl.includes('cloudinary.com')) {
      const parts = imageUrl.split('/upload/');
      if (parts.length === 2) {
        return `${parts[0]}/upload/w_${width},h_${height},c_fill,f_auto,q_${quality}/${parts[1]}`;
      }
    }
    
    // For other CDNs, return original URL with mobile-friendly parameters
    try {
      const url = new URL(imageUrl);
      // Add mobile-friendly parameters if supported
      if (url.hostname.includes('amazonaws.com') || url.hostname.includes('cloudfront.net')) {
        url.searchParams.set('w', width.toString());
        url.searchParams.set('h', height.toString());
        url.searchParams.set('q', quality.toString());
        return url.toString();
      }
    } catch (e) {
      // If URL parsing fails, return original
    }
    
    // For other CDNs, return original URL
    return imageUrl;
  }
  
  // For local images, return as is (could be enhanced with local optimization)
  return imageUrl;
};

export const getResponsiveImageSizes = (baseUrl) => {
  if (!baseUrl) return {};
  
  return {
    thumbnail: optimizeImageUrl(baseUrl, { width: 150, height: 150, quality: 70 }),
    small: optimizeImageUrl(baseUrl, { width: 300, height: 300, quality: 75 }),
    medium: optimizeImageUrl(baseUrl, { width: 600, height: 600, quality: 80 }),
    large: optimizeImageUrl(baseUrl, { width: 1200, height: 1200, quality: 85 })
  };
};

export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
    
    // Add timeout for mobile networks
    setTimeout(() => {
      if (!img.complete) {
        reject(new Error('Image load timeout'));
      }
    }, 10000); // 10 second timeout
  });
};

export const getMobileOptimizedImageUrl = (imageUrl, isMobile = false) => {
  if (!imageUrl) return null;
  
  // For API URLs (like Excel uploaded images), return as-is since they don't support optimization parameters
  if (imageUrl.includes('/api/admin-excel/public/images/by-asin/') || 
      imageUrl.includes('admin-excel/public/images/by-asin/')) {
    return imageUrl;
  }
  
  // For mobile devices, use smaller, more compressed images
  if (isMobile) {
    return optimizeImageUrl(imageUrl, { 
      width: 200, 
      height: 200, 
      quality: 70,
      format: 'auto' // Let the CDN decide the best format
    });
  }
  
  // For desktop, use higher quality
  return optimizeImageUrl(imageUrl, { 
    width: 400, 
    height: 400, 
    quality: 85,
    format: 'auto'
  });
};

export const lazyLoadImage = (element, src, placeholder = '/placeholder-image.jpg') => {
  if (!element || !src) return;
  
  // Set placeholder first
  element.src = placeholder;
  
  // Create intersection observer for lazy loading
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        preloadImage(src)
          .then(() => {
            element.src = src;
            element.classList.add('loaded');
          })
          .catch(() => {
            element.src = placeholder;
          });
        observer.unobserve(element);
      }
    });
  }, {
    rootMargin: '50px'
  });
  
  observer.observe(element);
};