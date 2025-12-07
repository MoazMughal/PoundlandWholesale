import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../../context/CurrencyContext';
import { useAdmin } from '../../context/AdminContext';
import { adminGet, adminPost, adminPut, adminDelete } from '../../utils/adminApi';
import cacheManager from '../../utils/cacheManager';
import '../../styles/AdminDashboard.css';
import '../../styles/AdminDashboardEnhanced.css';
import '../../styles/AdminLayout.css';

// Force set currency to GBP for admin dashboard at module level
localStorage.setItem('selectedCurrency', 'GBP');

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentProducts, setRecentProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [amazonsChoice, setAmazonsChoice] = useState([]);

  const [categories, setCategories] = useState({});
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showFullEditModal, setShowFullEditModal] = useState(false);
  const [fullEditProduct, setFullEditProduct] = useState(null);
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [profitEditProduct, setProfitEditProduct] = useState(null);
  const [profitModalCurrency, setProfitModalCurrency] = useState('GBP');
  const [expandedSections, setExpandedSections] = useState({
    search: true,
    amazonsChoice: false,
    sellers: false
  });
  const navigate = useNavigate();
  const { currency, setCurrency, formatPrice, currencySymbols } = useCurrency();
  const { logout: adminLogout } = useAdmin();



  useEffect(() => {
    fetchStats();
    fetchRecentProducts();
    fetchAllProducts();
    fetchAmazonsChoice();
    fetchSellers();
  }, []);

  // Ensure currency is set to GBP for admin dashboard
  useEffect(() => {
    if (currency !== 'GBP') {
      setCurrency('GBP');
    }
  }, [currency]); // Removed setCurrency from dependencies to prevent loop

  // Ensure currency is set to GBP when profit modal is shown
  useEffect(() => {
    if (showProfitModal) {
      setCurrency('GBP');
      setProfitModalCurrency('GBP');
    }
  }, [showProfitModal]); // Removed setCurrency from dependencies to prevent loop

  const fetchStats = async () => {
    try {
      const response = await adminGet('http://localhost:5000/api/dashboard/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default stats if API fails to prevent blank dashboard
      setStats({
        products: { total: 0, active: 0, inactive: 0 },
        sellers: { total: 0, verified: 0, pending: 0 },
        verifications: { pending: 0 },
        sellerListings: { total: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentProducts = async () => {
    try {
      const response = await adminGet('http://localhost:5000/api/products?limit=5&sortBy=createdAt&order=desc');
      const data = await response.json();
      setRecentProducts(data.products);
    } catch (error) {
      console.error('Error fetching recent products:', error);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const response = await adminGet('http://localhost:5000/api/products?limit=1000');
      const data = await response.json();
      setAllProducts(data.products);
      
      // Calculate categories
      const categoryCount = {};
      data.products.forEach(product => {
        const cat = product.category || 'Uncategorized';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });
      setCategories(categoryCount);
    } catch (error) {
      console.error('Error fetching all products:', error);
    }
  };

  const fetchAmazonsChoice = async () => {
    try {
      const response = await adminGet('http://localhost:5000/api/products?limit=1000');
      const data = await response.json();
      const amazonProducts = data.products.filter(p => p.isAmazonsChoice);
      setAmazonsChoice(amazonProducts);
    } catch (error) {
      console.error('Error fetching Amazon\'s Choice products:', error);
    }
  };



  const fetchSellers = async () => {
    try {
      const response = await adminGet('http://localhost:5000/api/sellers?status=all&limit=20');
      const data = await response.json();
      setSellers(data.sellers);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  const handleDeleteSeller = async (id) => {
    if (!confirm('⚠️ Are you sure you want to permanently delete this seller? This action cannot be undone!')) return;

    try {
      await adminDelete(`http://localhost:5000/api/sellers/${id}`);
      alert('✅ Seller deleted successfully');
      fetchSellers();
      fetchStats(); // Refresh stats
    } catch (error) {
      console.error('Error deleting seller:', error);
      alert('❌ Failed to delete seller: ' + error.message);
    }
  };

  const handleLogout = () => {
    adminLogout();
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const viewAllInNewTab = (path) => {
    window.open(path, '_blank');
  };

  const quickDeleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    
    try {
      await adminDelete(`http://localhost:5000/api/products/${id}`);
      alert('✅ Product deleted successfully!');
      fetchRecentProducts();
      fetchAllProducts();
      fetchStats();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('❌ Failed to delete product: ' + error.message);
    }
  };

  const quickEditProduct = (id) => {
    navigate(`/admin/products/edit/${id}`);
  };

  const bulkDeleteProducts = async () => {
    if (!confirm('⚠️ Delete ALL products? This cannot be undone!')) return;
    
    try {
      for (const product of allProducts) {
        await adminDelete(`http://localhost:5000/api/products/${product._id}`);
      }
      alert('✅ All products deleted!');
      fetchRecentProducts();
      fetchAllProducts();
      fetchAmazonsChoice();
      fetchStats();
    } catch (error) {
      console.error('Error deleting products:', error);
      alert('❌ Failed to delete products: ' + error.message);
    }
  };

  const importHardcodedProducts = async () => {
    if (!confirm('📦 Import all hardcoded products from your data files into the database?')) return;
    
    try {
      setLoading(true);
      
      // Dynamically import the products data
      const { default: products } = await import('../../data/extracted-products.json');
      
      const response = await adminPost('http://localhost:5000/api/products/bulk-import', { products });
      const result = await response.json();
      alert(`✅ Import Complete!\n\n✅ Imported: ${result.imported}\n⏭️ Skipped: ${result.skipped}\n${result.errors ? `❌ Errors: ${result.errors.length}` : ''}`);
      fetchRecentProducts();
      fetchAllProducts();
      fetchAmazonsChoice();
      fetchStats();
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Failed to import products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await adminGet(`http://localhost:5000/api/products?search=${encodeURIComponent(query)}&limit=100`);
      const data = await response.json();
      setSearchResults(data.products);
    } catch (error) {
      console.error('Error searching products:', error);
    }
  };

  const startEditing = (product) => {
    setEditingProduct({
      id: product._id,
      price: product.price,
      stock: product.stock,
      quantity: product.quantity || product.stock
    });
  };

  const startProfitEditing = (product) => {
    // Calculate product cost automatically from product price (keep in PKR)
    const productPricePKR = parseFloat(product.price) || 0;
    

    
    // Set default currency to Pound when opening profit modal
    setCurrency('GBP');
    setProfitModalCurrency('GBP');
    
    setProfitEditProduct({
      _id: product._id,
      name: product.name || '',
      dealUnits: product.dealUnits || 1,
      platformUnits: product.platformUnits || 200, // Default to 200 units
      // Platform Comparison
      platformComparison: product.platformComparison || [
        { platform: 'RRP', rrpPerUnit: 0, profitFor200Units: 0, markup: '0%' },
        { platform: 'Amazon', rrpPerUnit: 0, profitFor200Units: 0, markup: '0%' },
        { platform: 'eBay', rrpPerUnit: 0, profitFor200Units: 0, markup: '0%' }
      ],
      // Profit Calculations
      profitCalculations: product.profitCalculations || {
        profitPerUnit: 0,
        profitFor200Units: 0,
        dealUnitsProfit: 0,
        profitForDealUnits: 0
      },
      // Profit Evaluation - Always sync product cost with current product price
      profitEvaluation: product.profitEvaluation ? {
        ...product.profitEvaluation,
        productCost: productPricePKR // Always use current product price in PKR
      } : {
        salesProceeds: 0,
        commission: 0,
        digitalServicesFee: 0,
        fbaFulfilmentFee: 0,
        balanceChange: 0,
        productCost: productPricePKR, // Auto-populate from product price in PKR
        netProfit: 0
      }
    });
    setShowProfitModal(true);
  };

  const startFullEditing = (product) => {
    setFullEditProduct({
      _id: product._id,
      name: product.name || '',
      price: product.price !== undefined && product.price !== null ? product.price : 0,
      category: product.category || '',
      brand: product.brand || '',
      images: Array.isArray(product.images) ? product.images.join(', ') : (product.images || ''),
      rating: product.rating || 4.0,
      reviews: product.reviews || 0,
      stock: product.stock || 0,
      dealUnits: product.dealUnits !== undefined && product.dealUnits !== null ? product.dealUnits : 1,
      platformUnits: product.platformUnits || 200, // Default to 200 units
      costPrice: product.costPrice !== undefined && product.costPrice !== null ? product.costPrice : 0,
      isAmazonsChoice: product.isAmazonsChoice || false,
      status: product.status || 'active',
      // Platform Comparison
      platformComparison: product.platformComparison || [
        { platform: 'RRP', rrpPerUnit: 0, profitFor200Units: 0, markup: '0%' },
        { platform: 'Amazon', rrpPerUnit: 0, profitFor200Units: 0, markup: '0%' },
        { platform: 'eBay', rrpPerUnit: 0, profitFor200Units: 0, markup: '0%' }
      ],
      // Profit Calculations
      profitCalculations: product.profitCalculations || {
        profitPerUnit: 0,
        profitFor200Units: 0,
        dealUnitsProfit: 0,
        profitForDealUnits: 0
      },
      // Profit Evaluation
      profitEvaluation: product.profitEvaluation || {
        salesProceeds: 0,
        commission: 0,
        digitalServicesFee: 0,
        fbaFulfilmentFee: 0,
        balanceChange: 0,
        productCost: 0,
        netProfit: 0
      }
    });
    setShowFullEditModal(true);
  };

  const cancelEditing = () => {
    setEditingProduct(null);
  };

  const updateProduct = async (productId) => {
    if (!editingProduct) return;

    try {
      await adminPut(`http://localhost:5000/api/products/${productId}`, {
        price: parseFloat(editingProduct.price),
        stock: parseInt(editingProduct.stock),
        quantity: parseInt(editingProduct.quantity)
      });

      // Clear cache to ensure updated product appears immediately in Amazon's Choice
      cacheManager.remove('amazons_choice_products');
      cacheManager.clearAll(); // Clear all cache entries
      
      alert('✅ Product updated successfully!');
      setEditingProduct(null);
      // Refresh all data
      fetchRecentProducts();
      fetchAllProducts();
      fetchAmazonsChoice();
      if (searchQuery) {
        handleSearch(searchQuery);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('❌ Failed to update product: ' + error.message);
    }
  };

  const updateProfitData = async () => {
    if (!profitEditProduct) return;

    try {
      // Calculate profitFor200Units based on profitPerUnit
      const calculatedProfitFor200Units = (profitEditProduct.profitCalculations.profitPerUnit || 0) * 200;
      
      const updateData = {
        platformComparison: profitEditProduct.platformComparison,
        platformUnits: profitEditProduct.platformUnits, // Save the selected unit quantity
        dealUnits: profitEditProduct.platformUnits, // Also update dealUnits for backward compatibility
        profitCalculations: {
          ...profitEditProduct.profitCalculations,
          profitFor200Units: calculatedProfitFor200Units // Auto-calculated value
        },
        profitEvaluation: profitEditProduct.profitEvaluation
      };

      await adminPut(`http://localhost:5000/api/products/${profitEditProduct._id}`, updateData);
      
      alert('✅ Profit data updated successfully!');
      setShowProfitModal(false);
      setProfitEditProduct(null);
      
      // Refresh data
      fetchRecentProducts();
      fetchAmazonsChoice();
    } catch (error) {
      console.error('Error updating profit data:', error);
      alert('❌ Failed to update profit data');
    }
  };

  const updateFullProduct = async () => {
    if (!fullEditProduct) return;

    try {
      // Process images - convert comma-separated string to array
      const imagesArray = fullEditProduct.images
        .split(',')
        .map(img => img.trim())
        .filter(img => img.length > 0);

      // Calculate profitFor200Units based on profitPerUnit
      const calculatedProfitFor200Units = (fullEditProduct.profitCalculations.profitPerUnit || 0) * 200;
      
      const updateData = {
        name: fullEditProduct.name,
        price: isNaN(parseFloat(fullEditProduct.price)) ? 0 : parseFloat(fullEditProduct.price),
        category: fullEditProduct.category,
        brand: fullEditProduct.brand,
        images: imagesArray,
        rating: parseFloat(fullEditProduct.rating),
        reviews: parseInt(fullEditProduct.reviews),
        stock: parseInt(fullEditProduct.stock),
        dealUnits: isNaN(parseInt(fullEditProduct.dealUnits)) ? 1 : parseInt(fullEditProduct.dealUnits),
        platformUnits: fullEditProduct.platformUnits || 200, // Save the platform units
        costPrice: parseFloat(fullEditProduct.costPrice) || 0,
        isAmazonsChoice: fullEditProduct.isAmazonsChoice,
        status: fullEditProduct.status,
        platformComparison: fullEditProduct.platformComparison,
        profitCalculations: {
          ...fullEditProduct.profitCalculations,
          profitFor200Units: calculatedProfitFor200Units // Auto-calculated value
        },
        profitEvaluation: fullEditProduct.profitEvaluation
      };

      await adminPut(`http://localhost:5000/api/products/${fullEditProduct._id}`, updateData);
      
      // Clear cache to ensure updated product appears immediately in Amazon's Choice
      cacheManager.remove('amazons_choice_products');
      cacheManager.clearAll(); // Clear all cache entries

      
      alert('✅ Product updated successfully! Changes will appear immediately in Amazon\'s Choice products.');
      setShowFullEditModal(false);
      setFullEditProduct(null);
      // Refresh all data
      fetchRecentProducts();
      fetchAllProducts();
      fetchAmazonsChoice();
      if (searchQuery) {
        handleSearch(searchQuery);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Failed to update product');
    }
  };

  const quickUpdatePrice = async (id, newPrice) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ price: parseFloat(newPrice) })
      });

      if (response.ok) {
        alert('✅ Price updated!');
        fetchRecentProducts();
        fetchAllProducts();
        fetchAmazonsChoice();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Failed to update price');
    }
  };

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

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="admin-dashboard compact">
      <header className="dashboard-header compact">
        <div>
          <h1>🏪 Admin Dashboard</h1>
          <p style={{margin: '5px 0', color: '#666', fontSize: '0.9rem'}}>
            👑 <strong>Full Authority:</strong> Edit any product - title, images, ratings, prices, categories, and more!
          </p>
        </div>
        <div className="header-actions" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          {/* Currency Converter */}
          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            <span style={{fontSize: '0.8rem', color: '#666'}}>💱</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{
                padding: '4px 8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.8rem',
                backgroundColor: 'white'
              }}
            >
              <option value="PKR">PKR (₨)</option>
              <option value="GBP">GBP (£)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
          <button onClick={() => navigate('/')} className="view-site-btn">🌐 Site</button>
          <button onClick={() => navigate('/admin/excel-import')} className="add-btn-header">➕ Add</button>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      {/* Search Section - Top Priority */}
      <div className="search-section" style={{
        background: 'white',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div className="section-header compact" style={{cursor: 'pointer', marginBottom: '10px'}} onClick={() => toggleSection('search')}>
          <h2>
            <span style={{marginRight: '8px'}}>{expandedSections.search ? '▼' : '▶'}</span>
            🔍 Search & Update Products
            <span style={{fontSize: '0.8rem', color: '#666', fontWeight: 'normal', marginLeft: '10px'}}>
              (💰 Price/Stock = Price & Stock only | 📝 Details = Everything except Price & Stock)
            </span>
          </h2>
        </div>

        {expandedSections.search && (
          <>
            <div style={{marginBottom: '10px'}}>
              <input
                type="text"
                placeholder="🔍 Search by product name, category, ID..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  fontSize: '0.95rem',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            {searchQuery && (
              <div style={{marginTop: '15px'}}>
                <p style={{marginBottom: '10px', color: '#666', fontSize: '0.9rem'}}>
                  Found {searchResults.length} product(s)
                </p>
                
                {searchResults.length > 0 && (
                  <div className="products-table compact" style={{maxHeight: '500px', overflowY: 'auto'}}>
                    <table>
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th>Category</th>
                          <th>Price (Rs)</th>
                          <th>Stock</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchResults.map(product => (
                          <tr key={product._id}>
                            <td className="product-name">
                              <span 
                                onClick={() => handleProductClick(product)}
                                style={{
                                  cursor: 'pointer',
                                  color: '#667eea',
                                  textDecoration: 'underline'
                                }}
                                title="Click to view product details"
                              >
                                {product.name}
                              </span>
                              {product.isAmazonsChoice && <span className="badge-mini">🏆</span>}
                              {product.isBestSeller && <span className="badge-mini">🔥</span>}
                            </td>
                            <td><span className="category-badge">{product.category}</span></td>
                            <td className="price">
                              {editingProduct?.id === product._id ? (
                                <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                  <span style={{fontSize: '0.85rem', color: '#666'}}>Rs</span>
                                  <input 
                                    type="number" 
                                    value={editingProduct.price}
                                    onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                                    style={{width: '80px', padding: '4px', border: '2px solid #667eea', borderRadius: '4px'}}
                                    placeholder={currencySymbols[currency]}
                                  />
                                </div>
                              ) : (
                                formatPrice(product.price)
                              )}
                            </td>
                            <td className="stock">
                              {editingProduct?.id === product._id ? (
                                <input 
                                  type="number" 
                                  value={editingProduct.stock}
                                  onChange={(e) => setEditingProduct({...editingProduct, stock: e.target.value, quantity: e.target.value})}
                                  style={{width: '60px', padding: '4px', border: '2px solid #667eea', borderRadius: '4px'}}
                                />
                              ) : (
                                product.stock
                              )}
                            </td>
                            <td>
                              <span className={`status-badge ${product.status}`}>{product.status}</span>
                            </td>
                            <td className="actions">
                              {editingProduct?.id === product._id ? (
                                <>
                                  <button 
                                    onClick={() => updateProduct(product._id)} 
                                    style={{
                                      background: '#28a745',
                                      color: 'white',
                                      border: 'none',
                                      padding: '6px 12px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      marginRight: '5px',
                                      fontSize: '0.85rem'
                                    }}
                                  >
                                    ✅ Update
                                  </button>
                                  <button 
                                    onClick={cancelEditing} 
                                    style={{
                                      background: '#6c757d',
                                      color: 'white',
                                      border: 'none',
                                      padding: '6px 12px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '0.85rem'
                                    }}
                                  >
                                    ❌ Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => startEditing(product)} 
                                    style={{
                                      background: '#667eea',
                                      color: 'white',
                                      border: 'none',
                                      padding: '6px 12px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      marginRight: '5px',
                                      fontSize: '0.85rem'
                                    }}
                                    title="Edit Price & Stock only"
                                  >
                                    💰 Price/Stock
                                  </button>
                                  <button 
                                    onClick={() => startFullEditing(product)} 
                                    style={{
                                      background: '#28a745',
                                      color: 'white',
                                      border: 'none',
                                      padding: '6px 12px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      marginRight: '5px',
                                      fontSize: '0.85rem'
                                    }}
                                    title="Edit all product details except Price & Stock"
                                  >
                                    📝 Details
                                  </button>
                                  <button 
                                    onClick={() => quickDeleteProduct(product._id)} 
                                    className="delete-btn" 
                                    title="Delete"
                                  >
                                    🗑️
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="stats-overview">
        <div className="stats-grid-enhanced">
          <div className="stat-card-enhanced products" onClick={() => navigate('/admin/products')}>
            <div className="stat-icon-enhanced">📦</div>
            <div className="stat-content-enhanced">
              <div className="stat-label-enhanced">Total Products</div>
              <div className="stat-value-enhanced">{allProducts.length}</div>
              <div className="stat-change-enhanced">
                <span>↑</span> {stats?.products.active || 0} Active
              </div>
            </div>
          </div>

          <div className="stat-card-enhanced amazon" onClick={() => navigate('/admin/products')}>
            <div className="stat-icon-enhanced">🏆</div>
            <div className="stat-content-enhanced">
              <div className="stat-label-enhanced">Amazon's Choice</div>
              <div className="stat-value-enhanced">{amazonsChoice.length}</div>
              <div className="stat-change-enhanced">Featured</div>
            </div>
          </div>



          <div className="stat-card-enhanced sellers" onClick={() => navigate('/admin/sellers')}>
            <div className="stat-icon-enhanced">👥</div>
            <div className="stat-content-enhanced">
              <div className="stat-label-enhanced">Sellers</div>
              <div className="stat-value-enhanced">{stats?.sellers.total || 0}</div>
              <div className="stat-change-enhanced">
                <span>↑</span> {stats?.sellers.approved || 0} Approved
              </div>
            </div>
          </div>

          <div className="stat-card-enhanced buyers" onClick={() => navigate('/admin/seller-verifications')}>
            <div className="stat-icon-enhanced">🆔</div>
            <div className="stat-content-enhanced">
              <div className="stat-label-enhanced">Verifications</div>
              <div className="stat-value-enhanced">{stats?.verifications?.pending || 0}</div>
              <div className="stat-change-enhanced negative">
                <span>⏳</span> Pending
              </div>
            </div>
          </div>

          <div className="stat-card-enhanced buyers" onClick={() => navigate('/admin/buyers')}>
            <div className="stat-icon-enhanced">🛒</div>
            <div className="stat-content-enhanced">
              <div className="stat-label-enhanced">Buyers</div>
              <div className="stat-value-enhanced">{stats?.buyers?.total || 0}</div>
              <div className="stat-change-enhanced">
                <span>↑</span> {stats?.buyers?.active || 0} Active
              </div>
            </div>
          </div>

          <div className="stat-card-enhanced products" onClick={() => navigate('/admin/products')}>
            <div className="stat-icon-enhanced">📂</div>
            <div className="stat-content-enhanced">
              <div className="stat-label-enhanced">Categories</div>
              <div className="stat-value-enhanced">{Object.keys(categories).length}</div>
              <div className="stat-change-enhanced">Product Types</div>
            </div>
          </div>
        </div>

        <div className="counting-summary">
          <h3>📊 Product Distribution</h3>
          <div className="count-grid">
            <div className="count-item">
              <span className="count-label">Total in Database:</span>
              <span className="count-value">{allProducts.length}</span>
            </div>
            <div className="count-item">
              <span className="count-label">Active Products:</span>
              <span className="count-value green">{allProducts.filter(p => p.status === 'active').length}</span>
            </div>
            <div className="count-item">
              <span className="count-label">Inactive Products:</span>
              <span className="count-value red">{allProducts.filter(p => p.status === 'inactive').length}</span>
            </div>
            <div className="count-item">
              <span className="count-label">Pending Products:</span>
              <span className="count-value orange">{allProducts.filter(p => p.status === 'pending').length}</span>
            </div>
            <div className="count-item">
              <span className="count-label">Amazon's Choice:</span>
              <span className="count-value blue">{amazonsChoice.length}</span>
            </div>

            <div className="count-item">
              <span className="count-label">In Stock:</span>
              <span className="count-value green">{allProducts.filter(p => p.stock > 0).length}</span>
            </div>
            <div className="count-item">
              <span className="count-label">Out of Stock:</span>
              <span className="count-value red">{allProducts.filter(p => p.stock === 0).length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="categories-overview">
        <h2>📂 Categories Overview</h2>
        <div className="categories-grid">
          {Object.entries(categories).map(([category, count]) => (
            <div key={category} className="category-card">
              <span className="category-name">{category}</span>
              <span className="category-count">{count} products</span>
            </div>
          ))}
        </div>
      </div>

      <div className="products-management">
        <div className="section-header compact" style={{cursor: 'pointer'}} onClick={() => toggleSection('amazonsChoice')}>
          <h2>
            <span style={{marginRight: '10px'}}>{expandedSections.amazonsChoice ? '▼' : '▶'}</span>
            🏆 Amazon's Choice Products ({amazonsChoice.length})
          </h2>
          <div style={{display: 'flex', gap: '8px'}}>
            <button 
              onClick={(e) => { e.stopPropagation(); viewAllInNewTab('/amazons-choice'); }} 
              className="view-all-btn compact"
            >
              🌐 View Page
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); navigate('/admin/products'); }} 
              className="view-all-btn compact"
            >
              Manage All
            </button>
          </div>
        </div>
        
        {expandedSections.amazonsChoice && (
          <div className="products-table compact">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {amazonsChoice.slice(0, 10).map(product => (
                  <tr key={product._id}>
                    <td className="product-name">
                      <span 
                        onClick={() => handleProductClick(product)}
                        style={{
                          cursor: 'pointer',
                          color: '#667eea',
                          textDecoration: 'underline'
                        }}
                        title="Click to view product details"
                      >
                        {product.name}
                      </span>
                    </td>
                    <td><span className="category-badge">{product.category}</span></td>
                    <td className="price">
                      {editingProduct?.id === product._id ? (
                        <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                          <span style={{fontSize: '0.85rem', color: '#666'}}>Rs</span>
                          <input 
                            type="number" 
                            value={editingProduct.price}
                            onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                            style={{width: '80px', padding: '4px', border: '2px solid #667eea', borderRadius: '4px'}}
                            placeholder={currencySymbols[currency]}
                          />
                        </div>
                      ) : (
                        formatPrice(product.price)
                      )}
                    </td>
                    <td className="stock">
                      {editingProduct?.id === product._id ? (
                        <input 
                          type="number" 
                          value={editingProduct.stock}
                          onChange={(e) => setEditingProduct({...editingProduct, stock: e.target.value, quantity: e.target.value})}
                          style={{width: '60px', padding: '4px', border: '2px solid #667eea', borderRadius: '4px'}}
                        />
                      ) : (
                        product.stock
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${product.status}`}>{product.status}</span>
                    </td>
                    <td className="actions">
                      {editingProduct?.id === product._id ? (
                        <>
                          <button onClick={() => updateProduct(product._id)} style={{background: '#28a745', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px', fontSize: '0.75rem'}}>✅ Update</button>
                          <button onClick={cancelEditing} style={{background: '#6c757d', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem'}}>❌</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditing(product)} style={{background: '#667eea', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px', fontSize: '0.75rem'}}>✏️ Quick</button>
                          <button onClick={() => startFullEditing(product)} style={{background: '#28a745', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px', fontSize: '0.75rem'}}>📝 Full</button>
                          <button onClick={() => quickDeleteProduct(product._id)} className="delete-btn" title="Delete">🗑️</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>







      {/* Sellers Management Section */}
      <div className="products-management">
        <div className="section-header compact" style={{cursor: 'pointer'}} onClick={() => toggleSection('sellers')}>
          <h2>
            <span style={{marginRight: '10px'}}>{expandedSections.sellers ? '▼' : '▶'}</span>
            👥 Registered Sellers ({sellers.length})
          </h2>
          <div style={{display: 'flex', gap: '8px'}}>
            <button 
              onClick={(e) => { e.stopPropagation(); navigate('/admin/sellers'); }} 
              className="view-all-btn compact"
            >
              Manage All
            </button>
          </div>
        </div>
        
        {expandedSections.sellers && (
          <div className="products-table compact">
            <table>
              <thead>
                <tr>
                  <th>Supplier ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>WhatsApp/Contact</th>
                  <th>Location</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sellers.slice(0, 10).map(seller => (
                  <tr key={seller._id}>
                    <td className="product-name">{seller.supplierId}</td>
                    <td>{seller.username}</td>
                    <td>{seller.email}</td>
                    <td>{seller.whatsappNo || seller.contactNo || 'N/A'}</td>
                    <td>{seller.city}, {seller.country}</td>
                    <td><span className="category-badge">{seller.productCategory}</span></td>
                    <td>
                      <span className={`status-badge ${seller.verificationStatus || 'required'}`}>
                        {seller.verificationStatus === 'approved' ? '✅ VERIFIED' :
                         seller.verificationStatus === 'pending' ? '⏳ PENDING' :
                         seller.verificationStatus === 'rejected' ? '❌ REJECTED' :
                         '📝 NEEDS VERIFICATION'}
                      </span>
                    </td>
                    <td>{new Date(seller.createdAt).toLocaleDateString()}</td>
                    <td className="actions">
                      <button 
                        onClick={() => navigate('/admin/sellers')} 
                        style={{
                          background: '#667eea',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginRight: '4px',
                          fontSize: '0.75rem'
                        }}
                      >
                        👁️ View
                      </button>
                      <button 
                        onClick={() => handleDeleteSeller(seller._id)} 
                        style={{
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem'
                        }}
                        title="Delete Seller"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="quick-tools compact">
        <button onClick={() => navigate('/admin/products')} className="tool-btn">
          📦 Manage All ({stats?.products.total || 0})
        </button>
        <button onClick={() => navigate('/admin/excel-import')} className="tool-btn primary">
          ➕ UK Products (Excel)
        </button>
        <button onClick={() => navigate('/admin/uae-excel-import')} className="tool-btn warning">
          🇦🇪 UAE Products (Excel)
        </button>
        <button onClick={() => navigate('/admin/amazon10-excel-import')} className="tool-btn info">
          📊 Amazon 10 Products (Excel)
        </button>
        <button onClick={importHardcodedProducts} className="tool-btn success" style={{color: 'black'}}>
          📥 Import JSON
        </button>
        <button onClick={() => navigate('/admin/sellers')} className="tool-btn">
          👥 Sellers ({stats?.sellers.total || 0})
        </button>
        <button onClick={() => navigate('/admin/seller-products')} className="tool-btn warning">
          📋 Seller Products
        </button>
        <button onClick={() => navigate('/admin/seller-verifications')} className="tool-btn info">
          🆔 Seller Verifications ({stats?.verifications?.pending || 0} pending)
        </button>
        <button onClick={() => navigate('/admin/seller-listings')} className="tool-btn success">
          📋 Seller Listings ({stats?.sellerListings?.total || 0} total)
        </button>
        <button onClick={() => navigate('/admin/pending-payments')} className="tool-btn warning">
          💳 Pending Payments ({stats?.pendingPayments || 0})
        </button>
        <button onClick={bulkDeleteProducts} className="tool-btn danger">
          🗑️ Delete All
        </button>
      </div>

      {/* Full Product Edit Modal */}
      {showFullEditModal && fullEditProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px',
              borderBottom: '2px solid #f0f0f0',
              paddingBottom: '15px'
            }}>
              <h2 style={{margin: 0, color: '#333', fontSize: '1.5rem'}}>
                📝 Edit Product - Full Control
              </h2>

              <button 
                onClick={() => setShowFullEditModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#999',
                  padding: '5px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '25px'
            }}>
              {/* Basic Information */}
              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555'}}>
                  Product Name *
                </label>
                <input
                  type="text"
                  value={fullEditProduct.name}
                  onChange={(e) => setFullEditProduct({...fullEditProduct, name: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555'}}>
                  Brand
                </label>
                <input
                  type="text"
                  value={fullEditProduct.brand}
                  onChange={(e) => setFullEditProduct({...fullEditProduct, brand: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  placeholder="Enter brand name"
                />
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555'}}>
                  Category *
                </label>
                <select
                  value={fullEditProduct.category}
                  onChange={(e) => setFullEditProduct({...fullEditProduct, category: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                >
                  <option value="">Select Category</option>
                  <option value="remote">Remote Controls</option>
                  <option value="electronics">Electronics</option>
                  <option value="strap">Watch Straps</option>
                  <option value="jewelry">Jewelry</option>
                  <option value="party">Party Supplies</option>
                  <option value="home">Home & Decor</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="automotive">Automotive</option>
                  <option value="tape">Tape</option>
                  <option value="lampshade">Lampshades</option>
                  <option value="clothing">Clothing</option>
                  <option value="food">Food</option>
                  <option value="beauty">Beauty</option>
                  <option value="sports">Sports</option>
                  <option value="toys">Toys</option>
                  <option value="books">Books</option>
                  <option value="health">Health</option>
                </select>
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555'}}>
                  No of Deal Units *
                </label>
                <input
                  type="number"
                  min="1"
                  value={fullEditProduct.dealUnits}
                  onChange={(e) => {
                    const units = parseInt(e.target.value) || 1;
                    setFullEditProduct({
                      ...fullEditProduct, 
                      dealUnits: units
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  placeholder="1"
                />
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555'}}>
                  Cost Price ({currencySymbols[currency]}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fullEditProduct.costPrice}
                  onChange={(e) => {
                    const cost = parseFloat(e.target.value) || 0;
                    setFullEditProduct({
                      ...fullEditProduct, 
                      costPrice: cost
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555'}}>
                  Display Price ({currencySymbols[currency]})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={fullEditProduct.price}
                  onChange={(e) => setFullEditProduct({...fullEditProduct, price: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  placeholder="0.00"
                />
                <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px'}}>
                  <small style={{color: '#666', fontSize: '0.85rem'}}>Manually editable - set your desired price</small>
                  <button
                    type="button"
                    onClick={() => {
                      const units = parseInt(fullEditProduct.dealUnits) || 1;
                      const cost = parseFloat(fullEditProduct.costPrice) || 0;
                      setFullEditProduct({
                        ...fullEditProduct,
                        price: (units * cost).toFixed(2)
                      });
                    }}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      backgroundColor: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    🧮 Auto-calc ({currencySymbols[currency]})
                  </button>
                </div>
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555'}}>
                  Stock Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={fullEditProduct.stock}
                  onChange={(e) => setFullEditProduct({...fullEditProduct, stock: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  placeholder="0"
                />
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555'}}>
                  Rating (1-5)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={fullEditProduct.rating}
                  onChange={(e) => setFullEditProduct({...fullEditProduct, rating: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  placeholder="4.0"
                />
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555'}}>
                  Number of Reviews
                </label>
                <input
                  type="number"
                  min="0"
                  value={fullEditProduct.reviews}
                  onChange={(e) => setFullEditProduct({...fullEditProduct, reviews: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  placeholder="0"
                />
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555'}}>
                  Status
                </label>
                <select
                  value={fullEditProduct.status}
                  onChange={(e) => setFullEditProduct({...fullEditProduct, status: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

            </div>

            {/* Images */}
            <div style={{marginBottom: '20px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555'}}>
                Product Images (comma-separated URLs)
              </label>
              <textarea
                value={fullEditProduct.images}
                onChange={(e) => setFullEditProduct({...fullEditProduct, images: e.target.value})}
                rows="3"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  resize: 'vertical'
                }}
                placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
              />
            </div>

            {/* Feature Flags */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px',
              marginBottom: '25px',
              padding: '20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                <input
                  type="checkbox"
                  checked={fullEditProduct.isAmazonsChoice}
                  onChange={(e) => setFullEditProduct({...fullEditProduct, isAmazonsChoice: e.target.checked})}
                  style={{marginRight: '8px', transform: 'scale(1.2)'}}
                />
                <span style={{fontWeight: 'bold', color: '#555'}}>🏆 Amazon's Choice</span>
              </label>
            </div>

            {/* Unit Quantity Selector */}
            <div style={{marginBottom: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '1rem', color: '#495057'}}>
                📦 Select Unit Quantity for Profit Calculations
              </label>
              <select
                value={fullEditProduct.platformUnits || 200}
                onChange={(e) => {
                  const units = parseInt(e.target.value);
                  setFullEditProduct({
                    ...fullEditProduct, 
                    platformUnits: units,
                    dealUnits: units // Also update dealUnits for backward compatibility
                  });
                }}
                style={{
                  width: '200px', 
                  padding: '10px', 
                  border: '1px solid #ddd', 
                  borderRadius: '6px', 
                  fontSize: '0.9rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="200">200 units</option>
                <option value="300">300 units</option>
                <option value="400">400 units</option>
                <option value="500">500 units</option>
                <option value="600">600 units</option>
                <option value="700">700 units</option>
                <option value="800">800 units</option>
                <option value="900">900 units</option>
                <option value="1000">1000 units</option>
              </select>
              <small style={{display: 'block', marginTop: '5px', color: '#6c757d'}}>
                This will be used for profit calculations in the Platform Comparison table
              </small>
            </div>

            {/* Platform Comparison Section */}
            <div style={{marginBottom: '25px', padding: '20px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '2px solid #28a745'}}>
              <h3 style={{color: '#28a745', marginBottom: '15px', fontSize: '1.2rem'}}>📊 Platform Comparison ({fullEditProduct.platformUnits || fullEditProduct.dealUnits || 200} units)</h3>
              {fullEditProduct.platformComparison.map((platform, index) => (
                <div key={index} style={{marginBottom: '15px', padding: '15px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #ddd'}}>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'center'}}>
                    <div>
                      <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem'}}>Platform</label>
                      <select
                        value={platform.platform}
                        onChange={(e) => {
                          const newPlatforms = [...fullEditProduct.platformComparison];
                          newPlatforms[index].platform = e.target.value;
                          setFullEditProduct({...fullEditProduct, platformComparison: newPlatforms});
                        }}
                        style={{width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px'}}
                      >
                        <option value="RRP">RRP</option>
                        <option value="Amazon">Amazon</option>
                        <option value="eBay">eBay</option>
                        <option value="Walmart">Walmart</option>
                        <option value="AliExpress">AliExpress</option>
                        <option value="Shopify">Shopify</option>
                        <option value="Etsy">Etsy</option>
                        <option value="Facebook Marketplace">Facebook Marketplace</option>
                        <option value="Mercari">Mercari</option>
                        <option value="Poshmark">Poshmark</option>
                        <option value="Depop">Depop</option>
                        <option value="Vinted">Vinted</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem'}}>RRP/Unit (£)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={platform.rrpPerUnit}
                        onChange={(e) => {
                          const newPlatforms = [...fullEditProduct.platformComparison];
                          newPlatforms[index].rrpPerUnit = parseFloat(e.target.value) || 0;
                          setFullEditProduct({...fullEditProduct, platformComparison: newPlatforms});
                        }}
                        style={{width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px'}}
                      />
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem'}}>Profit ({fullEditProduct.platformUnits || fullEditProduct.dealUnits || 200} units)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={platform.profitFor200Units}
                        onChange={(e) => {
                          const newPlatforms = [...fullEditProduct.platformComparison];
                          newPlatforms[index].profitFor200Units = parseFloat(e.target.value) || 0;
                          setFullEditProduct({...fullEditProduct, platformComparison: newPlatforms});
                        }}
                        style={{width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px'}}
                      />
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem'}}>Markup</label>
                      <input
                        type="text"
                        value={platform.markup}
                        onChange={(e) => {
                          const newPlatforms = [...fullEditProduct.platformComparison];
                          newPlatforms[index].markup = e.target.value;
                          setFullEditProduct({...fullEditProduct, platformComparison: newPlatforms});
                        }}
                        style={{width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px'}}
                        placeholder="e.g., 1376.13%"
                      />
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '20px'}}>
                      <button
                        onClick={() => {
                          const newPlatforms = [...fullEditProduct.platformComparison];
                          newPlatforms.splice(index, 1);
                          setFullEditProduct({...fullEditProduct, platformComparison: newPlatforms});
                        }}
                        style={{
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '4px 6px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '0.7rem'
                        }}
                        title="Remove Platform"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                onClick={() => {
                  const newPlatforms = [...fullEditProduct.platformComparison, 
                    { platform: 'Other', rrpPerUnit: 0, profitFor200Units: 0, markup: '0%' }
                  ];
                  setFullEditProduct({...fullEditProduct, platformComparison: newPlatforms});
                }}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  marginTop: '10px'
                }}
              >
                ➕ Add Platform
              </button>
            </div>

            {/* Profit Calculations Section */}
            <div style={{marginBottom: '25px', padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '2px solid #2196f3'}}>
              <h3 style={{color: '#2196f3', marginBottom: '15px', fontSize: '1.2rem'}}>💰 Profit Calculations</h3>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Profit per Unit (Rs)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fullEditProduct.profitCalculations.profitPerUnit}
                    onChange={(e) => setFullEditProduct({
                      ...fullEditProduct, 
                      profitCalculations: {
                        ...fullEditProduct.profitCalculations,
                        profitPerUnit: parseFloat(e.target.value) || 0
                      }
                    })}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                    If sold 200 units (Rs)
                    <span style={{fontSize: '0.75rem', color: '#17a2b8', fontWeight: 'normal', marginLeft: '5px'}}>
                      🧮 Auto (Profit/Unit × 200)
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={(fullEditProduct.profitCalculations.profitPerUnit || 0) * 200}
                    readOnly
                    style={{width: '100%', padding: '10px', border: '1px solid #17a2b8', borderRadius: '4px', backgroundColor: '#e7f3ff', cursor: 'not-allowed'}}
                  />
                </div>


              </div>
            </div>

            {/* Profit Evaluation Section */}
            <div style={{marginBottom: '25px', padding: '20px', backgroundColor: '#fff3e0', borderRadius: '8px', border: '2px solid #ff9800'}}>
              <h3 style={{color: '#ff9800', marginBottom: '15px', fontSize: '1.2rem'}}>📈 Profit Evaluation</h3>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Sales Proceeds (Rs)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fullEditProduct.profitEvaluation.salesProceeds}
                    onChange={(e) => setFullEditProduct({
                      ...fullEditProduct, 
                      profitEvaluation: {
                        ...fullEditProduct.profitEvaluation,
                        salesProceeds: parseFloat(e.target.value) || 0
                      }
                    })}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Commission + inc tax ({currencySymbols[currency]})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fullEditProduct.profitEvaluation.commission}
                    onChange={(e) => setFullEditProduct({
                      ...fullEditProduct, 
                      profitEvaluation: {
                        ...fullEditProduct.profitEvaluation,
                        commission: parseFloat(e.target.value) || 0
                      }
                    })}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Digital Services Fee + inc tax ({currencySymbols[currency]})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fullEditProduct.profitEvaluation.digitalServicesFee}
                    onChange={(e) => setFullEditProduct({
                      ...fullEditProduct, 
                      profitEvaluation: {
                        ...fullEditProduct.profitEvaluation,
                        digitalServicesFee: parseFloat(e.target.value) || 0
                      }
                    })}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>FBA Fulfilment Fee + inc tax ({currencySymbols[currency]})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fullEditProduct.profitEvaluation.fbaFulfilmentFee}
                    onChange={(e) => setFullEditProduct({
                      ...fullEditProduct, 
                      profitEvaluation: {
                        ...fullEditProduct.profitEvaluation,
                        fbaFulfilmentFee: parseFloat(e.target.value) || 0
                      }
                    })}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Balance Change (Rs)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fullEditProduct.profitEvaluation.balanceChange}
                    onChange={(e) => setFullEditProduct({
                      ...fullEditProduct, 
                      profitEvaluation: {
                        ...fullEditProduct.profitEvaluation,
                        balanceChange: parseFloat(e.target.value) || 0
                      }
                    })}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Product Cost (Rs)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fullEditProduct.profitEvaluation.productCost}
                    onChange={(e) => setFullEditProduct({
                      ...fullEditProduct, 
                      profitEvaluation: {
                        ...fullEditProduct.profitEvaluation,
                        productCost: parseFloat(e.target.value) || 0
                      }
                    })}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px'}}
                  />
                </div>
                <div>
                  <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>Net Profit (Rs)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fullEditProduct.profitEvaluation.netProfit}
                    onChange={(e) => setFullEditProduct({
                      ...fullEditProduct, 
                      profitEvaluation: {
                        ...fullEditProduct.profitEvaluation,
                        netProfit: parseFloat(e.target.value) || 0
                      }
                    })}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px'}}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '2px solid #f0f0f0',
              paddingTop: '20px'
            }}>
              <button
                onClick={() => setShowFullEditModal(false)}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                ❌ Cancel
              </button>

              <button
                onClick={updateFullProduct}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                }}
              >
                ✅ Update Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profit Details Modal */}
      {showProfitModal && profitEditProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '1200px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{
              padding: '25px',
              borderBottom: '2px solid #f0f0f0',
              background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
              color: 'white',
              borderRadius: '12px 12px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{margin: 0, fontSize: '1.5rem', fontWeight: 'bold'}}>💰 Profit Details Management</h2>
                <p style={{margin: '5px 0 0 0', opacity: 0.9}}>{profitEditProduct.name}</p>
              </div>
              <button 
                onClick={() => setShowProfitModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '20px',
                  fontWeight: '700'
                }}
              >
                ×
              </button>
            </div>

            <div style={{padding: '25px'}}>
              {/* Unit Quantity Selector */}
              <div style={{marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '1rem', color: '#495057'}}>
                  📦 Select Unit Quantity for Profit Calculations
                </label>
                <select
                  value={profitEditProduct.platformUnits || 200}
                  onChange={(e) => {
                    const units = parseInt(e.target.value);
                    setProfitEditProduct({
                      ...profitEditProduct, 
                      platformUnits: units,
                      dealUnits: units // Also update dealUnits for backward compatibility
                    });
                  }}
                  style={{
                    width: '200px', 
                    padding: '10px', 
                    border: '1px solid #ddd', 
                    borderRadius: '6px', 
                    fontSize: '0.9rem',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="200">200 units</option>
                  <option value="300">300 units</option>
                  <option value="400">400 units</option>
                  <option value="500">500 units</option>
                  <option value="600">600 units</option>
                  <option value="700">700 units</option>
                  <option value="800">800 units</option>
                  <option value="900">900 units</option>
                  <option value="1000">1000 units</option>
                </select>
                <small style={{display: 'block', marginTop: '5px', color: '#6c757d'}}>
                  This will be used for profit calculations in the Platform Comparison table
                </small>
              </div>

              {/* Platform Comparison Section */}
              <div style={{marginBottom: '30px', padding: '20px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '2px solid #28a745'}}>
                <h3 style={{color: '#28a745', marginBottom: '20px', fontSize: '1.3rem'}}>📊 Platform Comparison ({profitEditProduct.platformUnits || profitEditProduct.dealUnits || 200} units)</h3>
                {profitEditProduct.platformComparison.map((platform, index) => (
                  <div key={index} style={{marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #ddd'}}>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '15px', alignItems: 'center'}}>
                      <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>Platform</label>
                        <select
                          value={platform.platform}
                          onChange={(e) => {
                            const newPlatforms = [...profitEditProduct.platformComparison];
                            newPlatforms[index].platform = e.target.value;
                            setProfitEditProduct({...profitEditProduct, platformComparison: newPlatforms});
                          }}
                          style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                        >
                          <option value="RRP">RRP</option>
                          <option value="Amazon">Amazon</option>
                          <option value="eBay">eBay</option>
                          <option value="Walmart">Walmart</option>
                          <option value="AliExpress">AliExpress</option>
                          <option value="Shopify">Shopify</option>
                          <option value="Etsy">Etsy</option>
                          <option value="Facebook Marketplace">Facebook Marketplace</option>
                          <option value="Mercari">Mercari</option>
                          <option value="Poshmark">Poshmark</option>
                          <option value="Depop">Depop</option>
                          <option value="Vinted">Vinted</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>RRP/Unit (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={platform.rrpPerUnit}
                          onChange={(e) => {
                            const newPlatforms = [...profitEditProduct.platformComparison];
                            newPlatforms[index].rrpPerUnit = parseFloat(e.target.value) || 0;
                            setProfitEditProduct({...profitEditProduct, platformComparison: newPlatforms});
                          }}
                          style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                        />
                      </div>
                      <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>Profit ({profitEditProduct.platformUnits || profitEditProduct.dealUnits || 200} units)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={platform.profitFor200Units}
                          onChange={(e) => {
                            const newPlatforms = [...profitEditProduct.platformComparison];
                            newPlatforms[index].profitFor200Units = parseFloat(e.target.value) || 0;
                            setProfitEditProduct({...profitEditProduct, platformComparison: newPlatforms});
                          }}
                          style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                        />
                      </div>
                      <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>Markup</label>
                        <input
                          type="text"
                          value={platform.markup}
                          onChange={(e) => {
                            const newPlatforms = [...profitEditProduct.platformComparison];
                            newPlatforms[index].markup = e.target.value;
                            setProfitEditProduct({...profitEditProduct, platformComparison: newPlatforms});
                          }}
                          style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                          placeholder="e.g., 1376.13%"
                        />
                      </div>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '25px'}}>
                        <button
                          onClick={() => {
                            const newPlatforms = [...profitEditProduct.platformComparison];
                            newPlatforms.splice(index, 1);
                            setProfitEditProduct({...profitEditProduct, platformComparison: newPlatforms});
                          }}
                          style={{
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '5px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                          title="Remove Platform"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={() => {
                    const newPlatforms = [...profitEditProduct.platformComparison, 
                      { platform: 'Other', rrpPerUnit: 0, profitFor200Units: 0, markup: '0%' }
                    ];
                    setProfitEditProduct({...profitEditProduct, platformComparison: newPlatforms});
                  }}
                  style={{
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    marginTop: '10px'
                  }}
                >
                  ➕ Add Platform
                </button>
              </div>

              {/* Profit Calculations Section */}
              <div style={{marginBottom: '30px', padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '2px solid #2196f3'}}>
                <h3 style={{color: '#2196f3', marginBottom: '20px', fontSize: '1.3rem'}}>💰 Profit Calculations</h3>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px'}}>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>
                      Profit per Unit (£) 
                      <span style={{fontSize: '0.8rem', color: '#17a2b8', fontWeight: 'normal', marginLeft: '8px'}}>
                        🧮 Auto-calculated (= Net Profit)
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={profitEditProduct.profitCalculations.profitPerUnit}
                      readOnly
                      style={{width: '100%', padding: '12px', border: '1px solid #17a2b8', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: '#e7f3ff', cursor: 'not-allowed'}}
                      placeholder="Auto-calculated: = Net Profit"
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>
                      If sold 200 units (Rs)
                      <span style={{fontSize: '0.8rem', color: '#17a2b8', fontWeight: 'normal', marginLeft: '8px'}}>
                        🧮 Auto-calculated (Profit per Unit × 200)
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={(profitEditProduct.profitCalculations.profitPerUnit || 0) * 200}
                      readOnly
                      style={{width: '100%', padding: '12px', border: '1px solid #17a2b8', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: '#e7f3ff', cursor: 'not-allowed'}}
                      placeholder="Auto-calculated: Profit per Unit × 200"
                    />
                  </div>


                </div>
              </div>

              {/* Profit Evaluation Section */}
              <div style={{marginBottom: '30px', padding: '20px', backgroundColor: '#fff3e0', borderRadius: '8px', border: '2px solid #ff9800'}}>
                <h3 style={{color: '#ff9800', marginBottom: '20px', fontSize: '1.3rem'}}>📈 Profit Evaluation</h3>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px'}}>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Sales Proceeds (Rs)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={profitEditProduct.profitEvaluation.salesProceeds}
                      onChange={(e) => setProfitEditProduct({
                        ...profitEditProduct, 
                        profitEvaluation: {
                          ...profitEditProduct.profitEvaluation,
                          salesProceeds: parseFloat(e.target.value) || 0
                        }
                      })}
                      style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Commission + inc tax (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={profitEditProduct.profitEvaluation.commission}
                      onChange={(e) => setProfitEditProduct({
                        ...profitEditProduct, 
                        profitEvaluation: {
                          ...profitEditProduct.profitEvaluation,
                          commission: parseFloat(e.target.value) || 0
                        }
                      })}
                      style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Digital Services Fee + inc tax (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={profitEditProduct.profitEvaluation.digitalServicesFee}
                      onChange={(e) => setProfitEditProduct({
                        ...profitEditProduct, 
                        profitEvaluation: {
                          ...profitEditProduct.profitEvaluation,
                          digitalServicesFee: parseFloat(e.target.value) || 0
                        }
                      })}
                      style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>FBA Fulfilment Fee + inc tax (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={profitEditProduct.profitEvaluation.fbaFulfilmentFee}
                      onChange={(e) => setProfitEditProduct({
                        ...profitEditProduct, 
                        profitEvaluation: {
                          ...profitEditProduct.profitEvaluation,
                          fbaFulfilmentFee: parseFloat(e.target.value) || 0
                        }
                      })}
                      style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Balance Change (Rs)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={profitEditProduct.profitEvaluation.balanceChange}
                      onChange={(e) => {
                        const newBalanceChange = parseFloat(e.target.value) || 0;
                        const productCost = profitEditProduct.profitEvaluation.productCost || 0;
                        const calculatedNetProfit = newBalanceChange - productCost; // Formula: Net Profit = Balance Change - Product Cost
                        
                        setProfitEditProduct({
                          ...profitEditProduct, 
                          profitEvaluation: {
                            ...profitEditProduct.profitEvaluation,
                            balanceChange: newBalanceChange,
                            netProfit: calculatedNetProfit // Auto-calculate Net Profit
                          },
                          profitCalculations: {
                            ...profitEditProduct.profitCalculations,
                            profitPerUnit: calculatedNetProfit // Auto-calculate Profit per Unit = Net Profit
                          }
                        });
                      }}
                      style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>
                      Product Cost (£) 
                      <span style={{fontSize: '0.8rem', color: '#28a745', fontWeight: 'normal', marginLeft: '8px'}}>
                        🔄 Auto-syncs with product price
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={profitEditProduct.profitEvaluation.productCost}
                      onChange={(e) => {
                        const newProductCost = parseFloat(e.target.value) || 0;
                        const balanceChange = profitEditProduct.profitEvaluation.balanceChange || 0;
                        const calculatedNetProfit = balanceChange - newProductCost; // Formula: Net Profit = Balance Change - Product Cost
                        
                        setProfitEditProduct({
                          ...profitEditProduct, 
                          profitEvaluation: {
                            ...profitEditProduct.profitEvaluation,
                            productCost: newProductCost,
                            netProfit: calculatedNetProfit // Auto-calculate Net Profit
                          },
                          profitCalculations: {
                            ...profitEditProduct.profitCalculations,
                            profitPerUnit: calculatedNetProfit // Auto-calculate Profit per Unit = Net Profit
                          }
                        });
                      }}
                      style={{width: '100%', padding: '12px', border: '1px solid #28a745', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: '#f8fff9'}}
                      placeholder="Auto-syncs with current product price"
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>
                      Net Profit (£) 
                      <span style={{fontSize: '0.8rem', color: '#17a2b8', fontWeight: 'normal', marginLeft: '8px'}}>
                        🧮 Auto-calculated (Balance Change - Product Cost)
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={profitEditProduct.profitEvaluation.netProfit}
                      readOnly
                      style={{width: '100%', padding: '12px', border: '1px solid #17a2b8', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: '#e7f3ff', cursor: 'not-allowed'}}
                      placeholder="Auto-calculated: Balance Change - Product Cost"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '2px solid #f0f0f0',
                paddingTop: '25px'
              }}>
                <button
                  onClick={() => setShowProfitModal(false)}
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  ❌ Cancel
                </button>

                <button
                  onClick={updateProfitData}
                  style={{
                    background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(255, 152, 0, 0.4)'
                  }}
                >
                  ✅ Update Profit Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
