import { Navigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAdmin();
  
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
  
  // Simple authentication check
  const adminToken = localStorage.getItem('adminToken');
  
  if (!isLoggedIn || !adminToken) {
    // Clear any conflicting tokens
    localStorage.removeItem('sellerToken');
    localStorage.removeItem('sellerData');
    localStorage.removeItem('buyerToken');
    localStorage.removeItem('buyerData');
    
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
