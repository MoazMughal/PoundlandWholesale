import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSeller } from '../../context/SellerContext'

const SellerProducts = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn, loading: authLoading, authResolved } = useSeller()
  const [products, setProducts] = useState([])
  const [adminProducts, setAdminProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  
  // Check URL parameters for default tab
  const urlParams = new URLSearchParams(location.search)
  const defaultTab = urlParams.get('tab') || 'admin-products'
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('jazzcash')
  const [updatingProducts, setUpdatingProducts] = useState(new Set()) // Track which products are being updated
  const [editingCell, setEditingCell] = useState(null) // Track which cell is being edited (productId-field)
  const [editValues, setEditValues] = useState({}) // Store edit values
  const [paymentDetails, setPaymentDetails] = useState({
    receiptImage: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolderName: ''
  })

  useEffect(() => {
    // Wait for authentication to be resolved before checking login status
    if (!authResolved || authLoading) {
      return
    }

    if (!isLoggedIn) {
      navigate('/login/supplier')
      return
    }
    const token = localStorage.getItem('sellerToken')
    if (activeTab === 'my-products') {
      fetchProducts(token)
    } else if (activeTab === 'admin-products') {
      fetchAdminProducts()
    }
  }, [navigate, filter, activeTab, isLoggedIn])

  const fetchProducts = async (token) => {
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('status', filter)

      // Use the correct endpoint for seller's listed products
      const response = await fetch(`http://localhost:5000/api/sellers/my-listed-products?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAdminProducts = async () => {
    try {
      setLoading(true)
      // Fetch ALL products from Excel using public endpoint
      const response = await fetch('http://localhost:5000/api/products/public?limit=1000', {
        // No authorization needed for public endpoint
      })

      if (response.ok) {
        const data = await response.json()
        
        setAdminProducts(data.products)
      } else {
        const errorData = await response.json()
        console.error('Error fetching admin products:', errorData)
      }
    } catch (error) {
      console.error('Error fetching admin products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleListProduct = (product) => {
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
        productId: selectedProduct._id,
        productName: selectedProduct.name,
        paymentDetails: paymentDetails,
        status: paymentMethod === 'jazzcash' ? 'pending' : 'completed' // JazzCash needs admin approval
      }

      const response = await fetch('http://localhost:5000/api/sellers/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
      })

      const data = await response.json()

      if (response.ok) {
        // Submit product listing request instead of direct listing
        const requestResponse = await fetch('http://localhost:5000/api/sellers/request-admin-product-listing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            adminProductId: selectedProduct._id,
            productName: selectedProduct.name,
            productPrice: selectedProduct.price,
            sellerPrice: selectedProduct.price, // Use admin price as default
            notes: `Payment submitted via ${paymentMethod} - Transaction: TXN${Date.now()}`
          })
        })

        if (requestResponse.ok) {
          if (paymentMethod === 'jazzcash') {
            alert('✅ Payment receipt and listing request submitted! Waiting for admin approval.')
          } else {
            alert('✅ Payment successful and listing request submitted! Waiting for admin approval.')
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
          // Refresh admin products to remove the listed one
          fetchAdminProducts()
          // Switch to my products tab to show the new product
          setActiveTab('my-products')
          fetchProducts(token)
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

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const token = localStorage.getItem('sellerToken')
      const response = await fetch(`http://localhost:5000/api/products/seller/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('✅ Product deleted successfully')
        fetchProducts(token)
      } else {
        const data = await response.json()
        alert('❌ ' + data.message)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('❌ Failed to delete product')
    }
  }

  const handleCellClick = (productId, field, currentValue) => {
    setEditingCell(`${productId}-${field}`)
    setEditValues({ ...editValues, [`${productId}-${field}`]: currentValue || '' })
  }

  const handleEditChange = (productId, field, value) => {
    setEditValues({ ...editValues, [`${productId}-${field}`]: value })
  }

  const handleInputEvent = (e, productId, field) => {
    // Handle keyboard up/down arrows and direct input
    const value = e.target.value
    handleEditChange(productId, field, value)
  }

  const handleMouseWheel = (e, productId, field) => {
    // Handle mouse wheel up/down on number inputs
    if (e.deltaY < 0) {
      // Wheel up - increment
      const currentValue = parseFloat(editValues[`${productId}-${field}`] || 0)
      const step = field === 'price' ? 0.01 : 1
      const newValue = (currentValue + step).toFixed(field === 'price' ? 2 : 0)
      handleEditChange(productId, field, newValue)
    } else if (e.deltaY > 0) {
      // Wheel down - decrement
      const currentValue = parseFloat(editValues[`${productId}-${field}`] || 0)
      const step = field === 'price' ? 0.01 : 1
      const newValue = Math.max(0, currentValue - step).toFixed(field === 'price' ? 2 : 0)
      handleEditChange(productId, field, newValue)
    }
  }

  const handleSaveEdit = async (productId, field) => {
    const cellKey = `${productId}-${field}`
    const newValue = editValues[cellKey]

    if (!newValue || newValue === '' || isNaN(newValue)) {
      setEditingCell(null)
      return
    }

    const numericValue = field === 'price' ? parseFloat(newValue) : parseInt(newValue)
    if (numericValue < 0) {
      setEditingCell(null)
      return
    }

    // Add product to updating set
    setUpdatingProducts(prev => new Set(prev).add(productId))
    setEditingCell(null) // Exit edit mode

    try {
      const token = localStorage.getItem('sellerToken')
      const updateData = {}
      updateData[field] = numericValue

      const response = await fetch(`http://localhost:5000/api/sellers/update-inventory/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        // Update the local state to reflect the change
        setProducts(prevProducts => 
          prevProducts.map(product => 
            product._id === productId 
              ? { 
                  ...product, 
                  [field]: numericValue,
                  // Update seller's specific price if it's a price update
                  ...(field === 'price' && {
                    sellerInfo: {
                      ...product.sellerInfo,
                      sellerPrice: numericValue
                    }
                  })
                }
              : product
          )
        )
      } else {
        const data = await response.json()
        console.error('Update failed:', data.message)
      }
    } catch (error) {
      console.error('Update error:', error)
    } finally {
      // Remove product from updating set
      setUpdatingProducts(prev => {
        const newSet = new Set(prev)
        newSet.delete(productId)
        return newSet
      })
    }
  }

  const handleKeyPress = (e, productId, field) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleSaveEdit(productId, field)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditingCell(null)
    }
  }

  if (loading) {
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
    <div className="container mt-4">
      <style>{`
        .editable-field {
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid transparent;
          transition: all 0.2s ease;
        }
        .editable-field:hover {
          background-color: #f8f9fa;
          border-color: #dee2e6;
        }
      `}</style>
      {/* Header */}
      <div className="row mb-4">
        <div className="col-md-8">
          <h2>Product Management</h2>
          <p className="text-muted">Manage your products and browse available listings</p>
        </div>
        <div className="col-md-4 text-end">
          <button className="btn btn-primary me-2" onClick={() => navigate('/seller/products/add')}>
            <i className="fas fa-plus"></i> Add Product
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/seller/dashboard')}>
            <i className="fas fa-arrow-left"></i> Dashboard
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="row mb-4">
        <div className="col-12">
          <ul className="nav nav-tabs">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'my-products' ? 'active' : ''}`}
                onClick={() => setActiveTab('my-products')}
              >
                <i className="fas fa-box"></i> Listed Products ({products.length})
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'admin-products' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin-products')}
              >
                <i className="fas fa-store"></i> Excel Products ({adminProducts.length})
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Filters - Only show for My Products tab */}
      {activeTab === 'my-products' && (
        <div className="row mb-3">
          <div className="col-12">
            <div className="btn-group" role="group">
              <button 
                className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter('all')}
              >
                All Products
              </button>
              <button 
                className={`btn ${filter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                onClick={() => setFilter('pending')}
              >
                Pending Approval
              </button>
              <button 
                className={`btn ${filter === 'approved' ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => setFilter('approved')}
              >
                Approved
              </button>
              <button 
                className={`btn ${filter === 'rejected' ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={() => setFilter('rejected')}
              >
                Rejected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'my-products' ? (
        /* My Products List */
        products.length === 0 ? (
          <div className="text-center py-5">
            <i className="fas fa-box-open fa-3x text-muted mb-3"></i>
            <h4>No products found</h4>
            <p className="text-muted">Start by adding your first product or browse available products to list</p>
            <div className="d-flex gap-2 justify-content-center">
              <button className="btn btn-primary" onClick={() => navigate('/seller/products/add')}>
                <i className="fas fa-plus"></i> Add Your First Product
              </button>
              <button className="btn btn-outline-primary" onClick={() => setActiveTab('admin-products')}>
                <i className="fas fa-store"></i> Browse Excel Products
              </button>
            </div>
          </div>
        ) : (
          <div className="row">
            {products.map(product => (
              <div key={product._id} className="col-lg-4 col-md-6 mb-4">
                <div className="card h-100">
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
                  <div className="card-body d-flex flex-column">
                    <h6 className="card-title">{product.name}</h6>
                    <p className="card-text text-muted small flex-grow-1">
                      {product.description?.substring(0, 100)}...
                    </p>
                    <div className="mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <label className="small text-muted mb-0">Price:</label>
                        <span
                          className="text-primary fw-bold editable-field"
                          style={{
                            minWidth: '60px',
                            display: 'inline-block',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}
                          onClick={() => handleCellClick(product._id, 'price', product.sellerInfo?.sellerPrice || product.price)}
                          onMouseEnter={(e) => e.target.style.background = '#f0f0ff'}
                          onMouseLeave={(e) => e.target.style.background = ''}
                          title="Click to edit price"
                        >
                          {editingCell === `${product._id}-price` ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editValues[`${product._id}-price`] || ''}
                              onChange={(e) => handleEditChange(product._id, 'price', e.target.value)}
                              onInput={(e) => handleInputEvent(e, product._id, 'price')}
                              onWheel={(e) => handleMouseWheel(e, product._id, 'price')}
                              onBlur={() => handleSaveEdit(product._id, 'price')}
                              onKeyDown={(e) => handleKeyPress(e, product._id, 'price')}
                              autoFocus
                              disabled={updatingProducts.has(product._id)}
                              style={{
                                width: '70px',
                                padding: '3px',
                                fontSize: '0.75rem',
                                border: '2px solid #667eea',
                                borderRadius: '4px',
                                outline: 'none'
                              }}
                            />
                          ) : (
                            <span>
                              £{product.sellerInfo?.sellerPrice || product.price}
                              <span style={{ marginLeft: '3px', fontSize: '0.55rem', color: '#999' }}>✏️</span>
                            </span>
                          )}
                        </span>
                      </div>
                      {product.originalPrice && product.originalPrice > (product.sellerInfo?.sellerPrice || product.price) && (
                        <small className="text-muted">
                          <del>Original: £{product.originalPrice}</del>
                        </small>
                      )}
                      {product.sellerInfo?.sellerPrice && product.sellerInfo.sellerPrice !== product.price && (
                        <small className="text-info d-block">
                          Admin Price: £{product.price}
                        </small>
                      )}
                    </div>
                    <div className="mb-2">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <label className="small text-muted mb-0">Stock:</label>
                        <span
                          className="text-dark fw-bold editable-field"
                          style={{
                            minWidth: '50px',
                            display: 'inline-block',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}
                          onClick={() => handleCellClick(product._id, 'stock', product.stock)}
                          onMouseEnter={(e) => e.target.style.background = '#f0f0ff'}
                          onMouseLeave={(e) => e.target.style.background = ''}
                          title="Click to edit stock"
                        >
                          {editingCell === `${product._id}-stock` ? (
                            <input
                              type="number"
                              value={editValues[`${product._id}-stock`] || ''}
                              onChange={(e) => handleEditChange(product._id, 'stock', e.target.value)}
                              onInput={(e) => handleInputEvent(e, product._id, 'stock')}
                              onWheel={(e) => handleMouseWheel(e, product._id, 'stock')}
                              onBlur={() => handleSaveEdit(product._id, 'stock')}
                              onKeyDown={(e) => handleKeyPress(e, product._id, 'stock')}
                              autoFocus
                              disabled={updatingProducts.has(product._id)}
                              style={{
                                width: '50px',
                                padding: '3px',
                                fontSize: '0.7rem',
                                border: '2px solid #667eea',
                                borderRadius: '4px',
                                outline: 'none'
                              }}
                            />
                          ) : (
                            <span>
                              {product.stock}
                              <span style={{ marginLeft: '3px', fontSize: '0.55rem', color: '#999' }}>✏️</span>
                            </span>
                          )}
                        </span>
                      </div>
                      <span className={`badge bg-${
                        product.approvalStatus === 'approved' ? 'success' : 
                        product.approvalStatus === 'pending' ? 'warning' : 'danger'
                      }`}>
                        {product.approvalStatus?.toUpperCase()}
                      </span>
                    </div>
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-sm btn-outline-danger flex-fill"
                        onClick={() => handleDelete(product._id)}
                      >
                        <i className="fas fa-trash"></i> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Admin Products List */
        <div>
          <div className="alert alert-info mb-4">
            <h6><i className="fas fa-info-circle"></i> All Products from Excel Database</h6>
            <p className="mb-0">Browse our complete collection of products from Excel import. Pay ₨500 per product to add them to your inventory and start selling immediately.</p>
          </div>
          
          {adminProducts.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-store fa-3x text-muted mb-3"></i>
              <h4>No Excel products found</h4>
              <p className="text-muted">No products have been imported from Excel yet. Contact admin to import products.</p>
            </div>
          ) : (
            <div className="row">
              {adminProducts.map(product => (
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
                      {product.isAmazonsChoice && (
                        <span className="badge bg-warning position-absolute top-0 start-0 m-2">
                          Amazon's Choice
                        </span>
                      )}
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
                          </small>
                        )}
                      </div>
                      <div className="mb-2">
                        <small className="text-muted">
                          Category: {product.category} | Stock: {product.stock}
                        </small>
                      </div>
                      <div className="mb-2">
                        <div className="text-warning small">
                          {'★'.repeat(Math.floor(product.rating || 4))} ({product.reviews || 0} reviews)
                        </div>
                      </div>
                      <button 
                        className="btn btn-success w-100"
                        onClick={() => handleListProduct(product)}
                      >
                        <i className="fas fa-plus"></i> List for ₨500
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                    src={selectedProduct.images?.[0]} 
                    alt={selectedProduct.name}
                    style={{width: '100px', height: '100px', objectFit: 'contain'}}
                  />
                  <h6 className="mt-2">{selectedProduct.name}</h6>
                  <p className="text-muted">£{selectedProduct.price}</p>
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
    </div>
  )
}

export default SellerProducts