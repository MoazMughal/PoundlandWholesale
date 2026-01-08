import { useState, useEffect } from 'react';
import { getImageUrl } from '../utils/imageImports';

const MobileImage = ({ 
  src, 
  alt, 
  className = '', 
  style = {}, 
  onError = null,
  placeholder = 'https://via.placeholder.com/300x300?text=Loading...',
  fallback = 'https://via.placeholder.com/300x300?text=No+Image'
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setImageSrc(fallback);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);
    
    // Get the proper image URL
    const imageUrl = getImageUrl(src);
    
    // Preload the image
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(imageUrl);
      setIsLoading(false);
    };
    
    img.onerror = () => {
      console.warn('Failed to load image:', imageUrl);
      setHasError(true);
      setIsLoading(false);
      
      // Try fallback strategies
      if (imageUrl !== src) {
        // If getImageUrl modified the URL, try the original
        const fallbackImg = new Image();
        fallbackImg.onload = () => setImageSrc(src);
        fallbackImg.onerror = () => setImageSrc(fallback);
        fallbackImg.src = src;
      } else {
        setImageSrc(fallback);
      }
      
      if (onError) onError();
    };
    
    img.src = imageUrl;
    
    // Cleanup
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, fallback, onError]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`mobile-image ${className} ${isLoading ? 'loading' : ''} ${hasError ? 'error' : ''}`}
      style={{
        display: 'block',
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
        transition: 'opacity 0.3s ease',
        opacity: isLoading ? 0.7 : 1,
        ...style
      }}
      loading="eager" // Force eager loading for mobile
      onError={(e) => {
        // Additional fallback if the component's error handling fails
        if (!e.target.dataset.finalFallback) {
          e.target.dataset.finalFallback = 'true';
          e.target.src = fallback;
        }
      }}
    />
  );
};

export default MobileImage;