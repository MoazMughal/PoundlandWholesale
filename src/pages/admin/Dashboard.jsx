import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../../context/CurrencyContext';
import { useAdmin } from '../../context/AdminContext';
import '../../styles/AdminDashboard.css';
import '../../styles/AdminLayout.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentProducts, setRecentProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [amazonsChoice, setAmazonsChoice] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [latestDeals, setLatestDeals] = useState([]);
  const [categories, setCategories] = useState({});
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    search: true,
    amazonsChoice: false,
    bestSellers: false,
    latestDeals: false,
    allProducts: false,
    sellers: false
  });
  const navigate = useNavigate();
  const { currency, setCurrency, formatPrice } = useCurrency();
  const { logout: adminLogout } = useAdmin();

  useEffect(() => {
    fetchStats();
    fetchRecentProducts();
    fetchAllProducts();
    fetchAmazonsChoice();
    fetchBestSellers();
    fetchLatestDeals();
    fetchSellers();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentProducts = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/products?limit=5&sortBy=createdAt&order=desc', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRecentProducts(data.products);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/products?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAllProducts(data.products);
        
        // Calculate categories
        const categoryCount = {};
        data.products.forEach(product => {
          const cat = product.category || 'Uncategorized';
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
        setCategories(categoryCount);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchAmazonsChoice = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/products?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const amazonProducts = data.products.filter(p => p.isAmazonsChoice);
        setAmazonsChoice(amazonProducts);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchBestSellers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/products?limit=1000', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        const bestSellerProducts = data.products.filter(p => p.isBestSeller);
        setBestSellers(bestSellerProducts);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchLatestDeals = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/products?limit=20&sortBy=createdAt&order=desc', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setLatestDeals(data.products);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchSellers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/sellers?status=all&limit=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSellers(data.sellers);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteSeller = async (id) => {
    if (!confirm('⚠️ Are you sure you want to permanently delete this seller? This action cannot be undone!')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/sellers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('✅ Seller deleted successfully');
        fetchSellers();
        fetchStats(); // Refresh stats
      } else {
        const data = await response.json();
        alert('❌ ' + data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Failed to delete seller');
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
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('✅ Product deleted successfully!');
        fetchRecentProducts();
        fetchAllProducts();
        fetchStats();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Failed to delete product');
    }
  };

  const quickEditProduct = (id) => {
    navigate(`/admin/products/edit/${id}`);
  };

  const bulkDeleteProducts = async () => {
    if (!confirm('⚠️ Delete ALL products? This cannot be undone!')) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      for (const product of allProducts) {
        await fetch(`http://localhost:5000/api/products/${product._id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      alert('✅ All products deleted!');
      fetchRecentProducts();
      fetchAllProducts();
      fetchAmazonsChoice();
      fetchBestSellers();
      fetchStats();
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Failed to delete products');
    }
  };

  const importHardcodedProducts = async () => {
    if (!confirm('📦 Import all hardcoded products from your data files into the database?')) return;
    
    try {
      setLoading(true);
      
      // Dynamically import the products data
      const { default: products } = await import('../../data/extracted-products.json');
      
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/products/bulk-import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ products })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Import Complete!\n\n✅ Imported: ${result.imported}\n⏭️ Skipped: ${result.skipped}\n${result.errors ? `❌ Errors: ${result.errors.length}` : ''}`);
        fetchRecentProducts();
        fetchAllProducts();
        fetchAmazonsChoice();
        fetchBestSellers();
        fetchLatestDeals();
        fetchStats();
      } else {
        throw new Error('Import failed');
      }
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
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/products?search=${encodeURIComponent(query)}&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.products);
      }
    } catch (error) {
      console.error('Error:', error);
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

  const cancelEditing = () => {
    setEditingProduct(null);
  };

  const updateProduct = async (productId) => {
    if (!editingProduct) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          price: parseFloat(editingProduct.price),
          stock: parseInt(editingProduct.stock),
          quantity: parseInt(editingProduct.quantity)
        })
      });

      if (response.ok) {
        alert('✅ Product updated successfully!');
        setEditingProduct(null);
        // Refresh all data
        fetchRecentProducts();
        fetchAllProducts();
        fetchAmazonsChoice();
        fetchBestSellers();
        fetchLatestDeals();
        if (searchQuery) {
          handleSearch(searchQuery);
        }
      } else {
        alert('❌ Failed to update product');
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
        fetchBestSellers();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Failed to update price');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="admin-dashboard compact">
      <header className="dashboard-header compact">
        <h1>🏪 Admin Dashboard</h1>
        <div className="header-actions" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginRight: '10px'}}>
            <span style={{fontSize: '0.85rem', color: '#666', marginRight: '6px', fontWeight: '600'}}>Currency:</span>
            <select 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '2px solid #667eea',
                background: 'white',
                color: '#667eea',
                fontWeight: '600',
                fontSize: '0.9rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="PKR">Rs PKR</option>
              <option value="USD">$ USD</option>
              <option value="GBP">£ GBP</option>
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
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div className="section-header compact" style={{cursor: 'pointer', marginBottom: '15px'}} onClick={() => toggleSection('search')}>
          <h2>
            <span style={{marginRight: '10px'}}>{expandedSections.search ? '▼' : '▶'}</span>
            🔍 Search & Update Products
          </h2>
        </div>

        {expandedSections.search && (
          <>
            <div style={{marginBottom: '20px'}}>
              <input
                type="text"
                placeholder="🔍 Search by product name, category, ID..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  fontSize: '1rem',
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
                              {product.name}
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
                                    placeholder="PKR"
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
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button 
                                    onClick={() => quickEditProduct(product._id)} 
                                    className="edit-btn" 
                                    title="Full Edit"
                                  >
                                    📝
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
        <div className="stats-grid compact">
          <div className="stat-card compact" onClick={() => navigate('/admin/products')}>
            <span className="stat-icon">📦</span>
            <div className="stat-content">
              <h3>Total Products</h3>
              <p className="stat-number">{allProducts.length}</p>
              <span className="stat-sub">✅ {stats?.products.active || 0} Active | ⏳ {stats?.products.pending || 0} Pending</span>
            </div>
          </div>

          <div className="stat-card compact amazon" onClick={() => navigate('/admin/products')}>
            <span className="stat-icon">🏆</span>
            <div className="stat-content">
              <h3>Amazon's Choice</h3>
              <p className="stat-number">{amazonsChoice.length}</p>
              <span className="stat-sub">Featured Products</span>
            </div>
          </div>

          <div className="stat-card compact bestseller" onClick={() => navigate('/admin/products')}>
            <span className="stat-icon">🔥</span>
            <div className="stat-content">
              <h3>Best Sellers</h3>
              <p className="stat-number">{bestSellers.length}</p>
              <span className="stat-sub">Top Products</span>
            </div>
          </div>

          <div className="stat-card compact deals" onClick={() => navigate('/admin/products')}>
            <span className="stat-icon">⚡</span>
            <div className="stat-content">
              <h3>Latest Deals</h3>
              <p className="stat-number">{latestDeals.length}</p>
              <span className="stat-sub">Recent Products</span>
            </div>
          </div>

          <div className="stat-card compact" onClick={() => navigate('/admin/sellers')}>
            <span className="stat-icon">👥</span>
            <div className="stat-content">
              <h3>Sellers</h3>
              <p className="stat-number">{stats?.sellers.total || 0}</p>
              <span className="stat-sub">✅ {stats?.sellers.approved || 0} Approved</span>
            </div>
          </div>

          <div className="stat-card compact" onClick={() => navigate('/admin/seller-verifications')}>
            <span className="stat-icon">🆔</span>
            <div className="stat-content">
              <h3>Verifications</h3>
              <p className="stat-number">{stats?.verifications?.pending || 0}</p>
              <span className="stat-sub">⏳ Pending Review</span>
            </div>
          </div>

          <div className="stat-card compact" onClick={() => navigate('/admin/buyers')}>
            <span className="stat-icon">🛒</span>
            <div className="stat-content">
              <h3>Buyers</h3>
              <p className="stat-number">{stats?.buyers?.total || 0}</p>
              <span className="stat-sub">✅ {stats?.buyers?.active || 0} Active</span>
            </div>
          </div>

          <div className="stat-card compact">
            <span className="stat-icon">📂</span>
            <div className="stat-content">
              <h3>Categories</h3>
              <p className="stat-number">{Object.keys(categories).length}</p>
              <span className="stat-sub">Product Types</span>
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
              <span className="count-label">Best Sellers:</span>
              <span className="count-value purple">{bestSellers.length}</span>
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
                    <td className="product-name">{product.name}</td>
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
                            placeholder="PKR"
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
                          <button onClick={() => startEditing(product)} style={{background: '#667eea', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px', fontSize: '0.75rem'}}>✏️ Edit</button>
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

      <div className="products-management">
        <div className="section-header compact" style={{cursor: 'pointer'}} onClick={() => toggleSection('bestSellers')}>
          <h2>
            <span style={{marginRight: '10px'}}>{expandedSections.bestSellers ? '▼' : '▶'}</span>
            🔥 Best Sellers ({bestSellers.length})
          </h2>
          <div style={{display: 'flex', gap: '8px'}}>
            <button 
              onClick={(e) => { e.stopPropagation(); viewAllInNewTab('/best-sellers'); }} 
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
        
        {expandedSections.bestSellers && (
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
                {bestSellers.slice(0, 10).map(product => (
                  <tr key={product._id}>
                    <td className="product-name">{product.name}</td>
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
                            placeholder="PKR"
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
                          <button onClick={() => startEditing(product)} style={{background: '#667eea', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px', fontSize: '0.75rem'}}>✏️ Edit</button>
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

      <div className="products-management">
        <div className="section-header compact" style={{cursor: 'pointer'}} onClick={() => toggleSection('latestDeals')}>
          <h2>
            <span style={{marginRight: '10px'}}>{expandedSections.latestDeals ? '▼' : '▶'}</span>
            ⚡ Latest Deals ({latestDeals.length})
          </h2>
          <div style={{display: 'flex', gap: '8px'}}>
            <button 
              onClick={(e) => { e.stopPropagation(); viewAllInNewTab('/latest-deals'); }} 
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
        
        {expandedSections.latestDeals && (
          <div className="products-table compact">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Discount</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {latestDeals.slice(0, 10).map(product => (
                  <tr key={product._id}>
                    <td className="product-name">{product.name}</td>
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
                            placeholder="PKR"
                          />
                        </div>
                      ) : (
                        formatPrice(product.price)
                      )}
                    </td>
                    <td className="discount">{product.discount || 0}%</td>
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
                          <button onClick={() => startEditing(product)} style={{background: '#667eea', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px', fontSize: '0.75rem'}}>✏️ Edit</button>
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

      <div className="products-management">
        <div className="section-header compact" style={{cursor: 'pointer'}} onClick={() => toggleSection('allProducts')}>
          <h2>
            <span style={{marginRight: '10px'}}>{expandedSections.allProducts ? '▼' : '▶'}</span>
            📋 All Products ({allProducts.length})
          </h2>
          <button 
            onClick={(e) => { e.stopPropagation(); navigate('/admin/products'); }} 
            className="view-all-btn compact"
          >
            Manage All
          </button>
        </div>
        
        {expandedSections.allProducts && (
          <div className="products-table compact">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allProducts.slice(0, 15).map(product => (
                  <tr key={product._id}>
                    <td className="product-name">
                      {product.name}
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
                            placeholder="PKR"
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
                    <td className="rating">⭐ {product.rating}</td>
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
                          <button onClick={() => startEditing(product)} style={{background: '#667eea', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', marginRight: '4px', fontSize: '0.75rem'}}>✏️ Edit</button>
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
        <button onClick={importHardcodedProducts} className="tool-btn success">
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
        <button onClick={bulkDeleteProducts} className="tool-btn danger">
          🗑️ Delete All
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
