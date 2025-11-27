import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import ScrollToTop from '../components/ScrollToTop'
import { useCurrency } from '../context/CurrencyContext'
import { useSeller } from '../context/SellerContext'
import { useBasket } from '../context/BasketContext'
import { getImageUrl } from '../utils/imageImports'
import { getApiUrl } from '../utils/api'
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
  const [activeTab, setActiveTab] = useState('all') // 'all', 'fast', 'best'
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('cat') || 'all')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [sortBy, setSortBy] = useState('featured')
  const [priceFilter, setPriceFilter] = useState('all')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [currentStatusIndex, setCurrentStatusIndex] = useState({})
  const [showYearlyProfit, setShowYearlyProfit] = useState(false)
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
    const adminToken = localStorage.getItem('adminToken')
    setIsBuyerLoggedIn(!!buyerToken)
    setIsAdminLoggedIn(!!adminToken)
  }, [])

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
        
        // Fetch Amazon's Choice products from database with timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
        
        const response = await fetch(getApiUrl('products/public?isAmazonsChoice=true&limit=1000'), {
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const data = await response.json()
          
          // Transform API data to match expected format
          let transformedProducts = data.products.map(p => {
            // Get the first image and convert path to actual imported URL
            const imageUrl = p.images && p.images.length > 0 ? getImageUrl(p.images[0]) : ''
            
            // Calculate profit for specific product types
            const productName = p.name.toLowerCase()
            let monthlyProfit = p.monthlyProfit || null
            let yearlyProfit = p.yearlyProfit || null
            
            // Calculate profit only for specific products: bulbs, fuses, nose rings, lampshades
            if (!monthlyProfit && (
              productName.includes('nose ring') || 
              productName.includes('bulb') || 
              productName.includes('fuse') || 
              productName.includes('lampshade') ||
              productName.includes('jewelry') ||
              productName.includes('jewellery')
            )) {
              const price = parseFloat(p.price) || 0
              if (price > 0) {
                // Calculate actual profit based on product type (matching ProductDetail page)
                let sellingPrice = 0
                let costPriceGBP = price * 0.00272 // Convert PKR to GBP
                let commissionBase = 0, commissionTax = 0, digitalServiceBase = 0, digitalServiceTax = 0, fbaFeeBase = 0, fbaFeeTax = 0
                
                if (productName.includes('bulb')) {
                  sellingPrice = 3.79
                  commissionBase = -0.57
                  commissionTax = -0.12
                  digitalServiceBase = -0.04
                  digitalServiceTax = -0.02
                  fbaFeeBase = -1.46
                  fbaFeeTax = -0.30
                } else if (productName.includes('nose ring')) {
                  sellingPrice = 3.49
                  commissionBase = -0.52
                  commissionTax = -0.10
                  digitalServiceBase = -0.03
                  digitalServiceTax = -0.01
                  fbaFeeBase = -1.46
                  fbaFeeTax = -0.29
                } else if (productName.includes('fuse')) {
                  sellingPrice = 4.99
                  commissionBase = -0.75
                  commissionTax = -0.15
                  digitalServiceBase = -0.05
                  digitalServiceTax = -0.01
                  fbaFeeBase = -1.46
                  fbaFeeTax = -0.29
                } else if (productName.includes('lampshade')) {
                  sellingPrice = 5.86
                  commissionBase = -0.76
                  commissionTax = -0.15
                  digitalServiceBase = -0.08
                  digitalServiceTax = -0.01
                  fbaFeeBase = -3.10
                  fbaFeeTax = -0.62
                } else if (productName.includes('leather') && (productName.includes('watch strap') || productName.includes('watch band'))) {
                  sellingPrice = 5.79
                  commissionBase = -0.87
                  commissionTax = -0.18
                  digitalServiceBase = -0.05
                  digitalServiceTax = -0.01
                  fbaFeeBase = -1.46
                  fbaFeeTax = -0.29
                } else {
                  // Default calculation for other jewelry
                  monthlyProfit = Math.round(price * 1200 * 0.4)
                  yearlyProfit = monthlyProfit * 12
                }
                
                // Calculate net profit if we have selling price
                if (sellingPrice > 0) {
                  const totalFees = commissionBase + commissionTax + digitalServiceBase + digitalServiceTax + fbaFeeBase + fbaFeeTax
                  const changeToBalance = sellingPrice + totalFees
                  const netProfit = changeToBalance - costPriceGBP
                  
                  // Store profit as GBP price string for formatPrice to handle currency conversion
                  monthlyProfit = `£${(netProfit * 100).toFixed(2)}` // 100 units per month
                  yearlyProfit = `£${(netProfit * 1200).toFixed(2)}` // 1200 units per year
                  
                  // Debug log for verification
                  if (productName.includes('bulb')) {
                    console.log(`Bulb Profit Calculation: Cost=${costPriceGBP.toFixed(4)}, NetProfit=${netProfit.toFixed(4)}, Monthly=${monthlyProfit}, Yearly=${yearlyProfit}`)
                  }
                }
              }
            }
            
            // Calculate RRP - same logic as ProductDetail page
            // RRP is stored in database as originalPrice or calculated as 1.5x price
            let rrp = null
            if (productName.includes('nose ring')) {
              rrp = '£3.49' // Fixed RRP for nose ring
            } else if (p.rrp) {
              rrp = `£${p.rrp}` // Use RRP from database if available
            } else if (p.originalPrice) {
              rrp = `£${p.originalPrice}` // Use originalPrice as RRP
            } else if (p.price) {
              rrp = `£${(p.price * 1.5).toFixed(2)}` // Calculate as 1.5x price
            }
            
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
              image: imageUrl,
              images: p.images ? p.images.map(img => getImageUrl(img)) : [],
              rating: p.rating || 4.0,
              reviews: p.reviews || 0,
              stock: p.stock || 0,
              monthlyOrders: Math.floor(Math.random() * 500) + 100,
              monthlyProfit: monthlyProfit,
              yearlyProfit: yearlyProfit,
              statuses: [
                'Amazon\'s Choice', 
                'Selling Fast', 
                'Trending Now',
                'Best Seller',
                `${Math.floor(Math.random() * 1000) + 100} in basket`
              ],
              isAmazonsChoice: p.isAmazonsChoice,
              isBestSeller: p.isBestSeller,
              isFastSelling: false
            }
          })
          
          // Remove duplicates based on product name (case-insensitive)
          const uniqueProducts = []
          const seenNames = new Set()
          
          transformedProducts.forEach(p => {
            const normalizedName = p.name.toLowerCase().trim()
            if (!seenNames.has(normalizedName)) {
              seenNames.add(normalizedName)
              uniqueProducts.push(p)
            }
          })
          
          transformedProducts = uniqueProducts
          
          // Distribute products evenly by category for better variety
          const productsByCategory = {};
          transformedProducts.forEach(p => {
            if (!productsByCategory[p.category]) {
              productsByCategory[p.category] = [];
            }
            productsByCategory[p.category].push(p);
          });
          
          // Shuffle each category's products
          Object.keys(productsByCategory).forEach(category => {
            const arr = productsByCategory[category];
            for (let i = arr.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [arr[i], arr[j]] = [arr[j], arr[i]];
            }
          });
          
          // Interleave products from different categories for variety
          const categories = Object.keys(productsByCategory);
          const interleavedProducts = [];
          let maxLength = Math.max(...Object.values(productsByCategory).map(arr => arr.length));
          
          for (let i = 0; i < maxLength; i++) {
            categories.forEach(category => {
              if (productsByCategory[category][i]) {
                interleavedProducts.push(productsByCategory[category][i]);
              }
            });
          }
          
          // Set all products to the main products array
          setProducts(interleavedProducts)
          
          // Separate into Fast Selling and Best Selling for tabs
          const fastSelling = interleavedProducts.filter(p => p.isFastSelling)
          const bestSelling = interleavedProducts.filter(p => p.isBestSeller)
          
          setFastSellingProducts(fastSelling)
          setBestSellingProducts(bestSelling)
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

  // Filter and sort products
  useEffect(() => {
    
    // Determine which products to filter based on active tab
    let sourceProducts = products.slice()
    if (activeTab === 'fast') {
      sourceProducts = fastSellingProducts.slice()
    } else if (activeTab === 'best') {
      sourceProducts = bestSellingProducts.slice()
    }
    
    // Always start fresh from the source products array
    let filtered = sourceProducts.slice() // Create a true copy

    // Category filter - STRICT matching
    if (selectedCategory && selectedCategory !== 'all') {
      const beforeFilter = filtered.length
      filtered = filtered.filter(p => {
        return p.category === selectedCategory
      })
    }

    // Search filter - prioritize exact matches, then partial matches, then word matches
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim()
      const queryWords = query.split(/\s+/).filter(word => word.length > 2) // Split into words, ignore short words
      
      // Filter products that match the search (full query OR individual words)
      filtered = filtered.filter(p => {
        const name = (p.name || '').toLowerCase()
        const category = (p.category || '').toLowerCase()
        const subcategory = (p.subcategory || '').toLowerCase()
        const brand = (p.brand || '').toLowerCase()
        const description = (p.description || '').toLowerCase()
        const searchText = `${name} ${category} ${subcategory} ${brand} ${description}`
        
        // Match if full query is found OR if any significant word is found
        const fullMatch = name.includes(query) || 
                         category.includes(query) || 
                         subcategory.includes(query) || 
                         brand.includes(query) || 
                         description.includes(query)
        
        // Match if at least one word from query is found
        const wordMatch = queryWords.some(word => searchText.includes(word))
        
        return fullMatch || wordMatch
      })
      
      // Sort by relevance: exact name match first, then starts with, then word matches
      filtered.sort((a, b) => {
        const aName = (a.name || '').toLowerCase()
        const bName = (b.name || '').toLowerCase()
        const aSearchText = `${aName} ${(a.category || '').toLowerCase()} ${(a.description || '').toLowerCase()}`
        const bSearchText = `${bName} ${(b.category || '').toLowerCase()} ${(b.description || '').toLowerCase()}`
        
        // Exact match gets highest priority (10000 points)
        const aExact = aName === query ? 10000 : 0
        const bExact = bName === query ? 10000 : 0
        
        // Full query in name gets second priority (1000 points)
        const aFullInName = aName.includes(query) ? 1000 : 0
        const bFullInName = bName.includes(query) ? 1000 : 0
        
        // Starts with query gets third priority (500 points)
        const aStarts = aName.startsWith(query) ? 500 : 0
        const bStarts = bName.startsWith(query) ? 500 : 0
        
        // Count matching words (10 points per word)
        const aWordMatches = queryWords.filter(word => aSearchText.includes(word)).length * 10
        const bWordMatches = queryWords.filter(word => bSearchText.includes(word)).length * 10
        
        // Contains query anywhere gets lower priority (5 points)
        const aContains = aSearchText.includes(query) ? 5 : 0
        const bContains = bSearchText.includes(query) ? 5 : 0
        
        const aScore = aExact + aFullInName + aStarts + aWordMatches + aContains
        const bScore = bExact + bFullInName + bStarts + bWordMatches + bContains
        
        return bScore - aScore // Higher score first
      })
    }

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
    if (activeTab === 'fast') {
      setFilteredFastSelling(filtered)
    } else if (activeTab === 'best') {
      setFilteredBestSelling(filtered)
    } else {
      setFilteredProducts(filtered)
    }
    
    setCurrentPage(1) // Always reset to page 1 when filters change
  }, [selectedCategory, searchQuery, sortBy, priceFilter, ratingFilter, products, fastSellingProducts, bestSellingProducts, activeTab])

  // Update category and search when URL parameters change
  useEffect(() => {
    const catParam = searchParams.get('cat')
    const searchParam = searchParams.get('search')
    
    if (catParam && catParam !== selectedCategory) {
      setSelectedCategory(catParam)
    }
    
    if (searchParam !== null && searchParam !== searchQuery) {
      setSearchQuery(searchParam)
    } else if (searchParam === null && searchQuery !== '') {
      setSearchQuery('')
    }
  }, [searchParams])

  // Use ref to keep track of current products without causing re-renders
  const currentProductsRef = useRef(currentProducts)
  
  // Update ref when products change
  useEffect(() => {
    currentProductsRef.current = currentProducts
  }, [currentProducts])

  // Initialize random starting index for each product - only when products change
  useEffect(() => {
    if (currentProducts.length > 0) {
      setCurrentStatusIndex(prev => {
        const initialIndex = {}
        currentProducts.forEach((product, idx) => {
          // Keep existing index if it exists, otherwise set random
          initialIndex[idx] = prev[idx] !== undefined ? prev[idx] : Math.floor(Math.random() * (product.statuses?.length || 1))
        })
        return initialIndex
      })
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

  // Rotate profit display between monthly and yearly every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setShowYearlyProfit(prev => !prev)
    }, 2000)
    
    return () => clearInterval(interval)
  }, [])

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
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: '20px'}}>
        <div style={{textAlign: 'center'}}>
          <div style={{fontSize: '3rem', marginBottom: '15px', animation: 'spin 2s linear infinite'}}>⚡</div>
          <div style={{fontSize: '1.3rem', fontWeight: '700', color: '#ff9900', marginBottom: '10px'}}>Loading Products...</div>
          <div style={{fontSize: '0.9rem', color: '#666'}}>Fetching from database...</div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

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
                  const params = new URLSearchParams({
                    name: product.name,
                    img: product.image,
                    price: product.price.replace(/[£$₨]/g, ''),
                    rating: product.rating || 4.5,
                    reviews: product.reviews || 0,
                    category: product.category || 'General',
                    brand: product.brand || '',
                    discount: product.discount || 0
                  });
                  const url = `/product/${product.id}?${params.toString()}`;
                  navigate(url);
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
                    src={product.image}
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
                  
                  {/* Rotating Status Badge - Top Right Corner */}
                  {product.statuses && product.statuses.length > 0 && (
                    <div style={{position: 'absolute', top: '4px', right: '4px', zIndex: 2}}>
                      {product.statuses.map((status, statusIdx) => {
                        const isActive = (currentStatusIndex[index] || 0) === statusIdx;
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
                            key={statusIdx}
                            style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontWeight: '700',
                              fontSize: '0.55rem',
                              display: 'inline-block',
                              position: 'absolute',
                              top: 0,
                              right: 0,
                              whiteSpace: 'nowrap',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                              lineHeight: '1.2',
                              backgroundColor: bgColor,
                              color: textColor,
                              transition: 'opacity 0.5s ease-in-out',
                              opacity: isActive ? 1 : 0,
                              pointerEvents: 'none'
                            }}
                          >
                            {status}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Rotating Profit Display - Bottom Left Corner */}
                  {product.monthlyProfit && product.yearlyProfit && (
                    <div style={{position: 'absolute', bottom: '4px', left: '4px', zIndex: 2}}>
                      <div style={{
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontWeight: '700',
                        fontSize: '0.55rem',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        lineHeight: '1.2',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        transition: 'opacity 0.5s ease-in-out'
                      }}>
                        {showYearlyProfit ? (
                          <>💰 {formatPrice(product.yearlyProfit)}/yr</>
                        ) : (
                          <>💰 {formatPrice(product.monthlyProfit)}/mo</>
                        )}
                      </div>
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
                  
                  <div className="price" style={{fontWeight: '800', fontSize: '12px', color: '#0b3b2e'}}>{formatPrice(product.price)}</div>
                  
                  {/* Total Deal Price Calculation */}
                  <div style={{background: '#f0fdf4', padding: '3px 5px', borderRadius: '3px', border: '1px solid #86efac'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span style={{fontSize: '7px', color: '#166534', fontWeight: '600'}}>💰 Deal</span>
                      <span style={{fontSize: '9px', fontWeight: '800', color: '#15803d'}}>
                        {formatPrice((parseFloat(product.price.replace(/[£$₨]/g, '')) * product.monthlyOrders * 2).toFixed(2))}
                      </span>
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
          ) : (
            <div className="no-results" style={{gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', color: '#6b7280'}}>
              <i className="fas fa-search" style={{fontSize: '3rem', marginBottom: '15px', color: '#d1d5db'}}></i>
              <h4 style={{marginBottom: '10px'}}>No products found</h4>
              <p style={{marginBottom: '20px'}}>Try adjusting your filters or search query</p>
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

