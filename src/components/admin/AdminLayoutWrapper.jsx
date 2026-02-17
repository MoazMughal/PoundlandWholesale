import { useEffect } from 'react';
import '../../styles/admin-layout-fix.css';
import '../../styles/AdminLayout.css';

/**
 * AdminLayoutWrapper - Provides consistent layout structure for all admin pages
 * 
 * ARCHITECTURE:
 * - Single scroll container (.admin-content-wrapper)
 * - No nested scrolling
 * - Stable table rendering
 * - Prevents white space and layout collapse
 * 
 * USAGE:
 * <AdminLayoutWrapper>
 *   <YourAdminPageContent />
 * </AdminLayoutWrapper>
 */
const AdminLayoutWrapper = ({ children, className = '' }) => {
  useEffect(() => {
    // Add admin-page class to body
    document.body.classList.add('admin-page');
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('admin-page');
    };
  }, []);

  return (
    <div className={`admin-layout ${className}`}>
      <div className="admin-content-wrapper">
        {children}
      </div>
    </div>
  );
};

export default AdminLayoutWrapper;
