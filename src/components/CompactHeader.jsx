import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSeller } from '../context/SellerContext';
import { useCurrency } from '../context/CurrencyContext';
import { useBasket } from '../context/BasketContext';
import logo from '../assets/Generic wholesale logo.png';
import '../styles/mobile-header.css';

const CompactHeader = () => {
  const navigate = useNavigate();
  const { isLoggedIn: isSellerLoggedIn, logout: sellerLogout } = useSeller();
  const { currency, setCurrency } = useCurrency();
  const { getBasketCount } = useBasket();
  const [searchQuery, setSearchQuery] = useState('');
  const [showLoginMenu, setShowLoginMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const isBuyerLoggedIn = !!localStorage.getItem('buyerToken');
  const isAdminLoggedIn = !!localStorage.getItem('adminToken');
  const loginMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  // Get user type and name
  const getUserInfo = () => {
    if (isAdminLoggedIn) return { type: 'Admin', name: 'Admin' };
    if (isSellerLoggedIn) return { type: 'Seller', name: 'Seller' };
    if (isBuyerLoggedIn) return { type: 'Buyer', name: 'Buyer' };
    return null;
  };

  const userInfo = getUserInfo();

  // Close dropdown when clicking outside
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
    }
  };

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .header-logo img {
            height: 50px !important;
            width: auto !important;
          }
          .header-search-form {
            max-width: 100% !important;
          }
          .header-actions {
            gap: 8px !important;
          }
          .header-actions > * {
            font-size: 10px !important;
          }
        }
        @media (max-width: 576px) {
          .header-main {
            padding: 6px 8px !important;
            gap: 8px !important;
          }
          .header-logo {
            min-width: 120px !important;
          }
          .header-logo img {
            height: 44px !important;
            width: auto !important;
          }
        }
        @media (min-width: 769px) and (max-width: 1199px) {
          .header-logo img {
            width: auto !important;
            height: 55px !important;
            object-fit: contain !important;
          }
        }
        @media (min-width: 1200px) {
          .header-logo img {
            width: auto !important;
            height: 60px !important;
            object-fit: contain !important;
          }
        }
        @media (min-width: 1600px) {
          .header-logo img {
            width: auto !important;
            height: 65px !important;
            object-fit: contain !important;
          }
        }
      `}</style>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        {/* Main Header */}
        <div className="header-main" style={{
          padding: '2px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: '#ff9900',
          borderBottom: '1px solid #e67e00'
        }}>
        {/* Logo */}
        <Link to="/" className="header-logo" style={{
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginRight: '10px',
          overflow: 'hidden'
        }}>
          <img src={logo} alt="Generic Wholesale" style={{ 
            width: 'auto',
            height: '55px',
            objectFit: 'contain',
            background: 'transparent',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }} />
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="header-search-form" style={{
          flex: 1,
          maxWidth: '700px',
          display: 'flex',
          gap: '6px'
        }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            style={{
              flex: 1,
              padding: '6px 10px',
              border: '1px solid #fff',
              borderRadius: '4px',
              fontSize: '12px',
              outline: 'none'
            }}
          />
          <button type="submit" style={{
            padding: '6px 15px',
            background: '#232f3e',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            Search
          </button>
        </form>

        {/* User Actions */}
        <div className="header-actions" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          whiteSpace: 'nowrap'
        }}>
          {/* Currency Selector */}
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
                src={`https://flagcdn.com/w40/${currency === 'PKR' ? 'pk' : currency === 'USD' ? 'us' : currency === 'GBP' ? 'gb' : 'ae'}.png`}
                alt={currency}
                style={{ width: '28px', height: '20px', objectFit: 'cover', borderRadius: '2px' }}
              />
              <i className="fas fa-chevron-down" style={{ fontSize: '9px', color: '#fff' }}></i>
            </div>
            <select 
              value={currency}
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
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="AED">AED</option>
            </select>
          </div>

          {!userInfo ? (
            <>
              <div ref={loginMenuRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowLoginMenu(!showLoginMenu)}
                  style={{
                    fontSize: '11px',
                    color: '#fff',
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '4px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: '5px 12px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                >
                  <i className="fas fa-user"></i> <span className="hide-mobile-text">Login</span>
                </button>
                {showLoginMenu && (
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
                      to="/login/buyer" 
                      onClick={() => setShowLoginMenu(false)}
                      style={{
                        display: 'block',
                        padding: '8px 12px',
                        fontSize: '11px',
                        color: '#111',
                        textDecoration: 'none',
                        borderBottom: '1px solid #e5e7eb'
                      }}
                    >
                      Buyer Login
                    </Link>
                    <Link 
                      to="/login/supplier" 
                      onClick={() => setShowLoginMenu(false)}
                      style={{
                        display: 'block',
                        padding: '8px 12px',
                        fontSize: '11px',
                        color: '#111',
                        textDecoration: 'none',
                        borderBottom: '1px solid #e5e7eb'
                      }}
                    >
                      Supplier Login
                    </Link>
                    <Link 
                      to="/admin/login" 
                      onClick={() => setShowLoginMenu(false)}
                      style={{
                        display: 'block',
                        padding: '8px 12px',
                        fontSize: '11px',
                        color: '#111',
                        textDecoration: 'none'
                      }}
                    >
                      Admin Login
                    </Link>
                  </div>
                )}
              </div>
              <Link 
                to="/register/buyer" 
                style={{
                  fontSize: '11px',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: '600',
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '4px',
                  padding: '5px 12px',
                  transition: 'all 0.2s',
                  display: 'inline-block'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                <i className="fas fa-user-plus"></i> <span className="hide-mobile-text">Register</span>
              </Link>
            </>
          ) : (
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  fontSize: '11px',
                  color: '#fff',
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '4px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '5px 12px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                <i className="fas fa-user-circle"></i> <span className="hide-mobile-text">{userInfo.type}</span>
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
          
          {/* Basket Button */}
          <Link 
            to="/basket"
            style={{
              position: 'relative',
              fontSize: '11px',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: '600',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '4px',
              padding: '5px 12px',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            <i className="fas fa-shopping-basket"></i> Basket
            {getBasketCount() > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                background: '#dc2626',
                color: '#fff',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: '700',
                border: '2px solid #ff9900'
              }}>
                {getBasketCount()}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Category Navigation */}
      <div style={{
        padding: '4px 12px',
        background: '#ffb84d',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
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
                borderBottom: '2px solid transparent',
                transition: 'border-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.borderBottomColor = '#ff9900'}
              onMouseLeave={(e) => e.target.style.borderBottomColor = 'transparent'}
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
    </>
  );
};

export default CompactHeader;
