import { useState, useEffect } from 'react';
import { getImageUrl } from '../utils/imageImports';
import { getApiUrl } from '../utils/api';

const ImageDebugger = ({ src, showDebug = false }) => {
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    if (!showDebug || !src) return;

    const originalUrl = src;
    const processedUrl = getImageUrl(src);
    const isApiUrl = src.includes('admin-excel/public/images/by-asin/');
    const isFullUrl = src.startsWith('http');

    setDebugInfo({
      originalUrl,
      processedUrl,
      isApiUrl,
      isFullUrl,
      userAgent: navigator.userAgent,
      isMobile: window.innerWidth <= 576,
      timestamp: new Date().toISOString()
    });

    // Test image loading
    const img = new Image();
    img.onload = () => {
      setDebugInfo(prev => ({ ...prev, loadStatus: 'success', loadTime: Date.now() }));
    };
    img.onerror = () => {
      setDebugInfo(prev => ({ ...prev, loadStatus: 'error', loadTime: Date.now() }));
    };
    img.src = processedUrl;

  }, [src, showDebug]);

  if (!showDebug) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '10px',
      maxWidth: '300px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <h4>Image Debug Info</h4>
      <div><strong>Original:</strong> {debugInfo.originalUrl}</div>
      <div><strong>Processed:</strong> {debugInfo.processedUrl}</div>
      <div><strong>Is API URL:</strong> {debugInfo.isApiUrl ? 'Yes' : 'No'}</div>
      <div><strong>Is Full URL:</strong> {debugInfo.isFullUrl ? 'Yes' : 'No'}</div>
      <div><strong>Is Mobile:</strong> {debugInfo.isMobile ? 'Yes' : 'No'}</div>
      <div><strong>Load Status:</strong> {debugInfo.loadStatus || 'Loading...'}</div>
      <div><strong>User Agent:</strong> {debugInfo.userAgent?.substring(0, 50)}...</div>
    </div>
  );
};

export default ImageDebugger;