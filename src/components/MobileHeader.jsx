import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSeller } from '../context/SellerContext';
import { useCurrency } from '../context/CurrencyContext';
import { useBasket } from '../context/BasketContext';


const MobileHeader = () => {
  const navigate = useNavigate();
  const { isLoggedIn: isSellerLoggedIn, logout: sellerLogout } = useSeller();
  const { currency, setCurrency } = useCurrency();
  const { getBasketCount } = useBasket();
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLoginMenu, setShowLoginMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const isBuyerLoggedIn = !!localStorage.getItem('buyerToken');
  const isAdminLoggedIn = !!localStorage.getItem('adminToken');
  const loginMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  const getUserInfo = () => {
    if (isAdminLoggedIn) return { type: 'Admin', name: 'Admin' };
    if (isSellerLoggedIn) return { type: 'Seller', name: 'Seller' };
    if (isBuyerLoggedIn) return { type: 'Buyer', name: 'Buyer' };
    return null;
  };

  const userInfo = getUserInfo();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (loginMenuRef.current && !loginMenuRef.current.contains(event.target)) {
        setShowLoginMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (isAdminLoggedIn) {
      localStorage.removeItem('adminToken');
    } else if (isSellerLoggedIn) {
      localStorage.removeItem('sellerToken');
      sellerLogout();
    } else if (isBuyerLoggedIn) {
      localStorage.removeItem('buyerToken');
    }
    setShowUserMenu(false);
    navigate('/');
    window.location.reload();
  };

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'remote', label: 'Remote Controls' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'strap', label: 'Watch Straps' },
    { value: 'jewelry', label: 'Jewelry' },
    { value: 'party', label: 'Party Supplies' },
    { value: 'home', label: 'Home & Decor' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'automotive', label: 'Automotive' },
    { value: 'tape', label: 'Tape' },
    { value: 'lampshade', label: 'Lampshades' }
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
      setShowMobileMenu(false);
    }
  };

  return (
    <>
      <style>{`
        /* Mobile First Responsive Design */
        .mobile-header {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .mobile-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: #fc5e03;
          gap: 8px;
        }

        .mobile-menu-btn {
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: #fff;
          width: 36px;
          height: 36px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 18px;
        }

        .mobile-logo {
          flex: 1;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }

        .mobile-logo img {
          height: 50px;
          width: auto;
          max-width: 280px;
          object-fit: contain;
          background: transparent;
        }

        /* Small mobile phones */
        @media (max-width: 400px) {
          .mobile-logo img {
            height: 44px;
            max-width: 240px;
          }
        }

        .mobile-header-icons {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .mobile-icon-btn {
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: #fff;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          position: relative;
          text-decoration: none;
        }

        .mobile-search-bar {
          padding: 8px 12px;
          background: #f5a855;
        }

        .mobile-search-form {
          position: relative;
          width: 100%;
        }

        .mobile-search-input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          border: 1px solid #fff;
          border-radius: 20px;
          font-size: 13px;
          outline: none;
        }

        .mobile-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #999;
          font-size: 14px;
        }

        .mobile-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 999;
          display: none;
        }

        .mobile-menu-overlay.active {
          display: block;
        }

        .mobile-menu-sidebar {
          position: fixed;
          top: 0;
          left: -280px;
          width: 280px;
          height: 100%;
          background: #fff;
          z-index: 1000;
          transition: left 0.3s ease;
          overflow-y: auto;
          box-shadow: 2px 0 8px rgba(0,0,0,0.1);
        }

        .mobile-menu-sidebar.active {
          left: 0;
        }

        .mobile-menu-header {
          background: #fc5e03;
          color: #fff;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .mobile-menu-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: #fff;
          width: 32px;
          height: 32px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 20px;
        }

        .mobile-menu-section {
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .mobile-menu-title {
          font-size: 12px;
          font-weight: 700;
          color: #666;
          margin-bottom: 12px;
          text-transform: uppercase;
        }

        .mobile-menu-item {
          display: block;
          padding: 10px 12px;
          color: #111;
          text-decoration: none;
          border-radius: 4px;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .mobile-menu-item:hover {
          background: #f3f4f6;
        }

        .mobile-category-nav {
          display: none;
        }

        /* Desktop Styles - Show desktop header, hide mobile */
        @media (min-width: 769px) {
          .mobile-header-top {
            display: none !important;
          }

          .mobile-search-bar {
            display: none !important;
          }

          .mobile-menu-overlay,
          .mobile-menu-sidebar {
            display: none !important;
          }

          .desktop-header {
            display: block !important;
          }

          .mobile-category-nav {
            display: block;
            padding: 4px 12px;
            background: #f5a855;
            overflow-x: auto;
            white-space: nowrap;
          }
        }

        .desktop-header {
          display: none;
        }

        .basket-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #dc2626;
          color: #fff;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          border: 2px solid #fc5e03;
        }

        /* Remove any white background from logo */
        .mobile-logo img,
        .mobile-menu-header img,
        img[alt="Generic Wholesale"] {
          background: transparent !important;
          background-color: transparent !important;
        }

        /* Tablet Adjustments */
        @media (min-width: 577px) and (max-width: 768px) {
          .mobile-logo img {
            height: 54px;
            max-width: 300px;
          }

          .mobile-search-input {
            font-size: 14px;
            padding: 10px 14px 10px 40px;
          }

          .desktop-header img[alt="Generic Wholesale"] {
            height: 58px;
            max-width: none;
            width: auto;
          }
        }

        /* Desktop/Laptop logo size - Main screens (Most Important) */
        @media (min-width: 769px) {
          .desktop-header {
            display: block !important;
          }

          .mobile-header-top,
          .mobile-search-bar {
            display: none !important;
          }

          .desktop-header img[alt="Generic Wholesale"] {
            width: auto;
            height: 55px;
            object-fit: contain;
          }
        }

        /* Large Desktop - Wider */
        @media (min-width: 1200px) {
          .desktop-header img[alt="Generic Wholesale"] {
            width: auto;
            height: 60px;
            object-fit: contain;
          }
        }

        /* Extra Large Desktop - Maximum Width */
        @media (min-width: 1600px) {
          .desktop-header img[alt="Generic Wholesale"] {
            width: auto;
            height: 65px;
            object-fit: contain;
          }
        }
      `}</style>

      <header className="mobile-header">
        {/* Mobile Header Top */}
        <div className="mobile-header-top">
          <button className="mobile-menu-btn" onClick={() => setShowMobileMenu(true)}>
            <i className="fas fa-bars"></i>
          </button>

          <Link to="/" className="mobile-logo" style={{overflow: 'visible', paddingRight: '25px'}}>
            <div style={{
              position: 'relative',
              display: 'inline-block',
              lineHeight: '1'
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#fff',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                letterSpacing: '-0.5px'
              }}>
                Generic Wholesale
              </span>
              <span style={{
                position: 'absolute',
                top: '11px',
                right: '-20px',
                fontSize: '8px',
                fontWeight: '600',
                color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                letterSpacing: '0px',
                whiteSpace: 'nowrap'
              }}>
                .co.uk
              </span>
            </div>
          </Link>

          <div className="mobile-header-icons">
            <div style={{ position: 'relative' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                cursor: 'pointer',
                padding: '4px 6px',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '4px'
              }}>
                <img 
                  src="https://flagcdn.com/w40/gb.png"
                  alt="GBP"
                  style={{ width: '24px', height: '18px', objectFit: 'cover', borderRadius: '2px' }}
                />
                <i className="fas fa-chevron-down" style={{ fontSize: '8px', color: '#fff' }}></i>
              </div>
              <select 
                value="GBP"
                onChange={(e) => setCurrency(e.target.value)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              >
                <option value="GBP" style={{color: '#000'}}>GBP</option>
              </select>
            </div>

            <Link to="/basket" className="mobile-icon-btn">
              <i className="fas fa-shopping-basket"></i>
              {getBasketCount() > 0 && (
                <span className="basket-badge">{getBasketCount()}</span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="mobile-search-bar">
          <form onSubmit={handleSearch} className="mobile-search-form">
            <i className="fas fa-search mobile-search-icon"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="mobile-search-input"
            />
          </form>
        </div>

        {/* Desktop Header (Original) */}
        <div className="desktop-header">
          <div style={{
            padding: '2px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#fc5e03',
            borderBottom: '1px solid #d33f12'
          }}>
            <Link to="/" style={{
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginRight: '35px',
              overflow: 'visible'
            }}>
              <div style={{
                position: 'relative',
                display: 'inline-block',
                lineHeight: '1'
              }}>
                <span style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  color: '#fff',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  letterSpacing: '-0.5px'
                }}>
                  Generic Wholesale
                </span>
                <span style={{
                  position: 'absolute',
                  top: '12px',
                  right: '-22px',
                  fontSize: '9px',
                  fontWeight: '600',
                  color: '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  letterSpacing: '0px',
                  whiteSpace: 'nowrap'
                }}>
                  .co.uk
                </span>
              </div>
            </Link>

            <form onSubmit={handleSearch} style={{
              flex: 1,
              maxWidth: '800px',
              position: 'relative'
            }}>
              <i className="fas fa-search" style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#999',
                fontSize: '11px'
              }}></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name, category, or keywords..."
                style={{
                  width: '100%',
                  padding: '4px 32px 4px 32px',
                  border: '1px solid #fff',
                  borderRadius: '4px',
                  fontSize: '11px',
                  outline: 'none'
                }}
              />
              <i className="fas fa-search" style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#999',
                fontSize: '11px',
                pointerEvents: 'none'
              }}></i>
            </form>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px'
            }}>
              <div style={{ position: 'relative' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '4px'
                }}>
                  <img 
                    src="https://flagcdn.com/w40/gb.png"
                    alt="GBP"
                    style={{ width: '28px', height: '20px', objectFit: 'cover', borderRadius: '2px' }}
                  />
                  <i className="fas fa-chevron-down" style={{ fontSize: '9px', color: '#fff' }}></i>
                </div>
                <select 
                  value="GBP"
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                >
                  <option value="GBP">GBP</option>
                </select>
              </div>

              {!userInfo ? (
                <>
                  <Link to="/login/buyer" style={{
                    fontSize: '10px',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: '600',
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '4px',
                    padding: '4px 10px'
                  }}>
                    <i className="fas fa-user"></i> Login
                  </Link>
                  <Link to="/register/buyer" style={{
                    fontSize: '10px',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: '600',
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '4px',
                    padding: '4px 10px'
                  }}>
                    <i className="fas fa-user-plus"></i> Register
                  </Link>
                </>
              ) : (
                <div style={{ position: 'relative' }} ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    style={{
                      fontSize: '10px',
                      color: '#fff',
                      background: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '4px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: '4px 10px'
                    }}
                  >
                    <i className="fas fa-user-circle"></i> {userInfo.type}
                  </button>
                  {showUserMenu && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      marginTop: '4px',
                      minWidth: '140px',
                      zIndex: 1000
                    }}>
                      <Link 
                        to={isAdminLoggedIn ? '/admin/dashboard' : isBuyerLoggedIn ? '/buyer/dashboard' : '/seller/dashboard'} 
                        style={{
                          display: 'block',
                          padding: '8px 12px',
                          fontSize: '11px',
                          color: '#111',
                          textDecoration: 'none',
                          borderBottom: '1px solid #e5e7eb'
                        }}
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          fontSize: '11px',
                          color: '#dc2626',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}

              <Link to="/about-us" style={{
                fontSize: '10px',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: '600',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '4px',
                padding: '4px 10px'
              }}>
                <i className="fas fa-info-circle"></i> About
              </Link>

              <Link to="/basket" style={{
                position: 'relative',
                fontSize: '14px',
                color: '#fff',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '50%'
              }}>
                <i className="fas fa-shopping-basket"></i>
                {getBasketCount() > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '-3px',
                    background: '#dc2626',
                    color: '#fff',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                    fontWeight: '700',
                    border: '2px solid #fc5e03'
                  }}>
                    {getBasketCount()}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Category Navigation */}
        <div className="mobile-category-nav">
          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            {categories.map(cat => (
              <Link
                key={cat.value}
                to={cat.value === 'all' ? '/' : `/?cat=${cat.value}`}
                style={{
                  fontSize: '10px',
                  color: '#111',
                  textDecoration: 'none',
                  fontWeight: '600',
                  padding: '2px 0',
                  borderBottom: '2px solid transparent'
                }}
              >
                {cat.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <div 
          className={`mobile-menu-overlay ${showMobileMenu ? 'active' : ''}`}
          onClick={() => setShowMobileMenu(false)}
        ></div>

        {/* Mobile Menu Sidebar */}
        <div className={`mobile-menu-sidebar ${showMobileMenu ? 'active' : ''}`}>
          <div className="mobile-menu-header" style={{overflow: 'visible'}}>
            <div style={{
              position: 'relative',
              display: 'inline-block',
              lineHeight: '1',
              paddingRight: '25px'
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#fff',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                letterSpacing: '-0.5px'
              }}>
                Generic Wholesale
              </span>
              <span style={{
                position: 'absolute',
                top: '11px',
                right: '-20px',
                fontSize: '8px',
                fontWeight: '600',
                color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                letterSpacing: '0px',
                whiteSpace: 'nowrap'
              }}>
                .co.uk
              </span>
            </div>
            <button className="mobile-menu-close" onClick={() => setShowMobileMenu(false)}>
              ×
            </button>
          </div>

          {/* User Section */}
          <div className="mobile-menu-section">
            {!userInfo ? (
              <>
                <Link to="/login/buyer" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
                  <i className="fas fa-user"></i> Buyer Login
                </Link>
                <Link to="/login/supplier" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
                  <i className="fas fa-store"></i> Supplier Login
                </Link>
                <Link to="/admin/login" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
                  <i className="fas fa-user-shield"></i> Admin Login
                </Link>
                <Link to="/register/buyer" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
                  <i className="fas fa-user-plus"></i> Register
                </Link>
              </>
            ) : (
              <>
                <div style={{ padding: '10px 12px', background: '#f3f4f6', borderRadius: '4px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>Logged in as</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#111' }}>{userInfo.type}</div>
                </div>
                <Link 
                  to={isAdminLoggedIn ? '/admin/dashboard' : isBuyerLoggedIn ? '/buyer/dashboard' : '/seller/dashboard'} 
                  className="mobile-menu-item"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <i className="fas fa-tachometer-alt"></i> Dashboard
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setShowMobileMenu(false);
                  }}
                  className="mobile-menu-item"
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                >
                  <i className="fas fa-sign-out-alt"></i> Logout
                </button>
              </>
            )}
          </div>

          {/* Categories */}
          <div className="mobile-menu-section">
            <div className="mobile-menu-title">Categories</div>
            {categories.map(cat => (
              <Link
                key={cat.value}
                to={cat.value === 'all' ? '/' : `/?cat=${cat.value}`}
                className="mobile-menu-item"
                onClick={() => setShowMobileMenu(false)}
              >
                {cat.label}
              </Link>
            ))}
          </div>

          {/* Quick Links */}
          <div className="mobile-menu-section">
            <div className="mobile-menu-title">Quick Links</div>
            <Link to="/" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
              <i className="fas fa-home"></i> Home
            </Link>
            <Link to="/about-us" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
              <i className="fas fa-info-circle"></i> About Us
            </Link>
            <Link to="/basket" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
              <i className="fas fa-shopping-basket"></i> Basket
            </Link>
            <Link to="/help-center" className="mobile-menu-item" onClick={() => setShowMobileMenu(false)}>
              <i className="fas fa-question-circle"></i> Help Center
            </Link>
          </div>
        </div>
      </header>
    </>
  );
};

export default MobileHeader;
