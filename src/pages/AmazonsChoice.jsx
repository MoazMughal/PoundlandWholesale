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

const AmazonsChoice = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Critical mobile fixes for Amazon Choice page
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'amazons-choice-mobile-fix'
    style.textContent = `
      /* CRITICAL MOBILE FIXES - ENHANCED VERSION */
      @media (max-width: 576px) {
        /* Container */
        .products-container {
          padding: 0 8px !important;
          margin: 0 !important;
          width: 100% !important;
        }
        
        /* Grid - Force 2 columns */
        #products-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 8px !important;
          padding: 8px 4px !important;
          margin: 0 !important;
          width: 100% !important;
          background: transparent !important;
        }
        
        /* Cards - Compact but readable */
        .product-card, .enhanced-card {
          display: flex !important;
          flex-direction: column !important;
          background: white !important;
          border: 2px solid #ff6600 !important;
          border-radius: 8px !important;
          padding: 6px !important;
          min-height: 280px !important;
          max-height: 320px !important;
          width: 100% !important;
          position: relative !important;
          overflow: hidden !important;
          box-shadow: 0 2px 8px rgba(255, 102, 0, 0.2) !important;
          margin: 0 !important;
        }
        
        /* Images */
        .product-image-container {
          height: 90px !important;
          min-height: 90px !important;
          max-height: 90px !important;
          width: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: #fff !important;
          margin-bottom: 6px !important;
          padding: 4px !important;
        }
        
        .product-image-container img {
          max-width: 80px !important;
          max-height: 80px !important;
          width: auto !important;
          height: auto !important;
          object-fit: contain !important;
        }
        
        /* Product Info - MINIMAL SPACING */
        .product-info {
          flex: 1 !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 1px !important; /* Reduced gap further */
          padding: 1px !important; /* Reduced padding further */
          overflow: hidden !important;
          background: transparent !important;
        }
        
        /* Title - FULLY VISIBLE */
        .product-info h5 {
          font-size: 10px !important;
          line-height: 1.2 !important;
          font-weight: 600 !important;
          margin: 0 !important;
          height: 48px !important; /* Increased height for mobile title visibility */
          overflow: hidden !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 3 !important;
          -webkit-box-orient: vertical !important;
          color: #1a1a1a !important;
          background: transparent !important;
          z-index: 1 !important;
          position: relative !important;
          padding: 1px 2px !important;
        }
        
        /* FORCE ALL PRICE AND PROFIT ELEMENTS TO BE VISIBLE AND LARGER */
        
        /* Unit Price - MINIMAL SPACING */
        .product-info div[style*="/unit"] {
          font-size: 10px !important;
          font-weight: 700 !important;
          padding: 3px 5px !important;
          margin: 0 !important; /* Removed margin */
          border-radius: 4px !important;
          text-align: center !important;
          background: #fff8dc !important;
          color: #ff6600 !important;
          border: 1px solid #ffe4b5 !important;
          min-width: 70px !important;
          max-width: 100px !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          box-shadow: 0 1px 2px rgba(255, 228, 181, 0.2) !important;
          width: fit-content !important;
        }
        
        /* Profit containers - MINIMAL SPACING */
        .product-info > div[style*="flexDirection: column"] {
          display: flex !important;
          flex-direction: column !important;
          gap: 0px !important; /* Removed gap */
          margin: 0 !important; /* Removed margin */
          visibility: visible !important;
          opacity: 1 !important;
          align-items: flex-start !important;
        }
        
        /* Profit boxes - MINIMAL SPACING */
        .product-info > div[style*="flexDirection: column"] > div {
          font-size: 9px !important;
          font-weight: 700 !important;
          padding: 2px 4px !important;
          margin: 0 !important; /* Removed margin */
          border-radius: 3px !important;
          text-align: center !important;
          background: #fff8dc !important;
          color: #ff6600 !important;
          border: 1px solid #ffe4b5 !important;
          min-width: 60px !important;
          max-width: 90px !important;
          white-space: nowrap !important;
          box-shadow: 0 1px 2px rgba(255, 228, 181, 0.2) !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: fit-content !important;
        }
        
        /* Deal container - MINIMAL SPACING */
        .product-info > div:last-of-type > div {
          font-size: 10px !important;
          font-weight: 700 !important;
          padding: 3px 5px !important;
          margin: 1px 0 !important; /* Minimal margin */
          border-radius: 4px !important;
          background: #fff8dc !important;
          color: #ff6600 !important;
          border: 1px solid #ffe4b5 !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          gap: 8px !important;
          min-height: 20px !important;
          max-height: 22px !important;
          box-shadow: 0 1px 3px rgba(255, 228, 181, 0.3) !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Deal Text - ADJUSTED FONT SIZES */
        .product-info span[style*="Deal"] {
          font-size: 8px !important; /* Decreased mobile font size from 9px to 8px */
          font-weight: 700 !important;
          color: #ff6600 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          flex: 1 !important;
          max-width: calc(100% - 50px) !important; /* More space for price */
        }
        
        /* Price in Deal Section - MOBILE POSITIONING */
        .product-info span[style*="£"] {
          font-size: 8px !important; /* Decreased mobile font size from 9px to 8px */
          font-weight: 700 !important;
          color: #ff6600 !important;
          white-space: nowrap !important;
          min-width: 35px !important; /* Reduced for mobile */
          text-align: left !important; /* Left align to move left */
          margin-left: -5px !important; /* Move left on mobile */
        }
        
        /* Basket Button - MOBILE SMALL CIRCLE - CENTERED ICON */
        .product-info button {
          font-size: 7px !important; /* Reduced from 8px */
          width: 18px !important; /* Reduced from 20px */
          height: 18px !important; /* Reduced from 20px */
          min-width: 18px !important; /* Reduced from 20px */
          border-radius: 50% !important; /* Make it circular like desktop */
          background: #ff6600 !important;
          color: white !important;
          border: none !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
          box-shadow: 0 2px 4px rgba(255, 102, 0, 0.4) !important;
          visibility: visible !important;
          opacity: 1 !important;
          margin-left: 4px !important;
          padding: 0 !important; /* Remove padding for perfect centering */
          line-height: 1 !important; /* Ensure proper line height for centering */
        }
        
        /* Center the basket icon specifically */
        .product-info button i {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          height: 100% !important;
        }
        
        /* Amazon Button - LARGER */
        .product-info a[href*="amazon"] {
          font-size: 9px !important;
          padding: 6px 8px !important;
          margin-top: 4px !important;
          border-radius: 6px !important;
          min-height: 26px !important;
          font-weight: 600 !important;
          background: #1a1a1a !important;
          color: white !important;
          border: 2px solid #ff6600 !important;
          text-align: center !important;
          text-decoration: none !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 4px !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Badges - MOBILE OPTIMIZED - DYNAMIC WIDTH */
        .mobile-badge {
          position: absolute !important;
          top: 6px !important;
          right: 6px !important;
          font-size: 8px !important;
          padding: 3px 6px !important; /* Reduced horizontal padding from 8px to 6px */
          border-radius: 4px !important;
          max-width: 90px !important; /* Reduced from 100px to 90px */
          min-width: 70px !important; /* Reduced from 85px to 70px */
          z-index: 10 !important;
          font-weight: 600 !important;
          color: white !important;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5) !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
          text-align: center !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          width: fit-content !important; /* Dynamic width based on content */
        }
        
        .desktop-badge {
          display: none !important;
        }
        
        /* FORCE ALL ELEMENTS TO BE VISIBLE */
        .product-info * {
          display: inherit !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Remove hover effects on mobile */
        .product-card:hover {
          transform: none !important;
          box-shadow: 0 2px 8px rgba(255, 102, 0, 0.2) !important;
        }
      }
      
      /* Desktop Badge Styling - Show badges on laptop/desktop - TOP RIGHT OF CARD */
      @media (min-width: 577px) {
        .mobile-badge {
          display: none !important;
        }
        
        /* Position badge relative to product card, not image */
        .product-card, .enhanced-card {
          position: relative !important;
        }
        
        .desktop-badge {
          position: absolute !important;
          top: 8px !important;
          right: 8px !important;
          font-size: 8px !important; /* Decreased font size for laptop */
          padding: 3px 6px !important; /* Reduced padding to match smaller font */
          border-radius: 6px !important;
          max-width: 120px !important;
          z-index: 20 !important;
          font-weight: 600 !important;
          color: white !important;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5) !important;
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3) !important;
          display: flex !important;
          align-items: center !important;
          gap: 3px !important; /* Reduced gap to match smaller size */
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Ensure image container doesn't interfere with badge positioning */
        .product-image-container {
          position: relative !important;
          z-index: 1 !important;
        }
        
        /* Desktop Deal Text - SMALLER FONT AND BETTER SPACING */
        .product-info span[style*="Deal"] {
          font-size: 7px !important; /* Reduced from 8px to 7px for desktop */
          white-space: nowrap !important;
          overflow: visible !important; /* Changed from hidden to visible */
          text-overflow: clip !important; /* Changed from ellipsis to clip */
          max-width: none !important; /* Remove max-width restriction */
        }
        
        .product-info span[style*="£"] {
          font-size: 7px !important; /* Reduced from 8px to 7px for desktop */
          text-align: center !important; /* Center align on desktop */
          margin-left: 0px !important; /* No left margin on desktop */
        }
        
        /* Desktop Deal Container - REDUCED PADDING AND MARGINS */
        .product-info > div:last-of-type > div {
          font-size: 7px !important; /* Reduced font size */
          padding: 2px 4px !important; /* Reduced padding from 3px 5px */
          margin: 0px 0 !important; /* Removed margin */
          gap: 4px !important; /* Reduced gap from 8px to 4px */
          min-height: 18px !important; /* Reduced from 20px */
          max-height: 20px !important; /* Reduced from 22px */
        }
      }
      
      /* Large Mobile (577px-768px) - 3 columns with larger elements */
      @media (min-width: 577px) and (max-width: 768px) {
        #products-grid {
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 10px !important;
        }
        
        .product-card, .enhanced-card {
          min-height: 320px !important;
          max-height: 360px !important;
          padding: 8px !important;
        }
        
        .product-image-container {
          height: 110px !important;
          min-height: 110px !important;
          max-height: 110px !important;
        }
        
        .product-image-container img {
          max-width: 100px !important;
          max-height: 100px !important;
        }
        
        .product-info h5 {
          font-size: 11px !important;
          height: 45px !important; /* Increased height for more title visibility */
          overflow: hidden !important;
          color: #1a1a1a !important;
          background: transparent !important;
          z-index: 1 !important;
          position: relative !important;
          padding: 1px 2px !important;
          margin: 0 !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 3 !important;
          -webkit-box-orient: vertical !important;
          line-height: 1.2 !important;
        }
        
        .product-info div[style*="/unit"] {
          font-size: 11px !important;
          padding: 5px 10px !important;
          min-width: 90px !important;
        }
        
        .product-info > div[style*="flexDirection: column"] > div {
          font-size: 10px !important;
          padding: 4px 8px !important;
          min-width: 80px !important;
        }
        
        .product-info > div:last-of-type > div {
          font-size: 12px !important; /* Increased from 11px for better readability */
          padding: 7px 10px !important;
          min-height: 32px !important;
        }
        
        .product-info button {
          width: 20px !important; /* Reduced from 22px */
          height: 20px !important; /* Reduced from 22px */
          font-size: 8px !important; /* Reduced from 9px */
          border-radius: 50% !important; /* Make it circular */
          box-shadow: 0 2px 4px rgba(255, 102, 0, 0.4) !important;
        }
        
        .product-info a[href*="amazon"] {
          font-size: 10px !important;
          padding: 8px 10px !important;
          min-height: 30px !important;
        }
      }
    `
    document.head.appendChild(style)
    
    return () => {
      const existingStyle = document.getElementById('amazons-choice-mobile-fix')
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
          gridTemplateColumns: windowWidth < 576 ? 'repeat(2, 1fr)' : 
                              windowWidth < 768 ? 'repeat(3, 1fr)' : 
                              windowWidth < 992 ? 'repeat(4, 1fr)' : 
                              windowWidth < 1200 ? 'repeat(5, 1fr)' :
                              windowWidth < 1400 ? 'repeat(6, 1fr)' :
                              windowWidth < 1600 ? 'repeat(7, 1fr)' :
                              'repeat(8, 1fr)', 
          gap: windowWidth < 576 ? '8px' : '15px',
          maxWidth: '100%',
          width: '100%',
          margin: '0 auto',
          padding: windowWidth < 576 ? '8px 4px' : '10px',
          background: windowWidth < 576 ? 'transparent' : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 248, 245, 0.95) 100%)',
          borderRadius: windowWidth < 576 ? '0px' : '15px',
          boxShadow: windowWidth < 576 ? 'none' : '0 8px 25px rgba(255, 102, 0, 0.12)',
          backdropFilter: windowWidth < 576 ? 'none' : 'blur(10px)',
          border: windowWidth < 576 ? 'none' : '1px solid rgba(255, 102, 0, 0.15)',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box'
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
                border: windowWidth < 576 ? '1px solid #ff6600' : '2px solid transparent',
                borderRadius: windowWidth < 576 ? '8px' : '15px',
                overflow: 'hidden',
                boxShadow: windowWidth < 576 ? '0 2px 8px rgba(255, 102, 0, 0.15)' : '0 8px 25px rgba(255, 102, 0, 0.15)',
                transition: windowWidth < 576 ? 'none' : 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                minHeight: windowWidth < 576 ? '260px' : '280px',
                maxHeight: windowWidth < 576 ? '300px' : 'none',
                boxSizing: 'border-box',
                padding: windowWidth < 576 ? '6px' : '0px'
              }}
              onMouseEnter={(e) => {
                if (windowWidth >= 576) {
                  e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(255, 102, 0, 0.25)';
                  e.currentTarget.style.borderColor = '#ff6600';
                }
              }}
              onMouseLeave={(e) => {
                if (windowWidth >= 576) {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 102, 0, 0.15)';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              <div className="product-image-container" style={{
                position: 'relative', 
                height: windowWidth < 576 ? '100px' : '160px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: '#fff',
                padding: windowWidth < 576 ? '4px' : '15px',
                margin: '0px',
                overflow: 'visible',
                marginBottom: windowWidth < 576 ? '4px' : '0px'
              }}>
                <ProductImage
                  src={product.image}
                  alt={product.name}
                  asin={product.asin} // Pass ASIN for Cloudinary fallback
                  priority={index < 20} // Prioritize first 20 images
                  loading={index < 8 ? "eager" : "lazy"} // Eager load first 8, lazy load rest
                  fallbackSrc={product.images && product.images[1]} // Use second image as fallback
                  style={{
                    maxWidth: windowWidth < 576 ? '80px' : '100%',
                    maxHeight: windowWidth < 576 ? '80px' : '100%',
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
                  
                  // Calculate dynamic width based on text length for mobile
                  const calculateBadgeWidth = (text) => {
                    if (!isMobile) return 'auto';
                    
                    // Special handling for "Amazon's Choice" - give it more width
                    if (text === "Amazon's Choice") {
                      return '95px'; // Increased width for Amazon's Choice
                    }
                    
                    // For other badges, use smaller base width
                    const baseWidth = 30; // Further reduced base width from 35px to 30px
                    const charWidth = 3.5; // Further reduced char width from 4px to 3.5px
                    const calculatedWidth = baseWidth + (text.length * charWidth);
                    
                    // Set even tighter bounds for other badges
                    const minWidth = 45; // Reduced from 50px to 45px
                    const maxWidth = 70; // Reduced from 75px to 70px
                    
                    return Math.min(Math.max(calculatedWidth, minWidth), maxWidth) + 'px';
                  };
                  
                  return (
                    <span 
                      className={isMobile ? 'mobile-badge' : 'desktop-badge'}
                      style={{
                        backgroundColor: currentBadge.color,
                        ...(isMobile && {
                          width: calculateBadgeWidth(currentBadge.text),
                          minWidth: 'auto', // Override CSS min-width
                          maxWidth: 'none' // Override CSS max-width
                        })
                      }}
                    >
                      <span style={{fontSize: '6px'}}>{currentBadge.icon}</span>
                      <span>{currentBadge.text}</span>
                    </span>
                  )
                })()}

              </div>
              
              <div className="product-info" style={{
                padding: windowWidth < 576 ? '1px' : '4px 6px', // Minimal padding on mobile
                display: 'flex', 
                flexDirection: 'column', 
                gap: windowWidth < 576 ? '1px' : '3px', // Minimal gap on mobile
                overflow: 'hidden',
                flex: 1,
                justifyContent: 'space-between'
              }}>
                <h5 style={{
                  fontSize: windowWidth < 576 ? '11px' : '10px',
                  fontWeight: '700', 
                  margin: 0,
                  lineHeight: '1.3', 
                  height: windowWidth < 576 ? '48px' : '39px', /* Increased mobile height for more title visibility */
                  overflow: 'hidden',
                  color: '#1a1a1a',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  transition: 'color 0.3s ease',
                  marginBottom: '4px',
                  display: '-webkit-box',
                  WebkitLineClamp: windowWidth < 576 ? 3 : 3, // Changed to 3 lines
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
                
                <div style={{display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', gap: '5px', marginTop: '1px', overflow: 'hidden', flexDirection: windowWidth < 576 ? 'column' : 'row'}}>
                  {/* Left side - Compact Enhanced Price */}
                  <div style={{
                    fontWeight: '800', 
                    fontSize: windowWidth < 576 ? '8px' : '9px',
                    color: '#ff3300',
                    background: 'linear-gradient(135deg, #fff5f0 0%, #ffebe0 100%)',
                    padding: windowWidth < 576 ? '3px 6px' : '1px 3px',
                    borderRadius: windowWidth < 576 ? '4px' : '3px',
                    border: '1px solid #ff6600',
                    textShadow: '0 1px 2px rgba(255, 51, 0, 0.3)',
                    boxShadow: '0 1px 3px rgba(255, 102, 0, 0.15)',
                    whiteSpace: 'nowrap',
                    maxWidth: 'fit-content',
                    margin: windowWidth < 576 ? '2px 0' : '2px 0',
                    flex: 'none',
                    textAlign: 'center',
                    minWidth: windowWidth < 576 ? '80px' : 'auto'
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
                        gap: '2px',
                        marginLeft: windowWidth < 576 ? '0px' : '0px',
                        marginTop: windowWidth < 576 ? '2px' : '2px',
                        width: windowWidth < 576 ? 'fit-content' : '100%', /* Dynamic width on mobile */
                        overflow: 'hidden'
                      }}>
                        {/* Profit per unit */}
                        <div style={{
                          fontSize: windowWidth < 576 ? '9px' : '8px',
                          color: '#ff6600',
                          fontWeight: '700',
                          background: '#fff8dc',
                          padding: windowWidth < 576 ? '2px 4px' : '2px 3px',
                          borderRadius: windowWidth < 576 ? '3px' : '4px',
                          border: '1px solid #ffe4b5',
                          whiteSpace: 'nowrap',
                          minWidth: windowWidth < 576 ? 'fit-content' : 'fit-content',
                          width: windowWidth < 576 ? 'fit-content' : 'fit-content',
                          maxWidth: windowWidth < 576 ? '90px' : 'none',
                          textAlign: 'center',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          boxShadow: windowWidth < 576 ? '0 1px 2px rgba(255, 228, 181, 0.2)' : '0 1px 3px rgba(255, 102, 0, 0.15)'
                        }}>
                          💰 £{profitPerUnit.toFixed(2)}/unit
                        </div>
                        
                        {/* Profit for deal units */}
                        <div style={{
                          fontSize: windowWidth < 576 ? '9px' : '8px',
                          color: '#ff6600',
                          fontWeight: '700',
                          background: '#fff8dc',
                          padding: windowWidth < 576 ? '2px 4px' : '2px 3px',
                          borderRadius: windowWidth < 576 ? '3px' : '4px',
                          border: '1px solid #ffe4b5',
                          whiteSpace: 'nowrap',
                          minWidth: windowWidth < 576 ? 'fit-content' : 'fit-content',
                          width: windowWidth < 576 ? 'fit-content' : 'fit-content',
                          maxWidth: windowWidth < 576 ? '100px' : 'none',
                          textAlign: 'center',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          boxShadow: windowWidth < 576 ? '0 1px 2px rgba(255, 228, 181, 0.2)' : '0 1px 3px rgba(255, 102, 0, 0.15)'
                        }}>
                          📈 £{totalProfit.toFixed(2)}/{dealUnits}units
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Deal Units Display - Moved Down for Mobile */}
                <div style={{ marginTop: windowWidth < 576 ? '4px' : '1px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #fff5f0 0%, #ffebe0 100%)', 
                    padding: windowWidth < 576 ? '4px 6px' : '2px 3px', // Reduced desktop padding
                    borderRadius: windowWidth < 576 ? '4px' : '4px',
                    border: '1px solid #ff6600', 
                    boxShadow: windowWidth < 576 ? '0 1px 3px rgba(255, 102, 0, 0.15)' : '0 1px 4px rgba(255, 102, 0, 0.15)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minWidth: windowWidth < 576 ? '100%' : 'auto',
                    width: '100%',
                    gap: windowWidth < 576 ? '8px' : '4px', // Reduced desktop gap from 6px to 4px
                    minHeight: windowWidth < 576 ? '22px' : '18px', // Reduced desktop min-height
                    maxHeight: windowWidth < 576 ? '24px' : '20px', // Reduced desktop max-height
                    boxSizing: 'border-box'
                  }}>
                    <div style={{
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: windowWidth < 576 ? '8px' : '4px', // Reduced desktop gap from 6px to 4px
                      flex: 1,
                      minWidth: 0 // Allow text to wrap if needed
                    }}>
                      <span style={{
                        fontSize: windowWidth < 576 ? '8px' : '7px', // Decreased mobile font from 9px to 8px
                        color: '#cc3300', 
                        fontWeight: '700',
                        whiteSpace: 'nowrap',
                        overflow: 'visible', // Changed from hidden to visible on desktop
                        textOverflow: windowWidth < 576 ? 'ellipsis' : 'clip', // Only ellipsis on mobile
                        maxWidth: windowWidth < 576 ? 'calc(100% - 55px)' : 'none', // Remove max-width on desktop
                        flex: '0 1 auto' // Allow shrinking but don't grow
                      }}>
                        💰 Deal of {product.dealUnits || 1} unit{(product.dealUnits || 1) !== 1 ? 's' : ''}:
                      </span>
                      <span style={{
                        fontSize: windowWidth < 576 ? '8px' : '7px', // Decreased mobile font from 9px to 8px
                        fontWeight: '800', 
                        color: '#ff3300',
                        whiteSpace: 'nowrap',
                        minWidth: windowWidth < 576 ? '35px' : '40px', // Slightly increased desktop min-width
                        display: 'inline-block',
                        textAlign: windowWidth < 576 ? 'left' : 'center', // Left align on mobile to move left
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: '0 0 auto', // Don't grow or shrink
                        marginLeft: windowWidth < 576 ? '-5px' : '0px' // Move left on mobile
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
                        padding: windowWidth < 576 ? '0' : '0',
                        borderRadius: windowWidth < 576 ? '50%' : '50%',
                        fontSize: windowWidth < 576 ? '8px' : '9px',
                        cursor: 'pointer',
                        boxShadow: windowWidth < 576 ? 
                          '0 2px 4px rgba(255, 102, 0, 0.4)' : 
                          '0 3px 8px rgba(255, 102, 0, 0.4)',
                        transition: 'all 0.2s ease',
                        minWidth: windowWidth < 576 ? '18px' : '18px', // Reduced from 20px to 18px
                        width: windowWidth < 576 ? '18px' : '18px', // Reduced from 20px to 18px
                        height: windowWidth < 576 ? '18px' : '18px', // Reduced from 20px to 18px
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        ...(windowWidth >= 576 && {
                          position: 'relative',
                          overflow: 'hidden'
                        })
                      }}
                      onMouseEnter={(e) => {
                        if (windowWidth < 576) {
                          e.target.style.transform = 'scale(1.05)';
                          e.target.style.boxShadow = '0 2px 6px rgba(255, 102, 0, 0.4)';
                        } else {
                          e.target.style.transform = 'scale(1.1)';
                          e.target.style.boxShadow = '0 3px 8px rgba(255, 102, 0, 0.5)';
                          e.target.style.background = isInBasket(product.id) ? 
                            'linear-gradient(135deg, #059669 0%, #047857 100%)' : 
                            'linear-gradient(135deg, #ff3300 0%, #cc2900 100%)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (windowWidth < 576) {
                          e.target.style.transform = 'scale(1)';
                          e.target.style.boxShadow = '0 1px 3px rgba(255, 102, 0, 0.3)';
                        } else {
                          e.target.style.transform = 'scale(1)';
                          e.target.style.boxShadow = '0 2px 6px rgba(255, 102, 0, 0.4)';
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
                <div style={{ marginTop: windowWidth < 576 ? '4px' : '2px' }}>
                  <a 
                    href={`https://www.amazon.com/s?k=${encodeURIComponent(product.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      background: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
                      color: 'white',
                      border: '2px solid #ff6600',
                      padding: windowWidth < 576 ? '4px 6px' : '5px 8px',
                      borderRadius: '8px',
                      fontSize: windowWidth < 576 ? '8px' : '8.5px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      width: '100%',
                      textDecoration: 'none',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                      minHeight: windowWidth < 576 ? '22px' : '26px',
                      boxSizing: 'border-box'
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