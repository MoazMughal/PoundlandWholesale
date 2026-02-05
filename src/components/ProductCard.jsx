import { useNavigate } from 'react-router-dom'
import LazyImage from './LazyImage'
import { getImageUrl } from '../utils/imageImports'

const ProductCard = ({ product }) => {
  const navigate = useNavigate()
  
  // Use the centralized image utility with Cloudinary optimization
  const getImageSrc = (imagePath) => {
    return getImageUrl(imagePath, { width: 300, height: 300, quality: 'auto' })
  }

  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(<i key={i} className="fas fa-star"></i>)
    }

    if (hasHalfStar) {
      stars.push(<i key="half" className="fas fa-star-half-alt"></i>)
    }

    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<i key={`empty-${i}`} className="far fa-star"></i>)
    }

    return stars
  }

  return (
    <div className="product-card">
      <div className="amazon-choice-badge">
        Amazon's Choice
      </div>
      
      <div className="product-image-container">
        <LazyImage
          src={getImageSrc(product.image)}
          alt={product.name}
          className="product-image"
          width={300}
          height={300}
          quality="auto"
          placeholder="https://via.placeholder.com/300x300?text=Loading..."
        />
      </div>
      
      <div className="card-body">
        <h5 className="card-title">{product.name}</h5>
        
        <div className="rating">
          {renderStars(product.rating)}
          <span className="rating-count">({product.reviews})</span>
        </div>
        
        <div className="price">
          {(() => {
            const basePrice = parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
            const shippingCost = parseFloat(product.shipping) || 0;
            const totalPrice = basePrice + shippingCost;
            
            if (shippingCost > 0) {
              return (
                <div>
                  <span className="total-price" style={{ fontWeight: 'bold', color: '#28a745' }}>
                    £{totalPrice.toFixed(2)}
                  </span>
                  <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                    £{basePrice.toFixed(2)} + £{shippingCost.toFixed(2)} shipping
                  </div>
                </div>
              );
            } else {
              return `£${basePrice.toFixed(2)}`;
            }
          })()}
          {product.originalPrice && (
            <span className="text-muted text-decoration-line-through ms-2" style={{fontSize: '0.8rem'}}>
              {product.originalPrice}
            </span>
          )}
        </div>
        
        {product.markup && (
          <div className="markup-badge" style={{
            position: 'static',
            background: '#28a745',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '0.7rem',
            fontWeight: '600',
            display: 'inline-block',
            marginBottom: '8px'
          }}>
            {product.markup}
          </div>
        )}
        
        <div className="product-actions">
          <button 
            className="btn btn-primary btn-sm"
            onClick={(e) => {
              e.preventDefault()
              if (e.ctrlKey || e.metaKey || e.button === 1) {
                // Open in new tab while preserving auth
                window.open(`/product/${product.id}`, '_blank')
              } else {
                // Navigate in current tab
                navigate(`/product/${product.id}`)
              }
            }}
            onMouseDown={(e) => {
              // Handle middle mouse button click
              if (e.button === 1) {
                e.preventDefault()
                window.open(`/product/${product.id}`, '_blank')
              }
            }}
          >
            View Details
          </button>
          <button className="btn btn-outline-primary btn-sm">
            <i className="fas fa-heart"></i>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductCard
