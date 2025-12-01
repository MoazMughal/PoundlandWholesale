import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeller } from '../../context/SellerContext'
import { getImageUrl } from '../../utils/imageImports'

const AdminProducts = () => {
  const navigate = useNavigate()
  const { seller, isLoggedIn } = useSeller()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'jewelry', label: 'Jewelry' },
    { value: 'home', label: 'Home & Decor' },
    { value: 'automotive', label: 'Automotive' },
    { value: 'party', label: 'Party Supplies' }
  ]

  useEffect(() => {
    if (!isLoggedIn || !seller) {
      navigate('/login/supplier')
      return
    }

    if (!(seller?.canListProducts || seller?.verificationStatus === 'approved')) {
      navigate('/seller/dashboard')
      return
    }

    fetchAdminProducts()
  }, [isLoggedIn, seller, currentPage, searchQuery, selectedCategory])

  const fetchAdminProducts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('sellerToken')
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: 12,
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
        setProducts(data.products)
        setTotalPages(data.totalPages)
      } else {
        console.error('Failed to fetch admin products')
      }
    } catch (error) {
      console.error('Error fetching admin products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleListProduct = (product) => {
    setSelectedProduct(product)
    setShowPaymentModal(true)
  }

  const handlePaymentSubmit = async () => {
    if (!selectedProduct) return

    try {
      const token = localStorage.getItem('sellerToken')
      
      const response = await fetch('http://localhost:5000/api/products/seller/list-admin-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          adminProductId: selectedProduct._id,
          paymentTransactionId: `TXN${Date.now()}`
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ Product added to your inventory successfully!')
        setShowPaymentModal(false)
        setSelectedProduct(null)
      } else {
        alert('❌ ' + data.message)
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('❌ Failed to list product')
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchAdminProducts()
  }

  if (loading && products.length === 0) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-md-8">
          <h2>Admin Products - Amazon's Choice</h2>
          <p className="text-muted mb-0">List verified products to your inventory (₨500 per product)</p>
        </div>
        <div className="col-md-4 text-end">
          <button className="btn btn-secondary" onClick={() => navigate('/seller/dashboard')}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="row mb-4">
        <div className="col-md-8">
          <form onSubmit={handleSearch} className="d-flex">
            <input
              type="text"
              className="form-control me-2"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              <i className="fas fa-search"></i>
            </button>
          </form>
        </div>
        <div className="col-md-4">
          <select
            className="form-select"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value)
              setCurrentPage(1)
            }}
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="row">
        {products.length === 0 ? (
          <div className="col-12">
            <div className="text-center py-5">
              <i className="fas fa-box-open fa-3x text-muted mb-3"></i>
              <h5>No products found</h5>
              <p className="text-muted">Try adjusting your search or category filter</p>
            </div>
          </div>
        ) : (
          products.map(product => (
            <div key={product._id} className="col-lg-3 col-md-4 col-sm-6 mb-4">
              <div className="card h-100">
                <div className="position-relative">
                  {product.images && product.images.length > 0 ? (
                    <img 
                      src={getImageUrl(product.images[0])}
                      className="card-img-top"
                      alt={product.name}
                      style={{ height: '200px', objectFit: 'contain' }}
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div 
                      className="card-img-top d-flex align-items-center justify-content-center bg-light"
                      style={{ height: '200px' }}
                    >
                      <i className="fas fa-image fa-3x text-muted"></i>
                    </div>
                  )}
                  
                  {/* Amazon's Choice Badge */}
                  <div className="position-absolute top-0 end-0 m-2">
                    <span className="badge bg-primary">
                      <i className="fas fa-star"></i> Amazon's Choice
                    </span>
                  </div>
                </div>
                
                <div className="card-body d-flex flex-column">
                  <h6 className="card-title" style={{ fontSize: '0.9rem', lineHeight: '1.2' }}>
                    {product.name}
                  </h6>
                  
                  <div className="mb-2">
                    <span className="badge bg-secondary">{product.category}</span>
                  </div>
                  
                  <div className="mb-2">
                    <strong className="text-success">£{product.price}</strong>
                    {product.originalPrice && (
                      <small className="text-muted ms-2">
                        <del>£{product.originalPrice}</del>
                      </small>
                    )}
                  </div>
                  
                  <div className="mb-2">
                    <small className="text-muted">
                      <i className="fas fa-star text-warning"></i> {product.rating || 4.5} 
                      ({product.reviews || 0} reviews)
                    </small>
                  </div>
                  
                  <div className="mt-auto">
                    <button 
                      className="btn btn-success btn-sm w-100"
                      onClick={() => handleListProduct(product)}
                    >
                      <i className="fas fa-plus"></i> List Product (₨500)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="row">
          <div className="col-12">
            <nav>
              <ul className="pagination justify-content-center">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                </li>
                
                {[...Array(totalPages)].map((_, index) => (
                  <li key={index + 1} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                    <button 
                      className="page-link"
                      onClick={() => setCurrentPage(index + 1)}
                    >
                      {index + 1}
                    </button>
                  </li>
                ))}
                
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
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
                  {selectedProduct.images && selectedProduct.images.length > 0 ? (
                    <img 
                      src={getImageUrl(selectedProduct.images[0])}
                      alt={selectedProduct.name}
                      style={{width: '100px', height: '100px', objectFit: 'contain'}}
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div 
                      className="d-flex align-items-center justify-content-center bg-light"
                      style={{width: '100px', height: '100px', margin: '0 auto'}}
                    >
                      <i className="fas fa-image fa-2x text-muted"></i>
                    </div>
                  )}
                  <h6 className="mt-2">{selectedProduct.name}</h6>
                  <p className="text-muted">£{selectedProduct.price}</p>
                </div>
                
                <div className="alert alert-info">
                  <h6><i className="fas fa-info-circle"></i> Listing Details</h6>
                  <ul className="mb-0">
                    <li>Listing Fee: <strong>₨500</strong></li>
                    <li>Product will be added to your inventory</li>
                    <li>You can start selling immediately</li>
                    <li>Product will appear in your seller dashboard</li>
                    <li>This is an Amazon's Choice verified product</li>
                  </ul>
                </div>

                <div className="alert alert-warning">
                  <small>
                    <i className="fas fa-exclamation-triangle"></i> 
                    By listing this product, you agree to maintain the quality standards 
                    and pricing guidelines set by the admin.
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
                  <i className="fas fa-check"></i> Confirm & List Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminProducts