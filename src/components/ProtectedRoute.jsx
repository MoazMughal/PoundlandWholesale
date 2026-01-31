import { Navigate, useLocation } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, authResolved, loading } = useAdmin();
  const location = useLocation();
  
  console.log('🛡️ ProtectedRoute check:', { isLoggedIn, authResolved, loading, path: location.pathname });
  
  // Show loader until auth is resolved and not loading
  if (!authResolved || loading) {
    console.log('🛡️ ProtectedRoute: Showing loader (authResolved:', authResolved, 'loading:', loading, ')');
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '1.2rem',
        color: '#666',
        background: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{fontSize: '2rem', marginBottom: '10px'}}>⏳</div>
          <div>Authenticating...</div>
        </div>
      </div>
    );
  }
  
  // Only redirect if auth is fully resolved and user is not logged in
  if (authResolved && !loading && !isLoggedIn) {
    console.log('🛡️ ProtectedRoute: Redirecting to login');
    const redirectUrl = location.pathname + location.search;
    return <Navigate to={`/admin/login?redirect=${encodeURIComponent(redirectUrl)}`} replace />;
  }

  // Render children if authenticated
  console.log('🛡️ ProtectedRoute: Rendering protected content');
  return children;
};

export default ProtectedRoute;
