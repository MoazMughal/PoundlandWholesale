import { useState, useEffect } from 'react';

const ProductionStatus = () => {
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [imageLoadErrors, setImageLoadErrors] = useState(0);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    // Only show in production
    if (process.env.NODE_ENV !== 'production') return;

    let errorCount = 0;
    const maxErrors = 5;

    // Monitor image load errors
    const handleImageError = () => {
      errorCount++;
      setImageLoadErrors(errorCount);
      
      if (errorCount >= maxErrors) {
        setShowStatus(true);
      }
    };

    // Monitor connection status
    const checkConnection = async () => {
      try {
        const response = await fetch('https://generic-wholesale-backend.onrender.com/api/health', {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
          setConnectionStatus('good');
        } else {
          setConnectionStatus('slow');
        }
      } catch (error) {
        setConnectionStatus('poor');
        setShowStatus(true);
      }
    };

    // Listen for image errors globally
    document.addEventListener('error', (e) => {
      if (e.target.tagName === 'IMG') {
        handleImageError();
      }
    }, true);

    // Check connection periodically
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Every 30 seconds

    return () => {
      document.removeEventListener('error', handleImageError, true);
      clearInterval(interval);
    };
  }, []);

  if (!showStatus || process.env.NODE_ENV !== 'production') return null;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: connectionStatus === 'poor' ? '#ff4444' : '#ff8800',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      zIndex: 9999,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      cursor: 'pointer'
    }}
    onClick={() => setShowStatus(false)}
    >
      {connectionStatus === 'poor' && (
        <>
          🔴 Connection Issues
          <div style={{ fontSize: '10px', marginTop: '2px' }}>
            Some images may not load. Click to dismiss.
          </div>
        </>
      )}
      {connectionStatus === 'slow' && (
        <>
          🟡 Slow Connection
          <div style={{ fontSize: '10px', marginTop: '2px' }}>
            Images loading slowly. Click to dismiss.
          </div>
        </>
      )}
    </div>
  );
};

export default ProductionStatus;