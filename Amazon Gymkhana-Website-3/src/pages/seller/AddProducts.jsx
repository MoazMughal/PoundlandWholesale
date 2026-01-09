import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeller } from '../../context/SellerContext'

const AddProducts = () => {
  const navigate = useNavigate()
  const { seller, isLoggedIn } = useSeller()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [paymentDetails, setPaymentDetails] = useState({
    receiptImageUrl: '',
    transactionId: '',
    paymentMethod: 'jazzcash',
    notes: ''
  })

  useEffect(() => {
    if (!isLoggedIn || !seller) {
      navigate('/login/supplier')
      return
    }
    fetchProducts()
  }, [navigate, isLoggedIn, seller])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      // Fetch products from Excel file using dedicated endpoint
      const response = await fetch('http://localhost:5000/api/products/excel-products?limit=1000')

      if (response.ok) {
        const data = await response.json()
        console.log('Excel products fetched:', data.products.length)
        setProducts(data.products)
      } else {
        console.error('Error fetching Excel products')
      }
    } catch (error) {
      console.error('Error fetching Excel products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleListProduct = (product) => {
    setSelectedProduct(product)
    setShowPaymentModal(true)
  }

  const handleImageUrlChange = (e) => {
    setPaymentDetails(prev => ({
      ...prev,
      receiptImageUrl: e.target.value
    }))
  }

  const handlePaymentSubmit = async () => {
    if (!selectedProduct) return

    // Validate payment details
    if (!paymentDetails.receiptImageUrl.trim()) {
      alert('❌ Please provide payment receipt image URL')
      return
    }

    if (!paymentDetails.transactionId.trim()) {
      alert('❌ Please enter transaction ID')
      return
    }

    try {
      const token = localStorage.getItem('sellerToken')
      
      const requestData = {
        productId: selectedProduct._id,
        productName: selectedProduct.name,
        productPrice: selectedProduct.price,
        transactionId: paymentDetails.transactionId,
        paymentMethod: paymentDetails.paymentMethod,
        notes: paymentDetails.notes,
        receiptImageUrl: paymentDetails.receiptImageUrl
      }

      const response = await fetch('http://localhost:5000/api/sellers/submit-product-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ Product listing request submitted successfully! Please wait for admin approval.')
        setShowPaymentModal(false)
        setSelectedProduct(null)
        setPaymentDetails({
          receiptImageUrl: '',
          transactionId: '',
          paymentMethod: 'jazzcash',
          notes: ''
        })
      } else {
        alert('❌ ' + data.message)
      }
    } catch (error) {
      console.error('Submission error:', error)
      alert('❌ Failed to submit product listing request')
    }
  }

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = [...new Set(products.map(p => p.category))].filter(Boolean)

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading products...</span>
          </div>
          <p className="mt-2">Loading products from Excel database...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-md-8">
          <h2><i className="fas fa-plus-circle"></i> Add Products to Your Store</h2>
          <p className="text-muted">Choose products from our Excel database to list in your store</p>
        </div>
        <div className="col-md-4 text-end">
          <button className="btn btn-secondary" onClick={() => navigate('/seller/dashboard')}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
        </div>
      </div>

      {/* Info Alert */}
      <div className="alert alert-info mb-4">
        <h6><i className="fas fa-file-excel"></i> Excel Products - How it works:</h6>
        <ol className="mb-0">
          <li>Browse products imported from <strong>products.xlsx</strong> file below</li>
          <li>Click "List This Product" on any product you want to sell</li>
          <li>Submit payment receipt (₨500 listing fee per product)</li>
          <li>Wait for admin approval</li>
          <li>Once approved, the product appears on the website with your contact details</li>
        </ol>
        <p className="mb-0 mt-2"><small><strong>Note:</strong> These are curated products from our Excel database, not Amazon's Choice products.</small></p>
      </div>

      {/* Search and Filter */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text"><i className="fas fa-search"></i></span>
            <input
              type="text"
              className="form-control"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-6">
          <select
            className="form-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category} ({products.filter(p => p.category === category).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="row mb-4">
        <div className="col-12">
          <p className="text-muted">
            Showing {filteredProducts.length} of {products.length} products
            {searchQuery && ` matching "${searchQuery}"`}
            {categoryFilter !== 'all' && ` in ${categoryFilter}`}
          </p>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-5">
          <i className="fas fa-search fa-3x text-muted mb-3"></i>
          <h4>No products found</h4>
          <p className="text-muted">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="row">
          {filteredProducts.map(product => (
            <div key={product._id} className="col-lg-4 col-md-6 mb-4">
              <div className="card h-100">
                <div className="position-relative">
                  <div className="card-img-top" style={{height: '200px', backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    {product.images && product.images[0] ? (
                      <img 
                        src={product.images[0]} 
                        alt={product.name}
                        style={{maxHeight: '100%', maxWidth: '100%', objectFit: 'contain'}}
                      />
                    ) : (
                      <i className="fas fa-image fa-3x text-muted"></i>
                    )}
                  </div>
                  {/* Excel Product Badge */}
                  <span className="badge bg-success position-absolute top-0 start-0 m-2">
                    <i className="fas fa-file-excel"></i> Excel Product
                  </span>
                </div>
                <div className="card-body d-flex flex-column">
                  <h6 className="card-title">{product.name}</h6>
                  <p className="card-text text-muted small flex-grow-1">
                    {product.description?.substring(0, 100)}...
                  </p>
                  <div className="mb-2">
                    <strong className="text-primary">£{product.price}</strong>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <small className="text-muted ms-2">
                        <del>£{product.originalPrice}</del>
                        <span className="badge bg-success ms-1">
                          {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                        </span>
                      </small>
                    )}
                  </div>
                  <div className="mb-2">
                    <small className="text-muted">
                      <i className="fas fa-tag"></i> {product.category} | 
                      <i className="fas fa-boxes ms-2"></i> Stock: {product.stock} | 
                      <i className="fas fa-star ms-2 text-warning"></i> {product.rating || 4.0}
                    </small>
                  </div>
                  <button 
                    className="btn btn-success w-100"
                    onClick={() => handleListProduct(product)}
                  >
                    <i className="fas fa-plus"></i> List This Product (₨500)
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedProduct && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-credit-card"></i> Submit Product Listing Payment
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowPaymentModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Product Info */}
                <div className="card mb-4">
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-3">
                        <img 
                          src={selectedProduct.images?.[0] || '/placeholder.jpg'} 
                          alt={selectedProduct.name}
                          className="img-fluid rounded"
                          style={{maxHeight: '100px', objectFit: 'contain'}}
                        />
                      </div>
                      <div className="col-md-9">
                        <h6>{selectedProduct.name}</h6>
                        <p className="text-muted small mb-1">{selectedProduct.description?.substring(0, 150)}...</p>
                        <p className="mb-0">
                          <strong className="text-primary">Price: £{selectedProduct.price}</strong>
                          <span className="badge bg-secondary ms-2">{selectedProduct.category}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Instructions */}
                <div className="alert alert-info">
                  <h6><i className="fas fa-info-circle"></i> Payment Instructions</h6>
                  <p className="mb-2"><strong>Listing Fee: ₨500 per product</strong></p>
                  <p className="mb-2">Send payment to: <strong>JazzCash: 03235685367</strong></p>
                  <ol className="mb-0">
                    <li>Send ₨500 to the above JazzCash number</li>
                    <li>Take a screenshot of the payment confirmation</li>
                    <li>Upload the receipt image below</li>
                    <li>Enter the transaction ID</li>
                    <li>Submit for admin approval</li>
                  </ol>
                </div>

                {/* Payment Form */}
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Payment Method</label>
                    <select 
                      className="form-control" 
                      value={paymentDetails.paymentMethod}
                      onChange={(e) => setPaymentDetails(prev => ({...prev, paymentMethod: e.target.value}))}
                    >
                      <option value="jazzcash">JazzCash - 03235685367</option>
                      <option value="easypaisa">EasyPaisa</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Transaction ID *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={paymentDetails.transactionId}
                      onChange={(e) => setPaymentDetails(prev => ({...prev, transactionId: e.target.value}))}
                      placeholder="Enter transaction ID from receipt"
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Payment Receipt Image URL *</label>
                  <input
                    type="url"
                    className="form-control"
                    value={paymentDetails.receiptImageUrl}
                    onChange={handleImageUrlChange}
                    placeholder="Upload receipt to imgur/drive and paste URL here"
                    required
                  />
                  <small className="text-muted">
                    Upload your payment receipt to <a href="https://imgur.com" target="_blank" rel="noopener noreferrer">Imgur</a> or 
                    Google Drive and paste the direct image URL here
                  </small>
                  {paymentDetails.receiptImageUrl && (
                    <div className="mt-2">
                      <img 
                        src={paymentDetails.receiptImageUrl} 
                        alt="Receipt Preview" 
                        className="img-thumbnail"
                        style={{maxWidth: '200px', maxHeight: '150px', objectFit: 'contain'}}
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label">Additional Notes (Optional)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={paymentDetails.notes}
                    onChange={(e) => setPaymentDetails(prev => ({...prev, notes: e.target.value}))}
                    placeholder="Any additional information about the payment or product..."
                  ></textarea>
                </div>

                <div className="alert alert-warning">
                  <small>
                    <i className="fas fa-exclamation-triangle"></i> 
                    <strong>Important:</strong> After submission, your request will be reviewed by admin. 
                    Once approved, this product will appear on the website with your contact details for buyers to reach you.
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
                  <i className="fas fa-paper-plane"></i> Submit for Approval
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AddProducts