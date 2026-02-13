import React, { useState, useEffect } from 'react';

/**
 * ProgressiveImage Component
 * Shows a loading state while image loads, then smoothly transitions to the loaded image
 */
const ProgressiveImage = ({ 
  src, 
  alt, 
  className = '', 
  style = {},
  placeholderIcon = '📦',
  onLoad,
  onError,
  ...props 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    if (!src) {
      setImageError(true);
      return;
    }

    // Reset states when src changes
    setImageLoaded(false);
    setImageError(false);
    setImageSrc(null);

    // Create image object to preload
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setImageLoaded(true);
      if (onLoad) onLoad();
    };
    
    img.onerror = () => {
      setImageError(true);
      if (onError) onError();
    };
    
    img.src = src;

    // Cleanup
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, onLoad, onError]);

  // Error state
  if (imageError || !src) {
    return (
      <div 
        className={`progressive-image-error ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
          color: '#999',
          fontSize: '3rem',
          ...style
        }}
        {...props}
      >
        {placeholderIcon}
      </div>
    );
  }

  // Loading state
  if (!imageLoaded) {
    return (
      <div 
        className={`progressive-image-loading ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(90deg, #f0f0f0 0%, #f8f8f8 50%, #f0f0f0 100%)',
          backgroundSize: '200% 100%',
          animation: 'imageShimmer 1.5s ease-in-out infinite',
          position: 'relative',
          overflow: 'hidden',
          ...style
        }}
        {...props}
      >
        {/* Shimmer overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
          animation: 'shimmerSlide 2s infinite'
        }} />
        
        {/* Loading icon */}
        <div style={{
          fontSize: '2.5rem',
          opacity: 0.3,
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          {placeholderIcon}
        </div>
      </div>
    );
  }

  // Loaded state
  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`progressive-image-loaded image-loaded ${className}`}
      style={{
        ...style,
        opacity: imageLoaded ? 1 : 0,
        transition: 'opacity 0.4s ease-out'
      }}
      {...props}
    />
  );
};

export default ProgressiveImage;
