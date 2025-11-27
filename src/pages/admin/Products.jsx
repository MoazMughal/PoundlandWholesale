import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/AdminProducts.css';
import '../../styles/AdminLayout.css';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ category: '', status: '' });
  const [currency, setCurrency] = useState('PKR');
  const [editingCell, setEditingCell] = useState(null); // Track which cell is being edited
  const [editValues, setEditValues] = useState({}); // Store temporary edit values
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const navigate = useNavigate();
  
  const productsPerPage = 50;

  // Available categories for quick filter buttons (matching database exactly)
  const categories = [
    { value: 'all', label: 'All Products', icon: '📦' },
    { value: 'remote', label: 'Remote Controls', icon: '📺' },
    { value: 'electronics', label: 'Electronics', icon: '⚡' },
    { value: 'strap', label: 'Watch Straps', icon: '⌚' },
    { value: 'jewelry', label: 'Jewelry', icon: '💍' },
    { value: 'party', label: 'Party Supplies', icon: '🎉' },
    { value: 'home', label: 'Home & Decor', icon: '🏠' },
    { value: 'kitchen', label: 'Kitchen', icon: '🍳' },
    { value: 'automotive', label: 'Automotive', icon: '🚗' },
    { value: 'tape', label: 'Tape', icon: '📼' },
    { value: 'lampshade', label: 'Lampshades', icon: '💡' }
  ];

  // Currency conversion rates (base: PKR) - Manual rates
  const currencyRates = {
    PKR: 1,
    USD: 0.00353,   // 1 USD = 283.32 PKR
    GBP: 0.00272,   // 1 GBP = 367.74 PKR
    AED: 0.01310,   // 1 AED = 76.37 PKR
    GBP: 0.0028
  };

  const currencySymbols = {
    PKR: 'Rs',
    USD: '$',
    GBP: '£'
  };

  const convertPrice = (price) => {
    const converted = price * currencyRates[currency];
    return converted.toFixed(2);
  };

  const formatPrice = (price) => {
    return `${currencySymbols[currency]}${convertPrice(price)}`;
  };

  useEffect(() => {
    fetchProducts();
  }, [search, filters]);

  // Update filteredProducts when products or filters change
  useEffect(() => {
    let filtered = [...products];
    
    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }
    
    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    
    setFilteredProducts(filtered);
  }, [products, filters.category, filters.status]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      if (!token) {
        console.error('No admin token found. Please login.');
        navigate('/admin/login');
        return;
      }
      
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(filters.category && { category: filters.category }),
        ...(filters.status && { status: filters.status }),
        excludeSellerCopies: 'true', // Exclude seller copies to avoid duplicates
        limit: '10000' // Get all products
      });

      const url = `http://localhost:5000/api/products?${params}`;
      console.log('🔍 Fetching:', url);
      console.log('📋 Filters:', filters);

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', response.status, errorData);
        throw new Error('Failed to fetch products');
      }
      
      const data = await response.json();
      console.log('✅ Received:', data.products.length, 'products');
      console.log('📊 Total in database:', data.total || data.products.length);
      setProducts(data.products);
      setTotalProducts(data.total || data.products.length);
      setFilteredProducts(data.products);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      alert('Failed to fetch products. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Handle inline editing
  const handleCellClick = (productId, field, currentValue) => {
    setEditingCell(`${productId}-${field}`);
    setEditValues({ ...editValues, [`${productId}-${field}`]: currentValue });
  };

  // Handle value change during editing
  const handleEditChange = (productId, field, value) => {
    setEditValues({ ...editValues, [`${productId}-${field}`]: value });
  };

  // Save edited value (on Enter or blur)
  const handleSaveEdit = async (productId, field) => {
    const cellKey = `${productId}-${field}`;
    const newValue = editValues[cellKey];
    
    if (newValue === undefined || newValue === '') {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const parsedValue = field === 'price' || field === 'stock' ? parseFloat(newValue) : newValue;
      const updateData = { [field]: parsedValue };
      
      const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        // Update both products and filteredProducts state
        const updatedProducts = products.map(p => 
          p._id === productId ? { ...p, [field]: parsedValue } : p
        );
        setProducts(updatedProducts);
        setFilteredProducts(filteredProducts.map(p => 
          p._id === productId ? { ...p, [field]: parsedValue } : p
        ));
        setEditingCell(null);
        
        // Show success indicator with green flash
        const cell = document.querySelector(`[data-cell="${cellKey}"]`);
        if (cell) {
          cell.style.background = '#d4edda';
          setTimeout(() => { cell.style.background = ''; }, 1000);
        }
        
        console.log(`✅ Updated ${field} to ${parsedValue} for product ${productId}`);
      } else {
        const errorData = await response.json();
        console.error('Update failed:', errorData);
        alert(`❌ Failed to update: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('❌ Failed to update. Please try again.');
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e, productId, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSaveEdit(productId, field);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingCell(null);
    }
  };

  // Handle category filter
  const handleCategoryFilter = (categoryValue) => {
    console.log('🔘 Category clicked:', categoryValue);
    const newCategory = categoryValue === 'all' ? '' : categoryValue;
    console.log('📝 Setting category filter to:', newCategory);
    setFilters({ ...filters, category: newCategory });
  };

  return (
    <div className="admin-products" style={{fontSize: '0.85rem'}}>

      <div className="filters-section" style={{padding: '6px 8px', marginBottom: '6px', background: 'white', borderRadius: '6px'}}>
        <div style={{display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center'}}>
          <input
            type="text"
            placeholder="🔍 Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
            style={{
              padding: '6px 10px',
              fontSize: '0.75rem',
              flex: 1,
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
          <button 
            onClick={() => navigate('/admin/dashboard')} 
            style={{
              padding: '6px 10px',
              fontSize: '0.7rem',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            🏠 Dashboard
          </button>
          <button 
            onClick={() => navigate('/admin/excel-import')} 
            style={{
              padding: '6px 10px',
              fontSize: '0.7rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            📊 Import
          </button>
        </div>
        
        {/* Category Quick Filter Buttons - Compact */}
        <div style={{marginBottom: '6px'}}>
          <div style={{fontSize: '0.7rem', fontWeight: '600', marginBottom: '4px', color: '#374151'}}>
            📂 Categories:
          </div>
          <div style={{display: 'flex', gap: '4px', flexWrap: 'wrap'}}>
            {categories.map(cat => {
              const isActive = (filters.category === cat.value || (cat.value === 'all' && !filters.category));
              return (
                <button
                  key={cat.value}
                  onClick={() => handleCategoryFilter(cat.value)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.65rem',
                    borderRadius: '4px',
                    border: '1px solid #667eea',
                    background: isActive ? '#667eea' : 'white',
                    color: isActive ? 'white' : '#667eea',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{fontSize: '0.7rem'}}>{cat.icon}</span>
                  <span>{cat.label}</span>
                  {isActive && (
                    <span style={{
                      background: 'rgba(255,255,255,0.3)',
                      padding: '1px 4px',
                      borderRadius: '8px',
                      fontSize: '0.6rem',
                      fontWeight: '700'
                    }}>
                      {products.filter(p => cat.value === 'all' || p.category === cat.value).length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="filters" style={{display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap'}}>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="filter-select"
            style={{
              padding: '4px 8px',
              fontSize: '0.7rem',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              outline: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              background: 'white'
            }}
          >
            <option value="">All Status</option>
            <option value="active">✅ Active</option>
            <option value="inactive">❌ Inactive</option>
            <option value="pending">⏳ Pending</option>
          </select>
          
          <div style={{
            fontSize: '0.65rem',
            color: '#6b7280',
            marginLeft: 'auto',
            padding: '4px 8px',
            background: '#fef3c7',
            borderRadius: '4px',
            border: '1px solid #fbbf24',
            fontWeight: '600'
          }}>
            💡 Click Price/Stock • <kbd style={{padding: '1px 4px', background: 'white', border: '1px solid #d1d5db', borderRadius: '2px', fontSize: '0.6rem', fontWeight: '700'}}>Enter</kbd> to save
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          flexDirection: 'column',
          gap: '15px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div style={{fontSize: '1rem', color: '#666'}}>
            Loading products{filters.category ? ` in ${categories.find(c => c.value === filters.category)?.label}` : ''}...
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : (
        <div className="products-table-container">
          {/* Category Header - Compact */}
          {filters.category && (
            <div style={{
              padding: '6px 10px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '6px',
              marginBottom: '6px',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                <span style={{fontSize: '0.9rem'}}>
                  {categories.find(c => c.value === filters.category)?.icon}
                </span>
                <span style={{fontSize: '0.8rem', fontWeight: '700'}}>
                  {categories.find(c => c.value === filters.category)?.label}
                </span>
              </div>
              <div style={{fontSize: '0.75rem', fontWeight: '600'}}>
                {products.length} products
              </div>
            </div>
          )}
          
          <div className="table-info" style={{padding: '4px 8px', fontSize: '0.7rem', color: '#374151', background: '#f9fafb', borderRadius: '4px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{fontWeight: '600'}}>
              {filters.category 
                ? `📂 ${categories.find(c => c.value === filters.category)?.label}: ${filteredProducts.length}` 
                : `📦 Showing: ${filteredProducts.length}`}
            </span>
            <span style={{fontSize: '0.65rem', color: '#6b7280'}}>
              Page {currentPage}/{Math.ceil(filteredProducts.length / productsPerPage)}
            </span>
          </div>
          
          <div className="products-table" style={{fontSize: '0.8rem'}}>
            <table style={{width: '100%'}}>
              <thead>
                <tr style={{background: '#f8f9fa'}}>
                  <th style={{padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600'}}>Product</th>
                  <th style={{padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600'}}>Category</th>
                  <th style={{padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600'}}>Price</th>
                  <th style={{padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600'}}>Stock</th>
                  <th style={{padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600'}}>Status</th>
                  <th style={{padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600'}}>Seller</th>
                  <th style={{padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage).map(product => (
                  <tr key={product._id} style={{borderBottom: '1px solid #e5e7eb'}}>
                    <td className="product-info" style={{padding: '4px 8px'}}>
                      <div className="product-name" style={{fontSize: '0.75rem', fontWeight: '500', marginBottom: '1px'}}>{product.name}</div>
                      <div className="product-id" style={{fontSize: '0.6rem', color: '#6b7280'}}>ID: {product._id.slice(-6)}</div>
                    </td>
                    <td style={{padding: '4px 8px'}}>
                      <span className="category-badge" style={{fontSize: '0.65rem', padding: '2px 6px'}}>{product.category}</span>
                    </td>
                    <td 
                      className="price" 
                      style={{padding: '4px 8px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s'}}
                      data-cell={`${product._id}-price`}
                      onClick={() => handleCellClick(product._id, 'price', product.price)}
                      onMouseEnter={(e) => e.target.style.background = '#f0f0ff'}
                      onMouseLeave={(e) => e.target.style.background = ''}
                      title="Click to edit price"
                    >
                      {editingCell === `${product._id}-price` ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValues[`${product._id}-price`] || ''}
                          onChange={(e) => handleEditChange(product._id, 'price', e.target.value)}
                          onBlur={() => handleSaveEdit(product._id, 'price')}
                          onKeyDown={(e) => handleKeyPress(e, product._id, 'price')}
                          autoFocus
                          style={{
                            width: '70px',
                            padding: '3px',
                            fontSize: '0.75rem',
                            border: '2px solid #667eea',
                            borderRadius: '4px',
                            outline: 'none'
                          }}
                        />
                      ) : (
                        <span>
                          {formatPrice(product.price)}
                          <span style={{marginLeft: '3px', fontSize: '0.55rem', color: '#999'}}>✏️</span>
                        </span>
                      )}
                    </td>
                    <td 
                      className="stock" 
                      style={{padding: '4px 8px', cursor: 'pointer', transition: 'background 0.2s'}}
                      data-cell={`${product._id}-stock`}
                      onClick={() => handleCellClick(product._id, 'stock', product.stock)}
                      onMouseEnter={(e) => e.target.style.background = '#f0f0ff'}
                      onMouseLeave={(e) => e.target.style.background = ''}
                      title="Click to edit stock"
                    >
                      {editingCell === `${product._id}-stock` ? (
                        <input
                          type="number"
                          value={editValues[`${product._id}-stock`] || ''}
                          onChange={(e) => handleEditChange(product._id, 'stock', e.target.value)}
                          onBlur={() => handleSaveEdit(product._id, 'stock')}
                          onKeyDown={(e) => handleKeyPress(e, product._id, 'stock')}
                          autoFocus
                          style={{
                            width: '50px',
                            padding: '3px',
                            fontSize: '0.7rem',
                            border: '2px solid #667eea',
                            borderRadius: '4px',
                            outline: 'none'
                          }}
                        />
                      ) : (
                        <span className={product.stock > 10 ? 'in-stock' : 'low-stock'} style={{fontSize: '0.7rem', padding: '2px 4px'}}>
                          {product.stock}
                          <span style={{marginLeft: '3px', fontSize: '0.55rem', color: '#999'}}>✏️</span>
                        </span>
                      )}
                    </td>
                    <td style={{padding: '4px 8px'}}>
                      <select
                        value={product.status}
                        onChange={(e) => handleStatusChange(product._id, e.target.value)}
                        className={`status-select ${product.status}`}
                        style={{fontSize: '0.65rem', padding: '2px 4px'}}
                      >
                        <option value="active">✅</option>
                        <option value="inactive">❌</option>
                        <option value="pending">⏳</option>
                      </select>
                    </td>
                    <td className="seller-info" style={{padding: '4px 8px', fontSize: '0.7rem'}}>
                      {product.seller?.businessName || 'Direct'}
                    </td>
                    <td className="actions" style={{padding: '4px 8px'}}>
                      <button
                        onClick={() => navigate(`/admin/products/edit/${product._id}`)}
                        className="edit-btn"
                        title="Edit Product"
                        style={{padding: '2px 6px', fontSize: '0.65rem', marginRight: '3px'}}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(product._id)}
                        className="delete-btn"
                        title="Delete Product"
                        style={{padding: '2px 6px', fontSize: '0.65rem'}}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="no-products" style={{padding: '30px', textAlign: 'center'}}>
              <h3 style={{fontSize: '1rem', marginBottom: '8px'}}>No products found</h3>
              <p style={{fontSize: '0.8rem', marginBottom: '12px'}}>Try adjusting your search or filters</p>
              <button 
                onClick={() => navigate('/admin/excel-import')} 
                className="add-first-product"
                style={{padding: '6px 12px', fontSize: '0.8rem'}}
              >
                ➕ Add from Excel
              </button>
            </div>
          )}
          
          {/* Pagination - Compact */}
          {filteredProducts.length > productsPerPage && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '10px',
              gap: '6px',
              borderTop: '1px solid #e5e7eb',
              background: '#f9fafb',
              marginTop: '10px'
            }}>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  border: '1px solid #667eea',
                  background: currentPage === 1 ? '#f3f4f6' : 'white',
                  color: currentPage === 1 ? '#9ca3af' : '#667eea',
                  borderRadius: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                ⏮
              </button>
              
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  border: '1px solid #667eea',
                  background: currentPage === 1 ? '#f3f4f6' : 'white',
                  color: currentPage === 1 ? '#9ca3af' : '#667eea',
                  borderRadius: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                ←
              </button>
              
              <div style={{
                padding: '4px 12px',
                fontSize: '0.7rem',
                color: '#374151',
                fontWeight: '600',
                background: 'white',
                border: '1px solid #667eea',
                borderRadius: '4px',
                minWidth: '80px',
                textAlign: 'center'
              }}>
                {currentPage} / {Math.ceil(filteredProducts.length / productsPerPage)}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredProducts.length / productsPerPage), prev + 1))}
                disabled={currentPage === Math.ceil(filteredProducts.length / productsPerPage)}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  border: '1px solid #667eea',
                  background: currentPage === Math.ceil(filteredProducts.length / productsPerPage) ? '#f3f4f6' : 'white',
                  color: currentPage === Math.ceil(filteredProducts.length / productsPerPage) ? '#9ca3af' : '#667eea',
                  borderRadius: '4px',
                  cursor: currentPage === Math.ceil(filteredProducts.length / productsPerPage) ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                →
              </button>
              
              <button
                onClick={() => setCurrentPage(Math.ceil(filteredProducts.length / productsPerPage))}
                disabled={currentPage === Math.ceil(filteredProducts.length / productsPerPage)}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  border: '1px solid #667eea',
                  background: currentPage === Math.ceil(filteredProducts.length / productsPerPage) ? '#f3f4f6' : 'white',
                  color: currentPage === Math.ceil(filteredProducts.length / productsPerPage) ? '#9ca3af' : '#667eea',
                  borderRadius: '4px',
                  cursor: currentPage === Math.ceil(filteredProducts.length / productsPerPage) ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                ⏭
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
