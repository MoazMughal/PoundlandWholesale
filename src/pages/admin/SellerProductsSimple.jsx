import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getApiUrl } from '../../utils/api'

// Render flag emoji from country code (encoding-safe)
const countryFlag = (code) => {
  const map = { GBP: 'GB', PKR: 'PK', AED: 'AE', USD: 'US' };
  const cc = map[code];
  if (!cc) return '';
  return String.fromCodePoint(...[...cc].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};
const COUNTRY_LABEL = { GBP: 'UK', PKR: 'Pakistan', AED: 'UAE', USD: 'USA' };

const SellerProductsSimple = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('pending')
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sortBy, setSortBy] = useState('date_desc')
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [sellers, setSellers] = useState([])
  const [sellerFilter, setSellerFilter] = useState('all')
  const [itemsPerPage, setItemsPerPage] = useState(50)

  // Load stats and sellers once on mount
  useEffect(() => {
    loadStats()
    loadSellers()
  }, [])

  // Reset page and selection when filter or seller or perPage changes
  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds([])
  }, [filter, sellerFilter, itemsPerPage])

  useEffect(() => {
    fetchProducts()
  }, [filter, currentPage, sellerFilter, itemsPerPage])

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(getApiUrl('sellers/admin/listing-stats'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadSellers = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(getApiUrl('sellers/admin/sellers'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setSellers(data.sellers || [])
      }
    } catch (error) {
      console.error('Error loading sellers:', error)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    setSelectedIds([])
    try {
      const token = localStorage.getItem('adminToken')
      let url = ''
      const sellerParam = sellerFilter !== 'all' ? `&sellerId=${sellerFilter}` : ''

      if (filter === 'pending') {
        url = `sellers/admin/listing-requests?status=pending_approval&limit=${itemsPerPage}&page=${currentPage}${sellerParam}`
      } else if (filter === 'rejected') {
        url = `sellers/admin/listing-requests?status=rejected&limit=${itemsPerPage}&page=${currentPage}${sellerParam}`
      } else if (filter === 'approved') {
        url = `products/admin/all-seller-listings?status=approved&limit=${itemsPerPage}&page=${currentPage}${sellerParam}`
      } else {
        url = `products/admin/all-seller-listings?status=approved&limit=${itemsPerPage}&page=${currentPage}${sellerParam}`
      }

      const response = await fetch(getApiUrl(url), {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        
        if (filter === 'pending' || filter === 'rejected') {
          // Transform requests - INCLUDE IMAGES
          const transformed = data.requests.map(req => ({
            _id: `req_${req._id}`,
            name: req.productName,
            price: req.sellerPrice,
            status: req.status,
            seller: req.sellerUsername || 'Unknown',
            createdAt: req.submittedAt,
            isRequest: true,
            requestId: req._id,
            sellerId: req.sellerId,
            productId: req.productId,
            rejectionReason: req.rejectionReason,
            images: req.images || [], // ADD IMAGES
            productImage: req.productImage // ADD SINGLE IMAGE
          }))
          setProducts(transformed)
          setTotalPages(data.totalPages || 1)
        } else {
          setProducts(data.products || [])
          setTotalPages(data.totalPages || 1)
        }
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (product) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(
        getApiUrl(`sellers/admin/listing-requests/${product.sellerId}/${product.requestId}/approve`),
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (response.ok) {
        alert('✅ Approved successfully!')
        fetchProducts()
        loadStats()
      } else {
        const data = await response.json()
        alert('❌ ' + data.message)
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
      const response = await fetch(
        getApiUrl(`sellers/admin/listing-requests/${product.sellerId}/${product.requestId}/reject`),
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reason })
        }
      )

      if (response.ok) {
        alert('✅ Rejected successfully')
        fetchProducts()
        loadStats()
      } else {
        const data = await response.json()
        alert('❌ ' + data.message)
      }
    } catch (error) {
      console.error('Reject error:', error)
      alert('❌ Failed to reject')
    }
  }

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Approve ${selectedIds.length} selected product(s)?`)) return

    setBulkLoading(true)
    const token = localStorage.getItem('adminToken')
    let successCount = 0
    let failCount = 0

    for (const id of selectedIds) {
      const product = products.find(p => p._id === id || p.requestId === id)
      if (!product) continue
      try {
        const response = await fetch(
          getApiUrl(`sellers/admin/listing-requests/${product.sellerId}/${product.requestId}/approve`),
          { method: 'PUT', headers: { 'Authorization': `Bearer ${token}` } }
        )
        if (response.ok) successCount++
        else failCount++
      } catch {
        failCount++
      }
    }

    setBulkLoading(false)
    alert(`✅ Approved: ${successCount}${failCount > 0 ? `  ❌ Failed: ${failCount}` : ''}`)
    setSelectedIds([])
    fetchProducts()
    loadStats()
  }

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return
    const reason = prompt(`Enter rejection reason for ${selectedIds.length} selected product(s):`)
    if (!reason) return
    if (!confirm(`Reject ${selectedIds.length} selected product(s)?`)) return

    setBulkLoading(true)
    const token = localStorage.getItem('adminToken')
    let successCount = 0
    let failCount = 0

    for (const id of selectedIds) {
      const product = products.find(p => p._id === id || p.requestId === id)
      if (!product) continue
      try {
        const response = await fetch(
          getApiUrl(`sellers/admin/listing-requests/${product.sellerId}/${product.requestId}/reject`),
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ reason })
          }
        )
        if (response.ok) successCount++
        else failCount++
      } catch {
        failCount++
      }
    }

    setBulkLoading(false)
    alert(`✅ Rejected: ${successCount}${failCount > 0 ? `  ❌ Failed: ${failCount}` : ''}`)
    setSelectedIds([])
    fetchProducts()
    loadStats()
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    const pendingIds = sortedProducts.filter(p => p.isRequest).map(p => p._id)
    if (selectedIds.length === pendingIds.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(pendingIds)
    }
  }

  const handleDelete = async (product) => {
    if (!confirm('⚠️ Delete this product?')) return

    try {
      const token = localStorage.getItem('adminToken')
      let url = ''

      if (product.isRequest) {
        url = `sellers/admin/listing-requests/${product.sellerId}/${product.requestId}`
      } else {
        url = `products/admin/${product._id}`
      }

      const response = await fetch(getApiUrl(url), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        alert('✅ Deleted successfully')
        fetchProducts()
        loadStats()
      } else {
        const data = await response.json()
        alert('❌ ' + data.message)
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('❌ Failed to delete')
    }
  }

  // Client-side sort
  const sortedProducts = [...products].sort((a, b) => {
    const sellerA = (a.seller?.username || a.sellerUsername || '').toLowerCase();
    const sellerB = (b.seller?.username || b.sellerUsername || '').toLowerCase();
    const priceA = parseFloat(a.sellerPrice || a.price || 0);
    const priceB = parseFloat(b.sellerPrice || b.price || 0);
    const dateA = new Date(a.createdAt || a.listedAt || 0);
    const dateB = new Date(b.createdAt || b.listedAt || 0);
    switch (sortBy) {
      case 'seller_asc':  return sellerA.localeCompare(sellerB);
      case 'seller_desc': return sellerB.localeCompare(sellerA);
      case 'price_asc':   return priceA - priceB;
      case 'price_desc':  return priceB - priceA;
      case 'date_asc':    return dateA - dateB;
      case 'date_desc':   return dateB - dateA;
      case 'name_asc':    return (a.name || '').localeCompare(b.name || '');
      case 'name_desc':   return (b.name || '').localeCompare(a.name || '');
      default:            return dateB - dateA;
    }
  });

  return (
    <div style={{ padding: '10px', maxWidth: '100%', margin: '0 auto' }}>
      {/* Responsive Styles */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        @media (max-width: 768px) {
          .seller-products-container {
            padding: 10px !important;
          }
          .seller-products-header {
            flex-direction: column !important;
            gap: 10px !important;
          }
          .seller-products-header h1 {
            font-size: 20px !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          .stat-card {
            padding: 8px 12px !important;
          }
          .stat-number {
            font-size: 20px !important;
          }
          .stat-label {
            font-size: 12px !important;
          }
          .filter-buttons {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .filter-button {
            width: 100% !important;
            padding: 8px 16px !important;
          }
          .products-table-wrapper {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .products-table {
            min-width: 700px !important;
          }
          .product-image {
            width: 50px !important;
            height: 50px !important;
          }
          .product-name {
            font-size: 13px !important;
          }
          .action-buttons {
            flex-direction: column !important;
            gap: 4px !important;
          }
          .action-button {
            width: 100% !important;
            font-size: 10px !important;
            padding: 4px 8px !important;
          }
        }
        
        @media (max-width: 480px) {
          .seller-products-header h1 {
            font-size: 18px !important;
          }
          .stat-number {
            font-size: 18px !important;
          }
          .stat-label {
            font-size: 11px !important;
          }
          .product-image {
            width: 40px !important;
            height: 40px !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="seller-products-header" style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '10px 16px',
        borderRadius: '8px',
        marginBottom: '10px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>🏪 Seller Products</h1>
          <button 
            onClick={() => navigate('/admin/dashboard')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ← Dashboard
          </button>
        </div>
      </div>

      {/* Stats - Compact Version */}
      <div className="stats-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '10px',
        marginBottom: '10px'
      }}>
        <div className="stat-card" style={{ background: '#fff3cd', padding: '8px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="stat-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#856404' }}>{stats.pending}</div>
          <div className="stat-label" style={{ color: '#856404', fontSize: '14px' }}>Pending</div>
        </div>
        <div className="stat-card" style={{ background: '#d4edda', padding: '10px 15px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="stat-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#155724' }}>{stats.approved}</div>
          <div className="stat-label" style={{ color: '#155724', fontSize: '14px' }}>Approved</div>
        </div>
        <div className="stat-card" style={{ background: '#f8d7da', padding: '10px 15px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="stat-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#721c24' }}>{stats.rejected}</div>
          <div className="stat-label" style={{ color: '#721c24', fontSize: '14px' }}>Rejected</div>
        </div>
        <div className="stat-card" style={{ background: '#d1ecf1', padding: '10px 15px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="stat-number" style={{ fontSize: '24px', fontWeight: 'bold', color: '#0c5460' }}>{stats.total}</div>
          <div className="stat-label" style={{ color: '#0c5460', fontSize: '14px' }}>Total</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-buttons" style={{ 
        background: 'white',
        padding: '10px 15px',
        borderRadius: '8px',
        marginBottom: '10px',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <button
          className="filter-button"
          onClick={() => setFilter('pending')}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            background: filter === 'pending' ? '#ffc107' : '#f8f9fa',
            color: filter === 'pending' ? 'white' : '#333',
            fontWeight: filter === 'pending' ? 'bold' : 'normal'
          }}
        >
          ⏳ Pending ({stats.pending})
        </button>
        <button
          className="filter-button"
          onClick={() => setFilter('approved')}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            background: filter === 'approved' ? '#28a745' : '#f8f9fa',
            color: filter === 'approved' ? 'white' : '#333',
            fontWeight: filter === 'approved' ? 'bold' : 'normal'
          }}
        >
          ✅ Approved ({stats.approved})
        </button>
        <button
          className="filter-button"
          onClick={() => setFilter('rejected')}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            background: filter === 'rejected' ? '#dc3545' : '#f8f9fa',
            color: filter === 'rejected' ? 'white' : '#333',
            fontWeight: filter === 'rejected' ? 'bold' : 'normal'
          }}
        >
          ❌ Rejected ({stats.rejected})
        </button>
        <button
          className="filter-button"
          onClick={() => setFilter('all')}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            background: filter === 'all' ? '#17a2b8' : '#f8f9fa',
            color: filter === 'all' ? 'white' : '#333',
            fontWeight: filter === 'all' ? 'bold' : 'normal'
          }}
        >
          📋 All ({stats.total})
        </button>
      </div>

      {/* Seller + Sort + Per Page — all on one line */}
      <div style={{ background: 'white', padding: '8px 15px', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 180px', minWidth: 0 }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#495057', whiteSpace: 'nowrap' }}>👤 Seller:</span>
          <select
            value={sellerFilter}
            onChange={e => setSellerFilter(e.target.value)}
            style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #dee2e6', fontSize: '13px', cursor: 'pointer', background: '#fff', flex: 1, minWidth: 0 }}
          >
            <option value="all">All Sellers</option>
            {sellers.map(s => (
              <option key={s._id} value={s._id}>
                {s.username || s.businessName || s.email}
              </option>
            ))}
          </select>
          {sellerFilter !== 'all' && (
            <button
              onClick={() => setSellerFilter('all')}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #dee2e6', background: '#f8f9fa', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}
            >
              ✕
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 160px', minWidth: 0 }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#495057', whiteSpace: 'nowrap' }}>⇅ Sort by:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #dee2e6', fontSize: '13px', cursor: 'pointer', background: '#fff', flex: 1, minWidth: 0 }}
          >
            <option value="date_desc">Date (Newest first)</option>
            <option value="date_asc">Date (Oldest first)</option>
            <option value="seller_asc">Seller (A → Z)</option>
            <option value="seller_desc">Seller (Z → A)</option>
            <option value="name_asc">Name (A → Z)</option>
            <option value="name_desc">Name (Z → A)</option>
            <option value="price_asc">Price (Low → High)</option>
            <option value="price_desc">Price (High → Low)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#495057', whiteSpace: 'nowrap' }}>📄 Per page:</span>
          <select
            value={itemsPerPage}
            onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #dee2e6', fontSize: '13px', cursor: 'pointer', background: '#fff', width: '75px' }}
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={300}>300</option>
            <option value={500}>500</option>
          </select>
        </div>

        <span style={{ fontSize: '12px', color: '#888', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Bulk Actions Bar — only shown in pending tab when items are selected */}
      {filter === 'pending' && selectedIds.length > 0 && (
        <div style={{ background: '#e8f4fd', border: '1px solid #bee5eb', padding: '10px 15px', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#0c5460' }}>
            {selectedIds.length} selected
          </span>
          <button
            onClick={handleBulkApprove}
            disabled={bulkLoading}
            style={{
              padding: '6px 16px', borderRadius: '6px', border: 'none',
              background: bulkLoading ? '#aaa' : '#28a745', color: 'white',
              cursor: bulkLoading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600'
            }}
          >
            {bulkLoading ? '⏳ Processing...' : `✓ Approve Selected (${selectedIds.length})`}
          </button>
          <button
            onClick={handleBulkReject}
            disabled={bulkLoading}
            style={{
              padding: '6px 16px', borderRadius: '6px', border: 'none',
              background: bulkLoading ? '#aaa' : '#dc3545', color: 'white',
              cursor: bulkLoading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600'
            }}
          >
            {bulkLoading ? '⏳ Processing...' : `✗ Reject Selected (${selectedIds.length})`}
          </button>
          <button
            onClick={() => setSelectedIds([])}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #aaa', background: 'white', cursor: 'pointer', fontSize: '13px' }}
          >
            ✕ Deselect All
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '10px', textAlign: 'left', width: '70px' }}>IMAGE</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>PRODUCT</th>
                <th style={{ padding: '10px', textAlign: 'left', width: '100px' }}>SELLER</th>
                <th style={{ padding: '10px', textAlign: 'center', width: '120px' }}>COUNTRY</th>
                <th style={{ padding: '10px', textAlign: 'right', width: '70px' }}>PRICE</th>
                <th style={{ padding: '10px', textAlign: 'center', width: '80px' }}>STATUS</th>
                <th style={{ padding: '10px', textAlign: 'center', width: '180px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map(i => (
                <tr key={i} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '10px' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                      borderRadius: '4px'
                    }} />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{
                      width: '80%',
                      height: '16px',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }} />
                    <div style={{
                      width: '40%',
                      height: '12px',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                      borderRadius: '4px'
                    }} />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{
                      width: '90%',
                      height: '14px',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                      borderRadius: '4px'
                    }} />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{
                      width: '60px',
                      height: '14px',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                      borderRadius: '4px',
                      marginLeft: 'auto'
                    }} />
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <div style={{
                      width: '70px',
                      height: '24px',
                      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite',
                      borderRadius: '12px',
                      margin: '0 auto'
                    }} />
                  </td>
                  <td style={{ padding: '10px' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      <div style={{
                        width: '70px',
                        height: '28px',
                        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite',
                        borderRadius: '4px'
                      }} />
                      <div style={{
                        width: '70px',
                        height: '28px',
                        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite',
                        borderRadius: '4px'
                      }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <style>{`
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
          `}</style>
        </div>
      )}

      {/* Products Table */}
      {!loading && products.length > 0 && (
        <div className="products-table-wrapper" style={{ background: 'white', borderRadius: '8px', overflow: 'auto' }}>
          <table className="products-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                {filter === 'pending' && (
                  <th style={{ padding: '10px', textAlign: 'center', width: '36px' }}>
                    <input
                      type="checkbox"
                      title="Select all on this page"
                      checked={sortedProducts.filter(p => p.isRequest).length > 0 && sortedProducts.filter(p => p.isRequest).every(p => selectedIds.includes(p._id))}
                      onChange={toggleSelectAll}
                      style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#28a745' }}
                    />
                  </th>
                )}
                <th style={{ padding: '10px', textAlign: 'left', width: '70px' }}>IMAGE</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>PRODUCT</th>
                <th style={{ padding: '10px', textAlign: 'left', width: '100px' }}>SELLER</th>
                <th style={{ padding: '10px', textAlign: 'center', width: '120px' }}>COUNTRY</th>
                <th style={{ padding: '10px', textAlign: 'right', width: '70px' }}>PRICE</th>
                <th style={{ padding: '10px', textAlign: 'center', width: '80px' }}>STATUS</th>
                <th style={{ padding: '10px', textAlign: 'center', width: '180px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {sortedProducts.map(product => {
                // Get the first image from various possible sources
                const imageUrl = product.images?.[0] || 
                                product.image || 
                                product.productImage || 
                                (product.images && typeof product.images === 'string' ? product.images : null);
                
                return (
                  <tr key={product._id} style={{ borderBottom: '1px solid #dee2e6', background: selectedIds.includes(product._id) ? '#f0fff4' : 'white' }}>
                    {filter === 'pending' && (
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        {product.isRequest && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(product._id)}
                            onChange={() => toggleSelect(product._id)}
                            style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#28a745' }}
                          />
                        )}
                      </td>
                    )}
                    <td style={{ padding: '10px' }}>
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={product.name}
                          className="product-image"
                          style={{ 
                            width: '60px', 
                            height: '60px', 
                            objectFit: 'cover', 
                            borderRadius: '4px',
                            border: '1px solid #dee2e6',
                            display: 'block'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div style={{
                        width: '60px',
                        height: '60px',
                        background: '#f8f9fa',
                        borderRadius: '4px',
                        display: imageUrl ? 'none' : 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        color: '#dee2e6'
                      }}>
                        📦
                      </div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div className="product-name" style={{ fontWeight: '500', fontSize: '14px', marginBottom: '4px' }}>
                        {product.name.length > 150 ? product.name.substring(0, 150) + '...' : product.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {new Date(product.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ padding: '10px', fontSize: '13px' }}>
                      {product.seller?.username || product.sellerUsername || product.seller || 'Unknown'}
                    </td>
                    {/* Country column — read-only flag display */}
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      {(() => {
                        // For admin_product_listing, get listingCountries from the seller entry
                        const countries = product.listingCountries ||
                          (product.sellers?.find(s => s.sellerId?.toString() === product.seller?._id?.toString())?.listingCountries) ||
                          [];
                        if (!countries || countries.length === 0) {
                          return <span style={{ fontSize: '11px', color: '#888' }}>🌍 All</span>;
                        }
                        return (
                          <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {countries.map(c => (
                              <span key={c} title={COUNTRY_LABEL[c] || c}
                                style={{ fontSize: '16px', lineHeight: 1 }}>
                                {countryFlag(c)}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>
                      £{parseFloat(product.price || product.sellerPrice || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        background: 
                          product.status === 'pending_approval' || filter === 'pending' ? '#fff3cd' :
                          product.approvalStatus === 'approved' || filter === 'approved' ? '#d4edda' :
                          '#f8d7da',
                        color:
                          product.status === 'pending_approval' || filter === 'pending' ? '#856404' :
                          product.approvalStatus === 'approved' || filter === 'approved' ? '#155724' :
                          '#721c24'
                      }}>
                        {filter === 'pending' ? 'Pending' : filter === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <div className="action-buttons" style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {filter === 'pending' && (
                          <>
                            <button
                              className="action-button"
                              onClick={() => handleApprove(product)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '4px',
                                border: 'none',
                                background: '#28a745',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: '500'
                              }}
                            >
                              ✓ Approve
                            </button>
                            <button
                              className="action-button"
                              onClick={() => handleReject(product)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '4px',
                                border: 'none',
                                background: '#dc3545',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: '500'
                              }}
                            >
                              ✗ Reject
                            </button>
                          </>
                        )}
                        <button
                          className="action-button"
                          onClick={() => handleDelete(product)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '4px',
                            border: '1px solid #dc3545',
                            background: 'white',
                            color: '#dc3545',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '500'
                          }}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && products.length === 0 && (
        <div style={{ 
          background: 'white',
          padding: '60px 20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📦</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>
            No products found
          </div>
          <div style={{ color: '#666' }}>
            No seller products in {filter} status
          </div>
        </div>
      )}

      {/* Pagination with Page Numbers */}
      {!loading && products.length > 0 && totalPages > 1 && (
        <div style={{
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '5px',
          flexWrap: 'wrap'
        }}>
          {/* First Button */}
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #dee2e6',
              background: currentPage === 1 ? '#f8f9fa' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            ⏮ First
          </button>

          {/* Previous Button */}
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #dee2e6',
              background: currentPage === 1 ? '#f8f9fa' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            ← Prev
          </button>

          {/* Page Numbers */}
          {(() => {
            const pages = [];
            const maxVisible = 5; // Show max 5 page numbers
            let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
            let endPage = Math.min(totalPages, startPage + maxVisible - 1);
            
            // Adjust start if we're near the end
            if (endPage - startPage < maxVisible - 1) {
              startPage = Math.max(1, endPage - maxVisible + 1);
            }

            // First page + ellipsis
            if (startPage > 1) {
              pages.push(
                <button
                  key={1}
                  onClick={() => setCurrentPage(1)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #dee2e6',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  1
                </button>
              );
              if (startPage > 2) {
                pages.push(<span key="ellipsis1" style={{ padding: '0 5px' }}>...</span>);
              }
            }

            // Page numbers
            for (let i = startPage; i <= endPage; i++) {
              pages.push(
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #dee2e6',
                    background: currentPage === i ? '#667eea' : 'white',
                    color: currentPage === i ? 'white' : '#333',
                    cursor: 'pointer',
                    fontWeight: currentPage === i ? 'bold' : 'normal',
                    fontSize: '14px'
                  }}
                >
                  {i}
                </button>
              );
            }

            // Ellipsis + last page
            if (endPage < totalPages) {
              if (endPage < totalPages - 1) {
                pages.push(<span key="ellipsis2" style={{ padding: '0 5px' }}>...</span>);
              }
              pages.push(
                <button
                  key={totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #dee2e6',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {totalPages}
                </button>
              );
            }

            return pages;
          })()}

          {/* Next Button */}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #dee2e6',
              background: currentPage === totalPages ? '#f8f9fa' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Next →
          </button>

          {/* Last Button */}
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #dee2e6',
              background: currentPage === totalPages ? '#f8f9fa' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
          >
            Last ⏭
          </button>
        </div>
      )}
    </div>
  )
}

export default SellerProductsSimple
