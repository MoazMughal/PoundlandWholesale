import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import cacheManager from '../../utils/cacheManager';
import { getImageUrl } from '../../utils/imageImports';
import CategoryVisibilityToggle from '../../components/CategoryVisibilityToggle';
import '../../styles/AdminProducts.css';
import '../../styles/AdminLayout.css';

// Component to show linked product preview in admin
const LinkedProductPreview = ({ productId }) => {
  const [productData, setProductData] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/products/public/${productId}`);
        if (response.ok) {
          const data = await response.json();
          setProductData(data);
        }
      } catch (error) {
        console.error('Error fetching product preview:', error);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  if (!productData) {
    return <span style={{ fontSize: '0.6rem', color: '#999' }}>...</span>;
  }

  const imageUrl = productData.images?.[0] || productData.image;
  
  return imageUrl ? (
    <img 
      src={getImageUrl(imageUrl)}
      alt="Preview"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain'
      }}
      onError={(e) => {
        e.target.style.display = 'none';
      }}
    />
  ) : (
    <span style={{ fontSize: '0.6rem', color: '#999' }}>No img</span>
  );
};

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
  const [productCostUpdated, setProductCostUpdated] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  // Variations management state
  const [showVariationsModal, setShowVariationsModal] = useState(false);
  const [variationsEditProduct, setVariationsEditProduct] = useState(null);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [variationSearchQuery, setVariationSearchQuery] = useState('');
  
  // Helper functions for linked product configuration
  const getLinkedProductVariationType = (productId) => {
    // Find if this product is linked in any variation and return its type
    for (const variation of variationsEditProduct?.variations || []) {
      const option = variation.options?.find(opt => opt.productId === productId);
      if (option) {
        return variation.type;
      }
    }
    return 'style'; // default
  };

  const getLinkedProductVariationName = (productId) => {
    // Find if this product is linked in any variation and return its custom name
    for (const variation of variationsEditProduct?.variations || []) {
      const option = variation.options?.find(opt => opt.productId === productId);
      if (option) {
        return option.customName || '';
      }
    }
    return '';
  };

  const updateLinkedProductConfig = (productId, field, value) => {
    // Update the configuration for a linked product
    const updatedVariations = [...(variationsEditProduct.variations || [])];
    
    // Ensure we have at least one variation
    if (updatedVariations.length === 0) {
      updatedVariations.push({ type: 'style', name: '', options: [] });
    }
    
    // Find or create the option for this product
    let optionIndex = updatedVariations[0].options?.findIndex(opt => opt.productId === productId);
    
    if (optionIndex === -1) {
      // Create new option
      if (!updatedVariations[0].options) {
        updatedVariations[0].options = [];
      }
      updatedVariations[0].options.push({
        value: availableProducts.find(p => p._id === productId)?.name?.split(' ')[0] || 'Option',
        productId: productId,
        type: 'style',
        customName: '',
        images: [],
        price: null,
        stock: null
      });
      optionIndex = updatedVariations[0].options.length - 1;
    }
    
    // Update the field
    if (field === 'type') {
      updatedVariations[0].options[optionIndex].type = value;
    } else if (field === 'name') {
      updatedVariations[0].options[optionIndex].customName = value;
    }
    
    setVariationsEditProduct({
      ...variationsEditProduct,
      variations: updatedVariations
    });
  };

  const toggleLinkedProduct = (productId) => {
    console.log('🔗 Toggling link for product:', productId);
    
    // Get current variations or create default
    let updatedVariations = [...(variationsEditProduct.variations || [])];
    
    // Ensure we have at least one variation with proper structure
    if (updatedVariations.length === 0) {
      updatedVariations = [{
        type: 'style',
        name: 'any',
        options: []
      }];
    }
    
    // Ensure the first variation has options array
    if (!updatedVariations[0].options) {
      updatedVariations[0].options = [];
    }
    
    const isCurrentlyLinked = updatedVariations[0].options.some(option => option.productId === productId);
    console.log('🔗 Currently linked?', isCurrentlyLinked);

    if (isCurrentlyLinked) {
      // Remove the product
      updatedVariations[0].options = updatedVariations[0].options.filter(option => option.productId !== productId);
      console.log('🔗 Removed product from links');
    } else {
      // Add the product
      const linkedProduct = availableProducts.find(p => p._id === productId);
      if (linkedProduct) {
        updatedVariations[0].options.push({
          value: linkedProduct.name.split(' ')[0] || 'Option',
          productId: productId,
          type: 'style',
          customName: '',
          images: linkedProduct.images || [],
          price: linkedProduct.price,
          stock: linkedProduct.stock
        });
        console.log('🔗 Added product to links:', linkedProduct.name);
      }
    }
    
    console.log('🔗 Updated variations:', updatedVariations);
    
    setVariationsEditProduct({
      ...variationsEditProduct,
      variations: updatedVariations
    });
  };

  const removeLinkedProduct = (productId) => {
    // Remove a product from variations
    const updatedVariations = [...(variationsEditProduct.variations || [])];
    
    if (updatedVariations.length > 0 && updatedVariations[0].options) {
      updatedVariations[0].options = updatedVariations[0].options.filter(option => option.productId !== productId);
    }
    
    setVariationsEditProduct({
      ...variationsEditProduct,
      variations: updatedVariations
    });
  };
  
  const currency = 'GBP';
  const currencySymbol = '£';
  const productsPerPage = 50;

  const [categories, setCategories] = useState([
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
  ]);

  const formatPrice = (price) => {
    return `£${parseFloat(price || 0).toFixed(2)}`;
  };

  const safeFormatNumber = (value, decimals = 2) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    // For input fields, return the number with proper decimal formatting
    return num.toFixed(decimals);
  };

  const formatCurrency = (value, decimals = 2) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    return num.toFixed(decimals);
  };

  const displayNumber = (value, decimals = 2) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    return num.toFixed(decimals);
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
    const statusFromUrl = urlParams.get('status');
    const categoryToRestore = categoryFromState || categoryFromUrl || '';
    const statusToRestore = statusFromUrl || '';
    const amazonsChoiceFromUrl = urlParams.get('amazonsChoice') === 'true';
    
    console.log('🔄 Category restoration:', {
      categoryFromState,
      categoryFromUrl,
      statusFromUrl,
      categoryToRestore,
      statusToRestore,
      amazonsChoiceFromUrl,
      currentCategory: filters.category,
      currentStatus: filters.status,
      locationSearch: location.search,
      locationState: location.state
    });
    
    setFilters(prev => {
      const newFilters = { ...prev };
      if (prev.category !== categoryToRestore) {
        console.log('📂 Updating category from', prev.category, 'to', categoryToRestore);
        newFilters.category = categoryToRestore;
      }
      if (prev.status !== statusToRestore) {
        console.log('📊 Updating status from', prev.status, 'to', statusToRestore);
        newFilters.status = statusToRestore;
      }
      if (prev.isAmazonsChoice !== amazonsChoiceFromUrl) {
        console.log('⭐ Updating Amazon\'s Choice from', prev.isAmazonsChoice, 'to', amazonsChoiceFromUrl);
        newFilters.isAmazonsChoice = amazonsChoiceFromUrl;
      }
      return newFilters;
    });
  }, [location.pathname, location.search, location.state?.category]);

  useEffect(() => {
    // Clear cache to ensure fresh data
    cacheManager.clearAll();
    fetchProducts();
    fetchCategories();
  }, [search, filters]);

  // Track window resize for responsive modal
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchCategories = async () => {
    try {
      // Include Excel categories for admin use
      const response = await fetch('http://localhost:5000/api/categories?includeExcel=true');
      if (response.ok) {
        const data = await response.json();
        
        // Merge with default categories (keeping icons)
        const defaultCategories = [
          { value: 'all', label: 'All Products', icon: '📦' }
        ];
        
        const dynamicCategories = data.categories.map(cat => ({
          value: cat.value,
          label: cat.label,
          icon: getCategoryIcon(cat.value)
        }));
        
        setCategories([...defaultCategories, ...dynamicCategories]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Keep default categories if API fails
    }
  };

  const getCategoryIcon = (categoryValue) => {
    const iconMap = {
      'remote': '📺',
      'electronics': '⚡',
      'strap': '⌚',
      'jewelry': '💎',
      'party': '🎉',
      'home': '🏠',
      'kitchen': '🍳',
      'automotive': '🚗',
      'tape': '📼',
      'lampshade': '💡',
      'clothing': '👕',
      'food': '🍕',
      'beauty': '💄',
      'sports': '⚽',
      'toys': '🧸',
      'books': '📚',
      'health': '🏥'
    };
    return iconMap[categoryValue] || '📂';
  };

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
      
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(filters.category && { category: filters.category }),
        ...(filters.status && { status: filters.status }),
        ...(filters.isAmazonsChoice && { isAmazonsChoice: 'true' }),
        excludeSellerCopies: 'true',
        limit: '50'
      });

      const useFastEndpoint = !search && !filters.category && !filters.status && !filters.isAmazonsChoice;
      
      // Add cache buster to ensure fresh data
      const cacheBuster = `_t=${Date.now()}`;
      const url = useFastEndpoint 
        ? `http://localhost:5000/api/products/admin/fast?${cacheBuster}`
        : `http://localhost:5000/api/products?${params}&${cacheBuster}`;

      const response = await fetch(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
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
    // Ensure ASIN field has a proper initial value (empty string if null/undefined)
    const initialValue = field === 'asin' ? (currentValue || '') : currentValue;
    setEditValues({ ...editValues, [`${productId}-${field}`]: initialValue });
  };

  const handleEditChange = (productId, field, value) => {
    setEditValues({ ...editValues, [`${productId}-${field}`]: value });
  };

  const handleSaveEdit = async (productId, field) => {
    const cellKey = `${productId}-${field}`;
    const newValue = editValues[cellKey];
    
    // Allow empty values for ASIN field, but not for price/stock
    if (newValue === undefined || (newValue === '' && field !== 'asin')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      let parsedValue;
      
      if (field === 'price' || field === 'stock') {
        parsedValue = parseFloat(newValue);
      } else if (field === 'asin') {
        // Handle ASIN field - trim and convert to uppercase, allow empty string
        parsedValue = newValue ? newValue.trim().toUpperCase() : '';
      } else {
        parsedValue = newValue;
      }
      
      const updateData = { [field]: parsedValue };
      if (field === 'price') {
        updateData.currency = 'GBP';
      }
      
      // Debug logging for ASIN updates
      if (field === 'asin') {
        console.log('🏷️ Saving ASIN:', {
          productId,
          originalValue: newValue,
          parsedValue,
          updateData
        });
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
        
        // Log successful ASIN update
        if (field === 'asin') {
          console.log('✅ ASIN updated successfully:', {
            productId,
            newASIN: parsedValue,
            productName: updatedProducts.find(p => p._id === productId)?.name
          });
        }
        
        // If price was updated, check if we need to update profit data
        if (field === 'price') {
          // Update profit modal if it's open for this product
          if (profitEditProduct && profitEditProduct._id === productId) {
          console.log('🔄 Price updated, updating product cost in profit modal from', profitEditProduct.profitEvaluation.productCost, 'to', parsedValue);
          
          // Update the product cost in the profit evaluation
          const updatedProfitEvaluation = {
            ...profitEditProduct.profitEvaluation,
            productCost: parsedValue
          };
          
          // Recalculate net profit with new product cost
          const balanceChange = updatedProfitEvaluation.balanceChange || 0;
          const newNetProfit = parseFloat((balanceChange - parsedValue).toFixed(2));
          updatedProfitEvaluation.netProfit = newNetProfit;
          
          // Update profit calculations
          const updatedProfitCalculations = {
            ...profitEditProduct.profitCalculations,
            costPrice: parsedValue,
            profitPerUnit: newNetProfit
          };
          
          // Update platform comparison profits with new net profit
          const updatedPlatformComparison = profitEditProduct.platformComparison.map(platform => ({
            ...platform,
            profitFor200Units: parseFloat((newNetProfit * (platform.units || 200)).toFixed(2))
          }));
          
          // Update the profit edit product state
          setProfitEditProduct({
            ...profitEditProduct,
            profitEvaluation: updatedProfitEvaluation,
            profitCalculations: updatedProfitCalculations,
            platformComparison: updatedPlatformComparison
          });
          
          // Set visual indicator that product cost was updated
          setProductCostUpdated(true);
          setTimeout(() => setProductCostUpdated(false), 3000); // Clear after 3 seconds
          
          // Automatically save the updated profit data to the database
          try {
            const profitUpdateData = {
              platformComparison: updatedPlatformComparison.map(platform => ({
                platform: platform.platform || 'Platform',
                rrpPerUnit: parseFloat((parseFloat(platform.rrpPerUnit) || 0).toFixed(2)),
                units: parseInt(platform.units) || 200,
                profitFor200Units: parseFloat((parseFloat(platform.profitFor200Units) || 0).toFixed(2)),
                markup: platform.markup || '0%'
              })),
              platformUnits: parseInt(selectedUnits) || 200,
              profitCalculations: {
                profitPerUnit: parseFloat((parseFloat(updatedProfitCalculations.profitPerUnit) || 0).toFixed(2)),
                profitFor200Units: parseFloat((parseFloat(updatedProfitCalculations.profitPerUnit) * 200 || 0).toFixed(2)),
                dealUnitsProfit: parseFloat((parseFloat(updatedProfitCalculations.dealUnitsProfit) || 0).toFixed(2)),
                profitForDealUnits: parseFloat((parseFloat(updatedProfitCalculations.profitForDealUnits) || 0).toFixed(2))
              },
              profitEvaluation: {
                salesProceeds: parseFloat((parseFloat(updatedProfitEvaluation.salesProceeds) || 0).toFixed(2)),
                commission: parseFloat((parseFloat(updatedProfitEvaluation.commission) || 0).toFixed(2)),
                commissionTax: parseFloat((parseFloat(updatedProfitEvaluation.commissionTax) || 0).toFixed(2)),
                digitalServicesFee: parseFloat((parseFloat(updatedProfitEvaluation.digitalServicesFee) || 0).toFixed(2)),
                digitalServicesTax: parseFloat((parseFloat(updatedProfitEvaluation.digitalServicesTax) || 0).toFixed(2)),
                fbaFulfilmentFee: parseFloat((parseFloat(updatedProfitEvaluation.fbaFulfilmentFee) || 0).toFixed(2)),
                fbaFulfilmentTax: parseFloat((parseFloat(updatedProfitEvaluation.fbaFulfilmentTax) || 0).toFixed(2)),
                balanceChange: parseFloat((parseFloat(updatedProfitEvaluation.balanceChange) || 0).toFixed(2)),
                productCost: parseFloat((parseFloat(updatedProfitEvaluation.productCost) || 0).toFixed(2)),
                netProfit: parseFloat((parseFloat(updatedProfitEvaluation.netProfit) || 0).toFixed(2)),
                monthlyProfit: parseFloat((parseFloat(updatedProfitEvaluation.monthlyProfit) || 0).toFixed(2)),
                yearlyProfit: parseFloat((parseFloat(updatedProfitEvaluation.yearlyProfit) || 0).toFixed(2))
              }
            };

            const profitResponse = await fetch(`http://localhost:5000/api/products/${productId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(profitUpdateData)
            });

            if (profitResponse.ok) {
              console.log('✅ Profit data automatically updated in database after price change');
            } else {
              console.log('⚠️ Failed to auto-update profit data in database');
            }
          } catch (error) {
            console.error('❌ Error auto-updating profit data:', error);
          }
          
          console.log('✅ Profit modal updated with new product cost and recalculated profits');
          } else {
            // Even if modal is not open, update profit data in database if it exists
            const productToUpdate = updatedProducts.find(p => p._id === productId);
            if (productToUpdate && (productToUpdate.profitEvaluation || productToUpdate.profitCalculations)) {
              console.log('🔄 Price updated for product with existing profit data, updating product cost in database');
              
              // Update product cost in existing profit evaluation
              const existingEvaluation = productToUpdate.profitEvaluation || {};
              const balanceChange = existingEvaluation.balanceChange || 0;
              const newNetProfit = parseFloat((balanceChange - parsedValue).toFixed(2));
              
              const updatedProfitEvaluation = {
                ...existingEvaluation,
                productCost: parsedValue,
                netProfit: newNetProfit
              };
              
              // Update profit calculations
              const existingCalculations = productToUpdate.profitCalculations || {};
              const updatedProfitCalculations = {
                ...existingCalculations,
                costPrice: parsedValue,
                profitPerUnit: newNetProfit
              };
              
              // Update platform comparison if it exists
              const updatedPlatformComparison = (productToUpdate.platformComparison || []).map(platform => ({
                ...platform,
                profitFor200Units: parseFloat((newNetProfit * (platform.units || 200)).toFixed(2))
              }));
              
              // Save to database
              const profitUpdateData = {
                profitEvaluation: updatedProfitEvaluation,
                profitCalculations: updatedProfitCalculations
              };
              
              if (updatedPlatformComparison.length > 0) {
                profitUpdateData.platformComparison = updatedPlatformComparison;
              }
              
              fetch(`http://localhost:5000/api/products/${productId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profitUpdateData)
              }).then(response => {
                if (response.ok) {
                  console.log('✅ Profit data automatically updated in database after price change (modal closed)');
                } else {
                  console.log('⚠️ Failed to auto-update profit data in database (modal closed)');
                }
              }).catch(error => {
                console.error('❌ Error auto-updating profit data (modal closed):', error);
              });
            }
          }
        }
        
        cacheManager.clearAll();
        
        const cell = document.querySelector(`[data-cell="${cellKey}"]`);
        if (cell) {
          cell.style.background = '#d4edda';
          setTimeout(() => { cell.style.background = ''; }, 1000);
        }
      } else {
        const errorData = await response.json();
        console.error('Update failed:', errorData);
        
        // Specific error message for ASIN updates
        if (field === 'asin') {
          console.error('❌ ASIN update failed:', {
            productId,
            attemptedValue: parsedValue,
            error: errorData
          });
          alert(`❌ Failed to update ASIN: ${errorData.message || 'Unknown error'}`);
        } else {
          alert(`❌ Failed to update: ${errorData.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error updating product:', error);
      
      // Specific error message for ASIN updates
      if (field === 'asin') {
        console.error('❌ ASIN update error:', {
          productId,
          attemptedValue: parsedValue,
          error: error.message
        });
        alert('❌ Failed to update ASIN. Please try again.');
      } else {
        alert('❌ Failed to update. Please try again.');
      }
    }
  };

  const handleProductClick = (product) => {
    console.log('🔗 Navigating to product detail:', {
      productId: product._id,
      productName: product.name,
      currentCategory: filters.category,
      returnTo: '/admin/products'
    });
    
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

  // Variations management functions
  const handleVariationsClick = async (product) => {
    console.log('🎨 Opening variations modal for product:', product.name);
    console.log('🎨 Product variations:', product.variations);
    
    // Initialize variations if they don't exist
    const productWithVariations = {
      ...product,
      variations: product.variations || []
    };
    
    console.log('🎨 Initialized product with variations:', productWithVariations);
    
    setVariationsEditProduct(productWithVariations);
    setShowVariationsModal(true);
    
    // Fetch available products from the same category for variations
    try {
      const response = await fetch(`http://localhost:5000/api/products/public?category=${encodeURIComponent(product.category)}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        // Filter out the current product and only show products without variations or with different variation types
        const filtered = data.products.filter(p => p._id !== product._id);
        setAvailableProducts(filtered);
      }
    } catch (error) {
      console.error('Error fetching available products:', error);
      setAvailableProducts([]);
    }
  };

  const addVariation = () => {
    console.log('🎨 Adding new variation');
    console.log('🎨 Current variationsEditProduct:', variationsEditProduct);
    
    const newVariation = {
      type: 'color',
      name: '', // Start with empty name so user can customize
      options: []
    };
    
    console.log('🎨 New variation to add:', newVariation);
    
    const updatedProduct = {
      ...variationsEditProduct,
      variations: [...(variationsEditProduct.variations || []), newVariation]
    };
    
    console.log('🎨 Updated product with new variation:', updatedProduct);
    
    setVariationsEditProduct(updatedProduct);
  };

  const updateVariation = (variationIndex, field, value) => {
    const updatedVariations = [...(variationsEditProduct.variations || [])];
    
    // Auto-set the name based on the type only when type changes
    if (field === 'type') {
      const nameMap = {
        'color': 'Color',
        'size': 'Size', 
        'style': 'Style'
      };
      
      updatedVariations[variationIndex] = {
        ...updatedVariations[variationIndex],
        [field]: value,
        name: nameMap[value] || value // Auto-set name based on type
      };
    } else {
      // For other fields (including 'name'), just update the field directly
      updatedVariations[variationIndex] = {
        ...updatedVariations[variationIndex],
        [field]: value
      };
    }
    
    setVariationsEditProduct({
      ...variationsEditProduct,
      variations: updatedVariations
    });
  };

  const addVariationOption = (variationIndex) => {
    const updatedVariations = [...(variationsEditProduct.variations || [])];
    
    // Ensure the variation exists and has an options array
    if (!updatedVariations[variationIndex]) {
      console.error('Variation at index', variationIndex, 'does not exist');
      return;
    }
    
    if (!updatedVariations[variationIndex].options) {
      updatedVariations[variationIndex].options = [];
    }
    
    updatedVariations[variationIndex].options.push({
      value: '',
      productId: null,
      images: [],
      price: null,
      stock: null
    });
    
    console.log('Added variation option. Updated variations:', updatedVariations);
    
    setVariationsEditProduct({
      ...variationsEditProduct,
      variations: updatedVariations
    });
  };

  const updateVariationOption = (variationIndex, optionIndex, field, value) => {
    const updatedVariations = [...(variationsEditProduct.variations || [])];
    
    // Ensure the variation and option exist
    if (!updatedVariations[variationIndex]) {
      console.error('Variation at index', variationIndex, 'does not exist');
      return;
    }
    
    if (!updatedVariations[variationIndex].options) {
      updatedVariations[variationIndex].options = [];
    }
    
    if (!updatedVariations[variationIndex].options[optionIndex]) {
      console.error('Option at index', optionIndex, 'does not exist in variation', variationIndex);
      return;
    }
    
    updatedVariations[variationIndex].options[optionIndex] = {
      ...updatedVariations[variationIndex].options[optionIndex],
      [field]: value
    };
    
    console.log('Updated variation option:', { variationIndex, optionIndex, field, value });
    
    setVariationsEditProduct({
      ...variationsEditProduct,
      variations: updatedVariations
    });
  };

  const removeVariation = (variationIndex) => {
    const updatedVariations = [...(variationsEditProduct.variations || [])];
    updatedVariations.splice(variationIndex, 1);
    
    setVariationsEditProduct({
      ...variationsEditProduct,
      variations: updatedVariations
    });
  };

  const removeVariationOption = (variationIndex, optionIndex) => {
    const updatedVariations = [...(variationsEditProduct.variations || [])];
    updatedVariations[variationIndex].options.splice(optionIndex, 1);
    
    setVariationsEditProduct({
      ...variationsEditProduct,
      variations: updatedVariations
    });
  };

  const saveVariations = async () => {
    try {
      console.log('🎨 Saving variations for product:', variationsEditProduct._id);
      
      // Check if token exists
      const token = localStorage.getItem('adminToken');
      if (!token) {
        alert('❌ Authentication token not found. Please log in again.');
        return;
      }
      
      // Clean the variations data before sending
      const cleanedVariations = (variationsEditProduct.variations || [])
        .filter(variation => variation.type && variation.name) // Only include valid variations
        .map(variation => ({
          type: variation.type,
          name: variation.name,
          options: variation.options
            .filter(option => option.value && option.value.trim() !== '') // Only include options with values
            .map(option => ({
              value: option.value.trim(),
              productId: option.productId && option.productId !== '' && option.productId !== 'null' ? option.productId : null,
              images: option.images || [],
              price: option.price || null,
              stock: option.stock || null
            }))
        }))
        .filter(variation => variation.options.length > 0); // Only include variations with options
      
      console.log('🎨 Cleaned variations data:', JSON.stringify(cleanedVariations, null, 2));
      
      // Check if there are any linked products (productId references)
      const hasLinkedProducts = cleanedVariations.some(variation => 
        variation.options.some(option => option.productId)
      );

      if (hasLinkedProducts) {
        // Use bidirectional endpoint when there are linked products
        console.log('🔗 Found linked products, using bidirectional endpoint...');
        const bidirectionalResponse = await fetch(`http://localhost:5000/api/products/variations/bidirectional/${variationsEditProduct._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            variations: cleanedVariations,
            currentProduct: {
              id: variationsEditProduct._id,
              name: variationsEditProduct.name,
              category: variationsEditProduct.category
            }
          })
        });

        if (bidirectionalResponse.ok) {
          const result = await bidirectionalResponse.json();
          console.log('✅ Bidirectional variations result:', result);
          alert(`✅ Variations updated successfully! Updated ${result.linkedProducts} linked products.`);
          setShowVariationsModal(false);
          fetchProducts(); // Refresh the products list
          return;
        } else {
          const errorData = await bidirectionalResponse.text();
          console.error('❌ Bidirectional update failed:', errorData);
          alert(`❌ Failed to save variations: ${errorData}`);
          return;
        }
      } else {
        // Use simple update when no linked products
        console.log('🔄 No linked products, using simple update...');
        const simpleResponse = await fetch(`http://localhost:5000/api/products/${variationsEditProduct._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            variations: cleanedVariations
          })
        });

        if (simpleResponse.ok) {
          const result = await simpleResponse.json();
          console.log('✅ Simple variations update successful:', result);
          alert('✅ Variations updated successfully!');
          setShowVariationsModal(false);
          fetchProducts(); // Refresh the products list
          return;
        } else {
          const errorData = await simpleResponse.text();
          console.error('❌ Simple update failed:', errorData);
          alert(`❌ Failed to save variations: ${errorData}`);
          return;
        }
      }
    } catch (error) {
      console.error('Error saving variations:', error);
      if (error.message.includes('401')) {
        alert('❌ Authentication failed. Please log in again.');
      } else {
        alert('❌ Failed to save variations. Please try again.');
      }
    }
  };

  const filteredAvailableProducts = availableProducts.filter(product =>
    product.name.toLowerCase().includes(variationSearchQuery.toLowerCase())
  );

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

  const updateFiltersAndUrl = (newFilters) => {
    console.log('🔄 Updating filters and URL:', {
      oldFilters: filters,
      newFilters,
      currentUrl: location.pathname + location.search
    });
    
    setFilters(newFilters);
    
    // Update URL to reflect all filters
    const searchParams = new URLSearchParams();
    if (newFilters.category) {
      searchParams.set('category', newFilters.category);
    }
    if (newFilters.status) {
      searchParams.set('status', newFilters.status);
    }
    if (newFilters.isAmazonsChoice) {
      searchParams.set('amazonsChoice', 'true');
    }
    
    // Update URL without triggering a full page reload
    const newUrl = searchParams.toString() 
      ? `${location.pathname}?${searchParams.toString()}`
      : location.pathname;
    
    console.log('🌐 New URL:', newUrl);
    
    navigate(newUrl, { replace: true, state: { category: newFilters.category } });
  };

  const handleCategoryFilter = (categoryValue) => {
    const newCategory = categoryValue === 'all' ? '' : categoryValue;
    updateFiltersAndUrl({ ...filters, category: newCategory });
  };

  const handleStatusFilter = (statusValue) => {
    updateFiltersAndUrl({ ...filters, status: statusValue });
  };

  const handleAmazonsChoiceFilter = () => {
    updateFiltersAndUrl({ ...filters, isAmazonsChoice: !filters.isAmazonsChoice });
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
      profitEvaluation: initProfitEvaluation,
      savings: safeParseFloat(product.savings, 0) // Initialize savings field
    });
    setProductCostUpdated(false); // Reset visual indicator
    setShowProfitModal(true);
  };

  const testApiConnection = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/products/admin/fast', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('🧪 API Test - Status:', response.status);
      if (response.ok) {
        console.log('✅ API connection successful');
      } else {
        console.log('❌ API connection failed');
      }
    } catch (error) {
      console.error('❌ API test error:', error);
    }
  };

  const verifyProductData = async () => {
    if (!profitEditProduct) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/products/${profitEditProduct._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const productData = await response.json();
        console.log('🔍 Current product data in database:');
        console.log('- Product ID:', productData._id);
        console.log('- Product Name:', productData.name);
        console.log('- Platform Comparison:', productData.platformComparison);
        console.log('- Profit Calculations:', productData.profitCalculations);
        console.log('- Profit Evaluation:', productData.profitEvaluation);
        
        // Also test the public API endpoint that the product detail page uses
        const publicResponse = await fetch(`http://localhost:5000/api/products/public/${productData._id}`);
        if (publicResponse.ok) {
          const publicData = await publicResponse.json();
          console.log('🌐 Public API data (what product detail page sees):');
          console.log('- Platform Comparison:', publicData.platformComparison);
          console.log('- Profit Calculations:', publicData.profitCalculations);
          console.log('- Profit Evaluation:', publicData.profitEvaluation);
        }
        
        alert('✅ Product data fetched! Check browser console for details.');
      } else {
        alert('❌ Failed to fetch product data');
      }
    } catch (error) {
      console.error('❌ Error fetching product data:', error);
      alert('❌ Error fetching product data');
    }
  };

  const updateProfitData = async () => {
    if (!profitEditProduct) return;

    try {
      const token = localStorage.getItem('adminToken');
      
      const calculatedProfitFor200Units = (profitEditProduct.profitCalculations.profitPerUnit || 0) * 200;
      
      // Validate and clean the data before sending
      const cleanPlatformComparison = profitEditProduct.platformComparison.map(platform => ({
        platform: platform.platform || 'Platform',
        rrpPerUnit: parseFloat((parseFloat(platform.rrpPerUnit) || 0).toFixed(2)),
        units: parseInt(platform.units) || 200,
        profitFor200Units: parseFloat((parseFloat(platform.profitFor200Units) || 0).toFixed(2)),
        markup: platform.markup || '0%'
      }));

      const cleanProfitCalculations = {
        profitPerUnit: parseFloat((parseFloat(profitEditProduct.profitCalculations.profitPerUnit) || 0).toFixed(2)),
        profitFor200Units: parseFloat(calculatedProfitFor200Units.toFixed(2)),
        dealUnitsProfit: parseFloat((parseFloat(profitEditProduct.profitCalculations.dealUnitsProfit) || 0).toFixed(2)),
        profitForDealUnits: parseFloat((parseFloat(profitEditProduct.profitCalculations.profitForDealUnits) || 0).toFixed(2))
      };

      const cleanProfitEvaluation = {
        salesProceeds: parseFloat((parseFloat(profitEditProduct.profitEvaluation.salesProceeds) || 0).toFixed(2)),
        commission: parseFloat((parseFloat(profitEditProduct.profitEvaluation.commission) || 0).toFixed(2)),
        commissionTax: parseFloat((parseFloat(profitEditProduct.profitEvaluation.commissionTax) || 0).toFixed(2)),
        digitalServicesFee: parseFloat((parseFloat(profitEditProduct.profitEvaluation.digitalServicesFee) || 0).toFixed(2)),
        digitalServicesTax: parseFloat((parseFloat(profitEditProduct.profitEvaluation.digitalServicesTax) || 0).toFixed(2)),
        fbaFulfilmentFee: parseFloat((parseFloat(profitEditProduct.profitEvaluation.fbaFulfilmentFee) || 0).toFixed(2)),
        fbaFulfilmentTax: parseFloat((parseFloat(profitEditProduct.profitEvaluation.fbaFulfilmentTax) || 0).toFixed(2)),
        balanceChange: parseFloat((parseFloat(profitEditProduct.profitEvaluation.balanceChange) || 0).toFixed(2)),
        productCost: parseFloat((parseFloat(profitEditProduct.profitEvaluation.productCost) || 0).toFixed(2)),
        netProfit: parseFloat((parseFloat(profitEditProduct.profitEvaluation.netProfit) || 0).toFixed(2)),
        monthlyProfit: parseFloat((parseFloat(profitEditProduct.profitEvaluation.monthlyProfit) || 0).toFixed(2)),
        yearlyProfit: parseFloat((parseFloat(profitEditProduct.profitEvaluation.yearlyProfit) || 0).toFixed(2))
      };

      console.log('💰 PROFIT VALUES BEING SAVED:');
      console.log('- Monthly Profit:', cleanProfitEvaluation.monthlyProfit);
      console.log('- Yearly Profit:', cleanProfitEvaluation.yearlyProfit);
      console.log('- Net Profit:', cleanProfitEvaluation.netProfit);
      console.log('💰 SAVE FIELD DEBUG:', {
        rawSave: profitEditProduct.savings,
        saveType: typeof profitEditProduct.savings,
        parsedSave: parseFloat((parseFloat(profitEditProduct.savings) || 0).toFixed(2))
      });

      const updateData = {
        platformComparison: cleanPlatformComparison,
        platformUnits: parseInt(selectedUnits) || 200,
        profitCalculations: cleanProfitCalculations,
        profitEvaluation: cleanProfitEvaluation,
        savings: parseFloat((parseFloat(profitEditProduct.savings) || 0).toFixed(2)) // Save the single savings field
      };

      console.log('🔄 Sending profit update data:', updateData);
      console.log('🔑 Using token:', token ? 'Token exists' : 'No token');
      console.log('🎯 Product ID:', profitEditProduct._id);
      console.log('🌐 API URL:', `http://localhost:5000/api/products/${profitEditProduct._id}`);

      const response = await fetch(`http://localhost:5000/api/products/${profitEditProduct._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Update successful:', responseData);
        
        // Verify the data was saved correctly
        console.log('🔍 Verifying saved data:');
        console.log('- Platform Comparison:', responseData.platformComparison);
        console.log('- Profit Calculations:', responseData.profitCalculations);
        console.log('- Profit Evaluation:', responseData.profitEvaluation);
        
        // Specifically check monthly and yearly profit values
        if (responseData.profitEvaluation) {
          console.log('💰 SAVED PROFIT VALUES VERIFICATION:');
          console.log('- Monthly Profit saved:', responseData.profitEvaluation.monthlyProfit);
          console.log('- Yearly Profit saved:', responseData.profitEvaluation.yearlyProfit);
          console.log('- Net Profit saved:', responseData.profitEvaluation.netProfit);
        }
        
        // Clear all caches to ensure fresh data
        cacheManager.clearAll();
        
        // Clear browser cache for this product
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              caches.delete(name);
            });
          });
        }
        
        // Clear localStorage cache if any
        const cacheKeys = Object.keys(localStorage).filter(key => key.includes('product') || key.includes('cache'));
        cacheKeys.forEach(key => localStorage.removeItem(key));
        
        // Force reload product data
        await fetchProducts();
        
        console.log('🔄 All caches cleared and product data refreshed');
        
        alert('✅ Profit data updated successfully! The product detail page will now show the updated data.');
        setShowProfitModal(false);
        setProfitEditProduct(null);
      } else {
        const errorData = await response.text();
        console.error('❌ Save failed with status:', response.status);
        console.error('❌ Error response:', errorData);
        
        if (response.status === 401) {
          alert('❌ Authentication failed. Please refresh the page.');
        } else if (response.status === 404) {
          alert('❌ Product not found. It may have been deleted.');
        } else {
          alert(`❌ Failed to update profit data. Status: ${response.status}. Error: ${errorData}`);
        }
        throw new Error(`Failed to update profit data: ${response.status} - ${errorData}`);
      }
    } catch (error) {
      console.error('❌ Error updating profit data:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        alert('❌ Network error. Please check if the server is running.');
      } else {
        alert(`❌ Failed to update profit data: ${error.message}`);
      }
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

  

      <div className="filters-section" style={{padding: '6px 8px', marginBottom: '6px', background: 'white', borderRadius: '6px'}}>
        <div style={{display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center'}}>
          <input
            type="text"
            placeholder="🔍 Search by name, ID, category, brand, ASIN..."
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
          {search && search.length >= 3 && /^[A-Z0-9]{10}$/.test(search.toUpperCase()) && (
            <small style={{
              fontSize: '0.65rem', 
              color: '#ff9800', 
              fontWeight: '500',
              whiteSpace: 'nowrap'
            }}>
              🏷️ ASIN Search
            </small>
          )}
          <CategoryVisibilityToggle compact={true} />
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
            📤 Upload
          </button>
          <button 
            onClick={() => navigate('/admin/excel-manager')} 
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
            📊 Excel Files
          </button>
          <button 
            onClick={async () => {
              if (confirm('Mark ALL active products as Amazon Choice? This will make all products appear on the Amazon Choice page.')) {
                try {
                  const token = localStorage.getItem('adminToken');
                  const response = await fetch('http://localhost:5000/api/products/admin/mark-all-amazons-choice', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  const result = await response.json();
                  alert(`✅ ${result.message}`);
                  fetchProducts(); // Refresh the list
                } catch (error) {
                  alert('❌ Failed to update products');
                }
              }
            }}
            style={{
              padding: '6px 10px',
              fontSize: '0.7rem',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            🏆 Mark All Amazon Choice
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
            onChange={(e) => handleStatusFilter(e.target.value)}
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
            onClick={handleAmazonsChoiceFilter}
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
                <tr style={{background: '#dc2626'}}>
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
                  <th style={{padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white'}}>ASIN</th>
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
                    <td 
                      className="asin" 
                      style={{padding: '4px 8px', cursor: 'pointer', transition: 'background 0.2s'}}
                      data-cell={`${product._id}-asin`}
                      onClick={() => handleCellClick(product._id, 'asin', product.asin)}
                      onMouseEnter={(e) => e.target.style.background = '#f0f0ff'}
                      onMouseLeave={(e) => e.target.style.background = ''}
                      title="Click to edit ASIN"
                    >
                      {editingCell === `${product._id}-asin` ? (
                        <input
                          type="text"
                          value={editValues[`${product._id}-asin`] || ''}
                          onChange={(e) => handleEditChange(product._id, 'asin', e.target.value.toUpperCase())}
                          onBlur={() => handleSaveEdit(product._id, 'asin')}
                          onKeyDown={(e) => handleKeyPress(e, product._id, 'asin')}
                          autoFocus
                          maxLength="10"
                          style={{
                            width: '80px',
                            padding: '3px',
                            fontSize: '0.7rem',
                            border: '2px solid #667eea',
                            borderRadius: '4px',
                            outline: 'none',
                            textTransform: 'uppercase',
                            fontFamily: 'monospace'
                          }}
                        />
                      ) : (
                        <span style={{
                          fontSize: '0.65rem',
                          fontFamily: 'monospace',
                          color: product.asin ? '#374151' : '#9ca3af',
                          fontWeight: product.asin ? '600' : '400'
                        }}>
                          {product.asin || 'No ASIN'}
                          <span style={{marginLeft: '3px', fontSize: '0.55rem', color: '#999'}}>✏️</span>
                        </span>
                      )}
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
                        onClick={() => handleVariationsClick(product)}
                        className="variations-btn"
                        title="Manage Product Variations"
                        style={{padding: '2px 6px', fontSize: '0.65rem', marginRight: '3px', background: '#6f42c1', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}
                      >
                        🎨
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
          alignItems: 'flex-start',
          zIndex: 1000,
          padding: windowWidth <= 768 ? '10px' : '20px',
          overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: windowWidth <= 768 ? '8px' : '12px',
            width: '100%',
            maxWidth: windowWidth <= 768 ? '100%' : '1200px',
            maxHeight: windowWidth <= 768 ? 'none' : '90vh',
            overflow: windowWidth <= 768 ? 'visible' : 'auto',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            marginTop: windowWidth <= 768 ? '10px' : '0',
            marginBottom: windowWidth <= 768 ? '10px' : '0'
          }}>
            <div style={{
              padding: windowWidth <= 768 ? '15px' : '25px',
              borderBottom: '2px solid #f0f0f0',
              background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
              color: 'white',
              borderRadius: windowWidth <= 768 ? '8px 8px 0 0' : '12px 12px 0 0',
              display: 'flex',
              flexDirection: windowWidth <= 768 ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: windowWidth <= 768 ? 'flex-start' : 'center',
              gap: windowWidth <= 768 ? '15px' : '0'
            }}>
              <div style={{flex: 1, minWidth: 0}}>
                <h2 style={{
                  margin: 0, 
                  fontSize: window.innerWidth <= 768 ? '1.2rem' : '1.5rem', 
                  fontWeight: 'bold',
                  lineHeight: '1.2'
                }}>
                  💰 Profit Details Management
                </h2>
                <p style={{
                  margin: '5px 0 0 0', 
                  opacity: 0.9,
                  fontSize: window.innerWidth <= 768 ? '0.85rem' : '1rem',
                  wordBreak: 'break-word'
                }}>
                  {profitEditProduct.name}
                </p>
              </div>
              <div style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: window.innerWidth <= 768 ? '10px' : '15px',
                flexShrink: 0
              }}>
                <div style={{
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: window.innerWidth <= 768 ? 'flex-start' : 'flex-end'
                }}>
                  <label style={{
                    fontSize: window.innerWidth <= 768 ? '0.7rem' : '0.75rem', 
                    marginBottom: '4px', 
                    opacity: 0.9
                  }}>
                    Currency
                  </label>
                  <div style={{
                    padding: window.innerWidth <= 768 ? '4px 8px' : '6px 12px',
                    fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem',
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
                    width: window.innerWidth <= 768 ? '35px' : '40px',
                    height: window.innerWidth <= 768 ? '35px' : '40px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: window.innerWidth <= 768 ? '18px' : '20px',
                    fontWeight: '700',
                    flexShrink: 0
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{padding: window.innerWidth <= 768 ? '15px' : '25px'}}>
              {/* Platform Comparison Section */}
              <div style={{
                marginBottom: window.innerWidth <= 768 ? '20px' : '30px', 
                padding: window.innerWidth <= 768 ? '15px' : '20px', 
                backgroundColor: '#e8f5e9', 
                borderRadius: '8px', 
                border: '2px solid #28a745'
              }}>
                <h3 style={{
                  color: '#28a745', 
                  marginBottom: window.innerWidth <= 768 ? '15px' : '20px', 
                  fontSize: window.innerWidth <= 768 ? '1.1rem' : '1.3rem'
                }}>
                  📊 Platform Comparison
                </h3>
                {profitEditProduct.platformComparison.map((platform, index) => (
                  <div key={index} style={{
                    marginBottom: window.innerWidth <= 768 ? '15px' : '20px', 
                    padding: window.innerWidth <= 768 ? '12px' : '15px', 
                    backgroundColor: 'white', 
                    borderRadius: '8px', 
                    border: '1px solid #ddd'
                  }}>
                    <div style={{
                      display: window.innerWidth <= 768 ? 'flex' : 'grid',
                      flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                      gridTemplateColumns: window.innerWidth <= 768 ? 'none' : '1fr 1fr 1fr 1fr 1fr auto',
                      gap: window.innerWidth <= 768 ? '12px' : '15px',
                      alignItems: window.innerWidth <= 768 ? 'stretch' : 'center'
                    }}>
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
                          min="0"
                          value={safeFormatNumber(platform.rrpPerUnit) || ''}
                          onChange={(e) => {
                            const newPlatforms = [...profitEditProduct.platformComparison];
                            newPlatforms[index].rrpPerUnit = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                            setProfitEditProduct({...profitEditProduct, platformComparison: newPlatforms});
                          }}
                          onFocus={(e) => e.target.select()}
                          style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>Units</label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={platform.units || 200}
                          onChange={(e) => {
                            const newPlatforms = [...profitEditProduct.platformComparison];
                            const newUnits = parseInt(e.target.value) || 200;
                            newPlatforms[index].units = newUnits;
                            const profitPerUnit = profitEditProduct.profitEvaluation?.netProfit || 0;
                            newPlatforms[index].profitFor200Units = profitPerUnit * newUnits;
                            setProfitEditProduct({...profitEditProduct, platformComparison: newPlatforms});
                          }}
                          style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                          placeholder="200"
                        />
                      </div>
                      <div>
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                          Total Profit ({platform.units || 200} units) (£)
                        </label>
                        <input
                          type="text"
                          value={displayNumber(platform.profitFor200Units)}
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
                
                {/* Single Save Field */}
                <div style={{
                  marginTop: window.innerWidth <= 768 ? '15px' : '20px',
                  padding: window.innerWidth <= 768 ? '12px' : '15px',
                  backgroundColor: '#e8f5e9',
                  borderRadius: '8px',
                  border: '2px solid #28a745'
                }}>
                  <div style={{
                    display: window.innerWidth <= 768 ? 'flex' : 'grid',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    gridTemplateColumns: window.innerWidth <= 768 ? 'none' : '1fr 2fr',
                    gap: window.innerWidth <= 768 ? '12px' : '15px',
                    alignItems: window.innerWidth <= 768 ? 'stretch' : 'center'
                  }}>
                    <div>
                      <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#28a745'}}>
                        Save (%)
                        <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px'}}>
                          (Percentage savings - % will be auto-added)
                        </span>
                      </label>
                      <div style={{position: 'relative', display: 'flex', alignItems: 'center'}}>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          value={safeFormatNumber(profitEditProduct.savings) || ''}
                          onChange={(e) => {
                            const newValue = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                            setProfitEditProduct({...profitEditProduct, savings: newValue});
                          }}
                          onFocus={(e) => e.target.select()}
                          style={{
                            width: '100%',
                            padding: '10px 35px 10px 10px',
                            border: '2px solid #28a745',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            backgroundColor: 'white'
                          }}
                          placeholder="20"
                        />
                        <span style={{
                          position: 'absolute',
                          right: '12px',
                          fontSize: '0.9rem',
                          color: '#28a745',
                          fontWeight: 'bold',
                          pointerEvents: 'none'
                        }}>%</span>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#155724',
                      fontStyle: 'italic',
                      padding: '10px',
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      borderRadius: '6px',
                      border: '1px solid rgba(40, 167, 69, 0.3)'
                    }}>
                      💡 Enter the percentage value (e.g., 20 for 20%). This will be displayed as "Save: 20%" on the product detail page to show customers their savings.
                    </div>
                  </div>
                </div>
              </div>

              {/* Profit Calculations Section */}
              <div style={{
                marginBottom: window.innerWidth <= 768 ? '20px' : '30px', 
                padding: window.innerWidth <= 768 ? '15px' : '20px', 
                backgroundColor: '#fff3cd', 
                borderRadius: '8px', 
                border: '2px solid #ffc107'
              }}>
                <h3 style={{
                  color: '#856404', 
                  marginBottom: window.innerWidth <= 768 ? '15px' : '20px', 
                  fontSize: window.innerWidth <= 768 ? '1.1rem' : '1.3rem'
                }}>
                  🧮 Profit Calculations
                </h3>
                <div style={{
                  display: window.innerWidth <= 768 ? 'flex' : 'grid',
                  flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                  gridTemplateColumns: window.innerWidth <= 768 ? 'none' : '1fr 1fr',
                  gap: window.innerWidth <= 768 ? '15px' : '20px'
                }}>
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
              <div style={{
                marginBottom: window.innerWidth <= 768 ? '20px' : '30px', 
                padding: window.innerWidth <= 768 ? '15px' : '20px', 
                backgroundColor: '#f8d7da', 
                borderRadius: '8px', 
                border: '2px solid #dc3545'
              }}>
                <h3 style={{
                  color: '#721c24', 
                  marginBottom: window.innerWidth <= 768 ? '12px' : '15px', 
                  fontSize: window.innerWidth <= 768 ? '1.1rem' : '1.3rem'
                }}>
                  💼 Amazon FBA Revenue Calculator
                </h3>
                <p style={{
                  color: '#721c24', 
                  marginBottom: window.innerWidth <= 768 ? '15px' : '20px', 
                  fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem', 
                  fontStyle: 'italic'
                }}>
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
                    min="0"
                    value={safeFormatNumber(profitEditProduct.profitEvaluation.salesProceeds) || ''}
                    onChange={(e) => {
                      const newValue = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                      const updatedEvaluation = {
                        ...profitEditProduct.profitEvaluation,
                        salesProceeds: newValue
                      };
                      setProfitEditProduct({
                        ...profitEditProduct,
                        profitEvaluation: updatedEvaluation
                      });
                    }}
                    onFocus={(e) => e.target.select()}
                    style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                    placeholder="0.00"
                  />
                </div>

                {/* Amazon Fees Section */}
                <div style={{marginBottom: '25px'}}>
                  <h4 style={{color: '#721c24', marginBottom: '15px', fontSize: '1.1rem', borderBottom: '2px solid #dc3545', paddingBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    💸 Amazon Fees & Taxes
                  </h4>
                  <div style={{
                    display: window.innerWidth <= 768 ? 'flex' : 'grid',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    gridTemplateColumns: window.innerWidth <= 768 ? 'none' : '1fr 1fr',
                    gap: window.innerWidth <= 768 ? '12px' : '15px',
                    marginBottom: window.innerWidth <= 768 ? '12px' : '15px'
                  }}>
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
                        min="0"
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
                        placeholder="0.00"
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
                        min="0"
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
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div style={{
                    display: window.innerWidth <= 768 ? 'flex' : 'grid',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    gridTemplateColumns: window.innerWidth <= 768 ? 'none' : '1fr 1fr',
                    gap: window.innerWidth <= 768 ? '12px' : '15px',
                    marginBottom: window.innerWidth <= 768 ? '12px' : '15px'
                  }}>
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
                        min="0"
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
                        placeholder="0.00"
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
                        min="0"
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
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div style={{
                    display: window.innerWidth <= 768 ? 'flex' : 'grid',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    gridTemplateColumns: window.innerWidth <= 768 ? 'none' : '1fr 1fr',
                    gap: window.innerWidth <= 768 ? '12px' : '15px'
                  }}>
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
                        min="0"
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
                        placeholder="0.00"
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
                        min="0"
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
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Summary Section */}
                <div style={{marginBottom: '25px'}}>
                  <h4 style={{color: '#721c24', marginBottom: '15px', fontSize: '1.1rem', borderBottom: '2px solid #dc3545', paddingBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    📊 Financial Summary
                  </h4>
                  <div style={{
                    display: window.innerWidth <= 768 ? 'flex' : 'grid',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    gridTemplateColumns: window.innerWidth <= 768 ? 'none' : '1fr 1fr',
                    gap: window.innerWidth <= 768 ? '12px' : '15px',
                    marginBottom: window.innerWidth <= 768 ? '12px' : '15px'
                  }}>
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
                        min="0"
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.balanceChange)}
                        onChange={(e) => {
                          const newValue = safeParseInput(e.target.value);
                          const productCost = profitEditProduct.profitEvaluation.productCost || 0;
                          const netProfit = newValue - productCost;
                          
                          const updatedEvaluation = {
                            ...profitEditProduct.profitEvaluation,
                            balanceChange: newValue,
                            netProfit: parseFloat(netProfit.toFixed(2))
                          };
                          
                          const updatedCalculations = {
                            ...profitEditProduct.profitCalculations,
                            profitPerUnit: parseFloat(netProfit.toFixed(2)),
                            profitFor200Units: parseFloat((netProfit * 200).toFixed(2))
                          };
                          
                          // Update platform comparison profits
                          const updatedPlatforms = profitEditProduct.platformComparison.map(platform => ({
                            ...platform,
                            profitFor200Units: parseFloat((netProfit * (platform.units || 200)).toFixed(2))
                          }));
                          
                          setProfitEditProduct({
                            ...profitEditProduct,
                            profitEvaluation: updatedEvaluation,
                            profitCalculations: updatedCalculations,
                            platformComparison: updatedPlatforms
                          });
                        }}
                        style={{width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem'}}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem'}}>
                        Product Cost (£)
                        <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px'}}>
                          (Auto-filled from product price)
                        </span>
                        {productCostUpdated && (
                          <span style={{
                            fontSize: '0.7rem', 
                            fontWeight: 'bold', 
                            color: '#28a745', 
                            marginLeft: '8px',
                            animation: 'pulse 1s infinite'
                          }}>
                            ✅ Updated!
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.productCost)}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: productCostUpdated ? '2px solid #28a745' : '1px solid #17a2b8',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          backgroundColor: productCostUpdated ? '#d4edda' : '#e7f3ff',
                          cursor: 'not-allowed',
                          transition: 'all 0.3s ease'
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
                  <div style={{
                    display: window.innerWidth <= 768 ? 'flex' : 'grid',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    gridTemplateColumns: window.innerWidth <= 768 ? 'none' : '1fr 1fr 1fr',
                    gap: window.innerWidth <= 768 ? '12px' : '15px',
                    padding: window.innerWidth <= 768 ? '12px' : '15px',
                    backgroundColor: '#e6f7ee',
                    borderRadius: '8px',
                    border: '1px solid #28a745'
                  }}>
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
                        min="0"
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
                        placeholder="0.00"
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
                        min="0"
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
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Help Section */}
               
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                justifyContent: window.innerWidth <= 768 ? 'stretch' : 'flex-end',
                gap: window.innerWidth <= 768 ? '10px' : '15px',
                paddingTop: window.innerWidth <= 768 ? '15px' : '20px',
                borderTop: '2px solid #f0f0f0'
              }}>
                <button
                  onClick={() => {
                    const productUrl = `/product/${profitEditProduct._id}`;
                    window.open(productUrl, '_blank');
                  }}
                  style={{
                    padding: window.innerWidth <= 768 ? '10px 20px' : '12px 25px',
                    fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem',
                    background: '#6f42c1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    order: window.innerWidth <= 768 ? 1 : 0
                  }}
                >
                  👁️ View Product
                </button>
                <button
                  onClick={() => setShowProfitModal(false)}
                  style={{
                    padding: window.innerWidth <= 768 ? '10px 20px' : '12px 25px',
                    fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    order: window.innerWidth <= 768 ? 3 : 0
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={updateProfitData}
                  style={{
                    padding: window.innerWidth <= 768 ? '10px 20px' : '12px 25px',
                    fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    order: window.innerWidth <= 768 ? 2 : 0
                  }}
                >
                  💾 Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Variations Management Modal */}
      {showVariationsModal && variationsEditProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #6f42c1',
              paddingBottom: '10px'
            }}>
              <h2 style={{
                margin: 0,
                color: '#6f42c1',
                fontSize: '1.4rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🎨 Product Variations Management
              </h2>
              <button
                onClick={() => setShowVariationsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '5px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9ff', borderRadius: '8px', border: '1px solid #e0e6ff' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#6f42c1', fontSize: '1.1rem' }}>
                Product: {variationsEditProduct.name}
              </h3>
              <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9rem' }}>
                Category: {variationsEditProduct.category} | Price: £{variationsEditProduct.price}
              </p>
              
              <div style={{
                padding: '12px',
                backgroundColor: '#e8f5e9',
                border: '1px solid #c3e6cb',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#155724',
                marginBottom: '10px'
              }}>
                <strong>📋 How to Set Up Variations:</strong>
                <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  <li>Configure current product settings (Type & Custom Name)</li>
                  <li>Search and link related products below</li>
                  <li>Each linked product gets its own Type & Custom Name</li>
                  <li>Use "Save All + Link Products" to create bidirectional connections</li>
                </ol>
              </div>
              
              <div style={{
                padding: '10px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '4px',
                fontSize: '0.8rem',
                color: '#856404'
              }}>
                <strong>💡 Tip:</strong> Each product maintains independent variation settings. When you link products, they'll show as options on each other's detail pages.
              </div>
            </div>

            {/* Simple Configuration Interface */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '1.1rem' }}>
                1st Product (Current): {variationsEditProduct.name}
              </h3>
              
              <div style={{
                border: '2px solid #6f42c1',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '15px',
                backgroundColor: '#f8f9ff'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#6f42c1', display: 'block', marginBottom: '4px' }}>
                      Type:
                    </label>
                    <select
                      value={variationsEditProduct.variations?.[0]?.type || 'style'}
                      onChange={(e) => {
                        const updatedVariations = [...(variationsEditProduct.variations || [])];
                        if (updatedVariations.length === 0) {
                          updatedVariations.push({ type: e.target.value, name: '', options: [] });
                        } else {
                          updatedVariations[0].type = e.target.value;
                        }
                        setVariationsEditProduct({ ...variationsEditProduct, variations: updatedVariations });
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.9rem'
                      }}
                    >
                      <option value="style">Style</option>
                      <option value="color">Color</option>
                      <option value="size">Size</option>
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#6f42c1', display: 'block', marginBottom: '4px' }}>
                      Custom Name:
                    </label>
                    <input
                      type="text"
                      value={variationsEditProduct.variations?.[0]?.name || ''}
                      onChange={(e) => {
                        const updatedVariations = [...(variationsEditProduct.variations || [])];
                        if (updatedVariations.length === 0) {
                          updatedVariations.push({ type: 'style', name: e.target.value, options: [] });
                        } else {
                          updatedVariations[0].name = e.target.value;
                        }
                        setVariationsEditProduct({ ...variationsEditProduct, variations: updatedVariations });
                      }}
                      placeholder="e.g., any, custom, etc."
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                </div>
                
                {variationsEditProduct.variations?.[0]?.name && (
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#28a745', 
                    fontWeight: '500',
                    marginTop: '8px',
                    padding: '4px 8px',
                    backgroundColor: '#d4edda',
                    borderRadius: '4px'
                  }}>
                    Will display: "{variationsEditProduct.variations[0].name}: [auto-detected value]"
                  </div>
                )}
              </div>

              {/* Linked Products Section */}
              <h3 style={{ margin: '15px 0 10px 0', color: '#333', fontSize: '1.1rem' }}>
                Linked Products (2nd, 3rd, etc.)
              </h3>
              
              <div style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: '#f8f9fa'
              }}>
                <input
                  type="text"
                  value={variationSearchQuery}
                  onChange={(e) => setVariationSearchQuery(e.target.value)}
                  placeholder="Search products to link as variations..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    marginBottom: '15px'
                  }}
                />

                <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {filteredAvailableProducts.length > 0 ? (
                    filteredAvailableProducts.slice(0, 8).map((product, index) => {
                      const isLinked = variationsEditProduct.variations?.[0]?.options?.some(option => option.productId === product._id);
                      const linkedOption = variationsEditProduct.variations?.[0]?.options?.find(option => option.productId === product._id);
                      
                      return (
                        <div key={product._id} style={{
                          border: '1px solid #e0e0e0',
                          borderRadius: '6px',
                          padding: '12px',
                          marginBottom: '10px',
                          backgroundColor: 'white'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px'
                          }}>
                            <div>
                              <h5 style={{ margin: 0, fontSize: '0.9rem', color: '#333' }}>
                                {index + 2}nd Product: {product.name}
                              </h5>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#666' }}>
                                Price: £{product.price}
                              </p>
                            </div>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#f8f9fa'
                            }}>
                              <LinkedProductPreview productId={product._id} />
                            </div>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr auto',
                            gap: '10px',
                            alignItems: 'end'
                          }}>
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>
                                Type:
                              </label>
                              <select
                                value={linkedOption?.type || 'style'}
                                onChange={(e) => {
                                  updateLinkedProductConfig(product._id, 'type', e.target.value);
                                  console.log('🎨 Updated type for', product.name, 'to', e.target.value);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  fontSize: '0.8rem'
                                }}
                              >
                                <option value="style">Style</option>
                                <option value="color">Color</option>
                                <option value="size">Size</option>
                              </select>
                            </div>
                            
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>
                                Custom Name:
                              </label>
                              <input
                                type="text"
                                value={linkedOption?.customName || ''}
                                onChange={(e) => {
                                  updateLinkedProductConfig(product._id, 'name', e.target.value);
                                  console.log('🎨 Updated custom name for', product.name, 'to', e.target.value);
                                }}
                                placeholder="e.g., custom, shade, etc."
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  fontSize: '0.8rem'
                                }}
                              />
                            </div>
                            
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>
                                Link Status:
                              </label>
                              <button
                                onClick={() => {
                                  toggleLinkedProduct(product._id);
                                  // Force re-render to update button states
                                  setTimeout(() => {
                                    console.log('🔄 Button state updated');
                                  }, 100);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: isLinked ? '2px solid #28a745' : '2px solid #6c757d',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  backgroundColor: isLinked ? '#28a745' : '#6c757d',
                                  color: 'white',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  boxShadow: isLinked ? '0 2px 8px rgba(40, 167, 69, 0.3)' : '0 2px 8px rgba(108, 117, 125, 0.3)'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isLinked) {
                                    e.target.style.backgroundColor = '#5a6268';
                                    e.target.style.transform = 'translateY(-1px)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isLinked) {
                                    e.target.style.backgroundColor = '#6c757d';
                                    e.target.style.transform = 'translateY(0)';
                                  }
                                }}
                              >
                                {isLinked ? (
                                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                    <span>✓</span>
                                    <span>Linked</span>
                                  </span>
                                ) : (
                                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                    <span>🔗</span>
                                    <span>Link</span>
                                  </span>
                                )}
                              </button>
                            </div>
                            
                            <div>
                              {isLinked && (
                                <button
                                  onClick={() => removeLinkedProduct(product._id)}
                                  style={{
                                    padding: '6px 8px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Preview for linked product */}
                          {isLinked && linkedOption?.customName && (
                            <div style={{ 
                              fontSize: '0.7rem', 
                              color: '#17a2b8', 
                              fontWeight: '500',
                              marginTop: '8px',
                              padding: '4px 8px',
                              backgroundColor: '#d1ecf1',
                              borderRadius: '4px'
                            }}>
                              This product will display: "{linkedOption.customName}: [auto-detected value]"
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                      No products found in this category
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #eee',
              paddingTop: '15px',
              gap: '15px'
            }}>
              <div style={{ display: 'flex', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowVariationsModal(false)}
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Cancel
                </button>
                
                {/* Always show save button, but change based on linked products */}
                {(() => {
                  const linkedCount = variationsEditProduct.variations?.[0]?.options?.filter(opt => opt.productId)?.length || 0;
                  console.log('🔗 Linked products count:', linkedCount);
                  
                  if (linkedCount > 0) {
                    return (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('adminToken');
                              if (!token) {
                                alert('❌ Authentication token not found. Please log in again.');
                                return;
                              }
                              
                              const cleanedVariations = (variationsEditProduct.variations || [])
                                .filter(variation => variation.type && variation.name)
                                .map(variation => ({
                                  type: variation.type,
                                  name: variation.name,
                                  options: []
                                }));

                              const response = await fetch(`http://localhost:5000/api/products/variations/independent/${variationsEditProduct._id}`, {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ variations: cleanedVariations })
                              });

                              if (response.ok) {
                                alert('✅ Current product variations saved (links removed)!');
                                setShowVariationsModal(false);
                                fetchProducts();
                              } else {
                                alert('❌ Failed to save variations.');
                              }
                            } catch (error) {
                              alert('❌ Failed to save variations. Please try again.');
                            }
                          }}
                          style={{
                            background: '#ffc107',
                            color: '#212529',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}
                        >
                          💾 Save Current Only
                        </button>
                        
                        <button
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('adminToken');
                              if (!token) {
                                alert('❌ Authentication token not found. Please log in again.');
                                return;
                              }
                              
                              const cleanedVariations = (variationsEditProduct.variations || [])
                                .filter(variation => variation.type && variation.name)
                                .map(variation => ({
                                  type: variation.type,
                                  name: variation.name,
                                  options: (variation.options || [])
                                    .filter(option => option.productId) // Only include linked products
                                    .map(option => ({
                                      value: option.value.trim(),
                                      productId: option.productId,
                                      type: option.type || variation.type,
                                      customName: option.customName || '',
                                      images: option.images || [],
                                      price: option.price || null,
                                      stock: option.stock || null
                                    }))
                                }));

                              console.log('🎨 Saving variations with linked products:', cleanedVariations);

                              // Use enhanced bidirectional endpoint to update both current and linked products
                              const response = await fetch(`http://localhost:5000/api/products/variations/enhanced/${variationsEditProduct._id}`, {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                  variations: cleanedVariations,
                                  currentProduct: {
                                    id: variationsEditProduct._id,
                                    name: variationsEditProduct.name,
                                    category: variationsEditProduct.category
                                  }
                                })
                              });

                              if (response.ok) {
                                const result = await response.json();
                                alert(`✅ All variations saved! Updated ${result.linkedProducts || 0} linked products with their own variation settings.`);
                                setShowVariationsModal(false);
                                fetchProducts();
                              } else {
                                const errorData = await response.text();
                                alert(`❌ Failed to save variations: ${errorData}`);
                              }
                            } catch (error) {
                              console.error('Error saving variations:', error);
                              alert('❌ Failed to save variations. Please try again.');
                            }
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            boxShadow: '0 2px 8px rgba(40, 167, 69, 0.3)'
                          }}
                        >
                          🔗 Save All + Link {linkedCount} Product{linkedCount > 1 ? 's' : ''}
                        </button>
                        
                        <button
                          onClick={() => {
                            if (confirm(`Remove all ${linkedCount} linked product(s)? This will only keep the current product configuration.`)) {
                              const updatedVariations = [...(variationsEditProduct.variations || [])];
                              if (updatedVariations[0]) {
                                updatedVariations[0].options = [];
                              }
                              setVariationsEditProduct({
                                ...variationsEditProduct,
                                variations: updatedVariations
                              });
                            }
                          }}
                          style={{
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}
                        >
                          🗑️ Remove All Links
                        </button>
                      </>
                    );
                  } else {
                    return (
                      <button
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('adminToken');
                            if (!token) {
                              alert('❌ Authentication token not found. Please log in again.');
                              return;
                            }
                            
                            const cleanedVariations = (variationsEditProduct.variations || [])
                              .filter(variation => variation.type && variation.name)
                              .map(variation => ({
                                type: variation.type,
                                name: variation.name,
                                options: []
                              }));

                            const response = await fetch(`http://localhost:5000/api/products/variations/independent/${variationsEditProduct._id}`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({ variations: cleanedVariations })
                            });

                            if (response.ok) {
                              alert('✅ Variations updated successfully!');
                              setShowVariationsModal(false);
                              fetchProducts();
                            } else {
                              alert('❌ Failed to save variations.');
                            }
                          } catch (error) {
                            alert('❌ Failed to save variations. Please try again.');
                          }
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '600'
                        }}
                      >
                        💾 Save Independent Variations
                      </button>
                    );
                  }
                })()}
              </div>
              
              {/* Show linked products count with better styling */}
              {(() => {
                const linkedCount = variationsEditProduct.variations?.[0]?.options?.filter(opt => opt.productId)?.length || 0;
                if (linkedCount > 0) {
                  return (
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#28a745',
                      fontWeight: '700',
                      padding: '10px 16px',
                      backgroundColor: '#d4edda',
                      borderRadius: '6px',
                      border: '2px solid #28a745',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap'
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>🔗</span>
                      <span>{linkedCount} Product{linkedCount > 1 ? 's' : ''} Linked</span>
                    </div>
                  );
                } else {
                  return (
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#6c757d',
                      fontWeight: '600',
                      padding: '10px 16px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '6px',
                      border: '2px solid #dee2e6',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap'
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
                      <span>No Links Yet</span>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;