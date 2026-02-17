import { Link } from 'react-router-dom'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-row">
          <div className="footer-col">
            <h5>About Us</h5>
            <p>
              Pakistan's premier wholesale marketplace connecting suppliers and businesses.
            </p>
            <div className="social-icons">
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
            </div>
          </div>
          
          <div className="footer-col">
            <h5>Quick Links</h5>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/amazons-choice">Amazon's Choice</Link></li>
              <li><Link to="/categories">Categories</Link></li>
              <li><Link to="/latest-deals">Today's Deals</Link></li>
            </ul>
          </div>
          
          <div className="footer-col">
            <h5>Legal</h5>
            <ul>
              <li><Link to="/terms-of-service">Terms of Service</Link></li>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/about-us">About Us</Link></li>
              <li><Link to="/faq">FAQs</Link></li>
            </ul>
          </div>
          
          <div className="footer-col">
            <h5>Contact</h5>
            <ul>
              <li><i className="fas fa-map-marker-alt me-2"></i> Dilawer Cheema Khurd, PK</li>
              <li><i className="fas fa-envelope me-2"></i> info@genericwholesale.pk</li>
              <li><i className="fas fa-envelope me-2"></i> poundlandwholesale@gmail.com</li>
              <li><i className="fas fa-phone me-2"></i> +92-303-4928000</li>
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