import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiUrl } from '../../utils/api'

const AdminSellerProducts = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 })
  const [imageLoadingStates, setImageLoadingStates] = useState({})

  useEffect(() => {
    // Load stats first, then products
    loadStatsAndProducts()
  }, [filter])

  const loadStatsAndProducts = async () => {
    setLoading(true)
    
    // Load stats first for immediate feedback
    await loadStats()
    
    // Then load products
    await fetchProducts()
  }

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      
      // Load all stats in parallel for better performance
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        fetch(getApiUrl(`sellers/admin/listing-requests?status=pending_approval&limit=1000`), {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(getApiUrl(`products/admin/all-seller-listings?status=approved&limit=1000`), {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(getApiUrl(`sellers/admin/listing-requests?status=rejected&limit=1000`), {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])
      
      const [pendingData, approvedData, rejectedData] = await Promise.all([
        pendingRes.ok ? pendingRes.json() : { requests: [] },
        approvedRes.ok ? approvedRes.json() : { products: [] },
        rejectedRes.ok ? rejectedRes.json() : { requests: [] }
      ])
      
      const newStats = {
        pending: pendingData.requests?.length || 0,
        approved: approvedData.products?.length || 0,
        rejected: rejectedData.requests?.length || 0,
        total: (pendingData.requests?.length || 0) + (approvedData.products?.length || 0) + (rejectedData.requests?.length || 0)
      }
      
      setStats(newStats)
      setStatsLoading(false)
    } catch (error) {
      console.error('Error loading stats:', error)
      setStatsLoading(false)
    }
  }

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
            // Fetch admin product to get images - but don't block on this
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
            // Fetch admin product to get images - but don't block on this
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
          console.log('🔍 Approved products data:', data.products.slice(0, 3).map(p => ({
            name: p.name,
            listingType: p.listingType,
            seller: p.seller,
            sellerUsername: p.sellerUsername,
            sellerEmail: p.sellerEmail
          })))
          setProducts(data.products)
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (product) => {
    if (!confirm('⚠️ Are you sure you want to permanently delete this product from the database? This action cannot be undone.')) return

    try {
      const token = localStorage.getItem('adminToken')
      
      if (product.isListingRequest) {
        // This is a listing request, delete the request
        const response = await fetch(getApiUrl(`sellers/admin/listing-requests/${product.originalSellerId}/${product.originalRequestId}`), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          alert('✅ Listing request deleted successfully')
          // Remove from UI immediately
          setProducts(prev => prev.filter(p => p._id !== product._id))
          // Update stats
          if (product.approvalStatus === 'pending') {
            setStats(prev => ({ ...prev, pending: prev.pending - 1, total: prev.total - 1 }))
          } else if (product.approvalStatus === 'rejected') {
            setStats(prev => ({ ...prev, rejected: prev.rejected - 1, total: prev.total - 1 }))
          }
        } else {
          const data = await response.json()
          alert('❌ ' + data.message)
        }
      } else {
        // This is a regular product, delete the product
        const response = await fetch(getApiUrl(`products/admin/${product._id}`), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          alert('✅ Product deleted successfully')
          // Remove from UI immediately
          setProducts(prev => prev.filter(p => p._id !== product._id))
          // Update stats
          setStats(prev => ({ ...prev, approved: prev.approved - 1, total: prev.total - 1 }))
        } else {
          const data = await response.json()
          alert('❌ ' + data.message)
        }
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('❌ Failed to delete')
    }
  }

  const handleImageLoad = (productId) => {
    setImageLoadingStates(prev => ({
      ...prev,
      [productId]: false
    }))
  }

  const handleImageError = (productId) => {
    setImageLoadingStates(prev => ({
      ...prev,
      [productId]: 'error'
    }))
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
          // Smooth refresh - just update the specific product instead of full reload
          setProducts(prev => prev.filter(p => p._id !== product._id))
          // Update stats
          setStats(prev => ({
            ...prev,
            pending: prev.pending - 1,
            approved: prev.approved + 1
          }))
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
          // Smooth refresh - just update the specific product instead of full reload
          setProducts(prev => prev.filter(p => p._id !== product._id))
          // Update stats
          setStats(prev => ({
            ...prev,
            pending: prev.pending - 1,
            approved: prev.approved + 1
          }))
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
          // Smooth refresh - just update the specific product instead of full reload
          setProducts(prev => prev.filter(p => p._id !== product._id))
          // Update stats
          setStats(prev => ({
            ...prev,
            pending: prev.pending - 1,
            rejected: prev.rejected + 1
          }))
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
          // Smooth refresh - just update the specific product instead of full reload
          setProducts(prev => prev.filter(p => p._id !== product._id))
          // Update stats
          setStats(prev => ({
            ...prev,
            pending: prev.pending - 1,
            rejected: prev.rejected + 1
          }))
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
      <div className="container-fluid" style={{backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '4px'}}>
        {/* Minimal Header Skeleton */}
        <div className="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded shadow-sm">
          <h6 className="mb-0 text-primary"><i className="fas fa-store me-2"></i>Seller Products</h6>
          <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/admin/dashboard')}>
            <i className="fas fa-arrow-left me-1"></i> Dashboard
          </button>
        </div>

        {/* Ultra Minimal Stats Cards Skeleton */}
        <div className="row mb-1 g-1">
          {[1,2,3,4].map(i => (
            <div key={i} className="col-3">
              <div className="card stats-card" style={{background: '#e9ecef', minHeight: '35px !important', height: '35px', maxHeight: '35px'}}>
                <div className="card-body text-center" style={{padding: '3px !important', height: '29px', minHeight: '29px', maxHeight: '29px'}}>
                  <div className="placeholder-glow d-flex flex-column align-items-center justify-content-center h-100">
                    <div className="placeholder bg-secondary rounded mb-1" style={{width: '8px', height: '6px', margin: '0 auto', display: 'block', visibility: 'visible', opacity: '1'}}></div>
                    <div className="placeholder bg-secondary rounded mb-1" style={{width: '14px', height: '9px', margin: '0 auto', display: 'block', visibility: 'visible', opacity: '1'}}></div>
                    <div className="placeholder bg-secondary rounded" style={{width: '28px', height: '6px', margin: '0 auto', display: 'block', visibility: 'visible', opacity: '1'}}></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Buttons Skeleton */}
        <div className="row mb-2">
          <div className="col-12 text-center">
            <div className="placeholder-glow">
              <div className="placeholder bg-secondary rounded" style={{width: '300px', height: '28px', margin: '0 auto'}}></div>
            </div>
          </div>
        </div>

        {/* Compact Products Grid Skeleton */}
        <div className="row g-1">
          {Array.from({length: 24}).map((_, i) => (
            <div key={i} className="col-xxl-2 col-xl-2 col-lg-3 col-md-4 col-sm-6">
              <div className="product-card" style={{height: '220px'}}>
                <div className="placeholder-glow">
                  {/* Image Skeleton */}
                  <div className="placeholder bg-secondary" style={{height: '70px', width: '100%'}}></div>
                  
                  <div className="card-body p-2">
                    {/* Seller info skeleton */}
                    <div className="placeholder bg-secondary rounded mb-1" style={{height: '18px', width: '100%'}}></div>
                    
                    {/* Title skeleton */}
                    <div className="placeholder bg-secondary rounded mb-1" style={{height: '14px', width: '100%'}}></div>
                    <div className="placeholder bg-secondary rounded mb-1" style={{height: '14px', width: '70%'}}></div>
                    
                    {/* Price skeleton */}
                    <div className="placeholder bg-secondary rounded mb-1" style={{height: '18px', width: '60%'}}></div>
                    
                    {/* Category skeleton */}
                    <div className="placeholder bg-secondary rounded mb-1" style={{height: '10px', width: '80%'}}></div>
                    
                    {/* Buttons skeleton */}
                    <div className="d-flex gap-1 mt-auto">
                      <div className="placeholder bg-secondary rounded flex-fill" style={{height: '20px'}}></div>
                      <div className="placeholder bg-secondary rounded flex-fill" style={{height: '20px'}}></div>
                    </div>
                    <div className="placeholder bg-secondary rounded w-100 mt-1" style={{height: '20px'}}></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container-fluid" style={{backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '4px'}}>
      <style>
        {`
          /* CRITICAL: Ultra-strong CSS overrides with !important */
          .seller-products-page * {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
          }
          
          /* Stats Cards - Ultra Minimal with VISIBLE numbers */
          .stats-card {
            border: none !important;
            border-radius: 6px !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
            transition: transform 0.2s ease, box-shadow 0.2s ease !important;
            min-height: 35px !important;
            height: 35px !important;
            max-height: 35px !important;
          }
          
          .stats-card .card-body {
            padding: 3px !important;
            min-height: 29px !important;
            height: 29px !important;
            max-height: 29px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
          }
          
          .stats-card .fw-bold {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            color: inherit !important;
            font-size: 0.75rem !important;
            line-height: 1 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-weight: 700 !important;
          }
          
          .stats-card small {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            color: inherit !important;
            font-size: 0.55rem !important;
            line-height: 1 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-weight: 600 !important;
          }
          
          .stats-card i {
            font-size: 0.6rem !important;
            margin-bottom: 1px !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          .stats-card:hover {
            transform: translateY(-1px) !important;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important;
          }
          
          /* Product Cards - Ultra Compact */
          .product-card {
            border: none !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
            transition: all 0.3s ease !important;
            background: white !important;
            overflow: hidden !important;
            min-height: 220px !important;
            max-height: 220px !important;
            height: 220px !important;
            position: relative !important;
          }
          
          .product-card:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
          }
          
          .product-image-container {
            background: #f8f9fa !important;
            border-bottom: 1px solid #e9ecef !important;
            min-height: 70px !important;
            max-height: 70px !important;
            height: 70px !important;
            position: relative !important;
            overflow: hidden !important;
          }
          
          .seller-info-badge {
            background: #007bff !important;
            color: white !important;
            border: none !important;
            border-radius: 4px !important;
            min-height: 18px !important;
            max-height: 18px !important;
            height: 18px !important;
            font-weight: 600 !important;
            font-size: 0.65rem !important;
          }
          
          .price-badge {
            background: #28a745 !important;
            color: white !important;
            border: none !important;
            border-radius: 4px !important;
            min-height: 20px !important;
            max-height: 20px !important;
            height: 20px !important;
            font-weight: 600 !important;
          }
          
          .filter-buttons .btn {
            border-radius: 12px !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.3px !important;
            transition: all 0.2s ease !important;
            min-width: 80px !important;
            font-size: 0.7rem !important;
            padding: 4px 8px !important;
          }
          
          .filter-buttons .btn:hover {
            transform: translateY(-1px) !important;
          }
          
          .action-btn {
            border-radius: 4px !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.1px !important;
            transition: all 0.2s ease !important;
            min-height: 22px !important;
            font-size: 0.65rem !important;
            padding: 3px 6px !important;
          }
          
          .action-btn:hover {
            transform: translateY(-1px) !important;
          }
          
          .status-badge {
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.2px !important;
            border-radius: 4px !important;
            padding: 2px 4px !important;
            font-size: 0.6rem !important;
            z-index: 2 !important;
          }
          
          .btn-success {
            background: #28a745 !important;
            border: none !important;
            color: white !important;
          }
          
          .btn-danger {
            background: #dc3545 !important;
            border: none !important;
            color: white !important;
          }
          
          .btn-outline-danger {
            background: white !important;
            border: 1px solid #dc3545 !important;
            color: #dc3545 !important;
          }
          
          .btn-outline-danger:hover {
            background: #dc3545 !important;
            color: white !important;
          }
          
          .card-body {
            min-height: 150px !important;
            max-height: 150px !important;
            height: 150px !important;
            padding: 8px !important;
          }
          
          .spinner-border-sm {
            width: 0.8rem !important;
            height: 0.8rem !important;
          }
          
          /* Product Title Sizing */
          .product-card h6 {
            font-size: 0.7rem !important;
            line-height: 1.1 !important;
            height: 2.4rem !important;
            max-height: 2.4rem !important;
            overflow: hidden !important;
            font-weight: 600 !important;
          }
          
          /* Container Overrides */
          .container-fluid {
            padding: 4px !important;
            background-color: #f8f9fa !important;
            min-height: 100vh !important;
          }
          
          /* Badge Overrides */
          .badge {
            background: #6c757d !important;
            color: white !important;
          }
          
          /* Responsive Overrides */
          @media (max-width: 1200px) {
            .product-card h6 {
              font-size: 0.65rem !important;
              height: 2.2rem !important;
              max-height: 2.2rem !important;
            }
          }
          
          @media (max-width: 768px) {
            .product-card h6 {
              font-size: 0.6rem !important;
              height: 2rem !important;
              max-height: 2rem !important;
            }
            .product-card {
              height: 200px !important;
              max-height: 200px !important;
              min-height: 200px !important;
            }
            .card-body {
              min-height: 130px !important;
              max-height: 130px !important;
              height: 130px !important;
            }
          }
          
          /* Skeleton Loading Fixes */
          .placeholder-glow .placeholder {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          /* Force visibility for all stats elements */
          .stats-card * {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
        `}
      </style>
      
      {/* Minimal Header */}
      <div className="d-flex justify-content-between align-items-center mb-2 p-2 bg-white rounded shadow-sm">
        <h6 className="mb-0 text-primary"><i className="fas fa-store me-2"></i>Seller Products</h6>
        <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/admin/dashboard')}>
          <i className="fas fa-arrow-left me-1"></i> Dashboard
        </button>
      </div>

      {/* Ultra Minimal Stats Cards */}
      <div className="row mb-1 g-1">
        <div className="col-3">
          <div className="card text-white stats-card" style={{background: '#ffc107', minHeight: '35px !important', height: '35px', maxHeight: '35px'}}>
            <div className="card-body text-center" style={{padding: '3px !important', height: '29px', minHeight: '29px', maxHeight: '29px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
              <i className="fas fa-clock" style={{fontSize: '0.6rem', marginBottom: '1px', display: 'block', visibility: 'visible', opacity: '1'}}></i>
              {statsLoading ? (
                <div className="placeholder-glow">
                  <div className="placeholder bg-light rounded" style={{width: '14px', height: '9px', margin: '0 auto', display: 'block', visibility: 'visible', opacity: '1'}}></div>
                </div>
              ) : (
                <div className="fw-bold" style={{fontSize: '0.75rem', lineHeight: '1', display: 'block', visibility: 'visible', opacity: '1', color: 'white', fontWeight: '700'}}>{stats.pending}</div>
              )}
              <small style={{fontSize: '0.55rem', fontWeight: '600', lineHeight: '1', display: 'block', visibility: 'visible', opacity: '1', color: 'white'}}>Pending</small>
            </div>
          </div>
        </div>
        <div className="col-3">
          <div className="card text-white stats-card" style={{background: '#28a745', minHeight: '35px !important', height: '35px', maxHeight: '35px'}}>
            <div className="card-body text-center" style={{padding: '3px !important', height: '29px', minHeight: '29px', maxHeight: '29px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
              <i className="fas fa-check-circle" style={{fontSize: '0.6rem', marginBottom: '1px', display: 'block', visibility: 'visible', opacity: '1'}}></i>
              {statsLoading ? (
                <div className="placeholder-glow">
                  <div className="placeholder bg-light rounded" style={{width: '14px', height: '9px', margin: '0 auto', display: 'block', visibility: 'visible', opacity: '1'}}></div>
                </div>
              ) : (
                <div className="fw-bold" style={{fontSize: '0.75rem', lineHeight: '1', display: 'block', visibility: 'visible', opacity: '1', color: 'white', fontWeight: '700'}}>{stats.approved}</div>
              )}
              <small style={{fontSize: '0.55rem', fontWeight: '600', lineHeight: '1', display: 'block', visibility: 'visible', opacity: '1', color: 'white'}}>Approved</small>
            </div>
          </div>
        </div>
        <div className="col-3">
          <div className="card text-white stats-card" style={{background: '#dc3545', minHeight: '35px !important', height: '35px', maxHeight: '35px'}}>
            <div className="card-body text-center" style={{padding: '3px !important', height: '29px', minHeight: '29px', maxHeight: '29px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
              <i className="fas fa-times-circle" style={{fontSize: '0.6rem', marginBottom: '1px', display: 'block', visibility: 'visible', opacity: '1'}}></i>
              {statsLoading ? (
                <div className="placeholder-glow">
                  <div className="placeholder bg-light rounded" style={{width: '14px', height: '9px', margin: '0 auto', display: 'block', visibility: 'visible', opacity: '1'}}></div>
                </div>
              ) : (
                <div className="fw-bold" style={{fontSize: '0.75rem', lineHeight: '1', display: 'block', visibility: 'visible', opacity: '1', color: 'white', fontWeight: '700'}}>{stats.rejected}</div>
              )}
              <small style={{fontSize: '0.55rem', fontWeight: '600', lineHeight: '1', display: 'block', visibility: 'visible', opacity: '1', color: 'white'}}>Rejected</small>
            </div>
          </div>
        </div>
        <div className="col-3">
          <div className="card text-white stats-card" style={{background: '#17a2b8', minHeight: '35px !important', height: '35px', maxHeight: '35px'}}>
            <div className="card-body text-center" style={{padding: '3px !important', height: '29px', minHeight: '29px', maxHeight: '29px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
              <i className="fas fa-boxes" style={{fontSize: '0.6rem', marginBottom: '1px', display: 'block', visibility: 'visible', opacity: '1'}}></i>
              {statsLoading ? (
                <div className="placeholder-glow">
                  <div className="placeholder bg-light rounded" style={{width: '14px', height: '9px', margin: '0 auto', display: 'block', visibility: 'visible', opacity: '1'}}></div>
                </div>
              ) : (
                <div className="fw-bold" style={{fontSize: '0.75rem', lineHeight: '1', display: 'block', visibility: 'visible', opacity: '1', color: 'white', fontWeight: '700'}}>{stats.total}</div>
              )}
              <small style={{fontSize: '0.55rem', fontWeight: '600', lineHeight: '1', display: 'block', visibility: 'visible', opacity: '1', color: 'white'}}>Total</small>
            </div>
          </div>
        </div>
      </div>

      {/* Minimal Filters */}
      <div className="row mb-2">
        <div className="col-12 text-center">
          <div className="btn-group filter-buttons" role="group">
            <button 
              className={`btn ${filter === 'pending' ? 'btn-warning' : 'btn-outline-warning'} btn-sm`}
              onClick={() => setFilter('pending')}
            >
              <i className="fas fa-clock me-1"></i>
              Pending ({stats.pending})
            </button>
            <button 
              className={`btn ${filter === 'approved' ? 'btn-success' : 'btn-outline-success'} btn-sm`}
              onClick={() => setFilter('approved')}
            >
              <i className="fas fa-check me-1"></i>
              Approved ({stats.approved})
            </button>
            <button 
              className={`btn ${filter === 'rejected' ? 'btn-danger' : 'btn-outline-danger'} btn-sm`}
              onClick={() => setFilter('rejected')}
            >
              <i className="fas fa-times me-1"></i>
              Rejected ({stats.rejected})
            </button>
            <button 
              className={`btn ${filter === 'all' ? 'btn-info' : 'btn-outline-info'} btn-sm`}
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
          <div className="card" style={{border: 'none', background: 'transparent'}}>
            <div className="card-body">
              <i className="fas fa-box-open fa-4x text-muted mb-3"></i>
              <h4 className="text-muted">No products found</h4>
              <p className="text-muted mb-0">No seller products in {filter} status</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="row g-1">
          {products.map(product => (
            <div key={product._id} className="col-xxl-2 col-xl-2 col-lg-3 col-md-4 col-sm-6">
              <div className="product-card" style={{fontSize: '0.7rem', height: '220px'}}>
                {/* Product Image */}
                <div className="product-image-container position-relative" style={{height: '70px', overflow: 'hidden'}}>
                  {product.images && product.images[0] ? (
                    <>
                      {/* Image Loading Placeholder */}
                      {imageLoadingStates[product._id] !== false && imageLoadingStates[product._id] !== 'error' && (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          color: '#6c757d',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          background: '#f8f9fa',
                          zIndex: 1
                        }}>
                          <div className="spinner-border spinner-border-sm mb-1" role="status"></div>
                          <small style={{fontSize: '0.6rem'}}>Loading...</small>
                        </div>
                      )}
                      
                      {/* Actual Image */}
                      <img 
                        src={product.images[0]} 
                        alt={product.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          padding: '4px',
                          opacity: imageLoadingStates[product._id] === false ? 1 : 0,
                          transition: 'opacity 0.3s ease'
                        }}
                        onLoad={() => handleImageLoad(product._id)}
                        onError={() => handleImageError(product._id)}
                      />
                      
                      {/* Error State */}
                      {imageLoadingStates[product._id] === 'error' && (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          color: '#6c757d',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          background: '#f8f9fa'
                        }}>
                          <i className="fas fa-image mb-1" style={{fontSize: '1rem'}}></i>
                          <small style={{fontSize: '0.6rem'}}>No Image</small>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      color: '#6c757d',
                      background: '#fff3cd'
                    }}>
                      <i className="fas fa-clock mb-1" style={{fontSize: '1rem'}}></i>
                      <small style={{fontSize: '0.6rem'}}>Request</small>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <span className={`position-absolute top-0 end-0 m-1 badge status-badge bg-${
                    product.approvalStatus === 'approved' ? 'success' : 
                    product.approvalStatus === 'pending' ? 'warning' : 'danger'
                  }`} style={{fontSize: '0.6rem', zIndex: 2, padding: '2px 4px'}}>
                    {product.approvalStatus === 'pending' ? 'PENDING' :
                     product.approvalStatus === 'approved' ? 'APPROVED' : 'REJECTED'}
                  </span>
                </div>

                <div className="card-body p-2 d-flex flex-column" style={{height: '150px'}}>
                  {/* Seller Information - Fixed to show proper names */}
                  <div className="seller-info-badge mb-1 p-1 d-flex align-items-center justify-content-between" style={{fontSize: '0.65rem', minHeight: '18px'}}>
                    <div className="d-flex align-items-center">
                      <i className="fas fa-user me-1" style={{fontSize: '0.6rem'}}></i>
                      <span className="text-truncate fw-bold" style={{fontSize: '0.65rem', maxWidth: '90px'}}>
                        {/* Enhanced seller name logic - prioritize actual names over fallbacks */}
                        {(() => {
                          const sellerName = product.seller?.username ||
                           product.sellerUsername ||
                           product.seller?.sellerName ||
                           (product.seller?.email && product.seller.email !== 'unknown' ? product.seller.email.split('@')[0] : null) ||
                           (product.sellerEmail && product.sellerEmail !== 'unknown' ? product.sellerEmail.split('@')[0] : null) ||
                           (product.seller && (product.seller.firstName || product.seller.name)) ||
                           (product.listingType === 'admin_product_listing' ? `Seller ${product.seller?._id?.slice(-4) || Math.random().toString(36).substr(2, 4)}` : 'Admin');
                          
                          // Debug log for approved products
                          if (product.approvalStatus === 'approved' && filter === 'approved') {
                            console.log('🔍 Seller name debug:', {
                              productName: product.name,
                              listingType: product.listingType,
                              sellerObject: product.seller,
                              sellerUsername: product.sellerUsername,
                              finalName: sellerName
                            });
                          }
                          
                          return sellerName;
                        })()}
                      </span>
                    </div>
                    {(product.seller?.verificationStatus === 'approved' || product.sellerVerificationStatus === 'approved') && (
                      <i className="fas fa-check-circle text-success" title="Verified" style={{fontSize: '0.6rem'}}></i>
                    )}
                  </div>

                  {/* Product Title - Proper Size for 3 lines */}
                  <h6 
                    className="text-dark mb-1"
                    onClick={() => handleProductClick(product)}
                    style={{
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      lineHeight: '1.1',
                      height: '2.4rem',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      fontWeight: '600'
                    }}
                    title={product.name}
                  >
                    {product.name}
                  </h6>

                  {/* Price - Clear Display */}
                  <div className="price-badge mb-1 d-flex align-items-center justify-content-between" style={{minHeight: '20px', padding: '2px 6px'}}>
                    <div>
                      <span className="fw-bold" style={{fontSize: '0.75rem'}}>
                        £{parseFloat(product.price).toFixed(2)}
                      </span>
                      {product.shipping > 0 && (
                        <span style={{fontSize: '0.6rem', opacity: '0.9'}}>
                          +£{product.shipping}
                        </span>
                      )}
                    </div>
                    {product.adminPrice && (
                      <div style={{fontSize: '0.6rem', opacity: '0.9'}}>
                        A: £{product.adminPrice}
                      </div>
                    )}
                  </div>

                  {/* Category and Date - Clear */}
                  <div className="mb-1 d-flex justify-content-between align-items-center" style={{fontSize: '0.6rem', color: '#6c757d'}}>
                    <span className="badge bg-light text-dark" style={{fontSize: '0.55rem', padding: '2px 6px', minWidth: '60px', textAlign: 'center'}}>
                      <i className="fas fa-tag me-1"></i>{(product.category || 'General').substring(0, 10)}
                    </span>
                    <span style={{fontSize: '0.55rem'}}>
                      <i className="fas fa-calendar me-1"></i>{new Date(product.createdAt).toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit'})}
                    </span>
                  </div>

                  {/* Actions - Clear Buttons */}
                  <div className="mt-auto">
                    {product.approvalStatus === 'pending' && (
                      <div className="d-flex gap-1 mb-1">
                        <button 
                          className="btn btn-success flex-fill action-btn d-flex align-items-center justify-content-center"
                          onClick={() => handleApprove(product)}
                          style={{fontSize: '0.65rem', padding: '3px 6px', borderRadius: '4px'}}
                        >
                          <i className="fas fa-check me-1" style={{fontSize: '0.6rem'}}></i> Approve
                        </button>
                        <button 
                          className="btn btn-danger flex-fill action-btn d-flex align-items-center justify-content-center"
                          onClick={() => handleReject(product)}
                          style={{fontSize: '0.65rem', padding: '3px 6px', borderRadius: '4px'}}
                        >
                          <i className="fas fa-times me-1" style={{fontSize: '0.6rem'}}></i> Reject
                        </button>
                      </div>
                    )}

                    {/* Delete Button - Always Visible */}
                    <button 
                      className="btn btn-outline-danger btn-sm w-100 action-btn d-flex align-items-center justify-content-center"
                      onClick={() => handleDelete(product)}
                      style={{fontSize: '0.65rem', padding: '2px 4px', borderRadius: '4px'}}
                    >
                      <i className="fas fa-trash me-1" style={{fontSize: '0.6rem'}}></i> Delete
                    </button>

                    {/* Status Messages - Compact */}
                    {product.approvalStatus === 'rejected' && product.rejectionReason && (
                      <div className="p-1 bg-danger bg-opacity-10 rounded mt-1" style={{borderLeft: '2px solid #dc3545'}}>
                        <div className="text-danger" style={{fontSize: '0.6rem'}}>
                          <strong><i className="fas fa-exclamation-triangle me-1"></i>Rejected:</strong><br/>
                          {product.rejectionReason.substring(0, 30)}...
                        </div>
                      </div>
                    )}

                    {product.approvalStatus === 'approved' && (
                      <div className="p-1 bg-success bg-opacity-10 rounded mt-1" style={{borderLeft: '2px solid #28a745'}}>
                        <div className="text-success" style={{fontSize: '0.6rem'}}>
                          <i className="fas fa-check-circle me-1"></i><strong>Approved</strong>
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