import { useParams, useSearchParams } from 'react-router-dom';

const DebugReset = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  
  return (
    <div style={{ padding: '50px', fontFamily: 'monospace' }}>
      <h2>🔍 Debug Reset Password</h2>
      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
        <h3>URL Parameters:</h3>
        <p><strong>Token:</strong> {token || 'Not found'}</p>
        <p><strong>Type:</strong> {searchParams.get('type') || 'Not found'}</p>
        <p><strong>Full URL:</strong> {window.location.href}</p>
        
        <h3>All Search Params:</h3>
        <pre>{JSON.stringify(Object.fromEntries(searchParams), null, 2)}</pre>
        
        <h3>Test Links:</h3>
        <div style={{ marginTop: '20px' }}>
          <a href="/reset-password/abc123?type=buyer" style={{ 
            display: 'block', 
            margin: '10px 0', 
            color: '#667eea' 
          }}>
            Test Buyer Reset
          </a>
          <a href="/reset-password/def456?type=seller" style={{ 
            display: 'block', 
            margin: '10px 0', 
            color: '#667eea' 
          }}>
            Test Seller Reset
          </a>
        </div>
      </div>
    </div>
  );
};

export default DebugReset;