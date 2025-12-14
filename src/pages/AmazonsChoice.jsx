import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import ScrollToTop from '../components/ScrollToTop'
import ProductCardSkeleton from '../components/ProductCardSkeleton'
import { useCurrency } from '../context/CurrencyContext'
import { useSeller } from '../context/SellerContext'
import { useBasket } from '../context/BasketContext'
import { useAdmin } from '../context/AdminContext'
import { getImageUrl } from '../utils/imageImports'
import { getApiUrl } from '../utils/api'
import cacheManager from '../utils/cacheManager'
import '../styles/mobile-products.css'

const AmazonsChoice = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [fastSellingProducts, setFastSellingProducts] = useState([])
  const [bestSellingProducts, setBestSellingProducts] = useState([])
  const [filteredFastSelling, setFilteredFastSelling] = useState([])
  const [filteredBestSelling, setFilteredBestSelling] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const [showSkeletonOnly, setShowSkeletonOnly] = useState(true) // Only show skeleton, no intermediate states
  const [activeTab, setActiveTab] = useState('all') // 'all', 'fast', 'best'
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('cat') || 'all')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [sortBy, setSortBy] = useState('featured')
  const [priceFilter, setPriceFilter] = useState('all')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [currentStatusIndex, setCurrentStatusIndex] = useState({})

  const [isBuyerLoggedIn, setIsBuyerLoggedIn] = useState(false)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showQuickView, setShowQuickView] = useState(false)
  const [quickViewProduct, setQuickViewProduct] = useState(null)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('jazzcash')
  const [paymentDetails, setPaymentDetails] = useState({
    receiptImage: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolderName: ''
  })
  const { formatPrice } = useCurrency()
  const { isLoggedIn: isSellerLoggedIn } = useSeller()
  const { addToBasket, isInBasket } = useBasket()
  const { admin, isLoggedIn: isAdminContextLoggedIn } = useAdmin()
  
  const productsPerPage = 48
  const indexOfLastProduct = currentPage * productsPerPage
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage
  
  // Determine which products to display based on active tab
  const getActiveProducts = () => {
    if (activeTab === 'fast') return filteredFastSelling
    if (activeTab === 'best') return filteredBestSelling
    return filteredProducts
  }
  
  const activeProducts = getActiveProducts()
  const currentProducts = activeProducts.slice(indexOfFirstProduct, indexOfLastProduct)
  const totalPages = Math.ceil(activeProducts.length / productsPerPage)
  
  // Removed excessive console logging for better performance

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'remote', label: 'Remote Controls' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'strap', label: 'Watch Straps' },
    { value: 'jewelry', label: 'Jewelry' },
    { value: 'party', label: 'Party Supplies' },
    { value: 'home', label: 'Home & Decor' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'automotive', label: 'Automotive' },
    { value: 'tape', label: 'Tape' },
    { value: 'lampshade', label: 'Lampshades' }
  ]



  // Check if buyer or admin is logged in
  useEffect(() => {
    const buyerToken = localStorage.getItem('buyerToken')
    setIsBuyerLoggedIn(!!buyerToken)
    setIsAdminLoggedIn(isAdminContextLoggedIn)
  }, [isAdminContextLoggedIn])

  // Handle window resize for responsive grid
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fetch products from API - Database products (Amazon's Choice) ONLY
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        // Optimized caching strategy with version check
        const cacheKey = 'amazons_choice_products'
        const cachedData = !initialLoad ? cacheManager.get(cacheKey) : null;
        
        // Check if cached data is still valid by comparing with server cache version
        if (cachedData && !initialLoad) {
          try {
            const versionResponse = await fetch(getApiUrl('products/public/cache-version'))
            if (versionResponse.ok) {
              const versionData = await versionResponse.json()
              // If server cache version is newer than our cached version, invalidate local cache
              if (cachedData.cacheVersion && versionData.version > cachedData.cacheVersion) {
                console.log('🗑️ Local cache invalidated due to server updates')
                cacheManager.remove(cacheKey)
              } else {
                // Cache is still valid
                setProducts(cachedData.products)
                setFastSellingProducts(cachedData.fastSelling)
                setBestSellingProducts(cachedData.bestSelling)
                setLoading(false)
                setShowSkeletonOnly(false)
                return
              }
            }
          } catch (error) {
            console.log('Cache version check failed, proceeding with fresh fetch')
          }
        }
        
        // Simplified single API call with timeout
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 30000) // Increased timeout to 30 seconds
          
          const response = await fetch(getApiUrl(`products/public/fast`), {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
          })
          
          clearTimeout(timeoutId)
          
          if (response.ok) {
            const data = await response.json()
            
            if (data.products && data.products.length > 0) {
                
              // Optimized transformation with default values
              const transformedProducts = data.products.map(p => ({
                id: p._id,
                name: p.name || 'Product',
                price: (p.currency || 'GBP') === 'GBP' ? `£${parseFloat(p.price || 25).toFixed(2)}` : 
                       p.currency === 'USD' ? `$${parseFloat(p.price || 25).toFixed(2)}` :
                       p.currency === 'AED' ? `د.إ${parseFloat(p.price || 25).toFixed(2)}` :
                       `₨${parseFloat(p.price || 25).toFixed(2)}`, // Default to GBP if currency not set
                originalPrice: p.originalPrice ? 
                  ((p.currency || 'GBP') === 'GBP' ? `£${p.originalPrice}` : 
                   p.currency === 'USD' ? `$${p.originalPrice}` :
                   p.currency === 'AED' ? `د.إ${p.originalPrice}` :
                   `₨${p.originalPrice}`) : 
                  ((p.currency || 'GBP') === 'GBP' ? `£${((p.price || 25) * 1.3).toFixed(2)}` : 
                   p.currency === 'USD' ? `$${((p.price || 25) * 1.3).toFixed(2)}` :
                   p.currency === 'AED' ? `د.إ${((p.price || 25) * 1.3).toFixed(2)}` :
                   `₨${((p.price || 25) * 1.3).toFixed(2)}`),
                discount: 25,
                category: p.category || 'general',
                brand: 'Quality Brand',
                image: p.images?.[0] || '',
                images: p.images || [],
                rating: 4.5,
                reviews: 150,
                stock: 50,
                dealUnits: 1, // Default to 1 unit
                currency: 'GBP', // Default to GBP
                statuses: ['Amazon\'s Choice'],
                isAmazonsChoice: true,
                isBestSeller: false,
                isFastSelling: false
              }))
              
              setProducts(transformedProducts)
              
              // Separate categories
              const fastSelling = transformedProducts.filter(p => p.isFastSelling)
              const bestSelling = transformedProducts.filter(p => p.isBestSeller)
              
              setFastSellingProducts(fastSelling)
              setBestSellingProducts(bestSelling)
              
              // Cache for 5 minutes with version info
              cacheManager.set('amazons_choice_products', {
                products: transformedProducts,
                fastSelling,
                bestSelling,
                cacheVersion: Date.now() // Store when this cache was created
              }, 5 * 60 * 1000)
              
              setLoading(false)
              setInitialLoad(false)
              setShowSkeletonOnly(false)
            } else {
              setProducts([])
              setLoading(false)
              setInitialLoad(false)
              setShowSkeletonOnly(false)
            }
          } else {
            throw new Error('Failed to fetch products')
          }
        } catch (error) {
          setProducts([])
          setLoading(false)
          setInitialLoad(false)
          setShowSkeletonOnly(false)
        }
      } catch (error) {
        setProducts([])
        setLoading(false)
        setInitialLoad(false)
        setShowSkeletonOnly(false)
      }
    }

    fetchProducts()
  }, [])

  // Optimized server-side filtering
  const fetchFilteredProducts = async (category, searchTerm = '') => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams()
      if (category && category !== 'all') params.append('category', category)
      if (searchTerm) params.append('search', searchTerm)
      params.append('limit', '50') // Increased limit for better results
      params.append('isAmazonsChoice', 'true') // Ensure we get Amazon's Choice products
      
      const response = await fetch(getApiUrl(`products/public?${params.toString()}`))
      
      if (response.ok) {
        const data = await response.json()
        console.log('API Response:', data) // Debug log
        
        if (data.products && data.products.length > 0) {
          console.log(`✅ Found ${data.products.length} products for category: ${category}, search: ${searchTerm}`)
          const transformedProducts = data.products.map(p => ({
            id: p._id,
            name: p.name,
            price: (p.currency || 'GBP') === 'GBP' ? `£${parseFloat(p.price).toFixed(2)}` : 
                   p.currency === 'USD' ? `$${parseFloat(p.price).toFixed(2)}` :
                   p.currency === 'AED' ? `د.إ${parseFloat(p.price).toFixed(2)}` :
                   `₨${parseFloat(p.price).toFixed(2)}`, // Default to GBP if currency not set
            originalPrice: p.originalPrice ? 
              ((p.currency || 'GBP') === 'GBP' ? `£${p.originalPrice}` : 
               p.currency === 'USD' ? `$${p.originalPrice}` :
               p.currency === 'AED' ? `د.إ${p.originalPrice}` :
               `₨${p.originalPrice}`) : 
              ((p.currency || 'GBP') === 'GBP' ? `£${(p.price * 1.3).toFixed(2)}` : 
               p.currency === 'USD' ? `$${(p.price * 1.3).toFixed(2)}` :
               p.currency === 'AED' ? `د.إ${(p.price * 1.3).toFixed(2)}` :
               `₨${(p.price * 1.3).toFixed(2)}`),
            discount: p.discount || 20,
            category: p.category,
            brand: p.brand || '',
            image: p.images?.[0] || '',
            images: p.images || [],
            rating: p.rating || 4.5,
            reviews: p.reviews || 150,
            stock: p.stock || 50,
            dealUnits: p.dealUnits || 1, // Default to 1 unit if not set
            currency: p.currency || 'GBP', // Default to GBP if not set
            isAmazonsChoice: true,
            isBestSeller: p.isBestSeller || false,
            statuses: ['Amazon\'s Choice']
          }))
          
          setFilteredProducts(transformedProducts)
          setFilteredFastSelling(transformedProducts.filter(p => p.isFastSelling))
          setFilteredBestSelling(transformedProducts.filter(p => p.isBestSeller))
        } else {
          // No products found
          console.log(`❌ No products found for category: ${category}, search: ${searchTerm}`)
          setFilteredProducts([])
          setFilteredFastSelling([])
          setFilteredBestSelling([])
        }
        setCurrentPage(1)
      } else {
        console.error('API Error:', response.status, response.statusText)
        // Keep current products on API error
      }
    } catch (error) {
      console.error('Fetch error:', error)
      // Keep current products on network error
    } finally {
      setLoading(false)
      setShowSkeletonOnly(false)
    }
  }

  // Helper function to check if product should show profit
  const shouldShowProfit = (product) => {
    const name = product.name.toLowerCase()
    return name.includes('nose ring') || 
           name.includes('bulb') || 
           name.includes('fuse') || 
           name.includes('lampshade')
  }

  // Unified filtering logic - handles both category and search
  useEffect(() => {
    console.log('🔄 Filtering logic triggered:', { 
      loading, 
      productsLength: products.length, 
      selectedCategory, 
      searchQuery,
      hasFilters: (selectedCategory && selectedCategory !== 'all') || searchQuery
    })
    
    // Skip if we're still loading initial products
    if (loading && products.length === 0) {
      console.log('⏳ Skipping filter - still loading initial products')
      return
    }
    
    // If we have category or search, use server-side filtering
    if ((selectedCategory && selectedCategory !== 'all') || searchQuery) {
      console.log('🌐 Using server-side filtering')
      fetchFilteredProducts(selectedCategory, searchQuery)
      return
    }
    
    // Reset to all products when no filters
    if (!selectedCategory || selectedCategory === 'all') {
      console.log('🔄 Resetting to all products')
      setFilteredProducts(products)
      setFilteredFastSelling(fastSellingProducts)
      setFilteredBestSelling(bestSellingProducts)
      setCurrentPage(1)
      return
    }
    
    // Client-side filtering for price and rating only
    let sourceProducts = products
    if (activeTab === 'fast') sourceProducts = fastSellingProducts
    else if (activeTab === 'best') sourceProducts = bestSellingProducts
    
    let filtered = [...sourceProducts]

    // Apply price filter
    if (priceFilter !== 'all') {
      const [min, max] = priceFilter.split('-').map(Number)
      filtered = filtered.filter(p => {
        const price = parseFloat(p.price.replace(/[£$₨]/g, ''))
        return max ? (price >= min && price <= max) : price >= min
      })
    }

    // Apply rating filter
    if (ratingFilter !== 'all') {
      const minRating = parseFloat(ratingFilter)
      filtered = filtered.filter(p => p.rating >= minRating)
    }

    // Update filtered state
    if (activeTab === 'fast') setFilteredFastSelling(filtered)
    else if (activeTab === 'best') setFilteredBestSelling(filtered)
    else setFilteredProducts(filtered)
    
    setCurrentPage(1)
  }, [selectedCategory, searchQuery, priceFilter, ratingFilter, products, fastSellingProducts, bestSellingProducts, activeTab])

  // Simplified URL parameter handling
  useEffect(() => {
    const catParam = searchParams.get('cat')
    const searchParam = searchParams.get('search')
    
    console.log('🔍 URL params changed:', { catParam, searchParam, currentCategory: selectedCategory, currentSearch: searchQuery })
    
    if (catParam && catParam !== selectedCategory) {
      console.log('📂 Setting category to:', catParam)
      setSelectedCategory(catParam)
    } else if (!catParam && selectedCategory !== 'all') {
      console.log('📂 Resetting category to: all')
      setSelectedCategory('all')
    }
    
    if (searchParam !== searchQuery) {
      console.log('🔍 Setting search to:', searchParam)
      setSearchQuery(searchParam || '')
    }
  }, [searchParams, selectedCategory, searchQuery])

  // Remove the separate search useEffect since it's now handled in the unified filtering logic above

  // Removed complex badge rotation system for better performance
  // Products now show simple static "Amazon's Choice" badge



  const handleCategoryClick = (category) => {
    setSelectedCategory(category)
    if (category !== 'all' && category !== selectedCategory) {
      setLoading(true)
    }
  }

  const handleSearch = () => {
    // Search is handled by useEffect
  }

  const handleResetFilters = () => {
    // Navigate to home page without any parameters
    navigate('/')
    
    // Reset state
    setSelectedCategory('all')
    setSearchQuery('')
    setSortBy('featured')
    setPriceFilter('all')
    setRatingFilter('all')
    setCurrentPage(1)
  }

  const renderStars = (rating) => {
    // Validate and cap rating between 0 and 5
    const validRating = Math.min(Math.max(parseFloat(rating) || 0, 0), 5);
    
    const stars = []
    const fullStars = Math.floor(validRating)
    const hasHalfStar = validRating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(<i key={i} className="fas fa-star"></i>)
    }

    if (hasHalfStar) {
      stars.push(<i key="half" className="fas fa-star-half-alt"></i>)
    }

    const emptyStars = 5 - Math.ceil(validRating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<i key={`empty-${i}`} className="far fa-star"></i>)
    }

    return stars
  }



  const handleQuickView = (e, product) => {
    e.stopPropagation()
    setQuickViewProduct(product)
    setShowQuickView(true)
  }

  const handleContactNow = (e, product) => {
    e.stopPropagation()
    // Navigate to product detail page where they can unlock/contact supplier
    const params = new URLSearchParams({
      name: product.name,
      img: product.image,
      price: product.price.replace(/[£$₨]/g, ''),
      rating: product.rating || 4.5,
      reviews: product.reviews || 0,
      category: product.category || 'General',
      brand: product.brand || '',
      discount: product.discount || 0
    })
    navigate(`/product/${product.id}?${params.toString()}`)
  }

  const handleListProduct = (e, product) => {
    e.stopPropagation()
    if (!isSellerLoggedIn) {
      alert('Please login as a seller to list products')
      navigate('/login/supplier')
      return
    }
    
    // Remove verification check - direct payment
    setSelectedProduct(product)
    setShowPaymentModal(true)
  }

  const handlePaymentSubmit = async () => {
    if (!selectedProduct) return

    // Validate payment details based on method
    if (paymentMethod === 'jazzcash' && !paymentDetails.receiptImage) {
      alert('❌ Please upload payment receipt')
      return
    }

    if ((paymentMethod === 'visa' || paymentMethod === 'mastercard') && 
        (!paymentDetails.cardNumber || !paymentDetails.expiryDate || !paymentDetails.cvv || !paymentDetails.cardHolderName)) {
      alert('❌ Please fill all card details')
      return
    }

    try {
      const token = localStorage.getItem('sellerToken')
      
      const paymentData = {
        amount: 50000, // 500 PKR = 50000 (in paisa)
        currency: 'PKR',
        paymentMethod: paymentMethod,
        transactionId: `TXN${Date.now()}`,
        purpose: 'product_listing',
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        paymentDetails: paymentDetails,
        status: paymentMethod === 'jazzcash' ? 'pending' : 'completed' // JazzCash needs admin approval
      }

      const response = await fetch(getApiUrl('sellers/payment'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
      })

      const data = await response.json()

      if (response.ok) {
        // Add product to seller's inventory
        const addProductResponse = await fetch(getApiUrl('products/seller/list-admin-product'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            adminProductId: selectedProduct.id,
            paymentTransactionId: `TXN${Date.now()}`
          })
        })

        if (addProductResponse.ok) {
          if (paymentMethod === 'jazzcash') {
            alert('✅ Payment receipt submitted! Waiting for admin approval.')
          } else {
            alert('✅ Payment successful! Product has been added to your inventory.')
          }
          setShowPaymentModal(false)
          setSelectedProduct(null)
          // Reset payment details
          setPaymentDetails({
            receiptImage: '',
            cardNumber: '',
            expiryDate: '',
            cvv: '',
            cardHolderName: ''
          })
        } else {
          alert('❌ Payment processing failed. Please try again.')
        }
      } else {
        alert('❌ ' + data.message)
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('❌ Failed to process payment')
    }
  }

  const renderPagination = () => {
    const pages = []
    const maxPagesToShow = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1)
    }

    // Previous button
    pages.push(
      <li key="prev" className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
        <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
          <i className="fas fa-chevron-left"></i>
        </button>
      </li>
    )

    // First page
    if (startPage > 1) {
      pages.push(
        <li key={1} className="page-item">
          <button className="page-link" onClick={() => setCurrentPage(1)}>1</button>
        </li>
      )
      if (startPage > 2) {
        pages.push(<li key="dots1" className="page-item disabled"><span className="page-link">...</span></li>)
      }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
          <button className="page-link" onClick={() => setCurrentPage(i)}>{i}</button>
        </li>
      )
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<li key="dots2" className="page-item disabled"><span className="page-link">...</span></li>)
      }
      pages.push(
        <li key={totalPages} className="page-item">
          <button className="page-link" onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
        </li>
      )
    }

    // Next button
    pages.push(
      <li key="next" className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
        <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
          <i className="fas fa-chevron-right"></i>
        </button>
      </li>
    )

    return pages
  }

  if (loading || showSkeletonOnly) {
    return (
      <div className="container products-container" style={{maxWidth: '1600px', padding: '10px 15px'}}>
        <ScrollToTop />
        
        {/* Show skeleton grid while loading - NO intermediate states */}
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
          {/* Show 48 skeleton cards (one page worth) */}
          {Array.from({ length: 48 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </div>
    )
  }

  // Show graceful error state if no products loaded
  if (!loading && currentProducts.length === 0 && !searchQuery && selectedCategory === 'all') {
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
          <div style={{
            fontSize: '4rem',
            marginBottom: '20px',
            opacity: 0.3
          }}>
            🔌
          </div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '10px'
          }}>
            No Products Found
          </h2>
          <p style={{
            fontSize: '1rem',
            color: '#6b7280',
            marginBottom: '20px',
            maxWidth: '500px',
            lineHeight: '1.5'
          }}>
            {searchQuery ? `No products found for "${searchQuery}"` : 
             selectedCategory !== 'all' ? `No products found in "${categories.find(c => c.value === selectedCategory)?.label}" category` :
             'No products available at the moment. Please try again later.'}
          </p>
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
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#5a67d8'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#667eea'
            }}
          >
            🔄 Try Again
          </button>
          <p style={{
            fontSize: '0.875rem',
            color: '#9ca3af',
            marginTop: '15px'
          }}>
            If the problem persists, please try again in a few minutes.
          </p>
        </div>
      </div>
    )
  }

  // Removed debug console logs for better performance

  return (
    <div>
      <div className="container products-container" style={{maxWidth: '1600px', padding: '10px 15px'}}>





        {/* Products Grid */}
        {/* Active Filters Indicator */}
        {(searchQuery || selectedCategory !== 'all') && (
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#0369a1' }}>
                <i className="fas fa-filter"></i> Active Filters:
              </span>
              {searchQuery && (
                <span style={{
                  background: '#0ea5e9',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  Search: "{searchQuery}"
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span style={{
                  background: '#10b981',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  Category: {categories.find(c => c.value === selectedCategory)?.label}
                </span>
              )}
            </div>
            <button
              onClick={handleResetFilters}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              <i className="fas fa-times"></i> Clear All
            </button>
          </div>
        )}

        {/* No Results State */}
        {!loading && currentProducts.length === 0 && (searchQuery || selectedCategory !== 'all') && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#666'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔍</div>
            <h3 style={{ marginBottom: '10px' }}>No products found</h3>
            <p style={{ marginBottom: '20px' }}>
              {searchQuery ? `No results for "${searchQuery}"` : 
               `No products in "${categories.find(c => c.value === selectedCategory)?.label}" category`}
            </p>
            <button
              onClick={handleResetFilters}
              style={{
                padding: '10px 20px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Products Grid */}
        <div id="products-grid" style={{
          display: currentProducts.length > 0 ? 'grid' : 'none', 
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
          {currentProducts.length > 0 && (
            currentProducts.map((product, index) => (
              <div 
                key={product.id} 
                className="product-card"
                onClick={() => {
                  try {
                    // Get the currently displayed badge, but filter out "in basket" badges
                    const currentBadgeIndex = currentStatusIndex[index] || 0;
                    let currentBadge = product.statuses && product.statuses[currentBadgeIndex] 
                      ? product.statuses[currentBadgeIndex] 
                      : 'Amazon\'s Choice';
                    
                    // If current badge is "in basket", find the actual product badge
                    if (currentBadge.includes('in basket')) {
                      // Find the first non-basket badge
                      const productBadge = product.statuses?.find(status => !status.includes('in basket'));
                      currentBadge = productBadge || 'Amazon\'s Choice';
                    }
                    
                    const params = new URLSearchParams({
                      name: product.name || 'Product',
                      img: product.image || '',
                      price: (product.price || '£0').replace(/[£$₨]/g, ''),
                      rating: product.rating || 4.5,
                      reviews: product.reviews || 0,
                      category: product.category || 'General',
                      brand: product.brand || '',
                      discount: product.discount || 0,
                      badge: currentBadge
                    });
                    const url = `/product/${product.id}?${params.toString()}`;
                    navigate(url);
                  } catch (error) {
                    console.error('Navigation error:', error);
                    // Fallback navigation
                    navigate(`/product/${product.id}`);
                  }
                }}
                style={{cursor: 'pointer'}}
              >
                <div className="product-image-container" style={{
                  position: 'relative', 
                  height: windowWidth < 576 ? '120px' : '140px', 
                  overflow: 'visible', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  background: '#fff',
                  padding: windowWidth < 576 ? '5px' : '8px',
                  minHeight: windowWidth < 576 ? '120px' : '140px'
                }}>
                  <img 
                    src={getImageUrl(product.image)}
                    alt={product.name} 
                    className="product-image" 
                    loading="lazy"
                    onError={(e) => {
                      console.error('Image failed to load:', product.image)
                      e.target.style.display = 'none'
                    }}
                    style={{
                      maxWidth: '100%', 
                      maxHeight: '100%', 
                      width: 'auto', 
                      height: 'auto', 
                      objectFit: 'contain',
                      display: 'block',
                      margin: 'auto',
                      visibility: 'visible',
                      opacity: 1,
                      position: 'relative',
                      zIndex: 1
                    }} 
                  />
                  
                  {/* Static Amazon's Choice Badge */}
                  <div style={{position: 'absolute', top: '4px', right: '4px', zIndex: 2}}>
                    <span 
                      style={{
                        padding: windowWidth < 576 ? '1px 4px' : '2px 6px',
                        borderRadius: '3px',
                        fontWeight: '700',
                        fontSize: windowWidth < 576 ? '0.5rem' : '0.55rem',
                        display: 'inline-block',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        lineHeight: '1.2',
                        backgroundColor: '#667eea',
                        color: 'white',
                        pointerEvents: 'none'
                      }}
                    >
                      Amazon's Choice
                    </span>
                  </div>
                  

                  
                  {/* Quick View Plus Icon - Bottom Right Corner */}
                  <button
                    onClick={(e) => handleQuickView(e, product)}
                    style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '4px',
                      zIndex: 3,
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(0, 0, 0, 0.7)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: '700',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)'
                      e.currentTarget.style.transform = 'scale(1.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                  >
                    +
                  </button>
                </div>
                
                <div className="product-info" style={{padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: '3px'}}>
                  <h5 className="product-title" style={{fontSize: '10px', fontWeight: '700', margin: 0, lineHeight: '1.2', height: '24px', overflow: 'hidden'}}>{product.name}</h5>
                  
                  <div className="rating-container" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px'}}>
                    <div className="rating-stars" style={{color: '#f6b042', fontSize: '8px', flex: 1}}>
                      {renderStars(product.rating)}
                      <span className="rating-count" style={{fontWeight: '700', color: '#374151', marginLeft: '2px', fontSize: '8px'}}>({product.reviews})</span>
                    </div>
                    
                    {/* RRP and Basket - Side by side on right */}
                    {product.rrp ? (
                      <div style={{display: 'flex', gap: '3px', alignItems: 'center'}}>
                        <div style={{
                          background: '#dc2626',
                          color: '#ffffff',
                          padding: '2px 5px',
                          borderRadius: '3px',
                          fontSize: '7px',
                          fontWeight: '700',
                          whiteSpace: 'nowrap'
                        }}>
                          RRP: {product.rrp}
                        </div>
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
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          title={isInBasket(product.id) ? 'In Basket' : 'Add to Basket'}
                        >
                          <i className={isInBasket(product.id) ? 'fas fa-check' : 'fas fa-shopping-basket'}></i>
                        </button>
                      </div>
                    ) : (
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
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        title={isInBasket(product.id) ? 'In Basket' : 'Add to Basket'}
                      >
                        <i className={isInBasket(product.id) ? 'fas fa-check' : 'fas fa-shopping-basket'}></i>
                      </button>
                    )}
                  </div>
                  
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px'}}>
                    <div className="price" style={{fontWeight: '800', fontSize: '12px', color: '#0b3b2e'}}>
                      {formatPrice(product.price)}/unit
                    </div>
                    
                    {/* Profit calculations removed as requested */}
                  </div>
                  
                  {/* Seller Info for verified sellers */}
                  {product.sellerInfo && product.sellerInfo.verificationStatus === 'approved' && (
                    <div style={{
                      background: '#f0f9ff', 
                      border: '1px solid #0ea5e9', 
                      borderRadius: '3px', 
                      padding: '2px 4px',
                      fontSize: '7px',
                      color: '#0369a1'
                    }}>
                      <i className="fas fa-check-circle me-1"></i>
                      Verified Seller • {product.sellerInfo.city}
                    </div>
                  )}
                  
                  {/* Deal Units Display - Always show for all products */}
                  <div style={{display: 'flex', gap: '3px', marginTop: '4px'}}>
                    <div style={{
                      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
                      padding: '4px 6px', 
                      borderRadius: '4px', 
                      border: '1px solid #f59e0b', 
                      flex: 1,
                      boxShadow: '0 1px 3px rgba(245, 158, 11, 0.2)'
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span style={{fontSize: '8px', color: '#92400e', fontWeight: '700'}}>
                          💰 Deal of {product.dealUnits || 1} unit{(product.dealUnits || 1) !== 1 ? 's' : ''}
                        </span>
                        <span style={{fontSize: '9px', fontWeight: '800', color: '#b45309'}}>
                          {(() => {
                            try {
                              const unitPrice = parseFloat(product.price.replace(/[£$₨]/g, '')) || 0;
                              const dealUnits = product.dealUnits || 1;
                              const totalPrice = unitPrice * dealUnits;
                              
                              // Debug log for first few products
                              if (Math.random() < 0.1) { // Log 10% of products for debugging
                                console.log('Deal calculation:', {
                                  productName: product.name?.substring(0, 30),
                                  unitPrice,
                                  dealUnits,
                                  totalPrice,
                                  originalPrice: product.price
                                });
                              }
                              
                              if (isNaN(totalPrice)) return formatPrice(product.price);
                              return formatPrice(`£${totalPrice.toFixed(2)}`);
                            } catch (error) {
                              console.error('Deal calculation error:', error);
                              return formatPrice(product.price);
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px'}}>
                    
                    <a 
                      href={`https://www.amazon.com/s?k=${encodeURIComponent(product.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="verify-amazon-btn"
                      onClick={(e) => e.stopPropagation()}
                      style={{background: '#232f3e', color: 'white', border: 'none', padding: '4px 6px', borderRadius: '3px', fontSize: '8.5px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', width: '100%', textDecoration: 'none'}}
                    >
                      <i className="fab fa-amazon"></i> Verify on Amazon
                    </a>
                    
                    {isBuyerLoggedIn && (
                      <button
                        onClick={(e) => handleContactNow(e, product)}
                        style={{background: '#10b981', color: 'white', border: 'none', padding: '4px 6px', borderRadius: '3px', fontSize: '8.5px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', width: '100%', cursor: 'pointer'}}
                      >
                        <i className="fas fa-phone"></i> Contact Now
                      </button>
                    )}
                    
                    {/* Seller List Button */}
                    {isSellerLoggedIn && (
                      <button
                        onClick={(e) => handleListProduct(e, product)}
                        style={{background: '#f59e0b', color: 'white', border: 'none', padding: '4px 6px', borderRadius: '3px', fontSize: '8.5px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', width: '100%', cursor: 'pointer'}}
                      >
                        <i className="fas fa-plus"></i> List Product (₨500)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {activeProducts.length > productsPerPage && (
          <div className="pagination-container" style={{display: 'flex', justifyContent: 'center', marginTop: '30px', padding: '20px 0'}}>
            <ul className="pagination" style={{display: 'flex', gap: '8px', listStyle: 'none', padding: 0, margin: 0}}>
              {renderPagination()}
            </ul>
          </div>
        )}

      {/* Quick View Modal */}
      {showQuickView && quickViewProduct && (
        <div 
          className="modal show d-block" 
          style={{backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999}}
          onClick={() => setShowQuickView(false)}
        >
          <div 
            className="modal-dialog modal-dialog-centered" 
            style={{maxWidth: windowWidth < 576 ? '90%' : '500px'}}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content" style={{borderRadius: '12px', overflow: 'hidden'}}>
              <div className="modal-header" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', padding: '15px 20px', border: 'none'}}>
                <h5 className="modal-title" style={{fontSize: '16px', fontWeight: '700', margin: 0}}>
                  Quick View
                </h5>
                <button 
                  type="button" 
                  onClick={() => setShowQuickView(false)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: '#fff',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700'
                  }}
                >
                  ×
                </button>
              </div>
              <div className="modal-body" style={{padding: '20px'}}>
                {/* Product Image */}
                <div style={{textAlign: 'center', marginBottom: '20px'}}>
                  <img 
                    src={quickViewProduct.image} 
                    alt={quickViewProduct.name}
                    style={{width: '100%', maxWidth: '250px', height: 'auto', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e5e7eb'}}
                  />
                </div>
                
                {/* Product Title */}
                <h6 style={{fontSize: '14px', fontWeight: '700', marginBottom: '10px', color: '#111'}}>
                  {quickViewProduct.name}
                </h6>
                
                {/* Price */}
                <div style={{fontSize: '18px', fontWeight: '800', color: '#10b981', marginBottom: '15px'}}>
                  {formatPrice(quickViewProduct.price)}
                </div>
                
                {/* Rating */}
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px'}}>
                  <div style={{color: '#f6b042', fontSize: '12px'}}>
                    {renderStars(quickViewProduct.rating)}
                  </div>
                  <span style={{fontSize: '12px', color: '#6b7280'}}>
                    ({quickViewProduct.reviews} reviews)
                  </span>
                </div>
                
                {/* Supplier Information */}
                <div style={{
                  background: '#f9fafb',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '15px',
                  border: '1px solid #e5e7eb'
                }}>
                  <h6 style={{fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: '#374151'}}>
                    <i className="fas fa-store"></i> Supplier Information
                  </h6>
                  
                  {isAdminLoggedIn ? (
                    <div style={{fontSize: '12px', color: '#111'}}>
                      <div style={{marginBottom: '6px'}}>
                        <strong>Supplier:</strong> Generic Wholesale Ltd.
                      </div>
                      <div style={{marginBottom: '6px'}}>
                        <strong>Contact:</strong> +92 300 1234567
                      </div>
                      <div style={{marginBottom: '6px'}}>
                        <strong>Email:</strong> supplier@genericwholesale.com
                      </div>
                      <div style={{marginBottom: '6px'}}>
                        <strong>Location:</strong> Karachi, Pakistan
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px',
                      background: '#fff',
                      borderRadius: '6px',
                      border: '1px dashed #d1d5db'
                    }}>
                      <i className="fas fa-lock" style={{fontSize: '24px', color: '#9ca3af'}}></i>
                      <div style={{fontSize: '11px', color: '#6b7280'}}>
                        <div style={{fontWeight: '600', marginBottom: '3px'}}>Supplier details locked</div>
                        <div>Login as admin to view supplier information</div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Number of Suppliers */}
                <div style={{
                  background: '#ecfdf5',
                  padding: '12px 15px',
                  borderRadius: '8px',
                  border: '1px solid #a7f3d0',
                  marginBottom: '15px'
                }}>
                  <div style={{fontSize: '12px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <i className="fas fa-users" style={{fontSize: '16px'}}></i>
                    <span>
                      <strong>{Math.floor(Math.random() * 15) + 3} suppliers</strong> are selling this product
                    </span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                  <button
                    onClick={() => {
                      setShowQuickView(false)
                      const params = new URLSearchParams({
                        name: quickViewProduct.name,
                        img: quickViewProduct.image,
                        price: quickViewProduct.price.replace(/[£$₨]/g, ''),
                        rating: quickViewProduct.rating || 4.5,
                        reviews: quickViewProduct.reviews || 0,
                        category: quickViewProduct.category || 'General',
                        brand: quickViewProduct.brand || '',
                        discount: quickViewProduct.discount || 0
                      })
                      navigate(`/product/${quickViewProduct.id}?${params.toString()}`)
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#667eea',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#5568d3'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#667eea'}
                  >
                    <i className="fas fa-eye"></i> View Full Details
                  </button>
                  
                  {isSellerLoggedIn && (
                    <button
                      onClick={() => {
                        setShowQuickView(false)
                        handleListProduct({ stopPropagation: () => {} }, quickViewProduct)
                      }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#f59e0b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#d97706'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f59e0b'}
                    >
                      <i className="fas fa-plus"></i> List (₨500)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedProduct && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">List Product - Payment Required</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowPaymentModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="text-center mb-3">
                  <img 
                    src={selectedProduct.image} 
                    alt={selectedProduct.name}
                    style={{width: '100px', height: '100px', objectFit: 'contain'}}
                  />
                  <h6 className="mt-2">{selectedProduct.name}</h6>
                  <p className="text-muted">{selectedProduct.price}</p>
                </div>
                
                <div className="alert alert-info">
                  <h6><i className="fas fa-info-circle"></i> Payment Details</h6>
                  <ul className="mb-0">
                    <li>Listing Fee: <strong>₨500</strong></li>
                    <li>Product will be added to your inventory</li>
                    <li>You can start selling immediately after payment</li>
                    <li>Product will appear in your seller dashboard</li>
                  </ul>
                </div>

                <div className="mb-3">
                  <label className="form-label">Payment Method</label>
                  <select 
                    className="form-control" 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="jazzcash">JazzCash - 03235685367</option>
                    <option value="visa">Visa Card</option>
                    <option value="mastercard">MasterCard</option>
                  </select>
                </div>

                {paymentMethod === 'jazzcash' && (
                  <div>
                    <div className="alert alert-info">
                      <h6><i className="fas fa-info-circle"></i> JazzCash Payment Instructions</h6>
                      <ol className="mb-0">
                        <li>Send ₨500 to <strong>03235685367</strong></li>
                        <li>Take a screenshot of the payment confirmation</li>
                        <li>Upload the receipt image below</li>
                      </ol>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Payment Receipt (Image URL)</label>
                      <input
                        type="url"
                        className="form-control"
                        value={paymentDetails.receiptImage}
                        onChange={(e) => setPaymentDetails({...paymentDetails, receiptImage: e.target.value})}
                        placeholder="Upload receipt to imgur/drive and paste URL here"
                        required
                      />
                      <small className="text-muted">Upload your payment receipt image and paste the URL here</small>
                    </div>
                  </div>
                )}

                {(paymentMethod === 'visa' || paymentMethod === 'mastercard') && (
                  <div>
                    <div className="alert alert-info">
                      <h6><i className="fas fa-credit-card"></i> Card Payment</h6>
                      <p className="mb-0">Enter your card details for secure payment processing</p>
                    </div>
                    <div className="row">
                      <div className="col-12 mb-3">
                        <label className="form-label">Card Holder Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={paymentDetails.cardHolderName}
                          onChange={(e) => setPaymentDetails({...paymentDetails, cardHolderName: e.target.value})}
                          placeholder="Enter name as on card"
                          required
                        />
                      </div>
                      <div className="col-12 mb-3">
                        <label className="form-label">Card Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={paymentDetails.cardNumber}
                          onChange={(e) => setPaymentDetails({...paymentDetails, cardNumber: e.target.value})}
                          placeholder="1234 5678 9012 3456"
                          maxLength="19"
                          required
                        />
                      </div>
                      <div className="col-6 mb-3">
                        <label className="form-label">Expiry Date</label>
                        <input
                          type="text"
                          className="form-control"
                          value={paymentDetails.expiryDate}
                          onChange={(e) => setPaymentDetails({...paymentDetails, expiryDate: e.target.value})}
                          placeholder="MM/YY"
                          maxLength="5"
                          required
                        />
                      </div>
                      <div className="col-6 mb-3">
                        <label className="form-label">CVV</label>
                        <input
                          type="text"
                          className="form-control"
                          value={paymentDetails.cvv}
                          onChange={(e) => setPaymentDetails({...paymentDetails, cvv: e.target.value})}
                          placeholder="123"
                          maxLength="4"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="alert alert-warning">
                  <small>
                    <i className="fas fa-exclamation-triangle"></i> 
                    By proceeding, you agree to pay ₨500 for listing this product. 
                    This payment is non-refundable.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-success"
                  onClick={handlePaymentSubmit}
                >
                  <i className="fas fa-credit-card"></i> Pay ₨500 & List Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scroll to Top Button */}
      <ScrollToTop />
      </div>
    </div>
  )
}

export default AmazonsChoice

