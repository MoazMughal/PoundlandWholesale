import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getApiUrl } from '../../utils/api';
import BulkConvertModal from '../../components/BulkConvertModal';
import CategorySelectionModal from '../../components/CategorySelectionModal';
import '../../styles/AdminLayout.css';

const ExcelProducts = () => {
  const navigate = useNavigate();
  const { uploadId } = useParams();
  const [products, setProducts] = useState([]);
  const [upload, setUpload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  
  // Initialize state from URL parameters if available
  const urlParams = new URLSearchParams(window.location.search);
  const [currentPage, setCurrentPage] = useState(parseInt(urlParams.get('page')) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [searchQuery, setSearchQuery] = useState(urlParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState(urlParams.get('category') || 'all');
  const [statusFilter, setStatusFilter] = useState(urlParams.get('status') || 'all');
  const [pageSize, setPageSize] = useState(parseInt(urlParams.get('pageSize')) || 100); // Default to 100 products per page
  const [editingCell, setEditingCell] = useState(null); // { productId, field }
  const [editingValue, setEditingValue] = useState('');
  const [savedCell, setSavedCell] = useState(null); // { productId, field } for showing save feedback
  const [availableCategories, setAvailableCategories] = useState([]);
  const [showBulkConvertModal, setShowBulkConvertModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryModalData, setCategoryModalData] = useState({ categories: [] });

  // Function to update URL with current state
  const updateUrlWithState = (newState = {}) => {
    const params = new URLSearchParams();
    const state = {
      page: currentPage,
      search: searchQuery,
      category: categoryFilter,
      status: statusFilter,
      pageSize: pageSize,
      ...newState
    };
    
    // Only add non-default values to URL
    if (state.page > 1) params.set('page', state.page);
    if (state.search) params.set('search', state.search);
    if (state.category && state.category !== 'all') params.set('category', state.category);
    if (state.status && state.status !== 'all') params.set('status', state.status);
    if (state.pageSize !== 100) params.set('pageSize', state.pageSize);
    
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : '';
    
    // Update URL without triggering navigation
    window.history.replaceState({}, '', `/admin/excel-products/${uploadId}${newUrl}`);
  };

  useEffect(() => {
    // Debounce the search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, searchQuery ? 500 : 0); // 500ms delay for search, immediate for other changes

    return () => clearTimeout(timeoutId);
  }, [uploadId, currentPage, searchQuery, categoryFilter, statusFilter, pageSize]);

  useEffect(() => {
    fetchAvailableCategories();
    
    // Auto-sync status when component loads
    const autoSyncStatus = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        await fetch(getApiUrl(`admin-excel/uploads/${uploadId}/sync-status`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('🔄 Auto-synced product statuses on page load');
        // Refresh products after sync
        setTimeout(() => fetchProducts(), 1000);
      } catch (error) {
        console.log('Auto-sync failed, but continuing normally');
      }
    };
    
    // Run auto-sync after a short delay
    setTimeout(autoSyncStatus, 2000);
  }, [uploadId]);

  const fetchAvailableCategories = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl(`admin-excel/uploads/${uploadId}/categories`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: currentPage,
        limit: pageSize,
        ...(searchQuery && { search: searchQuery }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      console.log('🔍 Fetching products with params:', {
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        category: categoryFilter,
        status: statusFilter
      });

      const response = await fetch(getApiUrl(`admin-excel/uploads/${uploadId}/products?${params}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Received products:', data.products.length, 'Total:', data.pagination?.totalProducts);
        setProducts(data.products);
        setUpload(data.upload);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalProducts(data.pagination?.totalProducts || data.products.length);
      } else {
        console.error('❌ Failed to fetch products:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
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
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p._id)));
    }
  };

  const handleConvertProducts = async () => {
    if (selectedProducts.size === 0) {
      alert('Please select at least one product to convert');
      return;
    }

    // Check if all selected products have SKU
    const selectedProductsData = products.filter(p => selectedProducts.has(p._id));
    const productsWithoutSKU = selectedProductsData.filter(p => !p.sku || p.sku.trim() === '');
    
    if (productsWithoutSKU.length > 0) {
      alert(`❌ Cannot convert products without SKU!\n\nProducts missing SKU:\n${productsWithoutSKU.map(p => `• ${p.name}`).join('\n')}\n\nPlease add SKU to all products before converting.`);
      return;
    }

    // Check for duplicate ASIN/SKU in existing products
    try {
      const token = localStorage.getItem('adminToken');
      const checkPromises = selectedProductsData.map(async (product) => {
        const checks = [];
        
        // Check ASIN if exists
        if (product.asin && product.asin.trim()) {
          const asinResponse = await fetch(`http://localhost:5000/api/products/check-asin/${product.asin}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (asinResponse.ok) {
            const asinData = await asinResponse.json();
            if (asinData.exists) {
              checks.push(`ASIN ${product.asin} already exists`);
            }
          }
        }
        
        // Check SKU
        if (product.sku && product.sku.trim()) {
          const skuResponse = await fetch(`http://localhost:5000/api/products/check-sku/${product.sku}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (skuResponse.ok) {
            const skuData = await skuResponse.json();
            if (skuData.exists) {
              checks.push(`SKU ${product.sku} already exists`);
            }
          }
        }
        
        return { product, issues: checks };
      });
      
      const checkResults = await Promise.all(checkPromises);
      const productsWithIssues = checkResults.filter(r => r.issues.length > 0);
      
      if (productsWithIssues.length > 0) {
        const issuesList = productsWithIssues.map(r => 
          `• ${r.product.name}: ${r.issues.join(', ')}`
        ).join('\n');
        
        alert(`❌ Cannot convert products with duplicate ASIN/SKU!\n\nIssues found:\n${issuesList}\n\nPlease resolve these conflicts before converting.`);
        return;
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
      alert('❌ Failed to check for duplicates. Please try again.');
      return;
    }

    // Show the confirmation modal
    setShowBulkConvertModal(true);
  };

  const handleBulkConvertSuccess = (result) => {
    alert(`✅ Successfully converted ${result.convertedProducts.length} products!\n\n📊 Categories processed: ${result.categoriesProcessed}\n🖼️ Products with images: ${result.productsWithImages}\n⏳ All products sent to approval queue!`);
    setSelectedProducts(new Set());
    fetchProducts();
    
    // Navigate to approval page instead of Amazon's Choice
    if (confirm('📋 Would you like to view the products in the approval queue?')) {
      navigate('/admin/approval', {
        state: { 
          message: `${result.convertedProducts.length} products from Excel import are now pending approval`,
          fromExcelImport: true
        }
      });
    }
  };

  const handleCategorySelect = (selectedCategory) => {
    if (selectedCategory) {
      // Navigate to specific category
      window.open(`/amazons-choice?cat=${encodeURIComponent(selectedCategory)}`, '_blank');
    } else {
      // Navigate to all products
      window.open('/amazons-choice', '_blank');
    }
  };

  const handleSyncStatus = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl(`admin-excel/uploads/${uploadId}/sync-status`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Status sync completed!\n\n📊 Synced: ${result.syncedCount} products\n🔧 Fixed: ${result.fixedCount} products\n📦 Total processed: ${result.totalProcessed}`);
        fetchProducts(); // Refresh the list
      } else {
        alert(`❌ Failed to sync status: ${result.message}`);
      }
    } catch (error) {
      console.error('Error syncing status:', error);
      alert('❌ Failed to sync status');
    }
  };

  const handleMigrateImages = async () => {
    if (!confirm('This will add images to already converted products that are missing images. Continue?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl('admin-excel/migrate/add-images-to-converted'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Image migration completed!\n\n🖼️ Updated: ${result.updatedCount} products\n❌ Errors: ${result.errorCount}\n📦 Total checked: ${result.totalChecked}`);
        fetchProducts(); // Refresh the list
      } else {
        alert(`❌ Failed to migrate images: ${result.message}`);
      }
    } catch (error) {
      console.error('Error migrating images:', error);
      alert('❌ Failed to migrate images');
    }
  };

  const handleSingleListToAmazonsChoice = async (productId, productName) => {
    const product = products.find(p => p._id === productId);
    
    // Check if product has SKU
    if (!product.sku || product.sku.trim() === '') {
      alert(`❌ Cannot convert "${productName}" without SKU!\n\nPlease add a SKU to this product before converting.`);
      return;
    }

    // Check for duplicate ASIN/SKU
    try {
      const token = localStorage.getItem('adminToken');
      const issues = [];
      
      // Check ASIN if exists
      if (product.asin && product.asin.trim()) {
        const asinResponse = await fetch(`http://localhost:5000/api/products/check-asin/${product.asin}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (asinResponse.ok) {
          const asinData = await asinResponse.json();
          if (asinData.exists) {
            issues.push(`ASIN ${product.asin} already exists`);
          }
        }
      }
      
      // Check SKU
      const skuResponse = await fetch(`http://localhost:5000/api/products/check-sku/${product.sku}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (skuResponse.ok) {
        const skuData = await skuResponse.json();
        if (skuData.exists) {
          issues.push(`SKU ${product.sku} already exists`);
        }
      }
      
      if (issues.length > 0) {
        alert(`❌ Cannot convert "${productName}"!\n\nIssues found:\n${issues.map(issue => `• ${issue}`).join('\n')}\n\nPlease resolve these conflicts before converting.`);
        return;
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
      alert('❌ Failed to check for duplicates. Please try again.');
      return;
    }

    if (!confirm(`📋 Convert "${productName}" and send to approval?\n\nThis will:\n✅ Convert the product to main products\n⏳ Send it to the approval queue\n📋 Require admin approval before going live\n\nContinue?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/admin-excel/single-convert-to-approval`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productId })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ ${result.message}\n\n📋 Product ID: ${result.productId}\n⏳ The product is now in the approval queue!`);
        fetchProducts(); // Refresh the list to show updated status
        
        // Ask if user wants to view the approval page
        if (confirm('📋 Would you like to view the product in the approval queue?')) {
          navigate('/admin/approval', {
            state: { 
              message: `"${productName}" has been converted and is pending approval`,
              highlightProductId: result.productId
            }
          });
        }
      } else {
        alert(`❌ Failed to convert product: ${result.message}`);
      }
    } catch (error) {
      console.error('Error converting product:', error);
      alert('❌ Failed to convert product');
    }
  };

  const formatPrice = (price) => `£${parseFloat(price || 0).toFixed(2)}`;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
    updateUrlWithState({ pageSize: newPageSize, page: 1 });
  };

  const startEditing = (productId, field, currentValue) => {
    setEditingCell({ productId, field });
    setEditingValue(currentValue || '');
  };

  const handleBlur = (productId, field, originalValue) => {
    // Only save if the value has actually changed
    if (editingValue !== originalValue && editingValue.toString().trim() !== originalValue.toString().trim()) {
      saveEdit(productId, field, editingValue);
    } else {
      cancelEditing();
    }
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const saveEdit = async (productId, field, value) => {
    try {
      const token = localStorage.getItem('adminToken');
      
      // Validate the value based on field type
      let validatedValue = value;
      if (field === 'price') {
        validatedValue = parseFloat(value) || 0;
        if (validatedValue < 0) {
          alert('❌ Price cannot be negative');
          return;
        }
      } else if (field === 'rating') {
        validatedValue = parseFloat(value) || 0;
        if (validatedValue < 0 || validatedValue > 5) {
          alert('❌ Rating must be between 0 and 5');
          return;
        }
      } else if (field === 'reviews') {
        validatedValue = parseInt(value) || 0;
        if (validatedValue < 0) {
          alert('❌ Reviews cannot be negative');
          return;
        }
      } else if (field === 'asin') {
        validatedValue = value.trim().toUpperCase();
        if (validatedValue && !/^[A-Z0-9]{10}$/.test(validatedValue)) {
          alert('❌ ASIN must be exactly 10 alphanumeric characters');
          return;
        }
      }

      const response = await fetch(getApiUrl(`admin-excel/uploads/${uploadId}/products/${productId}/update-field`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ field, value: validatedValue })
      });

      if (response.ok) {
        // Update the local state
        setProducts(prevProducts => 
          prevProducts.map(product => 
            product._id === productId 
              ? { ...product, [field]: validatedValue }
              : product
          )
        );
        
        // Show save feedback
        setSavedCell({ productId, field });
        setTimeout(() => setSavedCell(null), 2000);
        
        cancelEditing();
      } else {
        const error = await response.json();
        alert(`❌ Failed to update: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating field:', error);
      alert('❌ Failed to update field');
    }
  };

  const handleKeyPress = (e, productId, field) => {
    if (e.key === 'Enter') {
      saveEdit(productId, field, editingValue);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const EditableCell = ({ product, field, value, type = 'text', style = {} }) => {
    const isEditing = editingCell?.productId === product._id && editingCell?.field === field;
    const isSaved = savedCell?.productId === product._id && savedCell?.field === field;
    const inputRef = useRef(null);
    
    // Select text when input becomes active
    useEffect(() => {
      if (isEditing && inputRef.current) {
        // Small delay to ensure input is fully rendered
        const timer = setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.select();
          }
        }, 10);
        return () => clearTimeout(timer);
      }
    }, [isEditing]);
    
    if (isEditing) {
      return (
        <input
          ref={inputRef}
          type={type}
          value={editingValue}
          onChange={(e) => setEditingValue(e.target.value)}
          onKeyDown={(e) => handleKeyPress(e, product._id, field)}
          onBlur={() => handleBlur(product._id, field, value)}
          autoFocus
          style={{
            width: '100%',
            padding: '3px 6px',
            border: '2px solid #3b82f6',
            borderRadius: '3px',
            fontSize: '0.75rem',
            outline: 'none',
            ...style
          }}
        />
      );
    }

    // Format display value based on field type
    let displayValue = value;
    if (field === 'price') {
      displayValue = formatPrice(value);
    } else if (field === 'asin' && !value) {
      displayValue = '-';
    }

    return (
      <div
        onClick={() => startEditing(product._id, field, value)}
        style={{
          cursor: 'pointer',
          padding: '3px 6px',
          borderRadius: '3px',
          minHeight: '16px',
          transition: 'all 0.15s ease',
          border: isSaved ? '1px solid #10b981' : '1px solid transparent',
          backgroundColor: isSaved ? '#f0fdf4' : 'transparent',
          position: 'relative',
          fontSize: '0.75rem',
          ...style
        }}
        onMouseEnter={(e) => {
          if (!isSaved) {
            e.target.style.backgroundColor = '#f8fafc';
            e.target.style.borderColor = '#e2e8f0';
            e.target.style.transform = 'scale(1.02)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSaved) {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.borderColor = 'transparent';
            e.target.style.transform = 'scale(1)';
          }
        }}
        title={`Click to edit ${field} • Enter to save • Escape to cancel`}
      >
        {displayValue}
        {isSaved ? (
          <span style={{
            position: 'absolute',
            top: '-1px',
            right: '-1px',
            fontSize: '0.5rem',
            color: '#10b981',
            pointerEvents: 'none'
          }}>
            ✅
          </span>
        ) : (
          <span style={{
            position: 'absolute',
            top: '-1px',
            right: '-1px',
            fontSize: '0.5rem',
            opacity: 0.4,
            pointerEvents: 'none'
          }}>
            ✏️
          </span>
        )}
      </div>
    );
  };

  const getProductStatus = (product) => {
    // If product is converted, check the approval status
    if (product.isConverted && product.mainProductId) {
      // Check if we have approval status info from backend
      if (product.approvalStatus) {
        if (product.approvalStatus === 'pending') {
          return {
            status: 'approval',
            label: 'In Approval',
            color: '#f59e0b',
            icon: '📋'
          };
        } else if (product.approvalStatus === 'approved' && product.mainProductStatus === 'active') {
          return {
            status: 'listed',
            label: 'Listed',
            color: '#10b981',
            icon: '🌟'
          };
        } else if (product.approvalStatus === 'rejected') {
          return {
            status: 'rejected',
            label: 'Rejected',
            color: '#dc3545',
            icon: '❌'
          };
        }
      }
      
      // Fallback to Excel product status for converted items
      if (product.status === 'pending') {
        return {
          status: 'approval',
          label: 'In Approval',
          color: '#f59e0b',
          icon: '📋'
        };
      } else if (product.status === 'listed') {
        return {
          status: 'listed',
          label: 'Listed',
          color: '#10b981',
          icon: '🌟'
        };
      }
    }
    
    // For non-converted products, check if ASIN/SKU conflicts exist
    // If there are conflicts, show "Blocked" instead of "Pending"
    const hasAsinConflict = product.asin && product.asinConflict;
    const hasSkuConflict = product.sku && product.skuConflict;
    
    if (hasAsinConflict || hasSkuConflict) {
      return {
        status: 'blocked',
        label: 'Blocked',
        color: '#dc3545',
        icon: '🚫'
      };
    }
    
    // Default status for non-converted products
    switch (product.status) {
      case 'listed':
        return {
          status: 'listed',
          label: 'Listed',
          color: '#10b981',
          icon: '🌐'
        };
      case 'pending':
        return {
          status: 'pending',
          label: 'Pending',
          color: '#6b7280',
          icon: '⏳'
        };
      case 'active':
        return {
          status: 'active',
          label: 'Active',
          color: '#3b82f6',
          icon: '✅'
        };
      case 'inactive':
        return {
          status: 'inactive',
          label: 'Inactive',
          color: '#6b7280',
          icon: '❌'
        };
      default:
        return {
          status: 'unknown',
          label: 'Unknown',
          color: '#6b7280',
          icon: '❓'
        };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'listed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'active': return '#3b82f6';
      case 'inactive': return '#6b7280';
      case 'approval': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status, isConverted) => {
    if (isConverted) {
      // For converted products, show more specific status
      switch (status) {
        case 'pending': return '📋'; // In approval
        case 'listed': return '🌟'; // Listed on Amazon's Choice
        default: return '✅';
      }
    }
    
    switch (status) {
      case 'listed': return '🌐';
      case 'pending': return '⏳';
      case 'active': return '✅';
      case 'inactive': return '❌';
      case 'approval': return '📋';
      default: return '❓';
    }
  };

  if (!upload && !loading) {
    return (
      <div className="admin-layout">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '20px' }}>❌</div>
          <h2>Excel Upload Not Found</h2>
          <button onClick={() => navigate('/admin/excel-manager')} style={{ marginTop: '20px', padding: '10px 20px' }}>
            ← Back to Excel Manager
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <div style={{ padding: '12px', maxWidth: '1600px', margin: '0 auto' }}>
        {/* Compact Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          padding: '12px 16px',
          background: import.meta.env.VITE_ENABLE_BULK_CONVERSION === 'true'
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
            : 'linear-gradient(135deg, #d18344ff 0%, #d83722ff 100%)',
          borderRadius: '8px',
          color: 'white'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold' }}>
              📊 {upload?.originalFileName || 'Excel Products'}
              {import.meta.env.VITE_ENABLE_BULK_CONVERSION === 'true' && (
                <span style={{
                  marginLeft: '8px',
                  padding: '2px 6px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: '500'
                }}>
                  🚀 DEV MODE
                </span>
              )}
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
              {totalProducts} products • Uploaded {upload ? formatDate(upload.uploadedAt) : ''}
            </p>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', opacity: 0.8 }}>
              💡 Click cells to edit inline • Enter to save • Escape to cancel
              {import.meta.env.VITE_ENABLE_BULK_CONVERSION === 'true' && ' • 🚀 Bulk conversion available'}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/excel-manager')}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            ← Back
          </button>
        </div>

        {/* Compact Filters and Actions */}
        <div style={{
          background: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '16px',
          border: import.meta.env.VITE_ENABLE_BULK_CONVERSION === 'true' ? '2px solid #10b981' : 'none'
        }}>
          {import.meta.env.VITE_ENABLE_BULK_CONVERSION === 'true' && (
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              marginBottom: '12px',
              fontSize: '0.8rem',
              fontWeight: '600'
            }}>
              🚀 DEVELOPMENT MODE: Enhanced bulk conversion available - Select multiple products and click "Bulk Convert" to automatically create categories and list products with images on Amazon's Choice!
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="🔍 Search products..."
              value={searchQuery}
              onChange={(e) => {
                console.log('Search query changed to:', e.target.value);
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page when search changes
                updateUrlWithState({ search: e.target.value, page: 1 });
              }}
              style={{
                padding: '6px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.8rem',
                minWidth: '280px'
              }}
            />
            
            <select
              value={categoryFilter}
              onChange={(e) => {
                console.log('Category filter changed to:', e.target.value);
                setCategoryFilter(e.target.value);
                setCurrentPage(1); // Reset to first page when filter changes
                updateUrlWithState({ category: e.target.value, page: 1 });
              }}
              style={{
                padding: '6px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.8rem'
              }}
            >
              <option value="all">All Categories</option>
              {availableCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => {
                console.log('Status filter changed to:', e.target.value);
                setStatusFilter(e.target.value);
                setCurrentPage(1); // Reset to first page when filter changes
                updateUrlWithState({ status: e.target.value, page: 1 });
              }}
              style={{
                padding: '6px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.8rem'
              }}
            >
              <option value="all">All Status</option>
              <option value="pending">⏳ Pending</option>
              <option value="blocked">🚫 Blocked</option>
              <option value="approval">📋 In Approval</option>
              <option value="listed">🌟 Listed</option>
              <option value="active">✅ Active</option>
              <option value="inactive">❌ Inactive</option>
            </select>

            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
              style={{
                padding: '6px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '0.8rem'
              }}
            >
              <option value={20}>20/page</option>
              <option value={50}>50/page</option>
              <option value={100}>100/page</option>
              <option value={200}>200/page</option>
            </select>

            {selectedProducts.size > 0 && (
              <button
                onClick={handleConvertProducts}
                style={{
                  padding: '6px 12px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
                title="Convert selected products and send to approval queue (SKU required)"
              >
                📋 Convert to Approval ({selectedProducts.size})
              </button>
            )}

            <button
              onClick={handleSyncStatus}
              style={{
                padding: '6px 12px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
              title="Sync status with main products"
            >
              🔄 Sync Status
            </button>

            <button
              onClick={handleMigrateImages}
              style={{
                padding: '6px 12px',
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
              title="Add images to already converted products"
            >
              🖼️ Fix Images
            </button>
          </div>
        </div>


        {/* Products Table - Main Focus */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          flex: 1
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc'
          }}>
            <h2 style={{ margin: 0, color: '#333', fontSize: '1.1rem', fontWeight: '600' }}>
              📦 Products ({totalProducts} total, showing {products.length}) {loading && <span style={{ fontSize: '0.8rem', color: '#667eea' }}>⏳</span>}
            </h2>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              {selectedProducts.size > 0 && `${selectedProducts.size} selected`}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', color: '#666' }}>⏳ Loading products...</div>
            </div>
          ) : products.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', color: '#666', marginBottom: '10px' }}>📭</div>
              <div style={{ fontSize: '1.1rem', color: '#666' }}>No products found</div>
              <div style={{ fontSize: '0.9rem', color: '#999' }}>Try adjusting your search or filters</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === products.length && products.length > 0}
                        onChange={handleSelectAll}
                        style={{
                          transform: import.meta.env.VITE_ENABLE_BULK_CONVERSION === 'true' ? 'scale(1.2)' : 'scale(1)',
                          accentColor: import.meta.env.VITE_ENABLE_BULK_CONVERSION === 'true' ? '#10b981' : undefined
                        }}
                      />
                      {import.meta.env.VITE_ENABLE_BULK_CONVERSION === 'true' && (
                        <span style={{
                          marginLeft: '4px',
                          fontSize: '0.6rem',
                          color: '#10b981',
                          fontWeight: '600'
                        }}>
                          All
                        </span>
                      )}
                    </th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>Product</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>ASIN</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>SKU</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>Image</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>Category</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>Price</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>Rating</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>Reviews</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>Row</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr 
                      key={product._id} 
                      style={{ 
                        borderBottom: '1px solid #f3f4f6',
                        background: product.isConverted ? '#f0fdf4' : 'white',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!product.isConverted) {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!product.isConverted) {
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      <td style={{ padding: '8px 10px' }}>
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product._id)}
                          onChange={() => handleSelectProduct(product._id)}
                          disabled={product.isConverted}
                          style={{
                            transform: import.meta.env.VITE_ENABLE_BULK_CONVERSION === 'true' ? 'scale(1.2)' : 'scale(1)',
                            accentColor: import.meta.env.VITE_ENABLE_BULK_CONVERSION === 'true' ? '#10b981' : undefined
                          }}
                        />
                        {import.meta.env.VITE_ENABLE_BULK_CONVERSION === 'true' && !product.isConverted && (
                          <span style={{
                            marginLeft: '4px',
                            fontSize: '0.6rem',
                            color: '#10b981',
                            fontWeight: '600'
                          }}>
                            ✓
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '2px', fontSize: '0.8rem' }}>
                          {product.name}
                          {product.isConverted && (
                            <span style={{
                              marginLeft: '6px',
                              padding: '1px 4px',
                              background: '#10b981',
                              color: 'white',
                              borderRadius: '3px',
                              fontSize: '0.6rem'
                            }}>
                              LISTED
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#666' }}>
                          Added: {formatDate(product.createdAt)}
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        <EditableCell 
                          key={`${product._id}-asin`}
                          product={product} 
                          field="asin" 
                          value={product.asin} 
                          style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        <EditableCell 
                          key={`${product._id}-sku`}
                          product={product} 
                          field="sku" 
                          value={product.sku} 
                          style={{ fontFamily: 'monospace', fontSize: '0.75rem', textTransform: 'uppercase' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {product.asin ? (
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            border: '1px solid #e5e7eb', 
                            borderRadius: '4px',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f8fafc'
                          }}>
                            <img
                              src={(() => {
                                const imageUrl = `${getApiUrl('admin-excel/public/images/by-asin')}/${product.asin}`;
                                console.log('🖼️ Loading image for ASIN:', product.asin, 'URL:', imageUrl);
                                return imageUrl;
                              })()}
                              alt={product.asin}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                              onLoad={(e) => {
                                console.log('✅ Image loaded successfully for ASIN:', product.asin);
                                // Image loaded successfully
                                e.target.style.display = 'block';
                                if (e.target.nextSibling) {
                                  e.target.nextSibling.style.display = 'none';
                                }
                              }}
                              onError={(e) => {
                                console.error('❌ Image failed to load for ASIN:', product.asin, 'URL:', e.target.src);
                                // Image failed to load
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) {
                                  e.target.nextSibling.style.display = 'flex';
                                }
                              }}
                            />
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '100%',
                              height: '100%',
                              fontSize: '0.6rem',
                              color: '#9ca3af',
                              flexDirection: 'column'
                            }}>
                              <div>📷</div>
                              <div style={{ fontSize: '0.5rem', marginTop: '2px' }}>No Image</div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            border: '1px dashed #d1d5db', 
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f9fafb',
                            fontSize: '0.6rem',
                            color: '#9ca3af',
                            flexDirection: 'column'
                          }}>
                            <div>❌</div>
                            <div style={{ fontSize: '0.5rem', marginTop: '2px' }}>No ASIN</div>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <EditableCell 
                          key={`${product._id}-category`}
                          product={product} 
                          field="category" 
                          value={product.category}
                          style={{
                            padding: '3px 6px',
                            background: '#f3f4f6',
                            borderRadius: '3px',
                            fontSize: '0.7rem'
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px', fontWeight: '600' }}>
                        <EditableCell 
                          key={`${product._id}-price`}
                          product={product} 
                          field="price" 
                          value={product.price}
                          type="number"
                          style={{ fontWeight: '600', fontSize: '0.8rem' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ fontSize: '0.7rem' }}>⭐</span>
                          <EditableCell 
                            key={`${product._id}-rating`}
                            product={product} 
                            field="rating" 
                            value={product.rating?.toFixed(1) || '4.0'}
                            type="number"
                            style={{ width: '50px', fontSize: '0.75rem' }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <EditableCell 
                          key={`${product._id}-reviews`}
                          product={product} 
                          field="reviews" 
                          value={product.reviews || 0}
                          type="number"
                          style={{ fontSize: '0.75rem' }}
                        />
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {(() => {
                          const statusInfo = getProductStatus(product);
                          return (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              color: 'white',
                              background: statusInfo.color
                            }}>
                              <span>{statusInfo.icon}</span>
                              <span>{statusInfo.label}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: '0.75rem', color: '#666' }}>
                        #{product.rowNumber}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => navigate(`/admin/excel-products/${uploadId}/edit/${product._id}`)}
                            style={{
                              padding: '4px 8px',
                              background: '#667eea',
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                          >
                            ✏️ Edit
                          </button>
                          
                          {/* Single Convert to Approval Button */}
                          {!product.isConverted && (
                            <button
                              onClick={() => handleSingleListToAmazonsChoice(product._id, product.name)}
                              style={{
                                padding: '4px 8px',
                                background: product.sku && product.sku.trim() ? '#ff6600' : '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                fontSize: '0.7rem',
                                cursor: product.sku && product.sku.trim() ? 'pointer' : 'not-allowed',
                                fontWeight: '500',
                                whiteSpace: 'nowrap'
                              }}
                              title={product.sku && product.sku.trim() ? "Convert this product and send to approval" : "SKU required for conversion"}
                              disabled={!product.sku || product.sku.trim() === ''}
                            >
                              📋 Convert
                            </button>
                          )}
                          
                          {product.isConverted && product.mainProductId && (
                            <button
                              onClick={() => {
                                // Preserve current page state in URL
                                const currentState = {
                                  page: currentPage,
                                  search: searchQuery,
                                  category: categoryFilter,
                                  status: statusFilter,
                                  pageSize: pageSize
                                };
                                const stateParams = new URLSearchParams(currentState).toString();
                                navigate(`/product/${product.mainProductId}?returnTo=/admin/excel-products/${uploadId}&${stateParams}`);
                              }}
                              style={{
                                padding: '4px 8px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                fontWeight: '500'
                              }}
                            >
                              👁️ View
                            </button>
                          )}
                          
                          {product.isConverted && (
                            <button
                              onClick={() => window.open('/amazons-choice', '_blank')}
                              style={{
                                padding: '4px 8px',
                                background: '#8b5cf6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                fontWeight: '500',
                                whiteSpace: 'nowrap'
                              }}
                              title="View on Amazon's Choice page"
                            >
                              🌟 Amazon's Choice
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Enhanced Pagination with Page Numbers */}
          {!loading && products.length > 0 && totalPages > 1 && (
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#666', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span>Page {currentPage} of {totalPages} ({totalProducts} total)</span>
                
                {/* Quick Jump Input */}
                {totalPages > 10 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '0.7rem' }}>Go to:</span>
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      placeholder={currentPage}
                      style={{
                        width: '50px',
                        padding: '3px 5px',
                        border: '1px solid #d1d5db',
                        borderRadius: '3px',
                        fontSize: '0.7rem',
                        textAlign: 'center'
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const page = parseInt(e.target.value);
                          if (page >= 1 && page <= totalPages) {
                            setCurrentPage(page);
                            updateUrlWithState({ page: page });
                            e.target.value = '';
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const page = parseInt(e.target.value);
                        if (page >= 1 && page <= totalPages) {
                          setCurrentPage(page);
                          updateUrlWithState({ page: page });
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* First and Previous buttons */}
                <button
                  onClick={() => {
                    setCurrentPage(1);
                    updateUrlWithState({ page: 1 });
                  }}
                  disabled={currentPage === 1}
                  style={{
                    padding: '5px 8px',
                    background: currentPage === 1 ? '#f3f4f6' : '#667eea',
                    color: currentPage === 1 ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '0.7rem',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  First
                </button>
                <button
                  onClick={() => {
                    const newPage = Math.max(1, currentPage - 1);
                    setCurrentPage(newPage);
                    updateUrlWithState({ page: newPage });
                  }}
                  disabled={currentPage === 1}
                  style={{
                    padding: '5px 8px',
                    background: currentPage === 1 ? '#f3f4f6' : '#667eea',
                    color: currentPage === 1 ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '0.7rem',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  ←
                </button>

                {/* Page Numbers */}
                {(() => {
                  const pageNumbers = [];
                  const maxVisiblePages = 7; // Show up to 7 page numbers
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                  
                  // Adjust start page if we're near the end
                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }

                  // Add first page and ellipsis if needed
                  if (startPage > 1) {
                    pageNumbers.push(
                      <button
                        key={1}
                        onClick={() => {
                          setCurrentPage(1);
                          updateUrlWithState({ page: 1 });
                        }}
                        style={{
                          padding: '5px 8px',
                          background: 1 === currentPage ? '#667eea' : 'white',
                          color: 1 === currentPage ? 'white' : '#667eea',
                          border: '1px solid #667eea',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: 1 === currentPage ? 'bold' : '500',
                          minWidth: '28px'
                        }}
                      >
                        1
                      </button>
                    );
                    
                    if (startPage > 2) {
                      pageNumbers.push(
                        <span key="ellipsis1" style={{ 
                          padding: '5px 4px', 
                          fontSize: '0.7rem', 
                          color: '#9ca3af' 
                        }}>
                          ...
                        </span>
                      );
                    }
                  }

                  // Add visible page numbers
                  for (let i = startPage; i <= endPage; i++) {
                    pageNumbers.push(
                      <button
                        key={i}
                        onClick={() => {
                          setCurrentPage(i);
                          updateUrlWithState({ page: i });
                        }}
                        style={{
                          padding: '5px 8px',
                          background: i === currentPage ? '#667eea' : 'white',
                          color: i === currentPage ? 'white' : '#667eea',
                          border: '1px solid #667eea',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: i === currentPage ? 'bold' : '500',
                          minWidth: '28px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (i !== currentPage) {
                            e.target.style.background = '#f0f4ff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (i !== currentPage) {
                            e.target.style.background = 'white';
                          }
                        }}
                      >
                        {i}
                      </button>
                    );
                  }

                  // Add ellipsis and last page if needed
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pageNumbers.push(
                        <span key="ellipsis2" style={{ 
                          padding: '5px 4px', 
                          fontSize: '0.7rem', 
                          color: '#9ca3af' 
                        }}>
                          ...
                        </span>
                      );
                    }
                    
                    pageNumbers.push(
                      <button
                        key={totalPages}
                        onClick={() => {
                          setCurrentPage(totalPages);
                          updateUrlWithState({ page: totalPages });
                        }}
                        style={{
                          padding: '5px 8px',
                          background: totalPages === currentPage ? '#667eea' : 'white',
                          color: totalPages === currentPage ? 'white' : '#667eea',
                          border: '1px solid #667eea',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: totalPages === currentPage ? 'bold' : '500',
                          minWidth: '28px'
                        }}
                      >
                        {totalPages}
                      </button>
                    );
                  }

                  return pageNumbers;
                })()}

                {/* Next and Last buttons */}
                <button
                  onClick={() => {
                    const newPage = Math.min(totalPages, currentPage + 1);
                    setCurrentPage(newPage);
                    updateUrlWithState({ page: newPage });
                  }}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '5px 8px',
                    background: currentPage === totalPages ? '#f3f4f6' : '#667eea',
                    color: currentPage === totalPages ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '0.7rem',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  →
                </button>
                <button
                  onClick={() => {
                    setCurrentPage(totalPages);
                    updateUrlWithState({ page: totalPages });
                  }}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '5px 8px',
                    background: currentPage === totalPages ? '#f3f4f6' : '#667eea',
                    color: currentPage === totalPages ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '0.7rem',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Convert Modal */}
      <BulkConvertModal
        isOpen={showBulkConvertModal}
        onClose={() => setShowBulkConvertModal(false)}
        selectedProducts={selectedProducts}
        products={products}
        uploadId={uploadId}
        onSuccess={handleBulkConvertSuccess}
      />

      {/* Category Selection Modal */}
      <CategorySelectionModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={categoryModalData.categories}
        onCategorySelect={handleCategorySelect}
      />
    </div>
  );
};

export default ExcelProducts;