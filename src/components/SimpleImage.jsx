import { getImageUrl } from '../utils/imageImports';

const SimpleImage = ({ 
  src, 
  alt, 
  className = '', 
  style = {}, 
  onError = null,
  onLoad = null
}) => {
  return (
    <img 
      src={getImageUrl(src)}
      alt={alt} 
      className={className}
      loading="lazy"
      onError={(e) => {
        if (onError) onError(e);
        e.target.style.display = 'none';
      }}
      onLoad={onLoad}
      style={{
        maxWidth: '100%', // Full width for better image display
        maxHeight: '100%', // Full height for better image display
        objectFit: 'contain',
        transform: 'scale(1)', // Removed zoom to show full image
        ...style
      }} 
    />
  );
};

export default SimpleImage;