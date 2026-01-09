import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const AdminSellerProducts = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    fetchProducts()
  }, [filter])

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const params = new URLSearchParams({ status: filter })
      
      const response = await fetch(`http://localhost:5000/api/products/admin/seller-products?${params}`, {
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
          <h2>Seller Products Management</h2>
          <p className="text-muted">Review and approve seller product submissions</p>
        </div>
        <div className="col-md-4 text-end">
          <button className="btn btn-secondary" onClick={() => navigate('/admin/dashboard')}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>
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
              Pending ({products.filter(p => p.approvalStatus === 'pending').length})
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
                  <h6 
                    className="card-title"
                    onClick={() => handleProductClick(product)}
                    style={{
                      cursor: 'pointer',
                      color: '#667eea',
                      textDecoration: 'underline'
                    }}
                    title="Click to view product details"
                  >
                    {product.name}
                  </h6>
                  <p className="card-text text-muted small">
                    {product.description?.substring(0, 100)}...
                  </p>
                  
                  {/* Seller Info */}
                  <div className="mb-2">
                    <small className="text-muted">
                      <i className="fas fa-user"></i> {product.seller?.username} ({product.seller?.supplierId})
                    </small>
                  </div>

                  {/* Product Details */}
                  <div className="mb-2">
                    <strong className="text-primary">${product.price}</strong>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <small className="text-muted ms-2">
                        <del>${product.originalPrice}</del>
                      </small>
                    )}
                  </div>

                  <div className="mb-2">
                    <small className="text-muted">
                      Category: {product.category} | Stock: {product.stock}
                    </small>
                  </div>

                  {product.weight && (
                    <div className="mb-2">
                      <small className="text-muted">Weight: {product.weight}</small>
                    </div>
                  )}

                  <div className="mb-3">
                    <span className={`badge bg-${
                      product.approvalStatus === 'approved' ? 'success' : 
                      product.approvalStatus === 'pending' ? 'warning' : 'danger'
                    }`}>
                      {product.approvalStatus?.toUpperCase()}
                    </span>
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

                  {product.approvalStatus === 'rejected' && product.rejectionReason && (
                    <div className="mt-2">
                      <small className="text-danger">
                        <strong>Reason:</strong> {product.rejectionReason}
                      </small>
                    </div>
                  )}

                  {product.approvalStatus === 'approved' && (
                    <div className="mt-2">
                      <small className="text-success">
                        <i className="fas fa-check-circle"></i> Approved on {new Date(product.approvedAt).toLocaleDateString()}
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