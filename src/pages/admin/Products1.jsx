import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import cacheManager from '../../utils/cacheManager';
import '../../styles/AdminProducts.css';
import '../../styles/AdminLayout.css';

const AdminProducts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ category: '', status: '', isAmazonsChoice: false });
  const [editingCell, setEditingCell] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [profitEditProduct, setProfitEditProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [selectedUnits, setSelectedUnits] = useState(200);
  
  const currency = 'GBP';
  const currencySymbol = '£';
  const productsPerPage = 50;

  const categories = [
    { value: 'all', label: 'All Products', icon: '📦' },
    { value: 'remote', label: 'Remote Controls', icon: '📺' },
    { value: 'electronics', label: 'Electronics', icon: '⚡' },
    { value: 'strap', label: 'Watch Straps', icon: '⌚' },
    { value: 'jewelry', label: 'Jewelry', icon: '💎' },
    { value: 'party', label: 'Party Supplies', icon: '🎉' },
    { value: 'home', label: 'Home & Decor', icon: '🏠' },
    { value: 'kitchen', label: 'Kitchen', icon: '🍳' },
    { value: 'automotive', label: 'Automotive', icon: '🚗' },
    { value: 'tape', label: 'Tape', icon: '📼' },
    { value: 'lampshade', label: 'Lampshades', icon: '💡' }
  ];

  const formatPrice = (price) => {
    return `£${parseFloat(price || 0).toFixed(2)}`;
  };

  const safeFormatNumber = (value, decimals = 2) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    return num.toString();
  };

  const safeParseInput = (value) => {
    if (value === '' || value === null || value === undefined) return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const categoryFromState = location.state?.category;
    const categoryFromUrl = urlParams.get('category');
    const categoryToRestore = categoryFromState || categoryFromUrl || '';
    const amazonsChoiceFromUrl = urlParams.get('amazonsChoice') === 'true';
    
    setFilters(prev => {
      const newFilters = { ...prev };
      if (prev.category !== categoryToRestore) {
        newFilters.category = categoryToRestore;
      }
      if (prev.isAmazonsChoice !== amazonsChoiceFromUrl) {
        newFilters.isAmazonsChoice = amazonsChoiceFromUrl;
      }
      return newFilters;
    });
  }, [location.pathname, location.search, location.state?.category]);

  useEffect(() => {
    fetchProducts();
  }, [search, filters]);

  useEffect(() => {
    let filtered = [...products];
    
    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }
    
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    
    if (filters.isAmazonsChoice) {
      filtered = filtered.filter(p => p.isAmazonsChoice === true);
    }
    
    setFilteredProducts(filtered);
  }, [products, filters.category, filters.status, filters.isAmazonsChoice]);

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
        ...(filters.isAmazonsChoice && { isAmazonsChoice: 'true' }),
        excludeSellerCopies: 'true',
        limit: '50'
      });

      const useFastEndpoint = !search && !filters.category && !filters.status && !filters.isAmazonsChoice;
      
      const url = useFastEndpoint 
        ? `http://localhost:5000/api/products/admin/fast`
        : `http://localhost:5000/api/products?${params}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', response.status, errorData);
        throw new Error('Failed to fetch products');
      }
      
      const data = await response.json();
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
        setSelectedProducts(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      const currentPageProducts = filteredProducts.slice(
        (currentPage - 1) * productsPerPage,
        currentPage * productsPerPage
      );
      setSelectedProducts(new Set(currentPageProducts.map(p => p._id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) {
      alert('⚠️ Please select at least one product to delete');
      return;
    }

    if (!confirm(`⚠️ Are you sure you want to delete ${selectedProducts.size} selected product(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      let successCount = 0;
      let failCount = 0;

      for (const productId of selectedProducts) {
        try {
          const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error('Error deleting product:', productId, error);
          failCount++;
        }
      }

      setSelectedProducts(new Set());
      fetchProducts();

      if (failCount === 0) {
        alert(`✅ Successfully deleted ${successCount} product(s)`);
      } else {
        alert(`⚠️ Deleted ${successCount} product(s), failed to delete ${failCount} product(s)`);
      }
    } catch (error) {
      console.error('Error in bulk delete:', error);
      alert('❌ Failed to delete products');
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

  const handleCellClick = (productId, field, currentValue) => {
    setEditingCell(`${productId}-${field}`);
    setEditValues({ ...editValues, [`${productId}-${field}`]: currentValue });
  };

  const handleEditChange = (productId, field, value) => {
    setEditValues({ ...editValues, [`${productId}-${field}`]: value });
  };

  const handleSaveEdit = async (productId, field) => {
    const cellKey = `${productId}-${field}`;
    const newValue = editValues[cellKey];
    
    if (newValue === undefined || newValue === '') {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      let parsedValue = field === 'price' || field === 'stock' ? parseFloat(newValue) : newValue;
      
      const updateData = { [field]: parsedValue };
      if (field === 'price') {
        updateData.currency = 'GBP';
      }
      
      const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updateObject = { [field]: parsedValue };
        if (field === 'price') {
          updateObject.currency = 'GBP';
        }
        
        const updatedProducts = products.map(p => 
          p._id === productId ? { ...p, ...updateObject } : p
        );
        
        setProducts(updatedProducts);
        setFilteredProducts(filteredProducts.map(p => 
          p._id === productId ? { ...p, ...updateObject } : p
        ));
        setEditingCell(null);
        
        cacheManager.clearAll();
        
        const cell = document.querySelector(`[data-cell="${cellKey}"]`);
        if (cell) {
          cell.style.background = '#d4edda';
          setTimeout(() => { cell.style.background = ''; }, 1000);
        }
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

  const handleProductClick = (product) => {
    navigate(`/product/${product._id}`, {
      state: { 
        returnTo: '/admin/products', 
        category: filters.category,
        productPreview: {
          name: product.name,
          price: product.price,
          category: product.category
        }
      }
    });
  };

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

  const handleCategoryFilter = (categoryValue) => {
    const newCategory = categoryValue === 'all' ? '' : categoryValue;
    setFilters({ ...filters, category: newCategory });
  };

  const startProfitEditing = async (product) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/products/${product._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const latestProduct = await response.json();
        product = latestProduct;
      }
    } catch (error) {
      console.error('Error fetching latest product data:', error);
    }
    
    const productPrice = parseFloat(product.price) || 0;
    const initialUnits = product.platformUnits || 200;
    setSelectedUnits(initialUnits);
    
    const profitPerUnit = product.profitCalculations?.profitPerUnit || 0;
    const defaultMonthlyProfit = profitPerUnit * 30;
    const defaultYearlyProfit = profitPerUnit * 365;
    
    const safeParseFloat = (value, defaultValue = 0) => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    };

    const initPlatformComparison = product.platformComparison && Array.isArray(product.platformComparison) 
      ? product.platformComparison.map(platform => ({
          platform: platform.platform || 'Platform',
          rrpPerUnit: safeParseFloat(platform.rrpPerUnit, 0),
          units: safeParseFloat(platform.units, 200),
          profitFor200Units: safeParseFloat(platform.profitFor200Units, 0),
          markup: platform.markup || '0%'
        }))
      : [
          { platform: 'RRP', rrpPerUnit: 0, units: 200, profitFor200Units: 0, markup: '0%' },
          { platform: 'Amazon', rrpPerUnit: 0, units: 200, profitFor200Units: 0, markup: '0%' },
          { platform: 'eBay', rrpPerUnit: 0, units: 200, profitFor200Units: 0, markup: '0%' }
        ];

    const initProfitCalculations = {
      profitPerUnit: safeParseFloat(product.profitCalculations?.profitPerUnit, 0),
      profitFor200Units: safeParseFloat(product.profitCalculations?.profitFor200Units, 0),
      dealUnitsProfit: safeParseFloat(product.profitCalculations?.dealUnitsProfit, 0),
      profitForDealUnits: safeParseFloat(product.profitCalculations?.profitForDealUnits, 0)
    };

    const existingEvaluation = product.profitEvaluation;
    const initProfitEvaluation = {
      salesProceeds: safeParseFloat(existingEvaluation?.salesProceeds, 0),
      commission: safeParseFloat(existingEvaluation?.commission, 0),
      commissionTax: safeParseFloat(existingEvaluation?.commissionTax, 0),
      digitalServicesFee: safeParseFloat(existingEvaluation?.digitalServicesFee, 0),
      digitalServicesTax: safeParseFloat(existingEvaluation?.digitalServicesTax, 0),
      fbaFulfilmentFee: safeParseFloat(existingEvaluation?.fbaFulfilmentFee, 0),
      fbaFulfilmentTax: safeParseFloat(existingEvaluation?.fbaFulfilmentTax, 0),
      balanceChange: safeParseFloat(existingEvaluation?.balanceChange, 0),
      productCost: productPrice,
      netProfit: safeParseFloat(existingEvaluation?.balanceChange, 0) - productPrice,
      monthlyProfit: safeParseFloat(existingEvaluation?.monthlyProfit, defaultMonthlyProfit),
      yearlyProfit: safeParseFloat(existingEvaluation?.yearlyProfit, defaultYearlyProfit)
    };

    setProfitEditProduct({
      _id: product._id,
      name: product.name || '',
      dealUnits: safeParseFloat(product.dealUnits, 1),
      description: product.description || '',
      features: Array.isArray(product.features) ? product.features : [],
      platformComparison: initPlatformComparison,
      profitCalculations: initProfitCalculations,
      profitEvaluation: initProfitEvaluation
    });
    setShowProfitModal(true);
  };

  const updateProfitData = async () => {
    if (!profitEditProduct) return;

    try {
      const token = localStorage.getItem('adminToken');
      
      const calculatedProfitFor200Units = (profitEditProduct.profitCalculations.profitPerUnit || 0) * 200;
      
      const updateData = {
        platformComparison: profitEditProduct.platformComparison,
        platformUnits: selectedUnits,
        profitCalculations: {
          ...profitEditProduct.profitCalculations,
          profitFor200Units: calculatedProfitFor200Units
        },
        profitEvaluation: profitEditProduct.profitEvaluation
      };

      const response = await fetch(`http://localhost:5000/api/products/${profitEditProduct._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        cacheManager.clearAll();
        alert('✅ Profit data updated successfully!');
        setShowProfitModal(false);
        setProfitEditProduct(null);
        fetchProducts();
      } else {
        const errorData = await response.text();
        console.error('❌ Save failed:', errorData);
        throw new Error('Failed to update profit data');
      }
    } catch (error) {
      console.error('Error updating profit data:', error);
      alert('❌ Failed to update profit data');
    }
  };

  return (
    <div className="admin-products" style={{fontSize: '0.85rem'}}>
      {/* Header Section */}
      <div style={{
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '12px 16px', 
        marginBottom: '12px', 
        background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)', 
        borderRadius: '8px',
        color: 'white'
      }}>
        <div>
          <h1 style={{margin: 0, fontSize: '1.4rem', fontWeight: 'bold'}}>
            📦 Products Management
          </h1>
          <p style={{margin: '4px 0 0 0', fontSize: '0.9rem', opacity: 0.9}}>
            Manage your product catalog
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/products/add')}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)'
          }}
          onMouseOver={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.3)';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          <span style={{fontSize: '1.1rem'}}>➕</span>
          Add New Product
        </button>
      </div>

      {/* Performance Notice */}
      {!search && !filters.category && !filters.status && !filters.isAmazonsChoice && (
        <div style={{
          padding: '8px 12px',
          marginBottom: '12px',
          background: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '6px',
          fontSize: '0.8rem',
          color: '#1976d2'
        }}>
          ⚡ Fast Mode: Showing 50 most recent products for optimal performance. Use search or filters to find specific products.
        </div>
      )}

      <div className="filters-section" style={{padding: '6px 8px', marginBottom: '6px', background: 'white', borderRadius: '6px'}}>
        <div style={{display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center'}}>
          <input
            type="text"
            placeholder="🔍 Search by name, ID, category, brand..."
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
          {search && search.length >= 3 && /^[a-fA-F0-9]+$/.test(search) && (
            <small style={{
              fontSize: '0.65rem', 
              color: '#667eea', 
              fontWeight: '500',
              whiteSpace: 'nowrap'
            }}>
              🔍 ID Search
            </small>
          )}
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
        
        {/* Category Quick Filter Buttons */}
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
          
          <button
            onClick={() => setFilters({ ...filters, isAmazonsChoice: !filters.isAmazonsChoice })}
            style={{
              padding: '4px 8px',
              fontSize: '0.7rem',
              borderRadius: '4px',
              border: '1px solid #ff9800',
              background: filters.isAmazonsChoice ? '#ff9800' : 'white',
              color: filters.isAmazonsChoice ? 'white' : '#ff9800',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            🏆 Amazon's Choice
            {filters.isAmazonsChoice && (
              <span style={{
                background: 'rgba(255,255,255,0.3)',
                padding: '1px 4px',
                borderRadius: '8px',
                fontSize: '0.6rem',
                fontWeight: '700'
              }}>
                ON
              </span>
            )}
          </button>
          
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
            💡 Click Price/Stock to edit
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
            Loading products{filters.category ? ` in ${categories.find(c => c.value === filters.category)?.label}` : ''}
            {filters.isAmazonsChoice ? ` (Amazon's Choice)` : ''}...
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
          {/* Category Header */}
          {(filters.category || filters.isAmazonsChoice) && (
            <div style={{
              padding: '6px 10px',
              background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
              borderRadius: '6px',
              marginBottom: '6px',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                {filters.isAmazonsChoice && (
                  <>
                    <span style={{fontSize: '0.9rem'}}>🏆</span>
                    <span style={{fontSize: '0.8rem', fontWeight: '700'}}>
                      Amazon's Choice Products
                    </span>
                  </>
                )}
                {filters.category && (
                  <>
                    <span style={{fontSize: '0.9rem'}}>
                      {categories.find(c => c.value === filters.category)?.icon}
                    </span>
                    <span style={{fontSize: '0.8rem', fontWeight: '700'}}>
                      {categories.find(c => c.value === filters.category)?.label}
                    </span>
                  </>
                )}
              </div>
              <div style={{fontSize: '0.75rem', fontWeight: '600'}}>
                {filteredProducts.length} products
              </div>
            </div>
          )}
          
          <div className="table-info" style={{padding: '4px 8px', fontSize: '0.7rem', color: '#374151', background: '#f9fafb', borderRadius: '4px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <span style={{fontWeight: '600'}}>
                {filters.isAmazonsChoice && filters.category
                  ? `🏆 Amazon's Choice - ${categories.find(c => c.value === filters.category)?.label}: ${filteredProducts.length}`
                  : filters.isAmazonsChoice
                  ? `🏆 Amazon's Choice: ${filteredProducts.length}`
                  : filters.category 
                  ? `📂 ${categories.find(c => c.value === filters.category)?.label}: ${filteredProducts.length}` 
                  : `📦 Showing: ${filteredProducts.length}`}
              </span>
              {selectedProducts.size > 0 && (
                <>
                  <span style={{
                    background: '#3b82f6',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.65rem',
                    fontWeight: '700'
                  }}>
                    {selectedProducts.size} selected
                  </span>
                  <button
                    onClick={handleBulkDelete}
                    style={{
                      padding: '3px 10px',
                      fontSize: '0.65rem',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title={`Delete ${selectedProducts.size} selected product(s)`}
                  >
                    🗑️ Delete Selected
                  </button>
                </>
              )}
            </div>
            <span style={{fontSize: '0.65rem', color: '#6b7280'}}>
              Page {currentPage}/{Math.ceil(filteredProducts.length / productsPerPage)}
            </span>
          </div>
          
          <div className="products-table" style={{fontSize: '0.8rem'}}>
            <table style={{width: '100%'}}>
              <thead>
                <tr style={{background: '#ff9800'}}>
                  <th style={{padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', width: '40px', color: 'white'}}>
                    <input
                      type="checkbox"
                      checked={selectedProducts.size > 0 && selectedProducts.size === filteredProducts.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage).length}
                      onChange={handleSelectAll}
                      style={{cursor: 'pointer'}}
                      title="Select all on this page"
                    />
                  </th>
                  <th style={{padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white'}}>Product</th>
                  <th style={{padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white'}}>Category</th>
                  <th style={{padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white'}}>Price</th>
                  <th style={{padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white'}}>Stock</th>
                  <th style={{padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white'}}>Status</th>
                  <th style={{padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white'}}>Seller</th>
                  <th style={{padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage).map(product => (
                  <tr key={product._id} style={{borderBottom: '1px solid #e5e7eb', background: selectedProducts.has(product._id) ? '#f0f9ff' : 'transparent'}}>
                    <td style={{padding: '4px 8px', textAlign: 'center'}}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product._id)}
                        onChange={() => handleSelectProduct(product._id)}
                        style={{cursor: 'pointer'}}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="product-info" style={{padding: '4px 8px'}}>
                      <div 
                        className="product-name" 
                        onClick={() => handleProductClick(product)}
                        style={{
                          fontSize: '0.75rem', 
                          fontWeight: '500', 
                          marginBottom: '1px',
                          cursor: 'pointer',
                          color: '#667eea',
                          textDecoration: 'underline',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Click to view product details"
                      >
                        {product.name}
                        {product.isAmazonsChoice && <span style={{fontSize: '0.7rem'}}>🏆</span>}
                      </div>
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
                        onClick={() => {
                          const editUrl = `/admin/products/edit/${product._id}${filters.category ? `?returnCategory=${filters.category}` : ''}`;
                          navigate(editUrl, {
                            state: { category: filters.category }
                          });
                        }}
                        className="edit-btn"
                        title="Edit Product"
                        style={{padding: '2px 6px', fontSize: '0.65rem', marginRight: '3px'}}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => startProfitEditing(product)}
                        className="profit-btn"
                        title="Manage Profit Details"
                        style={{padding: '2px 6px', fontSize: '0.65rem', marginRight: '3px', background: '#ff9800', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}
                      >
                        💰
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
          
          {/* Pagination */}
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
              <div style={{flex: 1}}>
                <h2 style={{margin: 0, fontSize: '1.5rem', fontWeight: 'bold'}}>💰 Profit Details Management</h2>
                <p style={{margin: '5px 0 0 0', opacity: 0.9}}>{profitEditProduct.name}</p>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
                  <label style={{fontSize: '0.75rem', marginBottom: '4px', opacity: 0.9}}>Currency</label>
                  <div style={{
                    padding: '6px 12px',
                    fontSize: '0.9rem',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderRadius: '6px',
                    fontWeight: '600',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white'
                  }}>
                    GBP (£)
                  </div>
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
            </div>

            <div style={{padding: '25px'}}>
              {/* Platform Comparison Section */}
              <div style={{marginBottom: '30px', padding: '20px', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '2px solid #28a745'}}>
                <h3 style={{color: '#28a745', marginBottom: '20px', fontSize: '1.3rem'}}>📊 Platform Comparison</h3>
                {profitEditProduct.platformComparison.map((platform, index) => (
                  <div key={index} style={{marginBottom: '20px', padding: '15px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #ddd'}}>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: '15px', alignItems: 'center'}}>
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
                          <option value="Etsy">Etsy</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>RRP/Unit (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={safeFormatNumber(platform.rrpPerUnit)}
                          onChange={(e) => {
                            const newPlatforms = [...profitEditProduct.platformComparison];
                            newPlatforms[index].rrpPerUnit = safeParseInput(e.target.value);
                            setProfitEditProduct({...profitEditProduct, platformComparison: newPlatforms});
                          }}
                          style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                        />
                      </div>
                      <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>Units</label>
                        <input
                          type="number"
                          value={platform.units || 200}
                          onChange={(e) => {
                            const newPlatforms = [...profitEditProduct.platformComparison];
                            const newUnits = parseInt(e.target.value);
                            newPlatforms[index].units = newUnits;
                            const profitPerUnit = profitEditProduct.profitEvaluation?.netProfit || 0;
                            newPlatforms[index].profitFor200Units = profitPerUnit * newUnits;
                            setProfitEditProduct({...profitEditProduct, platformComparison: newPlatforms});
                          }}
                          style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                        />
                      </div>
                      <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                          Total Profit ({platform.units || 200} units) (£)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={safeFormatNumber(platform.profitFor200Units)}
                          readOnly
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #17a2b8',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            backgroundColor: '#e7f3ff',
                            cursor: 'not-allowed'
                          }}
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
                          placeholder="e.g., 25%"
                        />
                      </div>
                      <div>
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
                            padding: '8px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={() => {
                    const newPlatforms = [...profitEditProduct.platformComparison, {
                      platform: 'Platform',
                      rrpPerUnit: 0,
                      units: 200,
                      profitFor200Units: 0,
                      markup: '0%'
                    }];
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
                    fontWeight: '600'
                  }}
                >
                  + Add Platform
                </button>
              </div>

              {/* Profit Calculations Section */}
              <div style={{marginBottom: '30px', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '2px solid #ffc107'}}>
                <h3 style={{color: '#856404', marginBottom: '20px', fontSize: '1.3rem'}}>🧮 Profit Calculations</h3>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                      Profit Per Unit (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={safeFormatNumber(profitEditProduct.profitCalculations.profitPerUnit)}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #17a2b8',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        backgroundColor: '#e7f3ff',
                        cursor: 'not-allowed'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                      Profit for 200 Units (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={safeFormatNumber(profitEditProduct.profitCalculations.profitFor200Units)}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #17a2b8',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        backgroundColor: '#e7f3ff',
                        cursor: 'not-allowed'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Amazon FBA Revenue Calculator Section */}
              <div style={{marginBottom: '30px', padding: '20px', backgroundColor: '#f8d7da', borderRadius: '8px', border: '2px solid #dc3545'}}>
                <h3 style={{color: '#721c24', marginBottom: '15px', fontSize: '1.3rem'}}>💼 Amazon FBA Revenue Calculator</h3>
                <p style={{color: '#721c24', marginBottom: '20px', fontSize: '0.9rem', fontStyle: 'italic'}}>
                  Complete Amazon FBA profit analysis - all fields will be displayed in the product detail page
                </p>
                
                {/* Revenue Section */}
                <div style={{marginBottom: '25px'}}>
                  <h4 style={{color: '#721c24', marginBottom: '15px', fontSize: '1.1rem', borderBottom: '2px solid #dc3545', paddingBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    📈 Revenue
                  </h4>
                  <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                    Sales Proceeds (£)
                    <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px'}}>
                      (Total revenue from Amazon sales)
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={safeFormatNumber(profitEditProduct.profitEvaluation.salesProceeds)}
                    onChange={(e) => {
                      const newValue = safeParseInput(e.target.value);
                      const updatedEvaluation = {
                        ...profitEditProduct.profitEvaluation,
                        salesProceeds: newValue
                      };
                      setProfitEditProduct({
                        ...profitEditProduct,
                        profitEvaluation: updatedEvaluation
                      });
                    }}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                  />
                </div>

                {/* Amazon Fees Section */}
                <div style={{marginBottom: '25px'}}>
                  <h4 style={{color: '#721c24', marginBottom: '15px', fontSize: '1.1rem', borderBottom: '2px solid #dc3545', paddingBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    💸 Amazon Fees & Taxes
                  </h4>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
                    <div>
                      <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                        Commission (£)
                        <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px'}}>
                          (Amazon referral fee)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.commission)}
                        onChange={(e) => {
                          const newValue = safeParseInput(e.target.value);
                          const updatedEvaluation = {
                            ...profitEditProduct.profitEvaluation,
                            commission: newValue
                          };
                          setProfitEditProduct({
                            ...profitEditProduct,
                            profitEvaluation: updatedEvaluation
                          });
                        }}
                        style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                      />
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                        Commission Tax (£)
                        <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px'}}>
                          (VAT on commission)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.commissionTax)}
                        onChange={(e) => {
                          const newValue = safeParseInput(e.target.value);
                          const updatedEvaluation = {
                            ...profitEditProduct.profitEvaluation,
                            commissionTax: newValue
                          };
                          setProfitEditProduct({
                            ...profitEditProduct,
                            profitEvaluation: updatedEvaluation
                          });
                        }}
                        style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                      />
                    </div>
                  </div>

                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
                    <div>
                      <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                        Digital Services Fee (£)
                        <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px'}}>
                          (UK digital services tax)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.digitalServicesFee)}
                        onChange={(e) => {
                          const newValue = safeParseInput(e.target.value);
                          const updatedEvaluation = {
                            ...profitEditProduct.profitEvaluation,
                            digitalServicesFee: newValue
                          };
                          setProfitEditProduct({
                            ...profitEditProduct,
                            profitEvaluation: updatedEvaluation
                          });
                        }}
                        style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                      />
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                        Digital Services Tax (£)
                        <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px'}}>
                          (VAT on digital services)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.digitalServicesTax)}
                        onChange={(e) => {
                          const newValue = safeParseInput(e.target.value);
                          const updatedEvaluation = {
                            ...profitEditProduct.profitEvaluation,
                            digitalServicesTax: newValue
                          };
                          setProfitEditProduct({
                            ...profitEditProduct,
                            profitEvaluation: updatedEvaluation
                          });
                        }}
                        style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                      />
                    </div>
                  </div>

                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                    <div>
                      <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                        FBA Fulfilment Fee (£)
                        <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px'}}>
                          (Amazon FBA storage & shipping)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.fbaFulfilmentFee)}
                        onChange={(e) => {
                          const newValue = safeParseInput(e.target.value);
                          const updatedEvaluation = {
                            ...profitEditProduct.profitEvaluation,
                            fbaFulfilmentFee: newValue
                          };
                          setProfitEditProduct({
                            ...profitEditProduct,
                            profitEvaluation: updatedEvaluation
                          });
                        }}
                        style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                      />
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                        FBA Fulfilment Tax (£)
                        <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px'}}>
                          (VAT on FBA fees)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.fbaFulfilmentTax)}
                        onChange={(e) => {
                          const newValue = safeParseInput(e.target.value);
                          const updatedEvaluation = {
                            ...profitEditProduct.profitEvaluation,
                            fbaFulfilmentTax: newValue
                          };
                          setProfitEditProduct({
                            ...profitEditProduct,
                            profitEvaluation: updatedEvaluation
                          });
                        }}
                        style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                      />
                    </div>
                  </div>
                </div>

                {/* Summary Section */}
                <div style={{marginBottom: '25px'}}>
                  <h4 style={{color: '#721c24', marginBottom: '15px', fontSize: '1.1rem', borderBottom: '2px solid #dc3545', paddingBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    📊 Financial Summary
                  </h4>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
                    <div>
                      <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                        Balance Change (£)
                        <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px'}}>
                          (Net amount received from Amazon)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.balanceChange)}
                        onChange={(e) => {
                          const newValue = safeParseInput(e.target.value);
                          const productCost = profitEditProduct.profitEvaluation.productCost || 0;
                          const netProfit = newValue - productCost;
                          
                          const updatedEvaluation = {
                            ...profitEditProduct.profitEvaluation,
                            balanceChange: newValue,
                            netProfit: netProfit
                          };
                          
                          const updatedCalculations = {
                            ...profitEditProduct.profitCalculations,
                            profitPerUnit: netProfit,
                            profitFor200Units: netProfit * 200
                          };
                          
                          // Update platform comparison profits
                          const updatedPlatforms = profitEditProduct.platformComparison.map(platform => ({
                            ...platform,
                            profitFor200Units: netProfit * (platform.units || 200)
                          }));
                          
                          setProfitEditProduct({
                            ...profitEditProduct,
                            profitEvaluation: updatedEvaluation,
                            profitCalculations: updatedCalculations,
                            platformComparison: updatedPlatforms
                          });
                        }}
                        style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                      />
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                        Product Cost (£)
                        <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px'}}>
                          (Auto-filled from product price)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.productCost)}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #17a2b8',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          backgroundColor: '#e7f3ff',
                          cursor: 'not-allowed'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Profit Results Section */}
                <div style={{marginBottom: '25px'}}>
                  <h4 style={{color: '#155724', marginBottom: '15px', fontSize: '1.1rem', borderBottom: '2px solid #28a745', paddingBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    💰 Profit Analysis
                  </h4>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', padding: '15px', backgroundColor: '#e6f7ee', borderRadius: '8px', border: '1px solid #28a745'}}>
                    <div>
                      <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#155724'}}>
                        Net Profit (£)
                        <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#155724', marginLeft: '8px'}}>
                          (Balance Change - Product Cost)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.netProfit)}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #28a745',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          backgroundColor: '#d4edda',
                          cursor: 'not-allowed',
                          fontWeight: 'bold'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#155724'}}>
                        Monthly Profit (£)
                        <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#155724', marginLeft: '8px'}}>
                          (Projected monthly earnings)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.monthlyProfit)}
                        onChange={(e) => {
                          const newValue = safeParseInput(e.target.value);
                          const updatedEvaluation = {
                            ...profitEditProduct.profitEvaluation,
                            monthlyProfit: newValue
                          };
                          setProfitEditProduct({
                            ...profitEditProduct,
                            profitEvaluation: updatedEvaluation
                          });
                        }}
                        style={{width: '100%', padding: '10px', border: '1px solid #28a745', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: 'white'}}
                      />
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#155724'}}>
                        Yearly Profit (£)
                        <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#155724', marginLeft: '8px'}}>
                          (Projected annual earnings)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.yearlyProfit)}
                        onChange={(e) => {
                          const newValue = safeParseInput(e.target.value);
                          const updatedEvaluation = {
                            ...profitEditProduct.profitEvaluation,
                            yearlyProfit: newValue
                          };
                          setProfitEditProduct({
                            ...profitEditProduct,
                            profitEvaluation: updatedEvaluation
                          });
                        }}
                        style={{width: '100%', padding: '10px', border: '1px solid #28a745', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: 'white'}}
                      />
                    </div>
                  </div>
                </div>

                {/* Help Section */}
                <div style={{padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #2196f3'}}>
                  <h5 style={{color: '#1976d2', marginBottom: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    💡 How to Use This Calculator
                  </h5>
                  <ul style={{color: '#1976d2', fontSize: '0.8rem', marginBottom: '0', paddingLeft: '20px'}}>
                    <li>Enter your <strong>Sales Proceeds</strong> from Amazon Seller Central</li>
                    <li>Fill in all <strong>Amazon fees and taxes</strong> from your settlement report</li>
                    <li>The <strong>Balance Change</strong> is the net amount Amazon deposits to your account</li>
                    <li><strong>Net Profit</strong> is automatically calculated (Balance Change - Product Cost)</li>
                    <li>Set realistic <strong>Monthly/Yearly Profit</strong> projections based on your sales volume</li>
                    <li>All data will be displayed in the product detail page for buyers to see</li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '15px', paddingTop: '20px', borderTop: '2px solid #f0f0f0'}}>
                <button
                  onClick={() => setShowProfitModal(false)}
                  style={{
                    padding: '12px 25px',
                    fontSize: '1rem',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={updateProfitData}
                  style={{
                    padding: '12px 25px',
                    fontSize: '1rem',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  💾 Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;