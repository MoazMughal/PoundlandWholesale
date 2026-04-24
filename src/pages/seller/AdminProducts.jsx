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

  // Bulk selection state
  const [selectedProducts, setSelectedProducts] = useState([])
  const [bulkModal, setBulkModal] = useState(false)
  // Per-product editable rows: { [productId]: { price, shipping, moq, listingCountries, notes } }
  const [bulkRows, setBulkRows] = useState({})
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkResults, setBulkResults] = useState(null)
  const [bulkCount, setBulkCount] = useState(0) // snapshot count for results screen

  const toggleSelectProduct = (product) => {
    if (isAlreadyListed(product)) return
    setSelectedProducts(prev =>
      prev.find(p => p._id === product._id)
        ? prev.filter(p => p._id !== product._id)
        : [...prev, product]
    )
  }

  const toggleSelectAll = () => {
    const selectable = products.filter(p => !isAlreadyListed(p))
    if (selectedProducts.length === selectable.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(selectable)
    }
  }

  // Seed bulkRows when modal opens
  const openBulkModal = () => {
    const rows = {}
    selectedProducts.forEach(p => {
      const rawPrice = parseFloat(p.price) || 0
      rows[p._id] = {
        price: rawPrice > 0 ? Math.max(0.01, rawPrice - 0.01).toFixed(2) : '0.01',
        shipping: parseFloat(p.shipping || 0).toFixed(2),
        moq: '1',
        listingCountries: [],
        notes: ''
      }
    })
    setBulkRows(rows)
    setBulkResults(null)
    setBulkModal(true)
  }

  const updateBulkRow = (productId, field, value) => {
    setBulkRows(prev => ({ ...prev, [productId]: { ...prev[productId], [field]: value } }))
  }

  const toggleBulkCountry = (productId, code) => {
    setBulkRows(prev => {
      const current = prev[productId].listingCountries
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          listingCountries: current.includes(code) ? current.filter(c => c !== code) : [...current, code]
        }
      }
    })
  }

  const handleBulkRequest = async () => {
    if (selectedProducts.length === 0) return
    setBulkSubmitting(true)
    setBulkResults(null)
    setBulkCount(selectedProducts.length)
    const token = localStorage.getItem('sellerToken')

    try {
      const items = selectedProducts.map(product => {
        const row = bulkRows[product._id] || {}
        return {
          adminProductId: product._id,
          productName: product.name,
          productPrice: parseFloat(product.price) || 0,
          sellerPrice: parseFloat(row.price) || 0.01,
          sellerShipping: parseFloat(row.shipping) || 0,
          moq: parseInt(row.moq) || 1,
          listingCountries: row.listingCountries || [],
          notes: row.notes || ''
        }
      })

      const response = await fetch(getApiUrl('sellers/bulk-request-listing'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ items })
      })
      const data = await response.json()

      if (response.ok) {
        setBulkResults({ success: data.submitted || [], failed: (data.failed || []).map(f => ({ name: f.name, reason: f.reason })) })
        if ((data.submitted || []).length > 0) { setSelectedProducts([]); fetchAdminProducts() }
      } else {
        setBulkResults({ success: [], failed: selectedProducts.map(p => ({ name: p.name, reason: data.message || 'Failed' })) })
      }
    } catch {
      setBulkResults({ success: [], failed: selectedProducts.map(p => ({ name: p.name, reason: 'Network error' })) })
    } finally {
      setBulkSubmitting(false)
    }
  }

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


  const COUNTRY_OPTIONS = [
    { code: 'GBP', flag: '🇬🇧', label: 'UK (£ GBP)' },
    { code: 'PKR', flag: '🇵🇰', label: 'Pakistan (Rs PKR)' },
    { code: 'AED', flag: '🇦🇪', label: 'UAE (د.إ AED)' },
    { code: 'USD', flag: '🇺🇸', label: 'USA ($ USD)' }
  ]
  const COUNTRY_LABEL = { GBP: '🇬🇧 UK', PKR: '🇵🇰 Pakistan', AED: '🇦🇪 UAE', USD: '🇺🇸 USA' }

  return (
    <>
    {/* ── Bulk Request Modal ── */}
    {bulkModal && (
      <div onClick={() => !bulkSubmitting && !bulkResults && setBulkModal(false)}
        style={{ position:'fixed', inset:0, zIndex:99999, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
        <div onClick={e => e.stopPropagation()}
          style={{ background:'#fff', borderRadius:'16px', width:'100%', maxWidth:'520px', boxShadow:'0 25px 60px rgba(0,0,0,0.3)', overflow:'hidden', maxHeight:'90vh', overflowY:'auto' }}>
          {/* Header */}
          <div style={{ background:'linear-gradient(135deg, #ff6600, #ff8533)', padding:'18px 22px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'36px', height:'36px', borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <i className="fas fa-layer-group" style={{ color:'#fff', fontSize:'15px' }}></i>
              </div>
              <div>
                <div style={{ color:'#fff', fontWeight:'700', fontSize:'15px' }}>Bulk Request ({bulkResults ? bulkCount : selectedProducts.length} product{(bulkResults ? bulkCount : selectedProducts.length) !== 1 ? 's' : ''})</div>
                <div style={{ color:'rgba(255,255,255,0.85)', fontSize:'11px' }}>Edit each product individually</div>
              </div>
            </div>
            {!bulkSubmitting && !bulkResults && (
              <button onClick={() => setBulkModal(false)}
                style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'50%', width:'32px', height:'32px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>

          {bulkResults ? (
            /* Results screen */
            <div style={{ padding:'24px' }}>
              {bulkResults.success.length > 0 && (
                <div style={{ background:'#d4edda', borderRadius:'10px', padding:'14px', marginBottom:'12px' }}>
                  <div style={{ fontWeight:'700', color:'#155724', marginBottom:'6px' }}>
                    <i className="fas fa-check-circle me-2"></i>{bulkResults.success.length} request{bulkResults.success.length > 1 ? 's' : ''} submitted
                  </div>
                  {bulkResults.success.map((name, i) => (
                    <div key={i} style={{ fontSize:'0.8rem', color:'#155724', padding:'2px 0' }}>• {name}</div>
                  ))}
                </div>
              )}
              {bulkResults.failed.length > 0 && (
                <div style={{ background:'#fde8e8', borderRadius:'10px', padding:'14px', marginBottom:'12px' }}>
                  <div style={{ fontWeight:'700', color:'#721c24', marginBottom:'6px' }}>
                    <i className="fas fa-exclamation-circle me-2"></i>{bulkResults.failed.length} failed
                  </div>
                  {bulkResults.failed.map((f, i) => (
                    <div key={i} style={{ fontSize:'0.8rem', color:'#721c24', padding:'2px 0' }}>• {f.name} — {f.reason}</div>
                  ))}
                </div>
              )}
              <button onClick={() => { setBulkModal(false); setBulkResults(null) }}
                style={{ width:'100%', padding:'12px', background:'linear-gradient(135deg,#ff6600,#ff8533)', color:'#fff', border:'none', borderRadius:'10px', fontWeight:'700', cursor:'pointer', fontSize:'14px' }}>
                Done
              </button>
            </div>
          ) : (
            /* Per-product editable rows */
            <div style={{ padding:'16px 18px' }}>
              <p style={{ fontSize:'0.78rem', color:'#6b7280', marginBottom:'12px' }}>
                Edit price, shipping, MOQ and countries for each product individually.
              </p>

              <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                {selectedProducts.map((product, idx) => {
                  const row = bulkRows[product._id] || {}
                  return (
                    <div key={product._id} style={{ border:'1.5px solid #e9ecef', borderRadius:'10px', overflow:'hidden' }}>
                      {/* Product name bar */}
                      <div style={{ background:'#f8f9fa', padding:'8px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #e9ecef' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', minWidth:0 }}>
                          {product.images?.[0] && (
                            <img src={product.images[0]} alt="" style={{ width:'28px', height:'28px', objectFit:'contain', borderRadius:'4px', flexShrink:0 }}
                              onError={e => e.target.style.display='none'} />
                          )}
                          <span style={{ fontSize:'0.78rem', fontWeight:'700', color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{product.name}</span>
                        </div>
                        <span style={{ fontSize:'0.72rem', color:'#28a745', fontWeight:'700', flexShrink:0, marginLeft:'8px' }}>RRP £{parseFloat(product.price||0).toFixed(2)}</span>
                      </div>

                      {/* Fields */}
                      <div style={{ padding:'10px 12px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                        <div>
                          <label style={{ fontSize:'0.7rem', fontWeight:'700', color:'#6b7280', display:'block', marginBottom:'3px' }}>Your Price (£)</label>
                          <input type="number" step="0.01" min="0.01" value={row.price || ''}
                            onChange={e => updateBulkRow(product._id, 'price', e.target.value)}
                            style={{ width:'100%', padding:'6px 8px', border:'1.5px solid #e9ecef', borderRadius:'6px', fontSize:'12px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize:'0.7rem', fontWeight:'700', color:'#6b7280', display:'block', marginBottom:'3px' }}>Shipping (£)</label>
                          <input type="number" step="0.01" min="0" value={row.shipping || ''}
                            onChange={e => updateBulkRow(product._id, 'shipping', e.target.value)}
                            style={{ width:'100%', padding:'6px 8px', border:'1.5px solid #e9ecef', borderRadius:'6px', fontSize:'12px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize:'0.7rem', fontWeight:'700', color:'#6b7280', display:'block', marginBottom:'3px' }}>MOQ</label>
                          <input type="number" step="1" min="1" value={row.moq || ''}
                            onChange={e => updateBulkRow(product._id, 'moq', e.target.value)}
                            style={{ width:'100%', padding:'6px 8px', border:'1.5px solid #e9ecef', borderRadius:'6px', fontSize:'12px' }} />
                        </div>
                      </div>

                      {/* Countries */}
                      <div style={{ padding:'0 12px 10px' }}>
                        <label style={{ fontSize:'0.7rem', fontWeight:'700', color:'#6b7280', display:'block', marginBottom:'5px' }}>
                          Countries <span style={{ fontWeight:'400', color:'#aaa' }}>(empty = all)</span>
                        </label>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                          {COUNTRY_OPTIONS.map(c => {
                            const sel = (row.listingCountries || []).includes(c.code)
                            return (
                              <button key={c.code} type="button"
                                onClick={() => toggleBulkCountry(product._id, c.code)}
                                style={{ padding:'4px 9px', borderRadius:'6px', border: sel ? '1.5px solid #ff6600' : '1.5px solid #e9ecef', background: sel ? '#fff5f0' : '#fff', cursor:'pointer', fontSize:'11px', fontWeight: sel ? '700' : '500', color: sel ? '#ff6600' : '#6b7280' }}>
                                {c.flag} {c.code}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Notes */}
                      <div style={{ padding:'0 12px 10px' }}>
                        <input type="text" value={row.notes || ''} placeholder="Notes (optional)"
                          onChange={e => updateBulkRow(product._id, 'notes', e.target.value)}
                          style={{ width:'100%', padding:'6px 8px', border:'1.5px solid #e9ecef', borderRadius:'6px', fontSize:'11px', color:'#6b7280' }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ display:'flex', gap:'10px', marginTop:'16px' }}>
                <button onClick={() => setBulkModal(false)}
                  style={{ flex:1, padding:'11px', background:'#f8f9fa', color:'#6b7280', border:'1.5px solid #e9ecef', borderRadius:'10px', fontWeight:'600', cursor:'pointer', fontSize:'13px' }}>
                  Cancel
                </button>
                <button onClick={handleBulkRequest} disabled={bulkSubmitting}
                  style={{ flex:2, padding:'11px', background: bulkSubmitting ? '#ccc' : 'linear-gradient(135deg,#ff6600,#ff8533)', color:'#fff', border:'none', borderRadius:'10px', fontWeight:'700', cursor: bulkSubmitting ? 'not-allowed' : 'pointer', fontSize:'13px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                  {bulkSubmitting
                    ? <><span className="spinner-border spinner-border-sm"></span> Submitting...</>
                    : <><i className="fas fa-paper-plane"></i> Submit {selectedProducts.length} Requests</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

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

    <div style={{ background: '#f4f6f9', minHeight: '100vh' }}>
      <style>{`
        @keyframes ap-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .ap-shimmer { background: linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%); background-size:400px 100%; animation: ap-shimmer 1.4s infinite; }
        .ap-card { background:#fff; border-radius:10px; border:1px solid #e8ecf0; overflow:hidden; display:flex; flex-direction:column; transition:transform 0.18s,box-shadow 0.18s; }
        .ap-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,0.12); }
        .ap-card img { width:100%; height:130px; object-fit:contain; background:#f8f9fa; padding:8px; }
        .ap-card-body { padding:8px 10px; flex:1; display:flex; flex-direction:column; gap:4px; }
        .ap-title { font-size:0.72rem; font-weight:600; color:#2d3748; line-height:1.3; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .ap-price { font-size:0.82rem; font-weight:800; color:#28a745; }
        .ap-badge { font-size:0.6rem; padding:2px 6px; border-radius:4px; font-weight:700; display:inline-block; }
        .ap-listed { position:absolute; top:6px; left:6px; background:#28a745; color:#fff; font-size:0.6rem; font-weight:700; padding:2px 6px; border-radius:4px; z-index:2; }
        .ap-req-btn { width:100%; padding:6px 4px; border:none; border-radius:6px; font-size:0.68rem; font-weight:700; cursor:pointer; background:linear-gradient(135deg,#28a745,#20c997); color:#fff; margin-top:auto; transition:opacity 0.15s; }
        .ap-req-btn:hover { opacity:0.88; }
        .ap-req-btn:disabled { background:#adb5bd; cursor:not-allowed; }
        .ap-grid { display:grid; gap:10px; }
        .ap-search { border:2px solid #e8ecf0; border-radius:8px; padding:8px 12px; font-size:0.85rem; outline:none; width:100%; transition:border-color 0.2s; }
        .ap-search:focus { border-color:#667eea; }
        .ap-select { border:2px solid #e8ecf0; border-radius:8px; padding:8px 10px; font-size:0.82rem; background:#fff; cursor:pointer; outline:none; }
        .ap-select:focus { border-color:#667eea; }
        .ap-page-btn { min-width:34px; height:34px; border:1px solid #dee2e6; background:#fff; border-radius:6px; cursor:pointer; font-size:0.82rem; transition:all 0.15s; }
        .ap-page-btn:hover { border-color:#667eea; color:#667eea; }
        .ap-page-btn.active { background:#667eea; color:#fff; border-color:#667eea; font-weight:700; }
        @media(max-width:576px){ .ap-grid{ grid-template-columns:repeat(2,1fr)!important; } }
        @media(min-width:577px) and (max-width:767px){ .ap-grid{ grid-template-columns:repeat(3,1fr)!important; } }
        @media(min-width:768px) and (max-width:991px){ .ap-grid{ grid-template-columns:repeat(4,1fr)!important; } }
        @media(min-width:992px) and (max-width:1199px){ .ap-grid{ grid-template-columns:repeat(5,1fr)!important; } }
        @media(min-width:1200px) and (max-width:1399px){ .ap-grid{ grid-template-columns:repeat(6,1fr)!important; } }
        @media(min-width:1400px){ .ap-grid{ grid-template-columns:repeat(7,1fr)!important; } }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ background:'linear-gradient(135deg,#1a1a2e,#16213e)', padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'8px' }}>
        <div>
          <h5 style={{ color:'#fff', margin:0, fontWeight:700, fontSize:'1rem' }}>
            <i className="fas fa-boxes me-2" style={{ color:'#ff6b35' }}></i>Available Products
          </h5>
          <small style={{ color:'rgba(255,255,255,0.65)', fontSize:'0.75rem' }}>Browse and request products to list in your store</small>
        </div>
        <button onClick={() => navigate('/seller/dashboard')}
          style={{ background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.25)', color:'#fff', borderRadius:'7px', padding:'6px 14px', fontSize:'0.8rem', cursor:'pointer' }}>
          <i className="fas fa-arrow-left me-1"></i>Dashboard
        </button>
      </div>

      {/* ── FILTERS ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e8ecf0', padding:'10px 14px', display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
        <form onSubmit={handleSearch} style={{ flex:'1 1 220px', display:'flex', gap:'6px', minWidth:0 }}>
          <div style={{ position:'relative', flex:1, minWidth:0 }}>
            <i className="fas fa-search" style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#aaa', fontSize:'0.8rem', pointerEvents:'none' }}></i>
            <input className="ap-search" style={{ paddingLeft:'30px', paddingRight: searchQuery ? '30px' : '12px' }}
              placeholder="Search by name, ASIN, SKU..."
              value={searchQuery}
              onChange={handleSearchInputChange}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} />
            {searchQuery && (
              <button type="button" onClick={clearSearch}
                style={{ position:'absolute', right:'8px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#aaa', cursor:'pointer', fontSize:'0.8rem', padding:0 }}>
                <i className="fas fa-times"></i>
              </button>
            )}
            {/* Suggestions */}
            {showSuggestions && (searchSuggestions.length > 0 || (searchHistory.length > 0 && !searchQuery)) && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1px solid #e8ecf0', borderRadius:'0 0 8px 8px', boxShadow:'0 4px 12px rgba(0,0,0,0.1)', zIndex:1000, maxHeight:'240px', overflowY:'auto' }}>
                {!searchQuery && searchHistory.length > 0 && (
                  <div>
                    <div style={{ padding:'6px 12px', background:'#f8f9fa', fontSize:'0.7rem', fontWeight:700, color:'#6b7280', display:'flex', justifyContent:'space-between' }}>
                      <span><i className="fas fa-history me-1"></i>Recent</span>
                      <button type="button" onClick={clearSearchHistory} style={{ background:'none', border:'none', color:'#dc3545', cursor:'pointer', fontSize:'0.7rem' }}>Clear</button>
                    </div>
                    {searchHistory.map((t,i) => (
                      <div key={i} onClick={() => handleSearch(null, t)} style={{ padding:'7px 12px', cursor:'pointer', fontSize:'0.82rem', borderBottom:'1px solid #f8f9fa' }}
                        onMouseEnter={e => e.currentTarget.style.background='#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                        <i className="fas fa-clock me-2" style={{ color:'#aaa', fontSize:'0.7rem' }}></i>{t}
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery && searchSuggestions.map((s,i) => (
                  <div key={i} onClick={() => handleSearch(null, s.text)} style={{ padding:'7px 12px', cursor:'pointer', fontSize:'0.82rem', borderBottom:'1px solid #f8f9fa', display:'flex', justifyContent:'space-between' }}
                    onMouseEnter={e => e.currentTarget.style.background='#f8f9fa'} onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                    <span><i className="fas fa-search me-2" style={{ color:'#667eea', fontSize:'0.7rem' }}></i>{s.text}</span>
                    <span style={{ fontSize:'0.65rem', color:'#aaa', textTransform:'uppercase' }}>{s.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button type="submit" disabled={isSearching}
            style={{ background:'#667eea', color:'#fff', border:'none', borderRadius:'8px', padding:'8px 14px', cursor:'pointer', fontSize:'0.82rem', flexShrink:0 }}>
            {isSearching ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
          </button>
        </form>

        <select className="ap-select" value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }} style={{ flex:'0 1 180px' }}>
          {categories.map(c => <option key={c.value} value={c.value}>{c.label}{c.count ? ` (${c.count})` : ''}</option>)}
        </select>

        <select className="ap-select" value={productsPerPage} onChange={e => { setProductsPerPage(parseInt(e.target.value)); setCurrentPage(1); }} style={{ flex:'0 0 80px' }}>
          <option value={100}>100</option>
          <option value={200}>200</option>
          <option value={300}>300</option>
        </select>

        <span style={{ fontSize:'0.78rem', color:'#6b7280', whiteSpace:'nowrap' }}>
          {totalProducts > 0 ? `${totalProducts} products` : ''}
          {searchQuery && <button onClick={clearSearch} style={{ marginLeft:'6px', background:'#dc3545', color:'#fff', border:'none', borderRadius:'4px', padding:'2px 7px', fontSize:'0.7rem', cursor:'pointer' }}>✕ Clear</button>}
        </span>

        {/* Select All checkbox */}
        {products.length > 0 && products.some(p => !isAlreadyListed(p)) && (
          <label style={{ display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontSize:'0.8rem', color:'#374151', fontWeight:'600', userSelect:'none' }}>
            <input type="checkbox"
              checked={selectedProducts.length > 0 && selectedProducts.length === products.filter(p => !isAlreadyListed(p)).length}
              onChange={toggleSelectAll}
              style={{ width:'16px', height:'16px', cursor:'pointer' }} />
            Select All
          </label>
        )}
      </div>

      {/* ── BULK ACTION TOOLBAR ── */}
      {selectedProducts.length > 0 && (
        <div style={{ margin:'0 14px 10px', background:'linear-gradient(135deg,#ff6600,#ff8533)', borderRadius:'10px', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ color:'#fff', fontWeight:'700', fontSize:'0.88rem' }}>
              <i className="fas fa-check-square me-2"></i>{selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
            </span>
            <button onClick={() => setSelectedProducts([])}
              style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'6px', color:'#fff', padding:'3px 10px', fontSize:'0.75rem', cursor:'pointer' }}>
              Clear
            </button>
          </div>
          <button onClick={openBulkModal}
            style={{ background:'#fff', color:'#ff6600', border:'none', borderRadius:'8px', padding:'8px 18px', fontWeight:'700', fontSize:'0.85rem', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
            <i className="fas fa-layer-group"></i> Bulk Request All
          </button>
        </div>
      )}

      {/* ── PRODUCTS GRID ── */}
      <div style={{ padding:'12px 14px' }}>
        {loading ? (
          /* Skeleton grid */
          <div className="ap-grid">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="ap-card">
                <div className="ap-shimmer" style={{ height:'130px' }}></div>
                <div style={{ padding:'8px 10px', display:'flex', flexDirection:'column', gap:'6px' }}>
                  <div className="ap-shimmer" style={{ height:'12px', borderRadius:'4px', width:'90%' }}></div>
                  <div className="ap-shimmer" style={{ height:'12px', borderRadius:'4px', width:'60%' }}></div>
                  <div className="ap-shimmer" style={{ height:'16px', borderRadius:'4px', width:'40%', marginTop:'4px' }}></div>
                  <div className="ap-shimmer" style={{ height:'28px', borderRadius:'6px', marginTop:'6px' }}></div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#6b7280' }}>
            <i className="fas fa-box-open" style={{ fontSize:'3rem', opacity:0.4, marginBottom:'12px', display:'block' }}></i>
            <h5 style={{ fontWeight:700, color:'#374151' }}>No products found</h5>
            <p style={{ fontSize:'0.85rem' }}>Try adjusting your search or category filter</p>
          </div>
        ) : (
          <div className="ap-grid">
            {products.map(product => {
              const listed = isAlreadyListed(product);
              const lowestSeller = product.sellers?.length > 0
                ? product.sellers.slice().sort((a,b) => parseFloat(a.sellerPrice||0)-parseFloat(b.sellerPrice||0))[0]
                : null;
              return (
                <div key={product._id} className="ap-card">
                  <div style={{ position:'relative' }}>
                    {listed && <span className="ap-listed"><i className="fas fa-check me-1"></i>LISTED</span>}
                    {/* Selection checkbox */}
                    {!listed && (
                      <div onClick={e => { e.preventDefault(); e.stopPropagation(); toggleSelectProduct(product) }}
                        style={{ position:'absolute', top:'6px', left:'6px', zIndex:10, width:'22px', height:'22px', borderRadius:'5px', border: selectedProducts.find(p => p._id === product._id) ? '2px solid #ff6600' : '2px solid #ccc', background: selectedProducts.find(p => p._id === product._id) ? '#ff6600' : 'rgba(255,255,255,0.9)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.15s' }}>
                        {selectedProducts.find(p => p._id === product._id) && <i className="fas fa-check" style={{ color:'#fff', fontSize:'11px' }}></i>}
                      </div>
                    )}
                    <a href={`/product/${product._id}`} style={{ display:'block' }}>
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name}
                          onError={e => { e.target.src='https://via.placeholder.com/130x130?text=No+Image'; }} />
                      ) : (
                        <div style={{ height:'130px', background:'#f8f9fa', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <i className="fas fa-image" style={{ fontSize:'2rem', color:'#dee2e6' }}></i>
                        </div>
                      )}
                    </a>
                  </div>
                  <div className="ap-card-body">
                    <a href={`/product/${product._id}`} style={{ textDecoration:'none', color:'inherit' }}>
                      <div className="ap-title">{product.name}</div>
                    </a>
                    {product.category && (
                      <span className="ap-badge" style={{ background:'#e9ecef', color:'#6b7280' }}>{product.category}</span>
                    )}
                    <div className="ap-price">£{parseFloat(product.price||0).toFixed(2)}</div>
                    {lowestSeller && (
                      <div style={{ fontSize:'0.62rem', color:'#6b7280' }}>
                        <i className="fas fa-user me-1"></i>{lowestSeller.username} · £{parseFloat(lowestSeller.sellerPrice||0).toFixed(2)}
                      </div>
                    )}
                    {product.sellers?.length > 0 && (
                      <div style={{ fontSize:'0.62rem', color:'#aaa' }}>{product.sellers.length} seller{product.sellers.length>1?'s':''}</div>
                    )}
                    <button className="ap-req-btn" disabled={listed}
                      onClick={() => !listed && handleListProduct(product)}>
                      {listed
                        ? <><i className="fas fa-check me-1"></i>In My Store</>
                        : <><i className="fas fa-paper-plane me-1"></i>Request to List</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── PAGINATION ── */}
        {!loading && totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'6px', flexWrap:'wrap', marginTop:'16px', paddingBottom:'8px' }}>
            <button className="ap-page-btn" onClick={() => setCurrentPage(1)} disabled={currentPage===1}>«</button>
            <button className="ap-page-btn" onClick={() => setCurrentPage(p => Math.max(1,p-1))} disabled={currentPage===1}>‹</button>
            {renderPagination()}
            <button className="ap-page-btn" onClick={() => setCurrentPage(p => Math.min(totalPages,p+1))} disabled={currentPage===totalPages}>›</button>
            <button className="ap-page-btn" onClick={() => setCurrentPage(totalPages)} disabled={currentPage===totalPages}>»</button>
            <span style={{ fontSize:'0.78rem', color:'#6b7280', marginLeft:'4px' }}>Page {currentPage}/{totalPages}</span>
          </div>
        )}
      </div>
    </div>
    </>
  )
}

export default AdminProducts
