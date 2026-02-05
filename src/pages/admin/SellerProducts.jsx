import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiUrl } from '../../utils/api'

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
      
      if (filter === 'pending') {
        // For pending, fetch listing requests instead of products
        const response = await fetch(getApiUrl(`sellers/admin/listing-requests?status=pending_approval&limit=1000`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          // Transform listing requests to look like products for display
          const transformedRequests = await Promise.all(data.requests.map(async (request) => {
            // Fetch admin product to get images
            let adminProductImages = [];
            try {
              const adminProductResponse = await fetch(getApiUrl(`products/public/${request.productId}`), {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (adminProductResponse.ok) {
                const adminProductData = await adminProductResponse.json();
                adminProductImages = adminProductData.images || [];
              }
            } catch (err) {
              console.error('Error fetching admin product images:', err);
            }

            return {
              _id: `request_${request.sellerId}_${request._id}`,
              name: request.productName,
              price: request.sellerPrice,
              shipping: request.sellerShipping || 0,
              currency: 'GBP',
              approvalStatus: 'pending',
              images: adminProductImages, // Include admin product images
              seller: {
                _id: request.sellerId,
                username: request.sellerUsername,
                email: request.sellerEmail,
                verificationStatus: request.sellerVerificationStatus
              },
              createdAt: request.submittedAt,
              isListingRequest: true,
              originalRequestId: request._id,
              originalSellerId: request.sellerId,
              adminPrice: request.productPrice,
              adminShipping: request.productShipping || 0
            };
          }))
          
          setProducts(transformedRequests)
          
          // Get stats for all statuses
          const [approvedRes, rejectedRes] = await Promise.all([
            fetch(getApiUrl(`products/admin/all-seller-listings?status=approved&limit=1000`), {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(getApiUrl(`sellers/admin/listing-requests?status=rejected&limit=1000`), {
              headers: { 'Authorization': `Bearer ${token}` }
            })
          ])
          
          const approvedData = approvedRes.ok ? await approvedRes.json() : { products: [] }
          const rejectedData = rejectedRes.ok ? await rejectedRes.json() : { requests: [] }
          
          setStats({
            pending: transformedRequests.length,
            approved: approvedData.products?.length || 0,
            rejected: rejectedData.requests?.length || 0,
            total: transformedRequests.length + (approvedData.products?.length || 0) + (rejectedData.requests?.length || 0)
          })
        }
      } else if (filter === 'rejected') {
        // For rejected, fetch rejected listing requests
        const response = await fetch(getApiUrl(`sellers/admin/listing-requests?status=rejected&limit=1000`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          const transformedRequests = await Promise.all(data.requests.map(async (request) => {
            // Fetch admin product to get images
            let adminProductImages = [];
            try {
              const adminProductResponse = await fetch(getApiUrl(`products/public/${request.productId}`), {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (adminProductResponse.ok) {
                const adminProductData = await adminProductResponse.json();
                adminProductImages = adminProductData.images || [];
              }
            } catch (err) {
              console.error('Error fetching admin product images:', err);
            }

            return {
              _id: `request_${request.sellerId}_${request._id}`,
              name: request.productName,
              price: request.sellerPrice,
              shipping: request.sellerShipping || 0,
              currency: 'GBP',
              approvalStatus: 'rejected',
              rejectionReason: request.rejectionReason,
              images: adminProductImages, // Include admin product images
              seller: {
                _id: request.sellerId,
                username: request.sellerUsername,
                email: request.sellerEmail,
                verificationStatus: request.sellerVerificationStatus
              },
              createdAt: request.submittedAt,
              rejectedAt: request.rejectedAt,
              isListingRequest: true,
              originalRequestId: request._id,
              originalSellerId: request.sellerId
            };
          }))
          
          setProducts(transformedRequests)
        }
      } else {
        // For approved and all, fetch actual products
        const params = new URLSearchParams({ status: filter === 'all' ? 'approved' : filter, limit: 1000 })
        const response = await fetch(getApiUrl(`products/admin/all-seller-listings?${params}`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setProducts(data.products)
          
          // Calculate stats if not already done
          if (filter === 'approved' || filter === 'all') {
            const [pendingRes, rejectedRes] = await Promise.all([
              fetch(getApiUrl(`sellers/admin/listing-requests?status=pending_approval&limit=1000`), {
                headers: { 'Authorization': `Bearer ${token}` }
              }),
              fetch(getApiUrl(`sellers/admin/listing-requests?status=rejected&limit=1000`), {
                headers: { 'Authorization': `Bearer ${token}` }
              })
            ])
            
            const pendingData = pendingRes.ok ? await pendingRes.json() : { requests: [] }
            const rejectedData = rejectedRes.ok ? await rejectedRes.json() : { requests: [] }
            
            setStats({
              pending: pendingData.requests?.length || 0,
              approved: data.products?.length || 0,
              rejected: rejectedData.requests?.length || 0,
              total: (pendingData.requests?.length || 0) + (data.products?.length || 0) + (rejectedData.requests?.length || 0)
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

  const handleApprove = async (product) => {
    if (!confirm('Are you sure you want to approve this listing request?')) return

    try {
      const token = localStorage.getItem('adminToken')
      
      if (product.isListingRequest) {
        // This is a listing request, use the listing request approval endpoint
        const response = await fetch(getApiUrl(`sellers/admin/listing-requests/${product.originalSellerId}/${product.originalRequestId}/approve`), {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          alert('✅ Listing request approved successfully! Product has been added to seller\'s inventory.')
          fetchProducts()
        } else {
          const data = await response.json()
          alert('❌ ' + data.message)
        }
      } else {
        // This is a regular product
        const response = await fetch(getApiUrl(`products/admin/approve/${product._id}`), {
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
      }
    } catch (error) {
      console.error('Approve error:', error)
      alert('❌ Failed to approve')
    }
  }

  const handleReject = async (product) => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return

    try {
      const token = localStorage.getItem('adminToken')
      
      if (product.isListingRequest) {
        // This is a listing request, use the listing request rejection endpoint
        const response = await fetch(getApiUrl(`sellers/admin/listing-requests/${product.originalSellerId}/${product.originalRequestId}/reject`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reason })
        })

        if (response.ok) {
          alert('✅ Listing request rejected')
          fetchProducts()
        } else {
          const data = await response.json()
          alert('❌ ' + data.message)
        }
      } else {
        // This is a regular product
        const response = await fetch(getApiUrl(`products/admin/reject/${product._id}`), {
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
      }
    } catch (error) {
      console.error('Reject error:', error)
      alert('❌ Failed to reject')
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
    <div className="container-fluid mt-2" style={{backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '15px'}}>
      <style>
        {`
          .seller-products-page {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          
          .stats-card {
            border: none;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          
          .stats-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
          }
          
          .product-card {
            border: none;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            transition: all 0.3s ease;
            background: white;
            overflow: hidden;
          }
          
          .product-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
          }
          
          .product-image-container {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-bottom: 1px solid #e9ecef;
          }
          
          .seller-info-badge {
            background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
            border: 1px solid #e1f5fe;
            border-radius: 8px;
          }
          
          .price-badge {
            background: linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%);
            border: 1px solid #c8e6c9;
            border-radius: 6px;
            padding: 4px 8px;
          }
          
          .filter-buttons .btn {
            border-radius: 20px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: all 0.3s ease;
          }
          
          .filter-buttons .btn:hover {
            transform: translateY(-1px);
          }
          
          .page-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
          }
          
          .action-btn {
            border-radius: 8px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            transition: all 0.2s ease;
          }
          
          .action-btn:hover {
            transform: translateY(-1px);
          }
          
          .status-badge {
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-radius: 12px;
            padding: 4px 8px;
          }
        `}
      </style>
      
      {/* Header */}
      <div className="page-header seller-products-page">
        <div className="row align-items-center">
          <div className="col-md-8">
            <h3 className="mb-1"><i className="fas fa-store me-2"></i>Seller Products Management</h3>
            <p className="mb-0 opacity-90" style={{fontSize: '0.9rem'}}>Review and manage products listed by sellers</p>
          </div>
          <div className="col-md-4 text-end">
            <button className="btn btn-light btn-sm action-btn" onClick={() => navigate('/admin/dashboard')}>
              <i className="fas fa-arrow-left me-1"></i> Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row mb-3 g-3">
        <div className="col-md-3">
          <div className="card text-white stats-card" style={{background: 'linear-gradient(135deg, #ffc107 0%, #ffb300 100%)'}}>
            <div className="card-body text-center py-3">
              <i className="fas fa-clock fa-lg mb-2"></i>
              <h5 className="mb-1 fw-bold">{stats.pending}</h5>
              <small style={{fontSize: '0.8rem', fontWeight: '600'}}>Pending Review</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-white stats-card" style={{background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'}}>
            <div className="card-body text-center py-3">
              <i className="fas fa-check-circle fa-lg mb-2"></i>
              <h5 className="mb-1 fw-bold">{stats.approved}</h5>
              <small style={{fontSize: '0.8rem', fontWeight: '600'}}>Approved</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-white stats-card" style={{background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)'}}>
            <div className="card-body text-center py-3">
              <i className="fas fa-times-circle fa-lg mb-2"></i>
              <h5 className="mb-1 fw-bold">{stats.rejected}</h5>
              <small style={{fontSize: '0.8rem', fontWeight: '600'}}>Rejected</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-white stats-card" style={{background: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)'}}>
            <div className="card-body text-center py-3">
              <i className="fas fa-boxes fa-lg mb-2"></i>
              <h5 className="mb-1 fw-bold">{stats.total}</h5>
              <small style={{fontSize: '0.8rem', fontWeight: '600'}}>Total Products</small>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="row mb-3">
        <div className="col-12 text-center">
          <div className="btn-group filter-buttons" role="group">
            <button 
              className={`btn ${filter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
              onClick={() => setFilter('pending')}
              style={{fontSize: '0.8rem', padding: '8px 16px'}}
            >
              <i className="fas fa-clock me-1"></i>
              Pending ({stats.pending})
            </button>
            <button 
              className={`btn ${filter === 'approved' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => setFilter('approved')}
              style={{fontSize: '0.8rem', padding: '8px 16px'}}
            >
              <i className="fas fa-check me-1"></i>
              Approved ({stats.approved})
            </button>
            <button 
              className={`btn ${filter === 'rejected' ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={() => setFilter('rejected')}
              style={{fontSize: '0.8rem', padding: '8px 16px'}}
            >
              <i className="fas fa-times me-1"></i>
              Rejected ({stats.rejected})
            </button>
            <button 
              className={`btn ${filter === 'all' ? 'btn-info' : 'btn-outline-info'}`}
              onClick={() => setFilter('all')}
              style={{fontSize: '0.8rem', padding: '8px 16px'}}
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
          <div className="card" style={{border: 'none', background: 'transparent'}}>
            <div className="card-body">
              <i className="fas fa-box-open fa-4x text-muted mb-3"></i>
              <h4 className="text-muted">No products found</h4>
              <p className="text-muted mb-0">No seller products in {filter} status</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {products.map(product => (
            <div key={product._id} className="col-xxl-2 col-xl-3 col-lg-4 col-md-6 col-sm-6">
              <div className="product-card" style={{fontSize: '0.8rem', height: '340px'}}>
                {/* Product Image */}
                <div className="product-image-container position-relative" style={{height: '130px', overflow: 'hidden'}}>
                  {product.images && product.images[0] ? (
                    <>
                      <img 
                        src={product.images[0]} 
                        alt={product.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          padding: '8px'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        color: '#6c757d',
                        position: 'absolute',
                        top: 0,
                        left: 0
                      }}>
                        <i className="fas fa-image fa-2x mb-2"></i>
                        <small>No Image</small>
                      </div>
                    </>
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      color: '#6c757d'
                    }}>
                      <i className="fas fa-clock fa-2x mb-2"></i>
                      <small>Listing Request</small>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <span className={`position-absolute top-0 end-0 m-2 badge status-badge bg-${
                    product.approvalStatus === 'approved' ? 'success' : 
                    product.approvalStatus === 'pending' ? 'warning' : 'danger'
                  }`} style={{fontSize: '0.7rem'}}>
                    {product.approvalStatus === 'pending' ? 'PENDING' :
                     product.approvalStatus === 'approved' ? 'APPROVED' : 'REJECTED'}
                  </span>
                </div>

                <div className="card-body p-3 d-flex flex-column" style={{height: '210px'}}>
                  {/* Seller Information */}
                  <div className="seller-info-badge mb-2 p-2" style={{fontSize: '0.75rem'}}>
                    <div className="d-flex align-items-center">
                      <i className="fas fa-user text-primary me-2"></i>
                      <span className="text-primary text-truncate fw-bold">
                        {product.seller?.username || 'Unknown'}
                      </span>
                      {product.seller?.verificationStatus === 'approved' && (
                        <i className="fas fa-check-circle text-success ms-2" title="Verified"></i>
                      )}
                    </div>
                  </div>

                  {/* Product Title */}
                  <h6 
                    className="text-dark mb-2"
                    onClick={() => handleProductClick(product)}
                    style={{
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      lineHeight: '1.2',
                      height: '2.4rem',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      fontWeight: '600'
                    }}
                    title={product.name}
                  >
                    {product.name}
                  </h6>

                  {/* Price */}
                  <div className="price-badge mb-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <span className="text-success fw-bold" style={{fontSize: '0.9rem'}}>
                          £{parseFloat(product.price).toFixed(2)}
                        </span>
                        {product.shipping > 0 && (
                          <div style={{fontSize: '0.7rem', color: '#6c757d'}}>
                            +£{product.shipping} ship
                          </div>
                        )}
                      </div>
                      {product.adminPrice && (
                        <div style={{fontSize: '0.7rem', color: '#6c757d'}}>
                          Admin: £{product.adminPrice}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price Comparison */}
                  {product.isListingRequest && product.adminPrice && (
                    <div className="mb-2 p-2 bg-light rounded" style={{fontSize: '0.7rem'}}>
                      <div className="d-flex justify-content-between">
                        <span>Admin: £{(parseFloat(product.adminPrice) + parseFloat(product.adminShipping || 0)).toFixed(2)}</span>
                        <span className="text-success fw-bold">Seller: £{(parseFloat(product.price) + parseFloat(product.shipping || 0)).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Category and Date */}
                  <div className="mb-2" style={{fontSize: '0.7rem', color: '#6c757d'}}>
                    <div className="d-flex justify-content-between">
                      <span><i className="fas fa-tag me-1"></i>{(product.category || 'General').substring(0, 12)}</span>
                      <span><i className="fas fa-calendar me-1"></i>{new Date(product.createdAt).toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit'})}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto">
                    {product.approvalStatus === 'pending' && (
                      <div className="d-flex gap-2">
                        <button 
                          className="btn btn-success flex-fill action-btn"
                          onClick={() => handleApprove(product)}
                          style={{fontSize: '0.75rem', padding: '6px 12px'}}
                        >
                          <i className="fas fa-check me-1"></i> Approve
                        </button>
                        <button 
                          className="btn btn-danger flex-fill action-btn"
                          onClick={() => handleReject(product)}
                          style={{fontSize: '0.75rem', padding: '6px 12px'}}
                        >
                          <i className="fas fa-times me-1"></i> Reject
                        </button>
                      </div>
                    )}

                    {/* Status Messages */}
                    {product.approvalStatus === 'rejected' && product.rejectionReason && (
                      <div className="p-2 bg-danger bg-opacity-10 rounded">
                        <div className="text-danger" style={{fontSize: '0.7rem'}}>
                          <strong><i className="fas fa-exclamation-triangle me-1"></i>Rejected:</strong><br/>
                          {product.rejectionReason.substring(0, 40)}...
                        </div>
                      </div>
                    )}

                    {product.approvalStatus === 'approved' && (
                      <div className="p-2 bg-success bg-opacity-10 rounded">
                        <div className="text-success" style={{fontSize: '0.7rem'}}>
                          <i className="fas fa-check-circle me-1"></i><strong>Approved & Listed</strong>
                        </div>
                      </div>
                    )}
                  </div>
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