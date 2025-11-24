import { Navigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAdmin();
  
  // Always check localStorage directly for most up-to-date auth state
  const adminToken = localStorage.getItem('adminToken');
  const sellerToken = localStorage.getItem('sellerToken');
  const buyerToken = localStorage.getItem('buyerToken');
  
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
        <div>
          <div style={{fontSize: '2rem', marginBottom: '10px'}}>⏳</div>
          <div>Verifying admin access...</div>
        </div>
      </div>
    );
  }
  
  // If trying to access admin routes but logged in as seller/buyer, clear their tokens
  if (!adminToken && (sellerToken || buyerToken)) {
    localStorage.removeItem('sellerToken');
    localStorage.removeItem('sellerData');
    localStorage.removeItem('buyerToken');
    localStorage.removeItem('buyerData');
    return <Navigate to="/admin/login" replace />;
  }
  
  // Check both context and localStorage for authentication
  if (!isLoggedIn || !adminToken) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
