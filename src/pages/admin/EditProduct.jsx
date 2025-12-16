import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { adminGet, adminPut, adminDelete } from '../../utils/adminApi';
import { uploadMultipleImages, validateImageFile } from '../../utils/imageUpload';
import cacheManager from '../../utils/cacheManager';
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
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    category: '',
    brand: '',
    rating: 4.5,
    reviews: 0,
    stock: 0,
    dealUnits: 1,
    seller: '',
    isAmazonsChoice: false,
    status: 'active',
    description: '',
    features: []
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [originalImages, setOriginalImages] = useState([]); // Store original images from database
  const [removedImages, setRemovedImages] = useState(new Set()); // Track which image slots were explicitly removed
  const [uploadingImages, setUploadingImages] = useState(false);
  const [originalPrice, setOriginalPrice] = useState(0); // Store original price in PKR
  const [originalCurrency, setOriginalCurrency] = useState('PKR'); // Track original currency
  const fileInputRef = useRef(null);
  const additionalFileInputRefs = useRef([null, null, null, null]); // Refs for 4 additional image inputs

  // Categories that match Amazon's Choice page
  const categories = [
    { value: 'remote', label: 'Remote Controls' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'strap', label: 'Watch Straps' },
    { value: 'jewelry', label: 'Jewelry' },
    { value: 'party', label: 'Party Supplies' },
    { value: 'home', label: 'Home & Decor' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'automotive', label: 'Automotive' },
    { value: 'tape', label: 'Tape' },
    { value: 'lampshade', label: 'Lampshades' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'food', label: 'Food' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'sports', label: 'Sports' },
    { value: 'toys', label: 'Toys' },
    { value: 'books', label: 'Books' },
    { value: 'health', label: 'Health' },
    { value: 'UAE Products', label: 'UAE Products' },
    { value: 'UK Products', label: 'UK Products' },
    { value: 'Amazon10', label: 'Amazon 10' }
  ];

  useEffect(() => {
    fetchProduct();
    fetchSellers();
  }, [id]);

  // No currency conversion needed - all prices in GBP only

  const fetchProduct = async () => {
    try {
      const response = await adminGet(`http://localhost:5000/api/products/${id}`);
      const product = await response.json();
      
      // Store original price - all prices in GBP
      const productPrice = product.price !== undefined && product.price !== null ? product.price : 0;
      setOriginalPrice(productPrice);
      setOriginalCurrency('GBP');
      
      setFormData({
        name: product.name || '',
        price: productPrice,
        category: product.category || '',
        brand: product.brand || '',
        rating: product.rating || 4.5,
        reviews: product.reviews || 0,
        stock: product.stock || 0,
        dealUnits: product.dealUnits !== undefined && product.dealUnits !== null ? product.dealUnits : 1,
        seller: product.seller?._id || '',
        isAmazonsChoice: product.isAmazonsChoice || false,
        status: product.status || 'active',
        description: product.description || '',
        features: product.features || []
      });

      console.log('📝 Loaded product features:', product.features);
      console.log('📝 Features type:', typeof product.features, 'isArray:', Array.isArray(product.features));

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
        console.log('📸 Loaded existing images:', product.images);
      } else {
        setImageUrls(new Array(5).fill(undefined));
        setImageFiles(new Array(5).fill(undefined));
        setOriginalImages([]);
        setRemovedImages(new Set()); // Reset removed images
        console.log('📸 No existing images found');
      }
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
      const response = await adminGet('http://localhost:5000/api/sellers');
      const data = await response.json();
      setSellers(data.sellers || []);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newFormData = {
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    };

    // If price is manually changed, update the original price reference
    if (name === 'price' && value !== '') {
      const numericPrice = parseFloat(value);
      if (!isNaN(numericPrice)) {
        // Update original price to current value in GBP
        setOriginalPrice(numericPrice);
        setOriginalCurrency('GBP');
      }
    }

    setFormData(newFormData);
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
      
      console.log(`📸 Replaced image at position ${imageIndex}`);
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
      
      console.log('📸 Bulk added image files:', fileIndex);
    }
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
    
    console.log('📸 Removed image at index:', index, 'URL:', imageUrl);
    console.log('📸 Removed images set:', [...removedImages, index]);
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
    console.log('🚀 Save button clicked - starting handleSubmit');
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
      
      // Process images - maintain order and handle uploads
      let allImageUrls = [];
      
      // Check if we have any new files to upload
      const validFiles = imageFiles.filter(file => file && file instanceof File);
      let newImageUrls = [];
      
      if (validFiles.length > 0) {
        newImageUrls = await uploadImages();
      }
      
      // Build final image array maintaining the 5-slot structure (main + 4 additional)
      let uploadIndex = 0;
      
      for (let i = 0; i < 5; i++) {
        const currentUrl = imageUrls[i];
        const currentFile = imageFiles[i];
        const wasExplicitlyRemoved = removedImages.has(i);
        
        if (currentFile && currentFile instanceof File) {
          // New file uploaded for this position
          if (uploadIndex < newImageUrls.length) {
            allImageUrls[i] = newImageUrls[uploadIndex];
            uploadIndex++;
          }
        } else if (currentUrl && !currentUrl.startsWith('data:')) {
          // Existing image URL (not a preview) - preserve it
          allImageUrls[i] = currentUrl;
        } else if (!wasExplicitlyRemoved && i < originalImages.length && originalImages[i]) {
          // Only fallback to original image if it wasn't explicitly removed by the user
          allImageUrls[i] = originalImages[i];
        }
        // If none of the above conditions are met, this slot remains empty (undefined)
      }
      
      // Filter out undefined values and keep only valid URLs, maintaining order
      const finalImageUrls = [];
      for (let i = 0; i < allImageUrls.length; i++) {
        if (allImageUrls[i] && typeof allImageUrls[i] === 'string' && allImageUrls[i].trim() !== '') {
          finalImageUrls.push(allImageUrls[i]);
        }
      }
      
      // Final safety check - if we somehow lost all images and had original images, restore them
      if (finalImageUrls.length === 0 && originalImages.length > 0) {
        finalImageUrls.push(...originalImages);
        console.log('📸 Safety fallback: Restored original images:', originalImages);
      }
      
      console.log('📸 Final image URLs to save:', finalImageUrls);
      console.log('📸 Image processing details:');
      console.log('  - imageUrls state:', imageUrls);
      console.log('  - imageFiles state:', imageFiles);
      console.log('  - originalImages from DB:', originalImages);
      console.log('  - removedImages (user deleted):', Array.from(removedImages));
      console.log('  - validFiles to upload:', validFiles.length);
      console.log('  - newImageUrls uploaded:', newImageUrls);
      console.log('  - allImageUrls (before filter):', allImageUrls);

      // Save price in GBP
      const currentPrice = isNaN(parseFloat(formData.price)) ? 0 : parseFloat(formData.price);
      
      console.log('💰 Price saving:', {
        currentPrice,
        currentCurrency: 'GBP'
      });
      
      productData = {
        name: formData.name.trim(),
        price: currentPrice, // Save price as entered in GBP
        currency: 'GBP', // Always save as GBP
        category: formData.category,
        brand: formData.brand || '',
        rating: Math.min(Math.max(parseFloat(formData.rating) || 4.5, 0), 5), // Clamp between 0-5
        reviews: parseInt(formData.reviews) || 0,
        stock: parseInt(formData.stock) || 0,
        dealUnits: isNaN(parseInt(formData.dealUnits)) ? 1 : parseInt(formData.dealUnits),
        images: finalImageUrls,
        isAmazonsChoice: formData.isAmazonsChoice || false,
        status: formData.status || 'active',
        description: formData.description || '',
        features: Array.isArray(formData.features) ? formData.features : []
      };
      
      // Only include seller if it's not empty
      if (formData.seller && formData.seller.trim()) {
        productData.seller = formData.seller;
      }

      console.log('📤 Sending product data:', productData);
      console.log('📝 Features being sent:', productData.features);
      console.log('📝 Features type:', typeof productData.features, 'isArray:', Array.isArray(productData.features));
      console.log('📝 Form data features:', formData.features);
      console.log('📸 Image URLs being sent:', finalImageUrls);
      console.log('📸 Original imageUrls state:', imageUrls);
      
      console.log('🌐 Making API call to update product...');
      const response = await adminPut(`http://localhost:5000/api/products/${id}`, productData);
      console.log('✅ API call successful:', response);
      
      // Clear cache to ensure updated product appears immediately in Amazon's Choice
      cacheManager.remove('amazons_choice_products');
      cacheManager.clearAll(); // Clear all cache entries
      // Also clear any other related caches
      cacheManager.clearExpired();
      console.log('✅ Cache cleared - updated product will appear immediately in Amazon\'s Choice');
      
      alert('✅ Product updated successfully! Changes will appear immediately in Amazon\'s Choice products.');
      // Navigate back with category filter preserved
      const backUrl = `/admin/products${returnCategory ? `?category=${returnCategory}` : ''}`;
      navigate(backUrl, {
        state: { category: returnCategory }
      });
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
      await adminDelete(`http://localhost:5000/api/products/${id}`);
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
            console.log('🔙 Back button clicked, returnCategory:', returnCategory);
            const backUrl = `/admin/products${returnCategory ? `?category=${returnCategory}` : ''}`;
            navigate(backUrl, {
              state: { category: returnCategory }
            });
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
              <select name="category" value={formData.category} onChange={handleChange} required>
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
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
              <label>No of Deal Units *</label>
              <input
                type="number"
                name="dealUnits"
                value={formData.dealUnits}
                onChange={handleChange}
                required
                min="1"
                placeholder="1"
              />
              <small>Number of units in this deal</small>
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
              <small>Price per unit</small>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
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
                <small>JPEG, PNG, GIF, WebP (max 5MB)</small>
              </div>
            </div>

            {/* Main Image Preview */}
            {imageUrls[0] && (
              <div style={{
                position: 'relative',
                border: '3px solid #28a745',
                borderRadius: '8px',
                overflow: 'hidden',
                width: '200px',
                marginTop: '10px'
              }}>
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
                <img
                  src={imageUrls[0]}
                  alt="Main Product Image"
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover'
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
          </div>

          {/* Additional Images */}
          <div className="form-group">
            <label>Additional Images <small>(Up to 4 more images)</small></label>
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
                    <div style={{
                      position: 'relative',
                      border: '2px solid #667eea',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
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
                      <img
                        src={imageUrls[imageIndex]}
                        alt={`Product Image ${imageIndex}`}
                        style={{
                          width: '100%',
                          height: '120px',
                          objectFit: 'cover'
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
                      <button
                        type="button"
                        onClick={() => additionalFileInputRefs.current[imageIndex - 1]?.click()}
                        style={{
                          position: 'absolute',
                          bottom: '5px',
                          right: '5px',
                          background: 'rgba(102, 126, 234, 0.8)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          cursor: 'pointer',
                          fontSize: '10px'
                        }}
                      >
                        Replace
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => additionalFileInputRefs.current[imageIndex - 1]?.click()}
                      style={{
                        border: '2px dashed #ccc',
                        borderRadius: '8px',
                        height: '120px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        background: '#f9f9f9',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.borderColor = '#667eea';
                        e.target.style.background = '#f0f4ff';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.borderColor = '#ccc';
                        e.target.style.background = '#f9f9f9';
                      }}
                    >
                      <div style={{ fontSize: '24px', marginBottom: '5px' }}>📷</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Add Image #{imageIndex}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <small style={{ display: 'block', marginTop: '10px', color: '#666' }}>
              Click on empty slots to add images, or use Replace button to change existing images.
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
              <small style={{ display: 'block', marginTop: '5px' }}>
                This will add images to available slots. First image goes to main slot if empty, others fill additional slots.
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
                console.log('📝 Features onChange - raw value:', e.target.value);
                console.log('📝 Features onChange - parsed array:', featuresArray);
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
            onClick={(e) => {
              console.log('🔘 Submit button clicked!');
              // Let the form's onSubmit handle it
            }}
          >
            {uploadingImages ? '📤 Uploading Images...' : 
             saving ? '⏳ Saving Changes...' : 
             '✅ Save Changes'}
          </button>
          <button type="button" onClick={() => {
            const backUrl = `/admin/products${returnCategory ? `?category=${returnCategory}` : ''}`;
            navigate(backUrl, {
              state: { category: returnCategory }
            });
          }} className="cancel-btn">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProduct;
