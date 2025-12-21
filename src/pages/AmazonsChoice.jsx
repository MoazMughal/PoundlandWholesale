import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import ScrollToTop from '../components/ScrollToTop'
import ProductCardSkeleton from '../components/ProductCardSkeleton'
import { useCurrency } from '../context/CurrencyContext'
import { useSeller } from '../context/SellerContext'
import { useBasket } from '../context/BasketContext'
import { useAdmin } from '../context/AdminContext'
import { getImageUrl } from '../utils/imageImports'
import { getApiUrl } from '../utils/api'
import { logDeviceInfo } from '../utils/deviceDetection'
import '../styles/mobile-products.css'
import '../styles/enhanced-theme.css'

const AmazonsChoice = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Add CSS for badge hover effects only
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .product-badge:hover {
        transform: scale(1.1) !important;
        z-index: 10 !important;
        transition: transform 0.2s ease !important;
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])
  
  // Essential state for functionality
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('cat') || 'all')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [currentPage, setCurrentPage] = useState(1)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [lastFetchKey, setLastFetchKey] = useState('')
  const [badgeRotation, setBadgeRotation] = useState(0) // For rotating badges every 2 seconds
  const [dataSource, setDataSource] = useState('') // Track data source for debugging


  // Context hooks
  const { formatPrice } = useCurrency()
  const { addToBasket, isInBasket } = useBasket()
  const { isLoggedIn: isAdminContextLoggedIn } = useAdmin()

  // Rotating badge generator - alternates between Amazon's Choice and other badges every 2 seconds
  const getProductBadge = (product, index) => {
    const additionalBadges = [
      { text: 'Best Seller', color: '#e74c3c', icon: '🏆', priority: 'high' },
      { text: 'Top Rated', color: '#f39c12', icon: '⭐', priority: 'high' },
      { text: 'Crazy Low', color: '#e67e22', icon: '🔥', priority: 'urgent' },
      { text: 'Very Popular', color: '#9b59b6', icon: '💎', priority: 'medium' },
      { text: 'Limited Time', color: '#3498db', icon: '⚡', priority: 'urgent' },
      { text: 'Hot Deal', color: '#e91e63', icon: '💥', priority: 'high' },
      { text: 'Trending', color: '#1abc9c', icon: '📈', priority: 'medium' },
      { text: 'New Arrival', color: '#27ae60', icon: '✨', priority: 'medium' }
    ]
    
    const amazonChoice = { text: "Amazon's Choice", color: '#ff6600', icon: '✓', priority: 'standard' }
    const alternativeBadge = additionalBadges[index % additionalBadges.length]
    
    // Rotate every 2 seconds between Amazon's Choice and alternative badge
    return badgeRotation % 2 === 0 ? amazonChoice : alternativeBadge
  }

  // Pagination
  const productsPerPage = 48
  const indexOfLastProduct = currentPage * productsPerPage
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage
  // Simplified: just use products directly for now
  const currentProducts = products.slice(indexOfFirstProduct, indexOfLastProduct)
  const totalPages = Math.ceil(products.length / productsPerPage)



  // Fetch products with server-side filtering
  const fetchProducts = async (category = null, search = null) => {
    try {
      // Create a key for this fetch to avoid duplicate requests
      const fetchKey = `${category || 'all'}-${search || ''}`
      
      // Skip if we just fetched the same data
      if (fetchKey === lastFetchKey && products.length > 0) {
        // Skipping duplicate fetch
        return
      }
      
      // Only show loading if we don't have products already
      if (products.length === 0) {
        setLoading(true)
      }
      // Fetching products from database
      
      // No timeout - let database take as long as it needs
      
      // Optimize API calls for better performance
      let apiUrl
      
      if (category && category !== 'all') {
        // For specific categories, use filtered endpoint with Amazon Choice filter
        const params = new URLSearchParams()
        params.append('category', category)
        params.append('isAmazonsChoice', 'true') // Always filter for Amazon Choice products
        params.append('limit', '50')
        if (search) params.append('search', search)
        apiUrl = `products/public?${params.toString()}`
      } else if (search) {
        // For search, use filtered endpoint with Amazon Choice filter
        const params = new URLSearchParams()
        params.append('search', search)
        params.append('isAmazonsChoice', 'true') // Always filter for Amazon Choice products
        params.append('limit', '50')
        apiUrl = `products/public?${params.toString()}`
      } else {
        // For "All" Amazon Choice products from all categories, use filtered endpoint
        const params = new URLSearchParams()
        params.append('isAmazonsChoice', 'true') // Show Amazon Choice products from ALL categories
        params.append('limit', '50')
        apiUrl = `products/public?${params.toString()}`
      }
      
      // API URL and Amazon Choice filter applied
      
      const response = await fetch(getApiUrl(apiUrl), {
        headers: { 'Accept': 'application/json' }
      })
      
      // Response received
      
      if (response.ok) {
        // Parsing JSON response
        const data = await response.json()
        // Raw data received
        
        if (data.products && data.products.length > 0) {
          // Database fetch successful
          
          // Simplified: All prices in GBP (£) only - use actual database price
          const transformedProducts = data.products.map(p => {
            // Debug amber bulb specifically
            // Product transformation
            
            return {
              id: p._id,
              name: p.name,
              // Store the raw database price (this might be per-unit or total price)
              price: `£${parseFloat(p.price || 0).toFixed(2)}`,
              rawPrice: parseFloat(p.price || 0), // Keep raw number for calculations
              originalPrice: p.originalPrice ? `£${parseFloat(p.originalPrice).toFixed(2)}` : null,
              category: p.category,
              brand: p.brand,
              image: p.images?.[0] || '',
              images: p.images || [],
              rating: p.rating || 4.5,
              reviews: p.reviews || 0,
              stock: p.stock || 0,
              discount: p.discount || 0,
              dealUnits: p.dealUnits || 1,
              currency: 'GBP',
              isAmazonsChoice: true,
              // Include profit data from database
              profitCalculations: p.profitCalculations || null,
              evaluation: p.evaluation || null,
              profitEvaluation: p.profitEvaluation || null
            };
          })
          
          // Setting products state
          
          setProducts(transformedProducts)
          // Initialize filtered products with all products
          setFilteredProducts(transformedProducts)
          setLoading(false)
          setHasLoadedOnce(true)
          setLastFetchKey(fetchKey)
          setDataSource(data.source || 'unknown')
          
          // Products loaded successfully
          
          // Show notification if using fallback data
        } else {
          // No Amazon Choice products found in database
          setProducts([])
          setLoading(false)
        }
      } else {
        throw new Error(`Failed to fetch products: ${response.status}`)
      }
    } catch (error) {
      // Database fetch failed
      alert('Failed to load products. Please refresh the page.')
      setProducts([])
      setLoading(false)
    }
  }

  // Server-side filtering - fetch products with filters
  const applyFilters = async (category, search) => {
    // Applying filters
    await fetchProducts(category, search)
  }

  // Force refresh for admin
  const forceRefresh = async () => {
    // Force refreshing products from database
    setLoading(true)
    await fetchProducts()
  }

  // Track products state changes
  useEffect(() => {
    // Products state changed
  }, [products, currentProducts, loading, hasLoadedOnce])

  // Check admin status
  useEffect(() => {
    setIsAdminLoggedIn(isAdminContextLoggedIn)
  }, [isAdminContextLoggedIn])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Badge rotation timer - change badges every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setBadgeRotation(prev => prev + 1)
    }, 2000) // 2 seconds

    return () => clearInterval(interval)
  }, [])

  // Handle URL parameters and trigger server-side filtering
  useEffect(() => {
    const catParam = searchParams.get('cat') || 'all'
    const searchParam = searchParams.get('search') || ''
    
    // URL params changed
    
    // Log device info for debugging mobile issues
    logDeviceInfo()
    
    // Update state
    setSelectedCategory(catParam)
    setSearchQuery(searchParam)
    
    // Fetch products with filters
    applyFilters(catParam, searchParam)
  }, [searchParams])

  // Health check on component mount
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const healthUrl = getApiUrl('../health');
        const response = await fetch(healthUrl);
        await response.json();
        // API Health check completed
      } catch (error) {
        // API Health check failed
      }
    };
    
    checkApiHealth();
  }, []);

  // Initial load - will be triggered by URL params useEffect

  // Loading state
  if (loading) {
    return (
      <div className="container products-container enhanced-container" style={{maxWidth: '1600px', padding: '20px 15px'}}>
        <ScrollToTop />
        
        {/* Enhanced Loading Message */}
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          fontSize: '20px',
          color: '#ff6600',
          background: 'linear-gradient(135deg, #fff5f0 0%, #ffebe0 100%)',
          borderRadius: '20px',
          border: '3px solid #ff6600',
          boxShadow: '0 10px 30px rgba(255, 102, 0, 0.2)',
          margin: '20px 0'
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '20px',
            animation: 'spin 2s linear infinite, pulse 1.5s ease-in-out infinite alternate'
          }}>
            🔄
          </div>
          <div style={{
            fontWeight: '700',
            textShadow: '0 2px 4px rgba(255, 102, 0, 0.3)',
            letterSpacing: '1px'
          }}>
            Loading Amazing Products...
          </div>
          <div style={{
            fontSize: '14px',
            marginTop: '10px',
            color: '#cc3300',
            fontWeight: '500'
          }}>
            Fetching the best deals for you!
          </div>
        </div>
        
        <div id="products-grid" style={{
          display: 'grid', 
          gridTemplateColumns: windowWidth < 576 ? 'repeat(2, 1fr)' : 
                              windowWidth < 768 ? 'repeat(4, 1fr)' : 
                              windowWidth < 992 ? 'repeat(5, 1fr)' : 
                              windowWidth < 1200 ? 'repeat(6, 1fr)' :
                              windowWidth < 1400 ? 'repeat(7, 1fr)' :
                              'repeat(8, 1fr)', 
          gap: windowWidth < 576 ? '6px' : '10px',
          maxWidth: '1600px',
          margin: '0 auto'
        }}>
          {Array.from({ length: 48 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </div>
    )
  }

  // No products state - only show if we've tried loading and have no products
  if (!loading && products.length === 0 && hasLoadedOnce) {
    return (
      <div className="container products-container enhanced-container" style={{maxWidth: '1600px', padding: '20px 15px'}}>
        <ScrollToTop />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          padding: '60px 20px',
          background: 'linear-gradient(135deg, #fff5f0 0%, #ffebe0 100%)',
          borderRadius: '25px',
          border: '3px solid #ff6600',
          boxShadow: '0 15px 40px rgba(255, 102, 0, 0.2)'
        }}>
          <div style={{ 
            fontSize: '5rem', 
            marginBottom: '30px', 
            animation: 'bounce 2s ease-in-out infinite',
            filter: 'drop-shadow(0 4px 8px rgba(255, 102, 0, 0.3))'
          }}>
            🛍️
          </div>
          <h2 style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            color: '#ff3300', 
            marginBottom: '20px',
            textShadow: '0 2px 4px rgba(255, 51, 0, 0.3)'
          }}>
            No Amazing Products Found!
          </h2>
          <p style={{ 
            fontSize: '1.1rem', 
            color: '#cc3300', 
            marginBottom: '30px', 
            maxWidth: '600px', 
            lineHeight: '1.6',
            fontWeight: '500'
          }}>
            We're working hard to bring you the best deals! This might be because:
            <br />• 🔄 Products are being updated
            <br />• 🛠️ System maintenance in progress
            <br />• 🌐 Connection issues
          </p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              className="enhanced-btn"
              style={{
                background: 'linear-gradient(135deg, #ff6600 0%, #ff3300 100%)',
                color: 'white',
                border: '2px solid white',
                padding: '15px 30px',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(255, 102, 0, 0.4)',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px) scale(1.05)';
                e.target.style.boxShadow = '0 12px 30px rgba(255, 102, 0, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.boxShadow = '0 8px 20px rgba(255, 102, 0, 0.4)';
              }}
            >
              🔄 Try Again
            </button>
            <button
              onClick={() => navigate('/api-debug')}
              className="enhanced-btn"
              style={{
                background: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
                color: 'white',
                border: '2px solid #ff6600',
                padding: '15px 30px',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-3px) scale(1.05)';
                e.target.style.background = 'linear-gradient(135deg, #ff6600 0%, #ff3300 100%)';
                e.target.style.borderColor = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)';
                e.target.style.borderColor = '#ff6600';
              }}
            >
              🔧 Debug Info
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Rendering with current state

  return (
    <div>
      <div className="container products-container enhanced-container" style={{maxWidth: '1600px', padding: '5px 15px', marginTop: '10px'}}>
        <ScrollToTop />

        {/* Data Source Indicator for Debugging */}
        {dataSource && dataSource !== 'database' && dataSource !== 'fast' && (
          <div style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '6px',
            padding: '8px 12px',
            marginBottom: '10px',
            fontSize: '0.85rem',
            color: '#92400e',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>
              ⚠️ Using {dataSource} data source. Real products may not be loading properly.
              {dataSource === 'fallback' && ' Check your internet connection.'}
              {dataSource === 'cache' && ' Showing cached data.'}
            </span>
            <button
              onClick={() => {
                setProducts([]);
                setLoading(true);
                setDataSource('');
                fetchProducts();
              }}
              style={{
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              🔄 Retry
            </button>
          </div>
        )}

        


        {/* Enhanced Products Grid */}
        <div id="products-grid" style={{
          display: 'grid', 
          gridTemplateColumns: windowWidth < 576 ? 'repeat(2, 1fr)' : 
                              windowWidth < 768 ? 'repeat(4, 1fr)' : 
                              windowWidth < 992 ? 'repeat(5, 1fr)' : 
                              windowWidth < 1200 ? 'repeat(6, 1fr)' :
                              windowWidth < 1400 ? 'repeat(7, 1fr)' :
                              'repeat(8, 1fr)', 
          gap: windowWidth < 576 ? '12px' : '15px',
          maxWidth: '1600px',
          margin: '0 auto',
          padding: '10px',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 245, 240, 0.9) 100%)',
          borderRadius: '15px',
          boxShadow: '0 8px 25px rgba(255, 102, 0, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(255, 102, 0, 0.2)'
        }}>
          {currentProducts.map((product, index) => (
            <div 
              key={product.id} 
              className="product-card enhanced-card"
              onClick={() => {
                // Get the unique badge for this product
                const additionalBadges = [
                  { text: 'Best Seller', color: '#e74c3c', icon: '🏆' },
                  { text: 'Top Rated', color: '#f39c12', icon: '⭐' },
                  { text: 'Crazy Low', color: '#e67e22', icon: '🔥' },
                  { text: 'Very Popular', color: '#9b59b6', icon: '💎' },
                  { text: 'Limited Time', color: '#3498db', icon: '⚡' },
                  { text: 'Hot Deal', color: '#e91e63', icon: '💥' },
                  { text: 'Trending', color: '#1abc9c', icon: '📈' },
                  { text: 'New Arrival', color: '#27ae60', icon: '✨' }
                ]
                const uniqueBadge = additionalBadges[index % additionalBadges.length]
                
                const params = new URLSearchParams({
                  name: product.name,
                  img: product.image,
                  price: product.price.replace(/[£$₨]/g, ''),
                  rating: product.rating,
                  reviews: product.reviews,
                  category: product.category,
                  brand: product.brand,
                  discount: product.discount,
                  badgeText: uniqueBadge.text,
                  badgeColor: uniqueBadge.color,
                  badgeIcon: uniqueBadge.icon
                })
                navigate(`/product/${product.id}?${params.toString()}`)
              }}
              style={{
                cursor: 'pointer',
                background: 'linear-gradient(145deg, #ffffff 0%, #fafafa 100%)',
                border: '2px solid transparent',
                borderRadius: '15px',
                overflow: 'hidden',
                boxShadow: '0 8px 25px rgba(255, 102, 0, 0.15)',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(255, 102, 0, 0.25)';
                e.currentTarget.style.borderColor = '#ff6600';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 102, 0, 0.15)';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              <div className="product-image-container" style={{
                position: 'relative', 
                height: windowWidth < 576 ? '120px' : '140px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: '#fff',
                padding: windowWidth < 576 ? '5px' : '8px'
              }}>
                <img 
                  src={getImageUrl(product.image)}
                  alt={product.name} 
                  loading="lazy"
                  onError={(e) => e.target.style.display = 'none'}
                  style={{
                    maxWidth: '100%', 
                    maxHeight: '100%', 
                    objectFit: 'contain'
                  }} 
                />
                
                {/* MOBILE BADGE - CSS Media Query Approach */}
                <div 
                  className="mobile-badge-container"
                  style={{
                    position: 'absolute',
                    top: '3px',
                    right: '3px',
                    zIndex: 1000,
                    backgroundColor: '#ff6600',
                    color: 'white',
                    padding: '3px 5px',
                    borderRadius: '4px',
                    fontSize: '8px',
                    fontWeight: 'bold',
                    display: 'block',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.5)'
                  }}
                >
                  Amazon's Choice
                </div>
                
                {/* DESKTOP BADGE - Show on Desktop Only */}
                <div 
                  className="desktop-badge-container"
                  style={{position: 'absolute', top: '2px', right: '2px', zIndex: 2}}
                >
                  {(() => {
                    const badge = getProductBadge(product, index)
                    return (
                      <span 
                        className="product-badge"
                        style={{
                          padding: '2px 5px',
                          borderRadius: '3px',
                          fontWeight: '700',
                          fontSize: '0.5rem',
                          backgroundColor: badge.color,
                          color: 'white',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          transition: 'all 0.3s ease',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <span style={{fontSize: '0.4rem'}}>{badge.icon}</span>
                        <span>{badge.text}</span>
                      </span>
                    )
                  })()}
                </div>


              </div>
              
              <div className="product-info" style={{padding: '3px 5px', display: 'flex', flexDirection: 'column', gap: '2px'}}>
                <h5 style={{
                  fontSize: '10px', 
                  fontWeight: '700', 
                  margin: 0, 
                  lineHeight: '1.2', 
                  height: '24px', 
                  overflow: 'hidden',
                  color: '#1a1a1a',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  transition: 'color 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = '#ff6600'}
                onMouseLeave={(e) => e.target.style.color = '#1a1a1a'}
                >
                  {product.name}
                </h5>
                
                {/* Product Variations Display */}
                {product.variations && product.variations.length > 0 && (
                  <div style={{ marginTop: '2px', marginBottom: '2px' }}>
                    {product.variations.map((variation, varIndex) => {
                      // Filter out current product from options
                      const otherOptions = variation.options.filter(option => 
                        option.productId && option.productId !== product._id
                      );
                      
                      // Find current product's variation value
                      const currentOption = variation.options.find(option => 
                        option.productId === product._id
                      );
                      
                      // Only show if there are other options to switch to
                      if (otherOptions.length === 0) return null;
                      
                      // Determine current product's variation value
                      let currentValue = 'Current';
                      if (currentOption && currentOption.value) {
                        currentValue = currentOption.value;
                      } else {
                        // If no specific value, try to derive from product name
                        const productName = product.name?.toLowerCase() || '';
                        if (variation.type === 'color') {
                          if (productName.includes('red')) currentValue = 'Red';
                          else if (productName.includes('blue')) currentValue = 'Blue';
                          else if (productName.includes('green')) currentValue = 'Green';
                          else if (productName.includes('black')) currentValue = 'Black';
                          else if (productName.includes('white')) currentValue = 'White';
                          else if (productName.includes('yellow')) currentValue = 'Yellow';
                          else if (productName.includes('pink')) currentValue = 'Pink';
                          else if (productName.includes('purple')) currentValue = 'Purple';
                          else if (productName.includes('orange')) currentValue = 'Orange';
                          else if (productName.includes('brown')) currentValue = 'Brown';
                          else if (productName.includes('grey') || productName.includes('gray')) currentValue = 'Grey';
                          else currentValue = 'Default Color';
                        } else if (variation.type === 'size') {
                          if (productName.includes('small')) currentValue = 'Small';
                          else if (productName.includes('medium')) currentValue = 'Medium';
                          else if (productName.includes('large')) currentValue = 'Large';
                          else if (productName.includes('xl')) currentValue = 'XL';
                          else if (productName.includes('xxl')) currentValue = 'XXL';
                          else currentValue = 'Default Size';
                        } else if (variation.type === 'style') {
                          if (productName.includes('classic')) currentValue = 'Classic';
                          else if (productName.includes('modern')) currentValue = 'Modern';
                          else if (productName.includes('vintage')) currentValue = 'Vintage';
                          else if (productName.includes('premium')) currentValue = 'Premium';
                          else if (productName.includes('deluxe')) currentValue = 'Deluxe';
                          else if (productName.includes('basic')) currentValue = 'Basic';
                          else currentValue = 'Default Style';
                        } else {
                          // For other variation types (like animal types)
                          if (productName.includes('dinosaur')) currentValue = 'Dinosaur';
                          else if (productName.includes('dolphin')) currentValue = 'Dolphin';
                          else if (productName.includes('shark')) currentValue = 'Shark';
                          else if (productName.includes('whale')) currentValue = 'Whale';
                          else if (productName.includes('fish')) currentValue = 'Fish';
                          else if (productName.includes('dragon')) currentValue = 'Dragon';
                          else if (productName.includes('unicorn')) currentValue = 'Unicorn';
                          else {
                            // Use first meaningful word from product name
                            const words = product.name.split(' ').filter(word => 
                              word.length > 3 && 
                              !['the', 'and', 'for', 'with', 'from', 'inflatable'].includes(word.toLowerCase())
                            );
                            currentValue = words[0] || 'Default';
                          }
                        }
                      }
                      
                      return (
                        <div key={varIndex} style={{ marginBottom: '1px' }}>
                          <div style={{
                            fontSize: '6px',
                            color: '#ff6600',
                            fontWeight: '700',
                            marginBottom: '1px',
                            textTransform: 'capitalize'
                          }}>
                            {variation.type}: {currentValue}
                          </div>
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '2px'
                          }}>
                            {otherOptions.map((option, optIndex) => (
                              <button
                                key={optIndex}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (option.productId) {
                                    // Navigate to the variation product
                                    navigate(`/product/${option.productId}`);
                                  }
                                }}
                                style={{
                                  fontSize: '5px',
                                  padding: '1px 3px',
                                  border: '1px solid #ff6600',
                                  borderRadius: '2px',
                                  background: '#fff',
                                  color: '#ff6600',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  minWidth: '15px',
                                  height: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: '600'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.background = '#ff6600';
                                  e.target.style.color = '#fff';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background = '#fff';
                                  e.target.style.color = '#ff6600';
                                }}
                              >
                                {option.value.length > 8 ? `${option.value.substring(0, 8)}...` : option.value}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px'}}>
                  {/* Left side - Compact Enhanced Price */}
                  <div style={{
                    fontWeight: '800', 
                    fontSize: '10px', 
                    color: '#ff3300',
                    background: 'linear-gradient(135deg, #fff5f0 0%, #ffebe0 100%)',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    border: '1px solid #ff6600',
                    textShadow: '0 1px 2px rgba(255, 51, 0, 0.3)',
                    boxShadow: '0 1px 4px rgba(255, 102, 0, 0.15)',
                    whiteSpace: 'nowrap',
                    maxWidth: 'fit-content'
                  }}>
                    {(() => {
                      // Use the raw database price directly as per-unit price
                      const perUnitPrice = product.rawPrice || 0;
                      
                      return `£${perUnitPrice.toFixed(2)}/unit`;
                    })()}
                  </div>
                  
                  {/* Right side - Profit Information - MOVED LEFT */}
                  {(() => {
                    // Check profit data availability

                    // Check if profit data is valid - use multiple sources like ProductDetail
                    const hasValidProfitData = () => {
                      // Check profitCalculations first (from admin panel)
                      if (product?.profitCalculations) {
                        const isValid = (
                          (product.profitCalculations.profitPerUnit && parseFloat(String(product.profitCalculations.profitPerUnit).replace(/[£₨$€]/g, '')) > 0) ||
                          (product.profitCalculations.profitFor200Units && parseFloat(String(product.profitCalculations.profitFor200Units).replace(/[£₨$€]/g, '')) > 0) ||
                          (product.profitCalculations.monthlyProfit && parseFloat(String(product.profitCalculations.monthlyProfit).replace(/[£₨$€]/g, '')) > 0)
                        );
                        if (isValid) return true;
                      }

                      // Check evaluation data (alternative source)
                      if (product?.evaluation) {
                        const isValid = (
                          (product.evaluation.netProfit && parseFloat(String(product.evaluation.netProfit).replace(/[£₨$€]/g, '')) > 0) ||
                          (product.evaluation.salesProceeds && parseFloat(String(product.evaluation.salesProceeds).replace(/[£₨$€]/g, '')) > 0)
                        );
                        if (isValid) return true;
                      }

                      // Check showEvaluation flag (like ProductDetail does)
                      if (product?.showEvaluation) {
                        return true;
                      }

                      // Check for specific product types that should show profit (same as ProductDetail)
                      const productName = product.name?.toLowerCase() || '';
                      if (productName.includes('nose ring') || 
                          productName.includes('bulb') || 
                          productName.includes('fuse') || 
                          productName.includes('lampshade') || 
                          productName.includes('lamp') ||
                          (productName.includes('leather') && productName.includes('watch'))) {
                        return true;
                      }

                      return false;
                    };

                    // Only show profit information if it's valid
                    if (!hasValidProfitData()) {
                      return null;
                    }

                    // Get the exact same profit value as ProductDetail page
                    const getProfitPerUnit = () => {
                      let profitPerUnit = 0;

                      // First try profitCalculations (from admin panel)
                      if (product?.profitCalculations?.profitPerUnit) {
                        profitPerUnit = parseFloat(product.profitCalculations.profitPerUnit);
                      }
                      // Then try evaluation data
                      else if (product?.evaluation?.netProfit) {
                        profitPerUnit = parseFloat(product.evaluation.netProfit);
                      }
                      
                      // Only use hardcoded profits if no database profit data exists
                      if (profitPerUnit === 0) {
                        const productName = product.name?.toLowerCase() || '';
                        if (productName.includes('nose ring')) {
                          profitPerUnit = 40.14;
                        } else if (productName.includes('bulb')) {
                          profitPerUnit = 251.10;
                        } else if (productName.includes('fuse')) {
                          profitPerUnit = 455.80;
                        } else if (productName.includes('lampshade')) {
                          profitPerUnit = 227.80;
                        } else if (productName.includes('leather') && productName.includes('watch')) {
                          profitPerUnit = 586.00;
                        }
                      }
                      
                      return parseFloat(profitPerUnit) || 0;
                    };

                    const profitPerUnit = getProfitPerUnit();
                    const dealUnits = product.dealUnits || 1;
                    const totalProfit = profitPerUnit * dealUnits;

                    // Calculated profit for product

                    return (
                      <div style={{
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'flex-start', // MOVED LEFT - changed from flex-end to flex-start
                        gap: '2px', // Increased gap for mobile
                        marginLeft: '4px', // Reduced margin for compact layout
                        marginTop: windowWidth < 576 ? '4px' : '0px' // Move down on mobile
                      }}>
                        {/* Profit per unit */}
                        <div style={{
                          fontSize: '7px', 
                          color: '#ff6600',
                          fontWeight: '700',
                          background: 'rgba(255, 102, 0, 0.1)',
                          padding: '1px 3px',
                          borderRadius: '2px',
                          border: '1px solid rgba(255, 102, 0, 0.3)',
                          whiteSpace: 'nowrap'
                        }}>
                          💰 £{profitPerUnit.toFixed(2)}/unit
                        </div>
                        
                        {/* Profit for deal units */}
                        <div style={{
                          fontSize: '7px', 
                          color: '#ff6600',
                          fontWeight: '700',
                          background: 'rgba(255, 102, 0, 0.1)',
                          padding: '1px 3px',
                          borderRadius: '2px',
                          border: '1px solid rgba(255, 102, 0, 0.3)',
                          whiteSpace: 'nowrap'
                        }}>
                          📈 £{totalProfit.toFixed(2)}/{dealUnits}units
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Deal Units Display - Moved Down for Mobile */}
                <div style={{ marginTop: windowWidth < 576 ? '6px' : '2px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #fff5f0 0%, #ffebe0 100%)', 
                    padding: '2px 4px', 
                    borderRadius: '6px', 
                    border: '1px solid #ff6600', 
                    boxShadow: '0 2px 6px rgba(255, 102, 0, 0.15)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '3px'}}>
                      <span style={{fontSize: '9px', color: '#cc3300', fontWeight: '700'}}>
                        💰 Deal of {product.dealUnits || 1} unit{(product.dealUnits || 1) !== 1 ? 's' : ''}:
                      </span>
                      <span style={{fontSize: '9px', fontWeight: '800', color: '#ff3300'}}>
                        {(() => {
                          try {
                            // Use raw price (per unit) from database
                            const unitPrice = product.rawPrice || 0;
                            const dealUnits = product.dealUnits || 1;
                            const totalPrice = unitPrice * dealUnits;
                            
                            console.log('💰 Deal calculation:', {
                              productName: product.name?.substring(0, 20),
                              unitPrice,
                              dealUnits,
                              totalPrice,
                              formatted: `£${totalPrice.toFixed(2)}`
                            });
                            
                            if (isNaN(totalPrice)) return product.price;
                            
                            // Always use GBP (£) currency
                            return `£${totalPrice.toFixed(2)}`;
                          } catch (error) {
                            return product.price;
                          }
                        })()}
                      </span>
                    </div>
                    
                    {/* Smaller Basket button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addToBasket(product)
                      }}
                      style={{
                        background: isInBasket(product.id) ? 
                          'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                          'linear-gradient(135deg, #ff6600 0%, #ff3300 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        fontSize: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 4px rgba(255, 102, 0, 0.3)',
                        transition: 'all 0.2s ease',
                        minWidth: '20px',
                        height: '16px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.1)';
                        e.target.style.boxShadow = '0 2px 6px rgba(255, 102, 0, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = '0 1px 4px rgba(255, 102, 0, 0.3)';
                      }}
                    >
                      <i className={isInBasket(product.id) ? 'fas fa-check' : 'fas fa-shopping-basket'}></i>
                    </button>
                  </div>
                </div>

                {/* Verify on Amazon Button */}
                <div style={{ marginTop: '4px' }}>
                  <a 
                    href={`https://www.amazon.com/s?k=${encodeURIComponent(product.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      background: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
                      color: 'white',
                      border: '2px solid #ff6600',
                      padding: '5px 8px',
                      borderRadius: '8px',
                      fontSize: '8.5px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      width: '100%',
                      textDecoration: 'none',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                      // Mobile-specific enhancements (will be overridden by CSS for mobile)
                      ...(windowWidth < 576 && {
                        minHeight: '22px',
                        fontSize: '9px',
                        padding: '6px 8px'
                      })
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'linear-gradient(135deg, #ff6600 0%, #ff3300 100%)';
                      e.target.style.borderColor = '#ffffff';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 15px rgba(255, 102, 0, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)';
                      e.target.style.borderColor = '#ff6600';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                    }}
                    // Add touch support for mobile without affecting desktop
                    {...(windowWidth < 576 && {
                      onTouchStart: (e) => {
                        e.target.style.background = 'linear-gradient(135deg, #ff6600 0%, #ff3300 100%)';
                        e.target.style.borderColor = '#ffffff';
                      },
                      onTouchEnd: (e) => {
                        setTimeout(() => {
                          e.target.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)';
                          e.target.style.borderColor = '#ff6600';
                        }, 150);
                      }
                    })}
                  >
                    <i className="fab fa-amazon"></i> Verify on Amazon
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className="pagination-container" style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            marginTop: '40px',
            padding: '20px',
            background: 'linear-gradient(135deg, #fff5f0 0%, #ffebe0 100%)',
            borderRadius: '15px',
            border: '2px solid #ff6600',
            boxShadow: '0 8px 25px rgba(255, 102, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '12px 16px',
                  border: '2px solid #ff6600',
                  background: currentPage === 1 ? 
                    'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)' : 
                    'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
                  color: currentPage === 1 ? '#999' : '#ff6600',
                  borderRadius: '10px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '700',
                  transition: 'all 0.3s ease',
                  boxShadow: currentPage === 1 ? 'none' : '0 4px 12px rgba(255, 102, 0, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 1) {
                    e.target.style.background = 'linear-gradient(135deg, #ff6600 0%, #ff3300 100%)';
                    e.target.style.color = 'white';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 18px rgba(255, 102, 0, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== 1) {
                    e.target.style.background = 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)';
                    e.target.style.color = '#ff6600';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(255, 102, 0, 0.2)';
                  }
                }}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              
              <span style={{ 
                padding: '12px 20px', 
                fontSize: '16px', 
                color: '#ff3300',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #ffffff 0%, #fff5f0 100%)',
                border: '2px solid #ff6600',
                borderRadius: '10px',
                textShadow: '0 1px 2px rgba(255, 51, 0, 0.2)'
              }}>
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '12px 16px',
                  border: '2px solid #ff6600',
                  background: currentPage === totalPages ? 
                    'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)' : 
                    'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
                  color: currentPage === totalPages ? '#999' : '#ff6600',
                  borderRadius: '10px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: '700',
                  transition: 'all 0.3s ease',
                  boxShadow: currentPage === totalPages ? 'none' : '0 4px 12px rgba(255, 102, 0, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== totalPages) {
                    e.target.style.background = 'linear-gradient(135deg, #ff6600 0%, #ff3300 100%)';
                    e.target.style.color = 'white';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 18px rgba(255, 102, 0, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== totalPages) {
                    e.target.style.background = 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)';
                    e.target.style.color = '#ff6600';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(255, 102, 0, 0.2)';
                  }
                }}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AmazonsChoice