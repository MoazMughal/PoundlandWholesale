import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminPost } from '../../utils/adminApi';
import { getApiUrl } from '../../utils/api';
import cacheManager from '../../utils/cacheManager';
import '../../styles/AdminProductForm.css';

const AddProduct = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Only GBP currency used - no conversion needed
  const currency = 'GBP';
  const currencySymbol = '£';
  
  // Get return category from URL params or location state
  const urlParams = new URLSearchParams(location.search);
  const returnCategory = location.state?.category || urlParams.get('returnCategory') || '';
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [createdProductName, setCreatedProductName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    shipping: 0, // Add shipping field
    category: '',
    brand: '',
    asin: '',
    sku: '',
    rating: 4.5,
    reviews: 0,
    stock: 0,
    dealUnits: 200, // Auto-calculated as 2400 / 12
    platformUnits: 2400, // Units for yearly profit calculation
    seller: '',
    isAmazonsChoice: false,
    status: 'active',
    description: '',
    features: [],
    subcategory: '',
    subSubcategory: '',
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [fetchingAsin, setFetchingAsin] = useState(false);
  const [asinError, setAsinError] = useState('');
  const [skuError, setSkuError] = useState('');
  const fileInputRef = useRef(null);
  const additionalFileInputRefs = useRef([null, null, null, null]); // Refs for 4 additional image inputs

  // Image validation function
  const validateImageFile = (file) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please select JPEG, PNG, GIF, or WebP images.'
      };
    }
    
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File too large. Please select images smaller than 5MB.'
      };
    }
    
    return { valid: true };
  };

  // No currency conversion needed - all prices in GBP

  // Dynamic categories loaded from API
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]); // subcategories for selected category
  const [subSubcategories, setSubSubcategories] = useState([]); // sub-subcategories for selected subcategory
  const [showSubSubcatPanel, setShowSubSubcatPanel] = useState(false);
  const [newSubSubcatName, setNewSubSubcatName] = useState('');
  const [subSubcatError, setSubSubcatError] = useState('');
  const [showSubcatPanel, setShowSubcatPanel] = useState(false);
  const [newSubcatName, setNewSubcatName] = useState('');
  const [renamingSubcat, setRenamingSubcat] = useState(null); // the old name being renamed
  const [renameSubcatValue, setRenameSubcatValue] = useState('');
  const [subcatError, setSubcatError] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showRenameCategoryInput, setShowRenameCategoryInput] = useState(false);
  const [renameCategoryName, setRenameCategoryName] = useState('');
  const [selectedCategoryToRename, setSelectedCategoryToRename] = useState('');
  const [showDeleteCategoryInput, setShowDeleteCategoryInput] = useState(false);
  const [selectedCategoryToDelete, setSelectedCategoryToDelete] = useState('');
  const [forceDeleteCategory, setForceDeleteCategory] = useState(false);

  useEffect(() => {
    fetchSellers();
    fetchCategories();
    
    // Auto-cleanup duplicates on page load (silent)
    const autoCleanupDuplicates = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        await fetch(getApiUrl('products/admin/cleanup-duplicate-categories'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        // Silent cleanup - no alert needed
        console.log('🧹 Auto-cleanup of duplicate categories completed');
      } catch (error) {
        console.log('Auto-cleanup failed, but continuing normally');
      }
    };
    
    // Run cleanup after a short delay to not block initial load
    setTimeout(autoCleanupDuplicates, 2000);
  }, []);

  const fetchSellers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl('sellers'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSellers(data.sellers || []);
      }
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      // Include Excel categories for admin use with proper parameters
      const response = await fetch(getApiUrl('products/public/categories?includeExcel=true&includeEmpty=true&deduplicate=true'));
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
        
        setCategories(deduplicatedCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to default categories if API fails
      setCategories([
        { value: 'electronics', label: 'Electronics' },
        { value: 'kitchen', label: 'Kitchen' },
        { value: 'home', label: 'Home & Decor' },
        { value: 'automotive', label: 'Automotive' }
      ]);
    }
  };

  const fetchSubcategories = async (categoryLabel) => {
    if (!categoryLabel) { setSubcategories([]); setSubSubcategories([]); return; }
    try {
      const res = await fetch(getApiUrl(`products/public/subcategories/${encodeURIComponent(categoryLabel)}`));
      if (res.ok) {
        const data = await res.json();
        setSubcategories(data.subcategories || []);
      } else {
        setSubcategories([]);
      }
    } catch { setSubcategories([]); }
    setSubSubcategories([]);
  };

  const fetchSubSubcategories = async (subcategoryLabel) => {
    if (!subcategoryLabel) { setSubSubcategories([]); return; }
    try {
      const res = await fetch(getApiUrl(`products/public/subcategories/${encodeURIComponent(subcategoryLabel)}`));
      if (res.ok) {
        const data = await res.json();
        setSubSubcategories(data.subcategories || []);
      } else {
        setSubSubcategories([]);
      }
    } catch { setSubSubcategories([]); }
  };

  // Save updated subcategory list to backend
  const saveSubcategories = async (newList) => {
    if (!formData.category) return;
    const token = localStorage.getItem('adminToken');
    try {
      await fetch(getApiUrl(`products/admin/category-hierarchy/${encodeURIComponent(formData.category)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ children: newList })
      });
      setSubcategories(newList);
      localStorage.setItem('categoriesUpdated', Date.now().toString());
      window.dispatchEvent(new CustomEvent('refreshCategories'));
    } catch { alert('Failed to save subcategories'); }
  };

  const handleAddSubcat = async () => {
    const val = newSubcatName.trim();
    if (!val) return;
    if (subcategories.map(s => s.toLowerCase()).includes(val.toLowerCase())) {
      setSubcatError(`"${val}" already exists.`);
      return;
    }
    const updated = [...subcategories, val];
    await saveSubcategories(updated);
    setFormData(prev => ({ ...prev, subcategory: val, subSubcategory: '' }));
    fetchSubSubcategories(val);
    setNewSubcatName('');
    setSubcatError('');
  };

  const handleDeleteSubcat = async (name) => {
    if (!confirm(`Delete subcategory "${name}"?`)) return;
    const updated = subcategories.filter(s => s !== name);
    await saveSubcategories(updated);
    if (formData.subcategory === name) setFormData(prev => ({ ...prev, subcategory: '' }));
  };

  const handleRenameSubcat = async (oldName) => {
    const val = renameSubcatValue.trim();
    if (!val || val === oldName) { setRenamingSubcat(null); return; }
    if (subcategories.map(s => s.toLowerCase()).includes(val.toLowerCase())) {
      setSubcatError(`"${val}" already exists.`);
      return;
    }
    const updated = subcategories.map(s => s === oldName ? val : s);
    await saveSubcategories(updated);
    if (formData.subcategory === oldName) setFormData(prev => ({ ...prev, subcategory: val }));
    setRenamingSubcat(null);
    setRenameSubcatValue('');
    setSubcatError('');
  };

  // ── Sub-subcategory helpers ──
  const saveSubSubcategories = async (newList) => {
    if (!formData.subcategory) return;
    const token = localStorage.getItem('adminToken');
    try {
      await fetch(getApiUrl(`products/admin/category-hierarchy/${encodeURIComponent(formData.subcategory)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ children: newList })
      });
      setSubSubcategories(newList);
      localStorage.setItem('categoriesUpdated', Date.now().toString());
      window.dispatchEvent(new CustomEvent('refreshCategories'));
    } catch { alert('Failed to save sub-subcategories'); }
  };

  const handleAddSubSubcat = async () => {
    const val = newSubSubcatName.trim();
    if (!val) return;
    if (subSubcategories.map(s => s.toLowerCase()).includes(val.toLowerCase())) {
      setSubSubcatError(`"${val}" already exists.`); return;
    }
    const updated = [...subSubcategories, val];
    await saveSubSubcategories(updated);
    setFormData(prev => ({ ...prev, subSubcategory: val }));
    setNewSubSubcatName('');
    setSubSubcatError('');
  };

  const handleDeleteSubSubcat = async (name) => {
    if (!confirm(`Delete sub-subcategory "${name}"?`)) return;
    const updated = subSubcategories.filter(s => s !== name);
    await saveSubSubcategories(updated);
    if (formData.subSubcategory === name) setFormData(prev => ({ ...prev, subSubcategory: '' }));
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    // Check if category already exists (case-insensitive)
    const existingCategory = categories.find(cat => 
      cat.label.toLowerCase() === newCategoryName.trim().toLowerCase()
    );
    
    if (existingCategory) {
      alert(`Category "${existingCategory.label}" already exists. Please choose a different name.`);
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl('products/public/categories'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ category: newCategoryName.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        const newCategory = data.category;
        
        // Add new category to the list if it doesn't already exist
        setCategories(prev => {
          const exists = prev.some(cat => cat.label.toLowerCase() === newCategory.label.toLowerCase());
          if (exists) {
            return prev;
          }
          return [...prev, newCategory];
        });
        
        // Select the new category using the normalized value
        setFormData(prev => ({ ...prev, category: newCategory.label }));
        
        // Reset the input
        setNewCategoryName('');
        setShowNewCategoryInput(false);
        
        // Trigger category refresh in headers
        localStorage.setItem('categoriesUpdated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('refreshCategories'));
        
        alert(`✅ Category "${newCategory.label}" added successfully!`);
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error adding category:', error);
      alert('❌ Failed to add category. Please try again.');
    }
  };

  const handleRenameCategory = async () => {
    if (!renameCategoryName.trim() || !selectedCategoryToRename) {
      alert('Please enter a new category name');
      return;
    }

    const categoryToRename = categories.find(cat => cat.value === selectedCategoryToRename);
    if (!categoryToRename) {
      alert('Selected category not found');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl(`products/admin/categories/${encodeURIComponent(categoryToRename.label)}/rename`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newCategoryName: renameCategoryName.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update the category in the list
        if (data.merged) {
          // If categories were merged, remove the old category and keep the existing one
          setCategories(prev => prev.filter(cat => 
            cat.label.toLowerCase() !== categoryToRename.label.toLowerCase()
          ));
        } else {
          // If renamed, update the category name
          setCategories(prev => prev.map(cat => 
            cat.value === selectedCategoryToRename 
              ? { ...cat, label: data.newCategoryName }
              : cat
          ));
        }
        
        // Update form data if the renamed category was selected
        if (formData.category === categoryToRename.label) {
          setFormData(prev => ({ ...prev, category: data.newCategoryName }));
        }
        
        // Reset the input
        setRenameCategoryName('');
        setShowRenameCategoryInput(false);
        setSelectedCategoryToRename('');
        
        // Trigger category refresh in headers
        localStorage.setItem('categoriesUpdated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('refreshCategories'));
        
        if (data.merged) {
          alert(`✅ Categories merged successfully! "${data.oldCategoryName}" has been merged into "${data.newCategoryName}"\n\nProducts updated: ${data.updatedProducts}\nExcel products updated: ${data.updatedExcelProducts}`);
        } else {
          alert(`✅ Category renamed successfully from "${data.oldCategoryName}" to "${data.newCategoryName}"\n\nProducts updated: ${data.updatedProducts}\nExcel products updated: ${data.updatedExcelProducts}`);
        }
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error renaming category:', error);
      alert('❌ Failed to rename category. Please try again.');
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategoryToDelete) {
      alert('Please select a category to delete');
      return;
    }

    const categoryToDelete = categories.find(cat => cat.value === selectedCategoryToDelete);
    if (!categoryToDelete) {
      alert('Selected category not found');
      return;
    }

    const confirmMessage = forceDeleteCategory 
      ? `⚠️ Are you sure you want to FORCE DELETE the category "${categoryToDelete.label}"? This will permanently delete ALL products in this category and cannot be undone.`
      : `Are you sure you want to delete the category "${categoryToDelete.label}"? This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const url = getApiUrl(`products/admin/categories/${encodeURIComponent(categoryToDelete.label)}${forceDeleteCategory ? '?force=true' : ''}`);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Remove the category from the list
        setCategories(prev => prev.filter(cat => cat.value !== selectedCategoryToDelete));
        
        // Reset form category if it was the deleted one
        if (formData.category === categoryToDelete.label) {
          setFormData(prev => ({ ...prev, category: '' }));
        }
        
        // Reset the input
        setSelectedCategoryToDelete('');
        setShowDeleteCategoryInput(false);
        setForceDeleteCategory(false);
        
        // Trigger category refresh in headers
        localStorage.setItem('categoriesUpdated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('refreshCategories'));
        
        alert(`✅ ${data.message}`);
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('❌ Failed to delete category. Please try again.');
    }
  };

  const handleCleanupDuplicates = async () => {
    if (!confirm('This will automatically merge duplicate categories (like "Home & Kitchen" and "Home & kitchen"). Continue?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl('products/admin/cleanup-duplicate-categories'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Refresh categories
        await fetchCategories();
        
        // Trigger category refresh in headers
        localStorage.setItem('categoriesUpdated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('refreshCategories'));
        
        alert(`✅ ${data.message}\n\nProducts updated: ${data.totalProductsUpdated}\nExcel products updated: ${data.excelProductsUpdated}`);
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
      alert('❌ Failed to cleanup duplicates. Please try again.');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      
      // Auto-calculate dealUnits when platformUnits changes
      if (name === 'platformUnits') {
        const platformUnits = parseInt(value) || 2400;
        newData.dealUnits = Math.floor(platformUnits / 6);
      }

      // When dealUnits is directly edited, back-calculate platformUnits
      if (name === 'dealUnits') {
        const dealUnits = parseInt(value) || 1;
        newData.platformUnits = dealUnits * 6;
      }

      // When category changes, reset subcategory and fetch new subcategories
      if (name === 'category') {
        newData.subcategory = '';
        newData.subSubcategory = '';
        fetchSubcategories(value);
      }

      // When subcategory changes, reset sub-subcategory and fetch new sub-subcategories
      if (name === 'subcategory') {
        newData.subSubcategory = '';
        fetchSubSubcategories(value);
      }
      
      return newData;
    });
  };

  // Fetch product details by ASIN
  const fetchProductByAsin = async (asin) => {
    if (!asin || asin.length !== 10) return;
    
    setFetchingAsin(true);
    setAsinError('');
    
    try {
      const token = localStorage.getItem('adminToken');
      
      // Check if ASIN already exists in database
      const checkResponse = await fetch(getApiUrl(`products/check-asin/${asin}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.exists) {
          if (checkData.blocked) {
            setAsinError(`❌ ${checkData.message}`);
          } else {
            setAsinError('⚠️ This ASIN is already used by another product');
          }
          setFetchingAsin(false);
          return;
        }
      }
      
      // Fetch from excel-products
      const response = await fetch(getApiUrl(`excel/asin/${asin}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.product) {
          const product = data.product;
          
          // Auto-fill form with fetched data
          const fetchedCategory = product.category;
          let selectedCategory = fetchedCategory;
          
          // Check if fetched category matches any existing category (case-insensitive)
          if (fetchedCategory) {
            const matchingCategory = categories.find(cat => 
              cat.label.toLowerCase() === fetchedCategory.toLowerCase()
            );
            
            if (matchingCategory) {
              selectedCategory = matchingCategory.label; // Use existing category's exact case
              console.log(`📂 Matched fetched category "${fetchedCategory}" to existing category "${matchingCategory.label}"`);
            } else {
              console.log(`📂 New category "${fetchedCategory}" will be added`);
            }
          }
          
          setFormData(prev => ({
            ...prev,
            name: product.name || prev.name,
            price: product.price || prev.price,
            category: selectedCategory || prev.category,
            brand: product.brand || prev.brand,
            rating: product.rating || prev.rating,
            reviews: product.reviews || prev.reviews,
            description: product.description || prev.description,
            features: product.features || prev.features
          }));
          
          // Set images if available
          if (product.images && product.images.length > 0) {
            console.log('📷 Setting images from fetched product:', product.images);
            
            // Validate and filter working image URLs
            const validImages = [];
            for (const imageUrl of product.images.slice(0, 5)) {
              if (imageUrl && imageUrl.trim()) {
                validImages.push(imageUrl.trim());
              }
            }
            
            // If we have valid images, set them
            if (validImages.length > 0) {
              setImageUrls(validImages);
            } else {
              console.log('⚠️ No valid images found in fetched product data');
              // Try to construct Amazon image URLs as fallback
              if (product.asin) {
                const fallbackUrls = [
                  `https://images-na.ssl-images-amazon.com/images/P/${product.asin}.01._SCLZZZZZZZ_SX500_.jpg`,
                  `https://m.media-amazon.com/images/I/${product.asin}._AC_SL1500_.jpg`,
                  `https://images-na.ssl-images-amazon.com/images/I/${product.asin}._AC_SL1500_.jpg`
                ];
                setImageUrls(fallbackUrls.slice(0, 3)); // Max 3 fallback images
                console.log('📷 Set fallback Amazon image URLs:', fallbackUrls.slice(0, 3));
              }
            }
          } else {
            console.log('⚠️ No images found in fetched product data');
            // Try to construct Amazon image URLs as fallback
            if (product.asin) {
              const fallbackUrls = [
                `https://images-na.ssl-images-amazon.com/images/P/${product.asin}.01._SCLZZZZZZZ_SX500_.jpg`,
                `https://m.media-amazon.com/images/I/${product.asin}._AC_SL1500_.jpg`,
                `https://images-na.ssl-images-amazon.com/images/I/${product.asin}._AC_SL1500_.jpg`
              ];
              setImageUrls(fallbackUrls.slice(0, 3)); // Max 3 fallback images
              console.log('📷 Set fallback Amazon image URLs:', fallbackUrls.slice(0, 3));
            }
          }
          
          // Show success message with source information
          const sourceMessage = product.source === 'ExcelManager' 
            ? `✅ Product details fetched from Excel Manager (${product.uploadName || 'Database'})!`
            : `✅ Product details fetched from ${product.source}!`;
          
          alert(sourceMessage);
        } else {
          setAsinError('⚠️ ASIN not found in Excel Manager or uploaded files');
        }
      } else {
        setAsinError('⚠️ ASIN not found in Excel Manager or uploaded files');
      }
    } catch (error) {
      console.error('Error fetching ASIN:', error);
      setAsinError('❌ Error fetching product details');
    } finally {
      setFetchingAsin(false);
    }
  };

  // Handle ASIN input change with debounce
  const handleAsinChange = (e) => {
    const asin = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, asin }));
    setAsinError('');
    
    // Auto-fetch when ASIN is 10 characters
    if (asin.length === 10) {
      setTimeout(() => fetchProductByAsin(asin), 500);
    }
  };

  // Handle SKU input change with validation
  const handleSkuChange = (e) => {
    const sku = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, sku }));
    setSkuError('');
    
    // Validate SKU when it has content
    if (sku.trim().length > 0) {
      setTimeout(() => validateSku(sku), 500);
    }
  };

  // Validate SKU for duplicates
  const validateSku = async (sku) => {
    if (!sku || sku.trim().length === 0) return;
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl(`products/check-sku/${sku}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const checkData = await response.json();
        if (checkData.exists) {
          if (checkData.blocked) {
            setSkuError(`❌ ${checkData.message}`);
          } else {
            setSkuError('⚠️ This SKU is already used by another product');
          }
        }
      }
    } catch (error) {
      console.error('Error checking SKU:', error);
    }
  };



  // Image handling functions
  const handleImageSelect = async (e, index = 0) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(`❌ ${validation.error}`);
      return;
    }

    const newImageFiles = [...imageFiles];
    const newImageUrls = [...imageUrls];
    
    newImageFiles[index] = file;
    newImageUrls[index] = URL.createObjectURL(file);
    
    setImageFiles(newImageFiles);
    setImageUrls(newImageUrls);
  };

  const removeImage = (index) => {
    const newImageFiles = [...imageFiles];
    const newImageUrls = [...imageUrls];
    
    if (newImageUrls[index]) {
      URL.revokeObjectURL(newImageUrls[index]);
    }
    
    newImageFiles[index] = null;
    newImageUrls[index] = '';
    
    setImageFiles(newImageFiles);
    setImageUrls(newImageUrls);
    
    // Reset the file input
    if (index === 0 && fileInputRef.current) {
      fileInputRef.current.value = '';
    } else if (additionalFileInputRefs.current[index - 1]) {
      additionalFileInputRefs.current[index - 1].value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Create FormData to send files to server
      const formDataToSend = new FormData();
      
      // Add all form fields
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('description', formData.description || '');
      
      // Handle features array properly - only send if not empty
      const featuresArray = formData.features || [];
      if (featuresArray.length > 0) {
        formDataToSend.append('features', JSON.stringify(featuresArray));
      }
      formDataToSend.append('price', parseFloat(formData.price) || 0);
      formDataToSend.append('shipping', parseFloat(formData.shipping) || 0);
      formDataToSend.append('currency', 'GBP');
      formDataToSend.append('category', formData.category);
      if (formData.subcategory) formDataToSend.append('subcategory', formData.subcategory);
      if (formData.subSubcategory) formDataToSend.append('subsubcategory', formData.subSubcategory);
      formDataToSend.append('brand', formData.brand || '');
      formDataToSend.append('asin', formData.asin.trim() || '');
      formDataToSend.append('sku', formData.sku.trim() || '');
      formDataToSend.append('rating', parseFloat(formData.rating) || 4.5);
      formDataToSend.append('reviews', parseInt(formData.reviews) || 0);
      formDataToSend.append('stock', parseInt(formData.stock) || 0);
      formDataToSend.append('dealUnits', parseInt(formData.dealUnits) || Math.floor((formData.platformUnits || 2400) / 12));
      formDataToSend.append('platformUnits', parseInt(formData.platformUnits) || (parseInt(formData.dealUnits) || 200) * 12);
      if (formData.seller && formData.seller.trim() !== '') {
        formDataToSend.append('seller', formData.seller);
      }
      formDataToSend.append('isAmazonsChoice', formData.isAmazonsChoice || false);
      formDataToSend.append('isBestSeller', false);
      formDataToSend.append('isLatestDeal', false);
      formDataToSend.append('showOnHome', false);
      formDataToSend.append('status', formData.status || 'active');
      formDataToSend.append('approvalStatus', 'pending');
      formDataToSend.append('isAdminProduct', true);
      formDataToSend.append('listedBy', 'admin');

      // Add image files (these will be uploaded to Cloudinary by the server)
      // Send files in slot order — only actual File objects
      const filesToUpload = imageFiles.filter(file => file instanceof File);
      if (filesToUpload.length > 0) {
        setUploadingImages(true);
        filesToUpload.forEach((file) => {
          formDataToSend.append('images', file);
        });
      }

      // Add any image URLs that were fetched from ASIN (not uploaded files)
      // These are existing URLs in slots where no new file was selected
      const fetchedImageUrls = imageUrls
        .filter((url, index) => url && url.trim() !== '' && !(imageFiles[index] instanceof File));
      
      if (fetchedImageUrls.length > 0) {
        formDataToSend.append('fetchedImages', JSON.stringify(fetchedImageUrls));
      }

      // Send to server with files - server will handle Cloudinary upload
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl('products'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type - let browser set it for FormData
        },
        body: formDataToSend
      });
      
      if (response.ok) {
        const createdProduct = await response.json();
        
        console.log('✅ Product created successfully with Cloudinary images:', {
          id: createdProduct._id,
          name: createdProduct.name,
          images: createdProduct.images?.length || 0,
          cloudinaryImages: createdProduct.images?.filter(img => img.includes('cloudinary.com')).length || 0
        });
        
        // Show modern success toast for pending approval
        setCreatedProductName(createdProduct.name || formData.name);
        setShowSuccessToast(true);
        
        // Auto-hide toast after 5 seconds
        setTimeout(() => {
          setShowSuccessToast(false);
        }, 5000);
        
        // Clear cache
        cacheManager.clearAll();
        
        // Trigger category refresh in headers (in case new category was added)
        localStorage.setItem('categoriesUpdated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('refreshCategories'));
        
        // Navigate to approval page instead of products list
        navigate('/admin/approval', {
          state: { 
            newProduct: createdProduct,
            message: 'Product submitted for approval successfully!'
          }
        });
      } else {
        const errorData = await response.json();
        console.error('❌ Server error:', errorData);
        if (response.status === 409) {
          // ASIN duplicate — scroll to ASIN field and highlight it
          setAsinError(errorData.message || 'This ASIN already exists.');
          const asinField = document.querySelector('input[name="asin"], input[placeholder*="ASIN"]');
          if (asinField) {
            asinField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            asinField.focus();
          }
        } else {
          alert(`❌ Error creating product: ${errorData.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('❌ Error creating product:', error);
      alert('❌ Failed to create product. Please try again.');
    } finally {
      setSaving(false);
      setUploadingImages(false);
    }
  };

  return (
    <div className="admin-product-form">
      <header className="form-header">
        <h1 style={{ paddingLeft: '12px' }}>➕ Add New Product</h1>
        <button 
          onClick={() => {
            const returnUrl = returnCategory 
              ? `/admin/products?category=${returnCategory}`
              : '/admin/products';
            navigate(returnUrl, {
              state: { category: returnCategory }
            });
          }} 
          className="back-btn"
          style={{ marginRight: '12px' }}
        >
          ← Back to Products
        </button>
      </header>

      <form onSubmit={handleSubmit} className="product-form">
        <div className="form-section">
          <h2>📝 Basic Information</h2>
          
          <div className="form-group">
            <label>Product Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter product name"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 250px', minWidth: '200px' }}>
                  <select 
                    name="category" 
                    value={formData.category} 
                    onChange={handleChange} 
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '15px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      background: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontWeight: '500'
                    }}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.label}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                  style={{
                    padding: '12px 18px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                  title="Add new category"
                >
                  + New
                </button>
                <button
                  type="button"
                  onClick={() => setShowRenameCategoryInput(!showRenameCategoryInput)}
                  style={{
                    padding: '12px 18px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                  title="Rename existing category"
                >
                  ✏️ Rename
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteCategoryInput(!showDeleteCategoryInput)}
                  style={{
                    padding: '12px 18px',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                  title="Delete existing category"
                >
                  🗑️ Delete
                </button>
              </div>
              
              {/* Show selected category with spacing */}
              {formData.category && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  border: '2px solid #0ea5e9',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '20px' }}>📂</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: '600', marginBottom: '2px' }}>
                      Selected Category
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#075985' }}>
                      {formData.category}
                    </div>
                  </div>
                </div>
              )}
              
              {showNewCategoryInput && (
                <div style={{ 
                  marginTop: '10px', 
                  padding: '15px', 
                  background: '#f8f9fa', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '6px' 
                }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    New Category Name
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter new category name"
                      style={{
                        flex: 1,
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '0.9rem'
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewCategory();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddNewCategory}
                      style={{
                        padding: '10px 20px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600'
                      }}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCategoryInput(false);
                        setNewCategoryName('');
                      }}
                      style={{
                        padding: '10px 15px',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                  <small style={{ color: '#6c757d', fontSize: '0.8rem', marginTop: '5px', display: 'block' }}>
                    The new category will be available for all future products and will appear in Amazon's Choice page.
                  </small>
                </div>
              )}

              {showRenameCategoryInput && (
                <div style={{ 
                  marginTop: '10px', 
                  padding: '15px', 
                  background: '#fff3cd', 
                  border: '1px solid #ffeaa7', 
                  borderRadius: '6px' 
                }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    Rename Category
                  </label>
                  <div style={{ marginBottom: '10px' }}>
                    <select
                      value={selectedCategoryToRename}
                      onChange={(e) => setSelectedCategoryToRename(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        marginBottom: '8px'
                      }}
                    >
                      <option value="">Select category to rename</option>
                      {categories.filter(cat => cat.value !== 'all').map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={renameCategoryName}
                      onChange={(e) => setRenameCategoryName(e.target.value)}
                      placeholder="Enter new category name"
                      style={{
                        flex: 1,
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '0.9rem'
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRenameCategory();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleRenameCategory}
                      disabled={!selectedCategoryToRename || !renameCategoryName.trim()}
                      style={{
                        padding: '10px 20px',
                        background: !selectedCategoryToRename || !renameCategoryName.trim() ? '#6c757d' : '#ffc107',
                        color: !selectedCategoryToRename || !renameCategoryName.trim() ? '#fff' : '#212529',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: !selectedCategoryToRename || !renameCategoryName.trim() ? 'not-allowed' : 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600'
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRenameCategoryInput(false);
                        setRenameCategoryName('');
                        setSelectedCategoryToRename('');
                      }}
                      style={{
                        padding: '10px 15px',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                  <small style={{ color: '#856404', fontSize: '0.8rem', marginTop: '5px', display: 'block' }}>
                    Renaming will update all products in this category and refresh the website navigation.
                  </small>
                </div>
              )}

              {showDeleteCategoryInput && (
                <div style={{ 
                  marginTop: '10px', 
                  padding: '15px', 
                  background: '#f8d7da', 
                  border: '1px solid #f5c6cb', 
                  borderRadius: '6px' 
                }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#721c24' }}>
                    ⚠️ Delete Category
                  </label>
                  <div style={{ marginBottom: '10px' }}>
                    <select
                      value={selectedCategoryToDelete}
                      onChange={(e) => setSelectedCategoryToDelete(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        marginBottom: '8px'
                      }}
                    >
                      <option value="">Select category to delete</option>
                      {categories.filter(cat => cat.value !== 'all').map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem' }}>
                      <input
                        type="checkbox"
                        checked={forceDeleteCategory}
                        onChange={(e) => setForceDeleteCategory(e.target.checked)}
                      />
                      Force delete (removes all products)
                    </label>
                    <button
                      type="button"
                      onClick={handleDeleteCategory}
                      disabled={!selectedCategoryToDelete}
                      style={{
                        padding: '8px 16px',
                        background: !selectedCategoryToDelete ? '#6c757d' : '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: !selectedCategoryToDelete ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteCategoryInput(false);
                        setSelectedCategoryToDelete('');
                        setForceDeleteCategory(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                  <small style={{ color: '#721c24', fontSize: '0.8rem', marginTop: '5px', display: 'block' }}>
                    <strong>Warning:</strong> This will permanently delete the category and affect all related products and navigation.
                  </small>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Sub Category</label>

              {!formData.category ? (
                <div style={{ padding: '10px 14px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '8px', fontSize: '13px', color: '#9ca3af' }}>
                  Select a main category first to manage subcategories.
                </div>
              ) : (
                <div style={{ border: '2px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>

                  {/* ── Dropdown row ── */}
                  <div style={{ display: 'flex', gap: '8px', padding: '10px', background: '#f9fafb', alignItems: 'center' }}>
                    <select
                      name="subcategory"
                      value={formData.subcategory}
                      onChange={handleChange}
                      style={{
                        flex: 1, padding: '10px 14px', fontSize: '14px',
                        border: '1.5px solid #d1d5db', borderRadius: '7px',
                        background: 'white', cursor: 'pointer', fontWeight: '500'
                      }}
                    >
                      <option value="">-- Select Sub Category --</option>
                      {subcategories.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => { setShowSubcatPanel(p => !p); setSubcatError(''); setNewSubcatName(''); setRenamingSubcat(null); }}
                      title="Manage subcategories"
                      style={{
                        padding: '10px 14px', borderRadius: '7px', border: 'none',
                        background: showSubcatPanel ? '#6366f1' : '#e0e7ff',
                        color: showSubcatPanel ? '#fff' : '#4338ca',
                        fontWeight: '700', cursor: 'pointer', fontSize: '13px',
                        whiteSpace: 'nowrap', transition: 'all 0.2s'
                      }}
                    >
                      ⚙️ Manage
                    </button>
                  </div>

                  {/* ── Selected badge ── */}
                  {formData.subcategory && (
                    <div style={{ padding: '6px 12px', background: '#f0fdf4', borderTop: '1px solid #bbf7d0', fontSize: '12px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📁</span>
                      <span>Selected: <strong>{formData.subcategory}</strong></span>
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, subcategory: '' }))}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: '700', fontSize: '14px' }}>×</button>
                    </div>
                  )}

                  {/* ── Management panel ── */}
                  {showSubcatPanel && (
                    <div style={{ padding: '12px', borderTop: '1px solid #e5e7eb', background: '#fff' }}>

                      {/* Existing subcategories list */}
                      {subcategories.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Existing Subcategories
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {subcategories.map(sub => (
                              <div key={sub} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                {renamingSubcat === sub ? (
                                  <>
                                    <input
                                      type="text"
                                      value={renameSubcatValue}
                                      onChange={e => { setRenameSubcatValue(e.target.value); setSubcatError(''); }}
                                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleRenameSubcat(sub); } if (e.key === 'Escape') setRenamingSubcat(null); }}
                                      autoFocus
                                      style={{ flex: 1, padding: '4px 8px', border: '1.5px solid #6366f1', borderRadius: '5px', fontSize: '13px' }}
                                    />
                                    <button type="button" onClick={() => handleRenameSubcat(sub)}
                                      style={{ padding: '4px 10px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                                      Save
                                    </button>
                                    <button type="button" onClick={() => setRenamingSubcat(null)}
                                      style={{ padding: '4px 8px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>
                                      ✕
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span style={{ flex: 1, fontSize: '13px', fontWeight: '500', color: '#1f2937' }}>{sub}</span>
                                    <button type="button"
                                      onClick={() => { setFormData(prev => ({ ...prev, subcategory: sub, subSubcategory: '' })); fetchSubSubcategories(sub); }}
                                      title="Select"
                                      style={{ padding: '3px 8px', background: formData.subcategory === sub ? '#10b981' : '#e0f2fe', color: formData.subcategory === sub ? '#fff' : '#0369a1', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                                      {formData.subcategory === sub ? '✓' : 'Select'}
                                    </button>
                                    <button type="button"
                                      onClick={() => { setRenamingSubcat(sub); setRenameSubcatValue(sub); setSubcatError(''); }}
                                      title="Rename"
                                      style={{ padding: '3px 8px', background: '#fef3c7', color: '#92400e', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                                      ✏️
                                    </button>
                                    <button type="button"
                                      onClick={() => handleDeleteSubcat(sub)}
                                      title="Delete"
                                      style={{ padding: '3px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                                      🗑️
                                    </button>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Error */}
                      {subcatError && (
                        <div style={{ padding: '6px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', color: '#dc2626', marginBottom: '8px' }}>
                          {subcatError}
                        </div>
                      )}

                      {/* Add new subcategory */}
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Add New Subcategory
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          value={newSubcatName}
                          onChange={e => { setNewSubcatName(e.target.value); setSubcatError(''); }}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubcat(); } }}
                          placeholder={`e.g. Mobiles, Laptops…`}
                          style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #d1d5db', borderRadius: '7px', fontSize: '13px' }}
                        />
                        <button type="button" onClick={handleAddSubcat}
                          style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                          + Add
                        </button>
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '11px', color: '#9ca3af' }}>
                        Subcategories are shared across all products in <strong>{formData.category}</strong>.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sub-Subcategory — always shown when a subcategory is selected */}
            {formData.subcategory && (
              <div className="form-group">
                <label>Sub-Subcategory <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '400' }}>(optional)</span></label>
                <div style={{ border: '2px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>

                  {/* Dropdown + Manage button */}
                  <div style={{ display: 'flex', gap: '8px', padding: '10px', background: '#f9fafb', alignItems: 'center' }}>
                    <select
                      name="subSubcategory"
                      value={formData.subSubcategory}
                      onChange={handleChange}
                      style={{ flex: 1, padding: '10px 14px', fontSize: '14px', border: '1.5px solid #d1d5db', borderRadius: '7px', background: 'white', cursor: 'pointer', fontWeight: '500' }}
                    >
                      <option value="">-- Select Sub-Subcategory --</option>
                      {subSubcategories.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => { setShowSubSubcatPanel(p => !p); setSubSubcatError(''); setNewSubSubcatName(''); }}
                      style={{
                        padding: '10px 14px', borderRadius: '7px', border: 'none',
                        background: showSubSubcatPanel ? '#7c3aed' : '#ede9fe',
                        color: showSubSubcatPanel ? '#fff' : '#6d28d9',
                        fontWeight: '700', cursor: 'pointer', fontSize: '13px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      ⚙️ Manage
                    </button>
                  </div>

                  {/* Selected badge */}
                  {formData.subSubcategory && (
                    <div style={{ padding: '6px 12px', background: '#f0fdf4', borderTop: '1px solid #bbf7d0', fontSize: '12px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📂</span>
                      <span>Selected: <strong>{formData.subSubcategory}</strong></span>
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, subSubcategory: '' }))}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: '700', fontSize: '14px' }}>×</button>
                    </div>
                  )}

                  {/* Management panel */}
                  {showSubSubcatPanel && (
                    <div style={{ padding: '12px', borderTop: '1px solid #e5e7eb', background: '#fff' }}>
                      {subSubcategories.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Existing Sub-Subcategories
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {subSubcategories.map(sub => (
                              <div key={sub} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                <span style={{ flex: 1, fontSize: '13px', fontWeight: '500', color: '#1f2937' }}>↳ {sub}</span>
                                <button type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, subSubcategory: sub }))}
                                  style={{ padding: '3px 8px', background: formData.subSubcategory === sub ? '#10b981' : '#e0f2fe', color: formData.subSubcategory === sub ? '#fff' : '#0369a1', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                                  {formData.subSubcategory === sub ? '✓' : 'Select'}
                                </button>
                                <button type="button" onClick={() => handleDeleteSubSubcat(sub)}
                                  style={{ padding: '3px 8px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                                  🗑️
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {subSubcatError && (
                        <div style={{ padding: '6px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', color: '#dc2626', marginBottom: '8px' }}>
                          {subSubcatError}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Add New Sub-Subcategory
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          value={newSubSubcatName}
                          onChange={e => { setNewSubSubcatName(e.target.value); setSubSubcatError(''); }}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubSubcat(); } }}
                          placeholder={`e.g. Dresses, Tops…`}
                          style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #d1d5db', borderRadius: '7px', fontSize: '13px' }}
                        />
                        <button type="button" onClick={handleAddSubSubcat}
                          style={{ padding: '8px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                          + Add
                        </button>
                      </div>
                      <div style={{ marginTop: '6px', fontSize: '11px', color: '#9ca3af' }}>
                        Sub-subcategories of <strong>{formData.subcategory}</strong>.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Brand</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="Enter brand name"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>ASIN (Amazon Standard Identification Number)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  name="asin"
                  value={formData.asin}
                  onChange={handleAsinChange}
                  placeholder="Enter ASIN (e.g., B08N5WRWNW)"
                  maxLength="10"
                  style={{
                    textTransform: 'uppercase',
                    fontFamily: 'monospace',
                    letterSpacing: '1px',
                    paddingRight: fetchingAsin ? '40px' : '12px'
                  }}
                />
                {fetchingAsin && (
                  <div style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '14px'
                  }}>
                    ⏳
                  </div>
                )}
              </div>
              {asinError && (
                <small style={{ color: '#dc3545', fontWeight: 'bold' }}>{asinError}</small>
              )}
              {!asinError && (
                <small>Optional: 10-character Amazon product identifier. Auto-fetches details when entered.</small>
              )}
            </div>

            <div className="form-group">
              <label>SKU (Stock Keeping Unit) *</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleSkuChange}
                required
                placeholder="Enter unique SKU (e.g., SKU123456ABC)"
                style={{
                  textTransform: 'uppercase',
                  fontFamily: 'monospace',
                  letterSpacing: '1px'
                }}
              />
              {skuError && (
                <small style={{ color: '#dc3545', fontWeight: 'bold' }}>{skuError}</small>
              )}
              {!skuError && (
                <small>Enter a unique identifier for inventory management.</small>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Price (£) *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
              />
              <small>Base price per unit</small>
            </div>

            <div className="form-group">
              <label>Shipping (£)</label>
              <input
                type="number"
                name="shipping"
                value={formData.shipping || 0}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
              <small>Shipping cost per unit</small>
            </div>

            <div className="form-group">
              <label>Total Price (£)</label>
              <div style={{
                padding: '10px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                color: '#28a745'
              }}>
                £{((parseFloat(formData.price) || 0) + (parseFloat(formData.shipping) || 0)).toFixed(2)}
              </div>
              <small>Price + Shipping = Total</small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Rating (0-5)</label>
              <input
                type="number"
                name="rating"
                value={formData.rating}
                onChange={handleChange}
                min="0"
                max="5"
                step="0.1"
                placeholder="4.5"
              />
            </div>

            <div className="form-group">
              <label>Reviews</label>
              <input
                type="number"
                name="reviews"
                value={formData.reviews}
                onChange={handleChange}
                min="0"
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Stock Quantity *</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                required
                min="0"
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Platform Units (Yearly)</label>
              <input
                type="number"
                name="platformUnits"
                value={formData.platformUnits}
                onChange={handleChange}
                min="12"
                step="12"
                placeholder="e.g. 2400"
              />
              <small>Total yearly units. No of Deal Units = this ÷ 6.</small>
            </div>

            <div className="form-group">
              <label>No of Deal Units</label>
              <input
                type="number"
                name="dealUnits"
                value={formData.dealUnits}
                readOnly
                style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                min="1"
                placeholder="e.g. 200"
              />
              <small>Auto-calculated: Platform Units ÷ 6 = {Math.floor((formData.platformUnits || 0) / 6)}</small>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>📝 About This Item</h2>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Enter product description that will appear in the 'About this item' section..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <small>This description will appear at the top of the "About this item" section on the product detail page.</small>
          </div>

          <div className="form-group">
            <label>Features (one per line)</label>
            <textarea
              value={(formData.features || []).join('\n')}
              onChange={(e) => {
                const featuresArray = e.target.value.split('\n').filter(line => line.trim() !== '');
                setFormData(prev => ({
                  ...prev,
                  features: featuresArray
                }));
              }}
              rows="6"
              placeholder="Enter features, one per line:&#10;• Amazon's Choice Product&#10;• Fast Shipping Available&#10;• Quality Guaranteed"
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <small>Enter each feature on a new line. They will appear as bullet points in the "About this item" section.</small>
          </div>
        </div>

        <div className="form-section">
          <h2>🖼️ Product Images</h2>
          
          {/* Main Image */}
          <div className="form-group">
            <label>Main Product Image *</label>
            <div style={{
              border: '2px dashed #ddd',
              borderRadius: '8px',
              padding: '10px',
              textAlign: 'center',
              backgroundColor: '#fafafa'
            }}>
              {imageUrls[0] ? (
                <div style={{
                  position: 'relative',
                  display: 'inline-block',
                  maxWidth: '200px',
                  width: '100%'
                }}>
                  <img 
                    src={imageUrls[0]} 
                    alt="Main product" 
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'contain',
                      objectPosition: 'center',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      padding: '8px',
                      backgroundColor: '#f8f9fa'
                    }}
                  />
                  <button 
                    type="button" 
                    onClick={() => removeImage(0)} 
                    style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      background: 'rgba(255, 0, 0, 0.8)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '25px',
                      height: '25px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '40px 20px',
                    cursor: 'pointer',
                    color: '#666',
                    fontSize: '14px'
                  }}
                >
                  <i className="fas fa-camera" style={{fontSize: '24px', marginBottom: '10px', display: 'block'}}></i>
                  <span>Click to upload main image</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleImageSelect(e, 0)}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Additional Images */}
          <div className="form-group">
            <label>Additional Images (Optional)</label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '15px',
              marginTop: '10px'
            }}>
              {[1, 2, 3, 4].map((index) => (
                <div key={index} style={{
                  border: '2px dashed #ddd',
                  borderRadius: '8px',
                  padding: '10px',
                  textAlign: 'center',
                  backgroundColor: '#fafafa',
                  minHeight: '150px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {imageUrls[index] ? (
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: '130px'
                    }}>
                      <img 
                        src={imageUrls[index]} 
                        alt={`Product image ${index + 1}`} 
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          objectPosition: 'center',
                          borderRadius: '6px',
                          border: '1px solid #ddd',
                          padding: '4px',
                          backgroundColor: '#f8f9fa'
                        }}
                      />
                      <button 
                        type="button" 
                        onClick={() => removeImage(index)} 
                        style={{
                          position: 'absolute',
                          top: '5px',
                          right: '5px',
                          background: 'rgba(255, 0, 0, 0.8)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '22px',
                          height: '22px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => additionalFileInputRefs.current[index - 1]?.click()}
                      style={{
                        cursor: 'pointer',
                        color: '#666',
                        fontSize: '12px',
                        textAlign: 'center'
                      }}
                    >
                      <i className="fas fa-plus" style={{fontSize: '18px', marginBottom: '8px', display: 'block'}}></i>
                      <span>Image {index + 1}</span>
                    </div>
                  )}
                  <input
                    ref={el => additionalFileInputRefs.current[index - 1] = el}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e, index)}
                    style={{ display: 'none' }}
                  />
                </div>
              ))}
            </div>
            <small>Upload up to 4 additional product images. Recommended size: 800x800px or larger.</small>
          </div>
        </div>

        <div className="form-section">
          <h2>👤 Seller & Status</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label>Seller</label>
              <select name="seller" value={formData.seller} onChange={handleChange}>
                <option value="">No Seller Assigned</option>
                {sellers.map(seller => (
                  <option key={seller._id} value={seller._id}>
                    {seller.username} ({seller.supplierId}) - {seller.email}
                  </option>
                ))}
              </select>
              <small>Assign a seller to this product. Admins will see seller contact details on product page.</small>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="active">✅ Active</option>
                <option value="inactive">❌ Inactive</option>
                <option value="pending">⏳ Pending</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="isAmazonsChoice"
                  checked={formData.isAmazonsChoice}
                  onChange={handleChange}
                />
                <span>🏆 Amazon's Choice</span>
              </label>
            </div>
          </div>
        </div>



        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={saving || uploadingImages}>
            {uploadingImages ? '📤 Uploading Images...' : saving ? '⏳ Creating Product...' : '✅ Create Product'}
          </button>
          <button 
            type="button" 
            onClick={() => {
              const returnUrl = returnCategory 
                ? `/admin/products?category=${returnCategory}`
                : '/admin/products';
              navigate(returnUrl, {
                state: { category: returnCategory }
              });
            }} 
            className="cancel-btn"
          >
            Cancel
          </button>
        </div>
      </form>

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
                Product Submitted for Approval!
              </h3>
              <p style={{
                margin: 0,
                fontSize: '14px',
                opacity: 0.9,
                lineHeight: '1.4'
              }}>
                "{createdProductName}" has been submitted and is pending approval.
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
          
          {/* Progress bar */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '3px',
            background: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '0 0 12px 12px',
            width: '100%',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: 'rgba(255, 255, 255, 0.8)',
              animation: 'progressBar 5s linear forwards',
              borderRadius: '0 0 12px 12px'
            }}></div>
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

        @keyframes progressBar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

export default AddProduct;
