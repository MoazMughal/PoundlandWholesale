import { Link, useLocation } from 'react-router-dom';

const Breadcrumb = ({ customItems = null }) => {
  const location = useLocation();
  
  // If custom items are provided, use them
  if (customItems) {
    return (
      <nav className="breadcrumb" aria-label="Breadcrumb">
        {customItems.map((item, index) => (
          <div key={index} className="breadcrumb-item">
            {index > 0 && <span className="breadcrumb-separator">›</span>}
            {item.href ? (
              <Link to={item.href} className="breadcrumb-link">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-600">{item.label}</span>
            )}
          </div>
        ))}
      </nav>
    );
  }

  // Auto-generate breadcrumbs from current path
  const pathnames = location.pathname.split('/').filter(x => x);
  
  // Don't show breadcrumbs on home page
  if (pathnames.length === 0) return null;

  // Path name mappings for better display
  const pathMappings = {
    'admin': 'Admin',
    'seller': 'Seller',
    'buyer': 'Buyer',
    'products': 'Products',
    'dashboard': 'Dashboard',
    'profile': 'Profile',
    'login': 'Login',
    'register': 'Register',
    'forgot-password': 'Forgot Password',
    'forgot-password-token': 'Forgot Password',
    'reset-password': 'Reset Password',
    'categories': 'Categories',
    'about-us': 'About Us',
    'excel-products': 'Excel Products',
    'add': 'Add',
    'edit': 'Edit'
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    ...pathnames.map((pathname, index) => {
      const href = `/${pathnames.slice(0, index + 1).join('/')}`;
      const label = pathMappings[pathname] || pathname.charAt(0).toUpperCase() + pathname.slice(1);
      
      return {
        label,
        href: index === pathnames.length - 1 ? null : href // Last item is not a link
      };
    })
  ];

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="breadcrumb-item">
          {index > 0 && <span className="breadcrumb-separator">›</span>}
          {item.href ? (
            <Link to={item.href} className="breadcrumb-link">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-600">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
};

export default Breadcrumb;