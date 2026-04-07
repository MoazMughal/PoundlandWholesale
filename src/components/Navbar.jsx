import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAdmin } from '../context/AdminContext'
import { useSeller } from '../context/SellerContext'
import { useBuyer } from '../context/BuyerContext'
import { getApiUrl } from '../utils/api'

const Navbar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { seller, isLoggedIn: isSellerLoggedIn, logout: sellerLogout } = useSeller()
  const { admin, isLoggedIn: isAdminLoggedIn, logout: adminLogout } = useAdmin()
  const { buyer, isLoggedIn: isBuyerLoggedIn, logout: buyerLogout } = useBuyer()

  const [categoryHierarchy, setCategoryHierarchy] = useState([]) // [{parent, children}]

  useEffect(() => {
    fetch(getApiUrl('products/public/category-hierarchy'))
      .then(r => r.ok ? r.json() : { hierarchy: [] })
      .then(d => {
        const h = d.hierarchy || [];
        console.log('📂 Navbar category hierarchy loaded:', h);
        setCategoryHierarchy(h);
      })
      .catch(e => console.warn('Navbar hierarchy fetch failed:', e));
  }, [])

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

            {/* Dynamic category dropdowns */}
            {categoryHierarchy.map(h => (
              <li
                key={h.parent}
                className="nav-item"
                style={{ position: 'relative' }}
              >
                <Link
                  className="nav-link"
                  to={`/?cat=${encodeURIComponent(h.parent)}`}
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {h.parent}
                  <i className="fas fa-chevron-down" style={{ fontSize: '0.6rem', opacity: 0.7 }}></i>
                </Link>
                {h.children.length > 0 && (
                  <div className="navbar-cat-dropdown" style={{
                    display: 'none',
                    position: 'absolute', top: '100%', left: 0,
                    background: 'white', borderRadius: '8px', minWidth: '200px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 99999,
                    border: '1px solid #e5e7eb', overflow: 'hidden'
                  }}>
                    <Link
                      to={`/?cat=${encodeURIComponent(h.parent)}`}
                      style={{
                        display: 'block', padding: '10px 16px', fontSize: '0.83rem',
                        color: '#1f2937', textDecoration: 'none', fontWeight: '700',
                        borderBottom: '2px solid #f3f4f6', background: '#f9fafb'
                      }}
                    >
                      All {h.parent}
                    </Link>
                    {h.children.map(child => (
                      <Link
                        key={child}
                        to={`/?cat=${encodeURIComponent(child)}`}
                        style={{
                          display: 'block', padding: '9px 16px 9px 28px', fontSize: '0.82rem',
                          color: '#374151', textDecoration: 'none', borderBottom: '1px solid #f9fafb'
                        }}
                      >
                        ↳ {child}
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            ))}
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