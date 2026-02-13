import React from 'react';

// Product Card Skeleton with enhanced shimmer effect
export const ProductCardSkeleton = () => (
  <div className="card h-100 border-0 shadow-sm skeleton-card" style={{ 
    overflow: 'hidden',
    position: 'relative',
    background: '#fff'
  }}>
    {/* Shimmer overlay */}
    <div className="skeleton-shimmer"></div>
    
    {/* Image skeleton */}
    <div className="skeleton-box" style={{
      height: '200px',
      borderRadius: '8px 8px 0 0',
      position: 'relative'
    }}>
      {/* Fake image icon */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '3rem',
        opacity: 0.3
      }}>📦</div>
    </div>
    
    {/* Content skeleton */}
    <div className="card-body p-3">
      {/* Title lines */}
      <div className="skeleton-box" style={{
        height: '16px',
        borderRadius: '4px',
        marginBottom: '8px',
        width: '90%'
      }}></div>
      <div className="skeleton-box" style={{
        height: '16px',
        borderRadius: '4px',
        marginBottom: '12px',
        width: '60%'
      }}></div>
      
      {/* Price and button row */}
      <div className="d-flex justify-content-between align-items-center" style={{ marginTop: '12px' }}>
        <div className="skeleton-box" style={{
          height: '24px',
          borderRadius: '6px',
          width: '45%'
        }}></div>
        <div className="skeleton-box" style={{
          height: '32px',
          borderRadius: '8px',
          width: '40%'
        }}></div>
      </div>
    </div>
  </div>
);

// Product Detail Skeleton with enhanced layout
export const ProductDetailSkeleton = () => (
  <div className="container-fluid py-4">
    <div className="row">
      {/* Image Gallery Skeleton */}
      <div className="col-lg-6 mb-4">
        <div className="skeleton-card" style={{ 
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '12px',
          background: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div className="skeleton-shimmer"></div>
          
          {/* Main image */}
          <div className="skeleton-box" style={{
            height: '400px',
            borderRadius: '12px',
            position: 'relative',
            marginBottom: '12px'
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '5rem',
              opacity: 0.2
            }}>🖼️</div>
          </div>
          
          {/* Thumbnail row */}
          <div className="d-flex gap-2 p-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton-box" style={{
                width: '80px',
                height: '80px',
                borderRadius: '8px',
                flex: '0 0 auto'
              }}></div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Product Info Skeleton */}
      <div className="col-lg-6">
        <div className="skeleton-card" style={{ 
          position: 'relative',
          overflow: 'hidden',
          padding: '24px',
          borderRadius: '12px',
          background: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div className="skeleton-shimmer"></div>
          
          {/* Breadcrumb */}
          <div className="skeleton-box" style={{
            height: '16px',
            borderRadius: '4px',
            width: '40%',
            marginBottom: '20px'
          }}></div>
          
          {/* Title */}
          <div className="skeleton-box" style={{
            height: '32px',
            borderRadius: '6px',
            marginBottom: '12px',
            width: '95%'
          }}></div>
          <div className="skeleton-box" style={{
            height: '32px',
            borderRadius: '6px',
            marginBottom: '20px',
            width: '70%'
          }}></div>
          
          {/* Rating */}
          <div className="d-flex gap-2 mb-3">
            <div className="skeleton-box" style={{
              height: '20px',
              borderRadius: '4px',
              width: '120px'
            }}></div>
            <div className="skeleton-box" style={{
              height: '20px',
              borderRadius: '4px',
              width: '80px'
            }}></div>
          </div>
          
          {/* Price */}
          <div className="skeleton-box" style={{
            height: '48px',
            borderRadius: '8px',
            width: '60%',
            marginBottom: '24px'
          }}></div>
          
          {/* Badges */}
          <div className="d-flex gap-2 mb-4">
            <div className="skeleton-box" style={{
              height: '28px',
              borderRadius: '14px',
              width: '100px'
            }}></div>
            <div className="skeleton-box" style={{
              height: '28px',
              borderRadius: '14px',
              width: '120px'
            }}></div>
          </div>
          
          {/* Quantity selector */}
          <div className="skeleton-box" style={{
            height: '56px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}></div>
          
          {/* Action buttons */}
          <div className="d-flex gap-2 mb-3">
            <div className="skeleton-box" style={{
              height: '52px',
              borderRadius: '8px',
              flex: 1
            }}></div>
            <div className="skeleton-box" style={{
              height: '52px',
              borderRadius: '8px',
              width: '52px'
            }}></div>
          </div>
          
          {/* Amazon button */}
          <div className="skeleton-box" style={{
            height: '48px',
            borderRadius: '8px',
            marginBottom: '24px'
          }}></div>
          
          {/* Description lines */}
          <div className="skeleton-box" style={{
            height: '16px',
            borderRadius: '4px',
            marginBottom: '8px',
            width: '100%'
          }}></div>
          <div className="skeleton-box" style={{
            height: '16px',
            borderRadius: '4px',
            marginBottom: '8px',
            width: '95%'
          }}></div>
          <div className="skeleton-box" style={{
            height: '16px',
            borderRadius: '4px',
            width: '80%'
          }}></div>
        </div>
      </div>
    </div>
  </div>
);

// Platform Comparison Skeleton
export const PlatformComparisonSkeleton = () => (
  <div style={{ animation: 'pulse 1.5s ease-in-out infinite alternate' }}>
    <div style={{
      height: '24px',
      backgroundColor: '#f0f0f0',
      borderRadius: '4px',
      marginBottom: '16px',
      width: '200px'
    }}></div>
    <div className="table-responsive">
      <table className="table table-sm table-bordered">
        <thead>
          <tr>
            {[1, 2, 3, 4, 5].map(i => (
              <th key={i}>
                <div style={{
                  height: '16px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '4px'
                }}></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map(row => (
            <tr key={row}>
              {[1, 2, 3, 4, 5].map(col => (
                <td key={col}>
                  <div style={{
                    height: '14px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px'
                  }}></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// FBA Calculator Skeleton
export const FBACalculatorSkeleton = () => (
  <div style={{ animation: 'pulse 1.5s ease-in-out infinite alternate' }}>
    <div style={{
      height: '24px',
      backgroundColor: '#f0f0f0',
      borderRadius: '4px',
      marginBottom: '16px',
      width: '250px'
    }}></div>
    <div className="table-responsive">
      <table className="table table-sm table-bordered">
        <thead>
          <tr>
            <th>
              <div style={{
                height: '16px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px'
              }}></div>
            </th>
            <th>
              <div style={{
                height: '16px',
                backgroundColor: '#f0f0f0',
                borderRadius: '4px'
              }}></div>
            </th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(row => (
            <tr key={row}>
              <td>
                <div style={{
                  height: '14px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '4px',
                  width: '80%'
                }}></div>
              </td>
              <td>
                <div style={{
                  height: '14px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '4px',
                  width: '60%',
                  marginLeft: 'auto'
                }}></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// List Skeleton
export const ListSkeleton = ({ items = 6 }) => (
  <div>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="d-flex align-items-center p-3 border-bottom" style={{ animation: 'pulse 1.5s ease-in-out infinite alternate' }}>
        <div style={{
          width: '60px',
          height: '60px',
          backgroundColor: '#f0f0f0',
          borderRadius: '8px',
          marginRight: '16px'
        }}></div>
        <div className="flex-grow-1">
          <div style={{
            height: '16px',
            backgroundColor: '#f0f0f0',
            borderRadius: '4px',
            marginBottom: '8px'
          }}></div>
          <div style={{
            height: '12px',
            backgroundColor: '#f0f0f0',
            borderRadius: '4px',
            width: '60%'
          }}></div>
        </div>
        <div style={{
          width: '80px',
          height: '20px',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px'
        }}></div>
      </div>
    ))}
  </div>
);

// Add CSS for enhanced skeleton animations
const skeletonStyles = `
/* Skeleton base styles */
.skeleton-card {
  position: relative;
  overflow: hidden;
}

.skeleton-box {
  background: linear-gradient(90deg, #f0f0f0 0%, #f8f8f8 50%, #f0f0f0 100%);
  background-size: 200% 100%;
  animation: skeletonPulse 1.5s ease-in-out infinite;
}

/* Shimmer effect overlay */
.skeleton-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.6) 50%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
  z-index: 1;
  pointer-events: none;
}

/* Animations */
@keyframes skeletonPulse {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

/* Fade in animation for loaded content */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.product-card-loaded {
  animation: fadeIn 0.4s ease-out;
}

/* Stagger animation for grid items */
.products-grid-item {
  animation: fadeIn 0.4s ease-out;
  animation-fill-mode: both;
}

.products-grid-item:nth-child(1) { animation-delay: 0.05s; }
.products-grid-item:nth-child(2) { animation-delay: 0.1s; }
.products-grid-item:nth-child(3) { animation-delay: 0.15s; }
.products-grid-item:nth-child(4) { animation-delay: 0.2s; }
.products-grid-item:nth-child(5) { animation-delay: 0.25s; }
.products-grid-item:nth-child(6) { animation-delay: 0.3s; }
.products-grid-item:nth-child(7) { animation-delay: 0.35s; }
.products-grid-item:nth-child(8) { animation-delay: 0.4s; }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = skeletonStyles;
  document.head.appendChild(styleSheet);
}