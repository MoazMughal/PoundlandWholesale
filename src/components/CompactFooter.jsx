import { Link } from 'react-router-dom';
import { useEffect } from 'react';

const CompactFooter = () => {
  // Force inject styles to ensure headers are visible
  useEffect(() => {
    const styleId = 'footer-header-override';
    let existingStyle = document.getElementById(styleId);
    
    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .footer-header-force-visible,
        .footer-header-force-visible * {
          color: #ffffff !important;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8) !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          font-weight: 700 !important;
          font-size: 14px !important;
          margin-bottom: 12px !important;
          background: none !important;
          text-decoration: none !important;
        }
        
        .footer-section-override h3 {
          color: #ffffff !important;
          text-shadow: 0 2px 4px rgba(0,0,0,0.8) !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          font-weight: 700 !important;
          font-size: 14px !important;
          margin-bottom: 12px !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);
  return (
    <footer style={{
      background: '#232f3e',
      color: '#fff',
      padding: '30px 20px',
      marginTop: 'auto',
      flexShrink: 0,
      textShadow: '0 1px 2px rgba(0,0,0,0.3)'
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
          <div className="footer-section-override">
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '800', 
              marginBottom: '12px', 
              color: '#00ff00', 
              textShadow: '0 0 10px rgba(0,255,0,0.5)',
              display: 'block',
              visibility: 'visible',
              opacity: '1',
              background: 'rgba(0,0,0,0.3)',
              padding: '4px 8px',
              borderRadius: '4px'
            }}>
              About Us
            </h3>
            <p style={{ fontSize: '12px', lineHeight: '1.6', color: '#e5e5e5', margin: 0 }}>
              Your trusted wholesale marketplace connecting Pakistani suppliers with global retailers.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '800', 
              marginBottom: '12px', 
              color: '#00ff00', 
              textShadow: '0 0 10px rgba(0,255,0,0.5)',
              display: 'block',
              visibility: 'visible',
              opacity: '1',
              background: 'rgba(0,0,0,0.3)',
              padding: '4px 8px',
              borderRadius: '4px'
            }}>
              Quick Links
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link to="/" style={{ color: '#e5e5e5', textDecoration: 'none', fontSize: '12px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#e5e5e5'}>
                Home
              </Link>
              <Link to="/about-us" style={{ color: '#e5e5e5', textDecoration: 'none', fontSize: '12px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#e5e5e5'}>
                About Us
              </Link>
              <Link to="/basket" style={{ color: '#e5e5e5', textDecoration: 'none', fontSize: '12px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#e5e5e5'}>
                Basket
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '800', 
              marginBottom: '12px', 
              color: '#00ff00', 
              textShadow: '0 0 10px rgba(0,255,0,0.5)',
              display: 'block',
              visibility: 'visible',
              opacity: '1',
              background: 'rgba(0,0,0,0.3)',
              padding: '4px 8px',
              borderRadius: '4px'
            }}>
              Legal
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link to="/terms-of-service" style={{ color: '#e5e5e5', textDecoration: 'none', fontSize: '12px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#e5e5e5'}>
                Terms of Service
              </Link>
              <Link to="/privacy-policy" style={{ color: '#e5e5e5', textDecoration: 'none', fontSize: '12px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#e5e5e5'}>
                Privacy Policy
              </Link>
              <Link to="/help-center" style={{ color: '#e5e5e5', textDecoration: 'none', fontSize: '12px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#e5e5e5'}>
                Help Center
              </Link>
              <Link to="/faq" style={{ color: '#e5e5e5', textDecoration: 'none', fontSize: '12px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#e5e5e5'}>
                FAQ
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '800', 
              marginBottom: '12px', 
              color: '#00ff00', 
              textShadow: '0 0 10px rgba(0,255,0,0.5)',
              display: 'block',
              visibility: 'visible',
              opacity: '1',
              background: 'rgba(0,0,0,0.3)',
              padding: '4px 8px',
              borderRadius: '4px'
            }}>
              Contact
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#e5e5e5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-envelope" style={{ color: '#ff9900', fontSize: '11px' }}></i>
                <span style={{ color: '#e5e5e5' }}>support@genericwholesale.com</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-phone" style={{ color: '#ff9900', fontSize: '11px' }}></i>
                <span style={{ color: '#e5e5e5' }}>+92 304 4928000</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-phone" style={{ color: '#ff9900', fontSize: '11px' }}></i>
                <span style={{ color: '#e5e5e5' }}>+92 303 4928000</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-map-marker-alt" style={{ color: '#ff9900', fontSize: '11px' }}></i>
                <span style={{ color: '#e5e5e5' }}>Islamabad, Pakistan</span>
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
          color: '#e5e5e5'
        }}>
          {/* Social Media Icons - Centered */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span style={{ color: '#e5e5e5', fontWeight: '500' }}>Follow Us:</span>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: '#e5e5e5', fontSize: '16px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#e5e5e5'}>
              <i className="fab fa-facebook"></i>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" style={{ color: '#e5e5e5', fontSize: '16px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#e5e5e5'}>
              <i className="fab fa-twitter"></i>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style={{ color: '#e5e5e5', fontSize: '16px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#e5e5e5'}>
              <i className="fab fa-instagram"></i>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" style={{ color: '#ddd', fontSize: '16px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#ff9900'} onMouseLeave={(e) => e.target.style.color = '#ddd'}>
              <i className="fab fa-linkedin"></i>
            </a>
          </div>
          
          {/* Copyright - Centered */}
          <div style={{ color: '#e5e5e5', fontWeight: '400' }}>
            © 2024 Generic Wholesale. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default CompactFooter;
