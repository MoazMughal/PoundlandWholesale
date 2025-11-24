import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import AlternatingProfit from '../components/AlternatingProfit'
import ScrollToTop from '../components/ScrollToTop'
import CurrencySelector from '../components/CurrencySelector'
import { useCurrency } from '../context/CurrencyContext'
import { useSeller } from '../context/SellerContext'
import { getImageUrl } from '../utils/imageImports'
import { getApiUrl } from '../utils/api'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('featured')
  const [priceFilter, setPriceFilter] = useState('all')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [currentStatusIndex, setCurrentStatusIndex] = useState({})
  const [showYearlyProfit, setShowYearlyProfit] = useState(false)
  const [isBuyerLoggedIn, setIsBuyerLoggedIn] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
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
  const { seller, isLoggedIn: isSellerLoggedIn } = useSeller()
  
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



  // Check if buyer is logged in
  useEffect(() => {
    const token = localStorage.getItem('buyerToken')
    setIsBuyerLoggedIn(!!token)
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
        
        // Fetch Amazon's Choice products from database (NOT Excel)
        const response = await fetch(getApiUrl('products/public?isAmazonsChoice=true&limit=1000'))
        
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
            
            // Calculate profit only for specific products: bulbs, fuses, jewelry, lampshades
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
                // Estimate monthly profit: price * 1200 orders * 0.4 margin
                monthlyProfit = Math.round(price * 1200 * 0.4)
                yearlyProfit = monthlyProfit * 12
              }
            }
            
            return {
              id: p._id,
              name: p.name,
              description: p.description || '',
              price: `£${p.price}`,
              originalPrice: p.originalPrice ? `£${p.originalPrice}` : null,
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
        }
      } catch (error) {
        console.error('❌ Error fetching products:', error)
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

    // Search filter
    if (searchQuery && searchQuery.trim() !== '') {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
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

  // Update category when URL parameter changes
  useEffect(() => {
    const catParam = searchParams.get('cat')
    if (catParam && catParam !== selectedCategory) {
      setSelectedCategory(catParam)
    }
  }, [searchParams, selectedCategory])

  // Initialize random starting index for each product
  useEffect(() => {
    const initialIndex = {}
    currentProducts.forEach((product, idx) => {
      initialIndex[idx] = Math.floor(Math.random() * (product.statuses?.length || 1))
    })
    setCurrentStatusIndex(initialIndex)
  }, [currentProducts.length])

  // Rotate status indicators every 1 second - each product independently (faster rotation)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStatusIndex(prev => {
        const newIndex = {}
        currentProducts.forEach((product, idx) => {
          const currentIdx = prev[idx] !== undefined ? prev[idx] : Math.floor(Math.random() * (product.statuses?.length || 1))
          newIndex[idx] = (currentIdx + 1) % (product.statuses?.length || 1)
        })
        return newIndex
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [currentProducts])

  // Rotate profit display between monthly and yearly every 1 second (faster)
  useEffect(() => {
    const interval = setInterval(() => {
      setShowYearlyProfit(prev => !prev)
    }, 1000)
    
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
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh'}}>
        <div style={{textAlign: 'center'}}>
          <div style={{fontSize: '2rem', marginBottom: '10px'}}>⏳</div>
          <div style={{fontSize: '1.2rem', fontWeight: '600', color: '#333'}}>Loading Products...</div>
        </div>
      </div>
    )
  }

  return (
    <div>


      {/* Stats Banner */}
      <div style={{background: 'linear-gradient(135deg, #ff9900 0%, #ff6600 100%)', padding: '4px 0', marginBottom: '8px'}}>
        <div className="container">
          <div style={{display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '8px', textAlign: 'center'}}>
            <div>
              <div style={{fontSize: '0.9rem', fontWeight: '700', color: 'white', marginBottom: '1px', lineHeight: '1.2'}}>{products.length}+</div>
              <div style={{fontSize: '0.6rem', color: 'rgba(255,255,255,0.9)', lineHeight: '1'}}>Products</div>
            </div>
            <div>
              <div style={{fontSize: '0.9rem', fontWeight: '700', color: 'white', marginBottom: '1px', lineHeight: '1.2'}}>170%</div>
              <div style={{fontSize: '0.6rem', color: 'rgba(255,255,255,0.9)', lineHeight: '1'}}>Markup</div>
            </div>
            <div>
              <div style={{fontSize: '0.9rem', fontWeight: '700', color: 'white', marginBottom: '1px', lineHeight: '1.2'}}>21K+</div>
              <div style={{fontSize: '0.6rem', color: 'rgba(255,255,255,0.9)', lineHeight: '1'}}>Deals</div>
            </div>
            <div>
              <div style={{fontSize: '0.9rem', fontWeight: '700', color: 'white', marginBottom: '1px', lineHeight: '1.2'}}>10+</div>
              <div style={{fontSize: '0.6rem', color: 'rgba(255,255,255,0.9)', lineHeight: '1'}}>Categories</div>
            </div>
          </div>
        </div>
      </div>

      {/* Currency Selector - Fixed Position */}
      <CurrencySelector />

      <div className="container products-container">

        {/* Page Header */}
        <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '10px'}}>
          <div className="header-content" style={{flex: 1, minWidth: '300px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px'}}>
              <div style={{flex: 1, minWidth: '300px'}}>
                <h2 className="section-title" style={{marginBottom: '4px', fontSize: '1.5rem', fontWeight: '800'}}>Amazon's Choice Products</h2>
                <div className="section-sub" style={{marginBottom: '6px', color: '#6b7280', fontSize: '0.85rem'}}>Hand-picked haul-style items across categories — fashion, home, electronics, beauty & more.</div>
              </div>
              
              {/* Search Bar */}
              <div className="search-filter-bar" style={{margin: 0, maxWidth: '700px', minWidth: '500px', display: 'flex', gap: '8px'}}>
                <div className="search-container" style={{flex: 1, position: 'relative'}}>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="search-input" 
                    placeholder="Search products..."
                    style={{width: '100%', padding: '10px 35px 10px 12px', border: '2px solid #e2e8f0', borderRadius: '8px', fontSize: '14px'}}
                  />
                  <i className="fas fa-search search-icon" style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '14px'}}></i>
                </div>
                <button onClick={handleSearch} className="search-btn" style={{background: 'var(--bs-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 12px', fontWeight: '600'}}>
                  <i className="fas fa-search"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="filter-section" style={{background: 'white', borderRadius: '8px', padding: '8px', marginBottom: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px'}}>
          <div className="filter-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1, cursor: 'pointer'}} onClick={() => setShowFilters(!showFilters)}>
            <h3 className="filter-title" style={{fontSize: '1rem', fontWeight: '700', margin: 0}}>Filter Products</h3>
            <button className="filter-toggle" style={{background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.85rem'}}>
              <i className="fas fa-sliders-h"></i> {showFilters ? 'Hide' : 'Show'} Filters
            </button>
          </div>
          
          <div className="filter-controls" style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select" style={{padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '8px', background: 'white', fontSize: '13px', minWidth: '140px'}}>
              <option value="featured">Sort: Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Popular</option>
            </select>
            
            <div className="filter-buttons" style={{display: 'flex', gap: '6px'}}>
              <button onClick={() => setShowFilters(!showFilters)} className="filter-btn filter-apply" style={{padding: '8px 12px', border: 'none', borderRadius: '8px', background: 'var(--bs-primary)', color: 'white', fontWeight: '600', fontSize: '13px'}}>
                <i className="fas fa-filter"></i>
              </button>
              <button onClick={handleResetFilters} className="filter-btn filter-reset" style={{padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8f9fa', color: '#6b7280', fontWeight: '600', fontSize: '13px'}}>
                <i className="fas fa-redo"></i>
              </button>
            </div>
          </div>
          
          {showFilters && (
            <div className="filter-content" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', width: '100%', marginTop: '12px'}}>
              <div className="filter-group">
                <label className="filter-label" style={{display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.85rem'}}>Price Range</label>
                <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} className="filter-select" style={{width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px'}}>
                  <option value="all">All Prices</option>
                  <option value="0-10">Under £10</option>
                  <option value="10-20">£10 - £20</option>
                  <option value="20-50">£20 - £50</option>
                  <option value="50-100">£50 - £100</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label className="filter-label" style={{display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.85rem'}}>Rating</label>
                <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className="filter-select" style={{width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px'}}>
                  <option value="all">All Ratings</option>
                  <option value="4.5">4.5+ Stars</option>
                  <option value="4.0">4.0+ Stars</option>
                  <option value="3.5">3.5+ Stars</option>
                  <option value="3.0">3.0+ Stars</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Product Category Tabs */}
        <div className="product-tabs" style={{display: 'flex', gap: '10px', marginBottom: '15px', borderBottom: '2px solid #e5e7eb', paddingBottom: '0'}}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'all' ? 'var(--bs-primary)' : 'transparent',
              color: activeTab === 'all' ? 'white' : '#6b7280',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
              transition: 'all 0.3s',
              borderBottom: activeTab === 'all' ? '3px solid var(--bs-primary)' : 'none'
            }}
          >
            <i className="fas fa-th-large me-2"></i>
            All Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('fast')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'fast' ? '#10b981' : 'transparent',
              color: activeTab === 'fast' ? 'white' : '#6b7280',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
              transition: 'all 0.3s',
              borderBottom: activeTab === 'fast' ? '3px solid #10b981' : 'none'
            }}
          >
            <i className="fas fa-fire me-2"></i>
            Fast Selling ({fastSellingProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('best')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: activeTab === 'best' ? '#f59e0b' : 'transparent',
              color: activeTab === 'best' ? 'white' : '#6b7280',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
              transition: 'all 0.3s',
              borderBottom: activeTab === 'best' ? '3px solid #f59e0b' : 'none'
            }}
          >
            <i className="fas fa-trophy me-2"></i>
            Best Selling ({bestSellingProducts.length})
          </button>
        </div>

        {/* Results Info */}
        <div className="results-info" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '4px 0'}}>
          <div className="results-count" style={{fontSize: '0.85rem', color: '#6b7280'}}>
            Showing {indexOfFirstProduct + 1}-{Math.min(indexOfLastProduct, activeProducts.length)} of {activeProducts.length} products
            {activeTab === 'fast' && <span style={{marginLeft: '10px', color: '#10b981', fontWeight: '600'}}>(Fast Selling)</span>}
            {activeTab === 'best' && <span style={{marginLeft: '10px', color: '#f59e0b', fontWeight: '600'}}>(Best Selling)</span>}
          </div>
        </div>

        {/* Category Filters */}
        <div className="categories mb-3" style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
          {categories.map(cat => (
            <button 
              key={cat.value}
              className={`category-btn ${selectedCategory === cat.value ? 'active' : ''}`}
              onClick={() => handleCategoryClick(cat.value)}
              style={{borderRadius: '999px', padding: '6px 12px', border: '1px solid rgba(0,0,0,0.06)', background: selectedCategory === cat.value ? 'var(--bs-primary)' : '#fff', cursor: 'pointer', fontWeight: '600', color: selectedCategory === cat.value ? '#fff' : '#333', fontSize: '0.85rem'}}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div id="products-grid" style={{
          display: 'grid', 
          gridTemplateColumns: windowWidth < 576 ? 'repeat(2, 1fr)' : 
                              windowWidth < 768 ? 'repeat(3, 1fr)' : 
                              windowWidth < 992 ? 'repeat(4, 1fr)' : 
                              windowWidth < 1400 ? 'repeat(5, 1fr)' :
                              'repeat(6, 1fr)', 
          gap: windowWidth < 576 ? '8px' : '12px',
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
                <div className="product-image-container" style={{position: 'relative', height: '200px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff'}}>
                  {/* Rotating Status Badge on Image - Top Right Corner */}
                  {product.statuses && product.statuses.length > 0 && (
                    <div style={{position: 'absolute', top: '6px', right: '6px', zIndex: 10}}>
                      {product.statuses.map((status, statusIdx) => {
                        const isActive = (currentStatusIndex[index] || 0) === statusIdx;
                        let bgColor = '#667eea';
                        let textColor = 'white';
                        
                        if (status.includes("Best Seller")) {
                          bgColor = '#ffd700';
                          textColor = '#333';
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
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontWeight: '700',
                              fontSize: '0.7rem',
                              display: isActive ? 'inline-block' : 'none',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
                              lineHeight: '1.2',
                              backgroundColor: bgColor,
                              color: textColor,
                              transition: 'all 0.3s ease'
                            }}
                          >
                            {status}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Rotating Profit Badge on Image - Bottom Left Corner */}
                  {product.monthlyProfit && product.yearlyProfit && (
                    <div style={{position: 'absolute', bottom: '6px', left: '6px', zIndex: 3}}>
                      <div style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        padding: '5px 10px',
                        borderRadius: '5px',
                        boxShadow: '0 3px 8px rgba(0,0,0,0.25)',
                        transition: 'all 0.3s ease'
                      }}>
                        <div style={{fontSize: '0.7rem', fontWeight: '700', color: '#fff', lineHeight: '1.2'}}>
                          {showYearlyProfit ? (
                            <>� {formatPrice(product.yearlyProfit)}/yr</>
                          ) : (
                            <>💰 {formatPrice(product.monthlyProfit)}/mo</>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <img 
                    src={product.image}
                    alt={product.name} 
                    className="product-image" 
                    style={{maxWidth: '95%', maxHeight: '95%', width: 'auto', height: 'auto', objectFit: 'contain', padding: '8px'}} 
                  />
                </div>
                
                <div className="product-info" style={{padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: '4px'}}>
                  <h5 className="product-title" style={{fontSize: '11px', fontWeight: '700', margin: 0, lineHeight: '1.3', height: '30px', overflow: 'hidden'}}>{product.name}</h5>
                  
                  <div className="rating-container" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div className="rating-stars" style={{color: '#f6b042', fontSize: '9px'}}>
                      {renderStars(product.rating)}
                      <span className="rating-count" style={{fontWeight: '700', color: '#374151', marginLeft: '3px', fontSize: '9px'}}>({product.reviews})</span>
                    </div>
                  </div>
                  
                  <div className="price" style={{fontWeight: '800', fontSize: '13px', color: '#0b3b2e'}}>{formatPrice(product.price)}</div>
                  
                  {/* Total Deal Price Calculation */}
                  <div style={{background: '#f0fdf4', padding: '4px 6px', borderRadius: '3px', border: '1px solid #86efac'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span style={{fontSize: '8px', color: '#166534', fontWeight: '600'}}>💰 Deal Value</span>
                      <span style={{fontSize: '11px', fontWeight: '800', color: '#15803d'}}>
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
      </div>

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
  )
}

export default AmazonsChoice

