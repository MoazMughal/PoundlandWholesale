import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminPost } from '../../utils/adminApi';
import { uploadMultipleImages, validateImageFile } from '../../utils/imageUpload';
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
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    category: '',
    brand: '',
    asin: '',
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
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef(null);
  const additionalFileInputRefs = useRef([null, null, null, null]); // Refs for 4 additional image inputs

  // No currency conversion needed - all prices in GBP

  // Dynamic categories loaded from API
  const [categories, setCategories] = useState([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    fetchSellers();
    fetchCategories();
  }, []);

  const fetchSellers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/sellers', {
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
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
      let finalImageUrls = [];

      // Upload new images if any
      const filesToUpload = imageFiles.filter(file => file !== null);
      console.log('📤 Files to upload:', filesToUpload.length);
      
      if (filesToUpload.length > 0) {
        setUploadingImages(true);
        try {
          console.log('📤 Starting image upload...');
          const uploadResult = await uploadMultipleImages(filesToUpload);
          console.log('📤 Upload result:', uploadResult);
          
          if (!uploadResult.success) {
            throw new Error(uploadResult.error);
          }
          
          const uploadedUrls = uploadResult.urls;
          
          // Map uploaded URLs to correct positions
          let uploadIndex = 0;
          for (let i = 0; i < imageFiles.length; i++) {
            if (imageFiles[i] !== null) {
              finalImageUrls[i] = uploadedUrls[uploadIndex];
              uploadIndex++;
            }
          }
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          alert(`❌ Failed to upload images: ${uploadError.message}`);
          return;
        } finally {
          setUploadingImages(false);
        }
      }

      // Filter out empty slots
      finalImageUrls = finalImageUrls.filter(url => url && url.trim() !== '');
      
      console.log('📝 Final processed image URLs:', finalImageUrls);

      // Save price in GBP - no conversion needed
      const priceInGBP = parseFloat(formData.price) || 0;
      
      console.log('💰 Price saving in GBP:', {
        priceInGBP: priceInGBP.toFixed(2)
      });

      const productData = {
        name: formData.name.trim(),
        description: formData.description || '',
        features: formData.features || [],
        price: priceInGBP,
        currency: 'GBP',
        category: formData.category,
        brand: formData.brand || '',
        asin: formData.asin.trim() || '',
        rating: parseFloat(formData.rating) || 4.5,
        reviews: parseInt(formData.reviews) || 0,
        stock: parseInt(formData.stock) || 0,
        dealUnits: parseInt(formData.dealUnits) || 1,
        seller: formData.seller || null,
        isAmazonsChoice: formData.isAmazonsChoice || false,
        isBestSeller: false,
        isLatestDeal: false,
        showOnHome: false,
        status: formData.status || 'active',
        approvalStatus: 'approved',
        isAdminProduct: true,
        listedBy: 'admin',
        images: finalImageUrls
      };

      console.log('📝 Creating product with data:', productData);
      console.log('📝 Final image URLs:', finalImageUrls);

      const response = await adminPost('http://localhost:5000/api/products', productData);
      
      if (response.ok) {
        const createdProduct = await response.json();
        console.log('✅ Product created successfully:', createdProduct);
        alert('✅ Product created successfully!');
        
        // Clear cache
        cacheManager.clearAll();
        
        // Navigate back to products list
        const returnUrl = returnCategory 
          ? `/admin/products?category=${returnCategory}`
          : '/admin/products';
        navigate(returnUrl, {
          state: { category: returnCategory }
        });
      } else {
        const errorData = await response.json();
        console.error('❌ Server error:', errorData);
        alert(`❌ Error creating product: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error creating product:', error);
      alert('❌ Failed to create product. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-product-form">
      <header className="form-header">
        <h1>➕ Add New Product</h1>
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
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <select name="category" value={formData.category} onChange={handleChange} required>
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
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
              <small>Enter price in GBP (£). All products use GBP currency for consistency.</small>
            </div>

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

            <div className="form-group">
              <label>Deal Units</label>
              <input
                type="number"
                name="dealUnits"
                value={formData.dealUnits}
                onChange={handleChange}
                min="1"
                placeholder="1"
              />
              <small>Minimum units for bulk deals</small>
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
                      objectFit: 'cover',
                      borderRadius: '6px',
                      border: '1px solid #ddd'
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
                          objectFit: 'cover',
                          borderRadius: '6px',
                          border: '1px solid #ddd'
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
    </div>
  );
};

export default AddProduct;
