import { Link } from 'react-router-dom';

const CompactFooter = () => {
  return (
    <footer style={{
      background: '#232f3e',
      color: '#fff',
      padding: '20px',
      marginTop: '40px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ fontSize: '13px' }}>
          © 2024 Generic Wholesale. All rights reserved.
        </div>
        
        <div style={{
          display: 'flex',
          gap: '20px',
          fontSize: '13px'
        }}>
          <Link to="/about-us" style={{ color: '#fff', textDecoration: 'none' }}>
            About Us
          </Link>
          <Link to="/terms-of-service" style={{ color: '#fff', textDecoration: 'none' }}>
            Terms
          </Link>
          <Link to="/privacy-policy" style={{ color: '#fff', textDecoration: 'none' }}>
            Privacy
          </Link>
          <Link to="/help-center" style={{ color: '#fff', textDecoration: 'none' }}>
            Help
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default CompactFooter;
