import { Link } from 'react-router-dom'
import '../../styles/AuthLanding.css'

const AuthLanding = () => {
  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            {/* Header */}
            <div className="text-center mb-4">
              <h2 className="fw-bold text-dark mb-2">Welcome to Amazon Choice</h2>
              <p className="text-muted small">Choose how you want to join our marketplace</p>
            </div>

            {/* Auth Options */}
            <div className="row g-4">
              {/* Buyer Card */}
              <div className="col-md-6">
                <div className="card h-100 shadow-lg border-0 rounded-4 hover-card">
                  <div className="card-body p-4 text-center">
                    <div className="mb-3">
                      <i className="fas fa-shopping-cart fa-3x text-primary"></i>
                    </div>
                    <h4 className="fw-bold text-dark mb-2">I'm a Buyer</h4>
                    <p className="text-muted small mb-3">
                      Looking to purchase products at wholesale prices? 
                      Access thousands of products from verified suppliers.
                    </p>
                    
                    <div className="mb-3">
                      <div className="row text-center">
                        <div className="col-4">
                          <i className="fas fa-tags text-primary mb-1"></i>
                          <p className="small text-muted mb-0" style={{ fontSize: '0.75rem' }}>Wholesale Prices</p>
                        </div>
                        <div className="col-4">
                          <i className="fas fa-shield-alt text-success mb-1"></i>
                          <p className="small text-muted mb-0" style={{ fontSize: '0.75rem' }}>Verified Suppliers</p>
                        </div>
                        <div className="col-4">
                          <i className="fas fa-shipping-fast text-info mb-1"></i>
                          <p className="small text-muted mb-0" style={{ fontSize: '0.75rem' }}>Fast Delivery</p>
                        </div>
                      </div>
                    </div>

                    <div className="d-grid gap-2">
                      <Link to="/login/buyer" className="btn btn-primary rounded-3">
                        <i className="fas fa-sign-in-alt me-2"></i>
                        Login as Buyer
                      </Link>
                      <Link to="/register/buyer" className="btn btn-outline-primary btn-sm rounded-3">
                        Create Buyer Account
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Supplier Card */}
              <div className="col-md-6">
                <div className="card h-100 shadow-lg border-0 rounded-4 hover-card">
                  <div className="card-body p-4 text-center">
                    <div className="mb-3">
                      <i className="fas fa-store fa-3x text-success"></i>
                    </div>
                    <h4 className="fw-bold text-dark mb-2">I'm a Supplier</h4>
                    <p className="text-muted small mb-3">
                      Want to sell your products to retailers? 
                      Reach thousands of verified buyers across Pakistan.
                    </p>
                    
                    <div className="mb-3">
                      <div className="row text-center">
                        <div className="col-4">
                          <i className="fas fa-users text-success mb-1"></i>
                          <p className="small text-muted mb-0" style={{ fontSize: '0.75rem' }}>Large Network</p>
                        </div>
                        <div className="col-4">
                          <i className="fas fa-chart-line text-primary mb-1"></i>
                          <p className="small text-muted mb-0" style={{ fontSize: '0.75rem' }}>Grow Business</p>
                        </div>
                        <div className="col-4">
                          <i className="fas fa-handshake text-info mb-1"></i>
                          <p className="small text-muted mb-0" style={{ fontSize: '0.75rem' }}>Trusted Platform</p>
                        </div>
                      </div>
                    </div>

                    <div className="d-grid gap-2">
                      <Link to="/login/supplier" className="btn btn-success rounded-3">
                        <i className="fas fa-sign-in-alt me-2"></i>
                        Login as Supplier
                      </Link>
                      <Link to="/register/supplier" className="btn btn-outline-success btn-sm rounded-3">
                        Create Supplier Account
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Access */}
            <div className="text-center mt-3">
              <div className="card border-warning shadow-sm rounded-4">
                <div className="card-body p-3">
                  <div className="row align-items-center">
                    <div className="col-md-8">
                      <div className="d-flex align-items-center">
                        <i className="fas fa-user-shield fa-lg text-warning me-2"></i>
                        <div className="text-start">
                          <h6 className="mb-0 fw-bold small">Administrative Access</h6>
                          <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>For platform administrators only</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4 text-end">
                      <Link to="/admin/login" className="btn btn-warning btn-sm">
                        <i className="fas fa-lock me-1"></i>
                        Admin Login
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Back to Home */}
            <div className="text-center mt-3">
              <Link to="/" className="btn btn-outline-secondary btn-sm">
                <i className="fas fa-home me-1"></i>
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>


    </div>
  )
}

export default AuthLanding