// Simple image fallback system for production
export const createImageFallback = (primarySrc, asin = null) => {
  const fallbacks = [];
  
  // Add primary source
  if (primarySrc) {
    if (primarySrc.startsWith('http')) {
      fallbacks.push(primarySrc);
    } else {
      // Process relative paths
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://generic-wholesale-backend.onrender.com' 
        : 'http://localhost:5000';
      
      if (primarySrc.includes('admin-excel/public/images/by-asin/')) {
        fallbacks.push(`${baseUrl}/api/${primarySrc}`);
      } else if (primarySrc.match(/^[A-Z0-9]{10}$/)) {
        fallbacks.push(`${baseUrl}/api/admin-excel/public/images/by-asin/${primarySrc}`);
      }
    }
  }
  
  // Add ASIN-based fallback
  if (asin && asin.match(/^[A-Z0-9]{10}$/)) {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://generic-wholesale-backend.onrender.com' 
      : 'http://localhost:5000';
    fallbacks.push(`${baseUrl}/api/admin-excel/public/images/by-asin/${asin}`);
  }
  
  // Add placeholder as final fallback
  fallbacks.push('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNFNUU3RUIiIHN0cm9rZS13aWR0aD0iMiIvPgo8Y2lyY2xlIGN4PSIxNTAiIGN5PSIxMjAiIHI9IjQwIiBmaWxsPSIjRDFENURCIi8+CjxwYXRoIGQ9Ik0xMTAgMTgwaDgwdjIwaC04MHoiIGZpbGw9IiNEMUQ1REIiLz4KPHA+dGggZD0iTTEyMCAyMTBoNjB2MTBoLTYweiIgZmlsbD0iI0QxRDVEQiIvPgo8dGV4dCB4PSIxNTAiIHk9IjI2MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNkI3NjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Qcm9kdWN0PC90ZXh0Pgo8L3N2Zz4=');
  
  return fallbacks.filter((url, index, self) => url && self.indexOf(url) === index);
};

// Test if image URL is accessible
export const testImageUrl = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    
    // Timeout after 5 seconds
    setTimeout(() => resolve(false), 5000);
  });
};

// Get the first working image URL from fallbacks
export const getWorkingImageUrl = async (fallbacks) => {
  for (const url of fallbacks) {
    const works = await testImageUrl(url);
    if (works) return url;
  }
  return fallbacks[fallbacks.length - 1]; // Return placeholder if all fail
};

export default {
  createImageFallback,
  testImageUrl,
  getWorkingImageUrl
};