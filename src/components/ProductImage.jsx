import { useState, useEffect, useRef } from 'react';

const ProductImage = ({ 
  src, 
  alt, 
  asin = null, // Add ASIN prop for Cloudinary fallback
  className = '', 
  style = {},
  fallbackSrc = null,
  onError = null,
  onLoad = null,
  priority = false,
  loading = 'lazy' // Add loading prop
}) => {
  const [currentSrc, setCurrentSrc] = useState(null); // Changed from '' to null to avoid empty src warning
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true); // Show placeholder initially
  const imgRef = useRef(null);
  const loadAttemptRef = useRef(0);
  const timeoutRef = useRef(null);

  // Enhanced URL processing with multiple fallback strategies
  const processImageUrl = (url) => {
    if (!url) return '';
    
    // If it's already a full URL, return as-is (especially for Cloudinary)
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    
    // Handle ASIN-based images with environment-specific URLs
    if (url.includes('admin-excel/public/images/by-asin/') || url.match(/^[A-Z0-9]{10}$/)) {
      const asin = url.match(/^[A-Z0-9]{10}$/) ? url : url.split('/').pop();
      
      // Use environment-specific base URL
      const baseUrl = import.meta.env.PROD 
        ? 'https://generic-wholesale-backend.onrender.com' 
        : 'http://localhost:5000';
      
      return `${baseUrl}/api/admin-excel/public/images/by-asin/${asin}`;
    }
    
    return url;
  };

  // Generate multiple fallback URLs for better reliability
  const generateFallbackUrls = (originalUrl) => {
    const urls = [];
    
    // Priority 1: If ASIN is provided, use Cloudinary URL first
    if (asin && asin.match(/^[A-Z0-9]{10}$/)) {
      const cloudinaryUrl = `https://res.cloudinary.com/dtuq3tvjx/image/upload/w_300,h_300,c_fit,f_auto,q_auto/products/${asin}`;
      urls.push(cloudinaryUrl);
    }
    
    // Priority 2: Add the processed original URL
    const processedUrl = processImageUrl(originalUrl);
    if (processedUrl && !urls.includes(processedUrl)) {
      urls.push(processedUrl);
    }
    
    // Priority 3: If we have a fallback source, add it
    if (fallbackSrc) {
      const processedFallback = processImageUrl(fallbackSrc);
      if (processedFallback && !urls.includes(processedFallback)) {
        urls.push(processedFallback);
      }
    }
    
    // Priority 4: Add a high-quality placeholder as final fallback
    urls.push('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiNFNUU3RUIiIHN0cm9rZS13aWR0aD0iMiIvPgo8Y2lyY2xlIGN4PSIxNTAiIGN5PSIxMjAiIHI9IjQwIiBmaWxsPSIjRDFENURCIi8+CjxwYXRoIGQ9Ik0xMTAgMTgwaDgwdjIwaC04MHoiIGZpbGw9IiNEMUQ1REIiLz4KPHA+dGggZD0iTTEyMCAyMTBoNjB2MTBoLTYweiIgZmlsbD0iI0QxRDVEQiIvPgo8dGV4dCB4PSIxNTAiIHk9IjI2MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNkI3NjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5Qcm9kdWN0PC90ZXh0Pgo8L3N2Zz4=');
    
    return urls;
  };

  // Load image with timeout and retry logic
  const loadImageWithTimeout = (url, timeout = 10000) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Don't set crossOrigin for Cloudinary images as they support CORS properly
      if (url.startsWith('http') && !url.includes('cloudinary.com') && !url.includes(window.location.hostname)) {
        img.crossOrigin = 'anonymous';
      }
      
      const timeoutId = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        reject(new Error(`Timeout loading image: ${url}`));
      }, timeout);
      
      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(url);
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Failed to load image: ${url}`));
      };
      
      img.src = url;
    });
  };

  // Try loading images with fallback chain
  const tryLoadImage = async (urls) => {
    for (let i = 0; i < urls.length; i++) {
      try {
        const loadedUrl = await loadImageWithTimeout(urls[i], priority ? 5000 : 8000);
        return loadedUrl;
      } catch (error) {
        // If this is not the last URL, continue to next
        if (i < urls.length - 1) {
          continue;
        }
        
        // If all URLs failed, throw the last error
        throw error;
      }
    }
  };

  useEffect(() => {
    if (!src) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // Reset state
    setIsLoading(true);
    setHasError(false);
    loadAttemptRef.current = 0;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Generate fallback URLs
    const fallbackUrls = generateFallbackUrls(src);
    
    // Try loading the image
    tryLoadImage(fallbackUrls)
      .then((loadedUrl) => {
        setCurrentSrc(loadedUrl);
        setShowPlaceholder(false); // Hide placeholder when image loads
        setIsLoading(false);
        setHasError(false);
        if (onLoad) onLoad({ target: { src: loadedUrl } });
      })
      .catch((error) => {
        setHasError(true);
        setShowPlaceholder(false); // Hide placeholder on error
        setIsLoading(false);
        if (onError) onError(error);
      });

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [src, fallbackSrc, priority]);

  const handleImageError = (e) => {
    // This is a backup in case the preloading fails
    setHasError(true);
    setIsLoading(false);
    if (onError) onError(e);
  };

  const handleImageLoad = (e) => {
    setIsLoading(false);
    setHasError(false);
    if (onLoad) onLoad(e);
  };

  return (
    <div 
      className={`product-image-wrapper ${isLoading ? 'loading' : 'loaded'} ${hasError ? 'error' : ''} ${className}`}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        ...style
      }}
    >
      {/* Loading indicator */}
      {isLoading && (
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '20px',
            height: '20px',
            border: '2px solid #f3f3f3',
            borderTop: '2px solid #ff6600',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            zIndex: 2
          }}
        />
      )}

      {!hasError && currentSrc ? (
        <img 
          ref={imgRef}
          src={currentSrc}
          alt={alt || 'Product Image'} 
          loading={loading || (priority ? 'eager' : 'lazy')}
          decoding="async"
          onError={handleImageError}
          onLoad={handleImageLoad}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            objectPosition: 'center',
            display: 'block',
            padding: '0px',
            margin: '0px',
            border: 'none',
            outline: 'none',
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.3s ease',
            zIndex: 1
          }} 
        />
      ) : hasError ? (
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: '#f8f9fa',
            color: '#6c757d',
            fontSize: '12px',
            textAlign: 'center',
            padding: '20px',
            zIndex: 1
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>📷</div>
          <div>Image not available</div>
        </div>
      ) : null}
    </div>
  );
};

export default ProductImage;