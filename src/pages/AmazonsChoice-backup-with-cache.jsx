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
      { text: 'Best Seller', color: '#ff6b35', icon: '🏆', priority: 'high' },
      { text: 'Top Rated', color: '#28a745', icon: '⭐', priority: 'high' },
      { text: 'Crazy Low', color: '#dc3545', icon: '🔥', priority: 'urgent' },
      { text: 'Very Popular', color: '#6f42c1', icon: '💎', priority: 'medium' },
      { text: 'Limited Time', color: '#fd7e14', icon: '⚡', priority: 'urgent' },
      { text: 'Hot Deal', color: '#e83e8c', icon: '💥', priority: 'high' },
      { text: 'Trending', color: '#17a2b8', icon: '📈', priority: 'medium' },
      { text: 'New Arrival', color: '#20c997', icon: '✨', priority: 'medium' }
    ]
    
    const amazonChoice = { text: "Amazon's Choice", color: '#667eea', icon: '✓', priority: 'standard' }
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
        console.log('🔄 Skipping duplicate fetch for:', fetchKey)
        return
      }
      
      // Only show loading if we don't have products already
      if (products.length === 0) {
        setLoading(true)
      }
      console.log('🔄 Fetching products from database...', { category, search, fetchKey })
      
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
      
      console.log('🌐 API URL:', getApiUrl(apiUrl))
      console.log('🏆 Amazon Choice Filter Applied - Category:', category || 'all')
      
      const response = await fetch(getApiUrl(apiUrl), {
        headers: { 'Accept': 'application/json' }
      })
      
      console.log('📊 Response received after long wait')
      console.log('📊 Response status:', response.status)
      console.log('📊 Response ok:', response.ok)
      
      if (response.ok) {
        console.log('�  Parsing JSON response...')
        const data = await response.json()
        console.log('📦 Raw data received:', {
          hasProducts: !!data.products,
          productsCount: data.products?.length || 0,
          source: data.source,
          responseTime: data.responseTime
        })
        
        if (data.products && data.products.length > 0) {
          console.log('✅ Database fetch successful:', data.products.length, 'products')
          console.log('📋 Sample product:', data.products[0])
          console.log('💰 Price fields in sample:', {
            price: data.products[0]?.price,
            originalPrice: data.products[0]?.originalPrice,
            dealUnits: data.products[0]?.dealUnits,
            profitCalculations: data.products[0]?.profitCalculations,
            profitEvaluation: data.products[0]?.profitEvaluation
          })
          
          // Simplified: All prices in GBP (£) only - use actual database price
          const transformedProducts = data.products.map(p => {
            // Debug amber bulb specifically
            if (p.name && p.name.toLowerCase().includes('amber') && p.name.toLowerCase().includes('bulb')) {
              console.log('🔍 AMBER BULB DEBUG:', {
                id: p._id,
                name: p.name,
                profitCalculations: p.profitCalculations,
                profitEvaluation: p.profitEvaluation,
                evaluation: p.evaluation
              });
            }
            
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
          
          console.log('🎯 Setting products state:', {
            originalCount: data.products.length,
            transformedCount: transformedProducts.length,
            sampleTransformed: transformedProducts[0]
          })
          
          setProducts(transformedProducts)
          // Initialize filtered products with all products
          setFilteredProducts(transformedProducts)
          setLoading(false)
          setHasLoadedOnce(true)
          setLastFetchKey(fetchKey)
          setDataSource(data.source || 'unknown')
          
          console.log('✅ Products loaded successfully!')
          console.log('🔍 Final state check:', {
            productsLength: transformedProducts.length,
            firstProduct: transformedProducts[0]?.name,
            loading: false,
            dataSource: data.source
          })
          
          // Show notification if using fallback data
          if (data.source && data.source !== 'database' && data.source !== 'fast') {
            console.warn('⚠️ Using fallback data source:', data.source);
          }
        } else {
          console.log('⚠️ No Amazon Choice products found in database')
          console.log('🔍 This might mean:')
          console.log('  1. No products are marked as isAmazonsChoice: true')
          console.log('  2. Database connection issues')
          console.log('  3. All Amazon Choice products are inactive')
          setProducts([])
          setLoading(false)
        }
      } else {
        throw new Error(`Failed to fetch products: ${response.status}`)
      }
    } catch (error) {
      console.error('❌ Database fetch failed:', error)
      alert('Failed to load products. Please refresh the page.')
      setProducts([])
      setLoading(false)
    }
  }

  // Server-side filtering - fetch products with filters
  const applyFilters = async (category, search) => {
    console.log('🔍 Applying filters:', { category, search })
    await fetchProducts(category, search)
  }

  // Force refresh for admin
  const forceRefresh = async () => {
    console.log('🔄 Force refreshing products from database...')
    setLoading(true)
    await Promise.all([fetchProducts(), fetchCategories()])
  }

  // Debug: Track products state changes
  useEffect(() => {
    console.log('🔍 Products state changed:', {
      productsCount: products.length,
      currentProductsCount: currentProducts.length,
      loading: loading,
      hasLoadedOnce: hasLoadedOnce
    })
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
    
    console.log('📍 URL params changed:', { catParam, searchParam })
    console.log('🌍 Environment info:', {
      isDev: import.meta.env.DEV,
      apiUrl: import.meta.env.VITE_API_URL,
      mode: import.meta.env.MODE
    })
    
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
        console.log('🏥 Checking API health:', healthUrl);
        const response = await fetch(healthUrl);
        const health = await response.json();
        console.log('🏥 API Health:', health);
      } catch (error) {
        console.error('❌ API Health check failed:', error);
      }
    };
    
    checkApiHealth();
  }, []);

  // Initial load - will be triggered by URL params useEffect

  // Loading state
  if (loading) {
    return (
      <div className="container products-container" style={{maxWidth: '1600px', padding: '10px 15px'}}>
        <ScrollToTop />
        
        {/* Simple Loading Message */}
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          fontSize: '18px',
          color: '#374151'
        }}>
          <i className="fas fa-spinner fa-spin" style={{ marginRight: '10px' }}></i>
          Loading products from database...
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
      <div className="container products-container" style={{maxWidth: '1600px', padding: '10px 15px'}}>
        <ScrollToTop />
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          padding: '40px 20px'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px', opacity: 0.3 }}>🔌</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>
            No Amazon Choice Products Found
          </h2>
          <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '20px', maxWidth: '500px', lineHeight: '1.5' }}>
            No Amazon Choice products are currently available. This might be because:
            <br />• Products are not marked as Amazon's Choice in the database
            <br />• All Amazon Choice products are currently inactive
            <br />• Database connection issues
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#667eea',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🔄 Try Again
            </button>
            <button
              onClick={() => navigate('/api-debug')}
              style={{
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🔧 Debug Info
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Debug: Log render state
  console.log('🎨 Rendering with state:', {
    loading,
    productsLength: products.length,
    currentProductsLength: currentProducts.length,
    hasLoadedOnce
  })

  return (
    <div>
      <div className="container products-container" style={{maxWidth: '1600px', padding: '10px 15px'}}>
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

        


        {/* Products Grid */}
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
          {currentProducts.map((product, index) => (
            <div 
              key={product.id} 
              className="product-card"
              onClick={() => {
                // Get the unique badge for this product
                const additionalBadges = [
                  { text: 'Best Seller', color: '#ff6b35', icon: '🏆' },
                  { text: 'Top Rated', color: '#28a745', icon: '⭐' },
                  { text: 'Crazy Low', color: '#dc3545', icon: '🔥' },
                  { text: 'Very Popular', color: '#6f42c1', icon: '💎' },
                  { text: 'Limited Time', color: '#fd7e14', icon: '⚡' },
                  { text: 'Hot Deal', color: '#e83e8c', icon: '💥' },
                  { text: 'Trending', color: '#17a2b8', icon: '📈' },
                  { text: 'New Arrival', color: '#20c997', icon: '✨' }
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
              style={{cursor: 'pointer'}}
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
                
                {/* Single Rotating Badge */}
                <div style={{position: 'absolute', top: '2px', right: '2px', zIndex: 2}}>
                  {(() => {
                    const badge = getProductBadge(product, index)
                    return (
                      <span 
                        className="product-badge"
                        style={{
                          padding: windowWidth < 576 ? '1px 3px' : '2px 5px',
                          borderRadius: '3px',
                          fontWeight: '700',
                          fontSize: windowWidth < 576 ? '0.45rem' : '0.5rem',
                          backgroundColor: badge.color,
                          color: 'white',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          transition: 'all 0.3s ease', // Smooth transition between badges
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
                <h5 style={{fontSize: '10px', fontWeight: '700', margin: 0, lineHeight: '1.2', height: '24px', overflow: 'hidden'}}>
                  {product.name}
                </h5>
                
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px'}}>
                  {/* Left side - Price */}
                  <div style={{fontWeight: '800', fontSize: '12px', color: '#0b3b2e'}}>
                    {(() => {
                      // Use the raw database price directly as per-unit price
                      const perUnitPrice = product.rawPrice || 0;
                      
                      return `£${perUnitPrice.toFixed(2)}/unit`;
                    })()}
                  </div>
                  
                  {/* Right side - Profit Information */}
                  {(() => {
                    // Debug: Log what profit data is available
                    console.log('🔍 Profit Debug for', product.name?.substring(0, 30), ':', {
                      hasProfitCalculations: !!product?.profitCalculations,
                      profitCalculations: product?.profitCalculations,
                      hasEvaluation: !!product?.evaluation,
                      evaluation: product?.evaluation,
                      hasShowEvaluation: !!product?.showEvaluation,
                      showEvaluation: product?.showEvaluation
                    });

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
                      console.log('❌ No valid profit data for', product.name?.substring(0, 30));
                      return null;
                    }

                    console.log('✅ Valid profit data found for', product.name?.substring(0, 30));

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

                    console.log('💰 Calculated profit for', product.name?.substring(0, 30), ':', {
                      profitPerUnit,
                      dealUnits,
                      totalProfit
                    });

                    return (
                      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px'}}>
                        {/* Profit per unit */}
                        <div style={{fontSize: '8px', color: '#059669', fontWeight: '700'}}>
                          💰 £{profitPerUnit.toFixed(2)}/unit
                        </div>
                        
                        {/* Profit for deal units */}
                        <div style={{fontSize: '8px', color: '#059669', fontWeight: '700'}}>
                          📈 £{totalProfit.toFixed(2)}/{dealUnits} unit{dealUnits !== 1 ? 's' : ''}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Deal Units Display */}
                <div style={{ marginTop: '2px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
                    padding: '4px 6px', 
                    borderRadius: '4px', 
                    border: '1px solid #f59e0b', 
                    boxShadow: '0 1px 3px rgba(245, 158, 11, 0.2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                      <span style={{fontSize: '8px', color: '#92400e', fontWeight: '700'}}>
                        💰 Deal of {product.dealUnits || 1} unit{(product.dealUnits || 1) !== 1 ? 's' : ''}:
                      </span>
                      <span style={{fontSize: '9px', fontWeight: '800', color: '#b45309'}}>
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
                    
                    {/* Basket button moved here */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        addToBasket(product)
                      }}
                      style={{
                        background: isInBasket(product.id) ? '#10b981' : '#667eea',
                        color: 'white',
                        border: 'none',
                        padding: '3px 6px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        cursor: 'pointer'
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
                      background: '#232f3e',
                      color: 'white',
                      border: 'none',
                      padding: '4px 6px',
                      borderRadius: '3px',
                      fontSize: '8.5px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                      width: '100%',
                      textDecoration: 'none',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#1a252f'}
                    onMouseLeave={(e) => e.target.style.background = '#232f3e'}
                  >
                    <i className="fab fa-amazon"></i> Verify on Amazon
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  background: currentPage === 1 ? '#f8fafc' : 'white',
                  color: currentPage === 1 ? '#9ca3af' : '#374151',
                  borderRadius: '6px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              
              <span style={{ padding: '8px 16px', fontSize: '14px', color: '#374151' }}>
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  background: currentPage === totalPages ? '#f8fafc' : 'white',
                  color: currentPage === totalPages ? '#9ca3af' : '#374151',
                  borderRadius: '6px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
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