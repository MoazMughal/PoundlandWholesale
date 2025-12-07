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
  
  console.log('📊 Products state:', {
    products: products.length,
    filteredProducts: filteredProducts.length,
    activeProducts: activeProducts.length,
    currentProducts: currentProducts.length,
    loading: loading,
    activeTab: activeTab
  })

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

  // Fetch products from API - Database products (Amazon's Choice)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        
        // Check cache first - but skip cache if URL has refresh parameter
        const urlParams = new URLSearchParams(window.location.search);
        const forceRefresh = urlParams.get('refresh') === 'true';
        
        const cacheKey = 'amazons_choice_products'
        const cachedData = !forceRefresh ? cacheManager.get(cacheKey) : null;
        
        if (cachedData && !forceRefresh) {
          console.log('✅ Loading products from cache')
          setProducts(cachedData.products)
          setFastSellingProducts(cachedData.fastSelling)
          setBestSellingProducts(cachedData.bestSelling)
          setLoading(false)
          setInitialLoad(false)
          return
        }
        
        if (forceRefresh) {
          console.log('🔄 Force refresh requested - clearing all cache');
          cacheManager.clearAll();
        }
        
        // Fetch Amazon's Choice products from database with timeout and pagination
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
        
        // Use pagination for better performance - fetch in smaller chunks
        // Add cache busting parameter to ensure fresh data
        const cacheBuster = Date.now();
        const response = await fetch(getApiUrl(`products/public?isAmazonsChoice=true&limit=200&page=1&_t=${cacheBuster}`), {
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const data = await response.json()
          
          // Transform API data to match expected format - optimized for performance
          let transformedProducts = data.products.map(p => {
            // Optimize image processing - defer getImageUrl call
            const imageUrl = p.images && p.images.length > 0 ? p.images[0] : ''
            
            // Simplified profit calculation - use database values when available
            const productName = p.name.toLowerCase()
            let monthlyProfit = p.monthlyProfit
            
            // Only calculate if not already in database
            if (!monthlyProfit) {
              if (productName.includes('nose ring')) monthlyProfit = '£40.14'
              else if (productName.includes('bulb')) monthlyProfit = '£251.10'
              else if (productName.includes('fuse')) monthlyProfit = '£455.80'
              else if (productName.includes('lampshade')) monthlyProfit = '£227.80'
              else if (productName.includes('leather') && productName.includes('watch')) monthlyProfit = '£586.00'
            }
            
            // Simplified RRP calculation
            let rrp = p.rrp ? `£${p.rrp}` : 
                     p.originalPrice ? `£${p.originalPrice}` : 
                     productName.includes('nose ring') ? '£3.49' : 
                     `£${(p.price * 1.5).toFixed(2)}`
            
            return {
              id: p._id,
              name: p.name,
              description: p.description || '',
              price: `£${p.price}`,
              originalPrice: p.originalPrice ? `£${p.originalPrice}` : null,
              rrp: rrp,
              discount: p.discount || 0,
              category: p.category,
              subcategory: p.subcategory || '',
              brand: p.brand || '',
              image: imageUrl, // Store raw path, process later
              images: p.images || [],
              rating: p.rating || 4.0,
              reviews: p.reviews || 0,
              stock: p.stock || 0,
              dealUnits: p.dealUnits || 1,
              costPrice: p.costPrice || 0,
              monthlyOrders: Math.floor(Math.random() * 500) + 100,
              monthlyProfit: monthlyProfit,
              profitCalculations: p.profitCalculations || null, // Include profit calculations from database
              statuses: [
                `${Math.floor(Math.random() * 1000) + 100} in basket`,
                ['Amazon\'s Choice', 'Selling Fast', 'Best Seller'][Math.floor(Math.random() * 3)]
              ],
              isAmazonsChoice: p.isAmazonsChoice,
              isBestSeller: p.isBestSeller,
              isFastSelling: false
            }
          })
          
          // Optimized deduplication using Map for better performance
          const uniqueProductsMap = new Map()
          transformedProducts.forEach(p => {
            const key = p.name.toLowerCase().trim()
            if (!uniqueProductsMap.has(key)) {
              uniqueProductsMap.set(key, p)
            }
          })
          
          // Convert back to array and shuffle for variety
          transformedProducts = Array.from(uniqueProductsMap.values())
          
          // Simple shuffle for better performance than complex interleaving
          for (let i = transformedProducts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [transformedProducts[i], transformedProducts[j]] = [transformedProducts[j], transformedProducts[i]];
          }
          
          // Set all products to the main products array
          console.log('✅ Setting products:', transformedProducts.length, 'products')
          
          // Debug: Log unique categories and sample product data
          const uniqueCategories = [...new Set(transformedProducts.map(p => p.category))];
          console.log('📂 Available categories in products:', uniqueCategories);
          console.log('🔍 Sample product data (first 3 products):');
          transformedProducts.slice(0, 3).forEach((p, i) => {
            console.log(`   Product ${i + 1}: ${p.name}`);
            console.log(`     - costPrice: ${p.costPrice}`);
            console.log(`     - price: ${p.price}`);
            console.log(`     - dealUnits: ${p.dealUnits}`);
          });
          
          setProducts(transformedProducts)
          
          // Separate into Fast Selling and Best Selling for tabs
          const fastSelling = transformedProducts.filter(p => p.isFastSelling)
          const bestSelling = transformedProducts.filter(p => p.isBestSeller)
          
          console.log('✅ Fast selling:', fastSelling.length, 'Best selling:', bestSelling.length)
          setFastSellingProducts(fastSelling)
          setBestSellingProducts(bestSelling)
          
          // Cache the products data for 10 minutes (increased cache time)
          cacheManager.set('amazons_choice_products', {
            products: transformedProducts,
            fastSelling: fastSelling,
            bestSelling: bestSelling
          }, 10 * 60 * 1000)
          console.log('✅ Products cached successfully')
        } else {
          console.error('❌ Database API error:', response.status, response.statusText)
          alert('⚠️ Unable to load products. Server returned error: ' + response.status)
        }
      } catch (error) {
        console.error('❌ Error fetching products:', error)
        if (error.name === 'AbortError') {
          alert('⚠️ Loading products is taking too long. Please check if the backend server is running on http://localhost:5000')
        } else {
          alert('⚠️ Unable to connect to server. Please make sure the backend is running:\n\nRun: npm run server\n\nOr check if MongoDB is connected.')
        }
      } finally {
        setLoading(false)
        setInitialLoad(false)
      }
    }

    fetchProducts()
  }, [])

  // Helper function to check if product should show profit
  const shouldShowProfit = (product) => {
    const name = product.name.toLowerCase()
    return name.includes('nose ring') || 
           name.includes('bulb') || 
           name.includes('fuse') || 
           name.includes('lampshade')
  }

  // Filter and sort products - Optimized for performance
  useEffect(() => {
    console.log('🔍 Filter useEffect triggered. Products:', products.length, 'Active tab:', activeTab)
    
    // Don't filter if no products loaded yet
    if (products.length === 0) {
      console.log('⚠️ No products to filter yet')
      return
    }
    
    // Use requestAnimationFrame to prevent blocking UI
    const filterProducts = () => {
      // Determine which products to filter based on active tab
      let sourceProducts = products
      if (activeTab === 'fast') {
        sourceProducts = fastSellingProducts
      } else if (activeTab === 'best') {
        sourceProducts = bestSellingProducts
      }
      
      console.log('🔍 Source products:', sourceProducts.length)
      
      // Start with source products reference (no unnecessary copying)
      let filtered = sourceProducts

      // Category filter - STRICT matching
      if (selectedCategory && selectedCategory !== 'all') {
        console.log('🔍 Filtering by category:', selectedCategory);
        console.log('🔍 Products before filter:', filtered.length);
        filtered = filtered.filter(p => p.category === selectedCategory);
        console.log('🔍 Products after filter:', filtered.length);
        console.log('🔍 Sample categories in filtered products:', filtered.slice(0, 5).map(p => p.category));
      }

      // Search is now handled by separate useEffect
      // This filter function handles other filters (price, rating, etc.)

      // Price filter
      if (priceFilter !== 'all') {
        const [min, max] = priceFilter.split('-').map(Number)
        filtered = filtered.filter(p => {
          const price = parseFloat(p.price.replace(/[£$₨]/g, ''))
          return max ? (price >= min && price <= max) : price >= min
        })
      }

      // Rating filter
      if (ratingFilter !== 'all') {
        const minRating = parseFloat(ratingFilter)
        filtered = filtered.filter(p => p.rating >= minRating)
      }

      // Sort
      switch (sortBy) {
        case 'price-low':
          filtered.sort((a, b) => parseFloat(a.price.replace(/[£$₨]/g, '')) - parseFloat(b.price.replace(/[£$₨]/g, '')))
          break
        case 'price-high':
          filtered.sort((a, b) => parseFloat(b.price.replace(/[£$₨]/g, '')) - parseFloat(a.price.replace(/[£$₨]/g, '')))
          break
        case 'rating':
          filtered.sort((a, b) => b.rating - a.rating)
          break
        case 'popular':
          filtered.sort((a, b) => b.reviews - a.reviews)
          break
        default:
          break
      }
      
      // Update the appropriate filtered state based on active tab
      console.log('🔍 Setting filtered products:', filtered.length, 'for tab:', activeTab)
      if (activeTab === 'fast') {
        setFilteredFastSelling(filtered)
      } else if (activeTab === 'best') {
        setFilteredBestSelling(filtered)
      } else {
        setFilteredProducts(filtered)
      }
      
      setCurrentPage(1) // Always reset to page 1 when filters change
    }
    
    // Use requestAnimationFrame for non-blocking execution
    requestAnimationFrame(filterProducts)
  }, [selectedCategory, searchQuery, sortBy, priceFilter, ratingFilter, products, fastSellingProducts, bestSellingProducts, activeTab])

  // Update category and search when URL parameters change
  useEffect(() => {
    const catParam = searchParams.get('cat')
    const searchParam = searchParams.get('search')
    
    console.log('🔗 URL params changed:', { catParam, searchParam, currentCategory: selectedCategory })
    
    // Handle category parameter
    if (catParam && catParam !== selectedCategory) {
      console.log('📂 Setting category to:', catParam)
      setSelectedCategory(catParam)
    } else if (!catParam && selectedCategory !== 'all') {
      // Reset to 'all' when no category parameter in URL
      console.log('📂 Resetting category to: all')
      setSelectedCategory('all')
    }
    
    // Handle search parameter
    if (searchParam !== null && searchParam !== searchQuery) {
      setSearchQuery(searchParam)
    } else if (searchParam === null && searchQuery !== '') {
      setSearchQuery('')
    }
  }, [searchParams])

  // Enhanced search with server-side results
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery || searchQuery.trim() === '') {
        // If no search query, reload all Amazon's Choice products
        try {
          setLoading(true)
          const cacheBuster = Date.now();
          const response = await fetch(getApiUrl(`products/public?isAmazonsChoice=true&limit=200&page=1&_t=${cacheBuster}`))
          
          if (response.ok) {
            const data = await response.json()
            if (data.products && Array.isArray(data.products)) {
              const allProducts = data.products.map(p => {
                const imageUrl = p.images && p.images.length > 0 ? p.images[0] : ''
                
                return {
                  id: p._id,
                  name: p.name,
                  price: `${p.price}`,
                  originalPrice: p.originalPrice,
                  discount: p.discount,
                  category: p.category,
                  subcategory: p.subcategory,
                  brand: p.brand,
                  image: imageUrl,
                  images: p.images || [imageUrl],
                  rating: p.rating || 4.5,
                  reviews: p.reviews || 0,
                  stock: p.stock,
                  dealUnits: p.dealUnits || 1,
                  costPrice: p.costPrice || 0,
                  isAmazonsChoice: p.isAmazonsChoice,
                  isBestSeller: p.isBestSeller,
                  monthlyProfit: p.monthlyProfit,
                  sellerInfo: p.sellerInfo,
                  profitCalculations: p.profitCalculations || null, // Include profit calculations from database
                  // Add statuses for badges
                  statuses: [
                    `${Math.floor(Math.random() * 1000) + 100} in basket`,
                    ['Amazon\'s Choice', 'Selling Fast', 'Best Seller'][Math.floor(Math.random() * 3)]
                  ]
                }
              })
              
              // Shuffle products for random display
              for (let i = allProducts.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allProducts[i], allProducts[j]] = [allProducts[j], allProducts[i]];
              }
              
              setProducts(allProducts)
              setFilteredProducts(allProducts)
              // Reset badge initialization flag so badges get initialized for reloaded products
              badgeInitializedRef.current = false
              console.log('🔄 Reloaded all Amazon\'s Choice products:', allProducts.length)
            }
          }
        } catch (error) {
          console.error('Error reloading products:', error)
        } finally {
          setLoading(false)
        }
        return
      }

      try {
        setLoading(true)
        
        // Build search URL with enhanced parameters
        const cacheBuster = Date.now();
        const searchUrl = getApiUrl(`products/public?search=${encodeURIComponent(searchQuery)}&isAmazonsChoice=true&limit=200&page=1${selectedCategory !== 'all' ? `&category=${selectedCategory}` : ''}&_t=${cacheBuster}`)
        
        const response = await fetch(searchUrl)
        
        if (response.ok) {
          const data = await response.json()
          console.log('Search API response:', data)
          
          if (data.products && Array.isArray(data.products)) {
            // Transform search results
            const searchResults = data.products.map(p => {
              const imageUrl = p.images && p.images.length > 0 ? p.images[0] : ''
              
              return {
                id: p._id,
                name: p.name,
                price: `${p.price}`,
                originalPrice: p.originalPrice,
                discount: p.discount,
                category: p.category,
                subcategory: p.subcategory,
                brand: p.brand,
                image: imageUrl,
                images: p.images || [imageUrl],
                rating: p.rating || 4.5,
                reviews: p.reviews || 0,
                stock: p.stock,
                dealUnits: p.dealUnits || 1,
                costPrice: p.costPrice || 0,
                isAmazonsChoice: p.isAmazonsChoice,
                isBestSeller: p.isBestSeller,
                monthlyProfit: p.monthlyProfit,
                sellerInfo: p.sellerInfo,
                profitCalculations: p.profitCalculations || null, // Include profit calculations from database
                // Add statuses for badges
                statuses: [
                  `${Math.floor(Math.random() * 1000) + 100} in basket`,
                  ['Amazon\'s Choice', 'Selling Fast', 'Best Seller'][Math.floor(Math.random() * 3)]
                ]
              }
            })
            
            // Shuffle search results for random display
            for (let i = searchResults.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [searchResults[i], searchResults[j]] = [searchResults[j], searchResults[i]];
            }
            
            // Update products with search results
            setProducts(searchResults)
            setFilteredProducts(searchResults)
            // Reset badge initialization flag so badges get initialized for search results
            badgeInitializedRef.current = false
            
            console.log(`🔍 Search results for "${searchQuery}":`, searchResults.length, 'products')
          } else {
            console.error('Invalid search response format:', data)
            setProducts([])
            setFilteredProducts([])
          }
        } else {
          const errorText = await response.text()
          console.error('Search failed:', response.status, errorText)
          // Don't clear products on search error, keep showing current products
        }
      } catch (error) {
        console.error('Search error:', error)
        // On search error, don't clear products - keep showing current products
      } finally {
        setLoading(false)
      }
    }

    // Debounce search to avoid too many API calls
    const searchTimeout = setTimeout(performSearch, 500)
    return () => clearTimeout(searchTimeout)
  }, [searchQuery, selectedCategory])

  // Use ref to keep track of current products without causing re-renders
  const currentProductsRef = useRef(currentProducts)
  const badgeInitializedRef = useRef(false)
  
  // Update ref when products change
  useEffect(() => {
    currentProductsRef.current = currentProducts
  }, [currentProducts])

  // Initialize random starting index for each product - ONLY ONCE on first load
  useEffect(() => {
    if (currentProducts.length > 0 && !badgeInitializedRef.current) {
      console.log('🎯 Initializing badges for', currentProducts.length, 'products')
      const initialIndex = {}
      currentProducts.forEach((product, idx) => {
        initialIndex[idx] = Math.floor(Math.random() * (product.statuses?.length || 1))
      })
      setCurrentStatusIndex(initialIndex)
      badgeInitializedRef.current = true
    }
  }, [currentProducts.length])

  // Rotate status indicators every 2 seconds - continuous rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStatusIndex(prev => {
        const newIndex = { ...prev }
        const products = currentProductsRef.current
        
        // Rotate through all current product indices
        for (let idx = 0; idx < products.length; idx++) {
          const product = products[idx]
          if (product && product.statuses && product.statuses.length > 0) {
            const currentIdx = newIndex[idx] !== undefined ? newIndex[idx] : 0
            newIndex[idx] = (currentIdx + 1) % product.statuses.length
          }
        }
        return newIndex
      })
    }, 2000)
    
    return () => clearInterval(interval)
  }, []) // Empty dependency array - run once and keep rotating forever



  const handleCategoryClick = (category) => {
    setSelectedCategory(category)
  }

  const handleSearch = () => {
    // Search is handled by useEffect
  }

  const handleResetFilters = () => {
    setSelectedCategory('all')
    setSearchQuery('')
    setSortBy('featured')
    setPriceFilter('all')
    setRatingFilter('all')
    
    // Reload all products when filters are reset
    window.location.reload()
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

  if (loading) {
    return (
      <div className="container products-container" style={{maxWidth: '1600px', padding: '10px 15px'}}>
        <ScrollToTop />
        
        {/* Show skeleton grid while loading */}
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

  console.log('📦 Rendering products. Loading:', loading, 'Current products:', currentProducts.length, 'Active products:', activeProducts.length, 'Filtered:', filteredProducts.length)
  console.log('🔍 Admin state debug:', { 
    isAdminLoggedIn, 
    isAdminContextLoggedIn, 
    admin,
    adminToken: !!localStorage.getItem('adminToken')
  })

  return (
    <div>
      <div className="container products-container" style={{maxWidth: '1600px', padding: '10px 15px'}}>



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
          {currentProducts.length > 0 ? (
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
                  
                  {/* Single Rotating Status Badge - Top Right Corner */}
                  {product.statuses && product.statuses.length > 0 && (
                    <div style={{position: 'absolute', top: '4px', right: '4px', zIndex: 2}}>
                      {(() => {
                        const currentBadgeIndex = currentStatusIndex[index] !== undefined ? currentStatusIndex[index] : 0;
                        const status = product.statuses[currentBadgeIndex] || product.statuses[0] || "Amazon's Choice";
                        let bgColor = '#667eea';
                        let textColor = 'white';
                        
                        if (status.includes("Best Seller")) {
                          bgColor = '#ffd700';
                          textColor = '#111';
                        } else if (status.includes("Selling Fast")) {
                          bgColor = '#ff6b6b';
                          textColor = 'white';
                        } else if (status.includes("Amazon's Choice")) {
                          bgColor = '#667eea';
                          textColor = 'white';
                        } else if (status.includes("Trending")) {
                          bgColor = '#9c27b0';
                          textColor = 'white';
                        } else if (status.includes("in basket")) {
                          bgColor = '#4ecdc4';
                          textColor = 'white';
                        }
                        
                        return (
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
                              backgroundColor: bgColor,
                              color: textColor,
                              transition: 'all 0.3s ease-in-out',
                              pointerEvents: 'none'
                            }}
                          >
                            {status}
                          </span>
                        );
                      })()}
                    </div>
                  )}
                  

                  
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
                    
                    {/* Profit Information - Right side */}
                    {product.profitCalculations && product.profitCalculations.profitPerUnit && (
                      <div style={{
                        fontSize: '8px',
                        fontWeight: '700',
                        color: '#2d3748',
                        textAlign: 'right',
                        lineHeight: '1.1'
                      }}>
                        💰 {(() => {
                          const profitPerUnit = parseFloat(product.profitCalculations.profitPerUnit) || 0;
                          return formatPrice(`£${profitPerUnit.toFixed(2)}`);
                        })()}/unit
                        <br />
                        📈 {(() => {
                          const profitPerUnit = parseFloat(product.profitCalculations.profitPerUnit) || 0;
                          const monthlyProfit = profitPerUnit * 30; // 30 units per month
                          return formatPrice(`£${monthlyProfit.toFixed(2)}`);
                        })()}/month
                      </div>
                    )}
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
                  
                  {/* Deal Units Calculation */}
                  <div style={{display: 'flex', gap: '3px'}}>
                    <div style={{background: '#f0fdf4', padding: '3px 5px', borderRadius: '3px', border: '1px solid #86efac', flex: 1}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span style={{fontSize: '8px', color: '#166534', fontWeight: '600'}}>💰 Deal of {product.dealUnits || 1} units</span>
                        <span style={{fontSize: '9px', fontWeight: '800', color: '#15803d'}}>
                          {(() => {
                            try {
                              const dealUnits = product.dealUnits || 1;
                              const unitPrice = parseFloat(product.price.replace(/[£$₨]/g, '')) || 0;
                              const totalPrice = unitPrice * dealUnits;
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
                    {product.monthlyProfit && (
                      <div style={{background: '#e0f2fe', padding: '3px 5px', borderRadius: '3px', border: '1px solid #81d4fa', flex: 1}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <span style={{fontSize: '8px', color: '#0277bd', fontWeight: '600'}}>💰 Profit of {product.dealUnits || 1} units</span>
                          <span style={{fontSize: '9px', fontWeight: '800', color: '#01579b'}}>
                            {(() => {
                              try {
                                const dealUnits = product.dealUnits || 1;
                                const profitPerUnit = parseFloat(product.monthlyProfit.replace(/[£$₨]/g, '')) || 0;
                                const totalProfit = profitPerUnit * dealUnits;
                                if (isNaN(totalProfit)) return product.monthlyProfit;
                                return `£${totalProfit.toFixed(2)}`;
                              } catch (error) {
                                console.error('Profit calculation error:', error);
                                return product.monthlyProfit;
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                    )}
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
          ) : (
            <div className="no-results" style={{gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', color: '#6b7280'}}>
              <i className="fas fa-search" style={{fontSize: '3rem', marginBottom: '15px', color: '#d1d5db'}}></i>
              <h4 style={{marginBottom: '10px'}}>No products found</h4>
              <p style={{marginBottom: '20px'}}>Try adjusting your filters or search query</p>
              <div style={{fontSize: '12px', color: '#9ca3af', marginBottom: '15px'}}>
                Debug: Products: {products.length}, Filtered: {filteredProducts.length}, Active: {activeProducts.length}, Current: {currentProducts.length}
              </div>
              <button onClick={handleResetFilters} className="btn btn-primary">Reset Filters</button>
            </div>
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

