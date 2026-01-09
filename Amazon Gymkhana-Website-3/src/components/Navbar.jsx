import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useSeller } from '../context/SellerContext'

const Navbar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { seller, isLoggedIn: isSellerLoggedIn, logout: sellerLogout } = useSeller()
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [adminData, setAdminData] = useState(null)
  const [isBuyerLoggedIn, setIsBuyerLoggedIn] = useState(false)
  const [buyerData, setBuyerData] = useState(null)

  useEffect(() => {
    // Check if admin is logged in
    const adminToken = localStorage.getItem('adminToken')
    const admin = localStorage.getItem('adminData')
    
    if (adminToken && admin) {
      try {
        setIsAdminLoggedIn(true)
        setAdminData(JSON.parse(admin))
      } catch (error) {
        setIsAdminLoggedIn(false)
      }
    } else {
      setIsAdminLoggedIn(false)
    }

    // Check if buyer is logged in
    const buyerToken = localStorage.getItem('buyerToken')
    const buyer = localStorage.getItem('buyerData')
    
    if (buyerToken && buyer) {
      try {
        setIsBuyerLoggedIn(true)
        setBuyerData(JSON.parse(buyer))
      } catch (error) {
        setIsBuyerLoggedIn(false)
      }
    } else {
      setIsBuyerLoggedIn(false)
    }
  }, [location])

  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminData')
    setIsAdminLoggedIn(false)
    setAdminData(null)
    navigate('/admin/login')
  }

  const handleBuyerLogout = () => {
    localStorage.removeItem('buyerToken')
    localStorage.removeItem('buyerData')
    setIsBuyerLoggedIn(false)
    setBuyerData(null)
    // Navigate to auth landing page instead of specific login
    navigate('/auth')
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark sticky-top">
      <div className="container">
        <Link className="navbar-brand" to="/">
          <span className="brand-text">
            Generic <span className="gymkhana-text">Wholesale</span>
          </span>
        </Link>
        
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link 
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} 
                to="/"
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.7rem' }}
              >
                Home
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                className={`nav-link ${location.pathname === '/amazons-choice' ? 'active' : ''}`} 
                to="/amazons-choice"
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.7rem' }}
              >
                Amazon's Choice
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                className={`nav-link ${location.pathname === '/best-sellers' ? 'active' : ''}`} 
                to="/best-sellers"
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.7rem' }}
              >
                Best Sellers
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                className={`nav-link ${location.pathname === '/latest-deals' ? 'active' : ''}`} 
                to="/latest-deals"
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.7rem' }}
              >
                Deals
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                className={`nav-link ${location.pathname === '/contact' ? 'active' : ''}`} 
                to="/contact"
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.7rem' }}
              >
                Contact
              </Link>
            </li>
          </ul>
          
          <div className="d-flex flex-column align-items-end gap-1">
            {!isBuyerLoggedIn && !isAdminLoggedIn && !isSellerLoggedIn && (
              <div className="d-flex align-items-center gap-2">
                <Link 
                  to="/auth" 
                  className="btn btn-sm btn-outline-light"
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                >
                  Login
                </Link>
                <Link 
                  to="/join-now" 
                  className="btn btn-sm btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                >
                  Join Now
                </Link>
              </div>
            )}

            {/* Seller Status */}
            {isSellerLoggedIn && seller && (
              <div 
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  padding: '2px 8px',
                  borderRadius: '8px',
                  fontSize: '0.7rem',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }}
              >
                <span style={{ fontWeight: '600' }}>
                  🏪 {seller.username}
                </span>
                <Link 
                  to="/seller/dashboard" 
                  style={{
                    color: 'white',
                    textDecoration: 'none',
                    padding: '1px 4px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    fontWeight: '600'
                  }}
                >
                  Dashboard
                </Link>
                <button 
                  onClick={sellerLogout}
                  style={{
                    color: 'white',
                    background: 'rgba(220,53,69,0.9)',
                    border: 'none',
                    padding: '1px 4px',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Logout
                </button>
              </div>
            )}
            
            {/* Buyer Status */}
            {isBuyerLoggedIn && (
              <div 
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  padding: '2px 8px',
                  borderRadius: '8px',
                  fontSize: '0.7rem',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }}
              >
                <span style={{ fontWeight: '600' }}>
                  👤 {buyerData?.name || 'Buyer'}
                </span>
                <Link 
                  to="/buyer/dashboard" 
                  style={{
                    color: 'white',
                    textDecoration: 'none',
                    padding: '1px 4px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    fontWeight: '600'
                  }}
                >
                  Dashboard
                </Link>
                <button 
                  onClick={handleBuyerLogout}
                  style={{
                    color: 'white',
                    background: 'rgba(220,53,69,0.9)',
                    border: 'none',
                    padding: '1px 4px',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Logout
                </button>
              </div>
            )}
            
            {/* Admin Status */}
            {isAdminLoggedIn && (
              <div 
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '0.65rem',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }}
              >
                <span style={{ fontWeight: '600' }}>
                  Admin: {adminData?.username || 'Admin'}
                </span>
                <Link 
                  to="/admin/dashboard" 
                  style={{
                    color: 'white',
                    textDecoration: 'none',
                    padding: '1px 4px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    fontSize: '0.6rem'
                  }}
                >
                  Dashboard
                </Link>
                <button 
                  onClick={handleAdminLogout}
                  style={{
                    color: 'white',
                    background: 'rgba(220,53,69,0.8)',
                    border: 'none',
                    padding: '1px 4px',
                    borderRadius: '4px',
                    fontSize: '0.6rem',
                    cursor: 'pointer'
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar