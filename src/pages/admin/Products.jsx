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
  const [filters, setFilters] = useState({ category: '', status: '' });
  const [currency, setCurrency] = useState('GBP'); // Changed default from 'PKR' to 'GBP'
  const [editingCell, setEditingCell] = useState(null); // Track which cell is being edited
  const [editValues, setEditValues] = useState({}); // Store temporary edit values
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [profitEditProduct, setProfitEditProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState(new Set()); // Track selected product IDs
  const [modalCurrency, setModalCurrency] = useState('GBP'); // Changed default from 'PKR' to 'GBP'
  const [selectedUnits, setSelectedUnits] = useState(200); // Default to 200 units for platform comparison
  
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
    AED: 0.01310    // 1 AED = 76.37 PKR
  };

  const currencySymbols = {
    PKR: 'Rs',
    USD: '$',
    GBP: '£',       // Pound symbol
    AED: 'د.إ'
  };

  const convertPrice = (price, fromCurrency = 'PKR') => {
    if (fromCurrency === currency) {
      // No conversion needed
      return parseFloat(price).toFixed(2);
    }
    
    // Convert from source currency to PKR first, then to target currency
    let priceInPKR;
    if (fromCurrency === 'PKR') {
      priceInPKR = price;
    } else {
      priceInPKR = price / currencyRates[fromCurrency];
    }
    
    const converted = priceInPKR * currencyRates[currency];
    return converted.toFixed(2);
  };

  const formatPrice = (price, productCurrency = 'GBP') => {
    // Always show price in the selected display currency
    if (productCurrency && productCurrency === currency) {
      // Same currency - show as is
      return `${currencySymbols[currency]}${parseFloat(price).toFixed(2)}`;
    } else {
      // Different currency - convert for display only
      const convertedPrice = convertPrice(price, productCurrency);
      return `${currencySymbols[currency]}${convertedPrice}`;
    }
  };

  // Convert PKR value to selected currency for display (for modal)
  const convertFromPKRModal = (pkrValue) => {
    if (!pkrValue || isNaN(pkrValue)) return 0;
    return parseFloat((pkrValue * currencyRates[modalCurrency]).toFixed(2));
  };

  // Convert selected currency value back to PKR for storage (for modal)
  const convertToPKRModal = (currencyValue) => {
    if (!currencyValue || isNaN(currencyValue)) return 0;
    return currencyValue / currencyRates[modalCurrency];
  };

  // Initialize and restore category filter from location state or URL
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const categoryFromState = location.state?.category;
    const categoryFromUrl = urlParams.get('category');
    const categoryToRestore = categoryFromState || categoryFromUrl || '';
    

    
    // Always set the category from navigation
    setFilters(prev => {
      if (prev.category !== categoryToRestore) {
        return { ...prev, category: categoryToRestore };
      }
      return prev;
    });
  }, [location.pathname, location.search, location.state?.category]); // React to navigation changes

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
        limit: '50' // Reduced from 10000 to 50 for better performance
      });

      // Use fast endpoint by default, but allow full view if needed
      const useFastEndpoint = !search && !filters.category && !filters.status; // Use fast only for default view
      
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
        // Remove from selected if it was selected
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

  // Handle selecting/deselecting a single product
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

  // Handle select all / deselect all
  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      // Deselect all
      setSelectedProducts(new Set());
    } else {
      // Select all on current page
      const currentPageProducts = filteredProducts.slice(
        (currentPage - 1) * productsPerPage,
        currentPage * productsPerPage
      );
      setSelectedProducts(new Set(currentPageProducts.map(p => p._id)));
    }
  };

  // Bulk delete selected products
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

      // Delete each selected product
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

      // Clear selection and refresh
      setSelectedProducts(new Set());
      fetchProducts();

      // Show result
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
  const startProfitEditing = async (product) => {
    // Fetch the latest product data to ensure we have current price and currency
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/products/${product._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const latestProduct = await response.json();
        console.log('📊 Fetched latest product data for profit modal:', {
          name: latestProduct.name,
          price: latestProduct.price,
          currency: latestProduct.currency
        });
        product = latestProduct; // Use the latest data
      }
    } catch (error) {
      console.error('Error fetching latest product data:', error);
      // Continue with the passed product data if fetch fails
    }
    
    // Calculate product cost automatically from product price (convert to PKR for internal calculations)
    const productPrice = parseFloat(product.price) || 0;
    const productCurrency = product.currency || 'GBP';
    
    // Convert product price to PKR for internal profit calculations
    let productPricePKR;
    if (productCurrency === 'PKR') {
      productPricePKR = productPrice;
    } else {
      // Convert from product currency to PKR
      productPricePKR = productPrice / currencyRates[productCurrency];
    }
    
    console.log('💰 Profit Modal - Product Cost Calculation:', {
      originalPrice: productPrice,
      originalCurrency: productCurrency,
      convertedToPKR: productPricePKR,
      currencyRate: currencyRates[productCurrency]
    });
    
    // Initialize selectedUnits from product's platformUnits or default to 200
    const initialUnits = product.platformUnits || 200;
    setSelectedUnits(initialUnits);
    
    // Calculate default monthly and yearly profits based on profit per unit
    const profitPerUnit = product.profitCalculations?.profitPerUnit || 0;
    const defaultMonthlyProfit = profitPerUnit * 30; // 30 units per month
    const defaultYearlyProfit = profitPerUnit * 365; // 365 units per year
    
    setProfitEditProduct({
      _id: product._id,
      name: product.name || '',
      dealUnits: product.dealUnits || 1,
      // About This Item
      description: product.description || '',
      features: product.features || [],
      // Platform Comparison
      platformComparison: product.platformComparison || [
        { platform: 'RRP', rrpPerUnit: 0, units: 200, profitFor200Units: 0, markup: '0%' },
        { platform: 'Amazon', rrpPerUnit: 0, units: 200, profitFor200Units: 0, markup: '0%' },
        { platform: 'eBay', rrpPerUnit: 0, units: 200, profitFor200Units: 0, markup: '0%' }
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
        salesProceeds: product.profitEvaluation.salesProceeds || 0,
        commission: product.profitEvaluation.commission || 0,
        commissionTax: product.profitEvaluation.commissionTax || 0,
        digitalServicesFee: product.profitEvaluation.digitalServicesFee || 0,
        digitalServicesTax: product.profitEvaluation.digitalServicesTax || 0,
        fbaFulfilmentFee: product.profitEvaluation.fbaFulfilmentFee || 0,
        fbaFulfilmentTax: product.profitEvaluation.fbaFulfilmentTax || 0,
        balanceChange: product.profitEvaluation.balanceChange || 0, // Preserve existing balance change
        productCost: productPricePKR, // Always use current product price converted to PKR
        netProfit: (product.profitEvaluation.balanceChange || 0) - productPricePKR, // Auto-calculate: Balance Change - Product Cost
        monthlyProfit: product.profitEvaluation.monthlyProfit || defaultMonthlyProfit, // Use saved or calculated
        yearlyProfit: product.profitEvaluation.yearlyProfit || defaultYearlyProfit // Use saved or calculated
      } : {
        salesProceeds: 0,
        commission: 0,
        commissionTax: 0,
        digitalServicesFee: 0,
        digitalServicesTax: 0,
        fbaFulfilmentFee: 0,
        fbaFulfilmentTax: 0,
        balanceChange: 0,
        productCost: productPricePKR, // Auto-populate from product price converted to PKR
        netProfit: 0 - productPricePKR, // Auto-calculate: Balance Change - Product Cost
        monthlyProfit: defaultMonthlyProfit, // Calculated monthly profit
        yearlyProfit: defaultYearlyProfit // Calculated yearly profit
      }
    });
    // Initialize modal currency to current page currency
    setModalCurrency(currency);
    setShowProfitModal(true);
    
    // Debug: Log initial values
    console.log('🔍 Modal Opened - Profit Evaluation Data:', {
      productName: product.name,
      productPrice: productPrice,
      productCurrency: productCurrency,
      productCostPKR: productPricePKR,
      hasExistingProfitEvaluation: !!product.profitEvaluation,
      existingProductCost: product.profitEvaluation?.productCost,
      existingBalanceChange: product.profitEvaluation?.balanceChange,
      modalCurrency: currency,
      displayedProductCost: convertFromPKRModal(productPricePKR)
    });
  };

  // Function to recalculate all platform profits when profit evaluation changes
  const recalculateAllPlatformProfits = () => {
    if (!profitEditProduct) return;
    
    const profitPerUnit = profitEditProduct.profitEvaluation?.netProfit || 0;
    const updatedPlatforms = profitEditProduct.platformComparison.map(platform => {
      const units = platform.units || 200;
      return {
        ...platform,
        profitFor200Units: profitPerUnit * units
      };
    });
    
    setProfitEditProduct({
      ...profitEditProduct,
      platformComparison: updatedPlatforms
    });
  };

  const updateProfitData = async () => {
    if (!profitEditProduct) return;

    try {
      const token = localStorage.getItem('adminToken');
      
      // Calculate profitFor200Units based on profitPerUnit
      const calculatedProfitFor200Units = (profitEditProduct.profitCalculations.profitPerUnit || 0) * 200;
      
      const updateData = {
        platformComparison: profitEditProduct.platformComparison,
        platformUnits: selectedUnits, // Save the selected units
        profitCalculations: {
          ...profitEditProduct.profitCalculations,
          profitFor200Units: calculatedProfitFor200Units // Auto-calculated value
        },
        profitEvaluation: profitEditProduct.profitEvaluation
      };

      console.log('💾 Saving profit data:', {
        productId: profitEditProduct._id,
        monthlyProfit: profitEditProduct.profitEvaluation.monthlyProfit,
        yearlyProfit: profitEditProduct.profitEvaluation.yearlyProfit,
        fullUpdateData: updateData
      });

      const response = await fetch(`http://localhost:5000/api/products/${profitEditProduct._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Profit data saved successfully:', responseData);
        
        // Clear any cached product data to ensure fresh data is loaded
        cacheManager.clearAll();
        console.log('🗑️ Cache cleared after profit update');
        
        alert('✅ Profit data updated successfully!');
        setShowProfitModal(false);
        setProfitEditProduct(null);
        fetchProducts(); // Refresh the products list
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

  const handleSaveEdit = async (productId, field) => {
    const cellKey = `${productId}-${field}`;
    const newValue = editValues[cellKey];
    
    if (newValue === undefined || newValue === '') {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      let parsedValue = field === 'price' || field === 'stock' ? parseFloat(newValue) : newValue;
      
      // For price updates, save the price in the selected currency
      const updateData = { [field]: parsedValue };
      if (field === 'price') {
        updateData.currency = currency; // Save the currency along with the price
        console.log('💰 Saving price in currency:', currency, 'Value:', parsedValue);
      console.log('📤 Full update data being sent:', updateData);
      }
      
      console.log('🌐 Making PUT request to:', `http://localhost:5000/api/products/${productId}`);
      console.log('📦 Request body:', JSON.stringify(updateData));
      
      const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Price update successful');
        console.log('📊 Updated product data from server:', responseData);
        // Update both products and filteredProducts state
        const updateObject = { [field]: parsedValue };
        if (field === 'price') {
          updateObject.currency = currency; // Update currency in state too
        }
        
        const updatedProducts = products.map(p => 
          p._id === productId ? { ...p, ...updateObject } : p
        );
        
        setProducts(updatedProducts);
        setFilteredProducts(filteredProducts.map(p => 
          p._id === productId ? { ...p, ...updateObject } : p
        ));
        setEditingCell(null);
        
        // Clear cache to ensure changes appear everywhere
        cacheManager.clearAll();
        
        // Show success indicator with green flash
        const cell = document.querySelector(`[data-cell="${cellKey}"]`);
        if (cell) {
          cell.style.background = '#d4edda';
          setTimeout(() => { cell.style.background = ''; }, 1000);
        }
        
        if (field === 'price') {
          alert(`✅ Price updated successfully! Saved ${currencySymbols[currency]}${parsedValue} in ${currency}`);
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
    // Navigate to product detail page - product ID is enough, page will fetch full data
    // Pass minimal data in state to avoid 431 error (Request Header Fields Too Large)
    navigate(`/product/${product._id}`, {
      state: { 
        returnTo: '/admin/products', 
        category: filters.category,
        // Pass basic product info for immediate display while loading
        productPreview: {
          name: product.name,
          price: product.price,
          category: product.category
        }
      }
    });
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
    const newCategory = categoryValue === 'all' ? '' : categoryValue;
    setFilters({ ...filters, category: newCategory });
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
      {!search && !filters.category && !filters.status && (
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
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{
              padding: '6px 10px',
              fontSize: '0.7rem',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              outline: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              background: 'white'
            }}
            title="Select currency for price display and editing"
          >
            <option value="GBP">💷 GBP (£)</option> {/* Moved GBP to top */}
            <option value="PKR">💰 PKR (Rs)</option>
            <option value="USD">💵 USD ($)</option>
            <option value="AED">💴 AED</option>
          </select>
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
              background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
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
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <span style={{fontWeight: '600'}}>
                {filters.category 
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
                  <th style={{padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white'}}>Price</th> {/* Added (£) */}
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
                          textDecoration: 'underline'
                        }}
                        title="Click to view product details"
                      >
                        {product.name}
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
                <p style={{margin: '5px 0 0 0', fontSize: '0.8rem', opacity: 0.7, fontStyle: 'italic'}}>
                  💡 To edit product details (name, description, features), use the "Edit Product" button instead
                </p>
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
                  <label style={{fontSize: '0.75rem', marginBottom: '4px', opacity: 0.9}}>Currency</label>
                  <select
                    value={modalCurrency}
                    onChange={(e) => {
                      console.log('🔄 Currency Changed:', e.target.value);
                      setModalCurrency(e.target.value);
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.9rem',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderRadius: '6px',
                      outline: 'none',
                      fontWeight: '600',
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.2)',
                      color: 'white'
                    }}
                  >
                    <option value="GBP" style={{color: '#333'}}>GBP (£)</option> {/* Moved GBP to top */}
                    <option value="PKR" style={{color: '#333'}}>PKR (Rs)</option>
                    <option value="USD" style={{color: '#333'}}>USD ($)</option>
                    <option value="AED" style={{color: '#333'}}>AED (د.إ)</option>
                  </select>
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
                          <option value="Walmart">Walmart</option>
                          <option value="AliExpress">AliExpress</option>
                          <option value="Shopify">Shopify</option>
                          <option value="Etsy">Etsy</option>
                          <option value="Facebook Marketplace">Facebook Marketplace</option>
                          
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>RRP/Unit ({currencySymbols[modalCurrency]})</label>
                        <input
                          type="number"
                          step="0.01"
                          value={convertFromPKRModal(platform.rrpPerUnit)}
                          onChange={(e) => {
                            const newPlatforms = [...profitEditProduct.platformComparison];
                            newPlatforms[index].rrpPerUnit = convertToPKRModal(parseFloat(e.target.value) || 0);
                            setProfitEditProduct({...profitEditProduct, platformComparison: newPlatforms});
                          }}
                          style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                        />
                      </div>
                      <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>Units</label>
                        <select
                          value={platform.units || 200}
                          onChange={(e) => {
                            const newPlatforms = [...profitEditProduct.platformComparison];
                            const newUnits = parseInt(e.target.value);
                            newPlatforms[index].units = newUnits;
                            // Auto-calculate total profit using profit per unit from evaluation
                            const profitPerUnit = profitEditProduct.profitEvaluation?.netProfit || 0;
                            newPlatforms[index].profitFor200Units = profitPerUnit * newUnits;
                            setProfitEditProduct({...profitEditProduct, platformComparison: newPlatforms});
                          }}
                          style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                        >
                          <option value={100}>100</option>
                          <option value={150}>150</option>
                          <option value={200}>200</option>
                          <option value={250}>250</option>
                          <option value={300}>300</option>
                          <option value={400}>400</option>
                          <option value={500}>500</option>
                          <option value={600}>600</option>
                          <option value={700}>700</option>
                          <option value={800}>800</option>
                          <option value={900}>900</option>
                          <option value={1000}>1000</option>
                        </select>
                      </div>
                      <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                          Total Profit ({platform.units || 200} units) ({currencySymbols[modalCurrency]})
                          <span style={{fontSize: '0.7rem', fontWeight: 'normal', color: '#666', marginLeft: '5px'}}>
                            (Auto-calculated: Net Profit × {platform.units || 200})
                          </span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={convertFromPKRModal(platform.profitFor200Units)}
                          readOnly
                          style={{
                            width: '100%', 
                            padding: '10px', 
                            border: '1px solid #ddd', 
                            borderRadius: '6px', 
                            fontSize: '0.9rem',
                            backgroundColor: '#f8f9fa', // Light background to indicate auto-calculation
                            cursor: 'not-allowed'
                          }}
                          title="This value is automatically calculated based on Net Profit from evaluation × platform units"
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
                      { platform: 'Other', rrpPerUnit: 0, units: 200, profitFor200Units: 0, markup: '0%' }
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
                
                <div style={{
                  marginTop: '15px',
                  padding: '10px',
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffeaa7',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: '#856404'
                }}>
                  <strong>💡 How it works:</strong> Enter the RRP per unit and select units for each platform. 
                  The total profit values will be automatically calculated using the Net Profit from the Profit Evaluation section below × platform units. 
                  These settings will be saved and displayed in the product detail page.
                </div>
              </div>

              {/* Profit Calculations Section */}
              <div style={{marginBottom: '30px', padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '2px solid #2196f3'}}>
                <h3 style={{color: '#2196f3', marginBottom: '20px', fontSize: '1.3rem'}}>💰 Profit Calculations</h3>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px'}}>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>
                      Profit per Unit ({currencySymbols[modalCurrency]}) 
                      <span style={{fontSize: '0.8rem', color: '#17a2b8', fontWeight: 'normal', marginLeft: '8px'}}>
                        🧮 Auto-calculated (= Net Profit)
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={convertFromPKRModal(profitEditProduct.profitCalculations.profitPerUnit)}
                      readOnly
                      style={{width: '100%', padding: '12px', border: '1px solid #17a2b8', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: '#e7f3ff', cursor: 'not-allowed'}}
                      placeholder="Auto-calculated: = Net Profit"
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>
                      If sold 200 units ({currencySymbols[modalCurrency]})
                      <span style={{fontSize: '0.8rem', color: '#17a2b8', fontWeight: 'normal', marginLeft: '8px'}}>
                        🧮 Auto-calculated (Profit per Unit × 200)
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={convertFromPKRModal((profitEditProduct.profitCalculations.profitPerUnit || 0) * 200)}
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
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Sales Proceeds ({currencySymbols[modalCurrency]})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={convertFromPKRModal(profitEditProduct.profitEvaluation.salesProceeds)}
                      onChange={(e) => {
                        const pkrValue = convertToPKRModal(parseFloat(e.target.value) || 0);
                        setProfitEditProduct({
                          ...profitEditProduct, 
                          profitEvaluation: {
                            ...profitEditProduct.profitEvaluation,
                            salesProceeds: pkrValue
                          }
                        });
                      }}
                      style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Commission ({currencySymbols[modalCurrency]})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={convertFromPKRModal(profitEditProduct.profitEvaluation.commission)}
                      onChange={(e) => {
                        const pkrValue = convertToPKRModal(parseFloat(e.target.value) || 0);
                        setProfitEditProduct({
                          ...profitEditProduct, 
                          profitEvaluation: {
                            ...profitEditProduct.profitEvaluation,
                            commission: pkrValue
                          }
                        });
                      }}
                      style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Commission Tax ({currencySymbols[modalCurrency]})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={convertFromPKRModal(profitEditProduct.profitEvaluation.commissionTax)}
                      onChange={(e) => {
                        const pkrValue = convertToPKRModal(parseFloat(e.target.value) || 0);
                        setProfitEditProduct({
                          ...profitEditProduct, 
                          profitEvaluation: {
                            ...profitEditProduct.profitEvaluation,
                            commissionTax: pkrValue
                          }
                        });
                      }}
                      style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Digital Services Fee ({currencySymbols[modalCurrency]})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={convertFromPKRModal(profitEditProduct.profitEvaluation.digitalServicesFee)}
                      onChange={(e) => {
                        const pkrValue = convertToPKRModal(parseFloat(e.target.value) || 0);
                        setProfitEditProduct({
                          ...profitEditProduct, 
                          profitEvaluation: {
                            ...profitEditProduct.profitEvaluation,
                            digitalServicesFee: pkrValue
                          }
                        });
                      }}
                      style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Digital Services Tax ({currencySymbols[modalCurrency]})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={convertFromPKRModal(profitEditProduct.profitEvaluation.digitalServicesTax)}
                      onChange={(e) => {
                        const pkrValue = convertToPKRModal(parseFloat(e.target.value) || 0);
                        setProfitEditProduct({
                          ...profitEditProduct, 
                          profitEvaluation: {
                            ...profitEditProduct.profitEvaluation,
                            digitalServicesTax: pkrValue
                          }
                        });
                      }}
                      style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>FBA Fulfilment Fee ({currencySymbols[modalCurrency]})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={convertFromPKRModal(profitEditProduct.profitEvaluation.fbaFulfilmentFee)}
                      onChange={(e) => {
                        const pkrValue = convertToPKRModal(parseFloat(e.target.value) || 0);
                        setProfitEditProduct({
                          ...profitEditProduct, 
                          profitEvaluation: {
                            ...profitEditProduct.profitEvaluation,
                            fbaFulfilmentFee: pkrValue
                          }
                        });
                      }}
                      style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>FBA Fulfilment Tax ({currencySymbols[modalCurrency]})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={convertFromPKRModal(profitEditProduct.profitEvaluation.fbaFulfilmentTax)}
                      onChange={(e) => {
                        const pkrValue = convertToPKRModal(parseFloat(e.target.value) || 0);
                        setProfitEditProduct({
                          ...profitEditProduct, 
                          profitEvaluation: {
                            ...profitEditProduct.profitEvaluation,
                            fbaFulfilmentTax: pkrValue
                          }
                        });
                      }}
                      style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Balance Change ({currencySymbols[modalCurrency]})</label>
                    <input
                      key={`balance-change-${profitEditProduct._id}`}
                      type="number"
                      step="0.01"
                      value={convertFromPKRModal(profitEditProduct.profitEvaluation?.balanceChange || 0)}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        const parsedValue = parseFloat(inputValue) || 0;
                        const newBalanceChangePKR = convertToPKRModal(parsedValue);
                        const productCostPKR = profitEditProduct.profitEvaluation.productCost || 0;
                        const calculatedNetProfitPKR = newBalanceChangePKR - productCostPKR; // Formula: Net Profit = Balance Change - Product Cost
                        
                        console.log('🔍 Balance Change Debug:', {
                          inputValue,
                          parsedValue,
                          modalCurrency,
                          currencyRate: currencyRates[modalCurrency],
                          newBalanceChangePKR,
                          productCostPKR,
                          calculatedNetProfitPKR
                        });
                        
                        setProfitEditProduct(prevState => {
                          // Update platform profits with new net profit using latest state
                          const updatedPlatforms = prevState.platformComparison.map(platform => ({
                            ...platform,
                            profitFor200Units: calculatedNetProfitPKR * (platform.units || 200)
                          }));
                          
                          return {
                            ...prevState, 
                            profitEvaluation: {
                              ...prevState.profitEvaluation,
                              balanceChange: newBalanceChangePKR,
                              netProfit: calculatedNetProfitPKR // Auto-calculate Net Profit
                            },
                            profitCalculations: {
                              ...prevState.profitCalculations,
                              profitPerUnit: calculatedNetProfitPKR, // Auto-calculate Profit per Unit = Net Profit
                              profitFor200Units: calculatedNetProfitPKR * 200 // Auto-calculate profit for 200 units
                            },
                            platformComparison: updatedPlatforms // Update all platform profits
                          };
                        });
                        
                        console.log('✅ Balance Change Updated:', {
                          newBalanceChangePKR,
                          calculatedNetProfitPKR,
                          updatedState: 'setProfitEditProduct called'
                        });
                      }}
                      style={{width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>
                      Product Cost ({currencySymbols[modalCurrency]}) 
                      <span style={{fontSize: '0.8rem', color: '#28a745', fontWeight: 'normal', marginLeft: '8px'}}>
                        🔄 Auto-syncs with product price
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={convertFromPKRModal(profitEditProduct.profitEvaluation.productCost)}
                      onChange={(e) => {
                        const inputValue = parseFloat(e.target.value) || 0;
                        const newProductCostPKR = convertToPKRModal(inputValue);
                        const balanceChangePKR = profitEditProduct.profitEvaluation.balanceChange || 0;
                        const calculatedNetProfitPKR = balanceChangePKR - newProductCostPKR; // Formula: Net Profit = Balance Change - Product Cost
                        
                        console.log('💰 Product Cost Updated:', {
                          inputValue,
                          modalCurrency,
                          newProductCostPKR,
                          balanceChangePKR,
                          calculatedNetProfitPKR
                        });
                        
                        setProfitEditProduct({
                          ...profitEditProduct, 
                          profitEvaluation: {
                            ...profitEditProduct.profitEvaluation,
                            productCost: newProductCostPKR,
                            netProfit: calculatedNetProfitPKR // Auto-calculate Net Profit
                          },
                          profitCalculations: {
                            ...profitEditProduct.profitCalculations,
                            profitPerUnit: calculatedNetProfitPKR, // Auto-calculate Profit per Unit = Net Profit
                            profitFor200Units: calculatedNetProfitPKR * 200 // Auto-calculate profit for 200 units
                          }
                        });
                        
                        // Recalculate platform profits with new net profit
                        setTimeout(() => recalculateAllPlatformProfits(), 100);
                      }}
                      style={{width: '100%', padding: '12px', border: '1px solid #28a745', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: '#f8fff9'}}
                      placeholder="Auto-syncs with current product price"
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>
                      Net Profit ({currencySymbols[modalCurrency]}) 
                      <span style={{fontSize: '0.8rem', color: '#17a2b8', fontWeight: 'normal', marginLeft: '8px'}}>
                        🧮 Auto-calculated (Balance Change - Product Cost)
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={convertFromPKRModal(profitEditProduct.profitEvaluation.netProfit)}
                      readOnly
                      style={{width: '100%', padding: '12px', border: '1px solid #17a2b8', borderRadius: '6px', fontSize: '0.9rem', backgroundColor: '#e7f3ff', cursor: 'not-allowed'}}
                      placeholder="Auto-calculated: Balance Change - Product Cost"
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>
                      Monthly Profit ({currencySymbols[modalCurrency]})
                      <span style={{fontSize: '0.8rem', color: '#28a745', fontWeight: 'normal', marginLeft: '8px'}}>
                        📅 Custom monthly profit amount
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={convertFromPKRModal(profitEditProduct.profitEvaluation.monthlyProfit || 0)}
                      onChange={(e) => {
                        const pkrValue = convertToPKRModal(parseFloat(e.target.value) || 0);
                        setProfitEditProduct({
                          ...profitEditProduct, 
                          profitEvaluation: {
                            ...profitEditProduct.profitEvaluation,
                            monthlyProfit: pkrValue
                          }
                        });
                      }}
                      style={{width: '100%', padding: '12px', border: '1px solid #28a745', borderRadius: '6px', fontSize: '0.9rem'}}
                      placeholder="Enter monthly profit amount"
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>
                      Yearly Profit ({currencySymbols[modalCurrency]})
                      <span style={{fontSize: '0.8rem', color: '#ffc107', fontWeight: 'normal', marginLeft: '8px'}}>
                        📊 Custom yearly profit amount
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={convertFromPKRModal(profitEditProduct.profitEvaluation.yearlyProfit || 0)}
                      onChange={(e) => {
                        const pkrValue = convertToPKRModal(parseFloat(e.target.value) || 0);
                        setProfitEditProduct({
                          ...profitEditProduct, 
                          profitEvaluation: {
                            ...profitEditProduct.profitEvaluation,
                            yearlyProfit: pkrValue
                          }
                        });
                      }}
                      style={{width: '100%', padding: '12px', border: '1px solid #ffc107', borderRadius: '6px', fontSize: '0.9rem'}}
                      placeholder="Enter yearly profit amount"
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

export default AdminProducts;