import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeller } from '../../context/SellerContext';
import { getApiUrl } from '../../utils/api';

const ListedProducts = () => {
  const navigate = useNavigate();
  const { seller, isLoggedIn } = useSeller();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [activeTab, setActiveTab] = useState('all');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editData, setEditData] = useState({ price: '', stock: '' });

  useEffect(() => {
    if (!isLoggedIn || !seller) {
      navigate('/login/supplier');
      return;
    }
    loadProducts();
  }, [isLoggedIn, seller, navigate, activeTab]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sellerToken');
      const statusParam = activeTab !== 'all' ? `&status=${activeTab}` : '';
      
      const response = await fetch(getApiUrl(`products/seller/listed-products?limit=50${statusParam}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log('Listed products response:', data);
      
      if (response.ok) {
        setProducts(data.products);
        setCounts(data.counts);
        console.log('Loaded products:', data.products.length, 'Counts:', data.counts);
      } else {
        console.error('Listed products error:', data);
        alert('❌ ' + data.message);
      }
    } catch (error) {
      alert('❌ Could not load products: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditInventory = (product) => {
    setEditingProduct(product._id);
    setEditData({
      price: product.price.toString(),
      stock: product.stock.toString()
    });
  };

  const saveInventoryChanges = async (productId) => {
    try {
      const token = localStorage.getItem('sellerToken');
      
      const response = await fetch(getApiUrl(`products/seller/update-inventory/${productId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price: parseFloat(editData.price),
          stock: parseInt(editData.stock)
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Update local state
        setProducts(prev => prev.map(p => 
          p._id === productId 
            ? { ...p, price: parseFloat(editData.price), stock: parseInt(editData.stock) }
            : p
        ));
        setEditingProduct(null);
        alert('✅ Inventory updated successfully');
      } else {
        alert('❌ ' + data.message);
      }
    } catch (error) {
      alert('❌ Failed to update inventory: ' + error.message);
    }
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setEditData({ price: '', stock: '' });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-warning text-dark',
      approved: 'bg-success',
      rejected: 'bg-danger'
    };
    return badges[status] || 'bg-secondary';
  };

  const getMarketplaceBadge = (marketplace) => {
    const badges = {
      UK: 'bg-primary',
      UAE: 'bg-info',
      US: 'bg-success',
      Amazon10: 'bg-warning text-dark'
    };
    return badges[marketplace] || 'bg-secondary';
  };

  if (loading) {
    return (
      <div className="container-fluid mt-3">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading your products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid" style={{ fontSize: '0.85rem', padding: '8px' }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-1">
            <i className="fas fa-boxes text-primary me-2"></i>
            My Listed Products
          </h5>
          <small className="text-muted">
            Manage your product inventory and pricing
          </small>
        </div>
        <button 
          className="btn btn-secondary btn-sm" 
          onClick={() => navigate('/seller/dashboard')}
        >
          <i className="fas fa-arrow-left me-1"></i>Back to Dashboard
        </button>
      </div>

      {/* Stats Cards */}
      <div className="row g-2 mb-3">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body py-2">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title mb-0">Total Products</h6>
                  <h4 className="mb-0">{counts.total}</h4>
                </div>
                <i className="fas fa-boxes fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body py-2">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title mb-0">Approved</h6>
                  <h4 className="mb-0">{counts.approved}</h4>
                </div>
                <i className="fas fa-check-circle fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-dark">
            <div className="card-body py-2">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title mb-0">Pending</h6>
                  <h4 className="mb-0">{counts.pending}</h4>
                </div>
                <i className="fas fa-clock fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-danger text-white">
            <div className="card-body py-2">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title mb-0">Rejected</h6>
                  <h4 className="mb-0">{counts.rejected}</h4>
                </div>
                <i className="fas fa-times-circle fa-2x opacity-75"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Products ({counts.total})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            Approved ({counts.approved})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending ({counts.pending})
          </button>
        </li>
        {counts.rejected > 0 && (
          <li className="nav-item">
            <button 
              className={`nav-link ${activeTab === 'rejected' ? 'active' : ''}`}
              onClick={() => setActiveTab('rejected')}
            >
              Rejected ({counts.rejected})
            </button>
          </li>
        )}
      </ul>

      {/* Products Table */}
      <div className="card">
        <div className="card-body">
          {products.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
              <h5 className="text-muted">No products found</h5>
              <p className="text-muted">
                {activeTab === 'all' 
                  ? "You haven't listed any products yet." 
                  : `No ${activeTab} products found.`}
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/seller/dashboard')}
              >
                <i className="fas fa-plus me-1"></i>List Products
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Image</th>
                    <th>Product Name</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Category</th>
                    <th>Marketplace</th>
                    <th>Status</th>
                    <th>Listed Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product._id}>
                      <td>
                        <img 
                          src={product.images?.[0] || 'https://via.placeholder.com/50x50?text=No+Image'} 
                          alt={product.name}
                          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/40x40?text=No+Image';
                          }}
                        />
                      </td>
                      <td>
                        <div style={{ maxWidth: '200px' }}>
                          <strong className="d-block text-truncate">{product.name}</strong>
                          {product.asin && (
                            <small className="text-muted">ASIN: {product.asin}</small>
                          )}
                        </div>
                      </td>
                      <td>
                        {editingProduct === product._id ? (
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            style={{ width: '80px' }}
                            value={editData.price}
                            onChange={(e) => setEditData(prev => ({ ...prev, price: e.target.value }))}
                          />
                        ) : (
                          <span className="fw-bold text-success">
                            {product.currency || 'PKR'} {product.price}
                          </span>
                        )}
                      </td>
                      <td>
                        {editingProduct === product._id ? (
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            style={{ width: '70px' }}
                            value={editData.stock}
                            onChange={(e) => setEditData(prev => ({ ...prev, stock: e.target.value }))}
                          />
                        ) : (
                          <span className={`badge ${product.stock > 0 ? 'bg-success' : 'bg-danger'}`}>
                            {product.stock}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-info">{product.category}</span>
                      </td>
                      <td>
                        <span className={`badge ${getMarketplaceBadge(product.marketplace)}`}>
                          {product.marketplace}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(product.approvalStatus)}`}>
                          {product.approvalStatus}
                        </span>
                        {product.isAmazonsChoice && (
                          <div>
                            <small className="badge bg-warning text-dark mt-1">Amazon's Choice</small>
                          </div>
                        )}
                      </td>
                      <td>
                        <small className="text-muted">
                          {new Date(product.createdAt).toLocaleDateString()}
                        </small>
                      </td>
                      <td>
                        {editingProduct === product._id ? (
                          <div className="btn-group btn-group-sm">
                            <button 
                              className="btn btn-success btn-sm"
                              onClick={() => saveInventoryChanges(product._id)}
                            >
                              <i className="fas fa-check"></i>
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={cancelEdit}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => handleEditInventory(product)}
                            disabled={product.approvalStatus !== 'approved'}
                            title={product.approvalStatus !== 'approved' ? 'Only approved products can be edited' : 'Edit price and stock'}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListedProducts;