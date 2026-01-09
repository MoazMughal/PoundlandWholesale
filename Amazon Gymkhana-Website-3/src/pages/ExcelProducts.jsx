import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ScrollToTop from '../components/ScrollToTop'

const ExcelProducts = () => {
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [excelInfo, setExcelInfo] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const productsPerPage = 48

  // Fetch Excel data
  useEffect(() => {
    fetchExcelProducts()
    fetchExcelInfo()
  }, [])

  const fetchExcelProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:5000/api/excel/products')
      
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products)
        setFilteredProducts(data.products)
      } else {
        console.error('Failed to fetch Excel products')
      }
    } catch (error) {
      console.error('Error fetching Excel products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchExcelInfo = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/excel/info')
      if (response.ok) {
        const data = await response.json()
        setExcelInfo(data)
      }
    } catch (error) {
      console.error('Error fetching Excel info:', error)
    }
  }

  // Get unique categories
  const categories = ['all', ...new Set(products.map(p => p.category))]

  // Filter products
  useEffect(() => {
    let filtered = products

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.asin?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredProducts(filtered)
    setCurrentPage(1)
  }, [selectedCategory, searchQuery, products])

  // Pagination
  const indexOfLastProduct = currentPage * productsPerPage
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct)
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage)

  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(<i key={i} className="fas fa-star"></i>)
    }
    if (hasHalfStar) {
      stars.push(<i key="half" className="fas fa-star-half-alt"></i>)
    }
    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<i key={`empty-${i}`} className="far fa-star"></i>)
    }
    return stars
  }

  const handleProductClick = (product) => {
    // Open product in new tab with all product details in URL
    const params = new URLSearchParams({
      name: product.name,
      img: product.image || 'https://via.placeholder.com/400',
      price: product.price,
      rating: product.rating || 4.5,
      reviews: product.reviews || 0,
      category: product.category || 'General',
      brand: product.brand || '',
      discount: product.discount || 0
    })
    const url = `/product/${product.id}?${params.toString()}`
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📊</div>
          <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#333' }}>Loading Excel Products...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px 0', marginBottom: '20px' }}>
        <div className="container">
          <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: '800', marginBottom: '10px' }}>
            📊 Excel Products
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1rem', marginBottom: '10px' }}>
            Products loaded from Products.xlsx file
          </p>
          {excelInfo && (
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '15px' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 15px', borderRadius: '8px' }}>
                <strong>{products.length}</strong> Products
              </div>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 15px', borderRadius: '8px' }}>
                <strong>{categories.length - 1}</strong> Categories
              </div>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px 15px', borderRadius: '8px' }}>
                <strong>{excelInfo.columns?.length || 0}</strong> Columns
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container">
        {/* Search and Filters */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Search by name, brand, or ASIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: '250px',
              padding: '12px 15px',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '12px 15px',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              minWidth: '150px'
            }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Results Info */}
        <div style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
          Showing {indexOfFirstProduct + 1}-{Math.min(indexOfLastProduct, filteredProducts.length)} of {filteredProducts.length} products
        </div>

        {/* Products Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '30px' }}>
          {currentProducts.map(product => (
            <div
              key={product.id}
              onClick={() => handleProductClick(product)}
              style={{
                background: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              {/* Product Image */}
              <div style={{ position: 'relative', height: '200px', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                      // Show placeholder if image fails to load
                      e.target.style.display = 'none'
                      e.target.parentElement.innerHTML = `
                        <div style="text-align: center; color: #999;">
                          <i class="fas fa-image" style="font-size: 3rem; margin-bottom: 10px;"></i>
                          <div style="font-size: 12px;">Image Not Available</div>
                        </div>
                      `
                    }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: '#999' }}>
                    <i className="fas fa-image" style={{ fontSize: '3rem', marginBottom: '10px' }}></i>
                    <div style={{ fontSize: '12px' }}>No Image</div>
                  </div>
                )}

              </div>

              {/* Product Info */}
              <div style={{ padding: '12px' }}>
                <h5 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 8px 0', lineHeight: '1.3', height: '36px', overflow: 'hidden' }}>
                  {product.name}
                </h5>

                {product.brand && (
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>
                    {product.brand}
                  </div>
                )}



                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ color: '#f6b042', fontSize: '11px', marginRight: '6px' }}>
                    {renderStars(product.rating)}
                  </div>
                  <span style={{ fontSize: '11px', color: '#666' }}>({product.reviews})</span>
                </div>

                <div style={{ fontSize: '16px', fontWeight: '800', color: '#0b3b2e', marginBottom: '6px' }}>
                  £{product.price.toFixed(2)}
                </div>

                {product.category && (
                  <div style={{ fontSize: '10px', background: '#e3f2fd', color: '#1976d2', padding: '3px 8px', borderRadius: '12px', display: 'inline-block', marginBottom: '8px' }}>
                    {product.category}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                  {product.asin && (
                    <a
                      href={`https://www.amazon.com/dp/${product.asin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1,
                        background: '#232f3e',
                        color: 'white',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textAlign: 'center',
                        textDecoration: 'none'
                      }}
                    >
                      <i className="fab fa-amazon"></i> View on Amazon
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            <i className="fas fa-search" style={{ fontSize: '4rem', marginBottom: '20px', opacity: 0.3 }}></i>
            <h3>No products found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '30px', marginBottom: '30px' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: currentPage === 1 ? '#f5f5f5' : 'white',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Previous
            </button>
            <div style={{ padding: '8px 16px', border: '1px solid #667eea', borderRadius: '6px', background: '#667eea', color: 'white', fontWeight: '600' }}>
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 16px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: currentPage === totalPages ? '#f5f5f5' : 'white',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      <ScrollToTop />
    </div>
  )
}

export default ExcelProducts
