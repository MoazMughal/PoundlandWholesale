import { useState, useEffect } from 'react'

const LazyImage = ({ 
  src, 
  alt, 
  className, 
  style, 
  placeholder = 'https://via.placeholder.com/300x200?text=Loading...',
  width = 400,
  height = 400,
  quality = 'auto'
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder)
  const [imageRef, setImageRef] = useState()
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)

  // Generate optimized Cloudinary URL if src is from Cloudinary
  const getOptimizedSrc = (originalSrc) => {
    if (!originalSrc) return placeholder;
    
    // Check if it's a Cloudinary URL
    if (originalSrc.includes('cloudinary.com')) {
      // Extract the public ID and add transformations
      const parts = originalSrc.split('/upload/');
      if (parts.length === 2) {
        const transformations = `w_${width},h_${height},c_fill,q_${quality},f_auto`;
        return `${parts[0]}/upload/${transformations}/${parts[1]}`;
      }
    }
    
    return originalSrc;
  };

  useEffect(() => {
    let observer
    
    if (imageRef && imageSrc === placeholder && !hasError) {
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const optimizedSrc = getOptimizedSrc(src);
              setImageSrc(optimizedSrc);
              observer.unobserve(imageRef);
            }
          })
        },
        { threshold: 0.1 }
      )
      observer.observe(imageRef)
    }
    
    return () => {
      if (observer && observer.unobserve) {
        observer.unobserve(imageRef)
      }
    }
  }, [imageRef, imageSrc, placeholder, src, hasError, width, height, quality])

  const handleLoad = () => {
    setIsLoaded(true)
    setHasError(false)
  }

  const handleError = () => {
    console.warn('Image failed to load:', imageSrc);
    setHasError(true);
    setIsLoaded(false);
    
    // Try fallback image
    if (imageSrc !== placeholder) {
      setImageSrc(placeholder);
    }
  }

  return (
    <img
      ref={setImageRef}
      src={imageSrc}
      alt={alt}
      className={className}
      style={{
        ...style,
        transition: 'opacity 0.3s ease',
        opacity: isLoaded && !hasError ? 1 : 0.7
      }}
      onLoad={handleLoad}
      onError={handleError}
      loading="lazy"
    />
  )
}

export default LazyImage