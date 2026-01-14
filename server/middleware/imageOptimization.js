import { getOptimizedUrl, isCloudinaryConfigured } from '../services/cloudinary.js';

/**
 * Middleware to optimize image URLs in product responses
 */
export const optimizeProductImages = (req, res, next) => {
  // Temporarily disable optimization to prevent URL corruption
  // The Cloudinary URLs are already properly formatted
  next();
};

/**
 * Recursively optimize image URLs in response data
 */
const optimizeImageUrls = (data, queryParams = {}) => {
  if (!data) return data;
  
  // Get optimization parameters from query
  const width = parseInt(queryParams.imageWidth) || 400;
  const height = parseInt(queryParams.imageHeight) || 400;
  const quality = queryParams.imageQuality || 'auto';
  const format = queryParams.imageFormat || 'auto';
  
  const transformations = {
    width,
    height,
    quality,
    format,
    crop: 'fill'
  };
  
  if (Array.isArray(data)) {
    return data.map(item => optimizeImageUrls(item, queryParams));
  }
  
  if (typeof data === 'object' && data !== null) {
    const optimized = { ...data };
    
    // Handle products array
    if (optimized.products && Array.isArray(optimized.products)) {
      optimized.products = optimized.products.map(product => 
        optimizeProductImageUrls(product, transformations)
      );
    }
    
    // Handle single product
    if (optimized.name && (optimized.images || optimized.image)) {
      return optimizeProductImageUrls(optimized, transformations);
    }
    
    // Handle nested objects
    Object.keys(optimized).forEach(key => {
      if (typeof optimized[key] === 'object') {
        optimized[key] = optimizeImageUrls(optimized[key], queryParams);
      }
    });
    
    return optimized;
  }
  
  return data;
};

/**
 * Optimize image URLs for a single product
 */
const optimizeProductImageUrls = (product, transformations) => {
  if (!product) return product;
  
  const optimized = { ...product };
  
  // Optimize images array
  if (optimized.images && Array.isArray(optimized.images)) {
    optimized.images = optimized.images.map(imageUrl => {
      if (imageUrl && imageUrl.includes('cloudinary.com')) {
        try {
          // Check if URL already has transformations to avoid double-processing
          if (imageUrl.includes('/upload/') && imageUrl.match(/\/upload\/[^/]*[whqcf]/)) {
            // URL already has transformations, return as-is
            return imageUrl;
          }
          
          // Extract public ID from Cloudinary URL more reliably
          const parts = imageUrl.split('/upload/');
          if (parts.length === 2) {
            // Handle both versioned and non-versioned URLs
            let publicIdPath = parts[1];
            
            // Remove version if present (e.g., v1234567890/)
            if (publicIdPath.startsWith('v') && publicIdPath.includes('/')) {
              publicIdPath = publicIdPath.split('/').slice(1).join('/');
            }
            
            // Extract the public ID (including folder)
            const publicId = publicIdPath.split('.')[0]; // Remove extension
            
            // Return optimized URL only if we don't already have transformations
            return getOptimizedUrl(publicId, '', transformations);
          }
        } catch (error) {
          console.warn('Failed to optimize Cloudinary URL:', imageUrl, error.message);
        }
      }
      return imageUrl; // Return original URL if not Cloudinary or if optimization fails
    });
  }
  
  // Optimize single image field
  if (optimized.image && optimized.image.includes('cloudinary.com')) {
    try {
      // Check if URL already has transformations
      if (optimized.image.includes('/upload/') && optimized.image.match(/\/upload\/[^/]*[whqcf]/)) {
        // URL already has transformations, skip optimization
        return optimized;
      }
      
      const parts = optimized.image.split('/upload/');
      if (parts.length === 2) {
        let publicIdPath = parts[1];
        
        // Remove version if present
        if (publicIdPath.startsWith('v') && publicIdPath.includes('/')) {
          publicIdPath = publicIdPath.split('/').slice(1).join('/');
        }
        
        const publicId = publicIdPath.split('.')[0];
        optimized.image = getOptimizedUrl(publicId, '', transformations);
      }
    } catch (error) {
      console.warn('Failed to optimize single image URL:', optimized.image, error.message);
    }
  }
  
  return optimized;
};

/**
 * Middleware for mobile-specific image optimization
 */
export const mobileImageOptimization = (req, res, next) => {
  // Detect mobile devices
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  if (isMobile) {
    // Set mobile-optimized defaults
    req.query.imageWidth = req.query.imageWidth || '300';
    req.query.imageHeight = req.query.imageHeight || '300';
    req.query.imageQuality = req.query.imageQuality || 'auto:low';
    req.query.imageFormat = req.query.imageFormat || 'auto';
  }
  
  next();
};

/**
 * Add responsive image URLs to products
 */
export const addResponsiveImages = (req, res, next) => {
  // Temporarily disable responsive images to prevent URL corruption
  next();
};

/**
 * Add responsive image URLs to product data
 */
const addResponsiveImageUrls = (data) => {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => addResponsiveImageUrls(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const enhanced = { ...data };
    
    // Handle products array
    if (enhanced.products && Array.isArray(enhanced.products)) {
      enhanced.products = enhanced.products.map(product => {
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
          const mainImage = product.images[0];
          if (mainImage && mainImage.includes('cloudinary.com')) {
            try {
              // Skip if already has transformations
              if (mainImage.includes('/upload/') && mainImage.match(/\/upload\/[^/]*[whqcf]/)) {
                return product;
              }
              
              // Extract public ID more reliably
              const parts = mainImage.split('/upload/');
              if (parts.length === 2) {
                let publicIdPath = parts[1];
                
                // Remove version if present
                if (publicIdPath.startsWith('v') && publicIdPath.includes('/')) {
                  publicIdPath = publicIdPath.split('/').slice(1).join('/');
                }
                
                const publicId = publicIdPath.split('.')[0];
                
                product.responsiveImages = {
                  thumbnail: getOptimizedUrl(publicId, '', { width: 150, height: 150, crop: 'fill', quality: 'auto', format: 'auto' }),
                  small: getOptimizedUrl(publicId, '', { width: 300, height: 300, crop: 'fill', quality: 'auto', format: 'auto' }),
                  medium: getOptimizedUrl(publicId, '', { width: 600, height: 600, crop: 'fill', quality: 'auto', format: 'auto' }),
                  large: getOptimizedUrl(publicId, '', { width: 1200, height: 1200, crop: 'fill', quality: 'auto', format: 'auto' })
                };
              }
            } catch (error) {
              console.warn('Failed to create responsive images for:', mainImage, error.message);
            }
          }
        }
        return product;
      });
    }
    
    return enhanced;
  }
  
  return data;
};