import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { adminGet, adminPut, adminDelete } from '../../utils/adminApi';
import { getApiUrl } from '../../utils/api';
import cacheManager from '../../utils/cacheManager';
import ImageSelector from '../../components/ImageSelector';
import '../../styles/AdminProductForm.css';

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Only GBP currency used - no conversion needed
  const currency = 'GBP';
  const currencySymbol = '£';
  
  // Get return category from URL params or location state
  const urlParams = new URLSearchParams(location.search);
  const returnCategory = location.state?.category || urlParams.get('returnCategory') || '';
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
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
    dealUnits: 1,
    platformUnits: 2400, // Units for yearly profit calculation
    seller: '',
    isAmazonsChoice: false,
    status: 'active',
    description: '',
    features: [],
    // Profit Analysis fields
    profitEvaluation: {
      salesProceeds: 0,
      commission: 0,
      commissionTax: 0,
      digitalServicesFee: 0,
      digitalServicesTax: 0,
      fbaFulfilmentFee: 0,
      fbaFulfilmentTax: 0,
      balanceChange: 0,
      productCost: 0,
      netProfit: 0,
      monthlyProfit: 0,
      yearlyProfit: 0
    }
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [originalImages, setOriginalImages] = useState([]); // Store original images from database
  const [removedImages, setRemovedImages] = useState(new Set()); // Track which image slots were explicitly removed
  const [uploadingImages, setUploadingImages] = useState(false);
  const [originalPrice, setOriginalPrice] = useState(0); // Store original price in PKR
  const [originalCurrency, setOriginalCurrency] = useState('PKR'); // Track original currency
  const [showImageSelector, setShowImageSelector] = useState(false);
  const fileInputRef = useRef(null);
  const additionalFileInputRefs = useRef([null, null, null, null]); // Refs for 4 additional image inputs
  
  // Auto-image functionality state
  const [autoImageLoading, setAutoImageLoading] = useState(false);
  const [autoImageMessage, setAutoImageMessage] = useState('');
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

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

  // Dynamic categories loaded from API
  const [categories, setCategories] = useState([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [productLoaded, setProductLoaded] = useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  useEffect(() => {
    // Load categories first, then product data
    const loadData = async () => {
      await fetchCategories();
      await fetchSellers();
      await fetchProduct();
    };
    loadData();
  }, [id]);

  // Debug effect to monitor category and form data sync
  useEffect(() => {
    if (categories.length > 0 && formData.category) {
      const matchingCategory = categories.find(cat => cat.label === formData.category);
      if (!matchingCategory) {
        // Try to find a case-insensitive match
        const caseInsensitiveMatch = categories.find(cat => 
          cat.label.toLowerCase() === formData.category.toLowerCase()
        );
        
        if (caseInsensitiveMatch) {
          console.log('✅ Found case-insensitive match, updating form data:', caseInsensitiveMatch.label);
          setFormData(prev => ({ ...prev, category: caseInsensitiveMatch.label }));
        }
      } else {
        // Category found in dropdown
      }
    }
  }, [categories, formData.category]);

  // Effect to sync category when both product and categories are loaded
  useEffect(() => {
    if (productLoaded && categoriesLoaded && formData.category && categories.length > 0) {
      const exactMatch = categories.find(cat => cat.label === formData.category);
      if (!exactMatch) {
        // Try case-insensitive match
        const caseInsensitiveMatch = categories.find(cat => 
          cat.label.toLowerCase() === formData.category.toLowerCase()
        );
        
        if (caseInsensitiveMatch) {
          setFormData(prev => ({ ...prev, category: caseInsensitiveMatch.label }));
        } else {
          // No matching category found
        }
      }
    }
  }, [productLoaded, categoriesLoaded, formData.category, categories]);

  // No currency conversion needed - all prices in GBP only

  const fetchProduct = async () => {
    try {
      const response = await adminGet(`products/${id}`);
      const product = await response.json();
      
      // Store original price - all prices in GBP
      const productPrice = product.price !== undefined && product.price !== null ? product.price : 0;
      setOriginalPrice(productPrice);
      setOriginalCurrency('GBP');
      
      console.log('📊 Loading product data:', {
        id: product._id,
        name: product.name,
        category: product.category,
        categoryType: typeof product.category,
        isAmazonsChoice: product.isAmazonsChoice,
        images: product.images,
        image: product.image,
        asin: product.asin
      });
      
      setFormData({
        name: product.name || '',
        price: productPrice,
        shipping: product.shipping || 0, // Add shipping field
        category: product.category || '',
        brand: product.brand || '',
        asin: product.asin || '',
        sku: product.sku || '',
        rating: product.rating || 4.5,
        reviews: product.reviews || 0,
        stock: product.stock || 0,
        dealUnits: Math.floor((product.platformUnits || 2400) / 12), // Auto-calculate as platformUnits / 12
        platformUnits: product.platformUnits !== undefined && product.platformUnits !== null ? product.platformUnits : 2400,
        seller: product.seller?._id || '',
        isAmazonsChoice: product.isAmazonsChoice || false,
        status: product.status || 'active',
        description: product.description || '',
        features: product.features || [],
        // Load profit evaluation data
        profitEvaluation: {
          salesProceeds: product.profitEvaluation?.salesProceeds || 0,
          commission: product.profitEvaluation?.commission || 0,
          commissionTax: product.profitEvaluation?.commissionTax || 0,
          digitalServicesFee: product.profitEvaluation?.digitalServicesFee || 0,
          digitalServicesTax: product.profitEvaluation?.digitalServicesTax || 0,
          fbaFulfilmentFee: product.profitEvaluation?.fbaFulfilmentFee || 0,
          fbaFulfilmentTax: product.profitEvaluation?.fbaFulfilmentTax || 0,
          balanceChange: product.profitEvaluation?.balanceChange || 0,
          productCost: product.profitEvaluation?.productCost || 0,
          netProfit: product.profitEvaluation?.netProfit || 0,
          monthlyProfit: product.profitEvaluation?.monthlyProfit || 0,
          yearlyProfit: product.profitEvaluation?.yearlyProfit || 0
        }
      });
      
      console.log('📊 Form data set to:', {
        category: product.category || '',
        isAmazonsChoice: product.isAmazonsChoice || false
      });

      // Set existing image URLs for display and store original images
      if (product.images && product.images.length > 0) {
        // Initialize arrays with proper structure (up to 5 slots)
        const imageUrlsArray = new Array(5).fill(undefined);
        const imageFilesArray = new Array(5).fill(undefined);
        
        // Fill with existing images
        product.images.forEach((url, index) => {
          if (index < 5) {
            imageUrlsArray[index] = url;
          }
        });
        
        setImageUrls(imageUrlsArray);
        setImageFiles(imageFilesArray);
        setOriginalImages(product.images); // Store original images as backup
        setRemovedImages(new Set()); // Reset removed images when loading product
        
      } else {
        setImageUrls(new Array(5).fill(undefined));
        setImageFiles(new Array(5).fill(undefined));
        setOriginalImages([]);
        setRemovedImages(new Set()); // Reset removed images
      }
      
      setProductLoaded(true);
    } catch (error) {
      console.error('Error loading product:', error);
      alert('❌ Failed to load product: ' + error.message);
      navigate('/admin/products');
    } finally {
      setLoading(false);
    }
  };

  const fetchSellers = async () => {
    try {
      const response = await adminGet('sellers');
      const data = await response.json();
      setSellers(data.sellers || []);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      // Include Excel categories for admin use
      const response = await fetch(getApiUrl('products/public/categories?includeExcel=true'));
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
        setCategoriesLoaded(true);
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
      setCategoriesLoaded(true);
    }
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
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
          const exists = prev.some(cat => cat.value === newCategory.value);
          if (exists) {
            return prev;
          }
          return [...prev, newCategory];
        });
        
        // Select the new category using the normalized label
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    const newFormData = {
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    };

    // Auto-calculate dealUnits when platformUnits changes
    if (name === 'platformUnits') {
      const platformUnits = parseInt(value) || 2400;
      newFormData.dealUnits = Math.floor(platformUnits / 12);
    }

    // If price is manually changed, update the original price reference
    if (name === 'price' && value !== '') {
      const numericPrice = parseFloat(value);
      if (!isNaN(numericPrice)) {
        // Update original price to current value in GBP
        setOriginalPrice(numericPrice);
        setOriginalCurrency('GBP');
      }
    }

    // Auto-image functionality for ASIN changes
    if (name === 'asin' && value && value.length === 10) {
      const normalizedAsin = value.toUpperCase();
      if (normalizedAsin !== formData.asin) {
        // ASIN changed to a valid 10-character value, check for images
        checkAndAddAsinImages(normalizedAsin);
      }
    }

    setFormData(newFormData);
  };

  // Function to check for ASIN-based images and auto-add them
  const checkAndAddAsinImages = async (asin) => {
    if (!asin || asin.length !== 10) return;
    
    setAutoImageLoading(true);
    setAutoImageMessage('');
    
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl(`admin-excel/asin/${asin}/add-images`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.images && data.images.length > 0) {
          // Auto-add images to the form (not saved yet)
          const newImageUrls = [...imageUrls];
          const newImageFiles = [...imageFiles];
          
          // Fill available slots with the ASIN images
          let addedCount = 0;
          for (let i = 0; i < 5 && i < data.images.length; i++) {
            if (data.images[i] && (!newImageUrls[i] || newImageUrls[i] === undefined)) {
              newImageUrls[i] = data.images[i];
              newImageFiles[i] = null; // No file for Cloudinary images
              addedCount++;
              
              // Clear removed flag for this slot
              setRemovedImages(prev => {
                const newSet = new Set(prev);
                newSet.delete(i);
                return newSet;
              });
            }
          }
          
          if (addedCount > 0) {
            setImageUrls(newImageUrls);
            setImageFiles(newImageFiles);
            setAutoImageMessage(`✅ Auto-added ${addedCount} image${addedCount > 1 ? 's' : ''} for ASIN ${asin}. Click "Save Changes" to apply.`);
            
            // Clear message after 5 seconds
            setTimeout(() => setAutoImageMessage(''), 5000);
          } else {
            setAutoImageMessage(`ℹ️ Found ${data.availableImageCount} image${data.availableImageCount > 1 ? 's' : ''} for ASIN ${asin}, but all image slots are already filled.`);
            setTimeout(() => setAutoImageMessage(''), 3000);
          }
        } else {
          setAutoImageMessage(`ℹ️ No images found for ASIN ${asin} in uploaded ZIP files.`);
          setTimeout(() => setAutoImageMessage(''), 3000);
        }
      } else {
        const errorData = await response.json();
        console.log('No images found for ASIN:', asin, errorData.message);
      }
    } catch (error) {
      console.error('Error checking ASIN images:', error);
    } finally {
      setAutoImageLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    
    // Add visual feedback
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = (e) => {
    // Only clear drag over if we're actually leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    // Create new arrays for reordering
    const newImageUrls = [...imageUrls];
    const newImageFiles = [...imageFiles];
    
    // Get the dragged items
    const draggedUrl = newImageUrls[draggedIndex];
    const draggedFile = newImageFiles[draggedIndex];
    
    // Only proceed if there's actually something to move
    if (!draggedUrl && !draggedFile) {
      setDragOverIndex(null);
      return;
    }
    
    // Remove from original position
    newImageUrls[draggedIndex] = undefined;
    newImageFiles[draggedIndex] = undefined;
    
    // Place at new position
    newImageUrls[dropIndex] = draggedUrl;
    newImageFiles[dropIndex] = draggedFile;
    
    // Update state
    setImageUrls(newImageUrls);
    setImageFiles(newImageFiles);
    
    // Update removed images set properly
    setRemovedImages(prev => {
      const newSet = new Set(prev);
      
      // Clear the removed flag for the drop position (we're adding an image there)
      newSet.delete(dropIndex);
      
      // Add the drag source position to removed (since we moved the image away)
      newSet.add(draggedIndex);
      
      return newSet;
    });
    
    setDragOverIndex(null);
    console.log(`🔄 Moved image from position ${draggedIndex + 1} to position ${dropIndex + 1}`);
    
    // Debug log
    setTimeout(() => logImageState(`Drag from ${draggedIndex + 1} to ${dropIndex + 1}`), 100);
  };

  const handleImageSelection = (selectedData) => {
    if (Array.isArray(selectedData) && selectedData.length > 0) {
      // Check if first item is a File (from device upload) or string (from Cloudinary)
      if (selectedData[0] instanceof File) {
        // Handle file uploads from device
        handleImageFileSelect({ target: { files: selectedData } });
      } else {
        // Handle Cloudinary URLs
        const newImageUrls = [...imageUrls];
        const newImageFiles = [...imageFiles];
        
        // Fill available slots with Cloudinary URLs
        let urlIndex = 0;
        for (let i = 0; i < 5 && urlIndex < selectedData.length; i++) {
          if (!newImageUrls[i]) {
            newImageUrls[i] = selectedData[urlIndex];
            newImageFiles[i] = null; // No file for Cloudinary images
            urlIndex++;
          }
        }
        
        setImageUrls(newImageUrls);
        setImageFiles(newImageFiles);
        
        // Clear removed flags for slots that are being filled
        const slotsToUpdate = [];
        urlIndex = 0;
        for (let i = 0; i < 5 && urlIndex < selectedData.length; i++) {
          if (!imageUrls[i]) {
            slotsToUpdate.push(i);
            urlIndex++;
          }
        }
        
        if (slotsToUpdate.length > 0) {
          setRemovedImages(prev => {
            const newSet = new Set(prev);
            slotsToUpdate.forEach(slot => newSet.delete(slot));
            return newSet;
          });
        }
        
        if (urlIndex < selectedData.length) {
          alert(`📸 Only ${urlIndex} images were added. Maximum 5 images allowed.`);
        }
      }
    }
  };

  const handleImageFileSelect = (e, imageIndex = null) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate each file
    const validFiles = [];
    const errors = [];

    files.forEach(file => {
      const validation = validateImageFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      alert('❌ Some files were rejected:\n' + errors.join('\n'));
    }

    if (validFiles.length === 0) return;

    // If imageIndex is specified, replace that specific image
    if (imageIndex !== null) {
      const file = validFiles[0]; // Take only the first file for specific position
      
      // Update imageFiles array at specific index
      setImageFiles(prev => {
        const newFiles = [...prev];
        newFiles[imageIndex] = file;
        return newFiles;
      });
      
      // Clear the removed flag for this slot since user is adding a new image
      setRemovedImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageIndex);
        return newSet;
      });
      
      // Create preview URL for the specific position
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageUrls(prev => {
          const newUrls = [...prev];
          newUrls[imageIndex] = e.target.result;
          return newUrls;
        });
      };
      reader.readAsDataURL(file);

    } else {
      // Bulk upload - fill available slots starting from main image
      let fileIndex = 0;
      const slotsToUpdate = [];
      
      setImageFiles(prev => {
        const newFiles = [...prev];
        
        // Fill empty slots with new files
        for (let i = 0; i < 5 && fileIndex < validFiles.length; i++) {
          if (!newFiles[i]) {
            newFiles[i] = validFiles[fileIndex];
            slotsToUpdate.push(i);
            fileIndex++;
          }
        }
        
        return newFiles;
      });
      
      // Clear removed flags for slots that are being filled
      if (slotsToUpdate.length > 0) {
        setRemovedImages(prev => {
          const newSet = new Set(prev);
          slotsToUpdate.forEach(slot => newSet.delete(slot));
          return newSet;
        });
      }
      
      // Create preview URLs for the added files
      fileIndex = 0;
      for (let i = 0; i < 5 && fileIndex < validFiles.length; i++) {
        // Only add preview if slot is empty
        if (!imageUrls[i] || imageUrls[i] === undefined) {
          const reader = new FileReader();
          const currentFileIndex = fileIndex; // Capture current index for closure
          reader.onload = (e) => {
            setImageUrls(current => {
              const updated = [...current];
              updated[i] = e.target.result;
              return updated;
            });
          };
          reader.readAsDataURL(validFiles[fileIndex]);
          fileIndex++;
        }
      }
      
      if (fileIndex < validFiles.length) {
        alert(`📸 Only ${fileIndex} images were added. Maximum 5 images allowed (1 main + 4 additional).`);
      }

    }
  };

  // Debug function to log current state
  const logImageState = (action) => {
    console.log(`🔍 Image State After ${action}:`, {
      imageUrls: imageUrls.map((url, i) => ({ index: i, url: url ? 'HAS_IMAGE' : 'EMPTY' })),
      removedImages: Array.from(removedImages),
      imageFiles: imageFiles.map((file, i) => ({ index: i, hasFile: !!file }))
    });
  };

  const removeImage = (index) => {
    const imageUrl = imageUrls[index];
    
    // Remove from imageUrls at specific index (set to undefined to maintain array structure)
    setImageUrls(prev => {
      const newUrls = [...prev];
      newUrls[index] = undefined;
      return newUrls;
    });
    
    // Remove from imageFiles at the same index
    setImageFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = undefined;
      return newFiles;
    });
    
    // Mark this slot as explicitly removed by the user
    setRemovedImages(prev => new Set([...prev, index]));
    
    // Debug log
    setTimeout(() => logImageState(`Remove Image ${index + 1}`), 100);
  };

  const uploadImages = async () => {
    // Filter out undefined/null files
    const validFiles = imageFiles.filter(file => file && file instanceof File);
    if (validFiles.length === 0) return [];

    setUploadingImages(true);

    try {
      const result = await uploadMultipleImages(validFiles);
      
      if (result.success) {
        return result.urls;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('❌ Failed to upload images: ' + error.message);
      return [];
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setSaving(true);

    let productData = null; // Declare outside try block for error handling

    try {
      // Validate required fields
      if (!formData.name || !formData.name.trim()) {
        alert('❌ Product name is required');
        setSaving(false);
        return;
      }
      
      if (!formData.category) {
        alert('❌ Category is required');
        setSaving(false);
        return;
      }
      
      if (formData.price === '' || formData.price === null || formData.price === undefined) {
        alert('❌ Price is required');
        setSaving(false);
        return;
      }
      
      // Check if we have any new files to upload to Cloudinary
      const validFiles = imageFiles.filter(file => file && file instanceof File);
      
      if (validFiles.length > 0) {
        // Use FormData approach like AddProduct for Cloudinary upload
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
        formDataToSend.append('brand', formData.brand || '');
        formDataToSend.append('asin', formData.asin.trim() || '');
        formDataToSend.append('sku', formData.sku.trim() || '');
        formDataToSend.append('rating', Math.min(Math.max(parseFloat(formData.rating) || 4.5, 0), 5));
        formDataToSend.append('reviews', parseInt(formData.reviews) || 0);
        formDataToSend.append('stock', parseInt(formData.stock) || 0);
        formDataToSend.append('dealUnits', Math.floor((formData.platformUnits || 2400) / 12));
        formDataToSend.append('isAmazonsChoice', formData.isAmazonsChoice || false);
        formDataToSend.append('status', formData.status || 'active');
        formDataToSend.append('platformUnits', formData.platformUnits || 2400);
        
        // Only include seller if it's not empty
        if (formData.seller && formData.seller.trim()) {
          formDataToSend.append('seller', formData.seller);
        }
        
        // Add profit evaluation data
        formDataToSend.append('profitEvaluation', JSON.stringify({
          ...formData.profitEvaluation,
          yearlyProfit: (formData.platformUnits || 2400) * (formData.profitEvaluation.netProfit || 0)
        }));
        
        // Add new image files for Cloudinary upload
        setUploadingImages(true);
        
        validFiles.forEach((file) => {
          formDataToSend.append('images', file);
        });
        
        // Add existing image URLs that should be preserved
        const existingImageUrls = [];
        imageUrls.forEach((url, index) => {
          if (url && url.trim() !== '' && !url.startsWith('data:') && !imageFiles[index] && !removedImages.has(index)) {
            // Only include existing URLs where there's no new file and it wasn't removed
            existingImageUrls.push(url);
          }
        });
        
        if (existingImageUrls.length > 0) {
          formDataToSend.append('existingImages', JSON.stringify(existingImageUrls));
          console.log('📷 Adding existing image URLs to preserve:', existingImageUrls);
        }
        
        console.log('📦 Sending product update with files to server for Cloudinary upload...');
        
        // Send to server with files - server will handle Cloudinary upload
        const token = localStorage.getItem('adminToken');
        const response = await fetch(getApiUrl(`products/${id}`), {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
            // Don't set Content-Type - let browser set it for FormData
          },
          body: formDataToSend
        });
        
        if (response.ok) {
          const updatedProduct = await response.json();
          console.log('✅ Product updated successfully with Cloudinary images:', {
            id: updatedProduct._id,
            name: updatedProduct.name,
            images: updatedProduct.images?.length || 0,
            cloudinaryImages: updatedProduct.images?.filter(img => img.includes('cloudinary.com')).length || 0
          });
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update product');
        }
      } else {
        // No new files, use regular JSON approach
        // Process images - maintain order and handle removals
        let finalImageUrls = [];
        
        // Build final image array - only include images that are actually present
        for (let i = 0; i < 5; i++) {
          const currentUrl = imageUrls[i];
          const wasExplicitlyRemoved = removedImages.has(i);
          
          if (currentUrl && !currentUrl.startsWith('data:') && !wasExplicitlyRemoved) {
            // Existing image URL (not a preview) and not explicitly removed
            finalImageUrls.push(currentUrl);
          }
        }
        
        console.log('🖼️ Final image processing (no new uploads):', {
          originalImageUrls: imageUrls,
          removedImages: Array.from(removedImages),
          finalImageUrls: finalImageUrls
        });

        // Save price in GBP
        const currentPrice = isNaN(parseFloat(formData.price)) ? 0 : parseFloat(formData.price);

        productData = {
          name: formData.name.trim(),
          price: currentPrice,
          shipping: parseFloat(formData.shipping) || 0,
          currency: 'GBP',
          category: formData.category,
          brand: formData.brand || '',
          asin: formData.asin.trim() || '',
          sku: formData.sku.trim() || '',
          rating: Math.min(Math.max(parseFloat(formData.rating) || 4.5, 0), 5),
          reviews: parseInt(formData.reviews) || 0,
          stock: parseInt(formData.stock) || 0,
          dealUnits: Math.floor((formData.platformUnits || 2400) / 12),
          images: finalImageUrls,
          isAmazonsChoice: formData.isAmazonsChoice || false,
          status: formData.status || 'active',
          description: formData.description || '',
          features: Array.isArray(formData.features) ? formData.features : [],
          profitEvaluation: {
            ...formData.profitEvaluation,
            yearlyProfit: (formData.platformUnits || 2400) * (formData.profitEvaluation.netProfit || 0)
          },
          platformUnits: formData.platformUnits || 2400
        };
        
        // Only include seller if it's not empty
        if (formData.seller && formData.seller.trim()) {
          productData.seller = formData.seller;
        }

        const response = await adminPut(`products/${id}`, productData);
      }

      // Clear cache to ensure updated product appears immediately in Amazon's Choice
      cacheManager.remove('amazons_choice_products');
      cacheManager.clearAll(); // Clear all cache entries
      // Also clear any other related caches
      cacheManager.clearExpired();

      // Trigger category refresh in headers (in case category was changed)
      localStorage.setItem('categoriesUpdated', Date.now().toString());
      window.dispatchEvent(new CustomEvent('refreshCategories'));
      
      // Show modern success toast instead of basic alert
      setSuccessMessage('Product updated successfully! Changes will appear immediately in Amazon\'s Choice products.');
      setShowSuccessToast(true);
      
      // Auto-hide toast after 5 seconds
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 5000);
      
      // Navigate back with category filter preserved after a short delay
      setTimeout(() => {
        // Check if we came from approval page
        const urlParams = new URLSearchParams(location.search);
        const returnTo = urlParams.get('returnTo');
        
        if (returnTo === 'approval') {
          // Return to approval page if we came from there
          navigate('/admin/approval');
        } else {
          // Otherwise return to products page with category filter
          const backUrl = `/admin/products${returnCategory ? `?category=${returnCategory}` : ''}`;
          navigate(backUrl, {
            state: { category: returnCategory }
          });
        }
      }, 1500); // Give user time to see the success message
    } catch (error) {
      console.error('Error updating product:', error);
      if (productData) {
        console.error('Product data that failed:', productData);
      }
      console.error('Form data:', formData);
      
      // More specific error message
      let errorMessage = 'Unknown error';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      
      alert('❌ Failed to update product: ' + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('⚠️ Are you sure you want to delete this product? This action cannot be undone.')) return;

    try {
      await adminDelete(`products/${id}`);
      alert('✅ Product deleted successfully!');
      // Navigate back with category filter preserved
      const backUrl = `/admin/products${returnCategory ? `?category=${returnCategory}` : ''}`;
      navigate(backUrl, {
        state: { category: returnCategory }
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('❌ Failed to delete product: ' + error.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading product...</div>;
  }

  return (
    <div className="admin-product-form">
      <header className="form-header">
        <h1>✏️ Edit Product</h1>
        
        <div className="header-actions">
          <button onClick={handleDelete} className="delete-btn">
            🗑️ Delete Product
          </button>
          <button onClick={() => {
            // Check if we came from approval page
            const urlParams = new URLSearchParams(location.search);
            const returnTo = urlParams.get('returnTo');
            
            if (returnTo === 'approval') {
              navigate('/admin/approval');
            } else {
              const backUrl = `/admin/products${returnCategory ? `?category=${returnCategory}` : ''}`;
              navigate(backUrl, {
                state: { category: returnCategory }
              });
            }
          }} className="back-btn">
            ← Back to Products
          </button>
        </div>
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
              <label>Category * <small>(matches Amazon's Choice categories)</small></label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <select name="category" value={formData.category} onChange={handleChange} required>
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.label}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                  style={{
                    padding: '10px 15px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}
                  title="Add new category"
                >
                  + New
                </button>
              </div>
              
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
            </div>

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
              <input
                type="text"
                name="asin"
                value={formData.asin}
                onChange={handleChange}
                placeholder="Enter ASIN (e.g., B08N5WRWNW)"
                maxLength="10"
                style={{
                  textTransform: 'uppercase',
                  fontFamily: 'monospace',
                  letterSpacing: '1px'
                }}
              />
              <small>Optional: 10-character Amazon product identifier for admin tracking</small>
              
              {/* Auto-image functionality indicator */}
              {autoImageLoading && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  background: '#e3f2fd',
                  border: '1px solid #2196f3',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: '#1976d2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #e3f2fd',
                    borderTop: '2px solid #2196f3',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Checking for images for ASIN {formData.asin}...
                </div>
              )}
              
              {autoImageMessage && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  background: autoImageMessage.startsWith('✅') ? '#e8f5e8' : '#fff3cd',
                  border: `1px solid ${autoImageMessage.startsWith('✅') ? '#28a745' : '#ffc107'}`,
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: autoImageMessage.startsWith('✅') ? '#155724' : '#856404'
                }}>
                  {autoImageMessage}
                </div>
              )}
              
              {!autoImageLoading && !autoImageMessage && formData.asin && formData.asin.length === 10 && (
                <div style={{
                  marginTop: '8px',
                  padding: '6px 10px',
                  background: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  color: '#6c757d'
                }}>
                  💡 Images will be auto-added from ZIP uploads when you enter a valid ASIN
                </div>
              )}
            </div>

            <div className="form-group">
              <label>SKU (Stock Keeping Unit)</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                placeholder="Enter unique SKU (e.g., SKU123456ABC)"
                style={{
                  textTransform: 'uppercase',
                  fontFamily: 'monospace',
                  letterSpacing: '1px'
                }}
              />
              <small>Unique identifier for inventory management and tracking</small>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>💰 Pricing & Stock</h2>
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '4px',
            padding: '10px',
            marginBottom: '15px',
            fontSize: '0.9rem'
          }}>
            <strong>💡 Currency Note:</strong> All prices are saved in GBP (£). 
            This ensures consistency across all products and Amazon Choice listings.
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>No of Deal Units * (Auto-calculated)</label>
              <input
                type="number"
                name="dealUnits"
                value={formData.dealUnits}
                readOnly
                min="1"
                placeholder="Auto-calculated from Platform Units ÷ 12"
                style={{backgroundColor: '#f8f9fa', cursor: 'not-allowed'}}
              />
              <small>Auto-calculated as Platform Units ÷ 12 (currently: {formData.platformUnits || 2400} ÷ 12 = {formData.dealUnits})</small>
            </div>

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
              <label>Stock Quantity</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                min="0"
                placeholder="0"
              />
              <small>Available stock</small>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>⭐ Rating & Reviews</h2>
          
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
              <label>Number of Reviews</label>
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
        </div>

        <div className="form-section">
          <h2>🖼️ Product Images</h2>
          
          {/* Auto-image functionality for ASIN */}
          {formData.asin && formData.asin.length === 10 && (
            <div style={{
              marginBottom: '20px',
              padding: '15px',
              background: '#f0f8ff',
              border: '1px solid #b3d9ff',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <strong style={{ color: '#0066cc' }}>🎯 ASIN-Based Images</strong>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                    Auto-add images from ZIP uploads for ASIN: <code style={{ background: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>{formData.asin}</code>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => checkAndAddAsinImages(formData.asin)}
                  disabled={autoImageLoading}
                  style={{
                    background: autoImageLoading ? '#6c757d' : '#0066cc',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: autoImageLoading ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {autoImageLoading ? (
                    <>
                      <div style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid transparent',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Checking...
                    </>
                  ) : (
                    <>
                      🔍 Find Images
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {/* Main Image */}
          <div className="form-group">
            <label>Main Product Image * <small>(This will be the primary image shown)</small></label>
            <div style={{ marginBottom: '15px' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleImageFileSelect(e, 0)}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="upload-btn"
                  style={{
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  📁 {imageUrls[0] ? 'Replace Main Image' : 'Select Main Image'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowImageSelector(true)}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  🌤️ Choose from Cloudinary
                </button>
                <small>JPEG, PNG, GIF, WebP (max 5MB) | Or select from existing Cloudinary images</small>
              </div>
            </div>

            {/* Main Image Preview */}
            {imageUrls[0] && (
              <div 
                style={{
                  position: 'relative',
                  border: dragOverIndex === 0 ? '3px solid #007bff' : '3px solid #28a745',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  width: '200px',
                  marginTop: '10px',
                  cursor: 'move',
                  transition: 'all 0.2s ease'
                }}
                draggable
                onDragStart={(e) => handleDragStart(e, 0)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, 0)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 0)}
              >
                <div style={{
                  position: 'absolute',
                  top: '5px',
                  left: '5px',
                  background: '#28a745',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  zIndex: 1
                }}>
                  MAIN
                </div>
                <div style={{
                  position: 'absolute',
                  top: '5px',
                  right: '30px',
                  background: 'rgba(0, 123, 255, 0.9)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  zIndex: 1
                }}>
                  🔄 DRAG
                </div>
                <img
                  src={imageUrls[0]}
                  alt="Main Product Image"
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'contain',
                    objectPosition: 'center',
                    padding: '8px',
                    backgroundColor: '#f8f9fa'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div style={{
                  display: 'none',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '200px',
                  background: '#f5f5f5',
                  color: '#666',
                  fontSize: '12px'
                }}>
                  Invalid Image
                </div>
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
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ✕
                </button>
              </div>
            )}
            
            {/* Drop zone for main image when empty */}
            {!imageUrls[0] && (
              <div
                style={{
                  border: dragOverIndex === 0 ? '3px solid #007bff' : '3px dashed #ccc',
                  borderRadius: '8px',
                  width: '200px',
                  height: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: dragOverIndex === 0 ? '#f0f8ff' : '#f9f9f9',
                  marginTop: '10px',
                  transition: 'all 0.2s ease'
                }}
                onDragOver={(e) => handleDragOver(e, 0)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 0)}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
                <div style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
                  {dragOverIndex === 0 ? 'Drop image here' : 'Main Image Slot'}
                </div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  Drag from other positions
                </div>
              </div>
            )}
          </div>

          {/* Additional Images */}
          <div className="form-group">
            <label>Additional Images <small>(Up to 4 more images - Drag to reorder)</small></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginTop: '10px' }}>
              {[1, 2, 3, 4].map((imageIndex) => (
                <div key={imageIndex} style={{ textAlign: 'center' }}>
                  <input
                    type="file"
                    ref={el => additionalFileInputRefs.current[imageIndex - 1] = el}
                    onChange={(e) => handleImageFileSelect(e, imageIndex)}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  
                  {imageUrls[imageIndex] ? (
                    <div 
                      style={{
                        position: 'relative',
                        border: dragOverIndex === imageIndex ? '3px solid #007bff' : '2px solid #667eea',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'move',
                        transition: 'all 0.2s ease',
                        transform: draggedIndex === imageIndex ? 'scale(0.95)' : 'scale(1)'
                      }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, imageIndex)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, imageIndex)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, imageIndex)}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '5px',
                        left: '5px',
                        background: '#667eea',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        zIndex: 1
                      }}>
                        #{imageIndex}
                      </div>
                      <div style={{
                        position: 'absolute',
                        top: '5px',
                        right: '25px',
                        background: 'rgba(0, 123, 255, 0.9)',
                        color: 'white',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        fontSize: '8px',
                        fontWeight: 'bold',
                        zIndex: 1
                      }}>
                        🔄
                      </div>
                      <img
                        src={imageUrls[imageIndex]}
                        alt={`Product Image ${imageIndex}`}
                        style={{
                          width: '100%',
                          height: '120px',
                          objectFit: 'contain',
                          objectPosition: 'center',
                          padding: '4px',
                          backgroundColor: '#f8f9fa'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div style={{
                        display: 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '120px',
                        background: '#f5f5f5',
                        color: '#666',
                        fontSize: '12px'
                      }}>
                        Invalid Image
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(imageIndex)}
                        style={{
                          position: 'absolute',
                          top: '5px',
                          right: '5px',
                          background: 'rgba(255, 0, 0, 0.8)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          cursor: 'pointer',
                          fontSize: '10px'
                        }}
                      >
                        ✕
                      </button>
                      <div style={{
                        position: 'absolute',
                        bottom: '5px',
                        right: '5px',
                        display: 'flex',
                        gap: '2px'
                      }}>
                        <button
                          type="button"
                          onClick={() => additionalFileInputRefs.current[imageIndex - 1]?.click()}
                          style={{
                            background: 'rgba(40, 167, 69, 0.9)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '2px 4px',
                            cursor: 'pointer',
                            fontSize: '8px',
                            fontWeight: '500'
                          }}
                        >
                          📁
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowImageSelector(true)}
                          style={{
                            background: 'rgba(59, 130, 246, 0.9)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '2px 4px',
                            cursor: 'pointer',
                            fontSize: '8px',
                            fontWeight: '500'
                          }}
                        >
                          🌤️
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          border: dragOverIndex === imageIndex ? '3px solid #007bff' : '2px dashed #ccc',
                          borderRadius: '8px',
                          height: '120px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: dragOverIndex === imageIndex ? '#f0f8ff' : '#f9f9f9',
                          marginBottom: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        onDragOver={(e) => handleDragOver(e, imageIndex)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, imageIndex)}
                      >
                        <div style={{ fontSize: '24px', marginBottom: '5px' }}>📷</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {dragOverIndex === imageIndex ? 'Drop here' : `Image #${imageIndex}`}
                        </div>
                        {dragOverIndex === imageIndex && (
                          <div style={{ fontSize: '10px', color: '#007bff', marginTop: '2px' }}>
                            Drop to place image
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => additionalFileInputRefs.current[imageIndex - 1]?.click()}
                          style={{
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '10px',
                            fontWeight: '500'
                          }}
                        >
                          📁 Device
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowImageSelector(true)}
                          style={{
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '10px',
                            fontWeight: '500'
                          }}
                        >
                          🌤️ Cloud
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <small style={{ display: 'block', marginTop: '10px', color: '#666' }}>
              📌 <strong>Drag & Drop:</strong> Click and drag images to reorder them. Drop on empty slots to move images around.
            </small>
          </div>

          {/* Bulk Upload Option */}
          <div className="form-group" style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
            <label>Quick Bulk Upload <small>(Add multiple images at once)</small></label>
            <div style={{ marginTop: '10px' }}>
              <input
                type="file"
                onChange={handleImageFileSelect}
                multiple
                accept="image/*"
                style={{ display: 'none' }}
                id="bulk-upload"
              />
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => document.getElementById('bulk-upload')?.click()}
                  className="upload-btn"
                  style={{
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  📁 Select Multiple Images
                </button>
                <button
                  type="button"
                  onClick={() => setShowImageSelector(true)}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  🌤️ Browse Cloudinary
                </button>
              </div>
              <small style={{ display: 'block', marginTop: '5px' }}>
                Upload from device or select from existing Cloudinary images. First image goes to main slot if empty, others fill additional slots.
              </small>
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
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <small>This description will appear at the top of the "About this item" section on the product detail page.</small>
          </div>

          <div className="form-group">
            <label>Features (one per line)</label>
            <textarea
              name="features"
              value={Array.isArray(formData.features) ? formData.features.join('\n') : ''}
              onChange={(e) => {
                const featuresArray = e.target.value.split('\n').filter(line => line.trim() !== '');
                setFormData({
                  ...formData,
                  features: featuresArray
                });
              }}
              rows="6"
              placeholder="Enter features, one per line:&#10;Amazon's Choice Product&#10;Fast Shipping Available&#10;Quality Guaranteed&#10;Verified Supplier&#10;Bulk Orders Welcome"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <small>Enter each feature on a new line. They will appear as bullet points in the "About this item" section.</small>
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
          <button 
            type="submit" 
            className="submit-btn" 
            disabled={saving || uploadingImages}
          >
            {uploadingImages ? '📤 Uploading Images...' : 
             saving ? '⏳ Saving Changes...' : 
             '✅ Save Changes'}
          </button>
          <button type="button" onClick={() => {
            // Check if we came from approval page
            const urlParams = new URLSearchParams(location.search);
            const returnTo = urlParams.get('returnTo');
            
            if (returnTo === 'approval') {
              navigate('/admin/approval');
            } else {
              const backUrl = `/admin/products${returnCategory ? `?category=${returnCategory}` : ''}`;
              navigate(backUrl, {
                state: { category: returnCategory }
              });
            }
          }} className="cancel-btn">
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

      {/* Image Selector Modal */}
      {showImageSelector && (
        <ImageSelector
          onImageSelect={handleImageSelection}
          currentImages={imageUrls.filter(Boolean)}
          maxImages={5}
          onClose={() => setShowImageSelector(false)}
        />
      )}
    </div>
  );
};

export default EditProduct;
