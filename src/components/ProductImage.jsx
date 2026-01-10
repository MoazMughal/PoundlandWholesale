import { useState, useEffect, useRef } from 'react';
import productionImageLoader from '../utils/productionImageLoader';

const ProductImage = ({ 
  src, 
  alt, 
  className = '', 
  style = {},
  fallbackSrc = null,
  onError = null,
  onLoad = null,
  priority = false
}) => {
  const [currentSrc, setCurrentSrc] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef(null);
  const maxRetries = 2;

  // Process image URL for production
  const processImageUrl = (url) => {
    if (!url) return '';
    
    // Use production image loader in production
    if (process.env.NODE_ENV === 'production') {
      return productionImageLoader.processImageUrl(url);
    }
    
    // Development fallback
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    
    // Handle ASIN-based images
    if (url.includes('admin-excel/public/images/by-asin/') || url.match(/^[A-Z0-9]{10}$/)) {
      const asin = url.match(/^[A-Z0-9]{10}$/) ? url : url.split('/').pop();
      const baseUrl = 'http://localhost:5000';
      return `${baseUrl}/api/admin-excel/public/images/by-asin/${asin}`;
    }
    
    return url;
  };

  // Generate fallback URLs
  const generateFallbacks = (originalSrc) => {
    const fallbacks = [];
    
    // Add the processed original URL
    const processedUrl = processImageUrl(originalSrc);
    if (processedUrl) fallbacks.push(processedUrl);
    
    // Add custom fallback if provided
    if (fallbackSrc) fallbacks.push(processImageUrl(fallbackSrc));
    
    // Add generic product placeholder
    fallbacks.push('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0xMDAgNTBMMTUwIDEwMEgxMDBWMTUwSDUwVjEwMEgxMDBWNTBaIiBmaWxsPSIjQ0NDIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTcwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LXNpemU9IjEyIj5Qcm9kdWN0PC90ZXh0Pgo8L3N2Zz4=');
    
    return fallbacks;
  };

  useEffect(() => {
    const fallbacks = generateFallbacks(src);
    if (fallbacks.length > 0) {
      setCurrentSrc(fallbacks[0]);
      
      // Queue for preloading in production
      if (process.env.NODE_ENV === 'production' && priority) {
        productionImageLoader.queueImageLoad(src, true);
      }
    }
  }, [src, fallbackSrc, priority]);

  const handleImageError = (e) => {
    setHasError(true);
    
    if (retryCount < maxRetries) {
      const fallbacks = generateFallbacks(src);
      const nextIndex = retryCount + 1;
      
      if (nextIndex < fallbacks.length) {
        // Try next fallback
        setTimeout(() => {
          setRetryCount(nextIndex);
          setCurrentSrc(fallbacks[nextIndex]);
          setHasError(false);
        }, 500); // Small delay before retry
      }
    }
    
    if (onError) onError(e);
  };

  const handleImageLoad = (e) => {
    setIsLoading(false);
    setHasError(false);
    if (onLoad) onLoad(e);
  };

  return (
    <div 
      className={`product-image-wrapper ${className}`}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      {isLoading && (
        <div 
          className="loading-shimmer"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '24px',
            color: '#ccc',
            zIndex: 1
          }}
        >
          ⏳
        </div>
      )}
      
      <img 
        ref={imgRef}
        src={currentSrc}
        alt={alt || 'Product Image'} 
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onError={handleImageError}
        onLoad={handleImageLoad}
        className={isLoading ? '' : 'loaded'}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          transition: 'opacity 0.3s ease',
          opacity: isLoading ? 0 : 1,
          display: hasError && retryCount >= maxRetries ? 'none' : 'block',
          padding: '0px',
          margin: '0px'
        }} 
      />
      
      {hasError && retryCount >= maxRetries && (
        <div 
          className="image-error"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: '12px',
            textAlign: 'center',
            padding: '20px'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
          <div>Image not available</div>
        </div>
      )}
    </div>
  );
};

export default ProductImage;