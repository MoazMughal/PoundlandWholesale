import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getApiUrl } from '../../utils/api';
import { getValidAdminToken, cleanupAuthTokens } from '../../utils/authFix';
import BulkConvertModal from '../../components/BulkConvertModal';
import CategorySelectionModal from '../../components/CategorySelectionModal';
import EnhancedImage from '../../components/EnhancedImage';
import '../../styles/AdminLayout.css';
import '../../styles/admin-table-fix.css';
import '../../styles/admin-products-mobile.css';

const ExcelProducts = () => {
  const navigate = useNavigate();
  const { uploadId } = useParams();
  const [products, setProducts] = useState([]);
  const [upload, setUpload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  
  // Helper function for authenticated API calls
  const getAuthenticatedToken = () => {
    cleanupAuthTokens();
    const token = getValidAdminToken();
    if (!token) {
      alert('❌ Authentication token is invalid. Please log in again.');
      navigate('/admin/login');
      return null;
    }
    return token;
  };
  
  // Initialize state from URL parameters if available
  const urlParams = new URLSearchParams(window.location.search);
  const [currentPage, setCurrentPage] = useState(parseInt(urlParams.get('page')) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [searchQuery, setSearchQuery] = useState(urlParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState(urlParams.get('category') || 'all');
  const [statusFilter, setStatusFilter] = useState(urlParams.get('status') || 'all');
  const [pageSize, setPageSize] = useState(parseInt(urlParams.get('pageSize')) || 100);
  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [savedCell, setSavedCell] = useState(null);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [showBulkConvertModal, setShowBulkConvertModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryModalData, setCategoryModalData] = useState({ categories: [] });
  
  // Direct image upload state
  const [showDirectImageUpload, setShowDirectImageUpload] = useState(false);
  const [selectedDirectImages, setSelectedDirectImages] = useState([]);
  const [directImageUploading, setDirectImageUploading] = useState(false);

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
    
    if (state.page > 1) params.set('page', state.page);
    if (state.search) params.set('search', state.search);
    if (state.category && state.category !== 'all') params.set('category', state.category);
    if (state.status && state.status !== 'all') params.set('status', state.status);
    if (state.pageSize !== 100) params.set('pageSize', state.pageSize);
    
    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : '';
    
    window.history.replaceState({}, '', `/admin/excel-products/${uploadId}${newUrl}`);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log('🔄 useEffect triggered fetchProducts with filters:', {
        uploadId,
        currentPage,
        searchQuery,
        categoryFilter,
        statusFilter,
        pageSize
      });
      fetchProducts();
    }, searchQuery ? 500 : 0);

    return () => clearTimeout(timeoutId);
  }, [uploadId, currentPage, searchQuery, categoryFilter, statusFilter, pageSize]);

  useEffect(() => {
    fetchAvailableCategories();
    
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
      } catch (error) {
        console.log('Auto-sync failed, but continuing normally');
      }
    };
    
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
        status: statusFilter,
        actualParams: Object.fromEntries(params.entries())
      });

      const response = await fetch(getApiUrl(`admin-excel/uploads/${uploadId}/products?${params}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Received products:', data.products.length, 'Total:', data.pagination?.totalProducts);
        console.log('📊 Applied filters in response:', {
          requestedCategory: categoryFilter,
          requestedStatus: statusFilter,
          requestedSearch: searchQuery
        });
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

    const selectedProductsData = products.filter(p => selectedProducts.has(p._id));
    const productsWithoutSKU = selectedProductsData.filter(p => !p.sku || p.sku.trim() === '');
    
    if (productsWithoutSKU.length > 0) {
      alert(`❌ Cannot convert products without SKU!\n\nProducts missing SKU:\n${productsWithoutSKU.map(p => `• ${p.name}`).join('\n')}\n\nPlease add SKU to all products before converting.`);
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const checkPromises = selectedProductsData.map(async (product) => {
        const checks = [];
        
        if (product.asin && product.asin.trim()) {
          const asinResponse = await fetch(getApiUrl(`products/check-asin/${product.asin}`), {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (asinResponse.ok) {
            const asinData = await asinResponse.json();
            if (asinData.exists) {
              checks.push(`ASIN ${product.asin} already exists`);
            }
          }
        }
        
        if (product.sku && product.sku.trim()) {
          const skuResponse = await fetch(getApiUrl(`products/check-sku/${product.sku}`), {
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

    setShowBulkConvertModal(true);
  };

  const handleBulkConvertSuccess = (result) => {
    alert(`✅ Successfully converted ${result.convertedProducts.length} products!\n\n📊 Categories processed: ${result.categoriesProcessed}\n🖼️ Products with images: ${result.productsWithImages}\n⏳ All products sent to approval queue!`);
    setSelectedProducts(new Set());
    fetchProducts();
    
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
      window.open(`/amazons-choice?cat=${encodeURIComponent(selectedCategory)}`, '_blank');
    } else {
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
        fetchProducts();
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
        fetchProducts();
      } else {
        alert(`❌ Failed to migrate images: ${result.message}`);
      }
    } catch (error) {
      console.error('Error migrating images:', error);
      alert('❌ Failed to migrate images');
    }
  };

  const handleDirectImageSelect = (event) => {
    const files = Array.from(event.target.files);
    console.log('📁 Selected files:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    const validFiles = [];
    const errors = [];
    
    files.forEach(file => {
      console.log(`🔍 Checking file: ${file.name}, type: ${file.type}, size: ${file.size}`);
      
      const fileName = file.name.toLowerCase();
      const isImageByExtension = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || 
                                fileName.endsWith('.png') || fileName.endsWith('.webp') || 
                                fileName.endsWith('.gif');
      const isImageByMimeType = file.type.startsWith('image/');
      
      if (!isImageByMimeType && !isImageByExtension) {
        errors.push(`${file.name}: Not an image file (type: ${file.type})`);
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: File too large (${(file.size / 1024 / 1024).toFixed(1)}MB, max 10MB)`);
        return;
      }
      
      console.log(`✅ File ${file.name} passed validation`);
      validFiles.push(file);
    });
    
    console.log(`📊 Validation results: ${validFiles.length} valid, ${errors.length} errors`);
    
    if (errors.length > 0) {
      alert(`❌ Some files were rejected:\n${errors.join('\n')}\n\nOnly valid files will be selected.`);
    }
    
    setSelectedDirectImages(validFiles);
    console.log('💾 Set selectedDirectImages to:', validFiles.length, 'files');
  };

  const handleDirectImageUpload = async () => {
    if (selectedDirectImages.length === 0) {
      alert('Please select images to upload');
      return;
    }

    const invalidFiles = selectedDirectImages.filter(file => {
      const fileName = file.name;
      const fileExt = fileName.split('.').pop().toLowerCase();
      const baseName = fileName.replace(`.${fileExt}`, '');
      
      const numberedMatch = baseName.match(/^([A-Z0-9]{10})\s+(\d+)$/i);
      const asin = numberedMatch ? numberedMatch[1].toUpperCase() : baseName.toUpperCase();
      
      return !/^[A-Z0-9]{10}$/.test(asin);
    });

    if (invalidFiles.length > 0) {
      alert(`❌ Invalid ASIN format in files:\n${invalidFiles.map(f => f.name).join('\n')}\n\nPlease ensure all files are named with valid ASINs (10 alphanumeric characters).`);
      return;
    }

    if (!confirm(`📤 Upload ${selectedDirectImages.length} images to Cloudinary?\n\nThis will:\n✅ Upload images to Cloudinary\n🔄 Update matching products automatically\n📋 Show detailed results\n\nContinue?`)) {
      return;
    }

    setDirectImageUploading(true);

    try {
      const token = getAuthenticatedToken();
      if (!token) return;

      const formData = new FormData();
      selectedDirectImages.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch(getApiUrl('admin-excel/upload-direct-images'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        let message = `✅ Direct image upload completed!\n\n`;
        message += `📊 Summary:\n`;
        message += `• Total images: ${result.summary.totalImages}\n`;
        message += `• Valid images: ${result.summary.validImages}\n`;
        message += `• Matched ASINs: ${result.summary.matchedAsins}\n`;
        message += `• Uploaded to Cloudinary: ${result.summary.uploadedToCloudinary}\n`;
        
        if (result.summary.replacedImages > 0) {
          message += `• Replaced existing: ${result.summary.replacedImages}\n`;
        }
        
        if (result.summary.skippedInUse > 0) {
          message += `• Skipped (in use): ${result.summary.skippedInUse}\n`;
        }
        
        if (result.summary.errors > 0) {
          message += `• Errors: ${result.summary.errors}\n`;
        }

        message += `\n☁️ Your images are now in Cloudinary! Go to Excel Manager → "☁️ Cloudinary Images" to view them.`;

        if (result.errorDetails && result.errorDetails.length > 0) {
          message += `\n\n❌ Errors:\n`;
          result.errorDetails.forEach(error => {
            message += `• ${error.fileName}: ${error.error}\n`;
          });
        }

        alert(message);
        
        setSelectedDirectImages([]);
        setShowDirectImageUpload(false);
        fetchProducts();
      } else {
        alert(`❌ Failed to upload images: ${result.message}`);
      }
    } catch (error) {
      console.error('Error uploading direct images:', error);
      alert('❌ Failed to upload images');
    } finally {
      setDirectImageUploading(false);
    }
  };

  const handleSingleListToAmazonsChoice = async (productId, productName) => {
    const product = products.find(p => p._id === productId);
    
    if (!product.sku || product.sku.trim() === '') {
      alert(`❌ Cannot convert "${productName}" without SKU!\n\nPlease add a SKU to this product before converting.`);
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const issues = [];
      
      if (product.asin && product.asin.trim()) {
        const asinResponse = await fetch(getApiUrl(`products/check-asin/${product.asin}`), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (asinResponse.ok) {
          const asinData = await asinResponse.json();
          if (asinData.exists) {
            issues.push(`ASIN ${product.asin} already exists`);
          }
        }
      }
      
      const skuResponse = await fetch(getApiUrl(`products/check-sku/${product.sku}`), {
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
      console.log('🔄 Converting product to approval:', { productId, productName });
      
      const response = await fetch(getApiUrl('admin-excel/single-convert-to-approval'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productId })
      });

      console.log('📡 Response status:', response.status);
      const result = await response.json();
      console.log('📦 Response data:', result);
      
      if (result.success) {
        alert(`✅ ${result.message}\n\n📋 Product ID: ${result.productId}\n⏳ The product is now in the approval queue!`);
        fetchProducts();
        
        if (confirm('📋 Would you like to view the product in the approval queue?')) {
          navigate('/admin/approval', {
            state: { 
              message: `"${productName}" has been converted and is pending approval`,
              highlightProductId: result.productId
            }
          });
        }
      } else {
        console.error('❌ Conversion failed:', result);
        
        // Check if ASIN/SKU already exists
        if (result.shouldNavigateToApproval && result.existingProductId) {
          const goToApproval = confirm(`⚠️ ${result.message}\n\nThis product already exists in the system.\n\nWould you like to view it in the approval page?`);
          if (goToApproval) {
            navigate('/admin/approval', {
              state: { 
                message: `Product with ${result.message.includes('ASIN') ? 'ASIN' : 'SKU'} already exists`,
                highlightProductId: result.existingProductId
              }
            });
          }
        } else {
          alert(`❌ Failed to convert product: ${result.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('❌ Error converting product:', error);
      alert(`❌ Failed to convert product: ${error.message}`);
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
    setCurrentPage(1);
    updateUrlWithState({ pageSize: newPageSize, page: 1 });
  };

  const startEditing = (productId, field, currentValue) => {
    setEditingCell({ productId, field });
    setEditingValue(currentValue || '');
  };

  const handleBlur = (productId, field, originalValue) => {
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
        setProducts(prevProducts => 
          prevProducts.map(product => 
            product._id === productId 
              ? { ...product, [field]: validatedValue }
              : product
          )
        );
        
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
    
    useEffect(() => {
      if (isEditing && inputRef.current) {
        const timer = setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            const length = inputRef.current.value.length;
            inputRef.current.setSelectionRange(length, length);
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
          onDoubleClick={(e) => {
            e.target.select();
          }}
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
        title={`Click to edit ${field} • Double-click to select all • Enter to save • Escape to cancel`}
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
    if (product.isConverted && product.mainProductId) {
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
    <>
      <style>{`
        /* ULTRA CRITICAL: Force desktop table visibility - HIGHEST PRIORITY */
        @media (min-width: 769px) {
          .admin-layout .excel-products-container .excel-products-table {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          .admin-layout .excel-products-container .excel-table-scroll-wrapper {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          .admin-layout .excel-products-container .mobile-excel-product-cards {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          
          /* Additional specificity for table elements */
          .excel-products-table .excel-table-scroll-wrapper {
            display: block !important;
          }
          
          .excel-products-table .excel-table-scroll-wrapper table {
            display: table !important;
          }
        }
        
        /* CRITICAL: Desktop-first - Force table to ALWAYS show on desktop */
        @media (min-width: 769px) {
          .excel-products-table {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          .excel-table-scroll-wrapper {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          .mobile-excel-product-cards {
            display: none !important;
          }
        }
        
        /* CRITICAL: Force table display properties */
        .excel-products-table table,
        .excel-table-scroll-wrapper table {
          display: table !important;
          width: 100% !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
        }
        
        .excel-products-table thead,
        .excel-table-scroll-wrapper thead {
          display: table-header-group !important;
        }
        
        .excel-products-table tbody,
        .excel-table-scroll-wrapper tbody {
          display: table-row-group !important;
        }
        
        .excel-products-table tbody tr,
        .excel-table-scroll-wrapper tbody tr {
          display: table-row !important;
          height: auto !important;
          min-height: 40px !important;
        }
        
        .excel-products-table td,
        .excel-table-scroll-wrapper td {
          display: table-cell !important;
          padding: 6px 8px !important;
          vertical-align: middle !important;
        }
        
        .excel-products-table th,
        .excel-table-scroll-wrapper th {
          display: table-cell !important;
          padding: 8px 10px !important;
          vertical-align: middle !important;
        }
        
        /* EXCEL PRODUCTS PAGE - FIXED SCROLLBAR ISSUE */
        
        /* Reset and base styles - Let browser body handle scrolling */
        .admin-layout {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          overflow: visible !important;
        }
        
        .excel-products-container {
          width: 100%;
          max-width: 1800px;
          margin: 0 auto;
          padding: 0;
          overflow: visible !important;
        }
        
        /* Modern Card-Style Table Container - NO SCROLL WRAPPER */
        .excel-products-table {
          width: 100%;
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          overflow: visible !important;
        }
        
        /* NO Scroll Wrapper - Let page scroll naturally */
        .excel-table-scroll-wrapper {
          overflow: visible !important;
          width: 100%;
        }
        
        /* Table Structure - NARROWER and SMALLER fonts */
        .excel-products-table table {
          width: 100%;
          min-width: 1000px;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 0.75rem;
        }
        
        /* Column widths - VERY COMPACT to fit in 1000px */
        .excel-products-table th:nth-child(1),
        .excel-products-table td:nth-child(1) { width: 28px; min-width: 28px; } /* Checkbox */
        .excel-products-table th:nth-child(2),
        .excel-products-table td:nth-child(2) { width: 220px; min-width: 220px; } /* Product Name */
        .excel-products-table th:nth-child(3),
        .excel-products-table td:nth-child(3) { width: 85px; min-width: 85px; } /* ASIN */
        .excel-products-table th:nth-child(4),
        .excel-products-table td:nth-child(4) { width: 85px; min-width: 85px; } /* SKU */
        .excel-products-table th:nth-child(5),
        .excel-products-table td:nth-child(5) { width: 45px; min-width: 45px; } /* Image */
        .excel-products-table th:nth-child(6),
        .excel-products-table td:nth-child(6) { width: 95px; min-width: 95px; } /* Category */
        .excel-products-table th:nth-child(7),
        .excel-products-table td:nth-child(7) { width: 60px; min-width: 60px; } /* Price */
        .excel-products-table th:nth-child(8),
        .excel-products-table td:nth-child(8) { width: 55px; min-width: 55px; } /* Rating */
        .excel-products-table th:nth-child(9),
        .excel-products-table td:nth-child(9) { width: 55px; min-width: 55px; } /* Reviews */
        .excel-products-table th:nth-child(10),
        .excel-products-table td:nth-child(10) { width: 95px; min-width: 95px; } /* Status */
        .excel-products-table th:nth-child(11),
        .excel-products-table td:nth-child(11) { width: 38px; min-width: 38px; } /* Row # */
        .excel-products-table th:nth-child(12),
        .excel-products-table td:nth-child(12) { width: 154px; min-width: 154px; } /* Actions */
        
        /* Sticky Header */
        .excel-products-table thead {
          position: sticky;
          top: 0;
          z-index: 20;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .excel-products-table thead th {
          background: transparent;
          padding: 10px 8px;
          text-align: left;
          font-weight: 700;
          font-size: 0.65rem;
          color: white;
          border-bottom: none;
          white-space: nowrap;
          vertical-align: middle;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          line-height: normal;
        }
        
        /* Table Body */
        .excel-products-table tbody tr {
          background: white;
          border-bottom: 1px solid #f0f0f0;
          transition: background 0.2s ease;
        }
        
        .excel-products-table tbody tr.converted-row {
          background: linear-gradient(90deg, #f0fdf4 0%, #dcfce7 100%);
          border-left: 4px solid #10b981;
        }
        
        .excel-products-table tbody tr:hover {
          background: #f8f9ff;
        }
        
        .excel-products-table tbody tr.converted-row:hover {
          background: linear-gradient(90deg, #dcfce7 0%, #bbf7d0 100%);
        }
        
        /* Table cells */
        .excel-products-table tbody td {
          padding: 8px 8px;
          vertical-align: middle;
          font-size: 0.7rem;
          color: #374151;
          border-bottom: 1px solid #f0f0f0;
          line-height: normal;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        /* Actions column - allow more height for wrapped buttons */
        .excel-products-table tbody td:last-child {
          vertical-align: top;
          padding: 10px 12px;
        }
        
        /* Multi-line content - Allow product names to wrap */
        .excel-products-table tbody td:nth-child(2) {
          white-space: normal !important;
          word-wrap: break-word;
          overflow-wrap: break-word;
          line-height: 1.4;
          max-height: none;
          padding: 8px 12px !important;
        }
        
        .excel-products-table tbody td:nth-child(2) > div {
          white-space: normal !important;
          line-height: 1.4;
          max-height: none;
          overflow: visible;
          text-overflow: clip;
          display: block;
          -webkit-line-clamp: unset;
          -webkit-box-orient: unset;
        }
        
        /* Actions column - allow wrapping for buttons */
        .excel-products-table tbody td:nth-child(12) > div {
          white-space: normal;
          line-height: 1.4;
          max-height: none;
          overflow: visible;
          text-overflow: clip;
          display: flex;
          flex-wrap: wrap;
        }
        
        /* Image container */
        .modern-image-container {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          overflow: hidden;
          border: 2px solid #e5e7eb;
          background: #f8f9fa;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .modern-image-container:hover {
          transform: scale(1.1);
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }
        
        /* Action buttons container */
        .excel-products-table tbody td:last-child > div {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          align-items: center;
          min-height: 32px;
          padding: 2px 0;
        }
        
        .excel-products-table tbody td:last-child button {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.65rem;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          line-height: 1.2;
        }
        
        /* Status badge */
        .modern-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          border-radius: 14px;
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: none;
          letter-spacing: 0.3px;
          color: white;
          white-space: nowrap;
          min-width: fit-content;
        }
        
        /* Modern Header Card - Combined and Responsive */
        .modern-header-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }
        
        /* Responsive adjustments for header card */
        @media (max-width: 768px) {
          .modern-header-card {
            padding: 16px;
            border-radius: 12px;
          }
          
          .modern-header-card h1 {
            font-size: 1.2rem !important;
          }
          
          .modern-header-card p {
            font-size: 0.75rem !important;
          }
          
          .modern-input,
          .modern-select {
            font-size: 0.85rem !important;
            padding: 8px 12px !important;
          }
          
          .modern-btn {
            font-size: 0.8rem !important;
            padding: 8px 14px !important;
          }
        }
        
        @media (max-width: 480px) {
          .modern-header-card {
            padding: 12px;
          }
          
          .modern-header-card h1 {
            font-size: 1rem !important;
          }
        }
        
        /* Modern Input Styling */
        .modern-input,
        .modern-select {
          padding: 10px 14px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 0.9rem;
          transition: all 0.2s ease;
          background: white;
        }
        
        .modern-input:focus,
        .modern-select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        /* Modern Button Styling */
        .modern-btn {
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.2s ease;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .modern-btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .modern-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
        }
        
        .modern-btn-success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }
        
        .modern-btn-success:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
        }
        
        .modern-btn-secondary {
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
          color: white;
        }
        
        /* Modern Pagination - FIXED: Now part of the table container, not inside scroll */
        .modern-pagination {
          background: white;
          border-radius: 0 0 16px 16px;
          padding: 20px;
          border-top: 2px solid #f0f0f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .modern-pagination-btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.85rem;
          transition: all 0.2s ease;
          border: 2px solid #e5e7eb;
          background: white;
          color: #374151;
          cursor: pointer;
          min-width: 40px;
        }
        
        .modern-pagination-btn:hover:not(:disabled) {
          border-color: #667eea;
          color: #667eea;
          transform: translateY(-2px);
        }
        
        .modern-pagination-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: transparent;
        }
        
        .modern-pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        
        /* Mobile styles */
        @media (max-width: 768px) {
          .admin-layout {
            padding: 8px;
            overflow-x: hidden !important;
          }
          
          .excel-products-container {
            padding: 0;
            overflow-x: hidden !important;
          }
          
          /* Table container - allow horizontal scroll on mobile */
          .excel-products-table {
            display: block !important;
            overflow-x: auto !important;
            overflow-y: visible !important;
            -webkit-overflow-scrolling: touch;
            width: 100%;
            max-width: 100vw;
          }
          
          .excel-table-scroll-wrapper {
            display: block !important;
            overflow: visible !important;
            width: 100%;
          }
          
          /* Keep table visible but scrollable on mobile */
          .excel-products-table table {
            min-width: 900px !important;
            width: 900px !important;
            display: table !important;
          }
          
          .excel-table-scroll-wrapper table {
            min-width: 900px !important;
            width: 900px !important;
            display: table !important;
          }
          
          /* Hide mobile cards on mobile - show table instead */
          .mobile-excel-product-cards {
            display: none !important;
          }
          
          /* Adjust header for mobile */
          .excel-products-table > div:first-child {
            padding: 10px 12px !important;
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          
          .excel-products-table > div:first-child h2 {
            font-size: 0.9rem !important;
            flex-wrap: wrap !important;
          }
          
          /* Pagination adjustments for mobile */
          .modern-pagination {
            padding: 12px !important;
            flex-direction: column !important;
            gap: 12px !important;
          }
          
          .modern-pagination > div {
            flex-direction: column !important;
            width: 100% !important;
          }
          
          .modern-pagination-btn {
            padding: 8px 12px !important;
            font-size: 0.8rem !important;
          }
          
          /* Make table more readable on mobile */
          .excel-products-table th,
          .excel-products-table td {
            font-size: 0.7rem !important;
            padding: 8px 10px !important;
            white-space: nowrap;
          }
          
          /* Product name column - allow some wrapping on mobile */
          .excel-products-table tbody td:nth-child(2) {
            max-width: 200px;
            white-space: normal !important;
          }
          
          /* Ensure table cells don't break */
          .excel-products-table tbody tr {
            display: table-row !important;
          }
          
          .excel-products-table tbody td {
            display: table-cell !important;
          }
        }
        
        /* Tablet styles */
        @media (min-width: 769px) and (max-width: 1024px) {
          .admin-layout {
            padding: 12px;
          }
          
          .excel-products-table table {
            min-width: 950px;
            font-size: 0.7rem;
          }
          
          .excel-products-table th,
          .excel-products-table td {
            padding: 6px 6px !important;
            font-size: 0.7rem !important;
          }
          
          /* Adjust column widths for tablets */
          .excel-products-table th:nth-child(2),
          .excel-products-table td:nth-child(2) { width: 200px; min-width: 200px; }
          
          .excel-products-table th:nth-child(12),
          .excel-products-table td:nth-child(12) { width: 140px; min-width: 140px; }
        }
        
        /* Large desktop optimization */
        @media (min-width: 1400px) {
          .excel-products-container {
            max-width: 1600px;
          }
          
          .excel-products-table table {
            min-width: 1100px;
          }
          
          /* Wider product name column on large screens */
          .excel-products-table th:nth-child(2),
          .excel-products-table td:nth-child(2) { width: 280px; min-width: 280px; }
        }
        
        /* Mobile product cards */
        .mobile-excel-product-cards {
          display: none;
        }
        
        .mobile-excel-product-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 10px;
        }
        
        .mobile-excel-product-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .mobile-excel-product-card-image {
          width: 60px;
          height: 60px;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 10px;
        }
        
        .mobile-excel-product-card-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          font-size: 0.75rem;
          margin-bottom: 10px;
        }
        
        .mobile-excel-product-card-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        
        .mobile-excel-product-card-actions button {
          flex: 1;
          min-width: calc(50% - 3px);
          padding: 6px;
          font-size: 0.7rem;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          font-weight: 500;
        }
      `}</style>
      
      <div className="admin-layout">
        <div className="excel-products-container">
          {/* Combined Header Card - All in One */}
          <div className="modern-header-card">
            {/* Top Row: Title and Back Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 auto', minWidth: '250px' }}>
                <h1 style={{ 
                  margin: 0, 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold',
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  📊 {upload?.originalFileName || 'Excel Products'}
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#6b7280',
                    background: '#f3f4f6',
                    padding: '4px 12px',
                    borderRadius: '12px'
                  }}>
                    {totalProducts} products
                  </span>
                </h1>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                  Uploaded <span style={{ fontWeight: '600', color: '#374151' }}>{upload ? formatDate(upload.uploadedAt) : ''}</span>
                  {' • '}
                 
                </p>
              </div>
              <button
                onClick={() => navigate('/admin/excel-manager')}
                className="modern-btn modern-btn-secondary"
                style={{ flexShrink: 0 }}
              >
                ← Back to Manager
              </button>
            </div>

            {/* Search Bar - Full Width */}
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="🔍 Search by name, ASIN, SKU, category..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                  updateUrlWithState({ search: e.target.value, page: 1 });
                }}
                className="modern-input"
                style={{ width: '100%' }}
              />
            </div>

            {/* Filters Row: Dropdowns */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  const newCategory = e.target.value;
                  setCategoryFilter(newCategory);
                  setCurrentPage(1);
                  updateUrlWithState({ category: newCategory, page: 1 });
                }}
                className="modern-select"
                style={{ flex: '1 1 150px' }}
              >
                <option value="all">All Categories</option>
                {availableCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                  updateUrlWithState({ status: e.target.value, page: 1 });
                }}
                className="modern-select"
                style={{ flex: '1 1 150px' }}
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
                className="modern-select"
                style={{ flex: '1 1 120px' }}
              >
                <option value={20}>20/page</option>
                <option value={50}>50/page</option>
                <option value={100}>100/page</option>
                <option value={200}>200/page</option>
              </select>
            </div>

            {/* Action Buttons Row */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {selectedProducts.size > 0 && (
                <button
                  onClick={handleConvertProducts}
                  className="modern-btn modern-btn-success"
                  style={{ flex: '1 1 auto', minWidth: '140px' }}
                >
                  📋 Convert ({selectedProducts.size})
                </button>
              )}

              <button
                onClick={handleSyncStatus}
                className="modern-btn modern-btn-primary"
                style={{ flex: '1 1 auto', minWidth: '120px' }}
              >
                🔄 Sync Status
              </button>

              <button
                onClick={handleMigrateImages}
                className="modern-btn"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  color: 'white',
                  flex: '1 1 auto',
                  minWidth: '120px'
                }}
              >
                🖼️ Fix Images
              </button>

              <button
                onClick={() => setShowDirectImageUpload(!showDirectImageUpload)}
                className="modern-btn"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  flex: '1 1 auto',
                  minWidth: '140px'
                }}
              >
                📤 Direct Upload
              </button>
            </div>
          </div>

          {/* Direct Image Upload Section */}
          {showDirectImageUpload && (
            <div style={{
              background: 'white',
              padding: '16px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: '16px',
              border: '2px solid #f59e0b'
            }}>
              {/* Direct image upload content (same as before) */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '1.1rem', fontWeight: '600' }}>
                  📤 Direct Image Upload
                </h3>
                <button
                  onClick={() => setShowDirectImageUpload(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    color: '#666'
                  }}
                >
                  ✕
                </button>
              </div>
              
              <div style={{ marginBottom: '12px', fontSize: '0.85rem', color: '#666' }}>
                <p style={{ margin: '0 0 8px 0' }}>
                  📋 <strong>Instructions:</strong> Upload 1 or more images directly to Cloudinary with ASIN names
                </p>
                <ul style={{ margin: '0 0 8px 20px', paddingLeft: '0' }}>
                  <li>Name your images with the ASIN (e.g., "B08KR3G8VP.jpg")</li>
                  <li>For multiple images per ASIN, add a number (e.g., "B08KR3G8VP 2.jpg", "B08KR3G8VP 3.jpg")</li>
                  <li>Supported formats: JPG, JPEG, PNG, WEBP, GIF</li>
                  <li>Upload 1-10 images at once - even a single image is fine!</li>
                  <li>Images will automatically match with products that have the same ASIN</li>
                  <li>✅ Green border = ASIN matches a product in this Excel file</li>
                  <li>⚠️ Yellow border = Valid ASIN but no match in current Excel (will still upload)</li>
                  <li>❌ Red border = Invalid ASIN format</li>
                </ul>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleDirectImageSelect}
                  style={{
                    padding: '8px',
                    border: '2px dashed #f59e0b',
                    borderRadius: '6px',
                    width: '100%',
                    fontSize: '0.85rem'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                  Select 1-10 image files (JPG, PNG, WEBP, GIF) - Max 10MB each
                </div>
              </div>

              {selectedDirectImages.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#333' }}>
                    Selected Images ({selectedDirectImages.length}):
                  </h4>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    padding: '8px'
                  }}>
                    {selectedDirectImages.map((file, index) => {
                      const fileName = file.name;
                      const fileExt = fileName.split('.').pop().toLowerCase();
                      const baseName = fileName.replace(`.${fileExt}`, '');
                      
                      let asin, imageNumber = 1;
                      const numberedMatch = baseName.match(/^([A-Z0-9]{10})\s+(\d+)$/i);
                      
                      if (numberedMatch) {
                        asin = numberedMatch[1].toUpperCase();
                        imageNumber = parseInt(numberedMatch[2]);
                      } else {
                        asin = baseName.toUpperCase();
                        imageNumber = 1;
                      }
                      
                      const isValidAsin = /^[A-Z0-9]{10}$/.test(asin);
                      
                      const matchingProduct = products.find(p => p.asin === asin);
                      
                      return (
                        <div key={index} style={{
                          padding: '6px',
                          border: `1px solid ${isValidAsin ? (matchingProduct ? '#10b981' : '#f59e0b') : '#ef4444'}`,
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          background: isValidAsin ? (matchingProduct ? '#f0fdf4' : '#fffbeb') : '#fef2f2'
                        }}>
                          <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                            {fileName}
                          </div>
                          <div style={{ color: isValidAsin ? (matchingProduct ? '#059669' : '#d97706') : '#dc2626' }}>
                            {isValidAsin ? (
                              matchingProduct ? (
                                <>✅ ASIN: {asin} (Image {imageNumber}) - Matches: {matchingProduct.name}</>
                              ) : (
                                <>⚠️ ASIN: {asin} (Image {imageNumber}) - No match in current Excel</>
                              )
                            ) : (
                              <>❌ Invalid ASIN format</>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={handleDirectImageUpload}
                  disabled={selectedDirectImages.length === 0 || directImageUploading}
                  style={{
                    padding: '8px 16px',
                    background: selectedDirectImages.length === 0 || directImageUploading ? '#9ca3af' : '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    cursor: selectedDirectImages.length === 0 || directImageUploading ? 'not-allowed' : 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {directImageUploading ? '⏳ Uploading...' : 
                   selectedDirectImages.length === 1 ? '📤 Upload 1 Image' : 
                   `📤 Upload ${selectedDirectImages.length} Images`}
                </button>
                
                {selectedDirectImages.length > 0 && (
                  <button
                    onClick={() => setSelectedDirectImages([])}
                    style={{
                      padding: '8px 16px',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    🗑️ Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Modern Products Table - FIXED: Pagination is now outside scroll wrapper */}
          <div className="excel-products-table">
            <div style={{
              padding: '12px 16px',
              borderBottom: '2px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'white',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: '1rem', 
                fontWeight: '700',
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexWrap: 'wrap'
              }}>
                📦 Products 
                <span style={{ 
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  color: '#6b7280'
                }}>
                  {totalProducts} total • {products.length} shown
                </span>
                {loading && <span style={{ fontSize: '0.8rem', color: '#667eea' }}>⏳</span>}
              </h2>
              {selectedProducts.size > 0 && (
                <div style={{
                  padding: '4px 12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: '14px',
                  fontSize: '0.75rem',
                  fontWeight: '700'
                }}>
                  {selectedProducts.size} selected
                </div>
              )}
            </div>

            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏳</div>
                <div style={{ fontSize: '1.3rem', color: '#667eea', fontWeight: '600' }}>Loading products...</div>
              </div>
            ) : products.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
                <div style={{ fontSize: '1.3rem', color: '#374151', fontWeight: '600', marginBottom: '8px' }}>No products found</div>
                <div style={{ fontSize: '1rem', color: '#9ca3af' }}>Try adjusting your search or filters</div>
              </div>
            ) : (
              <>
                {/* Desktop Table - Direct table without scroll wrapper */}
                <table>
                  <thead>
                    <tr>
                      <th>
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
                        <th>Product</th>
                        <th>ASIN</th>
                        <th>SKU</th>
                        <th>Image</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Rating</th>
                        <th>Reviews</th>
                        <th>Status</th>
                        <th>Row</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr 
                          key={product._id}
                          className={product.isConverted ? 'converted-row' : ''}
                        >
                          <td>
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
                          <td>
                            <div style={{ fontWeight: '600', fontSize: '0.8rem' }}>
                              {product.isConverted && product.mainProductId && (product.approvalStatus === 'approved' || product.status === 'listed') ? (
                                <a
                                  href={`/product/${product.mainProductId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: '#667eea',
                                    textDecoration: 'none',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                  onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                  title="Click to view product in new tab"
                                >
                                  {product.name}
                                </a>
                              ) : (
                                product.name
                              )}
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
                            <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>
                              Added: {formatDate(product.createdAt)}
                            </div>
                          </td>
                          <td>
                            <EditableCell 
                              key={`${product._id}-asin`}
                              product={product} 
                              field="asin" 
                              value={product.asin} 
                              style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                            />
                          </td>
                          <td>
                            <EditableCell 
                              key={`${product._id}-sku`}
                              product={product} 
                              field="sku" 
                              value={product.sku} 
                              style={{ fontFamily: 'monospace', fontSize: '0.75rem', textTransform: 'uppercase' }}
                            />
                          </td>
                          <td>
                            {product.asin ? (
                              <div className="modern-image-container">
                                <EnhancedImage
                                  asin={product.asin}
                                  alt={product.asin}
                                  eager={true}
                                  showLoader={false}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    objectPosition: 'center',
                                    padding: '2px'
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="modern-image-container" style={{ 
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
                          <td>
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
                          <td>
                            <EditableCell 
                              key={`${product._id}-price`}
                              product={product} 
                              field="price" 
                              value={product.price}
                              type="number"
                              style={{ fontWeight: '600', fontSize: '0.8rem' }}
                            />
                          </td>
                          <td>
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
                          <td>
                            <EditableCell 
                              key={`${product._id}-reviews`}
                              product={product} 
                              field="reviews" 
                              value={product.reviews || 0}
                              type="number"
                              style={{ fontSize: '0.75rem' }}
                            />
                          </td>
                          <td>
                            {(() => {
                              const statusInfo = getProductStatus(product);
                              return (
                                <div className="modern-status-badge" style={{
                                  background: statusInfo.color
                                }}>
                                  <span>{statusInfo.icon}</span>
                                  <span>{statusInfo.label}</span>
                                </div>
                              );
                            })()}
                          </td>
                          <td>
                            #{product.rowNumber}
                          </td>
                          <td>
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
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                
                {/* Mobile Product Cards */}
                <div className="mobile-excel-product-cards">
                  {products.map((product) => {
                    const statusInfo = getProductStatus(product);
                    return (
                      <div key={product._id} className="mobile-excel-product-card">
                        <div className="mobile-excel-product-card-header">
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: 4 }}>
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
                              Row #{product.rowNumber}
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product._id)}
                            onChange={() => handleSelectProduct(product._id)}
                            disabled={product.isConverted}
                            style={{ transform: 'scale(1.2)' }}
                          />
                        </div>
                        
                        {product.asin && (
                          <div className="mobile-excel-product-card-image">
                            <EnhancedImage
                              asin={product.asin}
                              alt={product.asin}
                              eager={true}
                              showLoader={false}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                objectPosition: 'center',
                                padding: '2px'
                              }}
                            />
                          </div>
                        )}
                        
                        <div className="mobile-excel-product-card-body">
                          <div>
                            <div style={{ color: '#666', fontSize: '0.65rem' }}>ASIN</div>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{product.asin || '-'}</div>
                          </div>
                          <div>
                            <div style={{ color: '#666', fontSize: '0.65rem' }}>SKU</div>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{product.sku || '-'}</div>
                          </div>
                          <div>
                            <div style={{ color: '#666', fontSize: '0.65rem' }}>Category</div>
                            <div style={{ fontSize: '0.75rem' }}>{product.category}</div>
                          </div>
                          <div>
                            <div style={{ color: '#666', fontSize: '0.65rem' }}>Price</div>
                            <div style={{ fontWeight: 'bold', color: '#059669' }}>£{product.price}</div>
                          </div>
                          <div>
                            <div style={{ color: '#666', fontSize: '0.65rem' }}>Rating</div>
                            <div>⭐ {product.rating?.toFixed(1) || '4.0'}</div>
                          </div>
                          <div>
                            <div style={{ color: '#666', fontSize: '0.65rem' }}>Status</div>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '10px',
                              fontSize: '0.65rem',
                              fontWeight: '600',
                              color: 'white',
                              background: statusInfo.color,
                              whiteSpace: 'nowrap'
                            }}>
                              <span>{statusInfo.icon}</span>
                              <span>{statusInfo.label}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mobile-excel-product-card-actions">
                          <button
                            onClick={() => navigate(`/admin/excel-products/${uploadId}/edit/${product._id}`)}
                            style={{ background: '#667eea', color: 'white' }}
                          >
                            ✏️ Edit
                          </button>
                          {!product.isConverted && (
                            <button
                              onClick={() => handleSingleListToAmazonsChoice(product._id, product.name)}
                              style={{ 
                                background: product.sku && product.sku.trim() ? '#ff6600' : '#6c757d',
                                color: 'white'
                              }}
                              disabled={!product.sku || product.sku.trim() === ''}
                            >
                              📋 Convert
                            </button>
                          )}
                          {product.isConverted && product.mainProductId && (
                            <button
                              onClick={() => navigate(`/product/${product.mainProductId}`)}
                              style={{ background: '#10b981', color: 'white' }}
                            >
                              👁️ View
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Modern Pagination - FIXED: Now outside scroll wrapper, so it never scrolls horizontally */}
            {!loading && products.length > 0 && totalPages > 1 && (
              <div className="modern-pagination">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    ({totalProducts} total products)
                  </span>
                  
                  {totalPages > 10 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Jump to:</span>
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        placeholder={currentPage}
                        className="modern-input"
                        style={{
                          width: '70px',
                          padding: '6px 10px',
                          fontSize: '0.85rem'
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
                      />
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      setCurrentPage(1);
                      updateUrlWithState({ page: 1 });
                    }}
                    disabled={currentPage === 1}
                    className="modern-pagination-btn"
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
                    className="modern-pagination-btn"
                  >
                    ←
                  </button>

                  {(() => {
                    const pageNumbers = [];
                    const maxVisiblePages = 7;
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                    
                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }

                    if (startPage > 1) {
                      pageNumbers.push(
                        <button
                          key={1}
                          onClick={() => {
                            setCurrentPage(1);
                            updateUrlWithState({ page: 1 });
                          }}
                          className={`modern-pagination-btn ${1 === currentPage ? 'active' : ''}`}
                        >
                          1
                        </button>
                      );
                      
                      if (startPage > 2) {
                        pageNumbers.push(
                          <span key="ellipsis1" style={{ 
                            padding: '8px 6px', 
                            fontSize: '0.85rem', 
                            color: '#9ca3af',
                            fontWeight: '600'
                          }}>
                            ...
                          </span>
                        );
                      }
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pageNumbers.push(
                        <button
                          key={i}
                          onClick={() => {
                            setCurrentPage(i);
                            updateUrlWithState({ page: i });
                          }}
                          className={`modern-pagination-btn ${i === currentPage ? 'active' : ''}`}
                        >
                          {i}
                        </button>
                      );
                    }

                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pageNumbers.push(
                          <span key="ellipsis2" style={{ 
                            padding: '8px 6px', 
                            fontSize: '0.85rem', 
                            color: '#9ca3af',
                            fontWeight: '600'
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
                          className={`modern-pagination-btn ${totalPages === currentPage ? 'active' : ''}`}
                        >
                          {totalPages}
                        </button>
                      );
                    }

                    return pageNumbers;
                  })()}

                  <button
                    onClick={() => {
                      const newPage = Math.min(totalPages, currentPage + 1);
                      setCurrentPage(newPage);
                      updateUrlWithState({ page: newPage });
                    }}
                    disabled={currentPage === totalPages}
                    className="modern-pagination-btn"
                  >
                    →
                  </button>
                  <button
                    onClick={() => {
                      setCurrentPage(totalPages);
                      updateUrlWithState({ page: totalPages });
                    }}
                    disabled={currentPage === totalPages}
                    className="modern-pagination-btn"
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
    </>
  );
};

export default ExcelProducts;