import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'

// Import sample images
import noseRingImg from '../assets/main-pics/nose ring.jpg'
import spoonImg from '../assets/main-pics/Spoon.jpg'
import bulbImg from '../assets/main-pics/Light Bulb.jpg'
import watchImg from '../assets/main-pics/Black Watch.jpg'

const Product = () => {
  const { id } = useParams()
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)

  // Mock product data - in real app, this would come from API
  const product = {
    id: parseInt(id),
    name: "Premium Surgical Steel Nose Ring Set - 20 Pieces",
    price: "Rs. 299",
    originalPrice: "Rs. 599",
    discount: "50% OFF",
    images: [noseRingImg, noseRingImg, noseRingImg, noseRingImg],
    rating: 4.5,
    reviews: 128,
    sold: "500+ sold this month",
    markup: "50% Profit Margin",
    description: "High-quality surgical steel nose rings perfect for wholesale and retail. This set includes 20 pieces in various designs including hoops, studs, and decorative pieces.",
    features: [
      "Surgical grade stainless steel",
      "Hypoallergenic and safe for sensitive skin",
      "20 pieces in various designs",
      "Perfect for wholesale business",
      "High profit margin potential",
      "Fast shipping across Pakistan"
    ],
    specifications: {
      "Material": "Surgical Steel 316L",
      "Gauge": "20G (0.8mm)",
      "Diameter": "6mm, 8mm, 10mm",
      "Color": "Silver, Gold, Rose Gold",
      "Package": "20 pieces per set",
      "Origin": "Imported"
    },
    supplier: {
      name: "Premium Jewelry Supplier",
      rating: 4.8,
      location: "Karachi, Pakistan",
      verified: true
    }
  }

  const relatedProducts = [
    {
      id: 2,
      name: "Plastic Spoon Set",
      price: "Rs. 199",
      originalPrice: "Rs. 399",
      image: spoonImg,
      rating: 4.2,
      reviews: 89,
      markup: "45% Profit"
    },
    {
      id: 3,
      name: "LED Light Bulb",
      price: "Rs. 450",
      originalPrice: "Rs. 799",
      image: bulbImg,
      rating: 4.7,
      reviews: 234,
      markup: "40% Profit"
    },
    {
      id: 4,
      name: "Smart Watch",
      price: "Rs. 2,999",
      originalPrice: "Rs. 4,999",
      image: watchImg,
      rating: 4.3,
      reviews: 156,
      markup: "35% Profit"
    }
  ]

  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(<i key={i} className="fas fa-star text-warning"></i>)
    }

    if (hasHalfStar) {
      stars.push(<i key="half" className="fas fa-star-half-alt text-warning"></i>)
    }

    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<i key={`empty-${i}`} className="far fa-star text-warning"></i>)
    }

    return stars
  }

  return (
    <div>
      {/* Breadcrumb */}
      <section className="py-3 bg-light">
        <div className="container">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/">Home</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/categories">Categories</Link>
              </li>
              <li className="breadcrumb-item active">
                {product.name}
              </li>
            </ol>
          </nav>
        </div>
      </section>

      {/* Product Details */}
      <section className="section-padding">
        <div className="container">
          <div className="row">
            {/* Product Images */}
            <div className="col-lg-6 mb-4">
              <div className="product-images">
                <div className="main-image mb-3">
                  <img 
                    src={product.images[selectedImage]} 
                    alt={product.name}
                    className="img-fluid rounded shadow"
                    style={{width: '100%', height: '400px', objectFit: 'contain', backgroundColor: '#f8f9fa'}}
                  />
                  <div className="amazon-choice-badge position-absolute" style={{top: '15px', left: '15px'}}>
                    Amazon's Choice
                  </div>
                </div>
                
                <div className="thumbnail-images">
                  <div className="row">
                    {product.images.map((image, index) => (
                      <div key={index} className="col-3">
                        <img 
                          src={image} 
                          alt={`${product.name} ${index + 1}`}
                          className={`img-fluid rounded cursor-pointer ${selectedImage === index ? 'border border-primary' : ''}`}
                          style={{height: '80px', objectFit: 'contain', backgroundColor: '#f8f9fa'}}
                          onClick={() => setSelectedImage(index)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Product Info */}
            <div className="col-lg-6">
              <div className="product-info">
                <h1 className="h3 mb-3">{product.name}</h1>
                
                <div className="rating-section mb-3">
                  <div className="d-flex align-items-center">
                    <div className="rating me-2">
                      {renderStars(product.rating)}
                    </div>
                    <span className="text-muted">({product.reviews} reviews)</span>
                    <span className="text-success ms-3">{product.sold}</span>
                  </div>
                </div>

                <div className="price-section mb-4">
                  <div className="d-flex align-items-center">
                    <span className="h3 text-primary me-3">{product.price}</span>
                    <span className="text-muted text-decoration-line-through me-2">{product.originalPrice}</span>
                    <span className="badge bg-danger">{product.discount}</span>
                  </div>
                  <div className="markup-info mt-2">
                    <span className="badge bg-success">{product.markup}</span>
                  </div>
                </div>

                <div className="description mb-4">
                  <p>{product.description}</p>
                </div>

                <div className="features mb-4">
                  <h5>Key Features:</h5>
                  <ul className="list-unstyled">
                    {product.features.map((feature, index) => (
                      <li key={index} className="mb-1">
                        <i className="fas fa-check text-success me-2"></i>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="quantity-section mb-4">
                  <label className="form-label">Quantity:</label>
                  <div className="d-flex align-items-center">
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      className="form-control mx-2" 
                      style={{width: '80px'}}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="action-buttons mb-4">
                  <div className="d-grid gap-2 d-md-flex">
                    <button className="btn btn-primary btn-lg flex-fill">
                      <i className="fas fa-shopping-cart me-2"></i>
                      Add to Cart
                    </button>
                    <button className="btn btn-success btn-lg flex-fill">
                      <i className="fab fa-whatsapp me-2"></i>
                      Contact Supplier
                    </button>
                    <button className="btn btn-outline-primary">
                      <i className="fas fa-heart"></i>
                    </button>
                  </div>
                </div>

                <div className="supplier-info card">
                  <div className="card-body">
                    <h6 className="card-title">
                      Supplier Information
                      {product.supplier.verified && (
                        <i className="fas fa-check-circle text-success ms-2" title="Verified Supplier"></i>
                      )}
                    </h6>
                    <p className="mb-1"><strong>{product.supplier.name}</strong></p>
                    <p className="mb-1">
                      <i className="fas fa-star text-warning me-1"></i>
                      {product.supplier.rating} Rating
                    </p>
                    <p className="mb-0">
                      <i className="fas fa-map-marker-alt me-1"></i>
                      {product.supplier.location}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Specifications */}
      <section className="section-padding bg-light">
        <div className="container">
          <div className="row">
            <div className="col-12">
              <h3 className="mb-4">Product Specifications</h3>
              <div className="table-responsive">
                <table className="table table-striped">
                  <tbody>
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <tr key={key}>
                        <td><strong>{key}</strong></td>
                        <td>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Products */}
      <section className="section-padding">
        <div className="container">
          <h3 className="mb-4">Related Products</h3>
          <div className="row">
            {relatedProducts.map(product => (
              <div key={product.id} className="col-lg-4 col-md-6 mb-4">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Product