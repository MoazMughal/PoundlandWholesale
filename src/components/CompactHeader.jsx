import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { useSeller } from '../context/SellerContext';
import { useBuyer } from '../context/BuyerContext';
import { useCurrency } from '../context/CurrencyContext';
import { useBasket } from '../context/BasketContext';
import CurrencySelector from './CurrencySelector';
import { getApiUrl } from '../utils/api';
import useAlgoliaSearch from '../hooks/useAlgoliaSearch';

import '../styles/mobile-header.css';

const CompactHeader = () => {
  const navigate = useNavigate();
  const { isLoggedIn: isSellerLoggedIn, logout: sellerLogout } = useSeller();
  const { currency, setCurrency } = useCurrency();
  const { getBasketCount } = useBasket();
  const [searchQuery, setSearchQuery] = useState('');
  const [showLoginMenu, setShowLoginMenu] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef(null);
  const { suggestions, searchAlgolia, clearSuggestions, isSearching } = useAlgoliaSearch();
  const isBuyerLoggedIn = !!localStorage.getItem('buyerToken');
  const isAdminLoggedIn = !!localStorage.getItem('adminToken');
  const loginMenuRef = useRef(null);

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

  const [categories, setCategories] = useState([
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
    // Note: Excel categories (UAE Products, UK Products, Amazon10) are intentionally excluded
  ]);
  const [hierarchy, setHierarchy] = useState({}); // { "Automotive": ["Car Bulb", "Car Accessories"] }
  // Fetch dynamic categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Add cache buster to ensure fresh data
        const cacheBuster = `_t=${Date.now()}`;
        const response = await fetch(getApiUrl(`products/public/categories?${cacheBuster}`), {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (response.ok) {
          const data = await response.json();
          
          // Filter out Excel categories explicitly (double check)
          const filteredCategories = data.categories.filter(cat => 
            !['UAE Products', 'UK Products', 'Amazon10'].includes(cat.value)
          );
          
          // Get hidden categories from localStorage
          const hiddenCategories = JSON.parse(localStorage.getItem('hiddenCategories') || '[]');
          
          // Filter out hidden categories
          const visibleCategories = filteredCategories.filter(cat => 
            !hiddenCategories.includes(cat.value)
          );
          
          // Use categories from API (which already includes "All" at the beginning)
          setCategories(visibleCategories);
        }
      } catch (error) {
        console.error('Error fetching categories for header:', error);
        // Keep default categories if API fails
      }
    };

    fetchCategories();

    // Fetch category hierarchy for dropdowns
    const fetchHierarchy = () => {
      fetch(getApiUrl('products/public/category-hierarchy'))
        .then(r => r.ok ? r.json() : { hierarchy: [] })
        .then(d => {
          const map = {};
          (d.hierarchy || []).forEach(h => { map[h.parent] = h.children; });
          console.log('[Header] hierarchy loaded:', map);
          setHierarchy(map);
        })
        .catch(e => console.warn('Hierarchy fetch failed:', e));
    };
    fetchHierarchy();

    // Listen for category refresh events
    const handleCategoryRefresh = () => {
      console.log('🔄 Refreshing header categories...');
      fetchCategories();
    };

    // Listen for custom event to refresh categories
    window.addEventListener('refreshCategories', handleCategoryRefresh);
    
    // Listen for storage events (when localStorage changes)
    window.addEventListener('storage', (e) => {
      if (e.key === 'categoriesUpdated') {
        handleCategoryRefresh();
        // Clear the flag
        localStorage.removeItem('categoriesUpdated');
      }
    });

    // Also listen for focus events to refresh categories when returning to the page
    window.addEventListener('focus', () => {
      const lastUpdate = localStorage.getItem('categoriesUpdated');
      if (lastUpdate) {
        const timeDiff = Date.now() - parseInt(lastUpdate);
        if (timeDiff < 30000) { // If updated within last 30 seconds
          handleCategoryRefresh();
          localStorage.removeItem('categoriesUpdated');
        }
      }
    });

    // Cleanup event listeners
    return () => {
      window.removeEventListener('refreshCategories', handleCategoryRefresh);
      window.removeEventListener('storage', handleCategoryRefresh);
      window.removeEventListener('focus', handleCategoryRefresh);
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      clearSuggestions();
      setShowSuggestions(false);
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    clearSuggestions();
    setShowSuggestions(false);
    navigate(`/?search=${encodeURIComponent(suggestion)}`);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

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

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="header-search-form" style={{
          flex: 1,
          maxWidth: '700px',
          display: 'flex',
          gap: '6px'
        }}>
          <div ref={searchContainerRef} style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            alignItems: 'center'
          }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchAlgolia(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => searchQuery.trim() && setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setShowSuggestions(false); clearSuggestions(); }
              }}
              placeholder="Search products..."
              style={{
                width: '100%',
                padding: '6px 35px 6px 10px',
                border: '1px solid #fff',
                borderRadius: '4px',
                fontSize: '12px',
                outline: 'none'
              }}
            />
            <i className="fas fa-search" style={{
              position: 'absolute',
              right: '10px',
              color: '#999',
              fontSize: '12px',
              pointerEvents: 'none'
            }}></i>

            {/* Algolia Suggestions Dropdown */}
            {showSuggestions && (suggestions.length > 0 || isSearching) && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                zIndex: 99999,
                marginTop: '2px',
                overflow: 'hidden'
              }}>
                {isSearching && suggestions.length === 0 && (
                  <div style={{ padding: '10px 14px', fontSize: '12px', color: '#999', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #ff9900', borderTopColor: 'transparent', borderRadius: '50%', animation: 'algolia-spin 0.6s linear infinite' }} />
                    Searching...
                  </div>
                )}
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSuggestionClick(s)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      width: '100%', padding: '9px 14px', border: 'none',
                      background: 'white', cursor: 'pointer', fontSize: '12px',
                      color: '#111', textAlign: 'left', borderBottom: i < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fff7ed'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <i className="fas fa-search" style={{ color: '#ff9900', fontSize: '10px', flexShrink: 0 }} />
                    {s}
                  </button>
                ))}
                <div style={{ padding: '6px 14px', background: '#fafafa', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '9px', color: '#aaa' }}>Powered by</span>
                  <span style={{ fontSize: '9px', fontWeight: '700', color: '#003dff' }}>Algolia</span>
                </div>
              </div>
            )}
          </div>
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
        <style>{`@keyframes algolia-spin { to { transform: rotate(360deg); } }`}</style>

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
                src={
                  currency === 'GBP' ? 'https://flagcdn.com/w40/gb.png' :
                  currency === 'PKR' ? 'https://flagcdn.com/w40/pk.png' :
                  currency === 'USD' ? 'https://flagcdn.com/w40/us.png' :
                  'https://flagcdn.com/w40/ae.png'
                }
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
              <option value="GBP">🇬🇧 GBP</option>
              <option value="PKR">🇵🇰 PKR</option>
              <option value="USD">🇺🇸 USD</option>
              <option value="AED">🇦🇪 AED</option>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* User name → dashboard */}
              <Link
                to={isAdminLoggedIn ? '/admin/dashboard' : isBuyerLoggedIn ? '/buyer/dashboard' : '/seller/dashboard'}
                style={{
                  fontSize: '11px',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: '600',
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '4px',
                  padding: '5px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                <i className="fas fa-user-circle"></i>
                <span className="hide-mobile-text">{userInfo.type}</span>
              </Link>
              {/* Separate logout button */}
              <button
                onClick={handleLogout}
                title="Logout"
                style={{
                  fontSize: '11px',
                  color: '#fff',
                  background: 'rgba(220,38,38,0.7)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '4px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '5px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.9)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(220,38,38,0.7)'}
              >
                <i className="fas fa-sign-out-alt"></i>
                <span className="hide-mobile-text">Logout</span>
              </button>
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
        overflowY: 'visible',
        whiteSpace: 'nowrap',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {categories.map(cat => (
            <CategoryItem
              key={cat.value}
              cat={cat}
              hierarchy={hierarchy}
            />
          ))}
        </div>
      </div>
    </header>
    </>
  );
};

// Self-contained category item with its own hover state
const CategoryItem = ({ cat, hierarchy }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const timerRef = useRef(null);
  const itemRef = useRef(null);
  // Keep a ref to the latest hierarchy so the show handler is never stale
  const hierarchyRef = useRef(hierarchy);
  hierarchyRef.current = hierarchy;

  const children = hierarchy[cat.label] || hierarchy[cat.value] || [];

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const latest = hierarchyRef.current;
    const kids = latest[cat.label] || latest[cat.value] || [];
    console.log(`[Header] hover "${cat.label}" | kids:`, kids, '| hierarchy keys:', Object.keys(latest));
    if (kids.length > 0 && itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 2, left: rect.left });
      setOpen(true);
    }
  };

  const hide = () => {
    timerRef.current = setTimeout(() => setOpen(false), 150);
  };

  const keepOpen = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <>
      <div
        ref={itemRef}
        style={{ display: 'inline-block', flexShrink: 0 }}
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        <Link
          to={cat.value === 'all' ? '/' : `/?cat=${encodeURIComponent(cat.label)}`}
          style={{
            fontSize: '10px', color: '#111', textDecoration: 'none', fontWeight: '600',
            padding: '4px 0', display: 'inline-flex', alignItems: 'center', gap: '3px',
            whiteSpace: 'nowrap', borderBottom: '2px solid transparent'
          }}
          onMouseEnter={e => e.currentTarget.style.borderBottomColor = '#ff9900'}
          onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'transparent'}
        >
          {cat.label}
          {children.length > 0 && <span style={{ fontSize: '7px', opacity: 0.7 }}>▼</span>}
        </Link>
      </div>

      {open && children.length > 0 && createPortal(
        <div
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            background: 'white',
            borderRadius: '8px',
            minWidth: '200px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.2)',
            zIndex: 999999,
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
          }}
          onMouseEnter={keepOpen}
          onMouseLeave={hide}
        >
          <Link
            to={`/?cat=${encodeURIComponent(cat.label)}`}
            onClick={() => setOpen(false)}
            style={{
              display: 'block', padding: '11px 16px', fontSize: '13px',
              color: '#1f2937', textDecoration: 'none', fontWeight: '700',
              borderBottom: '2px solid #f3f4f6', background: '#fafafa'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={e => e.currentTarget.style.background = '#fafafa'}
          >
            All {cat.label}
          </Link>
          {children.map(child => (
            <Link
              key={child}
              to={`/?cat=${encodeURIComponent(child)}`}
              onClick={() => setOpen(false)}
              style={{
                display: 'block', padding: '10px 16px 10px 28px', fontSize: '13px',
                color: '#374151', textDecoration: 'none', borderBottom: '1px solid #f9fafb',
                background: 'white'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fff7ed'; e.currentTarget.style.color = '#c2410c'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#374151'; }}
            >
              ↳ {child}
            </Link>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};

export default CompactHeader;

