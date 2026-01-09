// Image upload utility
// This is a basic implementation that converts images to base64
// You can replace this with your preferred cloud storage service (AWS S3, Cloudinary, etc.)

export const uploadImageToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};

export const uploadMultipleImages = async (files) => {
  const uploadPromises = files.map(file => uploadImageToBase64(file));
  
  try {
    const results = await Promise.all(uploadPromises);
    return {
      success: true,
      urls: results
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Validate image file
export const validateImageFile = (file) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please select JPEG, PNG, GIF, or WebP images.'
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Please select images smaller than 5MB.'
    };
  }
  
  return { valid: true };
};

// Resize image if needed (optional)
export const resizeImage = (file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Example integration with cloud services (placeholder)
export const uploadToCloudService = async (file) => {
  // Replace this with your actual cloud service integration
  // Examples: AWS S3, Cloudinary, Firebase Storage, etc.
  
  try {
    // For now, return base64 as fallback
    const base64Url = await uploadImageToBase64(file);
    
    return {
      success: true,
      url: base64Url,
      publicId: `image_${Date.now()}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  uploadImageToBase64,
  uploadMultipleImages,
  validateImageFile,
  resizeImage,
  uploadToCloudService
};