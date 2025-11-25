import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBasket } from '../context/BasketContext'
import { useCurrency } from '../context/CurrencyContext'
import ScrollToTop from '../components/ScrollToTop'

const Basket = () => {
  const navigate = useNavigate()
  const { basket, userType, removeFromBasket, updateQuantity, clearBasket, getBasketTotal } = useBasket()
  const { formatPrice } = useCurrency()
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
              borderRadius: '6px',
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
    <div style={{ minHeight: '60vh', padding: '20px 15px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '10px', color: '#111' }}>
          <i className="fas fa-shopping-basket"></i> Shopping Basket
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <span style={{ 
            padding: '4px 12px', 
            background: '#667eea', 
            color: '#fff', 
            borderRadius: '20px', 
            fontSize: '12px', 
            fontWeight: '600' 
          }}>
            {getUserTypeLabel()} Basket
          </span>
          <span style={{ color: '#6b7280', fontSize: '14px' }}>
            {basket.length} {basket.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 350px', gap: '20px' }}>
        {/* Basket Items */}
        <div>
          {basket.map((item) => (
            <div 
              key={item.id}
              style={{
                display: 'flex',
                gap: '15px',
                padding: '15px',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                marginBottom: '15px'
              }}
            >
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
                  width: '100px',
                  height: '100px',
                  flexShrink: 0,
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                <img 
                  src={item.image} 
                  alt={item.name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>

              {/* Product Details */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#111', 
                    margin: 0,
                    cursor: 'pointer',
                    lineHeight: '1.4'
                  }}
                >
                  {item.name}
                </h3>

                <div style={{ fontSize: '18px', fontWeight: '800', color: '#10b981' }}>
                  {formatPrice(item.price)}
                </div>

                {/* Quantity Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden' }}>
                    <button
                      onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                      style={{
                        padding: '6px 12px',
                        background: '#f3f4f6',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      -
                    </button>
                    <span style={{ padding: '6px 15px', fontSize: '14px', fontWeight: '600' }}>
                      {item.quantity || 1}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                      style={{
                        padding: '6px 12px',
                        background: '#f3f4f6',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromBasket(item.id)}
                    style={{
                      padding: '6px 12px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    <i className="fas fa-trash"></i> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Clear Basket Button */}
          <button
            onClick={() => setShowClearConfirm(true)}
            style={{
              padding: '10px 20px',
              background: '#fff',
              color: '#dc2626',
              border: '1px solid #dc2626',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              marginTop: '10px'
            }}
          >
            <i className="fas fa-trash-alt"></i> Clear Basket
          </button>
        </div>

        {/* Order Summary */}
        <div>
          <div style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '20px',
            position: 'sticky',
            top: '80px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '15px', color: '#111' }}>
              Order Summary
            </h3>

            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span style={{ color: '#6b7280' }}>Subtotal ({basket.reduce((sum, item) => sum + (item.quantity || 1), 0)} items)</span>
                <span style={{ fontWeight: '600' }}>{formatPrice(getBasketTotal().toFixed(2))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                <span style={{ color: '#6b7280' }}>Shipping</span>
                <span style={{ fontWeight: '600', color: '#10b981' }}>FREE</span>
              </div>
              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px' }}>
                  <span style={{ fontWeight: '700' }}>Total</span>
                  <span style={{ fontWeight: '800', color: '#10b981' }}>{formatPrice(getBasketTotal().toFixed(2))}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              style={{
                width: '100%',
                padding: '12px',
                background: '#ff9900',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                marginBottom: '10px'
              }}
            >
              Proceed to Checkout
            </button>

            <Link
              to="/"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '10px',
                color: '#667eea',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div 
          className="modal show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div 
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Clear Basket?</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowClearConfirm(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to remove all items from your basket?</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowClearConfirm(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger"
                  onClick={() => {
                    clearBasket()
                    setShowClearConfirm(false)
                  }}
                >
                  Clear Basket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ScrollToTop />
    </div>
  )
}

export default Basket
