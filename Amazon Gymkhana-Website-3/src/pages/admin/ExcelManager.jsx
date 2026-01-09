import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminGet, adminPost, adminDelete } from '../../utils/adminApi';
import '../../styles/AdminDashboard.css';
import '../../styles/AdminLayout.css';
import '../../styles/ExcelManager.css';

const ExcelManager = () => {
  const [excelFiles, setExcelFiles] = useState([]);
  const [imageZips, setImageZips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileProducts, setFileProducts] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState('excel'); // 'excel' or 'images'
  const navigate = useNavigate();

  useEffect(() => {
    fetchExcelFiles();
    fetchImageZips();
  }, []);

  const fetchExcelFiles = async () => {
    try {
      const response = await adminGet('http://localhost:5000/api/excel-manager/files');
      const data = await response.json();
      setExcelFiles(data.files || []);
    } catch (error) {
      console.error('Error fetching excel files:', error);
      setExcelFiles([]);
    }
  };

  const fetchImageZips = async () => {
    try {
      const response = await adminGet('http://localhost:5000/api/excel-manager/images');
      const data = await response.json();
      setImageZips(data.images || []);
    } catch (error) {
      console.error('Error fetching image zips:', error);
      setImageZips([]);
    } finally {
      setLoading(false);
    }
  };

  const openExcelFile = async (fileId) => {
    try {
      setLoading(true);
      const response = await adminGet(`http://localhost:5000/api/excel-manager/file/${fileId}/products`);
      const data = await response.json();
      setSelectedFile(data.fileName);
      setFileProducts(data.products || []);
      setShowProductModal(true);
    } catch (error) {
      console.error('Error opening excel file:', error);
      alert('Failed to open excel file');
    } finally {
      setLoading(false);
    }
  };

  const saveProductEdit = async () => {
    if (!editingProduct) return;

    try {
      const updatedProduct = {
        ...editingProduct,
        images: editingProduct.images.split(',').map(img => img.trim()).filter(img => img)
      };

      // Update in the local state
      setFileProducts(prev => 
        prev.map(p => p.id === editingProduct.id ? {...p, ...updatedProduct} : p)
      );
      
      setEditingProduct(null);
      alert('✅ Product updated successfully!');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('❌ Failed to update product');
    }
  };

  const handleProductSelect = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const listSelectedProducts = async () => {
    if (selectedProducts.length === 0) {
      alert('Please select products to list');
      return;
    }

    try {
      const productsToList = fileProducts.filter(p => selectedProducts.includes(p.id));
      
      const response = await adminPost('http://localhost:5000/api/excel-manager/list-products', {
        products: productsToList,
        sourceFile: selectedFile
      });

      if (response.ok) {
        alert(`✅ Successfully listed ${productsToList.length} products!`);
        setSelectedProducts([]);
      } else {
        throw new Error('Failed to list products');
      }
    } catch (error) {
      console.error('Error listing products:', error);
      alert('❌ Failed to list products');
    }
  };

  const deleteExcelFile = async (fileId) => {
    if (!confirm(`Are you sure you want to delete this Excel file?`)) return;

    try {
      await adminDelete(`http://localhost:5000/api/excel-manager/file/${fileId}`);
      alert('✅ File deleted successfully!');
      fetchExcelFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('❌ Failed to delete file');
    }
  };

  const deleteImageZip = async (fileId) => {
    if (!confirm(`Are you sure you want to delete this image collection?`)) return;

    try {
      await adminDelete(`http://localhost:5000/api/excel-manager/images/${fileId}`);
      alert('✅ Image zip deleted successfully!');
      fetchImageZips();
    } catch (error) {
      console.error('Error deleting image zip:', error);
      alert('❌ Failed to delete image zip');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', uploadType);

    try {
      setLoading(true);
      const endpoint = uploadType === 'excel' 
        ? 'http://localhost:5000/api/excel-manager/upload-excel'
        : 'http://localhost:5000/api/excel-manager/upload-images';
        
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: formData
      });

      if (response.ok) {
        alert(`✅ ${uploadType === 'excel' ? 'Excel file' : 'Image zip'} uploaded successfully!`);
        setShowUploadModal(false);
        if (uploadType === 'excel') {
          fetchExcelFiles();
        } else {
          fetchImageZips();
        }
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('❌ Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading Excel Manager...</div>;

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>📊 Excel Manager</h1>
          <p>Manage Excel files and image collections for product listings</p>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => {setUploadType('excel'); setShowUploadModal(true);}} 
            className="add-btn-header"
          >
            ➕ Upload Excel
          </button>
          <button 
            onClick={() => {setUploadType('images'); setShowUploadModal(true);}} 
            className="add-btn-header"
          >
            🖼️ Upload Images
          </button>
          <button onClick={() => navigate('/admin/dashboard')} className="view-site-btn">
            ← Dashboard
          </button>
        </div>
      </header>

      <div className="excel-manager-content">
        {/* Excel Files Section */}
        <div className="manager-section">
          <h2>📄 Excel Files ({excelFiles.length})</h2>
          <div className="files-grid">
            {excelFiles.map((file, index) => (
              <div key={file._id || index} className="file-card">
                <div className="file-icon">📊</div>
                <div className="file-info">
                  <h3>{file.originalName || file.name}</h3>
                  <p>Size: {file.size}</p>
                  <p>Uploaded: {new Date(file.modified).toLocaleDateString()}</p>
                  {file.productCount && <p>Products: {file.productCount}</p>}
                  {file.uploadedBy && <p>By: {file.uploadedBy}</p>}
                  {file.status && (
                    <p>Status: <span className={`status-badge ${file.status}`}>{file.status}</span></p>
                  )}
                </div>
                <div className="file-actions">
                  <button 
                    onClick={() => openExcelFile(file._id)}
                    className="btn-primary"
                  >
                    📂 Open
                  </button>
                  <button 
                    onClick={() => deleteExcelFile(file._id)}
                    className="btn-danger"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Image Zips Section */}
        <div className="manager-section">
          <h2>🖼️ Image Collections ({imageZips.length})</h2>
          <div className="files-grid">
            {imageZips.map((zip, index) => (
              <div key={zip._id || index} className="file-card">
                <div className="file-icon">🗂️</div>
                <div className="file-info">
                  <h3>{zip.originalName || zip.name}</h3>
                  <p>Size: {zip.size}</p>
                  <p>Uploaded: {new Date(zip.modified).toLocaleDateString()}</p>
                  {zip.imageCount && <p>Images: {zip.imageCount}</p>}
                  {zip.uploadedBy && <p>By: {zip.uploadedBy}</p>}
                  {zip.status && (
                    <p>Status: <span className={`status-badge ${zip.status}`}>{zip.status}</span></p>
                  )}
                </div>
                <div className="file-actions">
                  <button 
                    onClick={() => deleteImageZip(zip._id)}
                    className="btn-danger"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>
                {uploadType === 'excel' ? '📊 Upload Excel File' : '🖼️ Upload Image Zip'}
              </h2>
              <button onClick={() => setShowUploadModal(false)} className="close-btn">✕</button>
            </div>
            <div className="modal-body">
              <input
                type="file"
                accept={uploadType === 'excel' ? '.xlsx,.xls' : '.zip'}
                onChange={handleFileUpload}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px dashed #ddd',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}
              />
              <p style={{marginTop: '10px', color: '#666', fontSize: '0.9rem'}}>
                {uploadType === 'excel' 
                  ? 'Select an Excel file (.xlsx or .xls)'
                  : 'Select a ZIP file containing product images (name images with ASIN codes for auto-matching)'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h2>📊 Products in {selectedFile}</h2>
              <div className="modal-actions">
                {selectedProducts.length > 0 && (
                  <button onClick={listSelectedProducts} className="btn-success">
                    📋 List Selected ({selectedProducts.length})
                  </button>
                )}
                <button onClick={() => setShowProductModal(false)} className="close-btn">✕</button>
              </div>
            </div>
            <div className="modal-body">
              <div className="products-table">
                <table>
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts(fileProducts.map(p => p.id));
                            } else {
                              setSelectedProducts([]);
                            }
                          }}
                          checked={selectedProducts.length === fileProducts.length && fileProducts.length > 0}
                        />
                      </th>
                      <th>Image</th>
                      <th>Title</th>
                      <th>ASIN</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Rating</th>
                      <th>Reviews</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fileProducts.map(product => (
                      <tr key={product.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => handleProductSelect(product.id)}
                          />
                        </td>
                        <td>
                          <img 
                            src={product.image || product.images?.[0] || 'https://via.placeholder.com/50x50'} 
                            alt={product.name}
                            style={{width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer'}}
                            onClick={() => {
                              // Open image in new tab for viewing
                              window.open(product.image || product.images?.[0], '_blank');
                            }}
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/50x50?text=No+Image';
                            }}
                            title="Click to view full image"
                          />
                        </td>
                        <td>
                          {editingProduct?.id === product.id ? (
                            <input
                              type="text"
                              value={editingProduct.title || editingProduct.name || ''}
                              onChange={(e) => setEditingProduct({...editingProduct, title: e.target.value, name: e.target.value})}
                              style={{width: '200px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px'}}
                            />
                          ) : (
                            <span title={product.title || product.name} style={{
                              display: 'block',
                              maxWidth: '200px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {product.title || product.name || 'N/A'}
                            </span>
                          )}
                        </td>
                        <td>
                          {editingProduct?.id === product.id ? (
                            <input
                              type="text"
                              value={editingProduct.asin || ''}
                              onChange={(e) => setEditingProduct({...editingProduct, asin: e.target.value})}
                              style={{width: '100px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px'}}
                            />
                          ) : (
                            product.asin || 'N/A'
                          )}
                        </td>
                        <td>
                          {editingProduct?.id === product.id ? (
                            <select
                              value={editingProduct.category || ''}
                              onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                              style={{width: '120px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px'}}
                            >
                              <option value="">Select Category</option>
                              <option value="electronics">Electronics</option>
                              <option value="clothing">Clothing</option>
                              <option value="home">Home & Garden</option>
                              <option value="sports">Sports</option>
                              <option value="books">Books</option>
                              <option value="toys">Toys</option>
                              <option value="beauty">Beauty</option>
                              <option value="automotive">Automotive</option>
                              <option value="lighting">Lighting</option>
                            </select>
                          ) : (
                            <span className="category-badge">{product.category || 'Uncategorized'}</span>
                          )}
                        </td>
                        <td className="price">
                          {editingProduct?.id === product.id ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editingProduct.price || ''}
                              onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})}
                              style={{width: '80px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px'}}
                            />
                          ) : (
                            product.price ? `£${product.price}` : 'N/A'
                          )}
                        </td>
                        <td>
                          {editingProduct?.id === product.id ? (
                            <input
                              type="number"
                              step="0.1"
                              min="1"
                              max="5"
                              value={editingProduct.rating || ''}
                              onChange={(e) => setEditingProduct({...editingProduct, rating: parseFloat(e.target.value)})}
                              style={{width: '60px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px'}}
                            />
                          ) : (
                            <span style={{color: '#ff9800'}}>
                              ⭐ {product.rating || 'N/A'}
                            </span>
                          )}
                        </td>
                        <td>
                          {editingProduct?.id === product.id ? (
                            <input
                              type="number"
                              min="0"
                              value={editingProduct.reviews || ''}
                              onChange={(e) => setEditingProduct({...editingProduct, reviews: parseInt(e.target.value)})}
                              style={{width: '80px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px'}}
                            />
                          ) : (
                            <span style={{color: '#666'}}>
                              {product.reviews || 0}
                            </span>
                          )}
                        </td>
                        <td className="actions">
                          {editingProduct?.id === product.id ? (
                            <>
                              <button 
                                onClick={() => {
                                  saveProductEdit();
                                }}
                                className="btn-success"
                                style={{marginRight: '5px'}}
                              >
                                ✅ Save
                              </button>
                              <button 
                                onClick={() => setEditingProduct(null)}
                                className="btn-secondary"
                              >
                                ❌ Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => setEditingProduct({
                                  id: product.id,
                                  title: product.title || product.name || '',
                                  name: product.name || product.title || '',
                                  asin: product.asin || '',
                                  category: product.category || '',
                                  price: product.price || 0,
                                  rating: product.rating || 4.5,
                                  reviews: product.reviews || 0,
                                  images: Array.isArray(product.images) ? product.images.join(', ') : (product.images || product.image || '')
                                })}
                                className="btn-primary"
                                style={{marginRight: '5px'}}
                              >
                                ✏️ Edit
                              </button>
                              <button 
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    name: product.name || 'Product',
                                    img: product.image || product.images?.[0] || '',
                                    price: product.price || 0,
                                    rating: product.rating || 4.5,
                                    reviews: product.reviews || 0,
                                    category: product.category || 'General',
                                    brand: product.brand || '',
                                    discount: product.discount || 0
                                  });
                                  window.open(`/product/${product.id}?${params.toString()}`, '_blank');
                                }}
                                className="btn-secondary"
                              >
                                👁️ View
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelManager;