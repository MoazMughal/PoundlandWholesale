import { useNavigate } from 'react-router-dom'
import '../../styles/role-selection.css'

const RoleSelection = () => {
  const navigate = useNavigate()

  return (
    <div className="role-selection-container">
      <div className="role-selection-content">

        {/* Compact header */}
        <div className="role-selection-header">
          <div className="role-brand-badge">PoundlandWholesale.com</div>
          <h1 className="role-selection-title">Welcome Back</h1>
          <p className="role-selection-subtitle">Select your account type to continue</p>
        </div>

        {/* Two cards — 50/50 */}
        <div className="role-cards-container">

          {/* Buyer Card */}
          <div className="role-card role-card--buyer">
            <div className="role-card-inner">
              <div className="role-icon-container">
                <i className="fas fa-shopping-basket role-icon"></i>
              </div>
              <h3 className="role-title">I'm a Retailer / Buyer</h3>
              <ul className="role-bullets">
                <li><i className="fas fa-check"></i> Source wholesale goods at trade prices</li>
                <li><i className="fas fa-check"></i> Track bulk orders &amp; shipments</li>
                <li><i className="fas fa-check"></i> Access profit &amp; margin calculators</li>
              </ul>
              <div className="role-actions">
                <button className="role-btn role-btn--primary" onClick={() => navigate('/login/buyer')}>
                  <i className="fas fa-sign-in-alt"></i> Log In to Buy
                </button>
                <button className="role-btn role-btn--secondary" onClick={() => navigate('/register/buyer')}>
                  <i className="fas fa-user-plus"></i> Create Buyer Account
                </button>
              </div>
            </div>
          </div>

          {/* Seller Card */}
          <div className="role-card role-card--seller">
            <div className="role-card-inner">
              <div className="role-icon-container">
                <i className="fas fa-store role-icon"></i>
              </div>
              <h3 className="role-title">I'm a Manufacturer / Supplier</h3>
              <ul className="role-bullets">
                <li><i className="fas fa-check"></i> List products to global buyers</li>
                <li><i className="fas fa-check"></i> Manage bulk inventory &amp; pricing</li>
                <li><i className="fas fa-check"></i> Grow your B2B sales pipeline</li>
              </ul>
              <div className="role-actions">
                <button className="role-btn role-btn--primary" onClick={() => navigate('/login/supplier')}>
                  <i className="fas fa-sign-in-alt"></i> Log In to Sell
                </button>
                <button className="role-btn role-btn--secondary" onClick={() => navigate('/register/supplier')}>
                  <i className="fas fa-rocket"></i> Apply to Sell
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Discreet staff link at bottom */}
        <div className="role-selection-footer">
          <p>New to PoundlandWholesale? <button className="footer-link" onClick={() => navigate('/join-now')}>Learn More</button></p>
          <button className="staff-link" onClick={() => navigate('/backend-management-portal')}>Staff Login</button>
        </div>

      </div>
    </div>
  )
}

export default RoleSelection
