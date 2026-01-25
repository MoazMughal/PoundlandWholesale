import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const AdminSellerProducts = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 })

  useEffect(() => {
    fetchProducts()
  }, [filter])

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const params = new URLSearchParams({ status: filter, limit: 1000 }) // Get more products for better stats
      
      const response = await fetch(`http://localhost:5000/api/products/admin/seller-products?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setProducts(data.products)
        
        // Calculate stats from all products
        if (filter === 'pending') {
          // Fetch all products to calculate stats
          const allResponse = await fetch(`http://localhost:5000/api/products/admin/seller-products?status=all&limit=1000`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          if (allResponse.ok) {
            const allData = await allResponse.json()
            const allProducts = allData.products
            setStats({
              pending: allProducts.filter(p => p.approvalStatus === 'pending').length,
              approved: allProducts.filter(p => p.approvalStatus === 'approved').length,
              rejected: allProducts.filter(p => p.approvalStatus === 'rejected').length,
              total: allProducts.length
            })
          }
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    if (!confirm('Are you sure you want to approve this product?')) return

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`http://localhost:5000/api/products/admin/approve/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('✅ Product approved successfully')
        fetchProducts()
      } else {
        const data = await response.json()
        alert('❌ ' + data.message)
      }
    } catch (error) {
      console.error('Approve error:', error)
      alert('❌ Failed to approve product')
    }
  }

  const handleReject = async (id) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`http://localhost:5000/api/products/admin/reject/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      })

      if (response.ok) {
        alert('✅ Product rejected')
        fetchProducts()
      } else {
        const data = await response.json()
        alert('❌ ' + data.message)
      }
    } catch (error) {
      console.error('Reject error:', error)
      alert('❌ Failed to reject product')
    }
  }

  const handleProductClick = (product) => {
    // Navigate to product detail page like in AmazonsChoice
    const params = new URLSearchParams({
      name: product.name,
      img: product.images && product.images.length > 0 ? product.images[0] : '',
      price: product.price,
      rating: product.rating || 4.5,
      reviews: product.reviews || 0,
      category: product.category || 'General',
      brand: product.brand || '',
      discount: product.discount || 0
    });
    navigate(`/product/${product._id}?${params.toString()}`);
  };

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
    <div className="container-fluid mt-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-md-8">
          <h2><i className="fas fa-store me-2"></i>Seller Products Management</h2>
          <p className="text-muted">Review and manage products listed by sellers</p>
        </div>
        <div className="col-md-4 text-end">
          <button className="btn btn-secondary" onClick={() => navigate('/admin/dashboard')}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-warning text-white">
            <div className="card-body text-center">
              <i className="fas fa-clock fa-2x mb-2"></i>
              <h4>{stats.pending}</h4>
              <small>Pending Review</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body text-center">
              <i className="fas fa-check-circle fa-2x mb-2"></i>
              <h4>{stats.approved}</h4>
              <small>Approved</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-danger text-white">
            <div className="card-body text-center">
              <i className="fas fa-times-circle fa-2x mb-2"></i>
              <h4>{stats.rejected}</h4>
              <small>Rejected</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body text-center">
              <i className="fas fa-boxes fa-2x mb-2"></i>
              <h4>{stats.total}</h4>
              <small>Total Products</small>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="row mb-3">
        <div className="col-12">
          <div className="btn-group" role="group">
            <button 
              className={`btn ${filter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
              onClick={() => setFilter('pending')}
            >
              <i className="fas fa-clock me-1"></i>
              Pending ({stats.pending})
            </button>
            <button 
              className={`btn ${filter === 'approved' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setFilter('approved')}
            >
              <i className="fas fa-check me-1"></i>
              Approved ({stats.approved})
            </button>
            <button 
              className={`btn ${filter === 'rejected' ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={() => setFilter('rejected')}
            >
              <i className="fas fa-times me-1"></i>
              Rejected ({stats.rejected})
            </button>
            <button 
              className={`btn ${filter === 'all' ? 'btn-info' : 'btn-outline-info'}`}
              onClick={() => setFilter('all')}
            >
              <i className="fas fa-list me-1"></i>
              All ({stats.total})
            </button>
          </div>
        </div>
      </div>

      {/* Products List */}
      {products.length === 0 ? (
        <div className="text-center py-5">
          <i className="fas fa-box-open fa-3x text-muted mb-3"></i>
          <h4>No products found</h4>
          <p className="text-muted">No seller products in {filter} status</p>
        </div>
      ) : (
        <div className="row">
          {products.map(product => (
            <div key={product._id} className="col-lg-4 col-md-6 mb-4">
              <div className="card h-100 shadow-sm">
                {/* Product Image */}
                <div className="card-img-top position-relative" style={{height: '200px', backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  {product.images && product.images[0] ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.name}
                      style={{maxHeight: '100%', maxWidth: '100%', objectFit: 'contain'}}
                    />
                  ) : (
                    <i className="fas fa-image fa-3x text-muted"></i>
                  )}
                  
                  {/* Status Badge */}
                  <span className={`position-absolute top-0 end-0 m-2 badge bg-${
                    product.approvalStatus === 'approved' ? 'success' : 
                    product.approvalStatus === 'pending' ? 'warning' : 'danger'
                  }`}>
                    {product.approvalStatus?.toUpperCase()}
                  </span>
                </div>

                <div className="card-body d-flex flex-column">
                  {/* Seller Information - Prominent Display */}
                  <div className="mb-3 p-2 bg-light rounded">
                    <div className="d-flex align-items-center mb-1">
                      <i className="fas fa-user-circle text-primary me-2"></i>
                      <strong className="text-primary">
                        {product.seller?.username || 'Unknown Seller'}
                      </strong>
                      {product.seller?.verificationStatus === 'approved' && (
                        <i className="fas fa-check-circle text-success ms-2" title="Verified Seller"></i>
                      )}
                    </div>
                    <div className="small text-muted">
                      <i className="fas fa-id-badge me-1"></i>
                      ID: {product.seller?.supplierId || product.seller?._id || 'N/A'}
                    </div>
                    {product.seller?.city && product.seller?.country && (
                      <div className="small text-muted">
                        <i className="fas fa-map-marker-alt me-1"></i>
                        {product.seller.city}, {product.seller.country}
                      </div>
                    )}
                    {product.seller?.whatsappNo && (
                      <div className="small text-muted">
                        <i className="fab fa-whatsapp me-1"></i>
                        {product.seller.whatsappNo}
                      </div>
                    )}
                  </div>

                  {/* Product Title */}
                  <h6 
                    className="card-title text-primary"
                    onClick={() => handleProductClick(product)}
                    style={{
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                    title="Click to view product details"
                  >
                    {product.name}
                  </h6>

                  {/* Product Description */}
                  <p className="card-text text-muted small flex-grow-1">
                    {product.description?.substring(0, 100)}...
                  </p>

                  {/* Product Details */}
                  <div className="mb-2">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <strong className="text-success h5 mb-0">
                        {product.currency === 'GBP' ? '£' : 
                         product.currency === 'USD' ? '$' : 
                         product.currency === 'AED' ? 'د.إ' : '₨'}{product.price}
                      </strong>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <small className="text-muted">
                          <del>
                            {product.currency === 'GBP' ? '£' : 
                             product.currency === 'USD' ? '$' : 
                             product.currency === 'AED' ? 'د.إ' : '₨'}{product.originalPrice}
                          </del>
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="mb-2 small text-muted">
                    <div className="row">
                      <div className="col-6">
                        <i className="fas fa-tag me-1"></i>
                        {product.category || 'General'}
                      </div>
                      <div className="col-6">
                        <i className="fas fa-boxes me-1"></i>
                        Stock: {product.stock || 0}
                      </div>
                    </div>
                  </div>

                  {product.weight && (
                    <div className="mb-2 small text-muted">
                      <i className="fas fa-weight me-1"></i>
                      Weight: {product.weight}
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="mb-3 small text-muted">
                    <div>
                      <i className="fas fa-calendar-plus me-1"></i>
                      Listed: {new Date(product.createdAt).toLocaleDateString()}
                    </div>
                    {product.approvedAt && (
                      <div>
                        <i className="fas fa-check-circle me-1"></i>
                        Approved: {new Date(product.approvedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {product.approvalStatus === 'pending' && (
                    <div className="d-flex gap-2 mt-auto">
                      <button 
                        className="btn btn-sm btn-success flex-fill"
                        onClick={() => handleApprove(product._id)}
                      >
                        <i className="fas fa-check"></i> Approve
                      </button>
                      <button 
                        className="btn btn-sm btn-danger flex-fill"
                        onClick={() => handleReject(product._id)}
                      >
                        <i className="fas fa-times"></i> Reject
                      </button>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {product.approvalStatus === 'rejected' && product.rejectionReason && (
                    <div className="mt-2 p-2 bg-danger bg-opacity-10 rounded">
                      <small className="text-danger">
                        <strong><i className="fas fa-exclamation-triangle me-1"></i>Rejection Reason:</strong><br/>
                        {product.rejectionReason}
                      </small>
                    </div>
                  )}

                  {/* Approved Info */}
                  {product.approvalStatus === 'approved' && (
                    <div className="mt-2 p-2 bg-success bg-opacity-10 rounded">
                      <small className="text-success">
                        <i className="fas fa-check-circle me-1"></i>
                        <strong>Approved & Listed</strong>
                        {product.isAmazonsChoice && (
                          <span className="ms-2">
                            <i className="fas fa-star text-warning me-1"></i>
                            Amazon's Choice
                          </span>
                        )}
                      </small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminSellerProducts