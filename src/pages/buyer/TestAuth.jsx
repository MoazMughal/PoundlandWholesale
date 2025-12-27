import { useState, useEffect } from 'react';

const TestAuth = () => {
  const [results, setResults] = useState([]);

  const addResult = (message) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const testAuth = async () => {
      addResult('Starting authentication test...');
      
      // Check localStorage
      const token = localStorage.getItem('buyerToken');
      const buyerData = localStorage.getItem('buyerData');
      
      addResult(`Token in localStorage: ${token ? 'YES' : 'NO'}`);
      addResult(`Buyer data in localStorage: ${buyerData ? 'YES' : 'NO'}`);
      
      if (token) {
        addResult(`Token length: ${token.length}`);
        addResult(`Token starts with: ${token.substring(0, 20)}...`);
        
        try {
          addResult('Making API call to /api/buyer/profile...');
          
          const response = await fetch('http://localhost:5000/api/buyer/profile', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          addResult(`API Response status: ${response.status}`);
          addResult(`API Response ok: ${response.ok}`);
          
          const data = await response.json();
          addResult(`API Response data: ${JSON.stringify(data, null, 2)}`);
          
        } catch (error) {
          addResult(`API Error: ${error.message}`);
        }
      }
    };

    testAuth();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Buyer Authentication Test</h1>
      <div style={{ 
        background: '#f5f5f5', 
        padding: '20px', 
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '14px',
        whiteSpace: 'pre-wrap'
      }}>
        {results.map((result, index) => (
          <div key={index} style={{ marginBottom: '5px' }}>
            {result}
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => {
            localStorage.removeItem('buyerToken');
            localStorage.removeItem('buyerData');
            window.location.reload();
          }}
          style={{
            padding: '10px 20px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            marginRight: '10px'
          }}
        >
          Clear Tokens & Reload
        </button>
        
        <button 
          onClick={() => window.location.href = '/login/buyer'}
          style={{
            padding: '10px 20px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px'
          }}
        >
          Go to Login
        </button>
      </div>
    </div>
  );
};

export default TestAuth;