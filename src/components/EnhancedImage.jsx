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
  const [currentSrc, setCurrentSrc] = useState(placeholder || null); // Changed to null to avoid empty src warning
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const imgRef = useRef(null);
  const maxAttempts = 3;

  // Generate fallback URLs for Excel products
  const generateImageUrls = (originalSrc, asin) => {
    const urls = [];
    
    // If we have an ASIN, try multiple ASIN-based endpoints
    if (asin && asin.match(/^[A-Z0-9]{10}$/)) {
      // Primary ASIN endpoint
      const asinUrl = getApiUrl(`admin-excel/public/images/by-asin/${asin}`);
      urls.push(asinUrl);
      
      // Alternative ASIN endpoint (direct server URL)
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://generic-wholesale-backend.onrender.com' 
        : 'http://localhost:5000';
      const altAsinUrl = `${baseUrl}/api/admin-excel/public/images/by-asin/${asin}`;
      urls.push(altAsinUrl);
      
      // Third fallback - try without /api prefix
      const directAsinUrl = `${baseUrl}/admin-excel/public/images/by-asin/${asin}`;
      urls.push(directAsinUrl);
    }
    
    // Process the original source
    if (originalSrc) {
      // If it's already a processed URL, use it
      if (originalSrc.startsWith('http')) {
        urls.push(originalSrc);
      } else if (originalSrc.includes('admin-excel/public/images/by-asin/')) {
        // Handle relative API URLs - try multiple variations
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://generic-wholesale-backend.onrender.com' 
          : 'http://localhost:5000';
        
        // Try with /api prefix
        const fullUrl = originalSrc.startsWith('/') ? `${baseUrl}${originalSrc}` : `${baseUrl}/${originalSrc}`;
        urls.push(fullUrl);
        
        // Try without /api prefix
        const directUrl = originalSrc.replace('/api/', '/');
        const directFullUrl = directUrl.startsWith('/') ? `${baseUrl}${directUrl}` : `${baseUrl}/${directUrl}`;
        urls.push(directFullUrl);
      } else {
        // Process through getImageUrl
        const processedUrl = getImageUrl(originalSrc);
        if (processedUrl && processedUrl !== originalSrc) {
          urls.push(processedUrl);
        }
        urls.push(originalSrc);
      }
    }
    
    // Add generic product placeholder as final fallback
    const placeholderSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhmOWZhIiBzdHJva2U9IiNlNWU3ZWIiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjEyMCIgcj0iNDAiIGZpbGw9IiNkMWQ1ZGIiLz48cGF0aCBkPSJNMTEwIDE4MGg4MHYyMGgtODB6IiBmaWxsPSIjZDFkNWRiIi8+PHBhdGggZD0iTTEyMCAyMTBoNjB2MTBoLTYweiIgZmlsbD0iI2QxZDVkYiIvPjx0ZXh0IHg9IjE1MCIgeT0iMjYwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM2Yjc2ODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkFtYXpvbidzIENob2ljZTwvdGV4dD48L3N2Zz4=';
    
    if (fallback) {
      urls.push(fallback);
    } else {
      urls.push(placeholderSvg);
    }
    
    // Remove duplicates while preserving order
    return [...new Set(urls)].filter(Boolean);
  };

  const tryLoadImage = async (imageUrl, attempt = 0) => {
    return new Promise(async (resolve, reject) => {
      // Check if this is an API endpoint that might return JSON
      if (imageUrl.includes('/api/admin-excel/public/images/by-asin/')) {
        try {
          const response = await fetch(imageUrl);
          const contentType = response.headers.get('content-type');
          
          // If response is JSON, extract the actual image URL
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (data.success && data.imageUrl) {
              console.log(`✅ Got Cloudinary URL from API: ${data.imageUrl}`);
              // Now load the actual Cloudinary image
              imageUrl = data.imageUrl;
            } else {
              reject(new Error('No image URL in API response'));
              return;
            }
          }
        } catch (error) {
          console.log(`⚠️ Failed to fetch JSON from API: ${error.message}`);
          // Continue with original URL
        }
      }
      
      const img = new Image();
      
      // Set loading attributes for better performance
      img.loading = eager ? 'eager' : 'lazy';
      img.decoding = 'async';
      
      // Add crossorigin for external images
      if (imageUrl.startsWith('http') && !imageUrl.includes(window.location.hostname)) {
        img.crossOrigin = 'anonymous';
      }
      
      const timeout = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        reject(new Error(`Image load timeout after ${attempt + 1} attempts`));
      }, 10000); // Increased timeout to 10 seconds for slower connections
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve(imageUrl);
      };
      
      img.onerror = (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load image: ${imageUrl}`));
      };
      
      img.src = imageUrl;
    });
  };

  const loadImageWithFallbacks = async () => {
    const urls = generateImageUrls(src, asin);
    
    console.log(`🖼️ Loading image with ${urls.length} fallback URLs:`, {
      src,
      asin,
      urls: urls.slice(0, 3) // Log first 3 URLs to avoid spam
    });
    
    for (let i = 0; i < urls.length; i++) {
      try {
        setLoadAttempts(i + 1);
        console.log(`🔄 Attempting to load image ${i + 1}/${urls.length}: ${urls[i]}`);
        const successUrl = await tryLoadImage(urls[i], i);
        console.log(`✅ Successfully loaded image: ${successUrl}`);
        setCurrentSrc(successUrl);
        setIsLoading(false);
        setHasError(false);
        if (onLoad) onLoad();
        return;
      } catch (error) {
        console.log(`❌ Failed to load image ${i + 1}/${urls.length}: ${error.message}`);
        // If this is the last URL and it failed, show error state
        if (i === urls.length - 1) {
          console.log(`💥 All ${urls.length} image URLs failed to load`);
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
      
      {/* Main image */}
      {currentSrc && (
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
      )}
      
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