/**
 * Cloudinary utility functions for frontend
 */

/**
 * Generate optimized Cloudinary URL with transformations
 * @param {string} imageUrl - Original Cloudinary URL
 * @param {Object} options - Transformation options
 * @returns {string} - Optimized Cloudinary URL
 */
export const getOptimizedCloudinaryUrl = (imageUrl, options = {}) => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
    return imageUrl;
  }

  const {
    width = 400,
    height = 400,
    crop = 'fit', // Changed from 'fill' to 'fit' to show full image without cropping
    quality = 'auto',
    format = 'auto',
    dpr = 'auto'
  } = options;

  try {
    // Split the URL at '/upload/'
    const parts = imageUrl.split('/upload/');
    if (parts.length !== 2) {
      return imageUrl;
    }

    // Build transformation string
    const transformations = [
      `w_${width}`,
      `h_${height}`,
      `c_${crop}`,
      `q_${quality}`,
      `f_${format}`,
      `dpr_${dpr}`
    ].join(',');

    // Reconstruct URL with transformations
    return `${parts[0]}/upload/${transformations}/${parts[1]}`;
  } catch (error) {
    console.warn('Failed to optimize Cloudinary URL:', error);
    return imageUrl;
  }
};

/**
 * Generate responsive Cloudinary URLs for different screen sizes
 * @param {string} imageUrl - Original Cloudinary URL
 * @returns {Object} - Object with URLs for different sizes
 */
export const getResponsiveCloudinaryUrls = (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
    return {
      thumbnail: imageUrl,
      small: imageUrl,
      medium: imageUrl,
      large: imageUrl,
      original: imageUrl
    };
  }

  return {
    thumbnail: getOptimizedCloudinaryUrl(imageUrl, { width: 150, height: 150 }),
    small: getOptimizedCloudinaryUrl(imageUrl, { width: 300, height: 300 }),
    medium: getOptimizedCloudinaryUrl(imageUrl, { width: 600, height: 600 }),
    large: getOptimizedCloudinaryUrl(imageUrl, { width: 1200, height: 1200 }),
    original: imageUrl
  };
};

/**
 * Check if URL is from Cloudinary
 * @param {string} url - Image URL to check
 * @returns {boolean} - True if Cloudinary URL
 */
export const isCloudinaryUrl = (url) => {
  return url && typeof url === 'string' && url.includes('cloudinary.com');
};

/**
 * Get fallback image URL
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {string} text - Placeholder text
 * @returns {string} - Placeholder image URL
 */
export const getFallbackImageUrl = (width = 400, height = 400, text = 'No Image') => {
  return `https://via.placeholder.com/${width}x${height}?text=${encodeURIComponent(text)}`;
};