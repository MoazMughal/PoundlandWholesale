const SkeletonLoader = ({ 
  type = 'text', 
  width = '100%', 
  height = '1rem',
  className = '',
  count = 1 
}) => {
  const skeletonElement = (
    <div 
      className={`skeleton ${className}`}
      style={{ width, height }}
      aria-label="Loading content"
    />
  );

  if (count === 1) {
    return skeletonElement;
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          {skeletonElement}
        </div>
      ))}
    </div>
  );
};

// Predefined skeleton components
export const ProductCardSkeleton = () => (
  <div className="product-card">
    <SkeletonLoader height="200px" className="rounded-t-2xl" />
    <div className="product-info">
      <SkeletonLoader height="1.5rem" width="80%" className="mb-2" />
      <SkeletonLoader height="1rem" width="60%" className="mb-3" />
      <SkeletonLoader height="2rem" width="40%" />
    </div>
  </div>
);

export const TextSkeleton = ({ lines = 3 }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }, (_, index) => (
      <SkeletonLoader 
        key={index}
        width={index === lines - 1 ? '60%' : '100%'}
        height="1rem"
      />
    ))}
  </div>
);

export const AvatarSkeleton = ({ size = '3rem' }) => (
  <SkeletonLoader 
    width={size} 
    height={size} 
    className="rounded-full" 
  />
);

export const ButtonSkeleton = () => (
  <SkeletonLoader 
    width="120px" 
    height="2.5rem" 
    className="rounded-lg" 
  />
);

export default SkeletonLoader;