import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { adminGet, adminPut, adminDelete } from '../../utils/adminApi';
import { uploadMultipleImages, validateImageFile } from '../../utils/imageUpload';
import cacheManager from '../../utils/cacheManager';
import { useCurrency } from '../../context/CurrencyContext';
import '../../styles/AdminProductForm.css';

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currency, currencySymbols } = useCurrency();
  
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
    status: 'active'
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [originalImages, setOriginalImages] = useState([]); // Store original images from database
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef(null);

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

  const fetchProduct = async () => {
    try {
      const response = await adminGet(`http://localhost:5000/api/products/${id}`);
      const product = await response.json();
      
      setFormData({
        name: product.name || '',
        price: product.price !== undefined && product.price !== null ? product.price : 0,
        category: product.category || '',
        brand: product.brand || '',
        rating: product.rating || 4.5,
        reviews: product.reviews || 0,
        stock: product.stock || 0,
        dealUnits: product.dealUnits !== undefined && product.dealUnits !== null ? product.dealUnits : 1,
        seller: product.seller?._id || '',
        isAmazonsChoice: product.isAmazonsChoice || false,
        status: product.status || 'active'
      });

      // Set existing image URLs for display and store original images
      if (product.images && product.images.length > 0) {
        setImageUrls(product.images);
        setOriginalImages(product.images); // Store original images as backup
        console.log('📸 Loaded existing images:', product.images);
      } else {
        setImageUrls([]);
        setOriginalImages([]);
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

    // Note: Price is now manually editable - no automatic calculation

    setFormData(newFormData);
  };

  const handleImageFileSelect = (e) => {
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

    setImageFiles(prev => [...prev, ...validFiles]);
    
    // Create preview URLs for new images
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageUrls(prev => [...prev, e.target.result]);
      };
      reader.readAsDataURL(file);
    });
    
    console.log('📸 Added new image files:', validFiles.length);
  };

  const removeImage = (index) => {
    const imageUrl = imageUrls[index];
    
    // Remove from imageUrls
    setImageUrls(prev => prev.filter((_, i) => i !== index));
    
    // If it's a base64 data URL (new image preview), also remove from imageFiles
    if (imageUrl && imageUrl.startsWith('data:')) {
      // Find the corresponding file index (new images are added after original images)
      const newImageIndex = index - originalImages.length;
      if (newImageIndex >= 0) {
        setImageFiles(prev => prev.filter((_, i) => i !== newImageIndex));
      }
    }
    
    console.log('📸 Removed image at index:', index, 'URL:', imageUrl);
  };

  const uploadImages = async () => {
    if (imageFiles.length === 0) return [];

    setUploadingImages(true);

    try {
      const result = await uploadMultipleImages(imageFiles);
      
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
      // Upload new images if any
      let newImageUrls = [];
      if (imageFiles.length > 0) {
        newImageUrls = await uploadImages();
      }

      // Combine existing images with new uploaded images
      let allImageUrls = [];
      
      // If no new images were uploaded, use original images from database
      if (imageFiles.length === 0) {
        // No new images, keep all original images
        allImageUrls = [...originalImages];
        console.log('📸 No new images uploaded, keeping original images:', originalImages);
      } else {
        // New images were uploaded, combine with existing non-preview images
        if (imageUrls.length > 0) {
          // Keep all existing URLs that are not base64 data URLs (preview URLs)
          const validExistingUrls = imageUrls.filter(url => {
            if (!url || typeof url !== 'string') return false;
            
            // Remove base64 data URLs (these are just previews)
            if (url.startsWith('data:')) return false;
            
            // Keep all other URLs - be more permissive to avoid losing valid images
            return true;
          });
          
          allImageUrls = [...validExistingUrls];
          console.log('📸 Keeping existing non-preview images:', validExistingUrls);
        }
        
        // Add any new uploaded images
        if (newImageUrls.length > 0) {
          allImageUrls = [...allImageUrls, ...newImageUrls];
          console.log('📸 Adding new uploaded images:', newImageUrls);
        }
      }
      
      // Final safety check - if we somehow lost all images and had original images, restore them
      if (allImageUrls.length === 0 && originalImages.length > 0) {
        allImageUrls = [...originalImages];
        console.log('📸 Safety fallback: Restored original images:', originalImages);
      }
      
      console.log('📸 Final image URLs to save:', allImageUrls);
      console.log('📸 Original imageUrls state:', imageUrls);
      console.log('📸 Original images from DB:', originalImages);
      console.log('📸 Image files selected:', imageFiles.length);

      const productData = {
        name: formData.name.trim(),
        price: isNaN(parseFloat(formData.price)) ? 0 : parseFloat(formData.price),
        category: formData.category,
        brand: formData.brand || '',
        rating: Math.min(Math.max(parseFloat(formData.rating) || 4.5, 0), 5), // Clamp between 0-5
        reviews: parseInt(formData.reviews) || 0,
        stock: parseInt(formData.stock) || 0,
        dealUnits: isNaN(parseInt(formData.dealUnits)) ? 1 : parseInt(formData.dealUnits),
        images: allImageUrls,
        isAmazonsChoice: formData.isAmazonsChoice || false,
        status: formData.status || 'active'
      };
      
      // Only include seller if it's not empty
      if (formData.seller && formData.seller.trim()) {
        productData.seller = formData.seller;
      }

      console.log('📤 Sending product data:', productData);
      console.log('📸 Image URLs being sent:', allImageUrls);
      console.log('📸 Original imageUrls state:', imageUrls);
      
      await adminPut(`http://localhost:5000/api/products/${id}`, productData);
      
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
      console.error('Product data that failed:', productData);
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
            <strong>💡 Currency Note:</strong> Prices are saved in {currency} ({currencySymbols[currency]}). 
            Make sure all admins use the same currency for consistency.
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
              <label>Price ({currencySymbols[currency]}) *</label>
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
          <h2>🖼️ Images</h2>
          
          <div className="form-group">
            <label>Upload Images from Computer *</label>
            <div style={{ marginBottom: '15px' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageFileSelect}
                multiple
                accept="image/*"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="upload-btn"
                style={{
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                📁 Select Images from Computer
              </button>
              <small>Select multiple images (JPEG, PNG, GIF, WebP, max 5MB each). New images will be added to existing ones.</small>
            </div>
          </div>

          {/* Image Preview */}
          {imageUrls.length > 0 && (
            <div className="form-group">
              <label>Current Images</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '10px',
                marginTop: '10px'
              }}>
                {imageUrls.map((url, index) => (
                  <div key={index} style={{
                    position: 'relative',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <img
                      src={url}
                      alt={`Product ${index + 1}`}
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
                      onClick={() => removeImage(index)}
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
                ))}
              </div>
            </div>
          )}
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
