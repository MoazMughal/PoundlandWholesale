import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

const CompactFooter = () => {
  // Add responsive grid handling
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize(); // Check initial size
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return (
    <footer style={{
      background: 'linear-gradient(135deg, #232f3e 0%, #1a252f 100%)',
      color: '#fff',
      padding: '20px 20px 10px',
      marginTop: 'auto',
      flexShrink: 0,
      borderTop: '3px solid #ff9900',
      boxShadow: '0 -2px 10px rgba(255, 153, 0, 0.2)',
      width: '100%',
      margin: 0,
      // Add mobile-specific padding
      ...(isMobile && {
        padding: '20px 60px 10px', // Increased horizontal padding for mobile
      })
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        // Add mobile-specific margin
        ...(isMobile && {
          marginLeft: '50px', // Add left margin for mobile to move content away from edge
        })
      }}>
        {/* Main Footer Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
          gap: isMobile ? '15px' : '20px',
          marginBottom: '15px',
          paddingBottom: '15px',
          borderBottom: '1px solid rgba(255,255,255,0.15)'
        }}>
          {/* About Section */}
          <div>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '700', 
              marginBottom: '15px', 
              color: '#ffffff',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              position: 'relative',
              paddingBottom: '8px'
            }}>
              About Us
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '40px',
                height: '3px',
                background: '#ff9900',
                borderRadius: '2px'
              }}></div>
            </h3>
            <p style={{ 
              fontSize: '14px', 
              lineHeight: '1.6', 
              color: 'rgba(255,255,255,0.8)', 
              margin: 0 
            }}>
              Your trusted wholesale marketplace connecting suppliers with global retailers.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '700', 
              marginBottom: '15px', 
              color: '#ffffff',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              position: 'relative',
              paddingBottom: '8px'
            }}>
              Quick Links
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '40px',
                height: '3px',
                background: '#ff9900',
                borderRadius: '2px'
              }}></div>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link 
                to="/" 
                style={{ 
                  color: 'rgba(255,255,255,0.8)', 
                  textDecoration: 'none', 
                  fontSize: '14px', 
                  transition: 'all 0.3s ease',
                  display: 'block'
                }} 
                onMouseEnter={(e) => {
                  e.target.style.color = '#ff9900';
                  e.target.style.transform = 'translateX(5px)';
                }} 
                onMouseLeave={(e) => {
                  e.target.style.color = 'rgba(255,255,255,0.8)';
                  e.target.style.transform = 'translateX(0)';
                }}
              >
                Home
              </Link>
              <Link 
                to="/about-us" 
                style={{ 
                  color: 'rgba(255,255,255,0.8)', 
                  textDecoration: 'none', 
                  fontSize: '14px', 
                  transition: 'all 0.3s ease',
                  display: 'block'
                }} 
                onMouseEnter={(e) => {
                  e.target.style.color = '#ff9900';
                  e.target.style.transform = 'translateX(5px)';
                }} 
                onMouseLeave={(e) => {
                  e.target.style.color = 'rgba(255,255,255,0.8)';
                  e.target.style.transform = 'translateX(0)';
                }}
              >
                About Us
              </Link>
              <Link 
                to="/basket" 
                style={{ 
                  color: 'rgba(255,255,255,0.8)', 
                  textDecoration: 'none', 
                  fontSize: '14px', 
                  transition: 'all 0.3s ease',
                  display: 'block'
                }} 
                onMouseEnter={(e) => {
                  e.target.style.color = '#ff9900';
                  e.target.style.transform = 'translateX(5px)';
                }} 
                onMouseLeave={(e) => {
                  e.target.style.color = 'rgba(255,255,255,0.8)';
                  e.target.style.transform = 'translateX(0)';
                }}
              >
                Basket
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '700', 
              marginBottom: '15px', 
              color: '#ffffff',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              position: 'relative',
              paddingBottom: '8px'
            }}>
              Legal
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '40px',
                height: '3px',
                background: '#ff9900',
                borderRadius: '2px'
              }}></div>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link 
                to="/terms-of-service" 
                style={{ 
                  color: 'rgba(255,255,255,0.8)', 
                  textDecoration: 'none', 
                  fontSize: '14px', 
                  transition: 'all 0.3s ease',
                  display: 'block'
                }} 
                onMouseEnter={(e) => {
                  e.target.style.color = '#ff9900';
                  e.target.style.transform = 'translateX(5px)';
                }} 
                onMouseLeave={(e) => {
                  e.target.style.color = 'rgba(255,255,255,0.8)';
                  e.target.style.transform = 'translateX(0)';
                }}
              >
                Terms of Service
              </Link>
              <Link 
                to="/privacy-policy" 
                style={{ 
                  color: 'rgba(255,255,255,0.8)', 
                  textDecoration: 'none', 
                  fontSize: '14px', 
                  transition: 'all 0.3s ease',
                  display: 'block'
                }} 
                onMouseEnter={(e) => {
                  e.target.style.color = '#ff9900';
                  e.target.style.transform = 'translateX(5px)';
                }} 
                onMouseLeave={(e) => {
                  e.target.style.color = 'rgba(255,255,255,0.8)';
                  e.target.style.transform = 'translateX(0)';
                }}
              >
                Privacy Policy
              </Link>
              <Link 
                to="/help-center" 
                style={{ 
                  color: 'rgba(255,255,255,0.8)', 
                  textDecoration: 'none', 
                  fontSize: '14px', 
                  transition: 'all 0.3s ease',
                  display: 'block'
                }} 
                onMouseEnter={(e) => {
                  e.target.style.color = '#ff9900';
                  e.target.style.transform = 'translateX(5px)';
                }} 
                onMouseLeave={(e) => {
                  e.target.style.color = 'rgba(255,255,255,0.8)';
                  e.target.style.transform = 'translateX(0)';
                }}
              >
                Help Center
              </Link>
              <Link 
                to="/faq" 
                style={{ 
                  color: 'rgba(255,255,255,0.8)', 
                  textDecoration: 'none', 
                  fontSize: '14px', 
                  transition: 'all 0.3s ease',
                  display: 'block'
                }} 
                onMouseEnter={(e) => {
                  e.target.style.color = '#ff9900';
                  e.target.style.transform = 'translateX(5px)';
                }} 
                onMouseLeave={(e) => {
                  e.target.style.color = 'rgba(255,255,255,0.8)';
                  e.target.style.transform = 'translateX(0)';
                }}
              >
                FAQ
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '700', 
              marginBottom: '15px', 
              color: '#ffffff',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              position: 'relative',
              paddingBottom: '8px'
            }}>
              Contact
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '40px',
                height: '3px',
                background: '#ff9900',
                borderRadius: '2px'
              }}></div>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-envelope" style={{ color: '#ff9900', fontSize: '14px', width: '16px' }}></i>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>support@poundlandwholesale.com</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-phone" style={{ color: '#ff9900', fontSize: '14px', width: '16px' }}></i>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>+92 304 4928000</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-phone" style={{ color: '#ff9900', fontSize: '14px', width: '16px' }}></i>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>+92 303 4928000</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-map-marker-alt" style={{ color: '#ff9900', fontSize: '14px', width: '16px' }}></i>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>London, United Kingdom</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          paddingTop: '10px'
        }}>
          {/* Social Media Icons */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '500', fontSize: '14px' }}>Follow Us:</span>
            <a 
              href="https://facebook.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)',
                borderRadius: '50%',
                fontSize: '18px',
                transition: 'all 0.3s ease',
                textDecoration: 'none'
              }} 
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#ff9900';
                e.target.style.color = '#fff';
                e.target.style.transform = 'translateY(-3px)';
              }} 
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.target.style.color = 'rgba(255,255,255,0.8)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <i className="fab fa-facebook"></i>
            </a>
            <a 
              href="https://twitter.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)',
                borderRadius: '50%',
                fontSize: '18px',
                transition: 'all 0.3s ease',
                textDecoration: 'none'
              }} 
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#ff9900';
                e.target.style.color = '#fff';
                e.target.style.transform = 'translateY(-3px)';
              }} 
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.target.style.color = 'rgba(255,255,255,0.8)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <i className="fab fa-twitter"></i>
            </a>
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)',
                borderRadius: '50%',
                fontSize: '18px',
                transition: 'all 0.3s ease',
                textDecoration: 'none'
              }} 
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#ff9900';
                e.target.style.color = '#fff';
                e.target.style.transform = 'translateY(-3px)';
              }} 
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.target.style.color = 'rgba(255,255,255,0.8)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <i className="fab fa-instagram"></i>
            </a>
            <a 
              href="https://linkedin.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)',
                borderRadius: '50%',
                fontSize: '18px',
                transition: 'all 0.3s ease',
                textDecoration: 'none'
              }} 
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#ff9900';
                e.target.style.color = '#fff';
                e.target.style.transform = 'translateY(-3px)';
              }} 
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.target.style.color = 'rgba(255,255,255,0.8)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <i className="fab fa-linkedin"></i>
            </a>
          </div>
          
          {/* Copyright */}
          <div style={{ 
            color: 'rgba(255,255,255,0.6)', 
            fontWeight: '400',
            fontSize: '14px',
            textAlign: isMobile ? 'center' : 'right'
          }}>
            © 2024 PoundlandWholesale.com. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default CompactFooter;
