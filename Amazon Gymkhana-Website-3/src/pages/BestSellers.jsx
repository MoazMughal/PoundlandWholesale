import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import ScrollToTop from '../components/ScrollToTop'
import { getImageUrl } from '../utils/imageImports'

// Import category images
import remoteImg from '../assets/main-pics/LG-Remote.jpg'
import electronicsImg from '../assets/main-pics/Light Bulb.jpg'
import strapImg from '../assets/main-pics/Watch Strap.jpg'
import jewelryImg from '../assets/main-pics/nose ring.jpg'
import partyImg from '../assets/main-pics/Balloons.jpg'
import homeImg from '../assets/main-pics/Measuring Jug.jpg'
import kitchenImg from '../assets/main-pics/Spoon.jpg'
import automotiveImg from '../assets/main-pics/Car Bulbs.jpg'
import tapeImg from '../assets/main-pics/Black-T.jpg'
import lampshadeImg from '../assets/main-pics/Black-Lampshade.jpg'

const BestSellers = () => {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [timeRange, setTimeRange] = useState('month')
  const [bestSellerProducts, setBestSellerProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'remote', name: 'Remote Controls' },
    { id: 'electronics', name: 'Electronics' },
    { id: 'strap', name: 'Watch Straps' },
    { id: 'jewelry', name: 'Jewelry' },
    { id: 'party', name: 'Party Supplies' },
    { id: 'home', name: 'Home & Decor' },
    { id: 'kitchen', name: 'Kitchen' },
    { id: 'automotive', name: 'Automotive' },
    { id: 'tape', name: 'Tape' },
    { id: 'lampshade', name: 'Lampshades' }
  ]

  // Fetch best sellers from API
  useEffect(() => {
    const fetchBestSellers = async () => {
      try {
        setLoading(true)
        const response = await fetch('http://localhost:5000/api/products/public?isBestSeller=true&limit=100&sortBy=rating&order=desc')
        
        if (response.ok) {
          const data = await response.json()
          // Transform API data to match expected format
          const transformedProducts = data.products.map((p, index) => {
            // Get the first image and convert path to actual imported URL
            const imageUrl = p.images && p.images.length > 0 ? getImageUrl(p.images[0]) : ''
            
            return {
              id: p._id,
              name: p.name,
              price: `Rs. ${p.price}`,
              originalPrice: p.originalPrice ? `Rs. ${p.originalPrice}` : null,
              image: imageUrl,
              rating: p.rating || 4.0,
              reviews: p.reviews || 0,
              markup: p.discount ? `${p.discount}% Profit` : '40% Profit',
              category: p.category,
              rank: index + 1,
              salesCount: `${Math.floor(Math.random() * 2000) + 1000}+`,
              trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)]
            }
          })
          setBestSellerProducts(transformedProducts)
        } else {
          console.error('Failed to fetch best sellers')
        }
      } catch (error) {
        console.error('Error fetching best sellers:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBestSellers()
  }, [])

  const filteredProducts = selectedCategory === 'all' 
    ? bestSellerProducts 
    : bestSellerProducts.filter(product => product.category === selectedCategory)

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <i className="fas fa-arrow-up text-success"></i>
      case 'down':
        return <i className="fas fa-arrow-down text-danger"></i>
      default:
        return <i className="fas fa-minus text-muted"></i>
    }
  }

  const getRankBadgeColor = (rank) => {
    if (rank <= 3) return 'bg-warning text-dark'
    if (rank <= 6) return 'bg-primary'
    return 'bg-secondary'
  }

  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh'}}>
        <div style={{textAlign: 'center'}}>
          <div style={{fontSize: '2rem', marginBottom: '10px'}}>⏳</div>
          <div style={{fontSize: '1.2rem', fontWeight: '600', color: '#333'}}>Loading Best Sellers...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Hero Section with Categories */}
      <section className="hero-banner-with-categories">
        <div className="hero-background-images">
          <div className="category-image remote-bg"></div>
          <div className="category-image electronics-bg"></div>
          <div className="category-image strap-bg"></div>
          <div className="category-image jewelry-bg"></div>
          <div className="category-image party-bg"></div>
          <div className="category-image home-bg"></div>
          <div className="category-image kitchen-bg"></div>
          <div className="category-image automotive-bg"></div>
          <div className="category-image tape-bg"></div>
          <div className="category-image lampshade-bg"></div>
        </div>
        <div className="hero-overlay"></div>
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">Best Sellers</h1>
            <p className="hero-subtitle">
              Discover our top-performing products based on sales volume and customer satisfaction. 
              These are the products that our customers love most!
            </p>
            
            {/* Category Links */}
            <div className="category-links mt-4">
              <div className="row justify-content-center">
                {categories.slice(1).map(category => (
                  <div key={category.id} className="col-xl-2 col-lg-2 col-md-3 col-4 mb-3">
                    <Link 
                      to={`/amazons-choice?cat=${category.id}`}
                      className="category-link-card modern-category-card"
                    >
                      <div className="category-image-container">
                        <img 
                          src={
                            category.id === 'remote' ? remoteImg :
                            category.id === 'electronics' ? electronicsImg :
                            category.id === 'strap' ? strapImg :
                            category.id === 'jewelry' ? jewelryImg :
                            category.id === 'party' ? partyImg :
                            category.id === 'home' ? homeImg :
                            category.id === 'kitchen' ? kitchenImg :
                            category.id === 'automotive' ? automotiveImg :
                            category.id === 'tape' ? tapeImg :
                            category.id === 'lampshade' ? lampshadeImg : electronicsImg
                          }
                          alt={category.name}
                          className="category-image"
                        />
                        <div className="category-overlay">
                          <i className={`fas ${
                            category.id === 'remote' ? 'fa-tv' :
                            category.id === 'electronics' ? 'fa-laptop' :
                            category.id === 'strap' ? 'fa-clock' :
                            category.id === 'jewelry' ? 'fa-gem' :
                            category.id === 'party' ? 'fa-birthday-cake' :
                            category.id === 'home' ? 'fa-home' :
                            category.id === 'kitchen' ? 'fa-utensils' :
                            category.id === 'automotive' ? 'fa-car' :
                            category.id === 'tape' ? 'fa-tape' :
                            category.id === 'lampshade' ? 'fa-lightbulb' : 'fa-box'
                          } category-icon`}></i>
                        </div>
                      </div>
                      <div className="category-info">
                        <span className="category-name">{category.name}</span>
                        <span className="category-count">{Math.floor(Math.random() * 500) + 100}+ items</span>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="section-padding">
        <div className="container">
          {/* Filters */}
          <div className="row mb-4">
            <div className="col-lg-8">
              <div className="d-flex gap-2 flex-wrap">
                {categories.map(category => (
                  <button
                    key={category.id}
                    className={`btn ${selectedCategory === category.id ? 'btn-primary' : 'btn-outline-primary'} btn-sm`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-lg-4">
              <select 
                className="form-select"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>

          {/* Best Sellers Grid */}
          <div className="row">
            {filteredProducts.map(product => (
              <div key={product.id} className="col-lg-3 col-md-4 col-sm-6 mb-4">
                <div className="product-card position-relative">
                  {/* Rank Badge */}
                  <div className={`position-absolute badge ${getRankBadgeColor(product.rank)}`} 
                       style={{top: '10px', left: '10px', zIndex: 3, fontSize: '0.8rem'}}>
                    #{product.rank}
                  </div>
                  
                  {/* Best Seller Badge */}
                  <div className="position-absolute badge bg-success" 
                       style={{top: '10px', right: '10px', zIndex: 3, fontSize: '0.7rem'}}>
                    Best Seller
                  </div>
                  
                  <div className="product-image-container">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="product-image"
                    />
                  </div>
                  
                  <div className="card-body">
                    <h5 className="card-title">{product.name}</h5>
                    
                    <div className="rating mb-2">
                      {[...Array(5)].map((_, i) => (
                        <i 
                          key={i} 
                          className={`${i < Math.floor(product.rating) ? 'fas' : 'far'} fa-star text-warning`}
                        ></i>
                      ))}
                      <span className="rating-count ms-1">({product.reviews})</span>
                    </div>
                    
                    <div className="price mb-2">
                      {product.price}
                      {product.originalPrice && (
                        <span className="text-muted text-decoration-line-through ms-2" style={{fontSize: '0.8rem'}}>
                          {product.originalPrice}
                        </span>
                      )}
                    </div>
                    
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="sales-count" style={{fontSize: '0.75rem', color: '#4a5568', fontWeight: '600'}}>
                        {product.salesCount} sold
                      </div>
                      <div className="trend">
                        {getTrendIcon(product.trend)}
                      </div>
                    </div>
                    
                    {product.markup && (
                      <div className="markup-badge mb-3" style={{
                        background: '#28a745',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        display: 'inline-block'
                      }}>
                        {product.markup}
                      </div>
                    )}
                    
                    <div className="product-actions">
                      <button className="btn btn-primary btn-sm flex-fill me-2">
                        View Details
                      </button>
                      <button className="btn btn-outline-primary btn-sm">
                        <i className="fas fa-heart"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>



          {/* Quick Stats */}
          <div className="row mt-5">
            <div className="col-12 mb-4">
              <div className="stats-container">
                <div className="row g-4">
                  <div className="col-md-3 col-6">
                    <div className="stat-card">
                      <div className="stat-number">15K+</div>
                      <div className="stat-label">Products Sold</div>
                    </div>
                  </div>
                  <div className="col-md-3 col-6">
                    <div className="stat-card">
                      <div className="stat-number">4.8★</div>
                      <div className="stat-label">Average Rating</div>
                    </div>
                  </div>
                  <div className="col-md-3 col-6">
                    <div className="stat-card">
                      <div className="stat-number">98%</div>
                      <div className="stat-label">Satisfaction</div>
                    </div>
                  </div>
                  <div className="col-md-3 col-6">
                    <div className="stat-card">
                      <div className="stat-number">24h</div>
                      <div className="stat-label">Fast Delivery</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .hero-banner-with-categories {
          background: linear-gradient(135deg, var(--amazon-orange) 0%, var(--bs-secondary) 50%, var(--amazon-light-blue) 100%);
          color: white;
          padding: 60px 0 40px 0;
          text-align: center;
          position: relative;
          overflow: hidden;
          margin-bottom: 0;
        }
        
        .hero-background-images {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          grid-template-rows: repeat(2, 1fr);
          opacity: 0.1;
        }
        
        .category-image {
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        
        .electronics-bg {
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23ffffff"><rect x="20" y="30" width="60" height="40" rx="5"/><rect x="25" y="35" width="50" height="30" rx="2"/></svg>');
        }
        
        .jewelry-bg {
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23ffffff"><polygon points="50,20 60,40 40,40"/><circle cx="50" cy="60" r="15"/></svg>');
        }
        
        .home-bg {
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23ffffff"><polygon points="50,15 80,40 80,80 20,80 20,40"/><rect x="40" y="60" width="20" height="20"/></svg>');
        }
        
        .toys-bg {
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23ffffff"><rect x="30" y="40" width="40" height="25" rx="5"/><circle cx="35" cy="35" r="8"/><circle cx="65" cy="35" r="8"/></svg>');
        }
        
        .beauty-bg {
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23ffffff"><path d="M50,20 C60,30 60,50 50,60 C40,50 40,30 50,20 Z"/></svg>');
        }
        
        .sports-bg {
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23ffffff"><circle cx="50" cy="50" r="25"/><path d="M30,50 Q50,30 70,50 Q50,70 30,50"/></svg>');
        }
        
        .remote-bg {
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23ffffff"><rect x="35" y="20" width="30" height="60" rx="5"/><circle cx="50" cy="35" r="3"/><circle cx="50" cy="45" r="3"/><circle cx="50" cy="55" r="3"/></svg>');
        }
        
        .strap-bg {
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23ffffff"><circle cx="50" cy="50" r="20"/><rect x="30" y="45" width="40" height="10" rx="5"/></svg>');
        }
        
        .party-bg {
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23ffffff"><polygon points="50,20 55,35 70,35 58,45 63,60 50,50 37,60 42,45 30,35 45,35"/></svg>');
        }
        
        .kitchen-bg {
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23ffffff"><path d="M30,40 L70,40 L65,70 L35,70 Z"/><rect x="45" y="20" width="10" height="20"/></svg>');
        }
        
        .automotive-bg {
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23ffffff"><rect x="20" y="40" width="60" height="30" rx="5"/><circle cx="35" cy="65" r="8"/><circle cx="65" cy="65" r="8"/></svg>');
        }
        
        .tape-bg {
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23ffffff"><circle cx="50" cy="50" r="25"/><circle cx="50" cy="50" r="15" fill="none" stroke="%23ffffff" stroke-width="2"/></svg>');
        }
        
        .lampshade-bg {
          background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23ffffff"><path d="M35,40 L65,40 L60,70 L40,70 Z"/><rect x="48" y="20" width="4" height="20"/></svg>');
        }
        
        .hero-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.3);
        }
        
        .hero-content {
          position: relative;
          z-index: 3;
        }
        
        .hero-title {
          font-family: 'Poppins', sans-serif;
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 10px;
          text-shadow: 0 4px 20px rgba(0,0,0,0.3);
          background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .hero-subtitle {
          font-size: 1rem;
          max-width: 600px;
          margin: 0 auto 1.5rem;
          opacity: 0.9;
          font-weight: 400;
          line-height: 1.4;
        }
        
        .category-links {
          margin-top: 1.5rem;
        }
        
        .modern-category-card {
          display: block;
          background: white;
          border-radius: var(--radius-xl);
          text-decoration: none;
          color: inherit;
          transition: all 0.3s ease;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.2);
          backdrop-filter: blur(20px);
        }
        
        .modern-category-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: var(--shadow-xl);
          color: inherit;
          text-decoration: none;
        }
        
        .category-image-container {
          position: relative;
          height: 100px;
          overflow: hidden;
          background: linear-gradient(135deg, var(--gray-100), var(--gray-200));
        }
        
        .category-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        
        .modern-category-card:hover .category-image {
          transform: scale(1.1);
        }
        
        .category-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(255, 153, 0, 0.8), rgba(255, 102, 0, 0.8));
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .modern-category-card:hover .category-overlay {
          opacity: 1;
        }
        
        .category-icon {
          font-size: 2rem;
          color: white;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .category-info {
          padding: 0.75rem;
          text-align: center;
        }
        
        .category-name {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--gray-800);
          margin-bottom: 0.2rem;
          line-height: 1.1;
        }
        
        .category-count {
          display: block;
          font-size: 0.7rem;
          color: var(--gray-500);
          font-weight: 500;
        }
        
        .sales-count {
          font-size: 0.75rem;
          color: #4a5568;
          font-weight: 600;
        }
        
        .stats-container {
          background: white;
          border-radius: var(--radius-xl);
          padding: 2rem;
          box-shadow: var(--shadow-lg);
          margin: 2rem 0;
        }
        
        .stat-card {
          text-align: center;
          padding: 1rem;
        }
        
        .stat-number {
          font-family: 'Poppins', sans-serif;
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--amazon-orange);
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, var(--amazon-orange), var(--bs-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .stat-label {
          font-size: 0.9rem;
          color: var(--gray-600);
          font-weight: 500;
        }
        
        @media (max-width: 768px) {
          .hero-title {
            font-size: 2rem;
          }
          
          .category-name {
            font-size: 0.7rem;
          }
          
          .category-icon {
            font-size: 1.2rem;
          }
        }
      `}</style>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  )
}

export default BestSellers