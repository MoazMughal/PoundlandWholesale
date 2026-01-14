import { useState } from 'react';

const CloudinaryImage = ({ asin, alt, style, onError, priority = false }) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Construct Cloudinary URL with optimizations
  const cloudinaryUrl = asin 
    ? `https://res.cloudinary.com/dtuq3tvjx/image/upload/w_300,h_300,c_fill,f_auto,q_auto/products/${asin}`
    : null;

  const handleError = () => {
    setImageError(true);
    setIsLoading(false);
    if (onError) {
      onError();
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (!cloudinaryUrl || imageError) {
    return (
      <div style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        color: '#9ca3af',
        fontSize: '2rem'
      }}>
        🖼️
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f3f4f6',
          color: '#9ca3af',
          fontSize: '1rem'
        }}>
          ⏳
        </div>
      )}
      <img
        src={cloudinaryUrl}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        onError={handleError}
        onLoad={handleLoad}
        style={{
          ...style,
          display: isLoading ? 'none' : 'block'
        }}
      />
    </>
  );
};

export default CloudinaryImage;
