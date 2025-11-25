import { Link } from 'react-router-dom';

const CompactFooter = () => {
  return (
    <footer style={{
      background: '#232f3e',
      color: '#fff',
      padding: '30px 20px',
      marginTop: 'auto',
      flexShrink: 0
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Main Footer Content */}
        <div className="footer-grid" style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(4, 1fr)',
          gap: '30px',
          marginBottom: '30px',
          paddingBottom: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* About Section */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: '#ff9900' }}>
              About Us
            </h3>
            <p style={{ fontSize: '12px', lineHeight: '1.6', color: '#ddd', margin: 0 }}>
              Your trusted wholesale marketplace connecting Pakistani suppliers with global retailers.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: '#ff9900' }}>
              Quick Links
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link to="/" style={{ color: '#ddd', textDecoration: 'none', fontSize: '12px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#ddd'}>
                Home
              </Link>
              <Link to="/about-us" style={{ color: '#ddd', textDecoration: 'none', fontSize: '12px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#ddd'}>
                About Us
              </Link>
              <Link to="/basket" style={{ color: '#ddd', textDecoration: 'none', fontSize: '12px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#ddd'}>
                Basket
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: '#ff9900' }}>
              Legal
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link to="/terms-of-service" style={{ color: '#ddd', textDecoration: 'none', fontSize: '12px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#ddd'}>
                Terms of Service
              </Link>
              <Link to="/privacy-policy" style={{ color: '#ddd', textDecoration: 'none', fontSize: '12px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#ddd'}>
                Privacy Policy
              </Link>
              <Link to="/help-center" style={{ color: '#ddd', textDecoration: 'none', fontSize: '12px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#ddd'}>
                Help Center
              </Link>
              <Link to="/faq" style={{ color: '#ddd', textDecoration: 'none', fontSize: '12px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#ddd'}>
                FAQ
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: '#ff9900' }}>
              Contact
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#ddd' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-envelope" style={{ color: '#ff9900', fontSize: '11px' }}></i>
                <span>support@genericwholesale.com</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-phone" style={{ color: '#ff9900', fontSize: '11px' }}></i>
                <span>+92 304 4928000</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-phone" style={{ color: '#ff9900', fontSize: '11px' }}></i>
                <span>+92 303 4928000</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-map-marker-alt" style={{ color: '#ff9900', fontSize: '11px' }}></i>
                <span>Islamabad, Pakistan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '15px',
          fontSize: '12px',
          color: '#999'
        }}>
          {/* Social Media Icons - Centered */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span>Follow Us:</span>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: '#ddd', fontSize: '16px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#ddd'}>
              <i className="fab fa-facebook"></i>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" style={{ color: '#ddd', fontSize: '16px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#ddd'}>
              <i className="fab fa-twitter"></i>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{ color: '#ddd', fontSize: '16px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#ddd'}>
              <i className="fab fa-instagram"></i>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" style={{ color: '#ddd', fontSize: '16px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#ddd'}>
              <i className="fab fa-linkedin"></i>
            </a>
          </div>
          
          {/* Copyright - Centered */}
          <div>
            © 2024 Generic Wholesale. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default CompactFooter;
