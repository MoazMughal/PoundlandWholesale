import React from 'react'

const ProductCardSkeleton = () => {
  return (
    <div className="product-card" style={{
      animation: 'pulse 1.5s ease-in-out infinite',
      background: '#f3f4f6'
    }}>
      {/* Image Skeleton */}
      <div style={{
        width: '100%',
        height: '140px',
        background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite'
      }} />
      
      {/* Content Skeleton */}
      <div style={{ padding: '12px' }}>
        {/* Title */}
        <div style={{
          height: '16px',
          background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          marginBottom: '8px',
          borderRadius: '4px'
        }} />
        <div style={{
          height: '16px',
          width: '70%',
          background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          marginBottom: '12px',
          borderRadius: '4px'
        }} />
        
        {/* Rating */}
        <div style={{
          height: '12px',
          width: '50%',
          background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          marginBottom: '8px',
          borderRadius: '4px'
        }} />
        
        {/* Price */}
        <div style={{
          height: '20px',
          width: '40%',
          background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          marginBottom: '12px',
          borderRadius: '4px'
        }} />
        
        {/* Buttons */}
        <div style={{
          height: '32px',
          background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          borderRadius: '4px'
        }} />
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  )
}

export default ProductCardSkeleton
