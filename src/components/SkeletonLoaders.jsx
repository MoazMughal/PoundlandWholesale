import React from 'react';

// Product Card Skeleton
export const ProductCardSkeleton = () => (
  <div className="card h-100 border-0 shadow-sm" style={{ animation: 'pulse 1.5s ease-in-out infinite alternate' }}>
    <div style={{
      height: '200px',
      backgroundColor: '#f0f0f0',
      borderRadius: '8px 8px 0 0'
    }}></div>
    <div className="card-body p-3">
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
        width: '60%',
        marginBottom: '12px'
      }}></div>
      <div className="d-flex justify-content-between align-items-center">
        <div style={{
          height: '20px',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
          width: '40%'
        }}></div>
        <div style={{
          height: '16px',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
          width: '30%'
        }}></div>
      </div>
    </div>
  </div>
);

// Product Detail Skeleton
export const ProductDetailSkeleton = () => (
  <div className="container-fluid py-4">
    <div className="row">
      <div className="col-lg-6">
        <div style={{
          height: '400px',
          backgroundColor: '#f0f0f0',
          borderRadius: '8px',
          animation: 'pulse 1.5s ease-in-out infinite alternate'
        }}></div>
      </div>
      <div className="col-lg-6">
        <div style={{ animation: 'pulse 1.5s ease-in-out infinite alternate' }}>
          <div style={{
            height: '32px',
            backgroundColor: '#f0f0f0',
            borderRadius: '4px',
            marginBottom: '16px'
          }}></div>
          <div style={{
            height: '24px',
            backgroundColor: '#f0f0f0',
            borderRadius: '4px',
            width: '60%',
            marginBottom: '16px'
          }}></div>
          <div style={{
            height: '20px',
            backgroundColor: '#f0f0f0',
            borderRadius: '4px',
            width: '40%',
            marginBottom: '24px'
          }}></div>
          <div style={{
            height: '48px',
            backgroundColor: '#f0f0f0',
            borderRadius: '8px',
            marginBottom: '16px'
          }}></div>
          <div style={{
            height: '48px',
            backgroundColor: '#f0f0f0',
            borderRadius: '8px'
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

// Add CSS for pulse animation
const skeletonStyles = `
@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = skeletonStyles;
  document.head.appendChild(styleSheet);
}