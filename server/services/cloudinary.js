import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Debug configuration
console.log('Cloudinary config check:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set',
  api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set'
});

/**
 * Upload image to Cloudinary
 * @param {string} imagePath - Local path to the image file
 * @param {string} publicId - Public ID for the image (ASIN)
 * @param {string} folder - Folder name in Cloudinary (default: 'products')
 * @returns {Promise<Object>} - Cloudinary upload result
 */
export const uploadToCloudinary = async (imagePath, publicId, folder = 'products') => {
  try {
    console.log(`📤 Uploading to Cloudinary: ${publicId}`);
    
    const result = await cloudinary.uploader.upload(imagePath, {
      public_id: publicId,
      folder: folder,
      overwrite: false,
      resource_type: 'image',
      transformation: [
        { width: 1500, height: 1500, crop: 'limit' },
        { quality: 'auto' },
        { format: 'auto' }
      ]
    });

    console.log(`✅ Successfully uploaded to Cloudinary: ${result.secure_url}`);
    
    // Optional webhook trigger - non-blocking
    setImmediate(async () => {
      try {
        const WebhookLogger = (await import('./webhookLogger.js')).default;
        await WebhookLogger.logCloudinary('upload', {
          public_id: result.public_id,
          secure_url: result.secure_url,
          format: result.format,
          resource_type: result.resource_type,
          bytes: result.bytes
        });
      } catch (webhookError) {
        // Silent fail - webhook should never break upload
      }
    });
    
    return result;
  } catch (error) {
    console.error(`❌ Cloudinary upload failed for ${publicId}:`, error.message);
    throw error;
  }
};

/**
 * Delete image from Cloudinary
 * @param {string} publicId - Public ID of the image to delete
 * @param {string} folder - Folder name in Cloudinary (default: 'products')
 * @returns {Promise<Object>} - Cloudinary deletion result
 */
export const deleteFromCloudinary = async (publicId, folder = 'products') => {
  try {
    const fullPublicId = `${folder}/${publicId}`;
    console.log(`🗑️ Deleting from Cloudinary: ${fullPublicId}`);
    
    const result = await cloudinary.uploader.destroy(fullPublicId);
    console.log(`✅ Successfully deleted from Cloudinary: ${fullPublicId}`);
    return result;
  } catch (error) {
    console.error(`❌ Cloudinary deletion failed for ${publicId}:`, error.message);
    throw error;
  }
};

/**
 * Generate optimized Cloudinary URL
 * @param {string} publicId - Public ID of the image (can include folder)
 * @param {string} folder - Folder name in Cloudinary (optional if already in publicId)
 * @param {Object} transformations - Cloudinary transformations
 * @returns {string} - Optimized Cloudinary URL
 */
export const getOptimizedUrl = (publicId, folder = '', transformations = {}) => {
  const defaultTransformations = {
    width: 400,
    height: 400,
    crop: 'fill',
    quality: 'auto',
    format: 'auto'
  };

  const finalTransformations = { ...defaultTransformations, ...transformations };
  
  // Construct the full public ID
  let fullPublicId = publicId;
  if (folder && !publicId.includes('/')) {
    fullPublicId = `${folder}/${publicId}`;
  }
  
  try {
    return cloudinary.url(fullPublicId, finalTransformations);
  } catch (error) {
    console.warn('Failed to generate Cloudinary URL for:', fullPublicId, error.message);
    // Return a fallback URL or the original publicId
    return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${fullPublicId}`;
  }
};

/**
 * Check if Cloudinary is properly configured
 * @returns {boolean} - True if configured, false otherwise
 */
export const isCloudinaryConfigured = () => {
  const isConfigured = !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
  
  // Enhanced logging for production debugging
  if (!isConfigured) {
    console.warn('⚠️ Cloudinary Configuration Check Failed:');
    console.warn('- CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing');
    console.warn('- CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing');
    console.warn('- CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing');
    console.warn('- NODE_ENV:', process.env.NODE_ENV);
    console.warn('Please set these environment variables in your deployment platform (Render Dashboard)');
  }
  
  return isConfigured;
};

/**
 * List all images from a specific folder in Cloudinary
 * @param {string} folder - Folder name in Cloudinary (default: 'products')
 * @param {number} maxResults - Maximum number of results per request (default: 500)
 * @returns {Promise<Array>} - Array of image resources with name and URL
 */
export const listCloudinaryImages = async (folder = 'products', maxResults = 500) => {
  try {
    let allImages = [];
    let nextCursor = null;
    let pageCount = 0;
    
    // Fetch all images using pagination
    do {
      pageCount++;
      
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folder,
        max_results: maxResults,
        next_cursor: nextCursor,
        resource_type: 'image'
      });
      
      const pageImages = result.resources.map(resource => ({
        publicId: resource.public_id,
        name: resource.public_id.split('/').pop(), // Get filename without folder
        asin: resource.public_id.split('/').pop(), // ASIN is the filename
        url: resource.secure_url,
        width: resource.width,
        height: resource.height,
        format: resource.format,
        size: resource.bytes,
        createdAt: resource.created_at
      }));
      
      allImages = allImages.concat(pageImages);
      nextCursor = result.next_cursor;
      
    } while (nextCursor);

    return allImages;
  } catch (error) {
    console.error(`❌ Failed to list Cloudinary images from folder ${folder}:`, error.message);
    throw error;
  }
};

export default cloudinary;