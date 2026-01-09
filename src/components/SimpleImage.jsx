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
        maxWidth: '90%', // Increased default size
        maxHeight: '90%', // Increased default size
        objectFit: 'contain',
        transform: 'scale(1.05)', // Added slight zoom by default
        ...style
      }} 
    />
  );
};

export default SimpleImage;