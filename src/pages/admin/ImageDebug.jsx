import { useState, useEffect } from 'react';
import { getApiUrl } from '../../utils/api';

const ImageDebug = () => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testAsin, setTestAsin] = useState('');
  const [testResult, setTestResult] = useState(null);

  const fetchDebugInfo = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl('admin-excel/debug/images'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDebugInfo(data.debug);
      } else {
        console.error('Failed to fetch debug info');
      }
    } catch (error) {
      console.error('Error fetching debug info:', error);
    } finally {
      setLoading(false);
    }
  };

  const testImageUrl = async () => {
    if (!testAsin.trim()) {
      alert('Please enter an ASIN to test');
      return;
    }

    try {
      const imageUrl = getApiUrl(`admin-excel/public/images/by-asin/${testAsin.trim().toUpperCase()}`);
      console.log('Testing image URL:', imageUrl);
      
      const response = await fetch(imageUrl);
      
      setTestResult({
        asin: testAsin.trim().toUpperCase(),
        url: imageUrl,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
        success: response.ok
      });
    } catch (error) {
      setTestResult({
        asin: testAsin.trim().toUpperCase(),
        error: error.message,
        success: false
      });
    }
  };

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🔍 Image Serving Debug</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={fetchDebugInfo} 
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {loading ? '⏳ Loading...' : '🔄 Refresh Debug Info'}
        </button>
      </div>

      {/* Test Image URL */}
      <div style={{
        background: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>🧪 Test Image URL</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Enter ASIN (e.g., B0B1947ZRD)"
            value={testAsin}
            onChange={(e) => setTestAsin(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              minWidth: '200px'
            }}
          />
          <button
            onClick={testImageUrl}
            style={{
              padding: '8px 16px',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔍 Test
          </button>
        </div>
        
        {testResult && (
          <div style={{
            background: testResult.success ? '#d1fae5' : '#fee2e2',
            border: `1px solid ${testResult.success ? '#10b981' : '#ef4444'}`,
            borderRadius: '4px',
            padding: '10px',
            marginTop: '10px'
          }}>
            <h4>{testResult.success ? '✅ Success' : '❌ Failed'}</h4>
            <p><strong>ASIN:</strong> {testResult.asin}</p>
            <p><strong>URL:</strong> <a href={testResult.url} target="_blank" rel="noopener noreferrer">{testResult.url}</a></p>
            {testResult.status && <p><strong>Status:</strong> {testResult.status} {testResult.statusText}</p>}
            {testResult.contentType && <p><strong>Content Type:</strong> {testResult.contentType}</p>}
            {testResult.contentLength && <p><strong>Content Length:</strong> {testResult.contentLength} bytes</p>}
            {testResult.error && <p><strong>Error:</strong> {testResult.error}</p>}
            
            {testResult.success && (
              <div style={{ marginTop: '10px' }}>
                <img 
                  src={testResult.url} 
                  alt={`Image for ${testResult.asin}`}
                  style={{ maxWidth: '200px', maxHeight: '200px', border: '1px solid #ddd' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div style={{ display: 'none', padding: '20px', textAlign: 'center', border: '1px solid #ddd' }}>
                  Image failed to load in browser
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Debug Information */}
      {debugInfo && (
        <div style={{
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <h3>📊 Debug Information</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <h4>🌐 Environment</h4>
            <p><strong>Environment:</strong> {debugInfo.environment}</p>
            <p><strong>Working Directory:</strong> {debugInfo.currentWorkingDirectory}</p>
            <p><strong>Server Directory:</strong> {debugInfo.serverDirectory}</p>
            <p><strong>Total Image Uploads:</strong> {debugInfo.totalImageUploads}</p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4>📁 Directory Check</h4>
            {debugInfo.directoryCheck.map((dir, index) => (
              <div key={index} style={{
                background: dir.exists ? '#d1fae5' : '#fee2e2',
                border: `1px solid ${dir.exists ? '#10b981' : '#ef4444'}`,
                borderRadius: '4px',
                padding: '10px',
                marginBottom: '10px'
              }}>
                <p><strong>Path:</strong> {dir.path}</p>
                <p><strong>Resolved:</strong> {dir.resolved}</p>
                <p><strong>Exists:</strong> {dir.exists ? '✅ Yes' : '❌ No'}</p>
                {dir.exists && dir.files.length > 0 && (
                  <p><strong>Sample Files:</strong> {dir.files.join(', ')}</p>
                )}
              </div>
            ))}
          </div>

          <div>
            <h4>📤 Recent Uploads</h4>
            {debugInfo.recentUploads.map((upload, index) => (
              <div key={index} style={{
                background: '#f8f9fa',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                padding: '15px',
                marginBottom: '10px'
              }}>
                <h5>{upload.fileName}</h5>
                <p><strong>Status:</strong> {upload.status}</p>
                <p><strong>Uploaded:</strong> {new Date(upload.uploadedAt).toLocaleString()}</p>
                <p><strong>Total Images:</strong> {upload.totalImages}</p>
                
                {upload.sampleImages.length > 0 && (
                  <div>
                    <h6>Sample Images:</h6>
                    {upload.sampleImages.map((img, imgIndex) => (
                      <div key={imgIndex} style={{
                        background: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '10px',
                        marginBottom: '5px'
                      }}>
                        <p><strong>ASIN:</strong> {img.asin}</p>
                        <p><strong>File:</strong> {img.fileName}</p>
                        <p><strong>Path:</strong> {img.filePath}</p>
                        <p><strong>File Exists:</strong> {img.fileExists ? '✅' : '❌'}</p>
                        <p><strong>Resolved Exists:</strong> {img.resolvedExists ? '✅' : '❌'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageDebug;