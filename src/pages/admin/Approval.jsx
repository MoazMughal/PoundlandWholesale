import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminPost, adminGet } from '../../utils/adminApi';
import cacheManager from '../../utils/cacheManager';
import '../../styles/AdminProductForm.css';

const Approval = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [pendingProducts, setPendingProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Filtering and sorting states
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Bulk selection states
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkTargetCategory, setBulkTargetCategory] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // ASIN search states for products without images
  const [asinInputs, setAsinInputs] = useState({}); // productId -> asin value
  const [fetchingAsins, setFetchingAsins] = useState(new Set()); // productIds currently fetching
  const [asinErrors, setAsinErrors] = useState({}); // productId -> error message
  const [imageUpdateTrigger, setImageUpdateTrigger] = useState({}); // productId -> timestamp to force re-render

  useEffect(() => {
    fetchPendingProducts();
    
    // Show success message if coming from add product
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
    }
  }, [location.state]);

  // Fetch all categories on component mount
  useEffect(() => {
    fetchAllCategories();
  }, []);

  // Filter and sort products when dependencies change
  useEffect(() => {
    let filtered = [...pendingProducts];

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(search) ||
        product.category?.toLowerCase().includes(search) ||
        product.brand?.toLowerCase().includes(search) ||
        product.sku?.toLowerCase().includes(search) ||
        product.description?.toLowerCase().includes(search)
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => 
        product.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Sort products
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt || b._id) - new Date(a.createdAt || a._id));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt || a._id) - new Date(b.createdAt || b._id));
        break;
      case 'name-asc':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'price-low':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'rating-high':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'rating-low':
        filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        break;
      case 'stock-high':
        filtered.sort((a, b) => (b.stock || 0) - (a.stock || 0));
        break;
      case 'stock-low':
        filtered.sort((a, b) => (a.stock || 0) - (b.stock || 0));
        break;
      default:
        break;
    }

    setFilteredProducts(filtered);
  }, [pendingProducts, selectedCategory, sortBy, searchTerm]);

  const fetchPendingProducts = async () => {
    try {
      setLoading(true);
      const response = await adminGet('http://localhost:5000/api/products/pending-approval');
      
      if (response.ok) {
        const data = await response.json();
        setPendingProducts(data.products || []);
        
        // Fetch all available categories instead of just extracting from pending products
        await fetchAllCategories();
        
      }
    } catch (error) {
      // Error fetching pending products
    } finally {
      setLoading(false);
    }
  };

  // New function to fetch all available categories
  const fetchAllCategories = async () => {
    try {
      // Use the same comprehensive API call as AddProduct page
      const response = await fetch('http://localhost:5000/api/products/public/categories?includeExcel=true&includeEmpty=true&deduplicate=true');
      if (response.ok) {
        const data = await response.json();
        let fetchedCategories = data.categories || [];
        
        // Client-side deduplication as backup (case-insensitive)
        const deduplicatedCategories = [];
        const seenCategories = new Set();
        
        fetchedCategories.forEach(cat => {
          const lowerLabel = cat.label.toLowerCase();
          if (!seenCategories.has(lowerLabel)) {
            seenCategories.add(lowerLabel);
            deduplicatedCategories.push(cat);
          }
        });
        
        // Extract just the category names for the approval page
        const categoryNames = deduplicatedCategories
          .filter(cat => cat.value !== 'all') // Exclude "All Products" option
          .map(cat => cat.label)
          .sort();
        
        setCategories(categoryNames);
      }
    } catch (error) {
      // Fallback: extract categories from pending products if API fails
      const uniqueCategories = [...new Set(
        (pendingProducts || [])
          .map(product => product.category)
          .filter(category => category && category.trim() !== '')
      )].sort();
      setCategories(uniqueCategories);
    }
  };

  const handleApproval = async (productId, action) => {
    setProcessing(productId);
    
    try {
      const response = await adminPost(`http://localhost:5000/api/products/${productId}/approval`, {
        action, // 'approve' or 'disapprove'
        approvalStatus: action === 'approve' ? 'approved' : 'disapproved'
      });
      
      if (response.ok) {
        // Remove from pending list
        setPendingProducts(prev => prev.filter(p => p._id !== productId));
        
        // Clear cache
        cacheManager.clearAll();
        
        // Show success message
        const actionText = action === 'approve' ? 'approved' : 'disapproved';
        setSuccessMessage(`Product ${actionText} successfully!`);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.message || 'Failed to process approval'}`);
      }
    } catch (error) {
      alert('❌ Failed to process approval. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const getCategoryCount = (category) => {
    if (category === 'all') return pendingProducts.length;
    return pendingProducts.filter(product => 
      product.category?.toLowerCase() === category.toLowerCase()
    ).length;
  };

  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSortBy('newest');
    setSearchTerm('');
  };

  // Bulk selection functions
  const toggleProductSelection = (productId) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const selectAllProducts = () => {
    const allIds = new Set(filteredProducts.map(p => p._id));
    setSelectedProducts(allIds);
    setShowBulkActions(allIds.size > 0);
  };

  const clearSelection = () => {
    setSelectedProducts(new Set());
    setShowBulkActions(false);
  };

  const handleBulkCategoryChange = async () => {
    if (!bulkTargetCategory || selectedProducts.size === 0) {
      alert('Please select a target category and products to move.');
      return;
    }

    setBulkProcessing(true);
    
    try {
      const productIds = Array.from(selectedProducts);
      let targetCategory = bulkTargetCategory;
      
      // Handle new category creation
      if (bulkTargetCategory.startsWith('NEW:')) {
        targetCategory = bulkTargetCategory.slice(4).trim();
        if (!targetCategory) {
          alert('Please enter a valid category name.');
          setBulkProcessing(false);
          return;
        }
      }
      
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch('http://localhost:5000/api/products/move-selected', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productIds: productIds,
          newCategory: targetCategory
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update local state
        setPendingProducts(prev => 
          prev.map(product => 
            selectedProducts.has(product._id) 
              ? { ...product, category: targetCategory }
              : product
          )
        );
        
        // If it's a new category, add it to the categories list
        if (bulkTargetCategory.startsWith('NEW:') && !categories.includes(targetCategory)) {
          setCategories(prev => [...prev, targetCategory].sort());
        }
        
        // Clear cache and selection
        cacheManager.clearAll();
        clearSelection();
        setBulkTargetCategory('');
        
        const isNewCategory = bulkTargetCategory.startsWith('NEW:');
        const movedCount = data.updatedCount || data.movedCount || productIds.length;
        setSuccessMessage(
          `Successfully moved ${movedCount} products to "${targetCategory}" category!` +
          (isNewCategory ? ' (New category created)' : '')
        );
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      } else {
        let errorMessage = 'Failed to move products';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          const errorText = await response.text();
          errorMessage = `Server error (${response.status}): ${errorText}`;
        }
        
        alert(`❌ Error: ${errorMessage}`);
      }
    } catch (error) {
      alert(`❌ Failed to move products to category. Please try again.`);
    } finally {
      setBulkProcessing(false);
    }
  };

  // Bulk approval functions
  const handleBulkApproval = async (action) => {
    if (selectedProducts.size === 0) {
      alert('Please select products to ' + action + '.');
      return;
    }

    const confirmMessage = `Are you sure you want to ${action} ${selectedProducts.size} selected products?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setBulkProcessing(true);
    
    try {
      const productIds = Array.from(selectedProducts);
      
      // Process each product approval/disapproval
      const approvalPromises = productIds.map(productId => 
        adminPost(`http://localhost:5000/api/products/${productId}/approval`, {
          action: action, // 'approve' or 'disapprove'
          approvalStatus: action === 'approve' ? 'approved' : 'disapproved'
        })
      );

      const results = await Promise.all(approvalPromises);
      
      // Check results
      const successfulUpdates = results.filter(result => result.ok);
      const failedUpdates = results.filter(result => !result.ok);
      
      if (successfulUpdates.length > 0) {
        // Remove successfully processed products from pending list
        const processedIds = new Set();
        results.forEach((result, index) => {
          if (result.ok) {
            processedIds.add(productIds[index]);
          }
        });
        
        setPendingProducts(prev => prev.filter(p => !processedIds.has(p._id)));
        
        // Clear cache and selection
        cacheManager.clearAll();
        clearSelection();
        
        const actionText = action === 'approve' ? 'approved' : 'disapproved';
        let message = `Successfully ${actionText} ${successfulUpdates.length} products!`;
        
        if (failedUpdates.length > 0) {
          message += ` (${failedUpdates.length} failed)`;
        }
        
        setSuccessMessage(message);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      }
      
      if (failedUpdates.length > 0 && successfulUpdates.length === 0) {
        alert(`❌ Failed to ${action} all selected products. Please try again.`);
      }
    } catch (error) {
      alert(`❌ Failed to ${action} products. Please try again.`);
    } finally {
      setBulkProcessing(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(price);
  };

  // Function to fetch images by ASIN for products without images
  const fetchImagesByAsin = async (productId, asin) => {
    if (!asin || asin.length !== 10) {
      setAsinErrors(prev => ({ ...prev, [productId]: 'ASIN must be 10 characters' }));
      return;
    }

    setFetchingAsins(prev => new Set([...prev, productId]));
    setAsinErrors(prev => ({ ...prev, [productId]: '' }));

    try {
      const token = localStorage.getItem('adminToken');
      
      console.log(`🔍 Fetching images for ASIN: ${asin}, Product ID: ${productId}`);
      
      // PRIORITY 1: Try to get image from Cloudinary first
      const cloudinaryUrl = `https://res.cloudinary.com/dtuq3tvjx/image/upload/v1/products/${asin}`;
      
      try {
        // Check if Cloudinary image exists
        const cloudinaryCheck = await fetch(cloudinaryUrl, { method: 'HEAD' });
        
        if (cloudinaryCheck.ok) {
          console.log('✅ Found image in Cloudinary:', cloudinaryUrl);
          
          // Update the product with Cloudinary image
          const updateResponse = await fetch(`http://localhost:5000/api/products/${productId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              images: [cloudinaryUrl],
              asin: asin.toUpperCase()
            })
          });
          
          if (updateResponse.ok) {
            console.log('✅ Database updated with Cloudinary image');
            
            // Update local state immediately
            setPendingProducts(prev => {
              const updated = prev.map(product => 
                product._id === productId 
                  ? { 
                      ...product, 
                      images: [cloudinaryUrl], 
                      asin: asin.toUpperCase() 
                    }
                  : product
              );
              return updated;
            });
            
            setFilteredProducts(prev => {
              const updated = prev.map(product => 
                product._id === productId 
                  ? { 
                      ...product, 
                      images: [cloudinaryUrl], 
                      asin: asin.toUpperCase() 
                    }
                  : product
              );
              return updated;
            });
            
            setImageUpdateTrigger(prev => ({ ...prev, [productId]: Date.now() }));
            setAsinInputs(prev => ({ ...prev, [productId]: '' }));
            
            setSuccessMessage(`✅ Image fetched from Cloudinary for ASIN ${asin}!`);
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);
            
            setFetchingAsins(prev => {
              const newSet = new Set(prev);
              newSet.delete(productId);
              return newSet;
            });
            return; // Success, exit function
          }
        }
      } catch (cloudinaryError) {
        console.log('⚠️ Cloudinary image not found, will try other sources');
      }
      
      // PRIORITY 2: If Cloudinary doesn't have the image, ask for permission to fetch from other sources
      const confirmFetch = window.confirm(
        `Image not found in Cloudinary for ASIN: ${asin}\n\n` +
        `Would you like to fetch the image from other sources?\n\n` +
        `This will search the database and external sources for product images.`
      );
      
      if (!confirmFetch) {
        console.log('❌ User cancelled fetching from other sources');
        setAsinErrors(prev => ({ ...prev, [productId]: 'Image fetch cancelled by user' }));
        setFetchingAsins(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        return;
      }
      
      // User confirmed, proceed with fetching from database/other sources
      console.log('✅ User confirmed, fetching from other sources');
      
      const response = await fetch(`http://localhost:5000/api/excel/asin/${asin}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📷 ASIN fetch response:', data);
        
        if (data.product && data.product.images && data.product.images.length > 0) {
          const updatedImages = data.product.images.slice(0, 5);
          console.log('📷 Images to update:', updatedImages);
          
          const updateResponse = await fetch(`http://localhost:5000/api/products/${productId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              images: updatedImages,
              asin: asin.toUpperCase()
            })
          });
          
          if (updateResponse.ok) {
            console.log('✅ Database updated successfully');
            
            setPendingProducts(prev => {
              const updated = prev.map(product => 
                product._id === productId 
                  ? { 
                      ...product, 
                      images: updatedImages, 
                      asin: asin.toUpperCase() 
                    }
                  : product
              );
              return updated;
            });
            
            setFilteredProducts(prev => {
              const updated = prev.map(product => 
                product._id === productId 
                  ? { 
                      ...product, 
                      images: updatedImages, 
                      asin: asin.toUpperCase() 
                    }
                  : product
              );
              return updated;
            });
            
            setImageUpdateTrigger(prev => ({ ...prev, [productId]: Date.now() }));
            setAsinInputs(prev => ({ ...prev, [productId]: '' }));
            
            setSuccessMessage(`✅ ${updatedImages.length} images fetched successfully for ASIN ${asin}!`);
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);
            
            console.log('🎉 Image fetch completed successfully');
          } else {
            const errorText = await updateResponse.text();
            console.error('❌ Database update failed:', errorText);
            setAsinErrors(prev => ({ ...prev, [productId]: 'Failed to update product with images' }));
          }
        } else {
          console.log('⚠️ No images found in ASIN response');
          setAsinErrors(prev => ({ ...prev, [productId]: 'No images found for this ASIN' }));
        }
      } else {
        const errorText = await response.text();
        console.error('❌ ASIN fetch failed:', errorText);
        setAsinErrors(prev => ({ ...prev, [productId]: 'ASIN not found in database' }));
      }
    } catch (error) {
      console.error('❌ Error fetching ASIN:', error);
      setAsinErrors(prev => ({ ...prev, [productId]: 'Error fetching ASIN data' }));
    } finally {
      setFetchingAsins(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  // Handle ASIN input change
  const handleAsinInputChange = (productId, value) => {
    const asin = value.toUpperCase();
    setAsinInputs(prev => ({ ...prev, [productId]: asin }));
    setAsinErrors(prev => ({ ...prev, [productId]: '' }));
  };

  // Handle ASIN search
  const handleAsinSearch = (productId) => {
    const asin = asinInputs[productId];
    if (asin && asin.length === 10) {
      fetchImagesByAsin(productId, asin);
    }
  };

  // Bulk image fetch for selected products with ASINs
  const handleBulkImageFetch = async () => {
    if (selectedProducts.size === 0) {
      alert('Please select products to fetch images for.');
      return;
    }

    // Get selected products that have ASINs (either no images or broken images)
    const selectedProductsList = filteredProducts.filter(p => selectedProducts.has(p._id));
    const productsWithAsins = selectedProductsList.filter(p => 
      p.asin && p.asin.trim()
    );

    if (productsWithAsins.length === 0) {
      alert('No selected products have ASINs. Please select products that have ASINs.');
      return;
    }

    const confirmMessage = `Fetch/refresh images for ${productsWithAsins.length} products with ASINs?\n\nThis will:\n• Fetch new images for products without images\n• Replace broken images with fresh ones\n\nProducts:\n${productsWithAsins.map(p => `• ${p.name} (ASIN: ${p.asin})`).slice(0, 5).join('\n')}${productsWithAsins.length > 5 ? `\n... and ${productsWithAsins.length - 5} more` : ''}`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setBulkProcessing(true);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
      // Process each product
      for (const product of productsWithAsins) {
        try {
          await fetchImagesByAsin(product._id, product.asin);
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`${product.name}: ${error.message}`);
        }
      }

      // Show results
      let message = `Bulk image fetch completed!\n\n`;
      message += `✅ Success: ${successCount} products\n`;
      if (errorCount > 0) {
        message += `❌ Failed: ${errorCount} products\n\n`;
        if (errors.length > 0) {
          message += `Errors:\n${errors.slice(0, 3).join('\n')}`;
          if (errors.length > 3) {
            message += `\n... and ${errors.length - 3} more errors`;
          }
        }
      }

      alert(message);

      if (successCount > 0) {
        setSuccessMessage(`Successfully fetched/refreshed images for ${successCount} products!`);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      }

    } catch (error) {
      console.error('Error in bulk image fetch:', error);
      alert('❌ Failed to fetch images. Please try again.');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Quick fix for products with ASINs but broken images
  const handleQuickImageFix = async (productId, asin) => {
    if (!asin) return;
    
    // Use the existing ASIN to fetch fresh images
    await fetchImagesByAsin(productId, asin);
  };

  // Fix Party accessories category spelling and visibility issues
  const handleFixPartyAccessoriesCategory = async () => {
    const confirmMessage = `Fix Party accessories category issues?\n\nThis will:\n• Fix category spelling variations (Party accessories → Party-accessories)\n• Make listed Excel products visible in Admin/Products\n• Ensure products appear in Amazon's Choice\n• Only affect products with "listed" badge in Excel products\n\nContinue?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setBulkProcessing(true);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/admin-excel/fix-party-accessories-category', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Clear cache
        cacheManager.clearAll();
        
        // Show success message
        let message = `✅ Party accessories category fixed!\n\n`;
        message += `📦 Main products updated: ${data.updatedMainProducts}\n`;
        message += `📋 Excel products updated: ${data.updatedExcelProducts}\n`;
        message += `👁️ Made visible: ${data.madeVisible}\n\n`;
        message += `Products should now appear in Admin/Products and Amazon's Choice pages.`;
        
        alert(message);
        
        setSuccessMessage(`Fixed ${data.totalUpdated} Party accessories products! Check Admin/Products and Amazon's Choice.`);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 5000);
        
        // Refresh the pending products list
        fetchPendingProducts();
        
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error fixing Party accessories category:', error);
      alert('❌ Failed to fix category. Please try again.');
    } finally {
      setBulkProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-product-form">
        <header className="form-header">
          <h1>⏳ Product Approval (Loading...)</h1>
        </header>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>⏳</div>
          <p>Loading pending products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-product-form">
      <header className="form-header">
        <h1>✅ Product Approval ({filteredProducts.length} of {pendingProducts.length} products)</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleFixPartyAccessoriesCategory}
            disabled={bulkProcessing}
            style={{
              padding: '8px 16px',
              background: bulkProcessing ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: bulkProcessing ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            {bulkProcessing ? '⏳ Fixing...' : '🔧 Fix Party Category'}
          </button>
          <button 
            onClick={() => navigate('/admin/products')} 
            className="back-btn"
          >
            ← Back to Products
          </button>
        </div>
      </header>

      {pendingProducts.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '50px',
          background: '#f8f9fa',
          borderRadius: '12px',
          margin: '20px 0'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
          <h2 style={{ color: '#28a745', marginBottom: '10px' }}>All Caught Up!</h2>
          <p style={{ color: '#6c757d', fontSize: '16px' }}>
            No products are currently pending approval. (0 products)
          </p>
          <button
            onClick={() => navigate('/admin/add-product')}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            ➕ Add New Product
          </button>
        </div>
      ) : (
        <div>
          {/* Filters and Sorting Controls */}
          <div style={{
            background: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            {/* Search Bar */}
            <div style={{
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid #e9ecef'
            }}>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '600',
                color: '#495057',
                marginBottom: '4px'
              }}>
                🔍 Search Products
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search by name, category, brand, SKU, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 30px 6px 8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '12px',
                    background: 'white'
                  }}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#6c757d',
                      cursor: 'pointer',
                      fontSize: '14px',
                      padding: '2px'
                    }}
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto auto',
              gap: '12px',
              alignItems: 'center'
            }}>
              {/* Category Filter */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#495057',
                  marginBottom: '3px'
                }}>
                  📂 Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    padding: '6px 8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '12px',
                    background: 'white',
                    cursor: 'pointer',
                    minWidth: '150px'
                  }}
                >
                  <option value="all">All ({getCategoryCount('all')})</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category} ({getCategoryCount(category)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Results Info */}
              <div style={{
                textAlign: 'center',
                color: '#6c757d',
                fontSize: '11px'
              }}>
                {filteredProducts.length !== pendingProducts.length && (
                  <span>
                    Showing {filteredProducts.length} of {pendingProducts.length}
                  </span>
                )}
                {(selectedCategory !== 'all' || searchTerm) && (
                  <div style={{ fontSize: '10px', marginTop: '1px' }}>
                    {selectedCategory !== 'all' && <span>{selectedCategory}</span>}
                    {selectedCategory !== 'all' && searchTerm && <span> | </span>}
                    {searchTerm && <span>"{searchTerm}"</span>}
                  </div>
                )}
              </div>

              {/* Clear Filters Button */}
              {(selectedCategory !== 'all' || searchTerm || sortBy !== 'newest') && (
                <div>
                  <button
                    onClick={clearAllFilters}
                    style={{
                      padding: '6px 10px',
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontWeight: '600'
                    }}
                    title="Clear all filters and reset sorting"
                  >
                    🔄 Reset
                  </button>
                </div>
              )}

              {/* Sort Options */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#495057',
                  marginBottom: '3px'
                }}>
                  🔄 Sort
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '6px 8px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '12px',
                    background: 'white',
                    cursor: 'pointer',
                    minWidth: '130px'
                  }}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="price-low">Price (Low-High)</option>
                  <option value="price-high">Price (High-Low)</option>
                  <option value="rating-high">Rating (High-Low)</option>
                  <option value="rating-low">Rating (Low-High)</option>
                  <option value="stock-high">Stock (High-Low)</option>
                  <option value="stock-low">Stock (Low-High)</option>
                </select>
              </div>
            </div>

            {/* Quick Category Buttons */}
            {categories.length > 0 && (
              <div style={{
                marginTop: '8px',
                paddingTop: '8px',
                borderTop: '1px solid #e9ecef'
              }}>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  alignItems: 'center'
                }}>
                  <span style={{
                    fontSize: '10px',
                    color: '#6c757d',
                    marginRight: '6px'
                  }}>
                    Quick:
                  </span>
                  <button
                    onClick={() => setSelectedCategory('all')}
                    style={{
                      padding: '3px 6px',
                      fontSize: '10px',
                      border: '1px solid #dee2e6',
                      borderRadius: '3px',
                      background: selectedCategory === 'all' ? '#007bff' : 'white',
                      color: selectedCategory === 'all' ? 'white' : '#495057',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    All ({getCategoryCount('all')})
                  </button>
                  {categories.slice(0, 6).map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      style={{
                        padding: '3px 6px',
                        fontSize: '10px',
                        border: '1px solid #dee2e6',
                        borderRadius: '3px',
                        background: selectedCategory === category ? '#007bff' : 'white',
                        color: selectedCategory === category ? 'white' : '#495057',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {category} ({getCategoryCount(category)})
                    </button>
                  ))}
                  {categories.length > 6 && (
                    <span style={{
                      fontSize: '9px',
                      color: '#6c757d',
                      fontStyle: 'italic'
                    }}>
                      +{categories.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bulk Actions Panel */}
          {showBulkActions && (
            <div style={{
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              color: 'white',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '10px',
              boxShadow: '0 2px 6px rgba(40, 167, 69, 0.2)'
            }}>
              {/* First Row - Category Management */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto auto auto',
                gap: '12px',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                  ✅ {selectedProducts.size} Selected
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px'
                }}>
                  <span>Move to category:</span>
                  <select
                    value={bulkTargetCategory}
                    onChange={(e) => setBulkTargetCategory(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: 'white',
                      color: '#495057',
                      cursor: 'pointer',
                      minWidth: '120px'
                    }}
                  >
                    <option value="">Select category...</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>or</span>
                  <input
                    type="text"
                    placeholder="New category name"
                    value={bulkTargetCategory.startsWith('NEW:') ? bulkTargetCategory.slice(4) : ''}
                    onChange={(e) => setBulkTargetCategory(e.target.value ? `NEW:${e.target.value}` : '')}
                    style={{
                      padding: '4px 8px',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: 'white',
                      color: '#495057',
                      minWidth: '100px'
                    }}
                  />
                </div>

                <button
                  onClick={handleBulkCategoryChange}
                  disabled={!bulkTargetCategory || bulkProcessing}
                  style={{
                    padding: '6px 12px',
                    background: bulkProcessing ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '4px',
                    cursor: bulkProcessing ? 'not-allowed' : 'pointer',
                    fontSize: '11px',
                    fontWeight: '600',
                    opacity: !bulkTargetCategory ? 0.6 : 1
                  }}
                >
                  {bulkProcessing ? '⏳ Moving...' : '🔄 Move Products'}
                </button>

                <button
                  onClick={selectAllProducts}
                  style={{
                    padding: '6px 10px',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: '600'
                  }}
                >
                  Select All ({filteredProducts.length})
                </button>

                <button
                  onClick={clearSelection}
                  style={{
                    padding: '6px 10px',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: '600'
                  }}
                >
                  ✕ Clear
                </button>
              </div>

              {/* Second Row - Approval Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255,255,255,0.2)'
              }}>
                <button
                  onClick={() => handleBulkApproval('approve')}
                  disabled={bulkProcessing}
                  style={{
                    padding: '8px 16px',
                    background: bulkProcessing ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '4px',
                    cursor: bulkProcessing ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {bulkProcessing ? '⏳' : '✅'} Bulk Approve ({selectedProducts.size})
                </button>

                <button
                  onClick={() => handleBulkApproval('disapprove')}
                  disabled={bulkProcessing}
                  style={{
                    padding: '8px 16px',
                    background: bulkProcessing ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '4px',
                    cursor: bulkProcessing ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {bulkProcessing ? '⏳' : '❌'} Bulk Disapprove ({selectedProducts.size})
                </button>

                <button
                  onClick={() => handleBulkImageFetch()}
                  disabled={bulkProcessing || selectedProducts.size === 0}
                  style={{
                    padding: '8px 16px',
                    background: bulkProcessing ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '4px',
                    cursor: (bulkProcessing || selectedProducts.size === 0) ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: selectedProducts.size === 0 ? 0.6 : 1
                  }}
                >
                  {bulkProcessing ? '⏳' : '📷'} Fetch Images ({selectedProducts.size})
                </button>
              </div>
              
              {/* Help text */}
              <div style={{
                marginTop: '8px',
                fontSize: '10px',
                opacity: 0.8,
                textAlign: 'center'
              }}>
                💡 Select products → Move categories OR approve/disapprove OR fetch images for products with ASINs
              </div>
            </div>
          )}

          {/* Product Count Summary */}
          <div style={{
            background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
            color: 'white',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '10px',
            textAlign: 'center',
            boxShadow: '0 2px 6px rgba(0, 123, 255, 0.2)'
          }}>
            <h2 style={{ 
              margin: '0 0 2px 0', 
              fontSize: '16px', 
              fontWeight: 'bold',
              color: 'white'
            }}>
              📋 {filteredProducts.length} Product{filteredProducts.length !== 1 ? 's' : ''} 
              {selectedCategory !== 'all' ? ` in ${selectedCategory}` : ''} Pending Approval
            </h2>
            <p style={{ 
              margin: 0, 
              fontSize: '11px', 
              color: 'white',
              opacity: 0.9 
            }}>
              {filteredProducts.length !== pendingProducts.length 
                ? `Filtered from ${pendingProducts.length} total products` 
                : 'Review and approve products to make them available for purchase'
              }
            </p>
          </div>

          {filteredProducts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '50px',
              background: '#f8f9fa',
              borderRadius: '12px',
              margin: '20px 0'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔍</div>
              <h2 style={{ color: '#6c757d', marginBottom: '10px' }}>No Products Found</h2>
              <p style={{ color: '#6c757d', fontSize: '16px' }}>
                {searchTerm && selectedCategory !== 'all' 
                  ? `No products found matching "${searchTerm}" in "${selectedCategory}" category.`
                  : searchTerm 
                    ? `No products found matching "${searchTerm}".`
                    : selectedCategory !== 'all' 
                      ? `No products found in "${selectedCategory}" category.`
                      : 'No products match your current filters.'
                }
              </p>
              {(selectedCategory !== 'all' || searchTerm) && (
                <button
                  onClick={clearAllFilters}
                  style={{
                    marginTop: '20px',
                    padding: '12px 24px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  🔄 Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {filteredProducts.map((product) => (
            <div key={`${product._id}-${imageUpdateTrigger[product._id] || 0}`} style={{
              background: 'white',
              border: selectedProducts.has(product._id) ? '2px solid #28a745' : '1px solid #dee2e6',
              borderRadius: '6px',
              padding: '10px',
              boxShadow: selectedProducts.has(product._id) ? '0 2px 8px rgba(40, 167, 69, 0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
              position: 'relative'
            }}>
              {/* Selection Checkbox */}
              <div style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                zIndex: 1
              }}>
                <input
                  type="checkbox"
                  checked={selectedProducts.has(product._id)}
                  onChange={() => toggleProductSelection(product._id)}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                    accentColor: '#28a745'
                  }}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: '12px', alignItems: 'start', paddingLeft: '24px' }}>
                {/* Product Image */}
                <div>
                  {product.images && product.images.length > 0 ? (
                    <img
                      key={`img-${product._id}-${imageUpdateTrigger[product._id] || 0}`}
                      src={product.images[0]}
                      alt={product.name}
                      style={{
                        width: '100%',
                        height: '100px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}
                      onLoad={() => {
                        console.log('✅ Image loaded successfully:', product.images[0]);
                      }}
                      onError={(e) => {
                        console.error('❌ Image failed to load:', product.images[0]);
                        console.log('Product ASIN:', product.asin);
                        console.log('All product images:', product.images);
                        
                        // Try fallback images
                        const fallbackUrls = [];
                        
                        // If product has ASIN, try different Amazon image formats (PRIORITY)
                        if (product.asin) {
                          fallbackUrls.push(
                            `https://images-na.ssl-images-amazon.com/images/P/${product.asin}.01._SCLZZZZZZZ_SX500_.jpg`,
                            `https://m.media-amazon.com/images/I/${product.asin}._AC_SL1500_.jpg`,
                            `https://images-na.ssl-images-amazon.com/images/I/${product.asin}._AC_SL1500_.jpg`,
                            `https://images.amazon.com/images/P/${product.asin}.01.L.jpg`
                          );
                        }
                        
                        // Try other images in the array
                        if (product.images.length > 1) {
                          fallbackUrls.push(...product.images.slice(1));
                        }
                        
                        // Try server-based ASIN image URL if ASIN exists
                        if (product.asin) {
                          const baseUrl = process.env.NODE_ENV === 'production' 
                            ? 'https://generic-wholesale-backend.onrender.com' 
                            : 'http://localhost:5000';
                          fallbackUrls.push(`${baseUrl}/api/admin-excel/public/images/by-asin/${product.asin}`);
                        }
                        
                        // Try fallback URLs one by one
                        let fallbackIndex = 0;
                        const tryNextFallback = () => {
                          if (fallbackIndex < fallbackUrls.length) {
                            const nextUrl = fallbackUrls[fallbackIndex];
                            fallbackIndex++;
                            
                            const testImg = new Image();
                            testImg.onload = () => {
                              e.target.src = nextUrl;
                              console.log('✅ Fallback image loaded:', nextUrl);
                            };
                            testImg.onerror = () => {
                              console.log('❌ Fallback failed:', nextUrl);
                              tryNextFallback();
                            };
                            testImg.src = nextUrl;
                          } else {
                            // All fallbacks failed, show ASIN search interface
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'none'; // Hide the "no image" div
                            e.target.nextSibling.nextSibling.style.display = 'flex'; // Show the fallback div with ASIN search
                          }
                        };
                        
                        tryNextFallback();
                      }}
                    />
                  ) : null}
                  
                  {/* No Image Placeholder with ASIN Search */}
                  {(!product.images || product.images.length === 0) && (
                    <div style={{
                      width: '100%',
                      height: '100px',
                      background: '#f8f9fa',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6c757d',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '8px'
                    }}>
                      <span style={{ fontSize: '16px' }}>📷</span>
                      <span style={{ fontSize: '9px', textAlign: 'center' }}>No Image</span>
                      
                      {/* ASIN Search Field */}
                      <div style={{ width: '100%', marginTop: '4px' }}>
                        <input
                          type="text"
                          placeholder="Enter ASIN"
                          value={asinInputs[product._id] || ''}
                          onChange={(e) => handleAsinInputChange(product._id, e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAsinSearch(product._id);
                            }
                          }}
                          disabled={fetchingAsins.has(product._id)}
                          style={{
                            width: '100%',
                            padding: '2px 4px',
                            fontSize: '8px',
                            border: '1px solid #ccc',
                            borderRadius: '2px',
                            textAlign: 'center',
                            textTransform: 'uppercase',
                            fontFamily: 'monospace'
                          }}
                          maxLength="10"
                        />
                        <button
                          onClick={() => handleAsinSearch(product._id)}
                          disabled={fetchingAsins.has(product._id) || !asinInputs[product._id] || asinInputs[product._id].length !== 10}
                          style={{
                            width: '100%',
                            padding: '2px 4px',
                            fontSize: '7px',
                            background: fetchingAsins.has(product._id) ? '#6c757d' : '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '2px',
                            cursor: fetchingAsins.has(product._id) ? 'not-allowed' : 'pointer',
                            marginTop: '2px',
                            opacity: (!asinInputs[product._id] || asinInputs[product._id].length !== 10) ? 0.5 : 1
                          }}
                        >
                          {fetchingAsins.has(product._id) ? '⏳ Fetching...' : '🔍 Fetch Images'}
                        </button>
                        
                        {/* Error Message */}
                        {asinErrors[product._id] && (
                          <div style={{
                            fontSize: '7px',
                            color: '#dc3545',
                            marginTop: '2px',
                            textAlign: 'center',
                            lineHeight: '1.2'
                          }}>
                            {asinErrors[product._id]}
                          </div>
                        )}
                      </div>
                      
                      {product.asin && (
                        <small style={{ fontSize: '7px', color: '#999', marginTop: '2px' }}>
                          Current ASIN: {product.asin}
                        </small>
                      )}
                    </div>
                  )}
                  
                  {/* Fallback div for image load errors - WITH ASIN SEARCH */}
                  <div style={{
                    width: '100%',
                    height: '100px',
                    background: '#fff3cd',
                    borderRadius: '4px',
                    border: '1px solid #ffeaa7',
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#856404',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '8px'
                  }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <span style={{ fontSize: '9px', textAlign: 'center' }}>Images Failed</span>
                    <span style={{ fontSize: '8px', textAlign: 'center' }}>Try fetching with ASIN</span>
                    
                    {/* ASIN Search Field for failed images */}
                    <div style={{ width: '100%', marginTop: '4px' }}>
                      <input
                        type="text"
                        placeholder={product.asin || "Enter ASIN"}
                        value={asinInputs[product._id] || product.asin || ''}
                        onChange={(e) => handleAsinInputChange(product._id, e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAsinSearch(product._id);
                          }
                        }}
                        disabled={fetchingAsins.has(product._id)}
                        style={{
                          width: '100%',
                          padding: '2px 4px',
                          fontSize: '8px',
                          border: '1px solid #ccc',
                          borderRadius: '2px',
                          textAlign: 'center',
                          textTransform: 'uppercase',
                          fontFamily: 'monospace',
                          background: 'white'
                        }}
                        maxLength="10"
                      />
                      <button
                        onClick={() => handleAsinSearch(product._id)}
                        disabled={fetchingAsins.has(product._id) || !(asinInputs[product._id] || product.asin) || (asinInputs[product._id] || product.asin || '').length !== 10}
                        style={{
                          width: '100%',
                          padding: '2px 4px',
                          fontSize: '7px',
                          background: fetchingAsins.has(product._id) ? '#6c757d' : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '2px',
                          cursor: fetchingAsins.has(product._id) ? 'not-allowed' : 'pointer',
                          marginTop: '2px',
                          opacity: (!(asinInputs[product._id] || product.asin) || (asinInputs[product._id] || product.asin || '').length !== 10) ? 0.5 : 1
                        }}
                      >
                        {fetchingAsins.has(product._id) ? '⏳ Fetching...' : '🔄 Retry Fetch'}
                      </button>
                      
                      {/* Error Message */}
                      {asinErrors[product._id] && (
                        <div style={{
                          fontSize: '7px',
                          color: '#dc3545',
                          marginTop: '2px',
                          textAlign: 'center',
                          lineHeight: '1.2'
                        }}>
                          {asinErrors[product._id]}
                        </div>
                      )}
                    </div>
                    
                    {product.asin && (
                      <small style={{ fontSize: '7px', color: '#856404', marginTop: '2px' }}>
                        Current ASIN: {product.asin}
                      </small>
                    )}
                  </div>
                </div>

                {/* Product Details */}
                <div>
                  <h3 style={{ 
                    margin: '0 0 6px 0', 
                    fontSize: '13px', 
                    fontWeight: 'bold',
                    color: '#212529',
                    lineHeight: '1.2'
                  }}>
                    {product.name}
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px 8px', marginBottom: '6px', fontSize: '10px' }}>
                    <div>
                      <strong>Price:</strong> {formatPrice(product.price)}
                    </div>
                    <div>
                      <strong>Category:</strong> {product.category}
                    </div>
                    <div>
                      <strong>Stock:</strong> {product.stock}
                    </div>
                    <div>
                      <strong>SKU:</strong> {product.sku || 'N/A'}
                    </div>
                    <div>
                      <strong>Brand:</strong> {product.brand || 'N/A'}
                    </div>
                    <div>
                      <strong>Rating:</strong> ⭐ {product.rating}/5
                    </div>
                  </div>

                  {/* ASIN Status Indicator */}
                  {product.asin && (
                    <div style={{ 
                      marginBottom: '6px',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '9px',
                      display: 'inline-block',
                      background: (!product.images || product.images.length === 0) ? '#fff3cd' : '#e3f2fd',
                      color: (!product.images || product.images.length === 0) ? '#856404' : '#1976d2',
                      border: `1px solid ${(!product.images || product.images.length === 0) ? '#ffeaa7' : '#bbdefb'}`
                    }}>
                      <strong>ASIN:</strong> {product.asin} 
                      {(!product.images || product.images.length === 0) ? ' ⚠️ No Images' : ' 📷 Images Available'}
                      {product.images && product.images.length > 0 && (
                        <span style={{ fontSize: '8px', opacity: 0.8 }}> ({product.images.length})</span>
                      )}
                      {/* Debug info */}
                      {imageUpdateTrigger[product._id] && (
                        <span style={{ fontSize: '7px', opacity: 0.6, marginLeft: '4px' }}>
                          Updated: {new Date(imageUpdateTrigger[product._id]).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  )}

                  {product.description && (
                    <div style={{ marginBottom: '4px' }}>
                      <strong style={{ fontSize: '10px' }}>Description:</strong>
                      <p style={{ 
                        margin: '2px 0 0 0', 
                        color: '#6c757d',
                        lineHeight: '1.3',
                        fontSize: '9px',
                        maxHeight: '26px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {product.description.length > 80 ? product.description.substring(0, 80) + '...' : product.description}
                      </p>
                    </div>
                  )}

                  {product.features && product.features.length > 0 && (
                    <div>
                      <strong style={{ fontSize: '10px' }}>Features:</strong>
                      <ul style={{ 
                        margin: '2px 0 0 0', 
                        paddingLeft: '12px',
                        color: '#6c757d',
                        fontSize: '9px'
                      }}>
                        {product.features.slice(0, 1).map((feature, index) => (
                          <li key={index} style={{ marginBottom: '1px' }}>
                            {feature.length > 40 ? feature.substring(0, 40) + '...' : feature}
                          </li>
                        ))}
                        {product.features.length > 1 && (
                          <li style={{ color: '#999', fontStyle: 'italic' }}>
                            +{product.features.length - 1} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '90px' }}>
                  <button
                    onClick={() => navigate(`/admin/products/edit/${product._id}?returnTo=approval`)}
                    disabled={processing === product._id}
                    style={{
                      padding: '5px 8px',
                      background: processing === product._id ? '#6c757d' : '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: processing === product._id ? 'not-allowed' : 'pointer',
                      fontSize: '10px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px'
                    }}
                  >
                    {processing === product._id ? '⏳' : '✏️'} Edit
                  </button>
                  
                  {/* Fix Images Button for products with ASINs */}
                  {product.asin && (
                    <button
                      onClick={() => handleQuickImageFix(product._id, product.asin)}
                      disabled={processing === product._id || fetchingAsins.has(product._id)}
                      style={{
                        padding: '5px 8px',
                        background: (processing === product._id || fetchingAsins.has(product._id)) ? '#6c757d' : '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: (processing === product._id || fetchingAsins.has(product._id)) ? 'not-allowed' : 'pointer',
                        fontSize: '10px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px'
                      }}
                    >
                      {fetchingAsins.has(product._id) ? '⏳' : '🔄'} Fix Images
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleApproval(product._id, 'approve')}
                    disabled={processing === product._id}
                    style={{
                      padding: '5px 8px',
                      background: processing === product._id ? '#6c757d' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: processing === product._id ? 'not-allowed' : 'pointer',
                      fontSize: '10px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px'
                    }}
                  >
                    {processing === product._id ? '⏳' : '✅'} Approve
                  </button>
                  
                  <button
                    onClick={() => handleApproval(product._id, 'disapprove')}
                    disabled={processing === product._id}
                    style={{
                      padding: '5px 8px',
                      background: processing === product._id ? '#6c757d' : '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: processing === product._id ? 'not-allowed' : 'pointer',
                      fontSize: '10px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px'
                    }}
                  >
                    {processing === product._id ? '⏳' : '❌'} Disapprove
                  </button>
                </div>
              </div>
            </div>
              ))}
            </div>
          )}
          
          {/* Progress Footer */}
          <div style={{
            background: '#f8f9fa',
            padding: '8px',
            borderRadius: '4px',
            marginTop: '10px',
            textAlign: 'center',
            border: '1px solid #dee2e6'
          }}>
            <p style={{ 
              margin: 0, 
              color: '#6c757d', 
              fontSize: '10px' 
            }}>
              📊 Total: <strong>{pendingProducts.length}</strong>
              {filteredProducts.length !== pendingProducts.length && (
                <span style={{ marginLeft: '8px' }}>
                  | Showing: <strong>{filteredProducts.length}</strong>
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span style={{ marginLeft: '8px' }}>
                  | Category: <strong>{selectedCategory}</strong>
                </span>
              )}
              {searchTerm && (
                <span style={{ marginLeft: '8px' }}>
                  | Search: <strong>"{searchTerm}"</strong>
                </span>
              )}
              {pendingProducts.length > 0 && (
                <span style={{ marginLeft: '8px' }}>
                  ⚡ Process all to clear queue
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
          color: 'white',
          padding: '20px 25px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(40, 167, 69, 0.3)',
          zIndex: 9999,
          minWidth: '350px',
          maxWidth: '500px',
          animation: 'slideInRight 0.5s ease-out',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              animation: 'bounce 0.6s ease-in-out'
            }}>
              ✅
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                margin: '0 0 5px 0',
                fontSize: '18px',
                fontWeight: 'bold',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                Success!
              </h3>
              <p style={{
                margin: 0,
                fontSize: '14px',
                opacity: 0.9,
                lineHeight: '1.4'
              }}>
                {successMessage}
              </p>
            </div>
            <button
              onClick={() => setShowSuccessToast(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                e.target.style.transform = 'scale(1.1)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }
      `}</style>
    </div>
  );
};

export default Approval;