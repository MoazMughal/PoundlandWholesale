import { Link } from 'react-router-dom'
import ScrollToTop from '../../components/ScrollToTop'

const AboutUs = () => {
  return (
    <div className="container my-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card shadow-sm">
            <div className="card-body p-5">
              <h1 className="text-center mb-4">About Generic Wholesale</h1>
              <p className="text-center text-muted mb-5">Pakistan's Premier B2B Wholesale Marketplace</p>

              <section className="mb-5">
                <h3>Our Mission</h3>
                <p className="lead">To revolutionize wholesale trading in Pakistan by connecting verified suppliers with genuine buyers through a transparent, efficient, and secure digital platform.</p>
              </section>

              <section className="mb-5">
                <h3>What We Do</h3>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <div className="d-flex">
                      <div className="flex-shrink-0">
                        <i className="fas fa-handshake text-primary" style={{fontSize: '2rem'}}></i>
                      </div>
                      <div className="flex-grow-1 ms-3">
                        <h5>Connect Businesses</h5>
                        <p>We bridge the gap between wholesale suppliers and buyers, creating meaningful business relationships.</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <div className="d-flex">
                      <div className="flex-shrink-0">
                        <i className="fas fa-shield-alt text-success" style={{fontSize: '2rem'}}></i>
                      </div>
                      <div className="flex-grow-1 ms-3">
                        <h5>Verify Suppliers</h5>
                        <p>All our suppliers go through a rigorous verification process to ensure quality and reliability.</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <div className="d-flex">
                      <div className="flex-shrink-0">
                        <i className="fas fa-chart-line text-warning" style={{fontSize: '2rem'}}></i>
                      </div>
                      <div className="flex-grow-1 ms-3">
                        <h5>Market Insights</h5>
                        <p>Provide valuable market data and trends to help businesses make informed decisions.</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <div className="d-flex">
                      <div className="flex-shrink-0">
                        <i className="fas fa-mobile-alt text-info" style={{fontSize: '2rem'}}></i>
                      </div>
                      <div className="flex-grow-1 ms-3">
                        <h5>Digital Platform</h5>
                        <p>Modern, user-friendly platform accessible from anywhere, anytime on any device.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mb-5">
                <h3>Our Story</h3>
                <p>Founded in 2024, Generic Wholesale emerged from the need to digitize Pakistan's traditional wholesale market. We recognized that small and medium businesses were struggling to find reliable suppliers and access competitive wholesale prices.</p>
                <p>Our platform brings together the best of both worlds - the trust and relationships of traditional wholesale trading with the efficiency and transparency of modern technology.</p>
              </section>

              <section className="mb-5">
                <h3>Why Choose Us</h3>
                <div className="row">
                  <div className="col-md-4 text-center mb-4">
                    <div className="bg-light p-4 rounded">
                      <h2 className="text-primary">500+</h2>
                      <p>Verified Suppliers</p>
                    </div>
                  </div>
                  <div className="col-md-4 text-center mb-4">
                    <div className="bg-light p-4 rounded">
                      <h2 className="text-success">10,000+</h2>
                      <p>Products Available</p>
                    </div>
                  </div>
                  <div className="col-md-4 text-center mb-4">
                    <div className="bg-light p-4 rounded">
                      <h2 className="text-warning">1,000+</h2>
                      <p>Happy Customers</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mb-5">
                <h3>Our Values</h3>
                <ul className="list-unstyled">
                  <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i><strong>Transparency:</strong> Clear pricing, honest communication, and open business practices</li>
                  <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i><strong>Quality:</strong> Only verified suppliers and quality products make it to our platform</li>
                  <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i><strong>Innovation:</strong> Continuously improving our platform with latest technology</li>
                  <li className="mb-2"><i className="fas fa-check-circle text-success me-2"></i><strong>Support:</strong> Dedicated customer support to help you succeed</li>
                </ul>
              </section>

              <section className="mb-4">
                <h3>Contact Information</h3>
                <div className="row">
                  <div className="col-md-6">
                    <p><i className="fas fa-envelope text-primary me-2"></i>support@poundlandwholesale.com</p>
                    <p><i className="fas fa-phone text-success me-2"></i>+92 301 6611011</p>
                  </div>
                  <div className="col-md-6">
                    <p><i className="fab fa-whatsapp text-success me-2"></i>+92 301 6611011</p>
                    <p><i className="fas fa-map-marker-alt text-danger me-2"></i>Karachi, Pakistan</p>
                  </div>
                </div>
              </section>

              <div className="text-center mt-5">
                <Link to="/" className="btn btn-primary me-3">Back to Home</Link>
                <Link to="/contact" className="btn btn-outline-primary">Contact Us</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ScrollToTop />
    </div>
  )
}

export default AboutUs