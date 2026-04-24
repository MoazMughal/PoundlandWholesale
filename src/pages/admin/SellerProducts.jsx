import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiUrl } from '../../utils/api'
import SuccessToast from '../../components/Toast/SuccessToast'

const AdminSellerProducts = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 })
  const [imageLoadingStates, setImageLoadingStates] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Bulk selection state (only for pending requests)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkApproving, setBulkApproving] = useState(false)

  const toggleSelect = (product) => {
    const id = product._id
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    const pendingIds = filteredAndSortedProducts.filter(p => p.approvalStatus === 'pending').map(p => p._id)
    setSelectedIds(prev => prev.length === pendingIds.length ? [] : pendingIds)
  }

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Approve ${selectedIds.length} listing request${selectedIds.length > 1 ? 's' : ''}?`)) return

    setBulkApproving(true)
    try {
      const token = localStorage.getItem('adminToken')
      const items = selectedIds.map(id => {
        const product = filteredAndSortedProducts.find(p => p._id === id)
        return { sellerId: product.originalSellerId, requestId: product.originalRequestId }
      }).filter(i => i.sellerId && i.requestId)

      const response = await fetch(getApiUrl('sellers/admin/listing-requests/bulk-approve'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ items })
      })
      const data = await response.json()

      if (response.ok) {
        const approvedCount = (data.approved || []).length
        showSuccess(`${approvedCount} request${approvedCount !== 1 ? 's' : ''} approved successfully!`)
        setProducts(prev => prev.filter(p => !selectedIds.includes(p._id)))
        setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - approvedCount), approved: prev.approved + approvedCount }))
        setSelectedIds([])
      } else {
        alert('❌ ' + (data.message || 'Bulk approve failed'))
      }
    } catch {
      alert('❌ Network error during bulk approve')
    } finally {
      setBulkApproving(false)
    }
  }
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const productsPerPage = 20 // Reduced from 50 to 20 for faster loading on M0 cluster

  useEffect(() => {
    // Reset to page 1 when filter changes
    if (currentPage !== 1) {
      setCurrentPage(1)
    } else {
      // Load stats first, then products
      loadStatsAndProducts()
    }
  }, [filter]) // Only depend on filter
  
  useEffect(() => {
    // Load products when page changes and scroll to top
    loadStatsAndProducts()
    
    // Scroll to top of page smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage]) // Separate effect for page changes

  const loadStatsAndProducts = async () => {
    setLoading(true)
    
    // Load stats and products in parallel for better performance
    await Promise.all([
      loadStats(),
      fetchProducts()
    ])
  }

  const showSuccess = (message) => {
    setSuccessMessage(message)
    setShowSuccessToast(true)
  }

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      
      // FIX: Use new fast stats endpoint instead of loading full data
      const fetchWithTimeout = (url, options, timeout = 45000) => {
        return Promise.race([
          fetch(url, options),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]);
      };
      
      try {
        // Use the new optimized stats endpoint
        const statsRes = await fetchWithTimeout(getApiUrl(`sellers/admin/listing-stats`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
        } else {
          // Fallback to default stats
          setStats({ pending: 0, approved: 0, rejected: 0, total: 0 });
        }
      } catch (error) {
        console.error('Error loading stats:', error);
        // Set default stats on error
        setStats({ pending: 0, approved: 0, rejected: 0, total: 0 });
      }
      
      setStatsLoading(false);
    } catch (error) {
      console.error('Error loading stats:', error);
      setStatsLoading(false);
      // Set default stats on error
      setStats({ pending: 0, approved: 0, rejected: 0, total: 0 });
    }
  }

  const fetchProducts = async () => {
    setLoading(true); // Always set loading at start
    
    try {
      const token = localStorage.getItem('adminToken')
      
      // FIX: Increased timeout to 60 seconds for slow M0 cluster
      const fetchWithTimeout = (url, options, timeout = 60000) => {
        return Promise.race([
          fetch(url, options),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]);
      };
      
      if (filter === 'pending') {
        // For pending, fetch listing requests instead of products
        const response = await fetchWithTimeout(getApiUrl(`sellers/admin/listing-requests?status=pending_approval&limit=${productsPerPage}&page=${currentPage}`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          
          // Update pagination info
          setTotalPages(data.totalPages || 1)
          setTotalProducts(data.total || data.requests.length)
          
          // Transform listing requests to look like products for display
          const transformedRequests = await Promise.all(data.requests.map(async (request) => {
            // Fetch admin product to get images - but don't block on this
            let adminProductImages = [];
            try {
              const adminProductResponse = await fetchWithTimeout(getApiUrl(`products/public/${request.productId}`), {
                headers: { 'Authorization': `Bearer ${token}` }
              }, 10000); // Shorter timeout for image fetching
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
              moq: request.moq || 1,
              currency: 'GBP',
              approvalStatus: 'pending',
              images: adminProductImages,
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
        const response = await fetchWithTimeout(getApiUrl(`sellers/admin/listing-requests?status=rejected&limit=${productsPerPage}&page=${currentPage}`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          
          // Update pagination info
          setTotalPages(data.totalPages || 1)
          setTotalProducts(data.total || data.requests.length)
          
          const transformedRequests = await Promise.all(data.requests.map(async (request) => {
            // Fetch admin product to get images - but don't block on this
            let adminProductImages = [];
            try {
              const adminProductResponse = await fetchWithTimeout(getApiUrl(`products/public/${request.productId}`), {
                headers: { 'Authorization': `Bearer ${token}` }
              }, 10000);
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
              moq: request.moq || 1,
              currency: 'GBP',
              approvalStatus: 'rejected',
              rejectionReason: request.rejectionReason,
              images: adminProductImages,
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
        const params = new URLSearchParams({ 
          status: filter === 'all' ? 'approved' : filter, 
          limit: productsPerPage,
          page: currentPage
        })
        const response = await fetchWithTimeout(getApiUrl(`products/admin/all-seller-listings?${params}`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          
          // Update pagination info
          setTotalPages(data.totalPages || 1)
          setTotalProducts(data.total || data.products.length)
          
          console.log('🔍 Approved products data:', data.products.slice(0, 3).map(p => ({
            name: p.name,
            listingType: p.listingType,
            seller: p.seller,
            sellerUsername: p.sellerUsername,
            sellerEmail: p.sellerEmail
          })))
          setProducts(data.products)
        } else if (response.status === 504) {
          // Handle timeout error silently - just show empty state
          console.error('Request timeout - query took too long')
          setProducts([])
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      // Don't show alert, just log and show empty state
      setProducts([])
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
          showSuccess('Listing request approved successfully! Product has been added to seller\'s inventory.')
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
          showSuccess('Product approved successfully!')
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

  // Filter and sort products
  const filteredAndSortedProducts = products
    .filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.seller?.username || product.sellerUsername || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt)
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt)
        case 'price-high':
          return parseFloat(b.price) - parseFloat(a.price)
        case 'price-low':
          return parseFloat(a.price) - parseFloat(b.price)
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

  if (loading) {
    return (
      <div className="admin-seller-products-page" style={{backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '8px'}}>
        {/* Enhanced Header Skeleton */}
        <div className="header-section bg-white rounded-3 shadow-sm p-3 mb-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center">
              <div className="placeholder-glow">
                <div className="placeholder bg-primary rounded" style={{width: '200px', height: '28px'}}></div>
              </div>
            </div>
            <div className="placeholder-glow">
              <div className="placeholder bg-secondary rounded" style={{width: '120px', height: '36px'}}></div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards Skeleton */}
        <div className="stats-section mb-3">
          <div className="row g-2">
            {[
              { color: '#ffc107', icon: 'clock', label: 'Pending' },
              { color: '#28a745', icon: 'check-circle', label: 'Approved' },
              { color: '#dc3545', icon: 'times-circle', label: 'Rejected' },
              { color: '#17a2b8', icon: 'boxes', label: 'Total' }
            ].map((stat, i) => (
              <div key={i} className="col-6 col-md-3">
                <div className="stats-card bg-white rounded-3 shadow-sm p-3 text-center">
                  <div className="placeholder-glow">
                    <div className="placeholder rounded-circle mx-auto mb-2" style={{
                      width: '32px', 
                      height: '32px', 
                      backgroundColor: stat.color + '40'
                    }}></div>
                    <div className="placeholder bg-secondary rounded mb-1" style={{width: '40px', height: '20px', margin: '0 auto'}}></div>
                    <div className="placeholder bg-secondary rounded" style={{width: '60px', height: '14px', margin: '0 auto'}}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Controls Skeleton */}
        <div className="controls-section bg-white rounded-3 shadow-sm p-3 mb-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-6">
              <div className="placeholder-glow">
                <div className="placeholder bg-secondary rounded" style={{width: '100%', height: '38px'}}></div>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="placeholder-glow d-flex gap-2">
                <div className="placeholder bg-secondary rounded flex-fill" style={{height: '38px'}}></div>
                <div className="placeholder bg-secondary rounded" style={{width: '100px', height: '38px'}}></div>
              </div>
            </div>
          </div>
          <div className="row mt-3">
            <div className="col-12 text-center">
              <div className="placeholder-glow d-flex justify-content-center gap-2 flex-wrap">
                {[1,2,3,4].map(i => (
                  <div key={i} className="placeholder bg-secondary rounded" style={{width: '120px', height: '36px'}}></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Products Grid Skeleton */}
        <div className="products-section">
          <div className="row g-2">
            {Array.from({length: 24}).map((_, i) => (
              <div key={i} className="col-6 col-sm-4 col-md-3 col-lg-2 col-xl-2">
                <div className="product-card-skeleton bg-white rounded-3 shadow-sm overflow-hidden" style={{height: '280px'}}>
                  <div className="placeholder-glow h-100 d-flex flex-column">
                    {/* Image Skeleton */}
                    <div className="placeholder bg-light" style={{height: '120px', width: '100%'}}></div>
                    
                    <div className="p-2 flex-grow-1 d-flex flex-column">
                      {/* Seller badge skeleton */}
                      <div className="placeholder bg-primary rounded mb-2" style={{height: '20px', width: '80%'}}></div>
                      
                      {/* Title skeleton */}
                      <div className="placeholder bg-secondary rounded mb-1" style={{height: '14px', width: '100%'}}></div>
                      <div className="placeholder bg-secondary rounded mb-2" style={{height: '14px', width: '70%'}}></div>
                      
                      {/* Price skeleton */}
                      <div className="placeholder bg-success rounded mb-2" style={{height: '18px', width: '60%'}}></div>
                      
                      {/* Category skeleton */}
                      <div className="placeholder bg-light rounded mb-2" style={{height: '16px', width: '80%'}}></div>
                      
                      {/* Buttons skeleton */}
                      <div className="mt-auto">
                        <div className="d-flex gap-1 mb-1">
                          <div className="placeholder bg-success rounded flex-fill" style={{height: '24px'}}></div>
                          <div className="placeholder bg-danger rounded flex-fill" style={{height: '24px'}}></div>
                        </div>
                        <div className="placeholder bg-outline-danger rounded w-100" style={{height: '24px'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-seller-products-page" style={{backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '6px'}}>
      <style>
        {`
          /* Compact Modern Styling for Admin Seller Products */
          .admin-seller-products-page {
            font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif !important;
          }
          
          /* Header Section - More Compact */
          .header-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            border: none !important;
            color: white !important;
            padding: 12px 16px !important;
          }
          
          .header-section h1 {
            font-size: 1.2rem !important;
            font-weight: 700 !important;
            margin: 0 !important;
            color: white !important;
          }
          
          .header-section .btn {
            background: rgba(255, 255, 255, 0.2) !important;
            border: 1px solid rgba(255, 255, 255, 0.3) !important;
            color: white !important;
            font-weight: 600 !important;
            transition: all 0.3s ease !important;
            padding: 6px 12px !important;
            font-size: 0.85rem !important;
          }
          
          .header-section .btn:hover {
            background: rgba(255, 255, 255, 0.3) !important;
            transform: translateY(-1px) !important;
          }
          
          /* Stats Cards - Compact */
          .stats-card {
            background: white !important;
            border: none !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06) !important;
            transition: all 0.3s ease !important;
            overflow: hidden !important;
            position: relative !important;
            padding: 12px !important;
          }
          
          .stats-card:hover {
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
          }
          
          .stats-card .stats-icon {
            width: 32px !important;
            height: 32px !important;
            border-radius: 8px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 0.9rem !important;
            margin: 0 auto 6px auto !important;
          }
          
          .stats-card .stats-number {
            font-size: 1.4rem !important;
            font-weight: 800 !important;
            line-height: 1 !important;
            margin-bottom: 2px !important;
          }
          
          .stats-card .stats-label {
            font-size: 0.7rem !important;
            font-weight: 600 !important;
            opacity: 0.8 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.3px !important;
          }
          
          /* Controls Section - Compact */
          .controls-section {
            background: white !important;
            border: none !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04) !important;
            padding: 12px !important;
          }
          
          .search-input {
            border: 1px solid #e9ecef !important;
            border-radius: 6px !important;
            padding: 8px 12px !important;
            font-size: 0.85rem !important;
            transition: all 0.3s ease !important;
            height: 36px !important;
          }
          
          .search-input:focus {
            border-color: #667eea !important;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1) !important;
            outline: none !important;
          }
          
          .sort-select {
            border: 1px solid #e9ecef !important;
            border-radius: 6px !important;
            padding: 8px 12px !important;
            font-size: 0.85rem !important;
            background: white !important;
            transition: all 0.3s ease !important;
            height: 36px !important;
          }
          
          .sort-select:focus {
            border-color: #667eea !important;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1) !important;
            outline: none !important;
          }
          
          /* Filter Buttons - Compact */
          .filter-buttons .btn {
            border-radius: 6px !important;
            font-weight: 600 !important;
            padding: 6px 12px !important;
            font-size: 0.8rem !important;
            transition: all 0.3s ease !important;
            border: 1px solid transparent !important;
          }
          
          .filter-buttons .btn:hover {
            transform: translateY(-1px) !important;
          }
          
          .filter-buttons .btn.active {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
          }
          
          /* Product Cards - Following Amazon's Choice Pattern */
          .product-card {
            background: white !important;
            border: 1px solid transparent !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 12px rgba(255, 102, 0, 0.08) !important;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
            overflow: hidden !important;
            height: 240px !important;
            display: flex !important;
            flex-direction: column !important;
            position: relative !important;
          }
          
          .product-card:hover {
            transform: translateY(-4px) scale(1.02) !important;
            box-shadow: 0 12px 30px rgba(255, 102, 0, 0.2) !important;
            border-color: #ff6600 !important;
          }
          
          .product-image-container {
            background: #fff !important;
            height: 100px !important;
            position: relative !important;
            overflow: hidden !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 8px !important;
          }
          
          .product-image {
            max-width: 100% !important;
            max-height: 100% !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain !important;
            transition: all 0.3s ease !important;
          }
          
          .product-card:hover .product-image {
            transform: scale(1.05) !important;
          }
          
          .status-badge {
            position: absolute !important;
            top: 6px !important;
            right: 6px !important;
            font-size: 0.65rem !important;
            font-weight: 700 !important;
            padding: 3px 6px !important;
            border-radius: 4px !important;
            text-transform: uppercase !important;
            letter-spacing: 0.3px !important;
            z-index: 2 !important;
          }
          
          .status-badge.bg-success {
            background: #28a745 !important;
            color: white !important;
          }
          
          .seller-badge {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            color: white !important;
            border: none !important;
            border-radius: 4px !important;
            font-size: 0.7rem !important;
            font-weight: 600 !important;
            padding: 3px 6px !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 3px !important;
          }
          
          .product-title {
            font-size: 0.75rem !important;
            font-weight: 600 !important;
            line-height: 1.2 !important;
            color: #2d3748 !important;
            cursor: pointer !important;
            transition: color 0.3s ease !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            height: 1.8rem !important;
          }
          
          .product-title:hover {
            color: #667eea !important;
          }
          
          .price-badge {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%) !important;
            color: white !important;
            border: none !important;
            border-radius: 4px !important;
            font-weight: 700 !important;
            padding: 4px 8px !important;
            font-size: 0.75rem !important;
          }
          
          .category-badge {
            background: #f7fafc !important;
            color: #4a5568 !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 4px !important;
            font-size: 0.65rem !important;
            font-weight: 600 !important;
            padding: 2px 6px !important;
          }
          
          .action-btn {
            border-radius: 4px !important;
            font-weight: 600 !important;
            font-size: 0.7rem !important;
            padding: 4px 8px !important;
            transition: all 0.3s ease !important;
            border: none !important;
          }
          
          .action-btn:hover {
            transform: translateY(-1px) !important;
          }
          
          .btn-approve {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%) !important;
            color: white !important;
          }
          
          .btn-reject {
            background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%) !important;
            color: white !important;
          }
          
          .btn-delete {
            background: white !important;
            color: #e53e3e !important;
            border: 1px solid #e53e3e !important;
          }
          
          .btn-delete:hover {
            background: #e53e3e !important;
            color: white !important;
          }
          
          .rejection-reason {
            background: #fed7d7 !important;
            border-left: 3px solid #f56565 !important;
            border-radius: 0 4px 4px 0 !important;
            padding: 6px !important;
            font-size: 0.65rem !important;
            color: #c53030 !important;
          }
          
          .approval-message {
            background: #c6f6d5 !important;
            border-left: 3px solid #48bb78 !important;
            border-radius: 0 4px 4px 0 !important;
            padding: 6px !important;
            font-size: 0.65rem !important;
            color: #2f855a !important;
          }
          
          /* Loading States */
          .image-loading {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-direction: column !important;
            color: #a0aec0 !important;
            background: #f7fafc !important;
            height: 100% !important;
          }
          
          .loading-spinner {
            width: 20px !important;
            height: 20px !important;
            border: 2px solid #e2e8f0 !important;
            border-top: 2px solid #667eea !important;
            border-radius: 50% !important;
            animation: spin 1s linear infinite !important;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          /* Empty State */
          .empty-state {
            text-align: center !important;
            padding: 40px 20px !important;
            background: white !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04) !important;
          }
          
          .empty-state-icon {
            font-size: 3rem !important;
            color: #a0aec0 !important;
            margin-bottom: 12px !important;
          }
          
          .empty-state-title {
            font-size: 1.2rem !important;
            font-weight: 700 !important;
            color: #2d3748 !important;
            margin-bottom: 6px !important;
          }
          
          .empty-state-text {
            font-size: 0.9rem !important;
            color: #718096 !important;
          }
          
          /* Responsive Design */
          @media (max-width: 1200px) {
            .product-card {
              height: 220px !important;
            }
            .product-title {
              font-size: 0.7rem !important;
            }
          }
          
          /* Pagination Styles */
          .pagination-section {
            background: white !important;
            border: none !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04) !important;
          }
          
          .pagination-info {
            font-size: 0.85rem !important;
          }
          
          .pagination-controls .btn {
            min-width: 36px !important;
            height: 36px !important;
            padding: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 6px !important;
            font-weight: 600 !important;
            transition: all 0.3s ease !important;
          }
          
          .pagination-controls .btn:disabled {
            opacity: 0.4 !important;
            cursor: not-allowed !important;
          }
          
          .pagination-controls .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            border: none !important;
            color: white !important;
          }
          
          .pagination-controls .btn-outline-primary {
            background: white !important;
            border: 1px solid #e2e8f0 !important;
            color: #667eea !important;
          }
          
          .pagination-controls .btn-outline-primary:hover:not(:disabled) {
            background: #f7fafc !important;
            border-color: #667eea !important;
            transform: translateY(-1px) !important;
          }
          
          .items-per-page .form-select {
            border: 1px solid #e2e8f0 !important;
            border-radius: 6px !important;
            font-size: 0.85rem !important;
            padding: 4px 8px !important;
            cursor: pointer !important;
          }
          
          .items-per-page .form-select:focus {
            border-color: #667eea !important;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1) !important;
            outline: none !important;
          }
          
          @media (max-width: 1200px) {
            .product-card {
              height: 220px !important;
            }
            .product-title {
              font-size: 0.7rem !important;
            }
          }
          
          @media (max-width: 768px) {
            .admin-seller-products-page {
              padding: 4px !important;
            }
            
            .header-section {
              padding: 10px 12px !important;
            }
            
            .header-section h1 {
              font-size: 1.1rem !important;
            }
            
            .stats-card {
              padding: 10px !important;
            }
            
            .stats-card .stats-icon {
              width: 28px !important;
              height: 28px !important;
              font-size: 0.8rem !important;
            }
            
            .stats-card .stats-number {
              font-size: 1.2rem !important;
            }
            
            .product-card {
              height: 200px !important;
            }
            
            .product-image-container {
              height: 80px !important;
            }
            
            .product-title {
              font-size: 0.65rem !important;
              height: 1.6rem !important;
            }
            
            .filter-buttons .btn {
              font-size: 0.7rem !important;
              padding: 5px 10px !important;
            }
            
            /* Pagination Mobile */
            .pagination-section {
              padding: 12px !important;
            }
            
            .pagination-section .d-flex {
              flex-direction: column !important;
              gap: 12px !important;
            }
            
            .pagination-info {
              text-align: center !important;
              width: 100% !important;
            }
            
            .pagination-controls {
              justify-content: center !important;
              width: 100% !important;
            }
            
            .pagination-controls .btn {
              min-width: 32px !important;
              height: 32px !important;
              font-size: 0.8rem !important;
            }
            
            .items-per-page {
              justify-content: center !important;
              width: 100% !important;
            }
          }
          
          @media (max-width: 576px) {
            .controls-section .row > div {
              margin-bottom: 6px !important;
            }
            
            .filter-buttons {
              display: flex !important;
              flex-wrap: wrap !important;
              gap: 3px !important;
              justify-content: center !important;
            }
            
            .filter-buttons .btn {
              flex: 1 1 auto !important;
              min-width: 70px !important;
              font-size: 0.65rem !important;
            }
            
            .product-card {
              height: 180px !important;
            }
            
            .action-btn {
              font-size: 0.6rem !important;
              padding: 3px 6px !important;
            }
          }
        `}
      </style>
      
      {/* Compact Header */}
      <div className="header-section rounded-2 shadow-sm mb-2">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center">
            <i className="fas fa-store me-2" style={{fontSize: '1.2rem'}}></i>
            <h1>Seller Products</h1>
          </div>
          <button 
            className="btn d-flex align-items-center gap-2"
            onClick={() => navigate('/admin/dashboard')}
          >
            <i className="fas fa-arrow-left"></i>
            <span>Dashboard</span>
          </button>
        </div>
      </div>

      {/* Compact Stats Cards */}
      <div className="stats-section mb-2">
        <div className="row g-2">
          <div className="col-6 col-md-3">
            <div className="stats-card text-center">
              <div className="stats-icon" style={{backgroundColor: '#ffc107', color: 'white'}}>
                <i className="fas fa-clock"></i>
              </div>
              {statsLoading ? (
                <div className="loading-spinner mx-auto mb-1"></div>
              ) : (
                <div className="stats-number" style={{color: '#ffc107'}}>{stats.pending}</div>
              )}
              <div className="stats-label" style={{color: '#ffc107'}}>Pending</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="stats-card text-center">
              <div className="stats-icon" style={{backgroundColor: '#28a745', color: 'white'}}>
                <i className="fas fa-check-circle"></i>
              </div>
              {statsLoading ? (
                <div className="loading-spinner mx-auto mb-1"></div>
              ) : (
                <div className="stats-number" style={{color: '#28a745'}}>{stats.approved}</div>
              )}
              <div className="stats-label" style={{color: '#28a745'}}>Approved</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="stats-card text-center">
              <div className="stats-icon" style={{backgroundColor: '#dc3545', color: 'white'}}>
                <i className="fas fa-times-circle"></i>
              </div>
              {statsLoading ? (
                <div className="loading-spinner mx-auto mb-1"></div>
              ) : (
                <div className="stats-number" style={{color: '#dc3545'}}>{stats.rejected}</div>
              )}
              <div className="stats-label" style={{color: '#dc3545'}}>Rejected</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="stats-card text-center">
              <div className="stats-icon" style={{backgroundColor: '#17a2b8', color: 'white'}}>
                <i className="fas fa-boxes"></i>
              </div>
              {statsLoading ? (
                <div className="loading-spinner mx-auto mb-1"></div>
              ) : (
                <div className="stats-number" style={{color: '#17a2b8'}}>{stats.total}</div>
              )}
              <div className="stats-label" style={{color: '#17a2b8'}}>Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Controls */}
      <div className="controls-section mb-2">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-6">
            <div className="position-relative">
              <i className="fas fa-search position-absolute" style={{
                left: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#a0aec0',
                zIndex: 2
              }}></i>
              <input
                type="text"
                className="form-control search-input ps-4"
                placeholder="Search products or sellers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="d-flex gap-2">
              <select
                className="form-select sort-select flex-grow-1"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-high">Price: High to Low</option>
                <option value="price-low">Price: Low to High</option>
                <option value="name">Name: A to Z</option>
              </select>
              <div className="d-flex align-items-center text-muted">
                <small>{filteredAndSortedProducts.length} items</small>
              </div>
            </div>
          </div>
        </div>
        
        <div className="row mt-2">
          <div className="col-12 text-center">
            <div className="filter-buttons d-flex justify-content-center gap-2 flex-wrap">
              <button 
                className={`btn ${filter === 'pending' ? 'btn-warning active' : 'btn-outline-warning'}`}
                onClick={() => setFilter('pending')}
              >
                <i className="fas fa-clock me-1"></i>
                Pending ({stats.pending})
              </button>
              <button 
                className={`btn ${filter === 'approved' ? 'btn-success active' : 'btn-outline-success'}`}
                onClick={() => setFilter('approved')}
              >
                <i className="fas fa-check me-1"></i>
                Approved ({stats.approved})
              </button>
              <button 
                className={`btn ${filter === 'rejected' ? 'btn-danger active' : 'btn-outline-danger'}`}
                onClick={() => setFilter('rejected')}
              >
                <i className="fas fa-times me-1"></i>
                Rejected ({stats.rejected})
              </button>
              <button 
                className={`btn ${filter === 'all' ? 'btn-info active' : 'btn-outline-info'}`}
                onClick={() => setFilter('all')}
              >
                <i className="fas fa-list me-1"></i>
                All ({stats.total})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Action Toolbar — only shown for pending filter with selections */}
      {filter === 'pending' && filteredAndSortedProducts.some(p => p.approvalStatus === 'pending') && (
        <div style={{ marginBottom:'10px', background: selectedIds.length > 0 ? 'linear-gradient(135deg,#28a745,#20c997)' : '#f8f9fa', border: '1px solid #e9ecef', borderRadius:'8px', padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px', transition:'background 0.2s' }}>
          <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', margin:0, color: selectedIds.length > 0 ? '#fff' : '#374151', fontWeight:'600', fontSize:'0.85rem' }}>
            <input type="checkbox"
              checked={selectedIds.length > 0 && selectedIds.length === filteredAndSortedProducts.filter(p => p.approvalStatus === 'pending').length}
              onChange={toggleSelectAll}
              style={{ width:'16px', height:'16px', cursor:'pointer' }} />
            {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select All Pending'}
          </label>
          {selectedIds.length > 0 && (
            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              <button onClick={() => setSelectedIds([])}
                style={{ background:'rgba(255,255,255,0.25)', border:'none', borderRadius:'6px', color:'#fff', padding:'4px 12px', fontSize:'0.78rem', cursor:'pointer', fontWeight:'600' }}>
                Clear
              </button>
              <button onClick={handleBulkApprove} disabled={bulkApproving}
                style={{ background:'#fff', color:'#28a745', border:'none', borderRadius:'8px', padding:'7px 18px', fontWeight:'700', fontSize:'0.85rem', cursor: bulkApproving ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:'6px', opacity: bulkApproving ? 0.7 : 1 }}>
                {bulkApproving
                  ? <><span className="spinner-border spinner-border-sm"></span> Approving...</>
                  : <><i className="fas fa-check-double"></i> Approve All ({selectedIds.length})</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Products Grid */}
      {filteredAndSortedProducts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <i className="fas fa-box-open"></i>
          </div>
          <div className="empty-state-title">No products found</div>
          <div className="empty-state-text">
            {searchTerm ? `No products match "${searchTerm}"` : `No seller products in ${filter} status`}
          </div>
        </div>
      ) : (
        <div className="products-section">
          <div className="row g-2">
            {filteredAndSortedProducts.map(product => (
              <div key={product._id} className="col-6 col-sm-4 col-md-3 col-lg-2 col-xl-2">
                <div className="product-card">
                  {/* Bulk select checkbox for pending items */}
                  {product.approvalStatus === 'pending' && product.isListingRequest && (
                    <div onClick={e => { e.stopPropagation(); toggleSelect(product) }}
                      style={{ position:'absolute', top:'6px', left:'6px', zIndex:10, width:'20px', height:'20px', borderRadius:'4px', border: selectedIds.includes(product._id) ? '2px solid #28a745' : '2px solid #ccc', background: selectedIds.includes(product._id) ? '#28a745' : 'rgba(255,255,255,0.9)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.15s' }}>
                      {selectedIds.includes(product._id) && <i className="fas fa-check" style={{ color:'#fff', fontSize:'10px' }}></i>}
                    </div>
                  )}
                  {/* Product Image */}
                  <div className="product-image-container">
                    {product.images && product.images[0] ? (
                      <>
                        {/* Loading State */}
                        {imageLoadingStates[product._id] !== false && imageLoadingStates[product._id] !== 'error' && (
                          <div className="image-loading position-absolute w-100 h-100">
                            <div className="loading-spinner mb-1"></div>
                            <small>Loading...</small>
                          </div>
                        )}
                        
                        {/* Actual Image */}
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="product-image"
                          style={{
                            opacity: imageLoadingStates[product._id] === false ? 1 : 0,
                            transition: 'opacity 0.3s ease'
                          }}
                          onLoad={() => handleImageLoad(product._id)}
                          onError={() => handleImageError(product._id)}
                        />
                        
                        {/* Error State */}
                        {imageLoadingStates[product._id] === 'error' && (
                          <div className="image-loading position-absolute w-100 h-100">
                            <i className="fas fa-image mb-1" style={{fontSize: '1.2rem'}}></i>
                            <small>No Image</small>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="image-loading w-100 h-100">
                        <i className="fas fa-clock mb-1" style={{fontSize: '1.2rem', color: '#ffc107'}}></i>
                        <small>Request</small>
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <span className={`status-badge ${
                      product.approvalStatus === 'approved' ? 'bg-success' : 
                      product.approvalStatus === 'pending' ? 'bg-warning text-dark' : 'bg-danger'
                    }`}>
                      {product.approvalStatus}
                    </span>
                  </div>

                  <div className="p-2 flex-grow-1 d-flex flex-column">
                    {/* Seller Information */}
                    <div className="seller-badge mb-1 d-inline-flex align-self-start">
                      <i className="fas fa-user me-1"></i>
                      <span className="text-truncate" style={{maxWidth: '100px'}}>
                        {(() => {
                          const sellerName = product.seller?.username ||
                           product.sellerUsername ||
                           product.seller?.sellerName ||
                           (product.seller?.email && product.seller.email !== 'unknown' ? product.seller.email.split('@')[0] : null) ||
                           (product.sellerEmail && product.sellerEmail !== 'unknown' ? product.sellerEmail.split('@')[0] : null) ||
                           (product.seller && (product.seller.firstName || product.seller.name)) ||
                           (product.listingType === 'admin_product_listing' ? `Seller ${product.seller?._id?.slice(-4) || Math.random().toString(36).substr(2, 4)}` : 'Admin');
                          
                          return sellerName;
                        })()}
                      </span>
                      {(product.seller?.verificationStatus === 'approved' || product.sellerVerificationStatus === 'approved') && (
                        <i className="fas fa-check-circle ms-1" style={{color: '#48bb78'}} title="Verified"></i>
                      )}
                    </div>

                    {/* Product Title */}
                    <h6 
                      className="product-title mb-1"
                      onClick={() => handleProductClick(product)}
                      title={product.name}
                    >
                      {product.name}
                    </h6>

                    {/* Price */}
                    <div className="price-badge mb-1 d-inline-flex align-self-start">
                      <span>£{parseFloat(product.price).toFixed(2)}</span>
                      {product.shipping > 0 && (
                        <span className="ms-1" style={{fontSize: '0.65rem', opacity: '0.9'}}>
                          +£{product.shipping}
                        </span>
                      )}
                    </div>

                    {/* MOQ Badge */}
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      background: '#fff3cd', border: '1px solid #ffc107',
                      borderRadius: '4px', padding: '2px 6px', fontSize: '0.65rem',
                      fontWeight: '700', color: '#856404', marginBottom: '4px'
                    }}>
                      <i className="fas fa-boxes"></i>
                      MOQ: {product.moq || 1}
                    </div>

                    {/* Category and Date */}
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="category-badge">
                        <i className="fas fa-tag me-1"></i>
                        {(product.category || 'General').substring(0, 6)}
                      </span>
                      <small className="text-muted" style={{fontSize: '0.6rem'}}>
                        {new Date(product.createdAt).toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit'})}
                      </small>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto">
                      {product.approvalStatus === 'pending' && (
                        <div className="d-flex gap-1 mb-1">
                          <button 
                            className="btn btn-approve flex-fill action-btn d-flex align-items-center justify-content-center"
                            onClick={() => handleApprove(product)}
                          >
                            <i className="fas fa-check me-1"></i> Approve
                          </button>
                          <button 
                            className="btn btn-reject flex-fill action-btn d-flex align-items-center justify-content-center"
                            onClick={() => handleReject(product)}
                          >
                            <i className="fas fa-times me-1"></i> Reject
                          </button>
                        </div>
                      )}

                      {/* Delete Button */}
                      <button 
                        className="btn btn-delete w-100 action-btn d-flex align-items-center justify-content-center"
                        onClick={() => handleDelete(product)}
                      >
                        <i className="fas fa-trash me-1"></i> Delete
                      </button>

                      {/* Status Messages */}
                      {product.approvalStatus === 'rejected' && product.rejectionReason && (
                        <div className="rejection-reason mt-1">
                          <strong><i className="fas fa-exclamation-triangle me-1"></i>Rejected:</strong><br/>
                          {product.rejectionReason.length > 40 ? 
                            product.rejectionReason.substring(0, 40) + '...' : 
                            product.rejectionReason
                          }
                        </div>
                      )}

                      {product.approvalStatus === 'approved' && (
                        <div className="approval-message mt-1">
                          <i className="fas fa-check-circle me-1"></i>
                          <strong>Approved</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && filteredAndSortedProducts.length > 0 && totalPages > 1 && (
        <div className="pagination-section bg-white rounded-3 shadow-sm p-3 mt-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            {/* Page Info */}
            <div className="pagination-info text-muted">
              <small>
                Showing <strong>{((currentPage - 1) * productsPerPage) + 1}</strong> to{' '}
                <strong>{Math.min(currentPage * productsPerPage, totalProducts)}</strong> of{' '}
                <strong>{totalProducts}</strong> products
              </small>
            </div>

            {/* Pagination Buttons */}
            <div className="pagination-controls d-flex align-items-center gap-2">
              {/* First Page */}
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || loading}
                title="First Page"
              >
                <i className="fas fa-angle-double-left"></i>
              </button>

              {/* Previous Page */}
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                title="Previous Page"
              >
                <i className="fas fa-angle-left"></i>
              </button>

              {/* Page Numbers */}
              <div className="d-flex gap-1">
                {(() => {
                  const pages = [];
                  const maxVisible = 5;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                  
                  // Adjust start if we're near the end
                  if (endPage - startPage < maxVisible - 1) {
                    startPage = Math.max(1, endPage - maxVisible + 1);
                  }

                  // Add first page and ellipsis if needed
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setCurrentPage(1)}
                        disabled={loading}
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) {
                      pages.push(<span key="ellipsis-start" className="px-2">...</span>);
                    }
                  }

                  // Add visible page numbers
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        className={`btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setCurrentPage(i)}
                        disabled={loading}
                      >
                        {i}
                      </button>
                    );
                  }

                  // Add ellipsis and last page if needed
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(<span key="ellipsis-end" className="px-2">...</span>);
                    }
                    pages.push(
                      <button
                        key={totalPages}
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={loading}
                      >
                        {totalPages}
                      </button>
                    );
                  }

                  return pages;
                })()}
              </div>

              {/* Next Page */}
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
                title="Next Page"
              >
                <i className="fas fa-angle-right"></i>
              </button>

              {/* Last Page */}
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || loading}
                title="Last Page"
              >
                <i className="fas fa-angle-double-right"></i>
              </button>
            </div>

            {/* Items Per Page Selector */}
            <div className="items-per-page d-flex align-items-center gap-2">
              <small className="text-muted">Items per page:</small>
              <select
                className="form-select form-select-sm"
                style={{width: 'auto'}}
                value={productsPerPage}
                disabled
                title="Items per page (fixed at 50 for optimal performance)"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <SuccessToast
          message={successMessage}
          onClose={() => setShowSuccessToast(false)}
          duration={3000}
        />
      )}
    </div>
  )
}

export default AdminSellerProducts