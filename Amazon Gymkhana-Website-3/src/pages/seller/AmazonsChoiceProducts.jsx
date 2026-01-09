import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeller } from '../../context/SellerContext';
import { getApiUrl } from '../../utils/api';
import { getImageUrl } from '../../utils/imageImports';

const SellerAmazonsChoiceProducts = () => {
  const navigate = useNavigate();
  const { seller, isLoggedIn } = useSeller();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [editedData, setEditedData] = useState({});
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    if (!isLoggedIn || !seller) {
      navigate('/login/supplier');
      return;
    }
    loadAmazonsChoiceProducts();
  }, [isLoggedIn, seller, navigate]);

  useEffect(() => {
    let filtered = products;
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(item => 
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }
    
    setFilteredProducts(filtered);
  }, [searchQuery, categoryFilter, products]);

  const loadAmazonsChoiceProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('products/public?isAmazonsChoice=true&limit=500'));
      const data = await response.json();
      
      if (data.products) {
        setProducts(data.products);
        setFilteredProducts(data.products);
        // Initialize edited data
        const initialEdited = {};
        data.products.forEach((product, index) => {
          initialEdited[index] = {
            price: product.price || 0,
            stock: 100 // Default stock
          };
        });
        setEditedData(initialEdited);
      } else {
        alert('❌ Failed to load Amazon\'s Choice products');
      }
    } catch (error) {
      alert('❌ Could not load Amazon\'s Choice products from server');
    } finally {
      setLoading(false);
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

  const handleListProducts = async () => {
    if (selectedProducts.size === 0) {
      alert('⚠️ Please select at least one product to list');
      return;
    }

    if (!confirm(`List ${selectedProducts.size} products to Amazon's Choice?`)) {
      return;
    }

    const productsToList = Array.from(selectedProducts).map(index => {
      const product = filteredProducts[index];
      const edited = editedData[index] || {};
      
      return {
        name: product.name,
        asin: product.asin || '',
        price: parseFloat(edited.price) || product.price || 0,
        originalPrice: product.originalPrice,
        category: product.category,
        brand: product.brand,
        stock: parseInt(edited.stock) || 100,
        rating: product.rating,
        reviews: product.reviews,
        discount: product.discount,
        description: product.description,
        image: product.images && product.images.length > 0 ? getImageUrl(product.images[0]) : '',
        images: product.images ? product.images.map(img => getImageUrl(img)) : [],
        marketplace: 'Amazon',
        currency: 'PKR',
        isAmazonsChoice: true,
        status: seller?.verificationStatus === 'approved' ? 'active' : 'pending',
        approvalStatus: seller?.verificationStatus === 'approved' ? 'approved' : 'pending',
        originalAdminProductId: product._id // Reference to original product
      };
    });

    try {
      setLoading(true);
      const token = localStorage.getItem('sellerToken');
      
      const response = await fetch(getApiUrl('products/seller/bulk-list'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ products: productsToList })
      });

      const data = await response.json();

      if (response.ok) {
        const message = seller?.verificationStatus === 'approved' 
          ? `✅ Successfully listed ${data.imported} Amazon's Choice products!`
          : `✅ Successfully submitted ${data.imported} Amazon's Choice products for approval!`;
        alert(message);
        setSelectedProducts(new Set());
      } else {
        alert('❌ ' + (data.message || 'Failed to list products'));
      }
    } catch (error) {
      alert('❌ Failed to list products: ' + error.message);
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

  // Get unique categories
  const categories = [...new Set(products.map(p => p.category))].filter(Boolean);

  if (loading) {
    return (
      <div className="container-fluid mt-3">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading Amazon's Choice products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid" style={{fontSize: '0.85rem', padding: '8px'}}>
      {/* Compact Header */}
      <div className="d-flex justify-content-between align-items-center mb-2" style={{padding: '4px 0'}}>
        <div>
          <h6 className="mb-1" style={{fontSize: '0.9rem', fontWeight: '600'}}>
            <i className="fas fa-trophy text-warning me-2"></i>
            Amazon's Choice Products ({products.length}) | Selected: {selectedProducts.size}
          </h6>
          <small className="text-muted">
            {seller?.verificationStatus === 'approved' 
              ? 'Products will be listed immediately' 
              : 'Products will require admin approval'}
          </small>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => navigate('/seller/dashboard')}
            style={{fontSize: '0.7rem', padding: '4px 8px'}}
          >
            <i className="fas fa-arrow-left me-1"></i>Back
          </button>
          <button 
            className="btn btn-info btn-sm" 
            onClick={loadAmazonsChoiceProducts}
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
        <div className="col-md-2">
          <select
            className="form-select form-select-sm"
            style={{fontSize: '0.75rem'}}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
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
            onClick={handleListProducts}
            disabled={selectedProducts.size === 0 || loading}
            style={{fontSize: '0.7rem'}}
          >
            <i className="fas fa-plus me-1"></i>
            List to My Products ({selectedProducts.size})
          </button>
        </div>
      </div>

      {/* Products Table */}
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
                  <th style={{fontSize: '0.75rem', padding: '8px'}}>Your Price (PKR)</th>
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
                        src={product.images && product.images.length > 0 ? getImageUrl(product.images[0]) : 'https://via.placeholder.com/40x40?text=No+Image'} 
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
                      <div className="input-group input-group-sm" style={{width: '120px'}}>
                        <span className="input-group-text" style={{fontSize: '0.7rem'}}>Rs</span>
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
                        value={editedData[index]?.stock ?? 100}
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
    </div>
  );
};

export default SellerAmazonsChoiceProducts;