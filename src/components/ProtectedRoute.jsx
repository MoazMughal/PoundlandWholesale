import { Navigate, useLocation } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import authPersistence from '../utils/authPersistence';

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading, admin } = useAdmin();
  const location = useLocation();
  
  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{fontSize: '2rem', marginBottom: '10px'}}>⏳</div>
          <div>Verifying admin access...</div>
        </div>
      </div>
    );
  }
  
  // Check authentication
  const hasToken = authPersistence.hasToken();
  
  if (!isLoggedIn || !hasToken || !admin) {
    // Clear any conflicting tokens
    localStorage.removeItem('sellerToken');
    localStorage.removeItem('sellerData');
    localStorage.removeItem('buyerToken');
    localStorage.removeItem('buyerData');
    
    // Store the attempted URL for redirect after login
    const redirectUrl = location.pathname + location.search;
    
    return <Navigate to={`/admin/login?redirect=${encodeURIComponent(redirectUrl)}`} replace />;
  }

  return children;
};

export default ProtectedRoute;
