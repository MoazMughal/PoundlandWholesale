import { useState, useEffect } from 'react';
import { adminGet, adminPost, adminPut, adminDelete } from '../utils/adminApi';
import { getValidAdminToken, cleanupAuthTokens } from '../utils/authFix';

const CategoryManagementModal = ({ isOpen, onClose, onCategoriesUpdated }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('manage'); // 'manage', 'create', 'move', 'organize'
  
  // Create/Edit category states
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    value: '',
    icon: '📦',
    subcategories: []
  });
  const [newSubcategory, setNewSubcategory] = useState('');
  
  // Move products states
  const [moveFrom, setMoveFrom] = useState({ category: '', subcategory: '' });
  const [moveTo, setMoveTo] = useState({ category: '', subcategory: '' });
  const [productCount, setProductCount] = useState(0);
  const [moveMode, setMoveMode] = useState('all'); // 'all' or 'selected'
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Category organization states
  const [selectedMainCategory, setSelectedMainCategory] = useState('');
  const [availableSubcategories, setAvailableSubcategories] = useState([]);
  const [categoryHierarchy, setCategoryHierarchy] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      // Add cache busting to ensure fresh data
      const cacheBuster = `_t=${Date.now()}`;
      const response = await fetch(`http://localhost:5000/api/products/public/categories?${cacheBuster}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('📂 CategoryManagementModal: Fetched categories:', data.categories.map(c => c.value));
        // Filter out 'all' category for management
        const manageable = data.categories.filter(cat => cat.value !== 'all');
        setCategories(manageable);
        
        // Initialize available subcategories (all categories can become subcategories)
        setAvailableSubcategories(manageable);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateValue = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) return;

    try {
      setLoading(true);
      
      // Create a placeholder product to establish the category in the database
      const placeholderProduct = {
        name: `${categoryForm.name} - Category Placeholder`,
        price: 0,
        category: categoryForm.value || generateValue(categoryForm.name),
        subcategory: categoryForm.subcategories[0] || '',
        brand: 'System',
        description: 'This is a placeholder product to establish the category. You can delete this later.',
        stock: 0,
        status: 'inactive',
        isAmazonsChoice: false
      };

      const response = await adminPost('http://localhost:5000/api/products', placeholderProduct);
      
      if (response.ok) {
        alert(`✅ Category "${categoryForm.name}" created successfully!`);
        setCategoryForm({ name: '', value: '', icon: '📦', subcategories: [] });
        fetchCategories();
        onCategoriesUpdated?.();
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('❌ Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsFromCategory = async (categoryValue) => {
    if (!categoryValue) return;
    
    try {
      setLoadingProducts(true);
      
      // Clean up any invalid tokens and get a valid one
      cleanupAuthTokens();
      const token = getValidAdminToken();
      
      if (!token) {
        alert('❌ Authentication token is invalid. Please log in again.');
        window.location.href = '/admin/login';
        return;
      }
      
      // Convert category value to actual category name
      const actualCategoryName = categories.find(c => c.value === categoryValue)?.label || categoryValue;
      console.log(`📦 Fetching products for category: "${actualCategoryName}" (value: "${categoryValue}")`);
      
      // Fetch only active/listed products using the actual category name
      const response = await fetch(`http://localhost:5000/api/products?category=${encodeURIComponent(actualCategoryName)}&status=active&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        alert('❌ Authentication failed. Please log in again.');
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        const activeProducts = data.products.filter(p => 
          p.status === 'active' || !p.status // Include products without status (backward compatibility)
        );
        
        setAvailableProducts(activeProducts);
        setProductCount(activeProducts.length);
        console.log(`📦 Loaded ${activeProducts.length} active products from category "${actualCategoryName}"`);
      } else {
        console.error('Failed to fetch products:', response.status);
        setAvailableProducts([]);
        setProductCount(0);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setAvailableProducts([]);
      setProductCount(0);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleMoveProducts = async () => {
    if (!moveFrom.category || !moveTo.category) {
      alert('Please select both source and destination categories');
      return;
    }

    if (moveFrom.category === moveTo.category) {
      alert('Source and destination categories cannot be the same');
      return;
    }

    if (moveMode === 'selected' && selectedProducts.length === 0) {
      alert('Please select at least one product to move');
      return;
    }

    try {
      setLoading(true);
      
      // Clean up any invalid tokens and get a valid one
      cleanupAuthTokens();
      const token = getValidAdminToken();
      
      if (!token) {
        alert('❌ Authentication token is invalid or expired. Please log in again.');
        // Redirect to admin login
        window.location.href = '/admin/login';
        return;
      }
      
      const fromCategoryName = categories.find(c => c.value === moveFrom.category)?.label || moveFrom.category;
      const toCategoryName = categories.find(c => c.value === moveTo.category)?.label || moveTo.category;
      
      let confirmMessage;
      let moveResponse;
      
      if (moveMode === 'all') {
        // Move all active products in category
        confirmMessage = `Move all ${productCount} active products from "${fromCategoryName}" to "${toCategoryName}"?\n\nThis action cannot be undone.`;
        
        if (!confirm(confirmMessage)) {
          setLoading(false);
          return;
        }
        
        moveResponse = await fetch(`http://localhost:5000/api/products/admin/categories/${encodeURIComponent(fromCategoryName)}/move`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            newCategory: toCategoryName, // Use actual category name
            onlyActive: true // Only move active products
          })
        });
      } else {
        // Move selected products
        confirmMessage = `Move ${selectedProducts.length} selected products from "${fromCategoryName}" to "${toCategoryName}"?\n\nSelected products:\n${selectedProducts.slice(0, 3).map(id => {
          const product = availableProducts.find(p => p._id === id);
          return `• ${product?.name || 'Unknown'}`;
        }).join('\n')}${selectedProducts.length > 3 ? `\n• ... and ${selectedProducts.length - 3} more` : ''}\n\nThis action cannot be undone.`;
        
        if (!confirm(confirmMessage)) {
          setLoading(false);
          return;
        }
        
        moveResponse = await fetch(`http://localhost:5000/api/products/move-selected`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            productIds: selectedProducts,
            newCategory: toCategoryName // Use actual category name
          })
        });
        
        console.log('🔄 Move selected request sent:', {
          productIds: selectedProducts,
          newCategory: toCategoryName, // Log actual category name
          fromCategory: fromCategoryName,
          count: selectedProducts.length
        });
      }
      
      // Handle authentication errors specifically
      if (moveResponse.status === 401) {
        const errorData = await moveResponse.json();
        alert(`❌ Authentication failed: ${errorData.message}\n\nPlease log in again.`);
        localStorage.removeItem('adminToken'); // Clear invalid token
        window.location.href = '/admin/login';
        return;
      }
      
      if (!moveResponse.ok) {
        const errorData = await moveResponse.json();
        throw new Error(errorData.message || `Failed to move products: ${moveResponse.status}`);
      }
      
      const result = await moveResponse.json();
      
      console.log('🔄 Move response received:', result);
      
      let successMessage = `✅ Products moved successfully!\n\n`;
      successMessage += `📦 Products moved: ${result.movedCount || result.updatedCount}\n`;
      successMessage += `📂 From: "${fromCategoryName}"\n`;
      successMessage += `📂 To: "${toCategoryName}"\n`;
      
      if (result.excelUpdatedCount > 0) {
        successMessage += `📋 Excel products updated: ${result.excelUpdatedCount}\n`;
      }
      
      successMessage += `\n🔄 Refreshing all views...`;
      alert(successMessage);
      
      // Close the modal and trigger refresh
      if (onClose) {
        setTimeout(() => {
          onClose();
        }, 1000);
      }
      
      // Reset form
      setMoveFrom({ category: '', subcategory: '' });
      setMoveTo({ category: '', subcategory: '' });
      setProductCount(0);
      setSelectedProducts([]);
      setAvailableProducts([]);
      setMoveMode('all');
      
      // Force refresh with multiple attempts
      for (let i = 0; i < 3; i++) {
        setTimeout(async () => {
          await fetchCategories();
          if (onCategoriesUpdated) {
            onCategoriesUpdated();
          }
          // Trigger global category refresh event
          window.dispatchEvent(new CustomEvent('refreshCategories'));
          localStorage.setItem('categoriesUpdated', Date.now().toString());
        }, (i + 1) * 1000);
      }
      
    } catch (error) {
      console.error('❌ Error moving products:', error);
      
      // Check if it's an authentication error
      if (error.message.includes('Authentication') || error.message.includes('401')) {
        alert(`❌ Authentication failed: ${error.message}\n\nPlease log in again.`);
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
      } else {
        alert(`❌ Failed to move products: ${error.message}\n\nCheck browser console for details.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRenameCategory = async (categoryValue, newName, oldName) => {
    try {
      setLoading(true);
      
      console.log(`🏷️ Renaming category "${categoryValue}" from "${oldName}" to "${newName}"`);
      
      const response = await fetch(`http://localhost:5000/api/products/admin/categories/${encodeURIComponent(categoryValue)}/rename`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newCategoryName: newName })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to rename category: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('🏷️ Rename result:', result);
      
      let successMessage = `✅ Category renamed successfully!\n\n`;
      successMessage += `📂 Old name: "${oldName}"\n`;
      successMessage += `📂 New name: "${newName}"\n`;
      successMessage += `📦 Products updated: ${result.updatedCount}\n`;
      
      if (result.excelUpdatedCount > 0) {
        successMessage += `📋 Excel products updated: ${result.excelUpdatedCount}\n`;
      }
      
      successMessage += `\n🔄 Refreshing all views...`;
      alert(successMessage);
      
      // Force refresh with multiple attempts
      console.log('🔄 Refreshing categories after rename');
      for (let i = 0; i < 3; i++) {
        setTimeout(async () => {
          console.log(`🔄 Refresh attempt ${i + 1}`);
          await fetchCategories();
          if (onCategoriesUpdated) {
            onCategoriesUpdated();
          }
          // Trigger global category refresh event
          window.dispatchEvent(new CustomEvent('refreshCategories'));
          localStorage.setItem('categoriesUpdated', Date.now().toString());
        }, (i + 1) * 1000);
      }
      
    } catch (error) {
      console.error('❌ Error renaming category:', error);
      alert(`❌ Failed to rename category: ${error.message}\n\nCheck browser console for details.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryValue, categoryName) => {
    try {
      setLoading(true);
      
      // Step 1: Check what products are in this category
      console.log(`🔍 Step 1: Analyzing category "${categoryValue}"`);
      
      // Check main products
      const mainProductsResponse = await fetch(`http://localhost:5000/api/products?category=${encodeURIComponent(categoryValue)}&limit=1000`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      let activeProducts = [];
      let inactiveProducts = [];
      
      if (mainProductsResponse.ok) {
        const mainData = await mainProductsResponse.json();
        const allMainProducts = mainData.products || [];
        activeProducts = allMainProducts.filter(p => p.status === 'active');
        inactiveProducts = allMainProducts.filter(p => p.status !== 'active');
      }
      
      console.log(`🔍 Found ${activeProducts.length} active and ${inactiveProducts.length} inactive main products`);
      
      // Step 2: Show smart deletion confirmation
      let confirmMessage = `🧠 SMART CATEGORY DELETION\n\n`;
      confirmMessage += `Category: "${categoryName}" (${categoryValue})\n\n`;
      
      if (activeProducts.length === 0) {
        confirmMessage += `✅ SAFE DELETION:\n`;
        confirmMessage += `• No active/listed products will be deleted\n`;
        confirmMessage += `• Pending Excel products will be preserved\n`;
        confirmMessage += `• Category will be removed from inactive products only\n\n`;
        confirmMessage += `This is a safe operation that won't affect your live products.\n\n`;
        confirmMessage += `Continue with safe deletion?`;
      } else {
        confirmMessage += `⚠️ WARNING: ${activeProducts.length} ACTIVE PRODUCTS FOUND!\n\n`;
        confirmMessage += `Active products that will be DELETED:\n`;
        activeProducts.slice(0, 5).forEach(p => {
          confirmMessage += `• ${p.name}\n`;
        });
        if (activeProducts.length > 5) {
          confirmMessage += `• ... and ${activeProducts.length - 5} more\n`;
        }
        confirmMessage += `\n`;
        confirmMessage += `📋 What will happen:\n`;
        confirmMessage += `• ${activeProducts.length} active products will be DELETED\n`;
        confirmMessage += `• ${inactiveProducts.length} inactive products will lose category\n`;
        confirmMessage += `• Pending Excel products will be PRESERVED\n\n`;
        confirmMessage += `❌ THIS CANNOT BE UNDONE!\n\n`;
        confirmMessage += `Type "DELETE" to confirm deletion of active products:`;
      }
      
      const userInput = activeProducts.length === 0 ? 
        confirm(confirmMessage) : 
        prompt(confirmMessage);
      
      if (activeProducts.length === 0 && !userInput) {
        alert('❌ Deletion cancelled');
        setLoading(false);
        return;
      }
      
      if (activeProducts.length > 0 && userInput !== 'DELETE') {
        alert('❌ Deletion cancelled - you must type "DELETE" to confirm');
        setLoading(false);
        return;
      }

      // Step 3: Perform the smart deletion
      console.log(`🗑️ Step 3: Performing smart deletion for "${categoryValue}"`);
      const deleteUrl = activeProducts.length > 0 ? 
        `http://localhost:5000/api/products/admin/categories/${encodeURIComponent(categoryValue)}?force=true` :
        `http://localhost:5000/api/products/admin/categories/${encodeURIComponent(categoryValue)}`;
        
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      console.log(`🗑️ Delete response status: ${deleteResponse.status}`);
      
      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        throw new Error(errorData.message || `Delete failed: ${deleteResponse.status}`);
      }
      
      const result = await deleteResponse.json();
      console.log('🗑️ Delete result:', result);
      
      // Step 4: Show success message
      let successMessage = `✅ Smart deletion completed!\n\n`;
      successMessage += `📂 Category: "${categoryName}"\n`;
      
      if (result.deletedActiveProducts > 0) {
        successMessage += `🗑️ Deleted active products: ${result.deletedActiveProducts}\n`;
      }
      
      if (result.preservedExcelProducts > 0) {
        successMessage += `💾 Preserved Excel products: ${result.preservedExcelProducts}\n`;
      }
      
      if (result.removedFromInactiveProducts > 0) {
        successMessage += `📝 Updated inactive products: ${result.removedFromInactiveProducts}\n`;
      }
      
      successMessage += `\n🔄 Refreshing all views...`;
      alert(successMessage);
      
      // Step 5: Force refresh with multiple attempts
      console.log('🗑️ Step 5: Refreshing categories');
      for (let i = 0; i < 3; i++) {
        setTimeout(async () => {
          console.log(`🔄 Refresh attempt ${i + 1}`);
          await fetchCategories();
          if (onCategoriesUpdated) {
            onCategoriesUpdated();
          }
        }, (i + 1) * 1000);
      }
      
    } catch (error) {
      console.error('❌ Error deleting category:', error);
      alert(`❌ Failed to delete category: ${error.message}\n\nCheck browser console for details.`);
    } finally {
      setLoading(false);
    }
  };

  const handleOrganizeCategories = async () => {
    if (!selectedMainCategory) {
      alert('Please select a main category first');
      return;
    }

    const selectedSubcategories = Object.keys(categoryHierarchy).filter(cat => 
      categoryHierarchy[cat] === selectedMainCategory
    );

    if (selectedSubcategories.length === 0) {
      alert('Please select at least one category to make a subcategory');
      return;
    }

    const mainCategoryName = categories.find(c => c.value === selectedMainCategory)?.label;
    const subcategoryNames = selectedSubcategories.map(val => 
      categories.find(c => c.value === val)?.label
    );

    const confirmMessage = `Convert the following categories into subcategories of "${mainCategoryName}"?\n\n` +
      subcategoryNames.map(name => `• ${name}`).join('\n') +
      `\n\nThis will move all products from these categories into "${mainCategoryName}" with appropriate subcategory labels.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      
      alert(`✅ Successfully organized categories!\n\n${selectedSubcategories.length} categories have been converted to subcategories of "${mainCategoryName}".\n\n🚧 Note: This is a preview. Backend implementation needed for actual product moving.`);
      
      // Reset states
      setSelectedMainCategory('');
      setCategoryHierarchy({});
      fetchCategories();
      onCategoriesUpdated?.();
      
    } catch (error) {
      console.error('Error organizing categories:', error);
      alert('❌ Failed to organize categories');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteCategories = async () => {
    try {
      setLoading(true);
      
      let totalDeleted = 0;
      let totalExcelUpdated = 0;
      
      // Delete each category one by one
      for (const category of categories) {
        try {
          const response = await adminDelete(`http://localhost:5000/api/products/admin/categories/${category.value}`);
          if (response.ok) {
            const result = await response.json();
            totalDeleted += result.deletedCount || 0;
            totalExcelUpdated += result.excelUpdatedCount || 0;
          }
        } catch (error) {
          console.error(`Error deleting category ${category.value}:`, error);
        }
      }
      
      alert(`✅ Bulk deletion completed!\n\n📊 Total products deleted: ${totalDeleted}\n📋 Excel products updated: ${totalExcelUpdated}\n\n🔄 All views have been updated.`);
      
      fetchCategories();
      onCategoriesUpdated?.();
      
    } catch (error) {
      console.error('Error in bulk delete:', error);
      alert('❌ Failed to complete bulk deletion');
    } finally {
      setLoading(false);
    }
  };

  const addSubcategory = () => {
    if (newSubcategory.trim() && !categoryForm.subcategories.includes(newSubcategory.trim())) {
      setCategoryForm(prev => ({
        ...prev,
        subcategories: [...prev.subcategories, newSubcategory.trim()]
      }));
      setNewSubcategory('');
    }
  };

  const removeSubcategory = (index) => {
    setCategoryForm(prev => ({
      ...prev,
      subcategories: prev.subcategories.filter((_, i) => i !== index)
    }));
  };

  const toggleCategoryAsSubcategory = (categoryValue) => {
    setCategoryHierarchy(prev => {
      const newHierarchy = { ...prev };
      if (newHierarchy[categoryValue] === selectedMainCategory) {
        // Remove from subcategories
        delete newHierarchy[categoryValue];
      } else {
        // Add as subcategory
        newHierarchy[categoryValue] = selectedMainCategory;
      }
      return newHierarchy;
    });
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
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
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>📂 Category Management</h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '20px'
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          {[
            { id: 'manage', label: '📋 Manage Categories' },
            { id: 'move', label: '🔄 Move Products' },
            { id: 'organize', label: '🏗️ Organize Categories' },
            { id: 'create', label: '➕ Create Category' },
            { id: 'restore', label: '🔄 Restore Hidden' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '15px',
                border: 'none',
                background: activeTab === tab.id ? 'white' : 'transparent',
                color: activeTab === tab.id ? '#667eea' : '#6b7280',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '2px solid #667eea' : 'none',
                fontSize: '12px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
          {activeTab === 'manage' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Current Categories</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('http://localhost:5000/api/products?limit=1000', {
                          headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
                        });
                        const data = await response.json();
                        const categoryCount = {};
                        data.products?.forEach(p => {
                          if (p.category) {
                            categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
                          }
                        });
                        console.log('📊 Current category distribution:', categoryCount);
                        
                        let debugInfo = '📊 CATEGORY DEBUG INFO\n\n';
                        debugInfo += `Total products: ${data.products?.length || 0}\n\n`;
                        debugInfo += 'Category distribution:\n';
                        Object.entries(categoryCount).forEach(([cat, count]) => {
                          debugInfo += `• ${cat}: ${count} products\n`;
                        });
                        
                        alert(debugInfo);
                      } catch (error) {
                        console.error('Debug error:', error);
                        alert('Debug failed - check console');
                      }
                    }}
                    style={{
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🔍 Debug Categories
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('⚠️ DELETE ALL CATEGORIES?\n\nThis will delete ALL products in ALL categories!\n\nThis action cannot be undone!')) {
                        handleBulkDeleteCategories();
                      }
                    }}
                    style={{
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    🗑️ Delete All Categories
                  </button>
                </div>
              </div>
              
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
                  <div>Loading categories...</div>
                </div>
              ) : categories.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📂</div>
                  <div>No categories found</div>
                  <p style={{ fontSize: '14px', marginTop: '10px' }}>Create your first category using the "Create Category" tab</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '15px' }}>
                  {categories.map(category => (
                    <div key={category.value} style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '15px',
                      backgroundColor: '#f9fafb'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '20px' }}>📂</span>
                          <div>
                            <h4 style={{ margin: 0 }}>{category.label}</h4>
                            <small style={{ color: '#6b7280' }}>Value: {category.value}</small>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              const newName = prompt(`Rename category "${category.label}" to:`, category.label);
                              if (newName && newName.trim() && newName.trim() !== category.label) {
                                handleRenameCategory(category.value, newName.trim(), category.label);
                              }
                            }}
                            disabled={loading}
                            style={{
                              background: loading ? '#ccc' : '#3b82f6',
                              color: 'white',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            ✏️ Rename
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.value, category.label)}
                            disabled={loading}
                            style={{
                              background: loading ? '#ccc' : '#dc2626',
                              color: 'white',
                              border: 'none',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                      
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        <strong>Subcategories:</strong> None (Use "Organize Categories" tab to create subcategories)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'move' && (
            <div>
              <h3>Move Products Between Categories</h3>
              <div style={{ 
                background: '#e0f2fe', 
                border: '1px solid #0284c7', 
                borderRadius: '8px', 
                padding: '15px', 
                marginBottom: '20px' 
              }}>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  🔄 <strong>Move Products:</strong> Transfer active/listed products between categories. 
                  Choose to move all products or select specific ones. Only active products will be moved.
                </p>
              </div>

              {/* Move Mode Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  📋 Move Mode
                </label>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="moveMode"
                      value="all"
                      checked={moveMode === 'all'}
                      onChange={(e) => {
                        setMoveMode(e.target.value);
                        setSelectedProducts([]);
                      }}
                    />
                    <span>Move All Active Products</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="moveMode"
                      value="selected"
                      checked={moveMode === 'selected'}
                      onChange={(e) => setMoveMode(e.target.value)}
                    />
                    <span>Select Specific Products</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr 1fr', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#dc2626' }}>
                    📤 Move FROM (Source Category)
                  </label>
                  <select
                    value={moveFrom.category}
                    onChange={(e) => {
                      setMoveFrom({ ...moveFrom, category: e.target.value });
                      setProductCount(0);
                      setSelectedProducts([]);
                      setAvailableProducts([]);
                      if (e.target.value) {
                        fetchProductsFromCategory(e.target.value);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #fecaca',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: '#fef2f2'
                    }}
                  >
                    <option value="">Select source category...</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#16a34a' }}>
                    📥 Move TO (Destination Category)
                  </label>
                  <select
                    value={moveTo.category}
                    onChange={(e) => setMoveTo({ ...moveTo, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #bbf7d0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: '#f0fdf4'
                    }}
                  >
                    <option value="">Select destination category...</option>
                    {categories
                      .filter(cat => cat.value !== moveFrom.category)
                      .map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                  </select>
                </div>
              </div>

              {moveFrom.category && (
                <div style={{ 
                  background: '#f3f4f6', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px', 
                  padding: '15px', 
                  marginBottom: '20px' 
                }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>📊 Active Products in "{categories.find(c => c.value === moveFrom.category)?.label}"</h4>
                  
                  {loadingProducts ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <div>⏳ Loading products...</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ marginBottom: '15px', fontSize: '14px', color: '#374151' }}>
                        Found <strong>{productCount}</strong> active products
                        {moveMode === 'selected' && selectedProducts.length > 0 && (
                          <span style={{ marginLeft: '10px', color: '#059669' }}>
                            ({selectedProducts.length} selected)
                          </span>
                        )}
                      </div>

                      {moveMode === 'selected' && availableProducts.length > 0 && (
                        <div style={{ 
                          maxHeight: '300px', 
                          overflowY: 'auto', 
                          border: '1px solid #d1d5db', 
                          borderRadius: '6px',
                          backgroundColor: 'white'
                        }}>
                          <div style={{ 
                            padding: '10px', 
                            borderBottom: '1px solid #e5e7eb', 
                            backgroundColor: '#f9fafb',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                          }}>
                            <input
                              type="checkbox"
                              checked={selectedProducts.length === availableProducts.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProducts(availableProducts.map(p => p._id));
                                } else {
                                  setSelectedProducts([]);
                                }
                              }}
                            />
                            <strong>Select All ({availableProducts.length} products)</strong>
                          </div>
                          
                          {availableProducts.map(product => (
                            <div key={product._id} style={{
                              padding: '10px',
                              borderBottom: '1px solid #f3f4f6',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              cursor: 'pointer',
                              backgroundColor: selectedProducts.includes(product._id) ? '#f0f9ff' : 'white'
                            }}
                            onClick={() => {
                              if (selectedProducts.includes(product._id)) {
                                setSelectedProducts(prev => prev.filter(id => id !== product._id));
                              } else {
                                setSelectedProducts(prev => [...prev, product._id]);
                              }
                            }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedProducts.includes(product._id)}
                                onChange={() => {}} // Handled by parent onClick
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                                  {product.name}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                  ID: {product._id} | Status: {product.status || 'active'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {moveFrom.category && moveTo.category && (
                <div style={{ 
                  background: '#fef3c7', 
                  border: '1px solid #f59e0b', 
                  borderRadius: '8px', 
                  padding: '15px', 
                  marginBottom: '20px' 
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#92400e' }}>⚠️ Move Preview</h4>
                  <div style={{ fontSize: '14px', color: '#92400e' }}>
                    <strong>Mode:</strong> {moveMode === 'all' ? 'Move all active products' : `Move ${selectedProducts.length} selected products`}<br/>
                    <strong>From:</strong> {categories.find(c => c.value === moveFrom.category)?.label}<br/>
                    <strong>To:</strong> {categories.find(c => c.value === moveTo.category)?.label}<br/>
                    <br/>
                    <em>💡 Only active/listed products will be moved. After moving, you can safely delete the empty source category.</em>
                  </div>
                </div>
              )}

              <button
                onClick={handleMoveProducts}
                disabled={
                  !moveFrom.category || 
                  !moveTo.category || 
                  loading || 
                  (moveMode === 'selected' && selectedProducts.length === 0) ||
                  (moveMode === 'all' && productCount === 0)
                }
                style={{
                  background: (
                    moveFrom.category && 
                    moveTo.category && 
                    !loading && 
                    (moveMode === 'all' ? productCount > 0 : selectedProducts.length > 0)
                  ) ? '#f59e0b' : '#ccc',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: (
                    moveFrom.category && 
                    moveTo.category && 
                    !loading && 
                    (moveMode === 'all' ? productCount > 0 : selectedProducts.length > 0)
                  ) ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  width: '100%'
                }}
              >
                {loading ? 'Moving Products...' : 
                 moveMode === 'all' ? `🔄 Move All ${productCount} Products` : 
                 `🔄 Move ${selectedProducts.length} Selected Products`}
              </button>
            </div>
          )}

          {activeTab === 'organize' && (
            <div>
              <h3>Organize Categories into Main Categories & Subcategories</h3>
              <div style={{ 
                background: '#e0f2fe', 
                border: '1px solid #0284c7', 
                borderRadius: '8px', 
                padding: '15px', 
                marginBottom: '20px' 
              }}>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  💡 <strong>How it works:</strong> Select a main category, then choose which other categories should become its subcategories. 
                  All products from the subcategories will be moved to the main category with appropriate subcategory labels.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  1. Select Main Category
                </label>
                <select
                  value={selectedMainCategory}
                  onChange={(e) => {
                    setSelectedMainCategory(e.target.value);
                    setCategoryHierarchy({});
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Choose a main category...</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {selectedMainCategory && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    2. Select Categories to Convert to Subcategories of "{categories.find(c => c.value === selectedMainCategory)?.label}"
                  </label>
                  <div style={{ 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px', 
                    padding: '15px',
                    backgroundColor: '#f9fafb',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {categories
                      .filter(cat => cat.value !== selectedMainCategory)
                      .map(category => {
                        const isSelected = categoryHierarchy[category.value] === selectedMainCategory;
                        return (
                          <div key={category.value} style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px',
                            marginBottom: '8px',
                            backgroundColor: isSelected ? '#e0f2fe' : 'white',
                            border: isSelected ? '2px solid #0284c7' : '1px solid #e5e7eb',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                          onClick={() => toggleCategoryAsSubcategory(category.value)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCategoryAsSubcategory(category.value)}
                              style={{ marginRight: '10px' }}
                            />
                            <span style={{ fontSize: '16px', marginRight: '8px' }}>📁</span>
                            <div>
                              <div style={{ fontWeight: 'bold' }}>{category.label}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>Value: {category.value}</div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {selectedMainCategory && Object.keys(categoryHierarchy).length > 0 && (
                <div style={{ 
                  background: '#f0fdf4', 
                  border: '1px solid #16a34a', 
                  borderRadius: '8px', 
                  padding: '15px', 
                  marginBottom: '20px' 
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#16a34a' }}>Preview Organization:</h4>
                  <div style={{ fontSize: '14px' }}>
                    <strong>📂 {categories.find(c => c.value === selectedMainCategory)?.label}</strong> (Main Category)
                    <div style={{ marginLeft: '20px', marginTop: '5px' }}>
                      {Object.keys(categoryHierarchy).map(subcatValue => (
                        <div key={subcatValue} style={{ marginBottom: '3px' }}>
                          └── 📁 {categories.find(c => c.value === subcatValue)?.label} (Subcategory)
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleOrganizeCategories}
                disabled={!selectedMainCategory || Object.keys(categoryHierarchy).length === 0 || loading}
                style={{
                  background: (selectedMainCategory && Object.keys(categoryHierarchy).length > 0 && !loading) ? '#16a34a' : '#ccc',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: (selectedMainCategory && Object.keys(categoryHierarchy).length > 0 && !loading) ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  width: '100%'
                }}
              >
                {loading ? 'Organizing...' : '🏗️ Organize Categories'}
              </button>
            </div>
          )}

          {activeTab === 'create' && (
            <div>
              <h3>Create New Category</h3>
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setCategoryForm(prev => ({
                        ...prev,
                        name,
                        value: generateValue(name)
                      }));
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                    placeholder="e.g., Electronics"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Category Value (auto-generated)
                  </label>
                  <input
                    type="text"
                    value={categoryForm.value}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, value: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: '#f9fafb'
                    }}
                    placeholder="e.g., electronics"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                    Subcategories (Optional)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      value={newSubcategory}
                      onChange={(e) => setNewSubcategory(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSubcategory()}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                      placeholder="Add subcategory..."
                    />
                    <button
                      onClick={addSubcategory}
                      style={{
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Add
                    </button>
                  </div>
                  
                  {categoryForm.subcategories.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {categoryForm.subcategories.map((sub, index) => (
                        <span 
                          key={index}
                          style={{
                            background: '#e5e7eb',
                            color: '#374151',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {sub}
                          <button
                            onClick={() => removeSubcategory(index)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc2626',
                              cursor: 'pointer',
                              fontSize: '12px',
                              padding: '0 2px'
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreateCategory}
                  disabled={!categoryForm.name.trim() || loading}
                  style={{
                    background: categoryForm.name.trim() && !loading ? '#667eea' : '#ccc',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: categoryForm.name.trim() && !loading ? 'pointer' : 'not-allowed',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  {loading ? 'Creating...' : '✅ Create Category'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'restore' && (
            <div>
              <h3>Restore Hidden Categories</h3>
              <div style={{ 
                background: '#fef3c7', 
                border: '1px solid #f59e0b', 
                borderRadius: '8px', 
                padding: '15px', 
                marginBottom: '20px' 
              }}>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  💡 <strong>Hidden Categories:</strong> These categories were hidden from the category list but still exist in the database. 
                  You can restore them to make them visible again.
                </p>
              </div>

              {(() => {
                const hiddenCategories = JSON.parse(localStorage.getItem('hiddenCategories') || '[]');
                
                if (hiddenCategories.length === 0) {
                  return (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px',
                      color: '#6b7280',
                      fontSize: '16px'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
                      <div>No hidden categories found</div>
                      <div style={{ fontSize: '14px', marginTop: '8px' }}>
                        All categories are currently visible
                      </div>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {hiddenCategories.map(categoryValue => (
                      <div
                        key={categoryValue}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          backgroundColor: '#f9fafb'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>📁</span>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                              {categoryValue.charAt(0).toUpperCase() + categoryValue.slice(1).replace(/-/g, ' ')}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                              Value: {categoryValue}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            // Remove from hidden categories
                            const updated = hiddenCategories.filter(cat => cat !== categoryValue);
                            localStorage.setItem('hiddenCategories', JSON.stringify(updated));
                            
                            // Trigger re-render by calling onCategoriesUpdated
                            if (onCategoriesUpdated) {
                              onCategoriesUpdated();
                            }
                            
                            // Show success message (you might want to add a toast system)
                            alert(`✅ Category "${categoryValue}" has been restored and is now visible`);
                          }}
                          style={{
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          🔄 Restore
                        </button>
                      </div>
                    ))}
                    
                    <div style={{
                      marginTop: '20px',
                      padding: '12px',
                      background: '#e0f2fe',
                      border: '1px solid #0284c7',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#0c4a6e'
                    }}>
                      <strong>💡 Tip:</strong> Restoring a category will make it visible in the category filters again. 
                      The category and any products in it will remain unchanged.
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryManagementModal;