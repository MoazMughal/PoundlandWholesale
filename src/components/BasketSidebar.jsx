import { useNavigate } from 'react-router-dom'
import { useBasket } from '../context/BasketContext'
import { useCurrency } from '../context/CurrencyContext'
import { getImageUrl } from '../utils/imageImports'

const BasketSidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const { basket, removeFromBasket, updateQuantity, getTotalPrice, showAddedNotification, cancelAutoClose, resumeAutoClose } = useBasket()
  const { formatPrice } = useCurrency()

  const handleCheckout = () => {
    onClose()
    navigate('/basket')
  }

  return (
    <>
      {/* Animation styles */}
      <style>
        {`
          @keyframes slideDown {
            from {
              transform: translateY(-100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>
      {/* Overlay */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9998,
            transition: 'opacity 0.3s ease',
            opacity: isOpen ? 1 : 0
          }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        onMouseEnter={cancelAutoClose}
        onMouseLeave={resumeAutoClose}
        style={{
          position: 'fixed',
          top: 0,
          right: isOpen ? 0 : '-400px',
          width: '100%',
          maxWidth: '400px',
          height: '100vh',
          backgroundColor: '#ffffff',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '2px solid #e5e7eb',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative'
          }}
        >
          {/* Added to Basket Notification */}
          {showAddedNotification && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                right: '0',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.875rem',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                animation: 'slideDown 0.3s ease-out',
                zIndex: 10000
              }}
            >
              <i className="fas fa-check-circle" style={{ fontSize: '1.25rem' }}></i>
              <span>Added to basket!</span>
            </div>
          )}
          
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'white' }}>
              <i className="fas fa-shopping-basket me-2"></i>
              Your Basket
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', opacity: 0.9, color: 'white' }}>
              {basket.length} {basket.length === 1 ? 'item' : 'items'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: 'white',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.3)'
              e.target.style.transform = 'scale(1.1)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)'
              e.target.style.transform = 'scale(1)'
            }}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Basket Items */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px'
          }}
        >
          {basket.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#6b7280'
              }}
            >
              <i className="fas fa-shopping-basket" style={{ fontSize: '4rem', marginBottom: '16px', opacity: 0.3 }}></i>
              <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>Your basket is empty</p>
              <p style={{ fontSize: '0.875rem' }}>Add some products to get started!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {basket.map((item) => (
                <div
                  key={item.id || item._id}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: '#ffffff',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
                    e.currentTarget.style.borderColor = '#667eea'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.borderColor = '#e5e7eb'
                  }}
                >
                  {/* Product Image */}
                  <img
                    src={getImageUrl(item.image || item.images?.[0])}
                    alt={item.name}
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'contain',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      padding: '4px',
                      background: '#f9fafb'
                    }}
                  />

                  {/* Product Details */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#1f2937',
                        lineHeight: '1.3',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {item.name}
                    </h4>

                    <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#667eea' }}>
                      {formatPrice(item.price)}
                    </div>

                    {/* Quantity Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={() => updateQuantity(item.id || item._id, Math.max(1, (item.quantity || 1) - 1))}
                          style={{
                            width: '24px',
                            height: '24px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            background: '#ffffff',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#f3f4f6'
                            e.target.style.borderColor = '#667eea'
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#ffffff'
                            e.target.style.borderColor = '#d1d5db'
                          }}
                        >
                          <i className="fas fa-minus"></i>
                        </button>
                        <span
                          style={{
                            minWidth: '32px',
                            textAlign: 'center',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#1f2937'
                          }}
                        >
                          {item.quantity || 1}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id || item._id, (item.quantity || 1) + 1)}
                          style={{
                            width: '24px',
                            height: '24px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            background: '#ffffff',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#f3f4f6'
                            e.target.style.borderColor = '#667eea'
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#ffffff'
                            e.target.style.borderColor = '#d1d5db'
                          }}
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromBasket(item.id || item._id)}
                        style={{
                          marginLeft: 'auto',
                          padding: '4px 8px',
                          border: 'none',
                          borderRadius: '4px',
                          background: '#fee2e2',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#fecaca'
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = '#fee2e2'
                        }}
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {basket.length > 0 && (
          <div
            style={{
              padding: '20px',
              borderTop: '2px solid #e5e7eb',
              background: '#f9fafb'
            }}
          >
            {/* Total */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                padding: '12px',
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}
            >
              <span style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>Total:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#667eea' }}>
                {formatPrice(getTotalPrice())}
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleCheckout}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}
              >
                <i className="fas fa-shopping-cart me-2"></i>
                View Full Basket & Checkout
              </button>

              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#ffffff',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f3f4f6'
                  e.target.style.borderColor = '#9ca3af'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ffffff'
                  e.target.style.borderColor = '#d1d5db'
                }}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default BasketSidebar
