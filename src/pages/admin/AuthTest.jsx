import { useEffect, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import sessionManager from '../../utils/sessionManager';

const AuthTest = () => {
  const { admin, isLoggedIn, loading } = useAdmin();
  const [sessionInfo, setSessionInfo] = useState({});
  const [tabId] = useState(() => Math.random().toString(36).substr(2, 9));

  useEffect(() => {
    const updateSessionInfo = () => {
      setSessionInfo({
        hasSession: sessionManager.hasSession(),
        sessionId: sessionManager.getSessionId(),
        isFreshSession: sessionManager.isFreshSession(),
        isNewTab: sessionManager.isNewTab(),
        hasLogoutFlag: sessionManager.hasLogoutFlag(),
        adminToken: !!localStorage.getItem('adminToken'),
        adminData: !!localStorage.getItem('adminData'),
        timestamp: new Date().toLocaleTimeString()
      });
    };

    updateSessionInfo();
    const interval = setInterval(updateSessionInfo, 1000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>🔄 Loading Authentication Test...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🧪 Admin Authentication Test</h1>
      <p><strong>Tab ID:</strong> {tabId}</p>
      
      <div style={{ 
        background: isLoggedIn ? '#d4edda' : '#f8d7da', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px',
        border: `2px solid ${isLoggedIn ? '#28a745' : '#dc3545'}`
      }}>
        <h3>{isLoggedIn ? '✅ Admin Logged In' : '❌ Admin Not Logged In'}</h3>
        {admin && (
          <div>
            <p><strong>Admin ID:</strong> {admin.id}</p>
            <p><strong>Username:</strong> {admin.username}</p>
            <p><strong>Email:</strong> {admin.email}</p>
          </div>
        )}
      </div>

      <div style={{ 
        background: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>📊 Session Information</h3>
        <div style={{ fontFamily: 'monospace', fontSize: '14px' }}>
          <p><strong>Has Session:</strong> {sessionInfo.hasSession ? '✅' : '❌'}</p>
          <p><strong>Session ID:</strong> {sessionInfo.sessionId || 'None'}</p>
          <p><strong>Is Fresh Session:</strong> {sessionInfo.isFreshSession ? '✅' : '❌'}</p>
          <p><strong>Is New Tab:</strong> {sessionInfo.isNewTab ? '✅' : '❌'}</p>
          <p><strong>Has Logout Flag:</strong> {sessionInfo.hasLogoutFlag ? '⚠️' : '✅'}</p>
          <p><strong>Admin Token in Storage:</strong> {sessionInfo.adminToken ? '✅' : '❌'}</p>
          <p><strong>Admin Data in Storage:</strong> {sessionInfo.adminData ? '✅' : '❌'}</p>
          <p><strong>Last Updated:</strong> {sessionInfo.timestamp}</p>
        </div>
      </div>

      <div style={{ 
        background: '#fff3cd', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h3>🧪 Test Instructions</h3>
        <ol>
          <li>Login as admin in one tab</li>
          <li>Open this page in a new tab</li>
          <li>Verify that admin status shows as logged in</li>
          <li>Navigate to admin dashboard in the new tab</li>
          <li>Logout from one tab and check the other tab</li>
        </ol>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <a 
          href="/admin/login" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '5px'
          }}
        >
          🔑 Open Admin Login (New Tab)
        </a>
        
        <a 
          href="/admin/dashboard" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            padding: '10px 20px',
            background: '#28a745',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '5px'
          }}
        >
          📊 Open Admin Dashboard (New Tab)
        </a>
        
        <a 
          href="/admin/auth-test" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            padding: '10px 20px',
            background: '#6c757d',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '5px'
          }}
        >
          🧪 Open Auth Test (New Tab)
        </a>

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            background: '#ffc107',
            color: 'black',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh Page
        </button>
      </div>
    </div>
  );
};

export default AuthTest;