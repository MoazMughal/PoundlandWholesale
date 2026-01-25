import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeller } from '../../context/SellerContext'
import { getImageUrl } from '../../utils/imageImports'

const MyListedProducts = () => {
  const navigate = useNavigate()
  const { seller, isLoggedIn } = useSeller()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

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

    fetchMyListedProducts()
  }, [isLoggedIn, seller, currentPage, selectedStatus])

  const fetchMyListedProducts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('sellerToken')
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: 50,
        ...(selectedStatus !== 'all' && { status: selectedStatus })
      })

      const response = await fetch(`http://localhost:5000/api/sellers/my-listed-products?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
        setTotalPages(data.totalPages || 1)
        setTotalProducts(data.total || 0)
        setCounts(data.counts || { total: 0, pending: 0, approved: 0, rejected: 0 })
      } else {
        console.error('Failed to fetch listed products')
      }
    } catch (error) {
      console.error('Error fetching listed products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnlistProduct = async (product) => {
    if (!confirm(`Are you sure you want to unlist "${product.name}"? This will remove your seller information from this product.`)) {
      return
    }

    try {
      const token = localStorage.getItem('sellerToken')
      
      const response = await fetch(`http://localhost:5000/api/sellers/unlist-product/${product._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ Product unlisted successfully!')
        fetchMyListedProducts() // Refresh the list
      } else {
        alert('❌ ' + data.message)
      }
    } catch (error) {
      console.error('Unlist product error:', error)
      alert('❌ Failed to unlist product')
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      approved: { color: '#28a745', text: 'Approved' },
      pending: { color: '#ffc107', text: 'Pending' },
      rejected: { color: '#dc3545', text: 'Rejected' }
    }
    
    const config = statusConfig[status] || statusConfig.approved
    
    return (
      <span 
        style={{
          background: config.color,
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 'bold'
        }}
      >
        {config.text}
      </span>
    )
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
          <h5 style={{ color: '#6c757d', marginBottom: '10px' }}>Loading Your Listed Products...</h5>
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
          
          .listed-products-container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          
          .header-section {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: ${windowWidth < 768 ? '15px 20px' : '20px 30px'};
            text-align: center;
          }
          
          .filters-section {
            padding: ${windowWidth < 768 ? '15px' : '25px'};
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
          }
          
          .status-filter {
            display: flex;
            gap: 10px;
            align-items: center;
          }
          
          .status-btn {
            padding: 8px 15px;
            border: 2px solid #dee2e6;
            background: white;
            color: #6c757d;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 12px;
            font-weight: 600;
          }
          
          .status-btn.active {
            background: #007bff;
            color: white;
            border-color: #007bff;
          }
          
          .status-btn:hover {
            border-color: #007bff;
            color: #007bff;
          }
          
          .status-btn.active:hover {
            color: white;
          }
          
          .products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
            padding: 25px;
            min-height: 400px;
          }
          
          .product-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            transition: all 0.3s ease;
            position: relative;
            display: flex;
            flex-direction: column;
          }
          
          .product-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
          }
          
          .product-image {
            width: 100%;
            height: 150px;
            object-fit: contain;
            background: #f8f9fa;
            padding: 10px;
          }
          
          .product-info {
            padding: 15px;
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          
          .product-title {
            font-size: 14px;
            font-weight: 600;
            color: #2c3e50;
            line-height: 1.4;
            margin-bottom: 8px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          
          .product-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            font-size: 12px;
          }
          
          .product-price {
            font-size: 16px;
            font-weight: bold;
            color: #28a745;
            margin-bottom: 8px;
          }
          
          .listing-info {
            background: #f8f9fa;
            padding: 8px;
            border-radius: 6px;
            margin-bottom: 10px;
            font-size: 11px;
            color: #6c757d;
          }
          
          .action-buttons {
            display: flex;
            gap: 8px;
            margin-top: auto;
          }
          
          .view-btn {
            flex: 1;
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            color: white;
            border: none;
            padding: 10px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            text-align: center;
          }
          
          .view-btn:hover {
            background: linear-gradient(135deg, #0056b3 0%, #007bff 100%);
            color: white;
            text-decoration: none;
          }
          
          .unlist-btn {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          
          .unlist-btn:hover {
            background: linear-gradient(135deg, #c82333 0%, #dc3545 100%);
            transform: translateY(-1px);
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
        `}
      </style>

      <div className="listed-products-container">
        {/* Header */}
        <div className="header-section">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '15px'
          }}>
            <div style={{ textAlign: windowWidth < 768 ? 'center' : 'left', flex: 1 }}>
              <h2 style={{ 
                margin: '0 0 5px 0', 
                fontSize: windowWidth < 768 ? '18px' : '22px',
                fontWeight: '700'
              }}>
                <i className="fas fa-list-alt" style={{ marginRight: '8px' }}></i>
                My Listed Products
              </h2>
              <p style={{ 
                margin: 0, 
                opacity: 0.95, 
                fontSize: windowWidth < 768 ? '12px' : '14px'
              }}>
                Products you've listed from Amazon's Choice
              </p>
            </div>
            <button 
              onClick={() => navigate('/seller/dashboard')}
              style={{ 
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: windowWidth < 768 ? '12px' : '14px'
              }}
            >
              <i className="fas fa-arrow-left" style={{ marginRight: '8px' }}></i>
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="status-filter">
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#495057' }}>Filter by Status:</span>
            <button 
              className={`status-btn ${selectedStatus === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedStatus('all')}
            >
              All ({counts.total})
            </button>
            <button 
              className={`status-btn ${selectedStatus === 'approved' ? 'active' : ''}`}
              onClick={() => setSelectedStatus('approved')}
            >
              Approved ({counts.approved})
            </button>
            <button 
              className={`status-btn ${selectedStatus === 'pending' ? 'active' : ''}`}
              onClick={() => setSelectedStatus('pending')}
            >
              Pending ({counts.pending})
            </button>
            <button 
              className={`status-btn ${selectedStatus === 'rejected' ? 'active' : ''}`}
              onClick={() => setSelectedStatus('rejected')}
            >
              Rejected ({counts.rejected})
            </button>
          </div>
          
          <button 
            onClick={(e) => {
              e.preventDefault()
              if (e.ctrlKey || e.metaKey || e.button === 1) {
                // Open in new tab while preserving auth
                window.open('/seller/admin-products', '_blank')
              } else {
                // Navigate in current tab
                navigate('/seller/admin-products')
              }
            }}
            onMouseDown={(e) => {
              // Handle middle mouse button click
              if (e.button === 1) {
                e.preventDefault()
                window.open('/seller/admin-products', '_blank')
              }
            }}
            style={{
              padding: '10px 20px',
              background: '#28a745',
              color: 'white',
              borderRadius: '6px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
            List More Products
          </button>
        </div>

        {totalProducts > 0 && (
          <div className="stats-info">
            Showing {products.length} of {totalProducts} listed products
          </div>
        )}

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="no-products">
            <i className="fas fa-box-open"></i>
            <h5>No listed products found</h5>
            <p>You haven't listed any products yet.</p>
            <button 
              onClick={(e) => {
                e.preventDefault()
                if (e.ctrlKey || e.metaKey || e.button === 1) {
                  // Open in new tab while preserving auth
                  window.open('/seller/admin-products', '_blank')
                } else {
                  // Navigate in current tab
                  navigate('/seller/admin-products')
                }
              }}
              onMouseDown={(e) => {
                // Handle middle mouse button click
                if (e.button === 1) {
                  e.preventDefault()
                  window.open('/seller/admin-products', '_blank')
                }
              }}
              style={{
                display: 'inline-block',
                marginTop: '20px',
                padding: '12px 24px',
                background: '#28a745',
                color: 'white',
                borderRadius: '6px',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
              Start Listing Products
            </button>
          </div>
        ) : (
          <div className="products-grid">
            {products.map(product => (
              <div key={product._id} className="product-card">
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
                
                <div className="product-info">
                  <div className="product-title">{product.name}</div>
                  
                  <div className="product-meta">
                    <span style={{ color: '#6c757d' }}>{product.category}</span>
                    {getStatusBadge(product.approvalStatus)}
                  </div>
                  
                  <div className="product-price">
                    £{parseFloat(product.price).toFixed(2)}
                  </div>
                  
                  <div className="listing-info">
                    <div><strong>Listed:</strong> {new Date(product.sellerListedAt).toLocaleDateString()}</div>
                    {product.sellerTransactionId && (
                      <div><strong>Transaction:</strong> {product.sellerTransactionId}</div>
                    )}
                    {product.sellerInfo && (
                      <div style={{ marginTop: '8px', padding: '6px', background: '#e8f5e9', borderRadius: '4px' }}>
                        <div style={{ fontSize: '10px', fontWeight: '600', color: '#28a745', marginBottom: '4px' }}>
                          <i className="fas fa-user-check" style={{ marginRight: '4px' }}></i>
                          Your Seller Info
                        </div>
                        <div><strong>Name:</strong> {product.sellerInfo.username}</div>
                        {product.sellerInfo.whatsappNo && (
                          <div><strong>WhatsApp:</strong> {product.sellerInfo.whatsappNo}</div>
                        )}
                        {product.sellerInfo.city && (
                          <div><strong>Location:</strong> {product.sellerInfo.city}, {product.sellerInfo.country}</div>
                        )}
                        <div><strong>Status:</strong> 
                          <span style={{ 
                            color: product.sellerInfo.verificationStatus === 'approved' ? '#28a745' : '#ffc107',
                            fontWeight: '600',
                            marginLeft: '4px'
                          }}>
                            {product.sellerInfo.verificationStatus === 'approved' ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="action-buttons">
                    <button 
                      className="view-btn"
                      onClick={(e) => {
                        e.preventDefault()
                        if (e.ctrlKey || e.metaKey || e.button === 1) {
                          // Open in new tab while preserving auth
                          window.open(`/product/${product._id}`, '_blank')
                        } else {
                          // Navigate in current tab
                          navigate(`/product/${product._id}`)
                        }
                      }}
                      onMouseDown={(e) => {
                        // Handle middle mouse button click
                        if (e.button === 1) {
                          e.preventDefault()
                          window.open(`/product/${product._id}`, '_blank')
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <i className="fas fa-eye" style={{ marginRight: '6px' }}></i>
                      View Product
                    </button>
                    
                    <button 
                      className="unlist-btn"
                      onClick={() => handleUnlistProduct(product)}
                      title="Remove your listing from this product"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MyListedProducts