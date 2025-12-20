import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { uploadMultipleImages, validateImageFile } from '../../utils/imageUpload';
import cacheManager from '../../utils/cacheManager';
import '../../styles/AdminProductForm.css';

const ExcelProductEdit = () => {
  const navigate = useNavigate();
  const { uploadId, productId } = useParams();
  
  // Only GBP currency used - no conversion needed
  const currency = 'GBP';
  const currencySymbol = '£';
  
  const [product, setProduct] = useState(null);
  const [upload, setUpload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    originalPrice: 0,
    category: '',
    brand: '',
    asin: '',
    rating: 4.5,
    reviews: 0,
    stock: 100,
    dealUnits: 1,
    description: '',
    features: [],
    isAmazonsChoice: false,
    isBestSeller: false,
    showOnHome: false,
    status: 'active'
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [originalImages, setOriginalImages] = useState([]); // Store original images from database
  const [removedImages, setRemovedImages] = useState(new Set()); // Track which image slots were explicitly removed
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef(null);
  const additionalFileInputRefs = useRef([null, null, null, null]); // Refs for 4 additional image inputs

  // Dynamic categories loaded from API
  const [categories, setCategories] = useState([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    fetchProduct();
    fetchCategories();
  }, [uploadId, productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/admin-excel/uploads/${uploadId}/products/${productId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProduct(data.product);
        setUpload(data.upload);
        
        // Initialize form data with product data
        setFormData({
          name: data.product.name || '',
          asin: data.product.asin || '',
          price: data.product.price || 0,
          originalPrice: data.product.originalPrice || data.product.price * 1.2 || 0,
          category: data.product.category || '',
          rating: data.product.rating || 4.0,
          reviews: data.product.reviews || 0,
          dealUnits: data.product.dealUnits || 1,
          stock: data.product.stock || 100,
          description: data.product.description || '',
          brand: data.product.brand || '',
          features: data.product.features || [],
          currency: data.product.currency || 'GBP',
          isAmazonsChoice: false,
          isBestSeller: false,
          showOnHome: false,
          status: 'active'
        });

        // Set existing image URLs for display and store original images
        if (data.product.images && data.product.images.length > 0) {
          // Initialize arrays with proper structure (up to 5 slots)
          const imageUrlsArray = new Array(5).fill(undefined);
          const imageFilesArray = new Array(5).fill(undefined);
          
          // Fill with existing images
          data.product.images.forEach((url, index) => {
            if (index < 5) {
              imageUrlsArray[index] = url;
            }
          });
          
          setImageUrls(imageUrlsArray);
          setImageFiles(imageFilesArray);
          setOriginalImages(data.product.images); // Store original images as backup
          setRemovedImages(new Set()); // Reset removed images when loading product
          console.log('📸 Loaded existing images:', data.product.images);
        } else {
          setImageUrls(new Array(5).fill(undefined));
          setImageFiles(new Array(5).fill(undefined));
          setOriginalImages([]);
          setRemovedImages(new Set()); // Reset removed images
          console.log('📸 No existing images found');
        }
      } else {
        alert('Failed to fetch product details');
        navigate(`/admin/excel-products/${uploadId}`);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      alert('Error fetching product details');
      navigate(`/admin/excel-products/${uploadId}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      // Include Excel categories for admin use
      const response = await fetch('http://localhost:5000/api/categories?includeExcel=true');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
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

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/categories', {
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
        
        // Add new category to the list
        setCategories(prev => [...prev, newCategory]);
        
        // Select the new category
        setFormData(prev => ({ ...prev, category: newCategory.value }));
        
        // Reset the input
        setNewCategoryName('');
        setShowNewCategoryInput(false);
        
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

  const handleSaveToMain = async () => {
    if (!formData.name || !formData.price) {
      alert('Product name and price are required');
      return;
    }

    if (!confirm('Save this product to the main website? It will be visible to customers.')) {
      return;
    }

    try {
      setSaving(true);
      
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
      
      const token = localStorage.getItem('adminToken');
      
      const saveData = {
        ...formData,
        images: finalImageUrls,
        fileName: upload?.originalFileName
      };

      const response = await fetch(`http://localhost:5000/api/admin-excel/uploads/${uploadId}/products/${productId}/save-to-main`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(saveData)
      });

      const result = await response.json();
      
      if (result.success) {
        // Clear cache to ensure updated product appears immediately
        cacheManager.clearAll();
        
        alert('✅ Product saved to main website successfully! Changes will appear immediately.');
        navigate(`/admin/excel-products/${uploadId}`);
      } else {
        alert(`❌ Failed to save product: ${result.message}`);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('❌ Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading product...</div>;
  }

  if (!product) {
    return (
      <div className="admin-product-form">
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '20px' }}>❌</div>
          <h2>Product Not Found</h2>
          <button onClick={() => navigate(`/admin/excel-products/${uploadId}`)} style={{ marginTop: '20px', padding: '10px 20px' }}>
            ← Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-product-form">
      <header className="form-header">
        <h1>✏️ Edit Excel Product</h1>
        <div className="header-actions">
          <button onClick={() => navigate(`/admin/excel-products/${uploadId}`)} className="back-btn">
            ← Back to Products
          </button>
        </div>
      </header>

      <form onSubmit={(e) => { e.preventDefault(); handleSaveToMain(); }} className="product-form">
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
                      <option key={cat.value} value={cat.value}>
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
              <label>Original Price (£)</label>
              <input
                type="number"
                name="originalPrice"
                value={formData.originalPrice}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
              <small>Original price before discount</small>
            </div>

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
          <h2>📝 Description & Features</h2>
          
          <div className="form-group">
            <label>Product Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Enter detailed product description..."
            />
          </div>
        </div>

        <div className="form-section">
          <h2>📸 Product Images</h2>
          <p className="section-description">
            Upload up to 5 high-quality product images. The first image will be the main product image.
          </p>
          
          {/* Main Image Upload */}
          <div className="image-upload-section">
            <h3>Main Product Image</h3>
            <div className="image-upload-container">
              <div className="image-slot main-image">
                {imageUrls[0] ? (
                  <div className="image-preview">
                    <img src={imageUrls[0]} alt="Main product" />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => removeImage(0)}
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="image-placeholder">
                    <span className="placeholder-icon">📷</span>
                    <span className="placeholder-text">Main Image</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleImageFileSelect(e, 0)}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImages}
                >
                  {imageUrls[0] ? 'Replace' : 'Upload'} Main Image
                </button>
              </div>
            </div>
          </div>

          {/* Additional Images */}
          <div className="image-upload-section">
            <h3>Additional Images (Optional)</h3>
            <div className="additional-images-grid">
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="image-slot additional-image">
                  {imageUrls[index] ? (
                    <div className="image-preview">
                      <img src={imageUrls[index]} alt={`Additional ${index}`} />
                      <button
                        type="button"
                        className="remove-image-btn"
                        onClick={() => removeImage(index)}
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="image-placeholder">
                      <span className="placeholder-icon">📷</span>
                      <span className="placeholder-text">Image {index}</span>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={el => additionalFileInputRefs.current[index - 1] = el}
                    onChange={(e) => handleImageFileSelect(e, index)}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="upload-btn small"
                    onClick={() => additionalFileInputRefs.current[index - 1]?.click()}
                    disabled={uploadingImages}
                  >
                    {imageUrls[index] ? 'Replace' : 'Upload'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bulk Upload */}
          <div className="bulk-upload-section">
            <h3>Bulk Upload</h3>
            <input
              type="file"
              onChange={(e) => handleImageFileSelect(e)}
              accept="image/*"
              multiple
              style={{ marginBottom: '10px' }}
            />
            <small>Select multiple images to upload at once. They will fill available slots automatically.</small>
          </div>

          {uploadingImages && (
            <div className="upload-progress">
              <span>📤 Uploading images...</span>
            </div>
          )}
        </div>

        <div className="form-section">
          <h2>🌐 Website Settings</h2>
          
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isAmazonsChoice"
                checked={formData.isAmazonsChoice}
                onChange={handleChange}
              />
              <span className="checkbox-text">🏆 Amazon's Choice</span>
              <small>Feature this product in Amazon's Choice section</small>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isBestSeller"
                checked={formData.isBestSeller}
                onChange={handleChange}
              />
              <span className="checkbox-text">🔥 Best Seller</span>
              <small>Mark as best seller product</small>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                name="showOnHome"
                checked={formData.showOnHome}
              />
              <span className="checkbox-text">🏠 Show on Home Page</span>
              <small>Display this product on the home page</small>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate(`/admin/excel-products/${uploadId}`)}
            className="cancel-btn"
            disabled={saving}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="save-btn"
            disabled={saving || !formData.name || !formData.price}
          >
            {saving ? (
              <>
                <span>⏳</span>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Save to Website</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExcelProductEdit;