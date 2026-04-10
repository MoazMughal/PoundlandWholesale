import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSeller } from '../../context/SellerContext'
import ProductImage from '../../components/ProductImage'
import '../../styles/dashboard-responsive.css'
import { getApiUrl } from '../../utils/api'

const AdminProducts = () => {
  const navigate = useNavigate()
  const { seller, isLoggedIn, loading: authLoading, authResolved } = useSeller()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchHistory, setSearchHistory] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [categories, setCategories] = useState([])
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [productsPerPage, setProductsPerPage] = useState(100)

  useEffect(() => {
    // Load search history from localStorage
    const savedHistory = localStorage.getItem('adminProductsSearchHistory')
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory))
    }
  }, [])

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    // Wait for authentication to be resolved before checking login status
    if (!authResolved || authLoading) {
      return
    }

    if (!isLoggedIn || !seller) {
      navigate('/login/supplier')
      return
    }

    if (!(seller?.canListProducts || seller?.verificationStatus === 'approved' || seller?.status === 'active')) {
      console.log('🚫 Seller cannot list products:', {
        canListProducts: seller?.canListProducts,
        verificationStatus: seller?.verificationStatus,
        status: seller?.status
      })
      navigate('/seller/dashboard')
      return
    }

    fetchCategories()
    fetchAdminProducts()
  }, [isLoggedIn, seller, currentPage, searchQuery, selectedCategory, productsPerPage])

  const fetchCategories = async () => {
    try {
      const response = await fetch(getApiUrl('products/public/categories?includeCounts=true&includeEmpty=true&deduplicate=true'))
      if (response.ok) {
        const data = await response.json()
        // Ensure we have the "All" category first
        const allCategories = [
          { value: 'all', label: 'All Categories', count: data.totalCount || 0 },
          ...(data.categories || []).filter(cat => cat.value !== 'all')
        ]
        setCategories(allCategories)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      // Fallback categories
      setCategories([
        { value: 'all', label: 'All Categories' },
        { value: 'electronics', label: 'Electronics' },
        { value: 'jewelry', label: 'Jewelry' },
        { value: 'home', label: 'Home & Decor' },
        { value: 'automotive', label: 'Automotive' },
        { value: 'party', label: 'Party Supplies' },
        { value: 'beauty', label: 'Beauty & Personal Care' },
        { value: 'sports', label: 'Sports & Outdoors' },
        { value: 'toys', label: 'Toys & Games' },
        { value: 'books', label: 'Books' },
        { value: 'clothing', label: 'Clothing & Accessories' }
      ])
    }
  }

  const fetchAdminProducts = async () => {
    try {
      setLoading(true)
      setIsSearching(!!searchQuery)
      const token = localStorage.getItem('sellerToken')
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: productsPerPage,
        ...(searchQuery && { search: searchQuery }),
        ...(selectedCategory !== 'all' && { category: selectedCategory })
      })

      const response = await fetch(getApiUrl(`products/admin/available?${params}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Products are already sorted by relevance on server for search results
        setProducts(data.products || [])
        setTotalPages(data.totalPages || 1)
        setTotalProducts(data.totalProducts || 0)
        
        // Save search term to history if it's a search and has results
        if (searchQuery && data.products && data.products.length > 0) {
          saveSearchToHistory(searchQuery)
        }
      } else {
        console.error('Failed to fetch admin products')
        setProducts([])
        setTotalPages(1)
        setTotalProducts(0)
      }
    } catch (error) {
      console.error('Error fetching admin products:', error)
      setProducts([])
      setTotalPages(1)
      setTotalProducts(0)
    } finally {
      setLoading(false)
      setIsSearching(false)
    }
  }

  // Listing request modal state (same as AmazonsChoice)
  const [listingModal, setListingModal] = useState({ open: false, product: null })
  const [listingForm, setListingForm] = useState({ price: '', shipping: '0.00', moq: '1', notes: '', listingCountries: [] })
  const [listingSubmitting, setListingSubmitting] = useState(false)
  const [listingSuccess, setListingSuccess] = useState(false)

  const handleListProduct = (product) => {
    const rawPrice = parseFloat(product.price) || 0
    const lowestPrice = product.sellers && product.sellers.length > 0
      ? Math.min(...product.sellers.map(s => parseFloat(s.sellerPrice) || rawPrice))
      : rawPrice
    setListingForm({
      price: lowestPrice > 0 ? Math.max(0.01, lowestPrice - 0.01).toFixed(2) : rawPrice.toFixed(2),
      shipping: parseFloat(product.shipping || 0).toFixed(2),
      moq: '1',
      notes: '',
      listingCountries: []
    })
    setListingSuccess(false)
    setListingModal({ open: true, product })
  }

  const handleListingSubmit = async () => {
    const { product } = listingModal
    const rawPrice = parseFloat(product.price) || 0
    const sellerPrice = parseFloat(listingForm.price)
    const sellerShipping = parseFloat(listingForm.shipping)
    const sellerMoq = parseInt(listingForm.moq)
    if (isNaN(sellerPrice) || sellerPrice <= 0) { alert('❌ Please enter a valid price.'); return }
    if (isNaN(sellerShipping) || sellerShipping < 0) { alert('❌ Please enter a valid shipping cost.'); return }
    if (isNaN(sellerMoq) || sellerMoq < 1) { alert('❌ MOQ must be at least 1.'); return }
    setListingSubmitting(true)
    try {
      const token = localStorage.getItem('sellerToken')
      const response = await fetch(getApiUrl('sellers/request-admin-product-listing'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          adminProductId: product._id,
          productName: product.name,
          productPrice: rawPrice,
          sellerPrice,
          sellerShipping,
          moq: sellerMoq,
          listingCountries: listingForm.listingCountries || [],
          notes: listingForm.notes || `Seller requested to list "${product.name}" at £${sellerPrice.toFixed(2)} + £${sellerShipping.toFixed(2)} shipping, MOQ: ${sellerMoq}`
        })
      })
      const data = await response.json()
      if (response.ok) {
        setListingSuccess(true)
        fetchAdminProducts()
      } else {
        if (data.error === 'REQUEST_EXISTS') alert('⚠️ You already have a pending or approved request for this product.')
        else if (data.error === 'ALREADY_LISTED') alert('⚠️ You have already listed this product.')
        else alert('❌ ' + (data.message || 'Failed to submit listing request'))
      }
    } catch (err) {
      console.error('List product request error:', err)
      alert('❌ Failed to submit listing request')
    } finally {
      setListingSubmitting(false)
    }
  }
  const handleEditProduct = (product) => {
    // Navigate to seller edit page with product data
    navigate(`/seller/edit-product/${product._id}`, {
      state: { 
        product: product,
        returnTo: '/seller/admin-products',
        isSellerEdit: true
      }
    })
  }

  // Check if current seller has already listed this product
  const isAlreadyListed = (product) => {
    if (!seller || !product.sellers) return false
    return product.sellers.some(s => s.sellerId?.toString() === seller._id?.toString())
  }

  const saveSearchToHistory = (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) return
    
    const newHistory = [searchTerm, ...searchHistory.filter(term => term !== searchTerm)].slice(0, 10)
    setSearchHistory(newHistory)
    localStorage.setItem('adminProductsSearchHistory', JSON.stringify(newHistory))
  }

  const clearSearchHistory = () => {
    setSearchHistory([])
    localStorage.removeItem('adminProductsSearchHistory')
  }

  const fetchSearchSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setSearchSuggestions([])
      return
    }

    try {
      const token = localStorage.getItem('sellerToken')
      const response = await fetch(getApiUrl(`products/admin/search-suggestions?q=${encodeURIComponent(query)}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSearchSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error('Error fetching search suggestions:', error)
    }
  }

  const handleSearchInputChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)
    
    // Debounce search suggestions
    clearTimeout(window.searchSuggestionsTimeout)
    window.searchSuggestionsTimeout = setTimeout(() => {
      fetchSearchSuggestions(value)
    }, 300)
    
    setShowSuggestions(true)
  }

  const handleSearch = (e, searchTerm = null) => {
    e?.preventDefault()
    const term = searchTerm || searchQuery
    setSearchQuery(term)
    setCurrentPage(1)
    setShowSuggestions(false)
    fetchAdminProducts()

    // Track seller search for admin analytics
    if (term && term.trim().length >= 2) {
      try {
        // authManager stores all data in localStorage regardless of user type
        const sellerData = (() => {
          try {
            const raw = localStorage.getItem('sellerData');
            return raw ? JSON.parse(raw) : null;
          } catch { return null; }
        })();
        const sellerName = sellerData?.username || sellerData?.businessName || sellerData?.name || '';
        const sellerEmail = sellerData?.email || '';
        const sellerId = sellerData?._id || sellerData?.id || '';
        fetch(getApiUrl('products/public/search-log'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: term.trim(),
            page: 'seller-products',
            buyerId: sellerId,
            buyerName: sellerName || 'Unknown Seller',
            buyerEmail: sellerEmail
          })
        }).catch(() => {});
      } catch (_) {}
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchSuggestions([])
    setShowSuggestions(false)
    setCurrentPage(1)
    fetchAdminProducts()
  }

  const getGridColumns = () => {
    if (windowWidth < 576) return 'repeat(2, 1fr)' // Mobile: 2 columns
    if (windowWidth < 768) return 'repeat(3, 1fr)' // Small tablet: 3 columns
    if (windowWidth < 992) return 'repeat(4, 1fr)' // Tablet: 4 columns
    if (windowWidth < 1200) return 'repeat(5, 1fr)' // Small desktop: 5 columns
    if (windowWidth < 1400) return 'repeat(6, 1fr)' // Medium desktop: 6 columns
    if (windowWidth < 1600) return 'repeat(7, 1fr)' // Large desktop: 7 columns
    return 'repeat(8, 1fr)' // Extra large: 8 columns
  }

  const renderPagination = () => {
    const maxVisiblePages = windowWidth < 768 ? 5 : 10
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
    const adjustedStartPage = Math.max(1, endPage - maxVisiblePages + 1)

    const pages = []
    
    // First page
    if (adjustedStartPage > 1) {
      pages.push(
        <button key={1} className={`page-btn ${currentPage === 1 ? 'active' : ''}`} onClick={() => setCurrentPage(1)}>
          1
        </button>
      )
      if (adjustedStartPage > 2) {
        pages.push(<span key="start-ellipsis" className="page-ellipsis">...</span>)
      }
    }

    // Visible pages
    for (let i = adjustedStartPage; i <= endPage; i++) {
      pages.push(
        <button key={i} className={`page-btn ${currentPage === i ? 'active' : ''}`} onClick={() => setCurrentPage(i)}>
          {i}
        </button>
      )
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="end-ellipsis" className="page-ellipsis">...</span>)
      }
      pages.push(
        <button key={totalPages} className={`page-btn ${currentPage === totalPages ? 'active' : ''}`} onClick={() => setCurrentPage(totalPages)}>
          {totalPages}
        </button>
      )
    }

    return pages
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
          <h5 style={{ color: '#6c757d', marginBottom: '10px' }}>Loading Products...</h5>
          <p style={{ color: '#adb5bd', fontSize: '14px' }}>Fetching Amazon's Choice products</p>
        </div>
      </div>
    )
  }

  const COUNTRY_OPTIONS = [
    { code: 'GBP', flag: '🇬🇧', label: 'UK (£ GBP)' },
    { code: 'PKR', flag: '🇵🇰', label: 'Pakistan (Rs PKR)' },
    { code: 'AED', flag: '🇦🇪', label: 'UAE (د.إ AED)' },
    { code: 'USD', flag: '🇺🇸', label: 'USA ($ USD)' }
  ]
  const COUNTRY_LABEL = { GBP: '🇬🇧 UK', PKR: '🇵🇰 Pakistan', AED: '🇦🇪 UAE', USD: '🇺🇸 USA' }

  return (
    <>
    {/* ── Request-to-List Modal ── */}
    {listingModal.open && listingModal.product && (
      <div onClick={() => !listingSubmitting && setListingModal({ open: false, product: null })}
        style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div onClick={e => e.stopPropagation()}
          style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', maxHeight: '90vh', overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #ff6600 0%, #ff8533 100%)', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-paper-plane" style={{ color: '#fff', fontSize: '15px' }}></i>
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: '700', fontSize: '15px' }}>Request to List</div>
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px' }}>Submit for admin approval</div>
              </div>
            </div>
            <button onClick={() => !listingSubmitting && setListingModal({ open: false, product: null })}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px' }}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          {listingSuccess ? (
            <div style={{ padding: '36px 24px', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #28a745, #20c997)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 8px 20px rgba(40,167,69,0.35)' }}>
                <i className="fas fa-check" style={{ color: '#fff', fontSize: '24px' }}></i>
              </div>
              <h5 style={{ fontWeight: '700', marginBottom: '6px' }}>Request Submitted!</h5>
              <p style={{ color: '#666', fontSize: '13px', marginBottom: '14px' }}>
                <strong style={{ color: '#ff6600' }}>{listingModal.product.name}</strong>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                {[
                  { label: 'Price', value: `£${parseFloat(listingForm.price).toFixed(2)}`, icon: 'fa-tag', color: '#28a745' },
                  { label: 'Shipping', value: `£${parseFloat(listingForm.shipping).toFixed(2)}`, icon: 'fa-truck', color: '#007bff' },
                  { label: 'MOQ', value: `${listingForm.moq} units`, icon: 'fa-boxes', color: '#6f42c1' },
                  { label: 'Countries', value: listingForm.listingCountries.length === 0 ? '🌍 All' : listingForm.listingCountries.map(c => ({ GBP: '🇬🇧', PKR: '🇵🇰', AED: '🇦🇪', USD: '🇺🇸' })[c]).join(' '), icon: 'fa-globe', color: '#ff6600' }
                ].map(item => (
                  <div key={item.label} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '10px', textAlign: 'center', border: `1px solid ${item.color}22` }}>
                    <i className={`fas ${item.icon}`} style={{ color: item.color, fontSize: '13px', marginBottom: '3px', display: 'block' }}></i>
                    <div style={{ fontSize: '13px', fontWeight: '700' }}>{item.value}</div>
                    <div style={{ fontSize: '10px', color: '#888' }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#fff8e1', border: '1px solid #ffc107', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#856404', marginBottom: '16px' }}>
                <i className="fas fa-clock" style={{ marginRight: '5px' }}></i>Pending admin approval.
              </div>
              <button onClick={() => setListingModal({ open: false, product: null })}
                style={{ background: 'linear-gradient(135deg, #ff6600, #ff8533)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 28px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                Done
              </button>
            </div>
          ) : (
            <div style={{ padding: '20px 22px 22px' }}>
              {/* Product strip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8f9fa', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', border: '1px solid #e9ecef' }}>
                {listingModal.product.images && listingModal.product.images[0] && (
                  <img src={listingModal.product.images[0]} alt="" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '6px', background: '#fff', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{listingModal.product.name}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>Admin price: <strong style={{ color: '#ff6600' }}>£{parseFloat(listingModal.product.price || 0).toFixed(2)}</strong></div>
                </div>
              </div>

              {/* Existing sellers */}
              {listingModal.product.sellers && listingModal.product.sellers.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#495057', marginBottom: '5px', textTransform: 'uppercase' }}>
                    <i className="fas fa-users" style={{ marginRight: '4px', color: '#ff6600' }}></i>Current Sellers
                  </div>
                  <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #e9ecef' }}>
                    {listingModal.product.sellers.slice().sort((a,b) => (parseFloat(a.sellerPrice)||0)-(parseFloat(b.sellerPrice)||0)).map((s, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: i===0?'#f0fff4':i%2===0?'#fff':'#fafafa', borderBottom: i<listingModal.product.sellers.length-1?'1px solid #e9ecef':'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {i===0 && <span style={{ fontSize: '8px', background: '#28a745', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontWeight: '700' }}>LOWEST</span>}
                          <span style={{ fontSize: '12px', color: '#495057' }}>{s.username}</span>
                          {s.listingCountries && s.listingCountries.length > 0 && (
                            <span style={{ fontSize: '9px', background: '#e9ecef', color: '#495057', padding: '1px 4px', borderRadius: '3px' }}>
                              {s.listingCountries.map(c => ({ GBP: '🇬🇧', PKR: '🇵🇰', AED: '🇦🇪', USD: '🇺🇸' })[c]).join('')}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: i===0?'#28a745':'#495057' }}>£{(parseFloat(s.sellerPrice)||parseFloat(listingModal.product.price)||0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Price + Shipping */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#495057', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                    <i className="fas fa-tag" style={{ marginRight: '4px', color: '#28a745' }}></i>Price (£) <span style={{ color: '#dc3545' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', fontSize: '14px', pointerEvents: 'none' }}>£</span>
                    <input type="number" min="0.01" step="0.01" value={listingForm.price} onChange={e => setListingForm(f => ({ ...f, price: e.target.value }))}
                      style={{ width: '100%', padding: '9px 10px 9px 22px', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: '14px', fontWeight: '600', outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor='#ff6600'} onBlur={e => e.target.style.borderColor='#e9ecef'} placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#495057', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                    <i className="fas fa-truck" style={{ marginRight: '4px', color: '#007bff' }}></i>Shipping (£)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', fontSize: '14px', pointerEvents: 'none' }}>£</span>
                    <input type="number" min="0" step="0.01" value={listingForm.shipping} onChange={e => setListingForm(f => ({ ...f, shipping: e.target.value }))}
                      style={{ width: '100%', padding: '9px 10px 9px 22px', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: '14px', fontWeight: '600', outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor='#007bff'} onBlur={e => e.target.style.borderColor='#e9ecef'} placeholder="0.00" />
                  </div>
                </div>
              </div>

              {/* MOQ */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#495057', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                  <i className="fas fa-boxes" style={{ marginRight: '4px', color: '#6f42c1' }}></i>MOQ <span style={{ color: '#dc3545' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button type="button" onClick={() => setListingForm(f => ({ ...f, moq: String(Math.max(1, parseInt(f.moq||1)-1)) }))}
                    style={{ width: '34px', height: '34px', borderRadius: '8px', border: '2px solid #e9ecef', background: '#f8f9fa', fontSize: '16px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <input type="number" min="1" value={listingForm.moq} onChange={e => setListingForm(f => ({ ...f, moq: e.target.value }))}
                    style={{ flex: 1, padding: '9px 10px', textAlign: 'center', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: '14px', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor='#6f42c1'} onBlur={e => e.target.style.borderColor='#e9ecef'} />
                  <button type="button" onClick={() => setListingForm(f => ({ ...f, moq: String(parseInt(f.moq||1)+1) }))}
                    style={{ width: '34px', height: '34px', borderRadius: '8px', border: '2px solid #e9ecef', background: '#f8f9fa', fontSize: '16px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>

              {/* Country selector - multi-select */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#495057', display: 'block', marginBottom: '5px', textTransform: 'uppercase' }}>
                  <i className="fas fa-globe" style={{ marginRight: '4px', color: '#ff6600' }}></i>
                  List For Countries <span style={{ fontSize: '10px', color: '#aaa', textTransform: 'none', fontWeight: '400' }}>(select one or more — empty = all)</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {COUNTRY_OPTIONS.filter(c => c.code).map(c => {
                    const selected = listingForm.listingCountries.includes(c.code)
                    return (
                      <button key={c.code} type="button"
                        onClick={() => setListingForm(f => ({
                          ...f,
                          listingCountries: selected
                            ? f.listingCountries.filter(x => x !== c.code)
                            : [...f.listingCountries, c.code]
                        }))}
                        style={{ padding: '8px 10px', borderRadius: '8px', border: selected ? '2px solid #ff6600' : '2px solid #e9ecef', background: selected ? '#fff5f0' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: selected ? '700' : '500', color: selected ? '#ff6600' : '#495057', transition: 'all 0.15s' }}>
                        <span style={{ fontSize: '15px' }}>{c.flag}</span>
                        <span>{c.label}</span>
                        {selected && <i className="fas fa-check-circle" style={{ marginLeft: 'auto', color: '#ff6600', fontSize: '11px' }}></i>}
                      </button>
                    )
                  })}
                </div>
                <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '3px' }}></i>
                  {listingForm.listingCountries.length === 0
                    ? 'No selection = visible in all countries.'
                    : `Visible only to buyers using: ${listingForm.listingCountries.join(', ')}`}
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#495057', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                  <i className="fas fa-comment-alt" style={{ marginRight: '4px', color: '#6c757d' }}></i>Notes <span style={{ fontSize: '10px', color: '#aaa', textTransform: 'none', fontWeight: '400' }}>(optional)</span>
                </label>
                <textarea rows={2} value={listingForm.notes} onChange={e => setListingForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional info for the admin..."
                  style={{ width: '100%', padding: '9px 12px', border: '2px solid #e9ecef', borderRadius: '8px', fontSize: '13px', resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  onFocus={e => e.target.style.borderColor='#6c757d'} onBlur={e => e.target.style.borderColor='#e9ecef'} />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setListingModal({ open: false, product: null })} disabled={listingSubmitting}
                  style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '2px solid #e9ecef', background: '#f8f9fa', color: '#6c757d', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleListingSubmit} disabled={listingSubmitting || !listingForm.price}
                  style={{ flex: 2, padding: '11px', borderRadius: '10px', border: 'none', background: listingSubmitting?'#adb5bd':'linear-gradient(135deg, #28a745 0%, #20c997 100%)', color: '#fff', fontWeight: '700', fontSize: '14px', cursor: listingSubmitting?'not-allowed':'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: listingSubmitting?'none':'0 4px 14px rgba(40,167,69,0.4)' }}>
                  {listingSubmitting ? <><i className="fas fa-spinner fa-spin"></i> Submitting...</> : <><i className="fas fa-paper-plane"></i> Submit Request</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

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
          
          /* Force ProductImage wrapper to fill the image container */
          .product-image .product-image-wrapper {
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          
          .product-image .product-image-wrapper img {
            max-width: 100% !important;
            max-height: 100% !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain !important;
          }
          
          .admin-products-container {
            max-width: 1800px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          
          .header-section {
            background: linear-gradient(135deg, #ff6600 0%, #ff8533 100%);
            color: white;
            padding: ${windowWidth < 768 ? '15px 20px' : '20px 30px'};
            text-align: center;
            min-height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .filters-section {
            padding: ${windowWidth < 768 ? '15px' : '25px'};
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
          }
          
          .search-input {
            flex: 1;
            padding: 12px 15px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.3s ease;
          }
          
          .search-input:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
          }
          
          .search-btn {
            padding: 12px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 8px;
            margin-left: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          
          .search-btn:hover {
            background: #0056b3;
            transform: translateY(-1px);
          }
          
          .category-select {
            padding: 12px 15px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 14px;
            background: white;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          
          .category-select:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
          }
          
          .products-grid {
            display: grid;
            grid-template-columns: ${getGridColumns()};
            gap: ${windowWidth < 768 ? '10px' : '15px'};
            padding: ${windowWidth < 768 ? '15px' : '25px'};
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
            width: 100%;
            min-height: ${windowWidth < 576 ? '280px' : '320px'};
            max-height: ${windowWidth < 576 ? '300px' : 'none'};
            box-sizing: border-box;
          }
          
          .product-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
          }
          
          .product-image {
            width: 100%;
            height: ${windowWidth < 576 ? '140px' : '160px'};
            flex-shrink: 0;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fff;
            padding: ${windowWidth < 576 ? '8px' : '12px'};
            overflow: visible;
            box-sizing: border-box;
          }
          
          .product-info {
            padding: ${windowWidth < 576 ? '4px 6px' : '8px 10px'};
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 3px;
            overflow: hidden;
            min-height: 0;
          }
          
          .product-title {
            font-size: ${windowWidth < 768 ? '10px' : '11px'};
            font-weight: 600;
            color: #2c3e50;
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-wrap: break-word;
            hyphens: auto;
            margin-bottom: 4px;
            flex-shrink: 0;
          }
          
          .product-category {
            background: #e9ecef;
            color: #6c757d;
            padding: 2px 5px;
            border-radius: 6px;
            font-size: ${windowWidth < 768 ? '7px' : '8px'};
            font-weight: 500;
            display: inline-block;
            width: fit-content;
            margin-bottom: 2px;
          }
          
          .product-price {
            font-size: ${windowWidth < 768 ? '12px' : '14px'};
            font-weight: bold;
            color: #28a745;
            margin-bottom: 2px;
          }
          
          .product-rating {
            font-size: ${windowWidth < 768 ? '7px' : '9px'};
            color: #6c757d;
            margin-bottom: 0px;
          }
          
          .action-buttons {
            display: flex;
            gap: 4px;
            margin-top: auto;
            padding: 6px 0 0 0;
            border-top: 1px solid #f0f0f0;
            background: white;
            flex-shrink: 0;
          }
          
          .list-btn {
            flex: 1;
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            border: none;
            padding: ${windowWidth < 768 ? '7px 5px' : '8px 6px'};
            border-radius: 5px;
            font-size: ${windowWidth < 768 ? '8px' : '9px'};
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2px;
            box-shadow: 0 2px 4px rgba(40,167,69,0.25);
            text-transform: uppercase;
            letter-spacing: 0.1px;
            min-height: 28px;
          }
          
          .list-btn:hover {
            background: linear-gradient(135deg, #20c997 0%, #28a745 100%);
            transform: translateY(-1px);
            box-shadow: 0 3px 8px rgba(40,167,69,0.35);
          }
          
          .edit-btn {
            flex: 0 0 auto;
            background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
            color: white;
            border: none;
            padding: ${windowWidth < 768 ? '7px 5px' : '8px 6px'};
            border-radius: 5px;
            font-size: ${windowWidth < 768 ? '8px' : '9px'};
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2px;
            box-shadow: 0 2px 4px rgba(0,123,255,0.25);
            min-width: ${windowWidth < 768 ? '45px' : '50px'};
            min-height: 28px;
          }
          
          .edit-btn:hover {
            background: linear-gradient(135deg, #0056b3 0%, #007bff 100%);
            transform: translateY(-1px);
            box-shadow: 0 3px 8px rgba(0,123,255,0.35);
          }
          
          .pagination-section {
            padding: ${windowWidth < 768 ? '15px' : '25px'};
            background: #f8f9fa;
            border-top: 1px solid #dee2e6;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }
          
          .page-btn {
            padding: 8px 12px;
            border: 2px solid #dee2e6;
            background: white;
            color: #6c757d;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
            min-width: 40px;
          }
          
          .page-btn:hover {
            border-color: #007bff;
            color: #007bff;
          }
          
          .page-btn.active {
            background: #007bff;
            color: white;
            border-color: #007bff;
          }
          
          .page-ellipsis {
            padding: 8px 4px;
            color: #6c757d;
          }
          
          .nav-btn {
            padding: 8px 15px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
          }
          
          .nav-btn:hover {
            background: #0056b3;
          }
          
          .nav-btn:disabled {
            background: #6c757d;
            cursor: not-allowed;
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
          
          @media (max-width: 767px) {
            .filters-section {
              padding: 15px;
            }
            
            .filters-section > div {
              margin-bottom: 15px;
            }
            
            .filters-section > div:last-child {
              margin-bottom: 0;
            }
          }
        `}
      </style>

      <div className="admin-products-container">
        {/* Header */}
        <div className="header-section">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '15px',
            width: '100%',
            maxWidth: '1200px'
          }}>
            <div style={{ textAlign: windowWidth < 768 ? 'center' : 'left', flex: 1 }}>
              <h2 style={{ 
                margin: '0 0 5px 0', 
                fontSize: windowWidth < 768 ? '18px' : '22px',
                color: 'white',
                fontWeight: '700'
              }}>
                <i className="fas fa-star" style={{ marginRight: '8px' }}></i>
                Amazon's Choice Products
              </h2>
              <p style={{ 
                margin: 0, 
                opacity: 0.95, 
                fontSize: windowWidth < 768 ? '12px' : '14px',
                color: 'white'
              }}>
                List verified products to your inventory
              </p>
            </div>
            <button 
              className="nav-btn" 
              onClick={() => navigate('/seller/dashboard')}
              style={{ 
                fontSize: windowWidth < 768 ? '12px' : '14px',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white'
              }}
            >
              <i className="fas fa-arrow-left" style={{ marginRight: '8px' }}></i>
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div style={{ 
            display: windowWidth < 768 ? 'block' : 'flex', 
            gap: '15px', 
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <form onSubmit={handleSearch} style={{ 
              display: 'flex', 
              flex: windowWidth < 768 ? 'none' : '1',
              marginBottom: windowWidth < 768 ? '15px' : '0',
              position: 'relative'
            }}>
              <div style={{ 
                position: 'relative', 
                flex: 1,
                display: 'flex'
              }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by Product Name, ASIN, SKU, Brand..."
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  style={{
                    paddingRight: searchQuery ? '40px' : '15px'
                  }}
                />
                
                {/* Clear search button */}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    style={{
                      position: 'absolute',
                      right: '50px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#6c757d',
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: '4px',
                      borderRadius: '50%',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#f8f9fa'
                      e.target.style.color = '#dc3545'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'none'
                      e.target.style.color = '#6c757d'
                    }}
                    title="Clear search"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
                
                {/* Search suggestions dropdown */}
                {showSuggestions && (searchSuggestions.length > 0 || searchHistory.length > 0) && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #e9ecef',
                    borderRadius: '0 0 8px 8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {/* Search History */}
                    {searchHistory.length > 0 && !searchQuery && (
                      <div>
                        <div style={{
                          padding: '8px 12px',
                          background: '#f8f9fa',
                          borderBottom: '1px solid #e9ecef',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#6c757d',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span><i className="fas fa-history" style={{marginRight: '4px'}}></i>Recent Searches</span>
                          <button
                            type="button"
                            onClick={clearSearchHistory}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc3545',
                              cursor: 'pointer',
                              fontSize: '10px',
                              padding: '2px 4px'
                            }}
                            title="Clear history"
                          >
                            Clear
                          </button>
                        </div>
                        {searchHistory.map((term, index) => (
                          <div
                            key={index}
                            onClick={() => handleSearch(null, term)}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              borderBottom: index < searchHistory.length - 1 ? '1px solid #f8f9fa' : 'none',
                              transition: 'background 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
                            onMouseLeave={(e) => e.target.style.background = 'white'}
                          >
                            <i className="fas fa-clock" style={{marginRight: '8px', color: '#6c757d', fontSize: '11px'}}></i>
                            {term}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Live Suggestions */}
                    {searchSuggestions.length > 0 && searchQuery && (
                      <div>
                        <div style={{
                          padding: '8px 12px',
                          background: '#f8f9fa',
                          borderBottom: '1px solid #e9ecef',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#6c757d'
                        }}>
                          <i className="fas fa-search" style={{marginRight: '4px'}}></i>Suggestions
                        </div>
                        {searchSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            onClick={() => handleSearch(null, suggestion.text)}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              borderBottom: index < searchSuggestions.length - 1 ? '1px solid #f8f9fa' : 'none',
                              transition: 'background 0.2s ease',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
                            onMouseLeave={(e) => e.target.style.background = 'white'}
                          >
                            <span>
                              <i className={`fas ${suggestion.type === 'asin' ? 'fa-barcode' : suggestion.type === 'sku' ? 'fa-tag' : 'fa-box'}`} 
                                 style={{marginRight: '8px', color: '#007bff', fontSize: '11px'}}></i>
                              {suggestion.text}
                            </span>
                            <span style={{fontSize: '10px', color: '#6c757d', textTransform: 'uppercase'}}>
                              {suggestion.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <button type="submit" className="search-btn" disabled={isSearching}>
                {isSearching ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-search"></i>
                )}
              </button>
            </form>
            
            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <select
                className="category-select"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value)
                  setCurrentPage(1)
                }}
                style={{ minWidth: windowWidth < 768 ? '150px' : '200px' }}
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label} {cat.count ? `(${cat.count})` : ''}
                  </option>
                ))}
              </select>
              
              <select
                className="category-select"
                value={productsPerPage}
                onChange={(e) => {
                  setProductsPerPage(parseInt(e.target.value))
                  setCurrentPage(1)
                }}
                style={{ minWidth: '80px' }}
              >
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={300}>300</option>
              </select>
            </div>
          </div>
          
          {totalProducts > 0 && (
            <div className="stats-info">
              {searchQuery ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span>
                    <i className="fas fa-search" style={{marginRight: '5px', color: '#007bff'}}></i>
                    Search results for "<strong>{searchQuery}</strong>": 
                    <strong style={{color: '#28a745', marginLeft: '5px'}}>{totalProducts}</strong> products found
                  </span>
                  <button
                    onClick={clearSearch}
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#c82333'}
                    onMouseLeave={(e) => e.target.style.background = '#dc3545'}
                  >
                    <i className="fas fa-times" style={{marginRight: '3px'}}></i>
                    Clear Search
                  </button>
                </div>
              ) : (
                <span>
                  Showing {((currentPage - 1) * productsPerPage) + 1} - {Math.min(currentPage * productsPerPage, totalProducts)} of {totalProducts} products
                </span>
              )}
            </div>
          )}
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="no-products">
            <i className="fas fa-box-open"></i>
            <h5>No products found</h5>
            <p>Try adjusting your search or category filter</p>
          </div>
        ) : (
          <div className="products-grid">
            {products.map(product => (
              <div key={product._id} className="product-card">
                <div style={{ position: 'relative' }}>
                  <a 
                    href={`/product/${product._id}`}
                    style={{ 
                      display: 'block',
                      textDecoration: 'none',
                      color: 'inherit'
                    }}
                  >
                    {product.images && product.images.length > 0 ? (
                      <div className="product-image">
                        <ProductImage
                          src={product.images[0]}
                          alt={product.name}
                          asin={product.asin}
                          fallbackSrc={product.images[1]}
                          loading="lazy"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                            padding: '0px',
                            margin: '0 auto',
                            display: 'block'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="product-image">
                        <i className="fas fa-image" style={{ fontSize: '28px', color: '#dee2e6' }}></i>
                      </div>
                    )}
                  </a>
                  
                  {/* Already listed indicator */}
                  {isAlreadyListed(product) && (
                    <div 
                      className="already-listed-badge"
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        zIndex: 2
                      }}
                    >
                      <i className="fas fa-check" style={{ marginRight: '2px' }}></i>
                      LISTED
                    </div>
                  )}
                </div>
                
                <div className="product-info">
                  <a 
                    href={`/product/${product._id}`}
                    style={{ 
                      textDecoration: 'none',
                      color: 'inherit'
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                  >
                    <div className="product-title" style={{ cursor: 'pointer' }}>{product.name}</div>
                  </a>
                  
                  <div className="product-category">{product.category}</div>
                  
                  {/* Search match indicators */}
                  {searchQuery && (
                    <div style={{
                      display: 'flex',
                      gap: '4px',
                      marginBottom: '4px',
                      flexWrap: 'wrap'
                    }}>
                      {product.asin && product.asin.toLowerCase().includes(searchQuery.toLowerCase()) && (
                        <span style={{
                          fontSize: '7px',
                          background: '#007bff',
                          color: 'white',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          fontWeight: '600'
                        }}>
                          ASIN: {product.asin}
                        </span>
                      )}
                      {product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()) && (
                        <span style={{
                          fontSize: '7px',
                          background: '#28a745',
                          color: 'white',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          fontWeight: '600'
                        }}>
                          SKU: {product.sku}
                        </span>
                      )}
                      {product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase()) && (
                        <span style={{
                          fontSize: '7px',
                          background: '#ffc107',
                          color: '#212529',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          fontWeight: '600'
                        }}>
                          BRAND: {product.brand}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="product-price">
                    £{parseFloat(product.price).toFixed(2)}
                    {product.originalPrice && (
                      <span style={{ 
                        fontSize: windowWidth < 768 ? '9px' : '11px',
                        color: '#6c757d',
                        textDecoration: 'line-through',
                        marginLeft: '6px'
                      }}>
                        £{parseFloat(product.originalPrice).toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  <div className="product-rating">
                    <i className="fas fa-star" style={{ color: '#ffc107', marginRight: '4px' }}></i>
                    {product.rating || 4.5} ({product.reviews || 0} reviews)
                  </div>
                  
                  {/* Existing sellers information */}
                  {product.sellers && product.sellers.length > 0 && (
                    <div style={{ 
                      fontSize: windowWidth < 768 ? '7px' : '8px',
                      color: '#6c757d',
                      marginBottom: '4px',
                      padding: '2px 4px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '3px',
                      border: '1px solid #e9ecef'
                    }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                        <i className="fas fa-users" style={{ marginRight: '2px', fontSize: '6px' }}></i>
                        {product.sellers.length} Seller{product.sellers.length > 1 ? 's' : ''}:
                      </div>
                      {product.sellers.slice(0, 2).map((sellerEntry, index) => {
                        const sellerPrice = sellerEntry.sellerPrice ? parseFloat(sellerEntry.sellerPrice) : parseFloat(product.price);
                        const countryLabel = sellerEntry.listingCountries && sellerEntry.listingCountries.length > 0
                          ? sellerEntry.listingCountries.map(c => ({ GBP: '🇬🇧', PKR: '🇵🇰', AED: '🇦🇪', USD: '🇺🇸' })[c]).join('')
                          : ''
                        return (
                          <div key={`seller-${index}`} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: index < product.sellers.length - 1 ? '1px' : '0'
                          }}>
                            <span style={{ color: index === 0 ? '#28a745' : '#6c757d', fontWeight: index === 0 ? 'bold' : 'normal', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              {sellerEntry.username}
                              {index === 0 && ' (Lowest)'}
                              {countryLabel && <span style={{ fontSize: '9px' }}>{countryLabel}</span>}
                            </span>
                            <span style={{ color: index === 0 ? '#28a745' : '#6c757d', fontWeight: 'bold' }}>
                              £{sellerPrice.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                      {product.sellers.length > 2 && (
                        <div style={{ 
                          fontSize: windowWidth < 768 ? '6px' : '7px',
                          color: '#999',
                          textAlign: 'center',
                          marginTop: '2px'
                        }}>
                          +{product.sellers.length - 2} more seller{product.sellers.length - 2 > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Action buttons container */}
                  <div className="action-buttons">
                    {isAlreadyListed(product) ? (
                      <button 
                        className="list-btn already-listed"
                        disabled
                        title="You have already listed this product"
                        style={{
                          backgroundColor: '#28a745',
                          color: 'white',
                          cursor: 'not-allowed',
                          opacity: 0.8
                        }}
                      >
                        <i className="fas fa-check" style={{ fontSize: '8px' }}></i>
                        {windowWidth < 768 ? 'ALREADY LISTED' : 'ALREADY IN MY STORE'}
                      </button>
                    ) : (
                      <button 
                        className="list-btn"
                        onClick={() => handleListProduct(product)}
                        title="Request to add this product to your store (requires admin approval)"
                      >
                        <i className="fas fa-paper-plane" style={{ fontSize: '8px' }}></i>
                        {windowWidth < 768 ? 'REQUEST TO LIST' : 'REQUEST TO LIST'}
                      </button>
                    )}
                    
                    <a
                      href={`/product/${product._id}`}
                      className="edit-btn"
                      title="View Product Details"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textDecoration: 'none',
                        color: 'white',
                        minWidth: windowWidth < 768 ? '45px' : '50px',
                        minHeight: '28px'
                      }}
                    >
                      <i className="fas fa-eye" style={{ fontSize: '8px' }}></i>
                      {windowWidth >= 768 && <span style={{ marginLeft: '4px' }}>VIEW</span>}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-section">
            <button 
              className="nav-btn"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            
            {renderPagination()}
            
            <button 
              className="nav-btn"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  )
}

export default AdminProducts