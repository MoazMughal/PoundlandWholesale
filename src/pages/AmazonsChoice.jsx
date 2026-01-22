import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import ScrollToTop from '../components/ScrollToTop'
import ProductCardSkeleton from '../components/ProductCardSkeleton'
import SearchBar from '../components/SearchBar'
import Breadcrumb from '../components/Breadcrumb'
import LoadingSpinner from '../components/LoadingSpinner'
import { ProductCardSkeleton as NewProductCardSkeleton } from '../components/SkeletonLoaders'
import Pagination from '../components/Pagination'
import MobileImage from '../components/MobileImage'
import SimpleImage from '../components/SimpleImage'
import ProductImage from '../components/ProductImage'
import ProductionStatus from '../components/ProductionStatus'
import { useCurrency } from '../context/CurrencyContext'
import { useSeller } from '../context/SellerContext'
import { useBasket } from '../context/BasketContext'
import { useAdmin } from '../context/AdminContext'
import { getImageUrl } from '../utils/imageImports'
import { getApiUrl } from '../utils/api'
import { logDeviceInfo } from '../utils/deviceDetection'
import productionImageLoader from '../utils/productionImageLoader'
import '../styles/mobile-products.css'
import '../styles/enhanced-theme.css'
import '../styles/mobile-improvements.css'
import '../styles/enhanced-images.css'
import '../styles/mobile-image-optimization.css'
import '../styles/image-fixes.css'
import '../styles/production-optimizations.css'
import '../styles/mobile-enhancements.css'
import '../styles/mobile-pricing-fix.css'

const AmazonsChoice = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Add CSS for badge visibility - mobile badges smaller and positioned more to the right
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'amazons-choice-badges'
    style.textContent = `
      /* Mobile badge styles - smaller size and moved more to the right */
      .mobile-badge {
        position: absolute !important;
        top: 2px !important;
        right: 2px !important;
        z-index: 9999 !important;
        display: flex !important;
        align-items: center !important;
        gap: 1px !important;
        padding: 2px 4px !important;
        border-radius: 3px !important;
        font-size: 9px !important; /* Increased from 6px to 9px for better readability */
        font-weight: bold !important;
        color: white !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.6) !important;
        text-shadow: 0 1px 2px rgba(0,0,0,0.8) !important;
        white-space: nowrap !important;
        pointer-events: none !important;
        opacity: 1 !important;
        visibility: visible !important;
        max-width: 80px !important; /* Increased from 60px */
        overflow: hidden !important;
        border: 1px solid rgba(255,255,255,0.4) !important;
      }
      
      .mobile-badge span {
        color: white !important;
      }
      
      .desktop-badge {
        position: absolute !important;
        top: 3px !important;
        right: 3px !important;
        z-index: 9999 !important;
        display: flex !important;
        align-items: center !important;
        gap: 2px !important;
        padding: 3px 6px !important;
        border-radius: 4px !important;
        font-size: 9px !important; /* Increased from 7px to 9px for consistency */
        font-weight: bold !important;
        color: white !important;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5) !important;
        text-shadow: 0 1px 2px rgba(0,0,0,0.7) !important;
        white-space: nowrap !important;
        pointer-events: none !important;
        opacity: 1 !important;
        visibility: visible !important;
        border: 1px solid rgba(255,255,255,0.4) !important;
      }
      
      .desktop-badge span {
        color: white !important;
      }
      
      .desktop-badge:hover {
        transform: scale(1.05) !important;
        transition: transform 0.2s ease !important;
      }
      
      /* Ensure badges show on mobile screens */
      @media (max-width: 576px) {
        .mobile-badge {
          display: flex !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        .desktop-badge {
          display: none !important;
        }
        
        /* Mobile image fixes */
        .product-image-container img {
          max-width: 100% !important;
          max-height: 100% !important;
          width: auto !important;
          height: auto !important;
          object-fit: contain !important;
          display: block !important;
        }
        
        /* Ensure product cards are properly sized on mobile */
        .product-card {
          min-height: 320px !important; /* Increased from 200px for better mobile spacing */
          padding: 12px !important; /* Added padding for better spacing */
        }
        
        .product-image-container {
          background: #fff !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
      }
      
      /* Ensure badges show on desktop screens */
      @media (min-width: 577px) {
        .mobile-badge {
          display: none !important;
        }
        .desktop-badge {
          display: flex !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
      }
    `
    document.head.appendChild(style)
    
    return () => {
      const existingStyle = document.getElementById('amazons-choice-badges')
      if (existingStyle) {
        document.head.removeChild(existingStyle)
      }
    }
  }, [])
  
  // Essential state for functionality
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isLoadingRequest, setIsLoadingRequest] = useState(false) // Track active requests
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(decodeURIComponent(searchParams.get('cat') || 'all'))
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [lastFetchKey, setLastFetchKey] = useState('')
  const [badgeRotation, setBadgeRotation] = useState(0) // For rotating badges
  const [dataSource, setDataSource] = useState('') // Track data source for debugging
  
  // Pagination state
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [productsPerPage] = useState(100) // Show 100 products per page

  // Context hooks
  const { formatPrice } = useCurrency()
  const { addToBasket, isInBasket } = useBasket()
  const { isLoggedIn: isAdminContextLoggedIn } = useAdmin()

  // Badge generator - Amazon's Choice + unique rotating badge per product
  const getProductBadges = (product, index) => {
    // Always show Amazon's Choice as primary badge
    const amazonChoice = { text: "Amazon's Choice", color: '#ff6600', icon: '✓' }
    
    // Unique badges for each product (based on index)
    const uniqueBadges = [
      { text: 'Best Seller', color: '#e74c3c', icon: '🏆' },
      { text: 'Top Rated', color: '#f39c12', icon: '⭐' },
      { text: 'Hot Deal', color: '#e91e63', icon: '💥' },
      { text: 'Limited Time', color: '#3498db', icon: '⚡' },
      { text: 'Trending', color: '#1abc9c', icon: '📈' },
      { text: 'New Arrival', color: '#27ae60', icon: '✨' },
      { text: 'Very Popular', color: '#9b59b6', icon: '💎' },
      { text: 'Staff Pick', color: '#e67e22', icon: '🔥' }
    ]
    
    // Get unique badge for this product (consistent per product)
    const uniqueBadge = uniqueBadges[index % uniqueBadges.length]
    
    // Rotate between Amazon's Choice and unique badge
    const showAmazonChoice = badgeRotation % 2 === 0
    
    return {
      primary: amazonChoice,
      secondary: uniqueBadge,
      current: showAmazonChoice ? amazonChoice : uniqueBadge
    }
  }

  // Pagination - now using server-side pagination
  const currentProducts = products // Use products directly from API
  
  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page)
    // Update URL with new page
    const newSearchParams = new URLSearchParams(searchParams)
    newSearchParams.set('page', page.toString())
    navigate(`?${newSearchParams.toString()}`, { replace: true })
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Fetch products with server-side filtering and pagination
  const fetchProducts = async (category = null, search = null, page = 1) => {
    try {
      // Create a key for this fetch to avoid duplicate requests
      const fetchKey = `${category || 'all'}-${search || ''}-${page}`
      
      // Skip if we just fetched the same data and we have products
      if (fetchKey === lastFetchKey && products.length > 0 && !loading) {
        console.log('Skipping duplicate fetch for:', fetchKey)
        return
      }
      
      // Prevent multiple simultaneous requests
      if (isLoadingRequest) {
        console.log('Request already in progress, skipping:', fetchKey)
        return
      }
      
      console.log('Fetching products for:', fetchKey)
      
      // Set loading states
      setLoading(true)
      setIsLoadingRequest(true)
      
      // Build API parameters
      const params = new URLSearchParams()
      params.append('isAmazonsChoice', 'true') // Always filter for Amazon Choice products
      params.append('limit', productsPerPage.toString()) // Use our products per page
      params.append('page', page.toString()) // Add page parameter
      
      // Add image optimization parameters for mobile
      params.append('imageWidth', '300')
      params.append('imageHeight', '300')
      params.append('imageQuality', 'auto')
      params.append('imageFormat', 'auto')
      
      if (category && category !== 'all') {
        params.append('category', category)
      }
      if (search) {
        params.append('search', search)
      }
      
      // Use proper API URL for both development and production with timeout
      const baseApiUrl = process.env.NODE_ENV === 'production' 
        ? 'https://generic-wholesale-backend.onrender.com/api' 
        : 'http://localhost:5000/api';
      const apiUrl = `${baseApiUrl}/products/public?${params.toString()}`
      
      // Production optimization: Add timeout and retry logic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(apiUrl, {
        headers: { 
          'Accept': 'application/json',
          'Cache-Control': process.env.NODE_ENV === 'production' ? 'max-age=300' : 'no-cache' // 5 min cache in production
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.products && data.products.length > 0) {
          // Simplified: All prices in GBP (£) only - use actual database price
          const transformedProducts = data.products.map(p => {
            // Debug specific products
            const isWatchStrap = p.name && p.name.toLowerCase().includes('leather watch strap');
            
            return {
              id: p._id,
              name: p.name,
              asin: p.asin, // Ensure ASIN is included for image loading
              // Store the raw database price (this might be per-unit or total price)
              price: `£${parseFloat(p.price || 0).toFixed(2)}`,
              rawPrice: parseFloat(p.price || 0), // Keep raw number for calculations
              originalPrice: p.originalPrice ? `£${parseFloat(p.originalPrice).toFixed(2)}` : null,
              category: p.category,
              brand: p.brand,
              image: (() => {
                // Use Cloudinary URL directly - prioritize database images first
                let imageUrl = '';
                
                // Priority 1: Use images array first element (most reliable - from database)
                if (p.images && p.images.length > 0 && p.images[0]) {
                  imageUrl = p.images[0];
                }
                // Priority 2: Use image field (single image from database)
                else if (p.image) {
                  imageUrl = p.image;
                }
                // Priority 3: Fallback to ASIN-based URL if no images in database
                else if (p.asin && p.asin.match(/^[A-Z0-9]{10}$/)) {
                  // Construct Cloudinary URL with optimizations as fallback - use c_fit to show full image
                  imageUrl = `https://res.cloudinary.com/dtuq3tvjx/image/upload/w_300,h_300,c_fit,f_auto,q_auto/products/${p.asin}`;
                }
                
                return imageUrl || '';
              })(),
              images: p.images || [],
              rating: p.rating || 4.5,
              reviews: p.reviews || 0,
              stock: p.stock || 0,
              discount: p.discount || 0,
              dealUnits: (() => {
                // Try multiple sources for platform units
                let platformUnits = p.platformUnits;
                
                // If no platformUnits, check if it's in profit evaluation or other fields
                if (!platformUnits && p.profitEvaluation?.platformUnits) {
                  platformUnits = p.profitEvaluation.platformUnits;
                }
                
                // If still no platformUnits, check platform comparison data
                if (!platformUnits && p.platformComparison && p.platformComparison.length > 0) {
                  // Try to get units from platform comparison
                  const firstPlatform = p.platformComparison[0];
                  if (firstPlatform.units) {
                    platformUnits = firstPlatform.units;
                  }
                }
                
                // If we found platformUnits, calculate dealUnits
                if (platformUnits && platformUnits > 0) {
                  const calculatedDealUnits = Math.floor(platformUnits / 12);
                  return calculatedDealUnits;
                }
                
                // If no platformUnits found anywhere, check if the existing dealUnits looks like it might be correct
                // (i.e., if it's already been calculated and stored)
                if (p.dealUnits && p.dealUnits > 1 && p.dealUnits < 1000) {
                  // Use the existing dealUnits value (it might already be calculated correctly)
                  return p.dealUnits;
                }
                
                // Final fallback - calculate from default platformUnits
                const defaultPlatformUnits = 2400;
                const fallbackDealUnits = Math.floor(defaultPlatformUnits / 12);
                
                return fallbackDealUnits;
              })(), // Auto-calculate as platformUnits / 12
              platformUnits: p.platformUnits, // Also include platformUnits for debugging
              currency: 'GBP',
              isAmazonsChoice: true,
              // Include profit data from database
              profitCalculations: p.profitCalculations || null,
              evaluation: p.evaluation || null,
              profitEvaluation: p.profitEvaluation || null
            };
          })
          
          // Setting products state with pagination info
          setProducts(transformedProducts)
          setFilteredProducts(transformedProducts)
          setTotalPages(data.totalPages || 1)
          setTotalProducts(data.total || transformedProducts.length)
          setLoading(false)
          setIsLoadingRequest(false)
          setHasLoadedOnce(true)
          setLastFetchKey(fetchKey)
          setDataSource(data.source || 'unknown')
          
          // Preload images for better performance in production
          if (transformedProducts.length > 0 && process.env.NODE_ENV === 'production') {
            productionImageLoader.preloadCriticalImages(transformedProducts, 30);
          }
          
        } else {
          // No Amazon Choice products found in database
          setProducts([])
          setFilteredProducts([])
          setTotalPages(1)
          setTotalProducts(0)
          setLoading(false)
          setIsLoadingRequest(false)
        }
      } else {
        throw new Error(`Failed to fetch products: ${response.status}`)
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      
      // Production: Retry logic for network errors
      if (process.env.NODE_ENV === 'production' && error.name !== 'AbortError') {
        console.log('🔄 Retrying product fetch...');
        try {
          // Retry with simpler parameters
          const retryParams = new URLSearchParams()
          retryParams.append('isAmazonsChoice', 'true')
          retryParams.append('limit', '50') // Smaller batch for retry
          
          const retryUrl = `${process.env.NODE_ENV === 'production' 
            ? 'https://generic-wholesale-backend.onrender.com/api' 
            : 'http://localhost:5000/api'}/products/public?${retryParams.toString()}`
          
          const retryResponse = await fetch(retryUrl, {
            headers: { 'Accept': 'application/json' }
          })
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json()
            if (retryData.products && retryData.products.length > 0) {
              // Process retry data same way
              const transformedProducts = retryData.products.map(p => {
                return {
                  id: p._id,
                  name: p.name,
                  asin: p.asin,
                  price: `£${parseFloat(p.price || 0).toFixed(2)}`,
                  rawPrice: parseFloat(p.price || 0),
                  originalPrice: p.originalPrice ? `£${parseFloat(p.originalPrice).toFixed(2)}` : null,
                  category: p.category,
                  brand: p.brand,
                  image: (() => {
                    // Use database images first, then fallback to ASIN
                    let imageUrl = '';
                    if (p.images && p.images.length > 0 && p.images[0]) {
                      imageUrl = p.images[0];
                    } else if (p.image) {
                      imageUrl = p.image;
                    } else if (p.asin && p.asin.match(/^[A-Z0-9]{10}$/)) {
                      imageUrl = `https://generic-wholesale-backend.onrender.com/api/admin-excel/public/images/by-asin/${p.asin}`;
                    }
                    // Ensure HTTPS in production
                    if (imageUrl && imageUrl.startsWith('http://') && !imageUrl.includes('localhost')) {
                      imageUrl = imageUrl.replace('http://', 'https://');
                    }
                    return imageUrl || '';
                  })(),
                  images: p.images || [],
                  rating: p.rating || 4.5,
                  reviews: p.reviews || 0,
                  stock: p.stock || 0,
                  discount: p.discount || 0,
                  dealUnits: Math.floor((p.platformUnits || 2400) / 12),
                  platformUnits: p.platformUnits,
                  currency: 'GBP',
                  isAmazonsChoice: true,
                  profitCalculations: p.profitCalculations || null,
                  evaluation: p.evaluation || null,
                  profitEvaluation: p.profitEvaluation || null
                };
              })
              
              setProducts(transformedProducts)
              setFilteredProducts(transformedProducts)
              setTotalPages(retryData.totalPages || 1)
              setTotalProducts(retryData.total || transformedProducts.length)
              setLoading(false)
              setIsLoadingRequest(false)
              setHasLoadedOnce(true)
              setLastFetchKey(fetchKey)
              setDataSource('retry')
              return
            }
          }
        } catch (retryError) {
          console.error('❌ Retry also failed:', retryError);
        }
      }
      
      // If all fails, show user-friendly error
      alert('Failed to load products. Please check your internet connection and refresh the page.')
      setProducts([])
      setLoading(false)
      setIsLoadingRequest(false)
    }
  }

  // Server-side filtering - fetch products with filters and pagination
  const applyFilters = async (category, search, page = currentPage) => {
    await fetchProducts(category, search, page)
  }

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

  // Badge rotation timer - change badges every 1.2 seconds (balanced speed)
  useEffect(() => {
    const interval = setInterval(() => {
      setBadgeRotation(prev => prev + 1)
    }, 1200) // 1.2 seconds - balanced rotation speed

    return () => clearInterval(interval)
  }, [])

  // Handle URL parameters and trigger server-side filtering
  useEffect(() => {
    const catParam = decodeURIComponent(searchParams.get('cat') || 'all')
    const searchParam = searchParams.get('search') || ''
    const pageParam = parseInt(searchParams.get('page')) || 1
    
    // Log device info for debugging mobile issues (only once)
    if (!hasLoadedOnce) {
      logDeviceInfo()
    }
    
    // Update state
    setSelectedCategory(catParam)
    setSearchQuery(searchParam)
    setCurrentPage(pageParam)
    
    // Only fetch if parameters have actually changed or it's the first load
    const newFetchKey = `${catParam}-${searchParam}-${pageParam}`
    if (newFetchKey !== lastFetchKey || !hasLoadedOnce) {
      // Fetch products with filters and pagination
      applyFilters(catParam, searchParam, pageParam)
    }
  }, [searchParams, hasLoadedOnce, lastFetchKey])

  // Health check on component mount with production optimizations
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const baseApiUrl = process.env.NODE_ENV === 'production' 
          ? 'https://generic-wholesale-backend.onrender.com/api' 
          : 'http://localhost:5000/api';
        const healthUrl = `${baseApiUrl}/health`;
        
        // Production: Add timeout and connection check
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(healthUrl, {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        clearTimeout(timeoutId);
        const healthData = await response.json();
        
        // In production, log connection quality
        if (process.env.NODE_ENV === 'production') {
          console.log('🌐 API Health:', healthData.tests?.query?.productCount || 0, 'products available');
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'production') {
          console.warn('⚠️ API health check failed - may affect image loading');
        }
      }
    };
    
    checkApiHealth();
  }, []);

  // Initial load - will be triggered by URL params useEffect

  // Loading state
  if (loading) {
    return (
      <div className="container products-container enhanced-container" style={{
        maxWidth: '100%', 
        padding: windowWidth < 576 ? '0 10px' : '0 15px', 
        marginTop: '0px',
        width: '100%'
      }}>
        <ScrollToTop />
        
        {/* Enhanced Loading Message */}
        <div style={{
          textAlign: 'center',
          padding: windowWidth < 576 ? '30px 15px' : '40px 20px', // Adjusted for mobile
          fontSize: windowWidth < 576 ? '16px' : '18px', // Smaller on mobile
          color: '#ff6600',
          background: 'linear-gradient(135deg, #fff8f5 0%, #ffede0 100%)', // Enhanced gradient
          borderRadius: windowWidth < 576 ? '12px' : '15px', // Adjusted for mobile
          border: '2px solid #ff6600',
          boxShadow: '0 8px 25px rgba(255, 102, 0, 0.2)',
          margin: windowWidth < 576 ? '15px 0' : '20px 0', // Adjusted margin
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background decoration */}
          <div style={{
            position: 'absolute',
            top: '-30%',
            left: '-30%',
            width: '60%',
            height: '60%',
            background: 'radial-gradient(circle, rgba(255, 102, 0, 0.05) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              fontSize: windowWidth < 576 ? '1.5rem' : '2rem', // Smaller on mobile
              marginBottom: '15px',
              animation: 'spin 2s linear infinite',
              filter: 'drop-shadow(0 2px 4px rgba(255, 102, 0, 0.3))'
            }}>
              🔄
            </div>
            <div style={{
              fontWeight: '700',
              textShadow: '0 2px 4px rgba(255, 102, 0, 0.3)',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              Loading Amazing Products...
            </div>
            <div style={{
              fontSize: windowWidth < 576 ? '11px' : '12px', // Smaller on mobile
              marginTop: '8px',
              color: '#cc3300',
              fontWeight: '500',
              opacity: 0.9
            }}>
              Fetching the best deals for you!
            </div>
          </div>
        </div>
        
        {/* Skeleton Loaders Grid */}
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
          {Array.from({ length: productsPerPage }).map((_, index) => (
            <NewProductCardSkeleton key={index} />
          ))}
        </div>
      </div>
    )
  }

  // No products state - only show if we've tried loading and have no products
  if (!loading && products.length === 0 && hasLoadedOnce) {
    return (
      <div className="container products-container enhanced-container" style={{
        maxWidth: '100%', 
        padding: windowWidth < 576 ? '0 10px' : '0 15px', 
        marginTop: '0px',
        width: '100%'
      }}>
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
      <div className="container products-container enhanced-container" style={{
        maxWidth: '100%', 
        padding: windowWidth < 576 ? '0 20px' : '0 15px', // Increased mobile padding from 15px to 20px
        marginTop: '0px', 
        marginBottom: '0px',
        width: '100%'
      }}>
        <ScrollToTop />
        <ProductionStatus />

        {/* Data Source Indicator for Debugging - Only show for problematic sources */}
        {dataSource && dataSource !== 'database' && dataSource !== 'fast' && dataSource !== 'database_random' && (
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
                setIsLoadingRequest(false);
                setDataSource('');
                setLastFetchKey(''); // Reset fetch key to allow refetch
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

        {/* Enhanced Product Count Header */}
        {!loading && currentProducts.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: windowWidth < 576 ? '10px' : '10px', // Consistent margin
            padding: windowWidth < 576 ? '15px 20px' : '15px 20px', // Increased mobile padding
            background: 'linear-gradient(135deg, #ff6600 0%, #ff3300 100%)',
            borderRadius: windowWidth < 576 ? '12px' : '12px', // Consistent radius
            color: 'white',
            boxShadow: '0 4px 15px rgba(255, 102, 0, 0.3)', // Enhanced shadow
            border: '1px solid rgba(255, 255, 255, 0.2)', // Subtle border
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background decoration */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-20%',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none'
            }} />
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: windowWidth < 576 ? '1.2rem' : '1.5rem', // Smaller on mobile
                fontWeight: '700',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)', // Better text shadow
                letterSpacing: '0.5px' // Improved letter spacing
              }}>
                🏆 Amazon's Choice Products
              </h2>
              <p style={{ 
                margin: '4px 0 0 0', 
                fontSize: windowWidth < 576 ? '0.8rem' : '0.9rem', // Smaller on mobile
                opacity: 0.95, // Slightly more opaque
                fontWeight: '500',
                color: 'white', // Explicitly white for mobile
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' // Text shadow for better readability
              }}>
                Showing {products.length} of {totalProducts.toLocaleString()} products
                {currentPage > 1 && ` (Page ${currentPage} of ${totalPages})`}
              </p>
            </div>
            <div style={{
              fontSize: windowWidth < 576 ? '1.5rem' : '2rem', // Smaller on mobile
              opacity: 0.8,
              position: 'relative',
              zIndex: 1,
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))' // Enhanced icon shadow
            }}>
              ✨
            </div>
          </div>
        )}

        {/* Enhanced Products Grid */}
        <div id="products-grid" style={{
          display: 'grid', 
          gridTemplateColumns:windowWidth < 576 ? 'repeat(2, 1fr)' : 
                              windowWidth < 768 ? 'repeat(4, 1fr)' : 
                              windowWidth < 992 ? 'repeat(5, 1fr)' : 
                              windowWidth < 1200 ? 'repeat(6, 1fr)' :
                              windowWidth < 1400 ? 'repeat(7, 1fr)' :
                              'repeat(8, 1fr)', 
          gap: windowWidth < 576 ? '8px' : '15px',
          maxWidth: '100%',
          width: '100%',
          margin: '0 auto',
          padding: windowWidth < 576 ? '8px' : '10px',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 248, 245, 0.95) 100%)', // Enhanced gradient
          borderRadius: windowWidth < 576 ? '10px' : '15px',
          boxShadow: '0 8px 25px rgba(255, 102, 0, 0.12)', // Softer shadow
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 102, 0, 0.15)', // Softer border
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(255, 102, 0, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 51, 0, 0.03) 0%, transparent 50%)',
            pointerEvents: 'none',
            zIndex: 0
          }} />
          
          <div style={{ position: 'relative', zIndex: 1, display: 'contents' }}>
          {currentProducts.map((product, index) => (
            <div 
              key={product.id} 
              className="product-card enhanced-card"
              onClick={() => {
                // Get the unique badge for this product (consistent with badge display)
                const badges = getProductBadges(product, index)
                const uniqueBadge = badges.secondary // Use the unique badge for this product
                
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
                  badgeIcon: uniqueBadge.icon,
                  // Also pass Amazon's Choice info
                  isAmazonsChoice: 'true'
                })
                navigate(`/product/${product.id}?${params.toString()}`)
              }}
              style={{
                cursor: 'pointer',
                background: '#ffffff',
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
                height: windowWidth < 576 ? '140px' : '160px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: '#fff',
                padding: windowWidth < 576 ? '10px' : '15px',
                margin: '0px',
                overflow: 'visible'
              }}>
                <ProductImage
                  src={product.image}
                  alt={product.name}
                  asin={product.asin} // Pass ASIN for Cloudinary fallback
                  priority={index < 20} // Prioritize first 20 images
                  loading={index < 8 ? "eager" : "lazy"} // Eager load first 8, lazy load rest
                  fallbackSrc={product.images && product.images[1]} // Use second image as fallback
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    padding: '0px',
                    margin: '0 auto',
                    display: 'block'
                  }} 
                />
                
                {/* SIMPLIFIED BADGE - Always visible on all devices */}
                {(() => {
                  const badges = getProductBadges(product, index)
                  const currentBadge = badges.current
                  const isMobile = windowWidth <= 576
                  
                  return (
                    <span 
                      className={isMobile ? 'mobile-badge' : 'desktop-badge'}
                      style={{
                        backgroundColor: currentBadge.color
                      }}
                    >
                      <span style={{fontSize: '4px'}}>{currentBadge.icon}</span>
                      <span>{currentBadge.text}</span>
                    </span>
                  )
                })()}

              </div>
              
              <div className="product-info" style={{padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: '3px'}}>
                <h5 style={{
                  fontSize: windowWidth < 576 ? '12px' : '10px', // Increased mobile font size from 11px to 12px for better readability
                  fontWeight: '700', 
                  margin: 0, 
                  lineHeight: '1.3', 
                  height: windowWidth < 576 ? '32px' : '22px', // Increased mobile height from 26px to 32px to show full title
                  overflow: 'hidden',
                  color: '#1a1a1a',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  transition: 'color 0.3s ease',
                  marginBottom: '2px', // Add small margin
                  display: '-webkit-box', // Enable multi-line text truncation
                  WebkitLineClamp: windowWidth < 576 ? 2 : 2, // Allow 2 lines on mobile
                  WebkitBoxOrient: 'vertical'
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
                
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '3px', marginTop: '1px'}}>
                  {/* Left side - Compact Enhanced Price */}
                  <div style={{
                    fontWeight: '800', 
                    fontSize: windowWidth < 576 ? '16px' : '9px', // Increased mobile font size from 12px to 16px for much better visibility
                    color: '#ff3300',
                    background: 'linear-gradient(135deg, #fff5f0 0%, #ffebe0 100%)',
                    padding: windowWidth < 576 ? '4px 8px' : '1px 3px', // Increased mobile padding
                    borderRadius: windowWidth < 576 ? '6px' : '3px', // Increased mobile border radius
                    border: '1px solid #ff6600',
                    textShadow: '0 1px 2px rgba(255, 51, 0, 0.3)',
                    boxShadow: '0 1px 3px rgba(255, 102, 0, 0.15)', // Lighter shadow
                    whiteSpace: 'nowrap',
                    maxWidth: 'fit-content',
                    margin: windowWidth < 576 ? '4px 0' : '2px 0' // Added margin for mobile
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

                      // For new products, check if they have a valid price to calculate profit from
                      const productPrice = parseFloat(String(product.price || 0).replace(/[£₨$€]/g, '')) || 0;
                      if (productPrice > 0) {
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
                      
                      // If no database profit data exists, calculate based on product price
                      if (profitPerUnit === 0) {
                        const productName = product.name?.toLowerCase() || '';
                        
                        // First check for hardcoded profits for specific products
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
                        } else {
                          // For new products without profit data, calculate based on price and standard markup
                          const productPrice = parseFloat(String(product.price || 0).replace(/[£₨$€]/g, '')) || 0;
                          
                          if (productPrice > 0) {
                            // Convert price to GBP if it's in other currency
                            let costPriceGBP = productPrice;
                            const isPKR = String(product.price).includes('₨') || String(product.price).includes('Rs');
                            const isGBP = String(product.price).includes('£');
                            
                            if (isPKR) {
                              costPriceGBP = productPrice * 0.00272; // Convert PKR to GBP
                            } else if (!isGBP) {
                              // If no currency symbol, assume it's GBP
                              costPriceGBP = productPrice;
                            }
                            
                            // Calculate profit assuming 200% markup (selling price = cost * 3)
                            // So profit per unit = cost * 2
                            profitPerUnit = costPriceGBP * 2;
                          }
                        }
                      }
                      
                      return parseFloat(profitPerUnit) || 0;
                    };

                    // Calculate dynamic width based on profit values for mobile
                    const calculateDynamicWidth = (value, isMobile = false) => {
                      if (!isMobile) return 'auto';
                      
                      const valueStr = value.toString();
                      const baseWidth = 60; // Base width in pixels
                      const charWidth = 6; // Approximate width per character
                      const calculatedWidth = baseWidth + (valueStr.length * charWidth);
                      
                      // Set minimum and maximum widths
                      const minWidth = 70;
                      const maxWidth = 120;
                      
                      return `${Math.min(Math.max(calculatedWidth, minWidth), maxWidth)}px`;
                    };

                    const profitPerUnit = getProfitPerUnit();
                    const dealUnits = product.dealUnits || 1;
                    const totalProfit = profitPerUnit * dealUnits;

                    // Don't show if profit is 0 or invalid
                    if (profitPerUnit <= 0) {
                      return null;
                    }

                    // Calculate dynamic widths for mobile
                    const profitPerUnitWidth = calculateDynamicWidth(profitPerUnit.toFixed(2), windowWidth < 576);
                    const totalProfitWidth = calculateDynamicWidth(totalProfit.toFixed(2), windowWidth < 576);

                    // Calculated profit for product

                    return (
                      <div style={{
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'flex-start',
                        gap: '2px', // Increased gap from 1px to 2px
                        marginLeft: windowWidth < 576 ? '0px' : '2px', // Moved to left edge on mobile, keep desktop margin
                        marginTop: windowWidth < 576 ? '8px' : '2px' // Increased mobile margin from 6px to 8px
                      }}>
                        {/* Profit per unit */}
                        <div style={{
                          fontSize: windowWidth < 576 ? '10px' : '8px', // Reduced mobile font size from 12px to 10px for better fit
                          color: '#ff6600',
                          fontWeight: '700',
                          background: 'rgba(255, 102, 0, 0.1)',
                          padding: windowWidth < 576 ? '3px 5px' : '2px 3px', // Increased mobile padding
                          borderRadius: windowWidth < 576 ? '4px' : '3px', // Increased mobile border radius
                          border: '1px solid rgba(255, 102, 0, 0.3)',
                          whiteSpace: 'nowrap',
                          minWidth: windowWidth < 576 ? profitPerUnitWidth : 'auto', // Dynamic width for mobile
                          width: windowWidth < 576 ? profitPerUnitWidth : 'auto', // Dynamic width for mobile
                          textAlign: 'center' // Center text in dynamic width box
                        }}>
                          💰 £{profitPerUnit.toFixed(2)}/unit
                        </div>
                        
                        {/* Profit for deal units */}
                        <div style={{
                          fontSize: windowWidth < 576 ? '10px' : '8px', // Reduced mobile font size from 12px to 10px for better fit
                          color: '#ff6600',
                          fontWeight: '700',
                          background: 'rgba(255, 102, 0, 0.1)',
                          padding: windowWidth < 576 ? '3px 5px' : '2px 3px', // Increased mobile padding
                          borderRadius: windowWidth < 576 ? '4px' : '3px', // Increased mobile border radius
                          border: '1px solid rgba(255, 102, 0, 0.3)',
                          whiteSpace: 'nowrap',
                          minWidth: windowWidth < 576 ? totalProfitWidth : '60px', // Dynamic width for mobile
                          width: windowWidth < 576 ? totalProfitWidth : 'auto', // Dynamic width for mobile
                          textAlign: 'center' // Center text in dynamic width box
                        }}>
                          📈 £{totalProfit.toFixed(2)}/{dealUnits}units
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Deal Units Display - Moved Down for Mobile */}
                <div style={{ marginTop: windowWidth < 576 ? '5px' : '3px' }}> {/* Increased mobile margin from 4px to 5px */}
                  <div style={{
                    background: 'linear-gradient(135deg, #fff5f0 0%, #ffebe0 100%)', 
                    padding: windowWidth < 576 ? '5px 7px' : '2px 3px', // Increased mobile padding
                    borderRadius: windowWidth < 576 ? '6px' : '4px', // Increased mobile border radius
                    border: '1px solid #ff6600', 
                    boxShadow: '0 1px 4px rgba(255, 102, 0, 0.15)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minWidth: windowWidth < 576 ? '100%' : 'auto', // Full width on mobile
                    width: windowWidth < 576 ? '100%' : 'auto', // Full width on mobile
                    gap: windowWidth < 576 ? '6px' : '4px', // Increased mobile gap
                    minHeight: windowWidth < 576 ? '28px' : 'auto' // Increased minimum height from 24px to 28px for mobile
                  }}>
                    <div style={{
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '3px',
                      flex: 1,
                      minWidth: 0 // Allow text to wrap if needed
                    }}>
                      <span style={{
                        fontSize: windowWidth < 576 ? '11px' : '8px', // Reduced mobile font size from 14px to 11px to fit in container
                        color: '#cc3300', 
                        fontWeight: '700',
                        whiteSpace: 'nowrap'
                      }}>
                        💰 Deal of {product.dealUnits || 1} unit{(product.dealUnits || 1) !== 1 ? 's' : ''}:
                      </span>
                      <span style={{
                        fontSize: windowWidth < 576 ? '11px' : '8px', // Reduced mobile font size from 14px to 11px to fit in container
                        fontWeight: '800', 
                        color: '#ff3300',
                        whiteSpace: 'nowrap',
                        minWidth: (() => {
                          if (windowWidth >= 576) return '45px';
                          
                          // Calculate dynamic width for mobile based on price
                          try {
                            const unitPrice = product.rawPrice || 0;
                            const dealUnits = product.dealUnits || 1;
                            const totalPrice = unitPrice * dealUnits;
                            const priceStr = `£${totalPrice.toFixed(2)}`;
                            
                            // Base width + character width calculation
                            const baseWidth = 50;
                            const charWidth = 7;
                            const calculatedWidth = baseWidth + (priceStr.length * charWidth);
                            
                            // Set minimum and maximum widths for mobile
                            const minWidth = 60;
                            const maxWidth = 100;
                            
                            return `${Math.min(Math.max(calculatedWidth, minWidth), maxWidth)}px`;
                          } catch (error) {
                            return '60px'; // Fallback width
                          }
                        })(),
                        display: 'inline-block', // Ensure minWidth works
                        textAlign: 'center' // Center text in dynamic width
                      }}>
                        {(() => {
                          try {
                            // Use raw price (per unit) from database
                            const unitPrice = product.rawPrice || 0;
                            const dealUnits = product.dealUnits || 1;
                            const totalPrice = unitPrice * dealUnits;
                            
                            if (isNaN(totalPrice)) return product.price;
                            
                            // Always use GBP (£) currency
                            return `£${totalPrice.toFixed(2)}`;
                          } catch (error) {
                            return product.price;
                          }
                        })()}
                      </span>
                    </div>
                    
                    {/* Basket button - Desktop: Orange Circle, Mobile: Rectangular */}
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
                        // Desktop: Perfect circle, Mobile: Rectangular
                        padding: windowWidth < 576 ? '3px 4px' : '0', // No padding for desktop circle
                        borderRadius: windowWidth < 576 ? '4px' : '50%', // Circle for desktop, rounded rect for mobile
                        fontSize: windowWidth < 576 ? '8px' : '9px', // Smaller icon for smaller desktop circle (reduced from 10px)
                        cursor: 'pointer',
                        boxShadow: windowWidth < 576 ? 
                          '0 2px 4px rgba(255, 102, 0, 0.3)' : 
                          '0 3px 8px rgba(255, 102, 0, 0.4)', // Stronger shadow for desktop circle
                        transition: 'all 0.2s ease',
                        // Desktop: Perfect circle dimensions, Mobile: Rectangular
                        minWidth: windowWidth < 576 ? '22px' : '20px', // Smaller circle for desktop (reduced from 28px)
                        width: windowWidth < 576 ? 'auto' : '20px', // Fixed width for desktop circle (reduced from 28px)
                        height: windowWidth < 576 ? '20px' : '20px', // Perfect circle for desktop (reduced from 28px)
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        // Desktop circle specific styles
                        ...(windowWidth >= 576 && {
                          position: 'relative',
                          overflow: 'hidden'
                        })
                      }}
                      onMouseEnter={(e) => {
                        if (windowWidth < 576) {
                          // Mobile hover
                          e.target.style.transform = 'scale(1.1)';
                          e.target.style.boxShadow = '0 2px 6px rgba(255, 102, 0, 0.4)';
                        } else {
                          // Desktop hover - appropriate scale for smaller circle
                          e.target.style.transform = 'scale(1.1)'; // Reduced from 1.15
                          e.target.style.boxShadow = '0 3px 8px rgba(255, 102, 0, 0.5)'; // Adjusted shadow
                          e.target.style.background = isInBasket(product.id) ? 
                            'linear-gradient(135deg, #059669 0%, #047857 100%)' : 
                            'linear-gradient(135deg, #ff3300 0%, #cc2900 100%)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (windowWidth < 576) {
                          // Mobile hover reset
                          e.target.style.transform = 'scale(1)';
                          e.target.style.boxShadow = '0 1px 3px rgba(255, 102, 0, 0.3)';
                        } else {
                          // Desktop hover reset
                          e.target.style.transform = 'scale(1)';
                          e.target.style.boxShadow = '0 2px 6px rgba(255, 102, 0, 0.4)'; // Adjusted shadow for smaller circle
                          e.target.style.background = isInBasket(product.id) ? 
                            'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                            'linear-gradient(135deg, #ff6600 0%, #ff3300 100%)';
                        }
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
                      // Mobile-specific enhancements - INCREASED SIZES
                      ...(windowWidth < 576 && {
                        minHeight: '26px', // Increased from 22px
                        fontSize: '10px', // Increased from 9px
                        padding: '7px 8px' // Increased padding
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
        </div>

        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={productsPerPage}
            totalItems={totalProducts}
            showInfo={true}
            size="md"
          />
        )}
      </div>
  )
}

export default AmazonsChoice