import { useState, useEffect, useRef } from 'react';
import { getImageUrl } from '../utils/imageImports';
import { getApiUrl } from '../utils/api';

const EnhancedImage = ({ 
  src, 
  alt, 
  className = '', 
  style = {}, 
  onError = null,
  onLoad = null,
  placeholder = null,
  fallback = null,
  asin = null, // For Excel products with ASIN
  eager = false, // Force eager loading
  showLoader = true
}) => {
  const [currentSrc, setCurrentSrc] = useState(placeholder || '');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const imgRef = useRef(null);
  const maxAttempts = 3;

  // Generate fallback URLs for Excel products
  const generateImageUrls = (originalSrc, asin) => {
    const urls = [];
    
    // If we have an ASIN, try the Excel image endpoint first
    if (asin) {
      urls.push(getApiUrl(`admin-excel/public/images/by-asin/${asin}`));
    }
    
    // Process the original source
    if (originalSrc) {
      // If it's already a processed URL, use it
      if (originalSrc.startsWith('http')) {
        urls.push(originalSrc);
      } else {
        // Process through getImageUrl
        const processedUrl = getImageUrl(originalSrc);
        if (processedUrl && processedUrl !== originalSrc) {
          urls.push(processedUrl);
        }
        urls.push(originalSrc);
      }
    }
    
    // Add fallback placeholder
    if (fallback) {
      urls.push(fallback);
    } else {
      urls.push('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==');
    }
    
    return urls.filter(Boolean);
  };

  const tryLoadImage = async (imageUrl, attempt = 0) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Set loading attributes for better performance
      img.loading = eager ? 'eager' : 'lazy';
      img.decoding = 'async';
      
      const timeout = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        reject(new Error(`Image load timeout after ${attempt + 1} attempts`));
      }, 8000); // 8 second timeout
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve(imageUrl);
      };
      
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load image: ${imageUrl}`));
      };
      
      img.src = imageUrl;
    });
  };

  const loadImageWithFallbacks = async () => {
    const urls = generateImageUrls(src, asin);
    
    for (let i = 0; i < urls.length; i++) {
      try {
        setLoadAttempts(i + 1);
        const successUrl = await tryLoadImage(urls[i], i);
        setCurrentSrc(successUrl);
        setIsLoading(false);
        setHasError(false);
        if (onLoad) onLoad();
        return;
      } catch (error) {
        console.warn(`Failed to load image attempt ${i + 1}:`, urls[i], error.message);
        
        // If this is the last URL and it failed, show error state
        if (i === urls.length - 1) {
          setHasError(true);
          setIsLoading(false);
          if (onError) onError(error);
        }
      }
    }
  };

  useEffect(() => {
    if (!src && !asin) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    setLoadAttempts(0);
    
    // Set placeholder immediately if provided
    if (placeholder) {
      setCurrentSrc(placeholder);
    }
    
    loadImageWithFallbacks();
  }, [src, asin, placeholder, fallback]);

  // Intersection Observer for lazy loading (if not eager)
  useEffect(() => {
    if (eager || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Image is in viewport, start loading
            loadImageWithFallbacks();
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
        threshold: 0.1
      }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [eager]);

  const imageStyle = {
    display: 'block',
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    transition: 'opacity 0.3s ease, filter 0.3s ease',
    opacity: isLoading ? 0.7 : 1,
    filter: isLoading ? 'blur(1px)' : 'none',
    ...style
  };

  return (
    <div 
      ref={imgRef}
      className={`enhanced-image-container ${className}`}
      style={{ 
        position: 'relative', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: style.height || '100px',
        background: isLoading ? '#f8f9fa' : 'transparent'
      }}
    >
      {/* Loading indicator */}
      {isLoading && showLoader && (
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '50%',
            padding: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <div 
            style={{
              width: '20px',
              height: '20px',
              border: '2px solid #ff6600',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
        </div>
      )}
      
      {/* Attempt indicator for debugging (only show in development) */}
      {import.meta.env.DEV && isLoading && loadAttempts > 1 && (
        <div 
          style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            background: 'rgba(255, 102, 0, 0.8)',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: 'bold',
            zIndex: 2
          }}
        >
          {loadAttempts}/{maxAttempts}
        </div>
      )}
      
      {/* Main image */}
      <img
        src={currentSrc}
        alt={alt}
        className={`enhanced-image ${isLoading ? 'loading' : ''} ${hasError ? 'error' : ''}`}
        style={imageStyle}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={(e) => {
          // Final fallback if component's error handling fails
          if (!e.target.dataset.finalFallback) {
            e.target.dataset.finalFallback = 'true';
            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';
          }
        }}
      />
      
      {/* Error state */}
      {hasError && !isLoading && (
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '12px',
            zIndex: 1
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>📷</div>
          <div>Image not available</div>
        </div>
      )}
      
      {/* Add CSS for spin animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EnhancedImage;