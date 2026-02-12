import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBasket } from '../context/BasketContext'
import { useCurrency } from '../context/CurrencyContext'
import { getImageUrl } from '../utils/imageImports'
import { optimizeImageUrl } from '../utils/imageOptimization'
import MobileImage from '../components/MobileImage'
import ScrollToTop from '../components/ScrollToTop'

const Basket = () => {
  const navigate = useNavigate()
  const { basket, userType, removeFromBasket, updateQuantity, clearBasket, getBasketTotal } = useBasket()
  const { formatPrice, currency } = useCurrency()
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const getUserTypeLabel = () => {
    switch (userType) {
      case 'admin': return 'Admin'
      case 'seller': return 'Seller'
      case 'buyer': return 'Buyer'
      default: return 'Guest'
    }
  }

  const handleCheckout = () => {
    if (basket.length === 0) {
      alert('Your basket is empty')
      return
    }
    alert('Checkout functionality coming soon!')
  }

  const totalItems = basket.reduce((sum, item) => sum + (item.quantity || 1), 0)

  if (basket.length === 0) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <i className="fas fa-shopping-basket" style={{ fontSize: '80px', color: '#d1d5db', marginBottom: '20px' }}></i>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '10px', color: '#111' }}>Your Basket is Empty</h2>
          <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
            Start adding products to your basket to see them here
          </p>
          <Link 
            to="/" 
            style={{
              display: 'inline-block',
              padding: '12px 30px',
              background: '#ff9900',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            Continue Shopping
          </Link>
        </div>
        <ScrollToTop />
      </div>
    )
  }

  return (
    <div style={{ background: '#f3f4f6', minHeight: '100vh', paddingBottom: '40px' }}>
      {/* Amazon-style Header with Basket Icon */}
      <div style={{ 
        background: '#ffffff', 
        borderBottom: '1px solid #e5e7eb',
        padding: '20px 40px',
        marginBottom: '20px'
      }}>
        <div style={{ maxWidth: '1500px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Basket Icon with Count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <i className="fas fa-shopping-basket" style={{ fontSize: '32px', color: '#232f3e' }}></i>
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: '#ff9900',
                color: '#fff',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '700',
                border: '2px solid #fff'
              }}>
                {totalItems}
              </span>
            </div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: '#232f3e' }}>
                Shopping Cart
              </h1>
              <button
                onClick={() => setShowClearConfirm(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007185',
                  fontSize: '13px',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                Deselect all items
              </button>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#565959' }}>
            Price
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1500px', margin: '0 auto', padding: '0 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 992 ? '1fr' : '2fr 1fr', gap: '30px', alignItems: 'start' }}>
          
          {/* Left: Cart Items */}
          <div>
            {basket.map((item, index) => (
              <div 
                key={item.id}
                style={{
                  background: '#ffffff',
                  padding: '20px',
                  marginBottom: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd'
                }}
              >
                <div style={{ display: 'flex', gap: '20px' }}>
                  {/* Checkbox */}
                  <input 
                    type="checkbox" 
                    defaultChecked 
                    style={{ 
                      width: '18px', 
                      height: '18px', 
                      cursor: 'pointer',
                      accentColor: '#ff9900',
                      marginTop: '5px'
                    }} 
                  />

                  {/* Product Image */}
                  <div 
                    onClick={() => {
                      const params = new URLSearchParams({
                        name: item.name,
                        img: item.image,
                        price: item.price.replace(/[£$₨]/g, ''),
                        rating: item.rating || 4.5,
                        reviews: item.reviews || 0,
                        category: item.category || 'General',
                        brand: item.brand || '',
                        discount: item.discount || 0
                      })
                      navigate(`/product/${item.id}?${params.toString()}`)
                    }}
                    style={{
                      width: '140px',
                      height: '140px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#fff',
                      cursor: 'pointer',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      padding: '8px'
                    }}
                  >
                    {item.image ? (
                      <MobileImage
                        src={item.image}
                        alt={item.name}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <img 
                        src="https://via.placeholder.com/140x140?text=No+Image"
                        alt="No image available"
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    )}
                  </div>

                  {/* Product Details */}
                  <div style={{ flex: 1 }}>
                    <h3 
                      onClick={() => {
                        const params = new URLSearchParams({
                          name: item.name,
                          img: item.image,
                          price: item.price.replace(/[£$₨]/g, ''),
                          rating: item.rating || 4.5,
                          reviews: item.reviews || 0,
                          category: item.category || 'General',
                          brand: item.brand || '',
                          discount: item.discount || 0
                        })
                        navigate(`/product/${item.id}?${params.toString()}`)
                      }}
                      style={{ 
                        fontSize: '16px', 
                        fontWeight: '400', 
                        color: '#007185', 
                        margin: '0 0 8px 0',
                        cursor: 'pointer',
                        lineHeight: '1.4'
                      }}
                    >
                      {item.name}
                    </h3>

                    {item.stock && item.stock < 10 && (
                      <p style={{ color: '#B12704', fontSize: '12px', margin: '4px 0' }}>
                        Only {item.stock} left in stock.
                      </p>
                    )}

                    {item.category && (
                      <p style={{ color: '#565959', fontSize: '12px', margin: '4px 0' }}>
                        Category: {item.category}
                      </p>
                    )}

                    {/* Gift checkbox */}
                    <div style={{ margin: '12px 0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#565959', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ width: '14px', height: '14px' }} />
                        This will be a gift <span style={{ color: '#007185', textDecoration: 'underline' }}>Learn more</span>
                      </label>
                    </div>

                    {/* Item Package Quantity */}
                    <div style={{ margin: '8px 0' }}>
                      <span style={{ fontSize: '12px', color: '#565959' }}>
                        Item Package Quantity: <strong>1</strong>
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                      {/* Quantity Selector */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        background: '#f0f2f2',
                        borderRadius: '8px',
                        border: '1px solid #d5d9d9',
                        overflow: 'hidden'
                      }}>
                        <button
                          onClick={() => updateQuantity(item.id, Math.max(1, (item.quantity || 1) - 1))}
                          style={{
                            padding: '8px 12px',
                            background: '#f0f2f2',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            color: '#0f1111'
                          }}
                        >
                          −
                        </button>
                        <span style={{ 
                          padding: '8px 16px', 
                          fontSize: '14px', 
                          fontWeight: '600',
                          background: '#fff',
                          minWidth: '50px',
                          textAlign: 'center'
                        }}>
                          {item.quantity || 1}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                          style={{
                            padding: '8px 12px',
                            background: '#f0f2f2',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '16px',
                            color: '#0f1111'
                          }}
                        >
                          +
                        </button>
                      </div>

                      <span style={{ color: '#d5d9d9' }}>|</span>

                      <button
                        onClick={() => removeFromBasket(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#007185',
                          fontSize: '12px',
                          cursor: 'pointer',
                          textDecoration: 'none',
                          padding: 0
                        }}
                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                      >
                        Delete
                      </button>

                      <span style={{ color: '#d5d9d9' }}>|</span>

                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#007185',
                          fontSize: '12px',
                          cursor: 'pointer',
                          textDecoration: 'none',
                          padding: 0
                        }}
                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                      >
                        Save for later
                      </button>

                      <span style={{ color: '#d5d9d9' }}>|</span>

                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#007185',
                          fontSize: '12px',
                          cursor: 'pointer',
                          textDecoration: 'none',
                          padding: 0
                        }}
                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                      >
                        See more like this
                      </button>

                      <span style={{ color: '#d5d9d9' }}>|</span>

                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#007185',
                          fontSize: '12px',
                          cursor: 'pointer',
                          textDecoration: 'none',
                          padding: 0
                        }}
                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                      >
                        Share
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: '700', 
                    color: '#0f1111',
                    minWidth: '100px',
                    textAlign: 'right'
                  }}>
                    {(() => {
                      if (typeof item.price === 'string' && item.price.includes('£') && currency === 'GBP') {
                        return item.price;
                      }
                      return formatPrice(item.price);
                    })()}
                  </div>
                </div>
              </div>
            ))}

            {/* Subtotal at bottom */}
            <div style={{ 
              textAlign: 'right', 
              fontSize: '18px', 
              padding: '20px',
              background: '#fff',
              borderRadius: '8px',
              border: '1px solid #ddd'
            }}>
              <span style={{ color: '#0f1111' }}>
                Subtotal ({totalItems} items): 
              </span>
              <span style={{ fontWeight: '700', color: '#0f1111', marginLeft: '8px' }}>
                {(() => {
                  const total = getBasketTotal();
                  return currency === 'GBP' ? `£${total.toFixed(2)}` : formatPrice(total.toFixed(2));
                })()}
              </span>
            </div>
          </div>

          {/* Right: Sticky Sidebar */}
          <div style={{ position: 'sticky', top: '20px' }}>
            <div style={{
              background: '#ffffff',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px'
            }}>
              {/* Subtotal */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '18px', color: '#0f1111', marginBottom: '4px' }}>
                  <span>Subtotal ({totalItems} items): </span>
                  <span style={{ fontWeight: '700' }}>
                    {(() => {
                      const total = getBasketTotal();
                      return currency === 'GBP' ? `£${total.toFixed(2)}` : formatPrice(total.toFixed(2));
                    })()}
                  </span>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#565959', cursor: 'pointer', marginTop: '8px' }}>
                  <input type="checkbox" style={{ width: '14px', height: '14px' }} />
                  This order contains a gift
                </label>
              </div>

              {/* Proceed to Checkout Button */}
              <button
                onClick={handleCheckout}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#ffd814',
                  color: '#0f1111',
                  border: '1px solid #fcd200',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '12px',
                  boxShadow: '0 2px 5px rgba(213, 217, 217, 0.5)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f7ca00'
                  e.target.style.borderColor = '#f2c200'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ffd814'
                  e.target.style.borderColor = '#fcd200'
                }}
              >
                Proceed to checkout
              </button>
            </div>

            {/* Customers who shopped section */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px',
              marginTop: '20px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#0f1111' }}>
                Customers who shopped for items in your cart also shopped for:
              </h3>
              <div style={{ fontSize: '13px', color: '#565959' }}>
                <p>Related products will appear here</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div 
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div 
            style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px', color: '#0f1111' }}>
              Clear Basket?
            </h3>
            <p style={{ fontSize: '14px', color: '#565959', marginBottom: '20px' }}>
              Are you sure you want to remove all items from your basket?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowClearConfirm(false)}
                style={{
                  padding: '8px 16px',
                  background: '#fff',
                  border: '1px solid #d5d9d9',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  color: '#0f1111'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  clearBasket()
                  setShowClearConfirm(false)
                }}
                style={{
                  padding: '8px 16px',
                  background: '#ffd814',
                  border: '1px solid #fcd200',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  color: '#0f1111'
                }}
              >
                Clear Basket
              </button>
            </div>
          </div>
        </div>
      )}

      <ScrollToTop />
    </div>
  )
}

export default Basket
