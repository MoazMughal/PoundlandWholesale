import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeller } from '../../context/SellerContext'
import { getImageUrl } from '../../utils/imageImports'
import '../../styles/dashboard-responsive.css'

const AdminProducts = () => {
  const navigate = useNavigate()
  const { seller, isLoggedIn } = useSeller()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [categories, setCategories] = useState([])
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [productsPerPage, setProductsPerPage] = useState(100)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!isLoggedIn || !seller) {
      navigate('/login/supplier')
      return
    }

    if (!(seller?.canListProducts || seller?.verificationStatus === 'approved')) {
      navigate('/seller/dashboard')
      return
    }

    fetchCategories()
    fetchAdminProducts()
  }, [isLoggedIn, seller, currentPage, searchQuery, selectedCategory, productsPerPage])

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products/public/categories?includeCounts=true&includeEmpty=true&deduplicate=true')
      if (response.ok) {
        const data = await response.json()
        // Ensure we have the "All" category first
        const allCategories = [
          { value: 'all', label: 'All Categories', count: data.totalCount || 0 },
          ...(data.categories || []).filter(cat => cat.value !== 'all')
        ]
        setCategories(allCategories)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      // Fallback categories
      setCategories([
        { value: 'all', label: 'All Categories' },
        { value: 'electronics', label: 'Electronics' },
        { value: 'jewelry', label: 'Jewelry' },
        { value: 'home', label: 'Home & Decor' },
        { value: 'automotive', label: 'Automotive' },
        { value: 'party', label: 'Party Supplies' },
        { value: 'beauty', label: 'Beauty & Personal Care' },
        { value: 'sports', label: 'Sports & Outdoors' },
        { value: 'toys', label: 'Toys & Games' },
        { value: 'books', label: 'Books' },
        { value: 'clothing', label: 'Clothing & Accessories' }
      ])
    }
  }

  const fetchAdminProducts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('sellerToken')
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: productsPerPage,
        ...(searchQuery && { search: searchQuery }),
        ...(selectedCategory !== 'all' && { category: selectedCategory })
      })

      const response = await fetch(`http://localhost:5000/api/products/admin/available?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Products are already randomized on server for "all" category
        setProducts(data.products || [])
        setTotalPages(data.totalPages || 1)
        setTotalProducts(data.totalProducts || 0)
      } else {
        console.error('Failed to fetch admin products')
        setProducts([])
        setTotalPages(1)
        setTotalProducts(0)
      }
    } catch (error) {
      console.error('Error fetching admin products:', error)
      setProducts([])
      setTotalPages(1)
      setTotalProducts(0)
    } finally {
      setLoading(false)
    }
  }

  const handleListProduct = async (product) => {
    try {
      // Check if there are existing sellers and show confirmation
      let sellerPrice = null;
      
      if (product.sellers && product.sellers.length > 0) {
        const existingSellers = product.sellers
          .sort((a, b) => {
            const priceA = parseFloat(a.sellerPrice) || parseFloat(product.price) || 0;
            const priceB = parseFloat(b.sellerPrice) || parseFloat(product.price) || 0;
            return priceA - priceB;
          })
          .map((s, index) => {
            const price = parseFloat(s.sellerPrice) || parseFloat(product.price) || 0;
            return `${index + 1}. ${s.username} - £${price.toFixed(2)}${index === 0 ? ' (Lowest)' : ''}`;
          })
          .join('\n');
        
        const lowestPrice = Math.min(
          ...product.sellers.map(s => parseFloat(s.sellerPrice) || parseFloat(product.price) || 0)
        );
        
        const confirmMessage = `This product is already listed by ${product.sellers.length} seller${product.sellers.length > 1 ? 's' : ''}:\n\n${existingSellers}\n\nCurrent lowest price: £${lowestPrice.toFixed(2)}\n\nDo you want to add your listing to compete with existing sellers?\n\nTip: Set a lower price to appear first and cross out higher prices.`;
        
        if (!window.confirm(confirmMessage)) {
          return; // User cancelled
        }
        
        // Ask for seller's competitive price
        const priceInput = window.prompt(
          `Set your competitive price for "${product.name}":\n\nCurrent lowest price: £${lowestPrice.toFixed(2)}\nAdmin price: £${parseFloat(product.price).toFixed(2)}\n\nEnter your price (in GBP, without £ symbol):`,
          Math.max(0.01, lowestPrice - 0.01).toFixed(2)
        );
        
        if (priceInput === null) {
          return; // User cancelled
        }
        
        const parsedPrice = parseFloat(priceInput);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
          alert('❌ Invalid price. Please enter a valid positive number.');
          return;
        }
        
        sellerPrice = parsedPrice;
      } else {
        // First seller - ask for their price
        const priceInput = window.prompt(
          `Set your price for "${product.name}":\n\nAdmin price: £${parseFloat(product.price).toFixed(2)}\n\nEnter your price (in GBP, without £ symbol):`,
          parseFloat(product.price).toFixed(2)
        );
        
        if (priceInput === null) {
          return; // User cancelled
        }
        
        const parsedPrice = parseFloat(priceInput);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
          alert('❌ Invalid price. Please enter a valid positive number.');
          return;
        }
        
        sellerPrice = parsedPrice;
      }
      
      const token = localStorage.getItem('sellerToken')
      
      const response = await fetch('http://localhost:5000/api/sellers/list-admin-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          adminProductId: product._id,
          productName: product.name,
          productPrice: product.price,
          sellerPrice: sellerPrice, // Add seller's custom price
          paymentMethod: 'Direct Listing',
          transactionId: `LIST_${Date.now()}`,
          notes: 'Seller listed admin product from Amazon\'s Choice',
          // Ensure seller information is properly assigned
          sellerId: seller._id,
          sellerInfo: {
            username: seller.username,
            email: seller.email,
            whatsappNo: seller.whatsappNo,
            city: seller.city,
            country: seller.country,
            verificationStatus: seller.verificationStatus
          }
        })
      })

      const data = await response.json()

      if (response.ok) {
        const sellersCount = data.totalSellers || 1;
        alert(`✅ Product listed successfully at £${sellerPrice.toFixed(2)}! You are now seller #${sellersCount} for this product. ${sellersCount > 1 ? 'Your price will be compared with other sellers!' : ''}`)
        fetchAdminProducts()
      } else {
        // Enhanced error handling
        if (data.error === 'ALREADY_LISTED' || data.error === 'DUPLICATE_PREVENTED') {
          alert('⚠️ Already Listed: You have already listed this product. Each seller can only list a product once.')
        } else {
          alert('❌ Error: ' + (data.message || 'Failed to list product'))
        }
      }
    } catch (error) {
      console.error('List product error:', error)
      alert('❌ Failed to list product')
    }
  }

  const handleEditProduct = (product) => {
    // Navigate to seller edit page with product data
    navigate(`/seller/edit-product/${product._id}`, {
      state: { 
        product: product,
        returnTo: '/seller/admin-products',
        isSellerEdit: true
      }
    })
  }

  // Check if current seller has already listed this product
  const isAlreadyListed = (product) => {
    if (!seller || !product.sellers) return false
    return product.sellers.some(s => s.sellerId?.toString() === seller._id?.toString())
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchAdminProducts()
  }

  const getGridColumns = () => {
    if (windowWidth < 576) return 'repeat(2, 1fr)' // Mobile: 2 columns
    if (windowWidth < 768) return 'repeat(3, 1fr)' // Small tablet: 3 columns
    if (windowWidth < 992) return 'repeat(4, 1fr)' // Tablet: 4 columns
    if (windowWidth < 1200) return 'repeat(5, 1fr)' // Small desktop: 5 columns
    if (windowWidth < 1400) return 'repeat(6, 1fr)' // Medium desktop: 6 columns
    if (windowWidth < 1600) return 'repeat(7, 1fr)' // Large desktop: 7 columns
    return 'repeat(8, 1fr)' // Extra large: 8 columns
  }

  const renderPagination = () => {
    const maxVisiblePages = windowWidth < 768 ? 5 : 10
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
    const adjustedStartPage = Math.max(1, endPage - maxVisiblePages + 1)

    const pages = []
    
    // First page
    if (adjustedStartPage > 1) {
      pages.push(
        <button key={1} className={`page-btn ${currentPage === 1 ? 'active' : ''}`} onClick={() => setCurrentPage(1)}>
          1
        </button>
      )
      if (adjustedStartPage > 2) {
        pages.push(<span key="start-ellipsis" className="page-ellipsis">...</span>)
      }
    }

    // Visible pages
    for (let i = adjustedStartPage; i <= endPage; i++) {
      pages.push(
        <button key={i} className={`page-btn ${currentPage === i ? 'active' : ''}`} onClick={() => setCurrentPage(i)}>
          {i}
        </button>
      )
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="end-ellipsis" className="page-ellipsis">...</span>)
      }
      pages.push(
        <button key={totalPages} className={`page-btn ${currentPage === totalPages ? 'active' : ''}`} onClick={() => setCurrentPage(totalPages)}>
          {totalPages}
        </button>
      )
    }

    return pages
  }

  if (loading && products.length === 0) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #e3e3e3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <h5 style={{ color: '#6c757d', marginBottom: '10px' }}>Loading Products...</h5>
          <p style={{ color: '#adb5bd', fontSize: '14px' }}>Fetching Amazon's Choice products</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      padding: windowWidth < 768 ? '10px' : '20px'
    }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .admin-products-container {
            max-width: 1800px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          
          .header-section {
            background: linear-gradient(135deg, #ff6600 0%, #ff8533 100%);
            color: white;
            padding: ${windowWidth < 768 ? '15px 20px' : '20px 30px'};
            text-align: center;
            min-height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .filters-section {
            padding: ${windowWidth < 768 ? '15px' : '25px'};
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
          }
          
          .search-input {
            flex: 1;
            padding: 12px 15px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.3s ease;
          }
          
          .search-input:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
          }
          
          .search-btn {
            padding: 12px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 8px;
            margin-left: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          
          .search-btn:hover {
            background: #0056b3;
            transform: translateY(-1px);
          }
          
          .category-select {
            padding: 12px 15px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 14px;
            background: white;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          
          .category-select:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
          }
          
          .products-grid {
            display: grid;
            grid-template-columns: ${getGridColumns()};
            gap: ${windowWidth < 768 ? '10px' : '15px'};
            padding: ${windowWidth < 768 ? '15px' : '25px'};
            min-height: 400px;
          }
          
          .product-card {
            background: white;
            border-radius: 12px;
            overflow: visible;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            transition: all 0.3s ease;
            position: relative;
            display: flex;
            flex-direction: column;
            min-height: ${windowWidth < 768 ? '240px' : '260px'};
            max-height: ${windowWidth < 768 ? '300px' : '320px'};
          }
          
          .product-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
          }
          
          .product-image {
            width: 100%;
            height: ${windowWidth < 768 ? '90px' : '100px'};
            object-fit: contain;
            background: #f8f9fa;
            padding: 6px;
          }
          
          .product-badge {
            position: absolute;
            top: 6px;
            right: 6px;
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            color: white;
            padding: 3px 6px;
            border-radius: 10px;
            font-size: ${windowWidth < 768 ? '7px' : '9px'};
            font-weight: bold;
            box-shadow: 0 2px 6px rgba(0,123,255,0.3);
            z-index: 2;
          }
          
          .product-info {
            padding: ${windowWidth < 768 ? '8px' : '10px'};
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 3px;
            overflow: hidden;
            min-height: 0;
          }
          
          .product-title {
            font-size: ${windowWidth < 768 ? '10px' : '11px'};
            font-weight: 600;
            color: #2c3e50;
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-wrap: break-word;
            hyphens: auto;
            margin-bottom: 4px;
            flex-shrink: 0;
          }
          
          .product-category {
            background: #e9ecef;
            color: #6c757d;
            padding: 2px 5px;
            border-radius: 6px;
            font-size: ${windowWidth < 768 ? '7px' : '8px'};
            font-weight: 500;
            display: inline-block;
            width: fit-content;
            margin-bottom: 2px;
          }
          
          .product-price {
            font-size: ${windowWidth < 768 ? '12px' : '14px'};
            font-weight: bold;
            color: #28a745;
            margin-bottom: 2px;
          }
          
          .product-rating {
            font-size: ${windowWidth < 768 ? '7px' : '9px'};
            color: #6c757d;
            margin-bottom: 0px;
          }
          
          .action-buttons {
            display: flex;
            gap: 4px;
            margin-top: auto;
            padding: 0px;
            border-top: 1px solid #f0f0f0;
            background: white;
          }
          
          .list-btn {
            flex: 1;
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            border: none;
            padding: ${windowWidth < 768 ? '7px 5px' : '8px 6px'};
            border-radius: 5px;
            font-size: ${windowWidth < 768 ? '8px' : '9px'};
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2px;
            box-shadow: 0 2px 4px rgba(40,167,69,0.25);
            text-transform: uppercase;
            letter-spacing: 0.1px;
            min-height: 28px;
          }
          
          .list-btn:hover {
            background: linear-gradient(135deg, #20c997 0%, #28a745 100%);
            transform: translateY(-1px);
            box-shadow: 0 3px 8px rgba(40,167,69,0.35);
          }
          
          .edit-btn {
            flex: 0 0 auto;
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            color: white;
            border: none;
            padding: ${windowWidth < 768 ? '7px 5px' : '8px 6px'};
            border-radius: 5px;
            font-size: ${windowWidth < 768 ? '8px' : '9px'};
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2px;
            box-shadow: 0 2px 4px rgba(0,123,255,0.25);
            min-width: ${windowWidth < 768 ? '45px' : '50px'};
            min-height: 28px;
          }
          
          .edit-btn:hover {
            background: linear-gradient(135deg, #0056b3 0%, #007bff 100%);
            transform: translateY(-1px);
            box-shadow: 0 3px 8px rgba(0,123,255,0.35);
          }
          
          .pagination-section {
            padding: ${windowWidth < 768 ? '15px' : '25px'};
            background: #f8f9fa;
            border-top: 1px solid #dee2e6;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }
          
          .page-btn {
            padding: 8px 12px;
            border: 2px solid #dee2e6;
            background: white;
            color: #6c757d;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
            min-width: 40px;
          }
          
          .page-btn:hover {
            border-color: #007bff;
            color: #007bff;
          }
          
          .page-btn.active {
            background: #007bff;
            color: white;
            border-color: #007bff;
          }
          
          .page-ellipsis {
            padding: 8px 4px;
            color: #6c757d;
          }
          
          .nav-btn {
            padding: 8px 15px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
          }
          
          .nav-btn:hover {
            background: #0056b3;
          }
          
          .nav-btn:disabled {
            background: #6c757d;
            cursor: not-allowed;
          }
          
          .stats-info {
            text-align: center;
            color: #6c757d;
            font-size: 14px;
            margin-bottom: 15px;
          }
          
          .no-products {
            text-align: center;
            padding: 60px 20px;
            color: #6c757d;
          }
          
          .no-products i {
            font-size: 48px;
            margin-bottom: 20px;
            opacity: 0.5;
          }
          
          @media (max-width: 767px) {
            .filters-section {
              padding: 15px;
            }
            
            .filters-section > div {
              margin-bottom: 15px;
            }
            
            .filters-section > div:last-child {
              margin-bottom: 0;
            }
          }
        `}
      </style>

      <div className="admin-products-container">
        {/* Header */}
        <div className="header-section">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '15px',
            width: '100%',
            maxWidth: '1200px'
          }}>
            <div style={{ textAlign: windowWidth < 768 ? 'center' : 'left', flex: 1 }}>
              <h2 style={{ 
                margin: '0 0 5px 0', 
                fontSize: windowWidth < 768 ? '18px' : '22px',
                color: 'white',
                fontWeight: '700'
              }}>
                <i className="fas fa-star" style={{ marginRight: '8px' }}></i>
                Amazon's Choice Products
              </h2>
              <p style={{ 
                margin: 0, 
                opacity: 0.95, 
                fontSize: windowWidth < 768 ? '12px' : '14px',
                color: 'white'
              }}>
                List verified products to your inventory
              </p>
            </div>
            <button 
              className="nav-btn" 
              onClick={() => navigate('/seller/dashboard')}
              style={{ 
                fontSize: windowWidth < 768 ? '12px' : '14px',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white'
              }}
            >
              <i className="fas fa-arrow-left" style={{ marginRight: '8px' }}></i>
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div style={{ 
            display: windowWidth < 768 ? 'block' : 'flex', 
            gap: '15px', 
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <form onSubmit={handleSearch} style={{ 
              display: 'flex', 
              flex: windowWidth < 768 ? 'none' : '1',
              marginBottom: windowWidth < 768 ? '15px' : '0'
            }}>
              <input
                type="text"
                className="search-input"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="search-btn">
                <i className="fas fa-search"></i>
              </button>
            </form>
            
            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <select
                className="category-select"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value)
                  setCurrentPage(1)
                }}
                style={{ minWidth: windowWidth < 768 ? '150px' : '200px' }}
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label} {cat.count ? `(${cat.count})` : ''}
                  </option>
                ))}
              </select>
              
              <select
                className="category-select"
                value={productsPerPage}
                onChange={(e) => {
                  setProductsPerPage(parseInt(e.target.value))
                  setCurrentPage(1)
                }}
                style={{ minWidth: '80px' }}
              >
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={300}>300</option>
              </select>
            </div>
          </div>
          
          {totalProducts > 0 && (
            <div className="stats-info">
              Showing {((currentPage - 1) * productsPerPage) + 1} - {Math.min(currentPage * productsPerPage, totalProducts)} of {totalProducts} products
            </div>
          )}
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="no-products">
            <i className="fas fa-box-open"></i>
            <h5>No products found</h5>
            <p>Try adjusting your search or category filter</p>
          </div>
        ) : (
          <div className="products-grid">
            {products.map(product => (
              <div key={product._id} className="product-card">
                <div style={{ position: 'relative' }}>
                  {product.images && product.images.length > 0 ? (
                    <img 
                      src={getImageUrl(product.images[0])}
                      className="product-image"
                      alt={product.name}
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div 
                      className="product-image"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        background: '#f8f9fa'
                      }}
                    >
                      <i className="fas fa-image" style={{ fontSize: '24px', color: '#dee2e6' }}></i>
                    </div>
                  )}
                  
                  <div className="product-badge">
                    <i className="fas fa-star" style={{ marginRight: '4px' }}></i>
                    Amazon's Choice
                  </div>
                  
                  {/* Already listed indicator */}
                  {isAlreadyListed(product) && (
                    <div 
                      className="already-listed-badge"
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        zIndex: 2
                      }}
                    >
                      <i className="fas fa-check" style={{ marginRight: '2px' }}></i>
                      LISTED
                    </div>
                  )}
                </div>
                
                <div className="product-info">
                  <div className="product-title">{product.name}</div>
                  
                  <div className="product-category">{product.category}</div>
                  
                  <div className="product-price">
                    £{parseFloat(product.price).toFixed(2)}
                    {product.originalPrice && (
                      <span style={{ 
                        fontSize: windowWidth < 768 ? '9px' : '11px',
                        color: '#6c757d',
                        textDecoration: 'line-through',
                        marginLeft: '6px'
                      }}>
                        £{parseFloat(product.originalPrice).toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  <div className="product-rating">
                    <i className="fas fa-star" style={{ color: '#ffc107', marginRight: '4px' }}></i>
                    {product.rating || 4.5} ({product.reviews || 0} reviews)
                  </div>
                  
                  {/* Existing sellers information */}
                  {product.sellers && product.sellers.length > 0 && (
                    <div style={{ 
                      fontSize: windowWidth < 768 ? '7px' : '8px',
                      color: '#6c757d',
                      marginBottom: '4px',
                      padding: '2px 4px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '3px',
                      border: '1px solid #e9ecef'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                        <i className="fas fa-users" style={{ marginRight: '2px', fontSize: '6px' }}></i>
                        {product.sellers.length} Seller{product.sellers.length > 1 ? 's' : ''}:
                      </div>
                      {product.sellers.slice(0, 2).map((sellerEntry, index) => {
                        const sellerPrice = sellerEntry.sellerPrice ? parseFloat(sellerEntry.sellerPrice) : parseFloat(product.price);
                        return (
                          <div key={`seller-${index}`} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: index < product.sellers.length - 1 ? '1px' : '0'
                          }}>
                            <span style={{ 
                              color: index === 0 ? '#28a745' : '#6c757d',
                              fontWeight: index === 0 ? 'bold' : 'normal'
                            }}>
                              {sellerEntry.username}
                              {index === 0 && ' (Lowest)'}
                            </span>
                            <span style={{ 
                              color: index === 0 ? '#28a745' : '#6c757d',
                              fontWeight: 'bold'
                            }}>
                              £{sellerPrice.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                      {product.sellers.length > 2 && (
                        <div style={{ 
                          fontSize: windowWidth < 768 ? '6px' : '7px',
                          color: '#999',
                          textAlign: 'center',
                          marginTop: '2px'
                        }}>
                          +{product.sellers.length - 2} more seller{product.sellers.length - 2 > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Action buttons container */}
                  <div className="action-buttons">
                    {isAlreadyListed(product) ? (
                      <button 
                        className="list-btn already-listed"
                        disabled
                        title="You have already listed this product"
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          cursor: 'not-allowed',
                          opacity: 0.8
                        }}
                      >
                        <i className="fas fa-check" style={{ fontSize: '8px' }}></i>
                        {windowWidth < 768 ? 'ALREADY LISTED' : 'ALREADY IN MY STORE'}
                      </button>
                    ) : (
                      <button 
                        className="list-btn"
                        onClick={() => handleListProduct(product)}
                        title="Add this product to your store inventory"
                      >
                        <i className="fas fa-plus" style={{ fontSize: '8px' }}></i>
                        {windowWidth < 768 ? 'ADD TO STORE' : 'ADD TO MY STORE'}
                      </button>
                    )}
                    
                    <button 
                      className="edit-btn"
                      onClick={() => handleEditProduct(product)}
                      title="Edit product price and assign to your account"
                    >
                      <i className="fas fa-edit" style={{ fontSize: '8px' }}></i>
                      EDIT
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-section">
            <button 
              className="nav-btn"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            
            {renderPagination()}
            
            <button 
              className="nav-btn"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminProducts