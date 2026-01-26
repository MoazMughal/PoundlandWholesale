import { Navigate, useLocation } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, authResolved } = useAdmin();
  const location = useLocation();
  
  // Show loader until auth is resolved
  if (!authResolved) {
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
          <div>Loading...</div>
        </div>
      </div>
    );
  }
  
  // Redirect to login if not logged in
  if (!isLoggedIn) {
    const redirectUrl = location.pathname + location.search;
    return <Navigate to={`/admin/login?redirect=${encodeURIComponent(redirectUrl)}`} replace />;
  }

  // Render children if authenticated
  return children;
};

export default ProtectedRoute;
