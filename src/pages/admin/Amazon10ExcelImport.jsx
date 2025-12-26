import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { getApiUrl } from '../../utils/api';

const Amazon10ExcelImport = () => {
  const { isLoggedIn: isAdminLoggedIn, loading: adminLoading } = useAdmin();
  const [amazon10Products, setAmazon10Products] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [editedData, setEditedData] = useState({});
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const navigate = useNavigate();

  // Helper function to get Amazon 10 image path
  const getAmazon10ImagePath = (asin) => {
    if (!asin) return 'https://via.placeholder.com/50x50?text=No+Image';
    
    // Images are served from the public folder
    // Vite serves public folder assets at the root path
    return `/assets/amazon10/${asin}.jpg`;
  };

  // Load Amazon 10 products and sellers from server
  useEffect(() => {
    if (!adminLoading && isAdminLoggedIn) {
      loadAmazon10Products();
      loadSellers();
    }
  }, [adminLoading, isAdminLoggedIn]);

  useEffect(() => {
    let filtered = amazon10Products;
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(item => 
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.asin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }
    
    setFilteredProducts(filtered);
  }, [searchQuery, categoryFilter, amazon10Products]);

  const loadAmazon10Products = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('excel/amazon10-products'));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAmazon10Products(data.products);
        setFilteredProducts(data.products);
        // Initialize edited data with default values
        const initialEdited = {};
        data.products.forEach((product, index) => {
          initialEdited[index] = {
            price: product.price || 0,
            stock: product.stock || 0
          };
        });
        setEditedData(initialEdited);
      } else {
        alert('❌ ' + (data.message || 'Unknown error from server'));
      }
    } catch (error) {
      alert(`❌ Could not load Amazon 10 products from server: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadSellers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      if (!token || !isAdminLoggedIn) {
        
        return;
      }
      
      // Load ALL sellers (verified and unverified)
      const response = await fetch(getApiUrl('sellers?status=all'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch sellers');
      }
      
      const data = await response.json();
      
      if (data.sellers && Array.isArray(data.sellers)) {
        if (data.sellers.length === 0) {
          alert('ℹ️ No sellers found in the system');
        }
        setSellers(data.sellers);
      } else {
        alert('⚠️ Invalid response format from server');
        setSellers([]);
      }
    } catch (error) {
      alert('❌ Could not load sellers: ' + error.message);
      setSellers([]);
    }
  };

  const toggleSelectProduct = (index) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProducts(newSelected);
  };

  const handleEditChange = (index, field, value) => {
    setEditedData(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value
      }
    }));
  };

  const handleImportToCategory = async (targetCategory) => {
    if (selectedProducts.size === 0) {
      alert('⚠️ Please select at least one product to import');
      return;
    }

    if (!selectedSeller) {
      alert('⚠️ Please select a seller first');
      return;
    }

    const categoryNames = {
      'amazons-choice': "Amazon's Choice"
    };

    if (!confirm(`Import ${selectedProducts.size} products to ${categoryNames[targetCategory]} for seller ${sellers.find(s => s._id === selectedSeller)?.username}?`)) {
      return;
    }

    const productsToImport = Array.from(selectedProducts).map(index => {
      const product = filteredProducts[index];
      const edited = editedData[index] || {};
      
      // Use ASIN to construct image URL
      const imageUrl = getAmazon10ImagePath(product.asin);
      
      return {
        name: product.name,
        asin: product.asin,
        price: parseFloat(edited.price) || product.price || 0,
        originalPrice: product.originalPrice,
        category: product.category,
        brand: product.brand,
        rating: product.rating,
        reviews: product.reviews,
        stock: parseInt(edited.stock) || product.stock || 0,
        description: product.description,
        image: imageUrl,
        images: [imageUrl],
        discount: product.discount,
        marketplace: 'Amazon10',
        currency: 'USD',
        isAdminProduct: true,
        isAmazonsChoice: targetCategory === 'amazons-choice',
        isBestSeller: false,
        isLatestDeal: false,
        showOnHome: false,
        status: 'active',
        approvalStatus: 'approved',
        seller: selectedSeller,
        listedBy: 'admin'
      };
    });

    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(getApiUrl('products/admin/bulk-import'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ products: productsToImport })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Successfully imported ${data.imported} Amazon 10 products to ${categoryNames[targetCategory]}!`);
        setSelectedProducts(new Set());
        loadAmazon10Products(); // Reload to refresh
      } else {
        alert('❌ ' + (data.message || 'Failed to import products'));
      }
    } catch (error) {
      alert('❌ Failed to import products: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map((_, index) => index)));
    }
  };

  return (
    <div className="container-fluid" style={{fontSize: '0.85rem', padding: '8px'}}>
      {/* Compact Header */}
      <div className="d-flex justify-content-between align-items-center mb-2" style={{padding: '4px 0'}}>
        <div>
          <h6 className="mb-1" style={{fontSize: '0.9rem', fontWeight: '600'}}>
            <i className="fas fa-file-excel text-info me-2"></i>
            Amazon 10 Products ({amazon10Products.length}) | Selected: {selectedProducts.size}
          </h6>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => navigate('/admin/dashboard')}
            style={{fontSize: '0.7rem', padding: '4px 8px'}}
          >
            <i className="fas fa-arrow-left me-1"></i>Back
          </button>
          <button 
            className="btn btn-info btn-sm" 
            onClick={loadAmazon10Products}
            disabled={loading}
            style={{fontSize: '0.7rem', padding: '4px 8px'}}
          >
            <i className="fas fa-sync me-1"></i>Reload
          </button>
        </div>
      </div>

      {/* Compact Controls */}
      <div className="row g-1 mb-2">
        <div className="col-md-4">
          <div className="input-group input-group-sm">
            <span className="input-group-text" style={{fontSize: '0.7rem'}}>
              <i className="fas fa-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              style={{fontSize: '0.75rem'}}
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setSearchQuery('')}
                style={{fontSize: '0.7rem'}}
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>
        <div className="col-md-3">
          <select
            className="form-select form-select-sm"
            style={{fontSize: '0.75rem'}}
            value={selectedSeller}
            onChange={(e) => setSelectedSeller(e.target.value)}
            disabled={sellers.length === 0}
          >
            <option value="">Select Seller ({sellers.length})</option>
            {sellers.map(seller => (
              <option key={seller._id} value={seller._id}>
                {seller.username} - {seller.verificationStatus}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <button 
            className="btn btn-outline-primary btn-sm w-100"
            style={{fontSize: '0.7rem'}}
            onClick={selectAll}
          >
            {selectedProducts.size === filteredProducts.length && filteredProducts.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="col-md-3">
          <button 
            className="btn btn-warning btn-sm w-100"
            onClick={() => handleImportToCategory('amazons-choice')}
            disabled={selectedProducts.size === 0 || loading || !selectedSeller}
            style={{fontSize: '0.7rem'}}
          >
            <i className="fas fa-trophy me-1"></i>
            Import to Amazon's Choice ({selectedProducts.size})
          </button>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading Amazon 10 products...</p>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <div className="table-responsive" style={{overflow: 'hidden', overflowY: 'auto', maxHeight: '70vh'}}>
              <table className="table table-hover" style={{tableLayout: 'fixed', width: '100%'}}>
                <thead>
                  <tr>
                    <th style={{width: '40px', fontSize: '0.75rem', padding: '8px'}}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                        onChange={selectAll}
                      />
                    </th>
                    <th style={{fontSize: '0.75rem', padding: '8px'}}>Image</th>
                    <th style={{fontSize: '0.75rem', padding: '8px'}}>Product Name</th>
                    <th style={{fontSize: '0.75rem', padding: '8px'}}>ASIN</th>
                    <th style={{fontSize: '0.75rem', padding: '8px'}}>Price (USD)</th>
                    <th style={{fontSize: '0.75rem', padding: '8px'}}>Stock</th>
                    <th style={{fontSize: '0.75rem', padding: '8px'}}>Rating</th>
                    <th style={{fontSize: '0.75rem', padding: '8px'}}>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, index) => (
                    <tr key={index} style={{fontSize: '0.8rem'}}>
                      <td style={{padding: '8px'}}>
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(index)}
                          onChange={() => toggleSelectProduct(index)}
                        />
                      </td>
                      <td style={{padding: '8px'}}>
                        <img 
                          src={getAmazon10ImagePath(product.asin)} 
                          alt={product.name}
                          style={{width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px'}}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/40x40?text=No+Image';
                          }}
                        />
                      </td>
                      <td style={{padding: '8px'}}>
                        <div style={{maxWidth: '300px', fontSize: '0.8rem'}}>
                          <strong>{product.name}</strong>
                          {product.brand && <div className="text-muted" style={{fontSize: '0.7rem'}}>{product.brand}</div>}
                        </div>
                      </td>
                      <td style={{padding: '8px'}}>
                        <code style={{fontSize: '0.7rem'}}>{product.asin}</code>
                      </td>
                      <td style={{padding: '8px'}}>
                        <div className="input-group input-group-sm" style={{width: '120px'}}>
                          <span className="input-group-text" style={{fontSize: '0.7rem'}}>$</span>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            style={{fontSize: '0.75rem'}}
                            value={editedData[index]?.price ?? product.price}
                            onChange={(e) => handleEditChange(index, 'price', e.target.value)}
                            placeholder="Price"
                          />
                        </div>
                      </td>
                      <td style={{padding: '8px'}}>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          style={{width: '70px', fontSize: '0.75rem'}}
                          value={editedData[index]?.stock ?? product.stock}
                          onChange={(e) => handleEditChange(index, 'stock', e.target.value)}
                          placeholder="Stock"
                        />
                      </td>
                      <td style={{padding: '8px'}}>
                        <span className="badge bg-warning" style={{fontSize: '0.7rem'}}>
                          <i className="fas fa-star"></i> {product.rating}
                        </span>
                        <div className="text-muted" style={{fontSize: '0.65rem'}}>{product.reviews} reviews</div>
                      </td>
                      <td style={{padding: '8px'}}>
                        <span className="badge bg-info" style={{fontSize: '0.7rem'}}>{product.category}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredProducts.length === 0 && !loading && (
              <div className="text-center py-5">
                <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                <p className="text-muted">No products found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Amazon10ExcelImport;