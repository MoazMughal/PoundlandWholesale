import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSeller } from '../context/SellerContext';

const CompactHeader = () => {
  const navigate = useNavigate();
  const { isLoggedIn: isSellerLoggedIn } = useSeller();
  const [searchQuery, setSearchQuery] = useState('');
  const isBuyerLoggedIn = !!localStorage.getItem('buyerToken');

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
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      background: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      {/* Main Header */}
      <div style={{
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        {/* Logo */}
        <Link to="/" style={{
          fontSize: '16px',
          fontWeight: '700',
          color: '#111',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          minWidth: '140px'
        }}>
          Generic Wholesale
        </Link>

        {/* Search Bar */}
        <form onSubmit={handleSearch} style={{
          flex: 1,
          maxWidth: '800px',
          display: 'flex',
          gap: '8px'
        }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '2px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button type="submit" style={{
            padding: '8px 20px',
            background: '#ff9900',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            Search
          </button>
        </form>

        {/* User Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          whiteSpace: 'nowrap'
        }}>
          {!isBuyerLoggedIn && !isSellerLoggedIn ? (
            <>
              <Link to="/login/buyer" style={{
                fontSize: '13px',
                color: '#111',
                textDecoration: 'none',
                fontWeight: '500'
              }}>
                Login
              </Link>
              <Link to="/register/buyer" style={{
                fontSize: '13px',
                color: '#111',
                textDecoration: 'none',
                fontWeight: '500'
              }}>
                Register
              </Link>
            </>
          ) : (
            <Link to={isBuyerLoggedIn ? '/buyer/dashboard' : '/seller/dashboard'} style={{
              fontSize: '13px',
              color: '#111',
              textDecoration: 'none',
              fontWeight: '500'
            }}>
              Dashboard
            </Link>
          )}
          <div style={{
            fontSize: '13px',
            color: '#111',
            fontWeight: '500',
            cursor: 'pointer'
          }}>
            🛒 Basket
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      <div style={{
        padding: '8px 20px',
        background: '#f8f9fa',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        <div style={{
          display: 'flex',
          gap: '15px',
          alignItems: 'center'
        }}>
          {categories.map(cat => (
            <Link
              key={cat.value}
              to={cat.value === 'all' ? '/' : `/?cat=${cat.value}`}
              style={{
                fontSize: '13px',
                color: '#111',
                textDecoration: 'none',
                fontWeight: '500',
                padding: '4px 0',
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
  );
};

export default CompactHeader;
