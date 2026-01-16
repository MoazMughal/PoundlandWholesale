import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer className="footer" style={{padding: '30px 0 15px', fontSize: '0.85rem'}}>
      <div className="container" style={{paddingLeft: '20px', paddingRight: '20px'}}>
        <div className="row" style={{marginLeft: '0', marginRight: '0'}}>
          <div className="col-lg-3 col-md-6 mb-3" style={{paddingLeft: '15px', paddingRight: '15px'}}>
            <h5 style={{fontSize: '1rem', marginBottom: '12px', fontWeight: '600'}}>About Us</h5>
            <p style={{fontSize: '0.8rem', lineHeight: '1.4', marginBottom: '10px'}}>
              Pakistan's premier wholesale marketplace connecting suppliers and businesses.
            </p>
            <div className="social-icons" style={{marginTop: '10px'}}>
              <a href="#" aria-label="Facebook" style={{fontSize: '0.9rem', marginRight: '8px'}}>
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" aria-label="Twitter" style={{fontSize: '0.9rem', marginRight: '8px'}}>
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" aria-label="Instagram" style={{fontSize: '0.9rem', marginRight: '8px'}}>
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" aria-label="LinkedIn" style={{fontSize: '0.9rem', marginRight: '8px'}}>
                <i className="fab fa-linkedin-in"></i>
              </a>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6 mb-3" style={{paddingLeft: '15px', paddingRight: '15px'}}>
            <h5 style={{fontSize: '1rem', marginBottom: '12px', fontWeight: '600'}}>Quick Links</h5>
            <ul style={{fontSize: '0.8rem', lineHeight: '1.8'}}>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/amazons-choice">Amazon's Choice</Link></li>
              <li><Link to="/categories">Categories</Link></li>
              <li><Link to="/latest-deals">Today's Deals</Link></li>
            </ul>
          </div>
          
          <div className="col-lg-3 col-md-6 mb-3" style={{paddingLeft: '15px', paddingRight: '15px'}}>
            <h5 style={{fontSize: '1rem', marginBottom: '12px', fontWeight: '600'}}>Legal</h5>
            <ul style={{fontSize: '0.8rem', lineHeight: '1.8'}}>
              <li><Link to="/terms-of-service">Terms of Service</Link></li>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/about-us">About Us</Link></li>
              <li><Link to="/faq">FAQs</Link></li>
            </ul>
          </div>
          
          <div className="col-lg-3 col-md-6 mb-3" style={{paddingLeft: '15px', paddingRight: '15px'}}>
            <h5 style={{fontSize: '1rem', marginBottom: '12px', fontWeight: '600'}}>Contact</h5>
            <ul style={{fontSize: '0.8rem', lineHeight: '1.8'}}>
              <li><i className="fas fa-map-marker-alt me-2"></i> Dilawer Cheema Khurd, PK</li>
              <li><i className="fas fa-envelope me-2"></i> info@genericwholesale.pk</li>
              <li><i className="fas fa-phone me-2"></i> +92-303-4928000</li>
            </ul>
          </div>
        </div>
        
        <div className="copyright" style={{padding: '10px 0', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)'}}>
          <p style={{margin: 0, fontSize: '0.75rem', textAlign: 'center'}}>&copy; 2025 Generic Wholesale. All rights reserved.</p>
        </div>
      </div>
      
      <style jsx>{`
        @media (max-width: 768px) {
          .footer {
            padding: 20px 0 15px !important;
          }
          
          .footer .container {
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
          
          .footer .row {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          
          .footer .col-lg-3,
          .footer .col-md-6 {
            padding-left: 15px !important;
            padding-right: 15px !important;
            margin-bottom: 20px !important;
          }
          
          .footer h5 {
            font-size: 1.1rem !important;
            margin-bottom: 15px !important;
          }
          
          .footer ul {
            padding-left: 0 !important;
            list-style: none !important;
          }
          
          .footer ul li {
            margin-bottom: 8px !important;
            padding-left: 0 !important;
          }
          
          .footer .social-icons {
            margin-top: 15px !important;
          }
          
          .footer .social-icons a {
            margin-right: 15px !important;
            font-size: 1.1rem !important;
          }
        }
      `}</style>
    </footer>
  )
}

export default Footer