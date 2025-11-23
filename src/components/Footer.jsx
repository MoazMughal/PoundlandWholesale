import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="row">
          <div className="col-lg-4 col-md-6 mb-4">
            <h5>About Generic Wholesale</h5>
            <p>Pakistan's premier wholesale marketplace connecting suppliers, retailers, and businesses for seamless B2B transactions and growth.</p>
            <div className="social-icons mt-4">
              <a href="#" aria-label="Facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" aria-label="Twitter">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" aria-label="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" aria-label="LinkedIn">
                <i className="fab fa-linkedin-in"></i>
              </a>
              <a href="#" aria-label="YouTube">
                <i className="fab fa-youtube"></i>
              </a>
            </div>
          </div>
          
          <div className="col-lg-2 col-md-6 mb-4">
            <h5>Quick Links</h5>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/amazons-choice">Amazon's Choice</Link></li>
              <li><Link to="/categories">Best Seller Categories</Link></li>
              <li><Link to="/latest-deals">Today's deals</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
            </ul>
          </div>
          
          <div className="col-lg-3 col-md-6 mb-4">
            <h5>Important Links</h5>
            <ul>
              <li><Link to="/terms-of-service" target="_blank" rel="noopener noreferrer">Terms of Service</Link></li>
              <li><Link to="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link></li>
              <li><Link to="/about-us" target="_blank" rel="noopener noreferrer">About Us</Link></li>
              <li><Link to="/help-center" target="_blank" rel="noopener noreferrer">Help Center</Link></li>
              <li><Link to="/faq" target="_blank" rel="noopener noreferrer">FAQs</Link></li>
            </ul>
          </div>
          
          <div className="col-lg-3 col-md-6 mb-4">
            <h5>Contact Info</h5>
            <ul>
              <li><i className="fas fa-map-marker-alt me-2"></i> Dilawer Cheema Khurd, Pakistan</li>
              <li><i className="fas fa-envelope me-2"></i> info@genericwholesale.pk</li>
              <li><i className="fas fa-phone me-2"></i> +92-303-4928000</li>
              <li><i className="fas fa-phone me-2"></i> +92-304-4928000</li>
            </ul>
          </div>
        </div>
        
        <div className="copyright">
          <p>&copy; 2025 Generic Wholesale. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer