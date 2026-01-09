import { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api';

const ImageDiagnostic = () => {
  const [diagnostics, setDiagnostics] = useState({});
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    const results = [];
    
    // Test 1: Check API connectivity
    try {
      const apiUrl = getApiUrl('health');
      const response = await fetch(apiUrl);
      results.push({
        test: 'API Connectivity',
        status: response.ok ? 'PASS' : 'FAIL',
        details: `Status: ${response.status}, URL: ${apiUrl}`
      });
    } catch (error) {
      results.push({
        test: 'API Connectivity',
        status: 'FAIL',
        details: `Error: ${error.message}`
      });
    }

    // Test 2: Check image endpoint
    try {
      const imageUrl = getApiUrl('admin-excel/public/images/by-asin/B019ISNAVA');
      const response = await fetch(imageUrl, { method: 'HEAD' });
      results.push({
        test: 'Image Endpoint',
        status: response.ok ? 'PASS' : 'FAIL',
        details: `Status: ${response.status}, URL: ${imageUrl}`
      });
    } catch (error) {
      results.push({
        test: 'Image Endpoint',
        status: 'FAIL',
        details: `Error: ${error.message}`
      });
    }

    // Test 3: Check products endpoint
    try {
      const productsUrl = getApiUrl('products/public?isAmazonsChoice=true&limit=5');
      const response = await fetch(productsUrl);
      const data = await response.json();
      results.push({
        test: 'Products Endpoint',
        status: response.ok && data.products ? 'PASS' : 'FAIL',
        details: `Status: ${response.status}, Products: ${data.products?.length || 0}`
      });
    } catch (error) {
      results.push({
        test: 'Products Endpoint',
        status: 'FAIL',
        details: `Error: ${error.message}`
      });
    }

    // Test 4: Environment check
    results.push({
      test: 'Environment',
      status: 'INFO',
      details: `Mode: ${import.meta.env.MODE}, API URL: ${getApiUrl('')}`
    });

    // Test 5: Browser capabilities
    results.push({
      test: 'Browser Support',
      status: 'INFO',
      details: `Fetch: ${!!window.fetch}, IntersectionObserver: ${!!window.IntersectionObserver}, WebP: ${await checkWebPSupport()}`
    });

    setTestResults(results);
    setLoading(false);
  };

  const checkWebPSupport = () => {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  };

  const testSpecificImage = async (asin) => {
    const imageUrl = getApiUrl(`admin-excel/public/images/by-asin/${asin}`);
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      alert(`Image test for ${asin}: ${response.ok ? 'SUCCESS' : 'FAILED'} (Status: ${response.status})`);
    } catch (error) {
      alert(`Image test for ${asin}: FAILED (${error.message})`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Image Loading Diagnostic</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runDiagnostics}
          style={{
            background: '#ff6600',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Run Diagnostics
        </button>
        
        <button 
          onClick={() => testSpecificImage('B019ISNAVA')}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Test Sample Image
        </button>
      </div>

      {loading ? (
        <div>Running diagnostics...</div>
      ) : (
        <div>
          <h2>Test Results</h2>
          {testResults.map((result, index) => (
            <div 
              key={index}
              style={{
                padding: '10px',
                margin: '10px 0',
                border: '1px solid #ddd',
                borderRadius: '5px',
                backgroundColor: result.status === 'PASS' ? '#d4edda' : 
                                result.status === 'FAIL' ? '#f8d7da' : '#d1ecf1'
              }}
            >
              <strong>{result.test}</strong>: {result.status}
              <br />
              <small>{result.details}</small>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h2>Manual Image Test</h2>
        <p>Test a specific ASIN image:</p>
        <input 
          type="text" 
          placeholder="Enter ASIN (e.g., B019ISNAVA)"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && e.target.value) {
              testSpecificImage(e.target.value);
            }
          }}
          style={{
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginRight: '10px'
          }}
        />
      </div>
    </div>
  );
};

export default ImageDiagnostic;