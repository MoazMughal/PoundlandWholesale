import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
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
import '../styles/compact-cards.css'
import '../styles/mobile-image-override.css' // New override file for mobile images
import '../styles/amazons-choice-responsive.css' // Currency symbol styling

const AmazonsChoice = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Clear any existing authentication when visiting homepage from external sources
  useEffect(() => {
    const clearAuthOnPublicAccess = () => {
      // Check if user came from external source (Google, direct link, etc.)
      const referrer = document.referrer
      const isExternalReferrer = !referrer || !referrer.includes(window.location.hostname)
      const isHomepage = window.location.pathname === '/'
      
      if (isHomepage && isExternalReferrer) {
        console.log('🔒 Homepage accessed from external source - clearing any existing auth for security')
        
        // Clear all authentication data to ensure clean state
        const keysToRemove = [
          'adminToken', 'adminData',
          'sellerToken', 'sellerData', 
          'buyerToken', 'buyerData',
          'activeUserType', 'currentAuthToken'
        ]
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key)
          sessionStorage.removeItem(key)
        })
        
        // Force contexts to reset
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'activeUserType',
          oldValue: 'any',
          newValue: null,
          storageArea: localStorage
        }))
      }
    }
    
    clearAuthOnPublicAccess()
  }, [])

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
        
        /* Cards - More Compact Height */
        .product-card, .enhanced-card {
          display: flex !important;
          flex-direction: column !important;
          background: white !important;
          border: 2px solid #1a1a1a !important;
          border-radius: 8px !important;
          padding: 4px !important;
          min-height: 280px !important; /* Reduced from 220px for more compact cards */
          max-height: 300px !important; /* Reduced from 250px for more compact cards */
          width: 100% !important;
          position: relative !important;
          overflow: hidden !important;
          box-shadow: 0 2px 8px rgba(255, 102, 0, 0.2) !important;
          margin: 0 !important;
        }
        
        /* Images - Much Larger Size for Mobile */
        .product-image-container {
          height: 160px !important; /* Significantly increased for larger images */
          min-height: 160px !important; 
          max-height: 160px !important; 
          width: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: #fff !important;
          margin-bottom: 0px !important; /* Remove bottom margin */
          padding: 2px !important;
        }
          align-items: center !important;
          justify-content: center !important;
          background: #fff !important;
          margin-bottom: 2px !important;
          padding: 2px !important;
        }
        
        .product-image-container img {
          max-width: 100% !important; /* Full width for mobile - show complete image */
          max-height: 100% !important; /* Full height for mobile - show complete image */
          width: auto !important;
          height: auto !important;
          object-fit: contain !important;
        }
        
        /* Product Info - NO SPACING */
        .product-info {
          flex: 1 !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 0px !important; /* Remove all gaps */
          padding: 0px !important; /* Remove all padding */
          overflow: hidden !important;
          background: transparent !important;
          margin: 0px !important; /* Remove all margins */
        }
        
        /* Title - Optimized 2 Line Display with spacing */
        .product-info h5 {
          font-size: 9px !important; /* Slightly smaller for mobile */
          line-height: 1.1 !important; /* Tighter line height */
          font-weight: 600 !important;
          margin: 0px !important; /* Remove all margins */
          margin-bottom: 2px !important; /* Add small space after title */
          height: 20px !important; /* Optimized height for 2 lines */
          overflow: hidden !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 2 !important;
          -webkit-box-orient: vertical !important;
          color: #1a1a1a !important;
          background: transparent !important;
          z-index: 1 !important;
          position: relative !important;
          padding: 0px !important; /* Remove all padding */
        }
        
        /* FORCE ALL PRICE AND PROFIT ELEMENTS TO BE VISIBLE AND LARGER */
        
        /* Unit Price - More Compact */
        .product-info div[style*="/unit"] {
          font-size: 7px !important; /* Smaller font */
          font-weight: 700 !important;
          padding: 1px 3px !important; /* Reduced padding */
          margin: 0 !important;
          border-radius: 2px !important; /* Smaller radius */
          text-align: center !important;
          background: #f5f5f5 !important;
          color: #1a1a1a !important;
          border: 0.5px solid #d0d0d0 !important;
          min-width: 60px !important; /* Reduced min width */
          max-width: 80px !important; /* Reduced max width */
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08) !important;
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
        
        /* Profit boxes - More Compact */
        .product-info > div[style*="flexDirection: column"] > div {
          font-size: 7px !important; /* Smaller font */
          font-weight: 700 !important;
          padding: 1px 2px !important; /* Reduced padding */
          margin: 0 !important;
          border-radius: 2px !important;
          text-align: center !important;
          background: #f5f5f5 !important;
          color: #1a1a1a !important;
          border: 1px solid #d0d0d0 !important;
          min-width: 50px !important; /* Reduced min width */
          max-width: 70px !important; /* Reduced max width */
          white-space: nowrap !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08) !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: fit-content !important;
        }
        
        /* Deal container - Smaller Font for mobile */
        .product-info > div:last-of-type > div {
          font-size: 6px !important; /* Decreased from 8px for mobile compatibility */
          font-weight: 700 !important;
          padding: 2px 4px !important;
          margin: 0px 0 !important;
          border-radius: 3px !important;
          background: #f5f5f5 !important;
          color: #1a1a1a !important;
          border: 1px solid #d0d0d0 !important;
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          gap: 4px !important; /* Reduced gap for mobile */
          min-height: 20px !important; /* Decreased height for smaller font */
          max-height: 22px !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08) !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Deal Text - Smaller Font for mobile */
        .product-info span[style*="Deal"] {
          font-size: 6px !important; /* Decreased font size for mobile */
          font-weight: 700 !important;
          color: #1a1a1a !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          flex: 1 !important;
          max-width: calc(100% - 40px) !important;
        }
        
        /* Price in Deal Section - Smaller font for mobile */
        .product-info span[style*="£"] {
          font-size: 6px !important; /* Decreased font size for price value */
          font-weight: 700 !important;
          color: #1a1a1a !important;
          white-space: nowrap !important;
          min-width: 30px !important; /* Increased min-width */
          text-align: left !important;
          margin-left: -3px !important;
        }
        
        /* Basket Button - Larger */
        .product-info button {
          font-size: 7px !important;
          width: 18px !important;
          height: 18px !important;
          min-width: 18px !important;
          border-radius: 50% !important;
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
          margin-left: 3px !important;
          padding: 0 !important;
          line-height: 1 !important;
        }
        
        /* Center the basket icon specifically */
        .product-info button i {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          height: 100% !important;
        }
        
        /* Amazon Button - More Compact */
        .product-info a[href*="amazon"] {
          font-size: 6px !important; /* Smaller font for mobile */
          padding: 2px 3px !important; /* Reduced padding */
          margin-top: 1px !important; /* Reduced margin */
          border-radius: 4px !important; /* Smaller radius */
          min-height: 18px !important; /* Reduced height */
          font-weight: 600 !important;
          background: #1a1a1a !important;
          color: white !important;
          border: 2px solid #ff6600 !important;
          text-align: center !important;
          text-decoration: none !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 2px !important; /* Reduced gap */
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Badges - More Compact */
        .mobile-badge {
          position: absolute !important;
          top: 4px !important;
          right: 4px !important;
          font-size: 6px !important;
          padding: 2px 4px !important;
          border-radius: 3px !important;
          max-width: 70px !important;
          min-width: 50px !important;
          z-index: 10 !important;
          font-weight: 600 !important;
          color: white !important;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5) !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
          text-align: center !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          width: fit-content !important;
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
          top: 6px !important;
          right: 6px !important;
          font-size: 7px !important;
          padding: 2px 4px !important;
          border-radius: 4px !important;
          max-width: 100px !important;
          z-index: 20 !important;
          font-weight: 600 !important;
          color: white !important;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5) !important;
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3) !important;
          display: flex !important;
          align-items: center !important;
          gap: 2px !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Ensure image container doesn't interfere with badge positioning */
        .product-image-container {
          position: relative !important;
          z-index: 1 !important;
        }
        
        /* Desktop Deal Text - Larger Font */
        .product-info span[style*="Deal"] {
          font-size: 8px !important;
          white-space: nowrap !important;
          overflow: visible !important;
          text-overflow: clip !important;
          max-width: none !important;
        }
        
        .product-info span[style*="£"] {
          font-size: 7px !important;
          text-align: center !important;
          margin-left: 0px !important;
        }
        
        /* Desktop Deal Container - Larger Font */
        .product-info > div:last-of-type > div {
          font-size: 8px !important; /* Consistent font size */
          padding: 2px 4px !important;
          margin: 0px 0 !important;
          gap: 4px !important;
          min-height: 22px !important; /* Increased height */
          max-height: 24px !important; /* Increased height */
        }
      }
      
      /* Large Mobile (577px-768px) - 3 columns with larger elements */
      @media (min-width: 577px) and (max-width: 768px) {
        #products-grid {
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 10px !important;
        }
        
        .product-card, .enhanced-card {
          min-height: 240px !important;
          max-height: 270px !important;
          padding: 6px !important;
        }
        
        .product-image-container {
          height: 90px !important;
          min-height: 90px !important;
          max-height: 90px !important;
        }
        
        .product-image-container img {
          max-width: 80px !important;
          max-height: 80px !important;
        }
        
        .product-info h5 {
          font-size: 11px !important;
          height: 39px !important;
          overflow: hidden !important;
          color: #1a1a1a !important;
          background: transparent !important;
          z-index: 1 !important;
          position: relative !important;
          padding: 1px 2px !important;
          margin: 0 !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 2 !important;
          -webkit-box-orient: vertical !important;
          line-height: 1.2 !important;
        }
        
        .product-info div[style*="/unit"] {
          font-size: 10px !important;
          padding: 3px 6px !important;
          min-width: 75px !important;
        }
        
        .product-info > div[style*="flexDirection: column"] > div {
          font-size: 9px !important;
          padding: 2px 5px !important;
          min-width: 65px !important;
        }
        
        .product-info > div:last-of-type > div {
          font-size: 10px !important;
          padding: 4px 6px !important;
          min-height: 26px !important;
        }
        
        .product-info button {
          width: 20px !important;
          height: 20px !important;
          font-size: 8px !important;
          border-radius: 50% !important;
          box-shadow: 0 2px 4px rgba(255, 102, 0, 0.4) !important;
        }
        
        .product-info a[href*="amazon"] {
          font-size: 9px !important;
          padding: 5px 7px !important;
          min-height: 24px !important;
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
  const [showAllProducts, setShowAllProducts] = useState(true) // Default to TRUE - show all products by default
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

  // Helper function to format price with smaller Rs symbol
  const formatPriceWithSmallRs = (price) => {
    const formattedPrice = formatPrice(price);
    
    // If price starts with Rs, wrap it in a span with smaller font
    if (typeof formattedPrice === 'string' && formattedPrice.startsWith('Rs')) {
      const priceValue = formattedPrice.substring(2); // Remove 'Rs' prefix
      return (
        <>
          <span style={{ fontSize: '0.7em', fontWeight: '600' }}>Rs</span>
          {priceValue}
        </>
      );
    }
    
    return formattedPrice;
  };

  // Add loaded class to cards after component mounts to enable transitions
  useEffect(() => {
    const timer = setTimeout(() => {
      const cards = document.querySelectorAll('.product-card, .enhanced-card')
      cards.forEach(card => {
        card.classList.add('loaded')
      })
    }, 100) // Small delay to ensure initial render is complete
    
    return () => clearTimeout(timer)
  }, [products])

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

  // Pagination - now using server-side pagination with seller filter
  const currentProducts = showAllProducts 
    ? products // Show all products when checkbox is checked
    : products.filter(product => {
        // Only show products that have seller information
        const hasSellerInfo = product.sellerInfo || 
                             (product.sellers && product.sellers.length > 0) ||
                             product.seller;
        
        // Debug logging for first few products
        if (products.indexOf(product) < 3) {
          console.log('Product filter check:', {
            name: product.name,
            hasSellerInfo,
            sellerInfo: product.sellerInfo,
            sellers: product.sellers,
            seller: product.seller
          });
        }
        
        return hasSellerInfo;
      })
  
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
      const apiUrl = `${getApiUrl('products/public')}?${params.toString()}`
      
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
          // Debug: Log first product to see what seller fields are available
          if (data.products[0]) {
            console.log('First product from API:', {
              name: data.products[0].name,
              sellers: data.products[0].sellers,
              sellerInfo: data.products[0].sellerInfo,
              seller: data.products[0].seller
            });
          }
          
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
              // Include seller-related fields for filtering
              sellers: p.sellers || [],
              sellerInfo: p.sellerInfo || null,
              seller: p.seller || null,
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
        
        {/* Enhanced Loading Message */}
        <div style={{
          textAlign: 'center',
          padding: windowWidth < 576 ? '25px 15px' : '35px 25px',
          margin: windowWidth < 576 ? '15px 0 25px 0' : '20px 0 30px 0',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #ff6600 0%, #ff8533 50%, #ffaa66 100%)',
          borderRadius: windowWidth < 576 ? '16px' : '20px',
          boxShadow: '0 12px 40px rgba(255, 102, 0, 0.25), 0 4px 15px rgba(255, 102, 0, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          {/* Animated background particles */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 40% 80%, rgba(255, 255, 255, 0.06) 0%, transparent 50%)
            `,
            animation: 'float 6s ease-in-out infinite',
            pointerEvents: 'none'
          }} />
          
          {/* Shimmer effect */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
            animation: 'shimmer 2s infinite',
            pointerEvents: 'none'
          }} />
          
          <div style={{ position: 'relative', zIndex: 2 }}>
            {/* Main loading icon with pulse animation */}
            <div style={{
              fontSize: windowWidth < 576 ? '2.5rem' : '3.5rem',
              marginBottom: windowWidth < 576 ? '12px' : '18px',
              display: 'inline-block',
              animation: 'pulse 1.5s ease-in-out infinite, bounce 2s ease-in-out infinite',
              filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))'
            }}>
              🛍️
            </div>
            
            {/* Loading dots animation */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '4px',
              marginBottom: windowWidth < 576 ? '15px' : '20px'
            }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: windowWidth < 576 ? '6px' : '8px',
                    height: windowWidth < 576 ? '6px' : '8px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    animation: `loadingDots 1.4s ease-in-out infinite`,
                    animationDelay: `${i * 0.2}s`,
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}
                />
              ))}
            </div>
            
            {/* Main title */}
            <div style={{
              fontSize: windowWidth < 576 ? '1.1rem' : '1.4rem',
              fontWeight: '800',
              color: 'white',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              letterSpacing: '0.5px',
              marginBottom: windowWidth < 576 ? '8px' : '12px',
              lineHeight: '1.2'
            }}>
              Loading Amazing Products
            </div>
            
            {/* Subtitle with typewriter effect */}
            <div style={{
              fontSize: windowWidth < 576 ? '0.85rem' : '1rem',
              color: 'rgba(255, 255, 255, 0.95)',
              fontWeight: '600',
              textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
              opacity: 0.95,
              animation: 'fadeInOut 3s ease-in-out infinite'
            }}>
              Discovering the best deals just for you...
            </div>
            
            {/* Progress bar */}
            <div style={{
              width: '100%',
              height: '3px',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '2px',
              marginTop: windowWidth < 576 ? '15px' : '20px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                height: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '2px',
                animation: 'progressBar 2s ease-in-out infinite',
                boxShadow: '0 0 8px rgba(255, 255, 255, 0.6)'
              }} />
            </div>
          </div>
        </div>
        
        {/* Add CSS animations */}
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-8px); }
            60% { transform: translateY(-4px); }
          }
          
          @keyframes loadingDots {
            0%, 80%, 100% { 
              transform: scale(0.8);
              opacity: 0.5;
            }
            40% { 
              transform: scale(1.2);
              opacity: 1;
            }
          }
          
          @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 100%; }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-10px) rotate(1deg); }
            66% { transform: translateY(5px) rotate(-1deg); }
          }
          
          @keyframes fadeInOut {
            0%, 100% { opacity: 0.95; }
            50% { opacity: 0.7; }
          }
          
          @keyframes progressBar {
            0% { 
              width: 0%;
              left: 0%;
            }
            50% { 
              width: 70%;
              left: 15%;
            }
            100% { 
              width: 0%;
              left: 100%;
            }
          }
        `}</style>
        
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
        <ProductionStatus />

        {/* SEO Header Section */}
        <div style={{
          textAlign: 'center',
          padding: windowWidth < 576 ? '4px 8px' : '6px 12px',
          marginBottom: windowWidth < 576 ? '5px' : '6px',
          background: 'linear-gradient(135deg, #fff8f5 0%, #ffede0 100%)',
          borderRadius: '6px',
          border: '1px solid #ff6600',
          boxShadow: '0 1px 4px rgba(255, 102, 0, 0.08)'
        }}>
          {windowWidth < 768 ? (
            // Mobile/Tablet: Stack vertically
            <>
              <h1 style={{
                margin: '0 0 2px 0',
                fontSize: windowWidth < 576 ? '0.9rem' : '1rem',
                fontWeight: '600',
                color: '#ff6600',
                letterSpacing: '0.2px'
              }}>
                Poundland Wholesale
              </h1>
              <p style={{
                margin: 0,
                fontSize: windowWidth < 576 ? '0.65rem' : '0.7rem',
                color: '#666',
                lineHeight: '1.2',
                fontWeight: '400'
              }}>
                Online wholesale store offering quality products at competitive prices for retailers and resellers.
              </p>
            </>
          ) : (
            // Desktop: Single line
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <h1 style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: '600',
                color: '#ff6600',
                letterSpacing: '0.2px',
                whiteSpace: 'nowrap'
              }}>
                Poundland Wholesale
              </h1>
              <span style={{
                fontSize: '0.7rem',
                color: '#666',
                fontWeight: '400',
                whiteSpace: 'nowrap'
              }}>
                - Online wholesale store offering quality products at competitive prices
              </span>
            </div>
          )}
        </div>

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
          <>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: windowWidth < 576 ? '10px' : '10px', // Consistent margin
            padding: windowWidth < 576 ? '8px 16px' : '10px 18px', // Reduced padding for smaller height
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
                fontSize: windowWidth < 576 ? '1.1rem' : '1.3rem', // Reduced font size
                fontWeight: '700',
                textShadow: '0 2px 4px rgba(255, 255, 255, 0.3)', // Better text shadow
                letterSpacing: '0.5px' // Improved letter spacing
              }}>
                🏆 Amazon's Choice Products
              </h2>
            </div>

          </div>

          {/* Seller Filter Checkbox */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '15px',
            padding: '10px 15px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e1e5e9'
          }}>
            <input
              type="checkbox"
              id="showAllProducts"
              checked={showAllProducts}
              onChange={(e) => setShowAllProducts(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                cursor: 'pointer',
                accentColor: '#ff6600'
              }}
            />
            <label
              htmlFor="showAllProducts"
              style={{
                fontSize: '0.9rem',
                fontWeight: '500',
                color: '#232f3e',
                cursor: 'pointer',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                margin: 0
              }}
            >
              <span>Include out of stock products</span>
              <span style={{
                fontSize: '0.75rem',
                color: '#666',
                fontWeight: '400'
              }}>
                {showAllProducts 
                  ? `(Showing all ${products.length} products)` 
                  : `(Showing ${currentProducts.length} products with seller info only)`
                }
              </span>
            </label>
          </div>
          </>
        )}

        {/* Product Count Info */}

        {/* No Products Message */}
        {!loading && currentProducts.length === 0 && products.length > 0 && (
          <div style={{
            padding: '30px',
            textAlign: 'center',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            marginBottom: '20px'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📦</div>
            <h3 style={{ color: '#232f3e', marginBottom: '10px' }}>No products with seller information</h3>
            <p style={{ color: '#666', marginBottom: '15px' }}>
              All products are currently out of stock or don't have seller information.
            </p>
            <button
              onClick={() => setShowAllProducts(true)}
              style={{
                background: '#ff6600',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Show all products including out of stock
            </button>
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
          {currentProducts.map((product, index) => {
            // Generate the product URL with parameters
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
            const productUrl = `/product/${product.id}?${params.toString()}`
            
            return (
            <div 
              key={product.id} 
              className="product-card enhanced-card products-grid-item"
              style={{
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
                minHeight: windowWidth < 576 ? '280px' : '240px',
                maxHeight: windowWidth < 576 ? '300px' : 'none',
                boxSizing: 'border-box',
                padding: windowWidth < 576 ? '6px' : '0px',
                color: 'inherit'
              }}
              onMouseEnter={(e) => {
                if (windowWidth >= 576) {
                  e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(255, 102, 0, 0.25)';
                  e.currentTarget.style.borderColor = '#ff6600';
                  // Show verify button
                  const verifyBtn = e.currentTarget.querySelector('.verify-amazon-btn');
                  if (verifyBtn) {
                    verifyBtn.style.opacity = '1';
                    verifyBtn.style.pointerEvents = 'auto';
                  }
                }
              }}
              onMouseLeave={(e) => {
                if (windowWidth >= 576) {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 102, 0, 0.15)';
                  e.currentTarget.style.borderColor = 'transparent';
                  // Hide verify button
                  const verifyBtn = e.currentTarget.querySelector('.verify-amazon-btn');
                  if (verifyBtn) {
                    verifyBtn.style.opacity = '0';
                    verifyBtn.style.pointerEvents = 'none';
                  }
                }
              }}
            >
              {/* Invisible link overlay for right-click "Open in new tab" functionality */}
              <a
                href={productUrl}
                onClick={(e) => {
                  e.preventDefault();
                  // Check for Ctrl/Cmd key or middle mouse button to open in new tab
                  if (e.ctrlKey || e.metaKey || e.button === 1) {
                    window.open(productUrl, '_blank');
                  } else {
                    // Normal click - navigate in same tab
                    navigate(productUrl);
                  }
                }}
                onMouseDown={(e) => {
                  // Handle middle mouse button click (button 1)
                  if (e.button === 1) {
                    e.preventDefault();
                    window.open(productUrl, '_blank');
                  }
                }}
                onAuxClick={(e) => {
                  // Handle middle mouse button click (alternative event)
                  if (e.button === 1) {
                    e.preventDefault();
                    window.open(productUrl, '_blank');
                  }
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 1,
                  textDecoration: 'none',
                  color: 'inherit',
                  cursor: 'pointer'
                }}
                aria-label={`View ${product.name}`}
              />
              
              {/* Card content with higher z-index for interactive elements */}
              <div style={{ position: 'relative', zIndex: 2, pointerEvents: 'none', flex: 1, display: 'flex', flexDirection: 'column' }}>
              
              <div className="product-image-container" style={{
                position: 'relative', 
                height: windowWidth < 576 ? '160px' : '140px',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                background: '#fff',
                padding: windowWidth < 576 ? '8px' : '15px',
                margin: '0px',
                overflow: 'visible',
                marginBottom: '0px' // Removed margin bottom to eliminate space
              }}>
                <ProductImage
                  src={product.image}
                  alt={product.name}
                  asin={product.asin} // Pass ASIN for Cloudinary fallback
                  priority={index < 20} // Prioritize first 20 images
                  loading={index < 8 ? "eager" : "lazy"} // Eager load first 8, lazy load rest
                  fallbackSrc={product.images && product.images[1]} // Use second image as fallback
                  style={{
                    maxWidth: '100%', // Full width for all devices - show complete image
                    maxHeight: '100%', // Full height for all devices - show complete image
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
                padding: windowWidth < 576 ? '0px' : '4px 6px', // Removed padding on mobile
                display: 'flex', 
                flexDirection: 'column', 
                gap: windowWidth < 576 ? '0px' : '3px', // Removed gap on mobile
                overflow: 'hidden',
                flex: 1,
                justifyContent: 'space-between'
              }}>
                <h5 style={{
                  fontSize: windowWidth < 576 ? '9px' : '10px', // Slightly smaller font for mobile
                  fontWeight: '700', 
                  margin: 0,
                  lineHeight: '1.1', // Tighter line height to fit more text
                  height: windowWidth < 576 ? '20px' : '28px', // Reduced height but optimized for 2 lines
                  overflow: 'hidden',
                  color: '#1a1a1a',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  transition: 'color 0.3s ease',
                  marginBottom: windowWidth < 576 ? '2px' : '0px', // Added small margin after title
                  marginTop: '0px', // Removed margin top
                  display: '-webkit-box',
                  WebkitLineClamp: 2, // Strict 2 lines for all devices
                  WebkitBoxOrient: 'vertical'
                }}
                onMouseEnter={(e) => e.target.style.color = '#ff6600'}
                onMouseLeave={(e) => e.target.style.color = '#1a1a1a'}
                >
                  {product.name}
                </h5>
                
                {/* Product Variations Display */}
                {product.variations && product.variations.length > 0 && (
                  <div style={{ marginTop: '0px', marginBottom: '0px' }}>
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
                        <div key={varIndex} style={{ marginBottom: '0px' }}>
                          <div style={{
                            fontSize: '6px',
                            color: '#1a1a1a',
                            fontWeight: '700',
                            marginBottom: '0px',
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
                                  border: '1px solid #1a1a1a',
                                  borderRadius: '2px',
                                  background: '#fff',
                                  color: '#1a1a1a',
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
                                  e.target.style.background = '#1a1a1a';
                                  e.target.style.color = '#fff';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background = '#fff';
                                  e.target.style.color = '#1a1a1a';
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
                
                <div style={{display: 'flex', justifyContent: windowWidth < 576 ? 'flex-start' : 'space-between', alignItems: 'flex-start', gap: windowWidth < 576 ? '2px' : '5px', marginTop: '0px', overflow: 'hidden', flexDirection: windowWidth < 576 ? 'column' : 'row'}}>
                  {/* Left side - Compact Enhanced Price or Out of Stock */}
                  {(() => {
                    // Check if product is listed by admin (no seller info)
                    const isAdminListed = product.listedBy === 'admin' || 
                                         (!product.sellerInfo && 
                                          (!product.sellers || product.sellers.length === 0) && 
                                          !product.seller);
                    
                    // If admin listed, show "Out of Stock"
                    if (isAdminListed) {
                      return (
                        <div 
                          style={{
                            fontWeight: '800', 
                            fontSize: windowWidth < 576 ? '7px' : '8px',
                            color: '#dc2626',
                            background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                            padding: windowWidth < 576 ? '1px 3px' : '1px 2px',
                            borderRadius: windowWidth < 576 ? '2px' : '2px',
                            border: windowWidth < 576 ? '0.5px solid #dc2626' : '1px solid #dc2626',
                            textShadow: '0 1px 2px rgba(220, 38, 38, 0.1)',
                            boxShadow: '0 1px 3px rgba(220, 38, 38, 0.15)',
                            whiteSpace: 'nowrap',
                            maxWidth: 'fit-content',
                            margin: windowWidth < 576 ? '0px 0' : '1px 0',
                            flex: 'none',
                            textAlign: 'center',
                            minWidth: windowWidth < 576 ? '60px' : 'auto',
                            position: 'relative',
                            pointerEvents: 'auto',
                            zIndex: 100
                          }}
                        >
                          ⚠️ Out of Stock
                        </div>
                      );
                    }
                    
                    // Otherwise show price normally
                    return (
                      <div 
                        style={{
                        fontWeight: '800', 
                        fontSize: windowWidth < 576 ? '7px' : '8px',
                        color: '#1a1a1a',
                        background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
                        padding: windowWidth < 576 ? '1px 3px' : '1px 2px',
                        borderRadius: windowWidth < 576 ? '2px' : '2px',
                        border: windowWidth < 576 ? '0.5px solid #1a1a1a' : '1px solid #1a1a1a',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                        whiteSpace: 'nowrap',
                        maxWidth: 'fit-content',
                        margin: windowWidth < 576 ? '0px 0' : '1px 0',
                        flex: 'none',
                        textAlign: 'center',
                        minWidth: windowWidth < 576 ? '60px' : 'auto',
                        cursor: 'pointer',
                        position: 'relative',
                        pointerEvents: 'auto',
                        zIndex: 100
                      }}
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        // Remove any existing tooltips first
                        document.querySelectorAll('.custom-tooltip-price').forEach(t => t.remove());
                        
                        const tooltip = document.createElement('div');
                        tooltip.className = 'custom-tooltip-price';
                        tooltip.textContent = 'Cost/Unit';
                        tooltip.style.cssText = `
                          position: fixed;
                          background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
                          color: white;
                          padding: 4px 8px;
                          border-radius: 4px;
                          font-size: 9px;
                          font-weight: 600;
                          white-space: nowrap;
                          z-index: 999999;
                          pointer-events: none;
                          box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1);
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                          letter-spacing: 0.3px;
                        `;
                        
                        // Position tooltip above the element
                        const rect = e.currentTarget.getBoundingClientRect();
                        tooltip.style.left = `${rect.left + rect.width / 2}px`;
                        tooltip.style.top = `${rect.top - 28}px`;
                        tooltip.style.transform = 'translateX(-50%)';
                        
                        document.body.appendChild(tooltip);
                      }}
                      onMouseLeave={(e) => {
                        document.querySelectorAll('.custom-tooltip-price').forEach(t => t.remove());
                      }}
                      >
                        {(() => {
                          const perUnitPrice = product.rawPrice || 0;
                          return `${formatPrice(perUnitPrice)}/unit`;
                        })()}
                      </div>
                    );
                  })()}
                  
                  {/* Right side - Profit Information - Mobile: Stack vertically, Desktop: Right aligned */}
                  {(() => {
                    // Check if product is listed by admin (no seller info) - hide profit for out of stock
                    const isAdminListed = product.listedBy === 'admin' || 
                                         (!product.sellerInfo && 
                                          (!product.sellers || product.sellers.length === 0) && 
                                          !product.seller);
                    
                    // Don't show profit for admin-listed (out of stock) products
                    if (isAdminListed) {
                      return null;
                    }
                    
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
                        flexDirection: windowWidth < 576 ? 'row' : 'column', 
                        alignItems: windowWidth < 576 ? 'flex-start' : 'flex-end',
                        gap: windowWidth < 576 ? '3px' : '1px',
                        marginLeft: windowWidth < 576 ? '0px' : 'auto',
                        marginTop: windowWidth < 576 ? '0px' : '1px',
                        width: windowWidth < 576 ? '100%' : 'fit-content',
                        overflow: 'visible',
                        flexWrap: windowWidth < 576 ? 'wrap' : 'nowrap'
                      }}>
                        {/* Profit per unit */}
                        <div 
                          style={{
                          fontSize: windowWidth < 576 ? '7px' : '8px',
                          color: '#1a1a1a',
                          fontWeight: '700',
                          background: '#f5f5f5',
                          padding: windowWidth < 576 ? '1px 2px' : '1px 2px',
                          borderRadius: windowWidth < 576 ? '2px' : '3px',
                          border: '1px solid #d0d0d0',
                          whiteSpace: 'nowrap',
                          minWidth: 'fit-content',
                          width: 'fit-content',
                          maxWidth: windowWidth < 576 ? '65px' : 'none',
                          textAlign: 'center',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          boxShadow: windowWidth < 576 ? '0 1px 2px rgba(0, 0, 0, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.08)',
                          flex: windowWidth < 576 ? '0 0 auto' : 'none',
                          cursor: 'pointer',
                          position: 'relative',
                          pointerEvents: 'auto',
                          zIndex: 100
                        }}
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          // Remove any existing tooltips first
                          document.querySelectorAll('.custom-tooltip-profit').forEach(t => t.remove());
                          
                          const tooltip = document.createElement('div');
                          tooltip.className = 'custom-tooltip-profit';
                          tooltip.textContent = 'Net sale/unit';
                          tooltip.style.cssText = `
                            position: fixed;
                            background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
                            color: white;
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-size: 9px;
                            font-weight: 600;
                            white-space: nowrap;
                            z-index: 999999;
                            pointer-events: none;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1);
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                            letter-spacing: 0.3px;
                          `;
                          
                          // Position tooltip above the element
                          const rect = e.currentTarget.getBoundingClientRect();
                          tooltip.style.left = `${rect.left + rect.width / 2}px`;
                          tooltip.style.top = `${rect.top - 28}px`;
                          tooltip.style.transform = 'translateX(-50%)';
                          
                          document.body.appendChild(tooltip);
                        }}
                        onMouseLeave={(e) => {
                          document.querySelectorAll('.custom-tooltip-profit').forEach(t => t.remove());
                        }}
                        >
                          💰 {formatPrice(profitPerUnit)}/unit
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Deal Units Display - Moved Down for Mobile */}
                {(() => {
                  // Check if product is listed by admin (no seller info) - hide for out of stock
                  const isAdminListed = product.listedBy === 'admin' || 
                                       (!product.sellerInfo && 
                                        (!product.sellers || product.sellers.length === 0) && 
                                        !product.seller);
                  
                  // Don't show deal cost for admin-listed (out of stock) products
                  if (isAdminListed) {
                    return null;
                  }
                  
                  return (
                <div style={{ marginTop: windowWidth < 576 ? '0px' : '1px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)', 
                    padding: windowWidth < 576 ? '3px 4px' : '1px 2px',
                    borderRadius: windowWidth < 576 ? '3px' : '3px',
                    border: '1px solid #1a1a1a', 
                    boxShadow: windowWidth < 576 ? '0 1px 3px rgba(0, 0, 0, 0.08)' : '0 1px 4px rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minWidth: windowWidth < 576 ? '100%' : 'auto',
                    width: '100%',
                    gap: windowWidth < 576 ? '6px' : '4px',
                    minHeight: windowWidth < 576 ? '18px' : '20px',
                    maxHeight: windowWidth < 576 ? '20px' : '22px',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: windowWidth < 576 ? '8px' : '4px',
                      flex: 1,
                      minWidth: 0
                    }}>
                      <span style={{
                        fontSize: windowWidth < 576 ? '6px' : '7px', // Increased for better readability
                        color: '#1a1a1a', 
                        fontWeight: '700',
                        whiteSpace: 'nowrap',
                        overflow: 'visible',
                        textOverflow: windowWidth < 576 ? 'ellipsis' : 'clip',
                        maxWidth: windowWidth < 576 ? 'calc(100% - 40px)' : 'none',
                        flex: '0 1 auto'
                      }}>
                        💰 Deal Cost / {product.dealUnits || 1} unit{(product.dealUnits || 1) !== 1 ? 's' : ''}:
                      </span>
                      <span style={{
                        fontSize: windowWidth < 576 ? '6px' : '7px', // Increased for better readability
                        fontWeight: '800', 
                        color: '#1a1a1a',
                        whiteSpace: 'nowrap',
                        minWidth: windowWidth < 576 ? '30px' : '40px',
                        display: 'inline-block',
                        textAlign: windowWidth < 576 ? 'left' : 'center',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: '0 0 auto',
                        marginLeft: windowWidth < 576 ? '-3px' : '0px' // Move left on mobile
                      }}>
                        {(() => {
                          try {
                            // Use raw price (per unit) from database
                            const unitPrice = product.rawPrice || 0;
                            const dealUnits = product.dealUnits || 1;
                            const totalPrice = unitPrice * dealUnits;
                            
                            if (isNaN(totalPrice)) {
                              const formatted = formatPrice(product.price);
                              if (typeof formatted === 'string' && formatted.startsWith('Rs')) {
                                const priceValue = formatted.substring(2);
                                return (
                                  <>
                                    <span style={{ fontSize: '0.7em' }}>Rs</span>
                                    {priceValue}
                                  </>
                                );
                              }
                              return formatted;
                            }
                            
                            // Use formatPrice to handle currency conversion
                            const formatted = formatPrice(totalPrice);
                            if (typeof formatted === 'string' && formatted.startsWith('Rs')) {
                              const priceValue = formatted.substring(2);
                              return (
                                <>
                                  <span style={{ fontSize: '0.7em' }}>Rs</span>
                                  {priceValue}
                                </>
                              );
                            }
                            return formatted;
                          } catch (error) {
                            const formatted = formatPrice(product.price);
                            if (typeof formatted === 'string' && formatted.startsWith('Rs')) {
                              const priceValue = formatted.substring(2);
                              return (
                                <>
                                  <span style={{ fontSize: '0.7em' }}>Rs</span>
                                  {priceValue}
                                </>
                              );
                            }
                            return formatted;
                          }
                        })()}
                      </span>
                    </div>
                    
                    {/* Basket button - Desktop: Orange Circle, Mobile: Rectangular */}
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        addToBasket(product)
                      }}
                      style={{
                        pointerEvents: 'auto', // Enable clicks on this button
                        position: 'relative',
                        zIndex: 3,
                        background: isInBasket(product.id) ? 
                          'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                          'linear-gradient(135deg, #ff6600 0%, #ff3300 100%)',
                        color: 'white',
                        border: 'none',
                        padding: windowWidth < 576 ? '0' : '0',
                        borderRadius: windowWidth < 576 ? '50%' : '50%',
                        fontSize: windowWidth < 576 ? '7px' : '8px',
                        cursor: 'pointer',
                        boxShadow: windowWidth < 576 ? 
                          '0 2px 4px rgba(255, 102, 0, 0.4)' : 
                          '0 3px 8px rgba(255, 102, 0, 0.4)',
                        transition: 'all 0.2s ease',
                        minWidth: windowWidth < 576 ? '18px' : '18px',
                        width: windowWidth < 576 ? '18px' : '18px',
                        height: windowWidth < 576 ? '18px' : '18px',
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
                  );
                })()}

                {/* Profit for Deal Units Display - Below Deal Section */}
                {(() => {
                  // Check if product is listed by admin (no seller info) - hide for out of stock
                  const isAdminListed = product.listedBy === 'admin' || 
                                       (!product.sellerInfo && 
                                        (!product.sellers || product.sellers.length === 0) && 
                                        !product.seller);
                  
                  // Don't show profit for admin-listed (out of stock) products
                  if (isAdminListed) {
                    return null;
                  }
                  
                  // Calculate profit using the same logic as above
                  const getProfitPerUnit = () => {
                    let profitPerUnit = 0;
                    
                    if (product?.profitCalculations?.profitPerUnit) {
                      profitPerUnit = parseFloat(String(product.profitCalculations.profitPerUnit).replace(/[£₨$€]/g, ''));
                    } else if (product?.evaluation?.netProfit) {
                      profitPerUnit = parseFloat(String(product.evaluation.netProfit).replace(/[£₨$€]/g, ''));
                    }
                    
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
                      } else {
                        const productPrice = parseFloat(String(product.price || 0).replace(/[£₨$€]/g, '')) || 0;
                        
                        if (productPrice > 0) {
                          let costPriceGBP = productPrice;
                          const isPKR = String(product.price).includes('₨') || String(product.price).includes('Rs');
                          const isGBP = String(product.price).includes('£');
                          
                          if (isPKR) {
                            costPriceGBP = productPrice * 0.00272;
                          } else if (!isGBP) {
                            costPriceGBP = productPrice;
                          }
                          
                          profitPerUnit = costPriceGBP * 2;
                        }
                      }
                    }
                    
                    return parseFloat(profitPerUnit) || 0;
                  };

                  const profitPerUnit = getProfitPerUnit();
                  const dealUnits = product.dealUnits || 1;
                  const totalProfit = profitPerUnit * dealUnits;

                  // Only show if profit is valid
                  if (profitPerUnit <= 0) {
                    return null;
                  }

                  return (
                    <div style={{ marginTop: windowWidth < 576 ? '1px' : '1px' }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)', 
                        padding: windowWidth < 576 ? '3px 4px' : '1px 2px',
                        borderRadius: windowWidth < 576 ? '3px' : '3px',
                        border: '1px solid #1a1a1a', 
                        boxShadow: windowWidth < 576 ? '0 1px 3px rgba(0, 0, 0, 0.08)' : '0 1px 4px rgba(0, 0, 0, 0.08)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        minWidth: windowWidth < 576 ? '100%' : 'auto',
                        width: '100%',
                        gap: windowWidth < 576 ? '6px' : '4px',
                        minHeight: windowWidth < 576 ? '18px' : '20px',
                        maxHeight: windowWidth < 576 ? '20px' : '22px',
                        boxSizing: 'border-box'
                      }}>
                        <span style={{
                          fontSize: windowWidth < 576 ? '6px' : '7px', // Increased for better readability
                          color: '#1a1a1a', 
                          fontWeight: '700',
                          whiteSpace: 'nowrap',
                          flex: '0 1 auto'
                        }}>
                          📈 Profit cost / {dealUnits} unit{dealUnits !== 1 ? 's' : ''}:
                        </span>
                        <span style={{
                          fontSize: windowWidth < 576 ? '6px' : '7px', // Increased for better readability
                          fontWeight: '800', 
                          color: '#1a1a1a',
                          whiteSpace: 'nowrap',
                          textAlign: 'right'
                        }}>
                          {(() => {
                            const formatted = formatPrice(totalProfit);
                            if (typeof formatted === 'string' && formatted.startsWith('Rs')) {
                              const priceValue = formatted.substring(2);
                              return (
                                <>
                                  <span style={{ fontSize: '0.7em' }}>Rs</span>
                                  {priceValue}
                                </>
                              );
                            }
                            return formatted;
                          })()}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Verify on Amazon Button - Hidden by default, shown on card hover */}
                <div 
                  className="verify-amazon-btn"
                  style={{ 
                    marginTop: windowWidth < 576 ? '0px' : '1px',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: 'none'
                  }}>
                  <a 
                    href={`https://www.amazon.com/s?k=${encodeURIComponent(product.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      pointerEvents: 'auto',
                      position: 'relative',
                      zIndex: 3,
                      background: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
                      color: 'white',
                      border: '2px solid #1a1a1a',
                      padding: windowWidth < 576 ? '2px 3px' : '3px 5px',
                      borderRadius: '4px',
                      fontSize: windowWidth < 576 ? '6px' : '8px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      width: '100%',
                      textDecoration: 'none',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                      minHeight: windowWidth < 576 ? '18px' : '22px',
                      boxSizing: 'border-box'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)';
                      e.target.style.borderColor = '#1a1a1a';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)';
                      e.target.style.borderColor = '#1a1a1a';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                    }}
                    {...(windowWidth < 576 && {
                      onTouchStart: (e) => {
                        e.target.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)';
                        e.target.style.borderColor = '#1a1a1a';
                      },
                      onTouchEnd: (e) => {
                        setTimeout(() => {
                          e.target.style.background = 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)';
                          e.target.style.borderColor = '#1a1a1a';
                        }, 150);
                      }
                    })}
                  >
                    <i className="fab fa-amazon"></i> Verify on Amazon
                  </a>
                </div>
              </div>
              </div> {/* Close the wrapper div with pointerEvents: 'none' */}
            </div>
            )
          })}
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