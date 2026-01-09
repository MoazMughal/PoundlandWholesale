import { Link } from 'react-router-dom'
import { getImageUrl } from '../utils/imageImports'

const ProductCard = ({ product }) => {
  // Use the centralized image utility
  const getImageSrc = (imagePath) => {
    return getImageUrl(imagePath)
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
        <img 
          src={getImageSrc(product.image)} 
          alt={product.name}
          className="product-image"
        />
      </div>
      
      <div className="card-body">
        <h5 className="card-title">{product.name}</h5>
        
        <div className="rating">
          {renderStars(product.rating)}
          <span className="rating-count">({product.reviews})</span>
        </div>
        
        <div className="price">
          {product.price}
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
          <Link 
            to={`/product/${product.id}`} 
            className="btn btn-primary btn-sm"
          >
            View Details
          </Link>
          <button className="btn btn-outline-primary btn-sm">
            <i className="fas fa-heart"></i>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductCard
