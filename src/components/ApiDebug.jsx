import { useState } from 'react';
import { getApiUrl } from '../utils/api';

const ApiDebug = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);

  const testEndpoint = async (endpoint, label) => {
    setLoading(true);
    try {
      );
      const response = await fetch(getApiUrl(endpoint));
      const data = await response.json();
      
      setTestResults(prev => ({
        ...prev,
        [label]: {
          success: response.ok,
          status: response.status,
          url: response.url,
          productsCount: data.products?.length || 0,
          source: data.source,
          data: data
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [label]: {
          success: false,
          error: error.message
        }
      }));
    }
    setLoading(false);
  };

  const runAllTests = async () => {
    setTestResults({});
    await testEndpoint('../health', 'Server Health');
    await testEndpoint('../test-db', 'Database Connection');
    await testEndpoint('products/public/debug/amazons-choice-count', 'Amazon Choice Count');
    await testEndpoint('products/public/fast', 'Fast Endpoint');
    await testEndpoint('products/public?isAmazonsChoice=true&limit=10', 'Amazon Choice Filter');
    await testEndpoint('products/public?category=electronics&limit=10', 'Category Filter');
    await testEndpoint('products/public?isAmazonsChoice=true&category=electronics&limit=10', 'Combined Filters');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🧪 API Debug Tool</h2>
      <p>Current API Base URL: <code>{getApiUrl('')}</code></p>
      
      <button 
        onClick={runAllTests} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          background: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Testing...' : 'Run API Tests'}
      </button>

      {Object.entries(testResults).map(([label, result]) => (
        <div key={label} style={{
          border: '1px solid #ddd',
          borderRadius: '5px',
          padding: '15px',
          marginBottom: '10px',
          background: result.success ? '#f0f9ff' : '#fef2f2'
        }}>
          <h3 style={{ 
            color: result.success ? '#059669' : '#dc2626',
            margin: '0 0 10px 0'
          }}>
            {result.success ? '✅' : '❌'} {label}
          </h3>
          
          {result.success ? (
            <div>
              <p><strong>Status:</strong> {result.status}</p>
              <p><strong>Products Found:</strong> {result.productsCount}</p>
              {result.data.totalProducts !== undefined && (
                <>
                  <p><strong>Total Products:</strong> {result.data.totalProducts}</p>
                  <p><strong>Amazon Choice Products:</strong> {result.data.amazonsChoiceProducts}</p>
                  <p><strong>Percentage:</strong> {result.data.percentage}%</p>
                </>
              )}
              <p><strong>Source:</strong> {result.source}</p>
              <p><strong>URL:</strong> <code>{result.url}</code></p>
              
              {result.data.products && result.data.products.length > 0 && (
                <details style={{ marginTop: '10px' }}>
                  <summary>Sample Product</summary>
                  <pre style={{ 
                    background: '#f8f9fa', 
                    padding: '10px', 
                    borderRadius: '3px',
                    fontSize: '12px',
                    overflow: 'auto'
                  }}>
                    {JSON.stringify(result.data.products[0], null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ) : (
            <p style={{ color: '#dc2626' }}>
              <strong>Error:</strong> {result.error}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default ApiDebug;