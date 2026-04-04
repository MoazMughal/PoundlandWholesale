import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../utils/api';

const SellerCatalog = () => {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { fetchSellers(); }, []);

  const fetchSellers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(getApiUrl('sellers/admin/sellers'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setSellers(data.sellers || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchSellerProducts = async (seller) => {
    setSelectedSeller(seller);
    setProducts([]);
    setProductSearch('');
    setProductsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(getApiUrl(`sellers/admin/seller/${seller._id}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setProducts(data.products || []);
    } catch (err) { console.error(err); }
    finally { setProductsLoading(false); }
  };

  const handleDeleteSeller = async (seller, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete seller "${seller.username}"? This cannot be undone.`)) return;
    setDeletingId(seller._id);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(getApiUrl(`sellers/${seller._id}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSellers(prev => prev.filter(s => s._id !== seller._id));
        if (selectedSeller?._id === seller._id) setSelectedSeller(null);
      } else {
        const data = await res.json();
        alert('❌ ' + (data.message || 'Failed to delete seller'));
      }
    } catch { alert('❌ Failed to delete seller'); }
    finally { setDeletingId(null); }
  };

  const filteredSellers = sellers.filter(s =>
    s.username?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.city?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.asin?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.category?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const statusColor = (status) => {
    if (status === 'approved') return '#16a34a';
    if (status === 'pending') return '#d97706';
    return '#dc2626';
  };

  const canDelete = (seller) => seller.verificationStatus !== 'approved';

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>

      {/* Left panel */}
      <div style={{ width: selectedSeller ? '300px' : '100%', minWidth: '260px', borderRight: '1px solid #e5e7eb', background: 'white', display: 'flex', flexDirection: 'column', transition: 'width 0.2s' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <button onClick={() => navigate('/admin/dashboard')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.8rem' }}>
              ← Back
            </button>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>
              <i className="fas fa-users me-2 text-success"></i>Seller Catalog
            </h2>
          </div>
          <input type="text" placeholder="Search sellers..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', fontSize: '0.8rem', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }} />
          <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '6px' }}>
            {filteredSellers.length} seller{filteredSellers.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>
              <i className="fas fa-spinner fa-spin me-2"></i>Loading...
            </div>
          ) : filteredSellers.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>No sellers found</div>
          ) : (
            filteredSellers.map(seller => (
              <div key={seller._id} onClick={() => fetchSellerProducts(seller)}
                style={{
                  padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                  background: selectedSeller?._id === seller._id ? '#f0fdf4' : 'white',
                  borderLeft: selectedSeller?._id === seller._id ? '3px solid #16a34a' : '3px solid transparent',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { if (selectedSeller?._id !== seller._id) e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={e => { if (selectedSeller?._id !== seller._id) e.currentTarget.style.background = 'white'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seller.username}</div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seller.email}</div>
                    {seller.city && (
                      <div style={{ fontSize: '0.62rem', color: '#9ca3af', marginTop: '1px' }}>📍 {seller.city}, {seller.country}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.58rem', fontWeight: '700', padding: '2px 5px', borderRadius: '10px',
                      background: statusColor(seller.verificationStatus) + '20',
                      color: statusColor(seller.verificationStatus),
                      border: `1px solid ${statusColor(seller.verificationStatus)}40`,
                      whiteSpace: 'nowrap'
                    }}>
                      {seller.verificationStatus || 'pending'}
                    </span>
                    {canDelete(seller) && (
                      <button onClick={e => handleDeleteSeller(seller, e)} disabled={deletingId === seller._id}
                        style={{ padding: '2px 6px', fontSize: '0.58rem', fontWeight: '700', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer' }}>
                        {deletingId === seller._id ? '...' : '🗑️ Delete'}
                      </button>
                    )}
                  </div>
                </div>
                {seller.supplierId && (
                  <div style={{ fontSize: '0.58rem', color: '#9ca3af', marginTop: '3px', fontFamily: 'monospace' }}>
                    ID: {seller.supplierId}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right panel — Products */}
      {selectedSeller && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>{selectedSeller.username}</h3>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>
                  {selectedSeller.email}
                  {selectedSeller.whatsappNo && (
                    <a href={`https://wa.me/${selectedSeller.whatsappNo.replace(/[^0-9]/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ color: '#25d366', marginLeft: '10px', textDecoration: 'none' }}>
                      <i className="fab fa-whatsapp me-1"></i>{selectedSeller.whatsappNo}
                    </a>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedSeller(null)}
                style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', color: '#6b7280' }}>
                ✕
              </button>
            </div>
            <input type="text" placeholder="Search products..." value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', fontSize: '0.8rem', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '5px' }}>
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
            {productsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <i className="fas fa-spinner fa-spin me-2"></i>Loading products...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <i className="fas fa-box-open" style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}></i>
                No products found
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '12px' }}>
                {filteredProducts.map(product => (
                  <div key={product._id}
                    onClick={() => window.open(`/product/${product._id}`, '_blank')}
                    style={{
                      background: 'white', borderRadius: '8px', overflow: 'hidden',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer',
                      border: '1px solid #e5e7eb', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ height: '100px', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name}
                          style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
                          onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <i className="fas fa-image" style={{ fontSize: '1.5rem', color: '#d1d5db' }}></i>
                      )}
                      {product.isAmazonsChoice && (
                        <span style={{ position: 'absolute', top: '4px', left: '4px', background: '#ff9900', color: 'white', fontSize: '0.52rem', fontWeight: '700', padding: '2px 4px', borderRadius: '3px' }}>
                          ⭐ Choice
                        </span>
                      )}
                      <span style={{
                        position: 'absolute', top: '4px', right: '4px',
                        background: statusColor(product.approvalStatus) + '22',
                        color: statusColor(product.approvalStatus),
                        border: `1px solid ${statusColor(product.approvalStatus)}40`,
                        fontSize: '0.52rem', fontWeight: '700', padding: '2px 4px', borderRadius: '3px'
                      }}>
                        {product.approvalStatus || 'active'}
                      </span>
                    </div>
                    <div style={{ padding: '8px' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#1f2937', lineHeight: '1.3', marginBottom: '5px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {product.name}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#059669' }}>
                          £{parseFloat(product.sellerPrice || product.price).toFixed(2)}
                        </span>
                        <span style={{ fontSize: '0.6rem', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '3px', padding: '1px 4px', color: '#856404', fontWeight: '700' }}>
                          MOQ: {product.sellerMoq || 1}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.6rem', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>{product.category}</span>
                        <span style={{ fontSize: '0.58rem', color: product.listingType === 'listed' ? '#3b82f6' : '#6b7280', fontWeight: '600', whiteSpace: 'nowrap' }}>
                          {product.listingType === 'listed' ? '📋 Listed' : '🏷️ Primary'}
                        </span>
                      </div>
                      {product.asin && (
                        <div style={{ fontSize: '0.58rem', color: '#9ca3af', marginTop: '2px', fontFamily: 'monospace' }}>{product.asin}</div>
                      )}
                      {product.sku && (
                        <div style={{ fontSize: '0.58rem', color: '#a78bfa', marginTop: '1px', fontFamily: 'monospace' }}>SKU: {product.sku}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerCatalog;
