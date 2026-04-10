import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBuyer } from '../../context/BuyerContext';
import { getApiUrl } from '../../utils/api';

const STATUS_COLORS = { open: '#28a745', in_progress: '#007bff', fulfilled: '#6f42c1', closed: '#6c757d' };
const STATUS_LABELS = { open: 'Open', in_progress: 'In Progress', fulfilled: 'Fulfilled', closed: 'Closed' };

const BuyerWishlist = () => {
  const navigate = useNavigate();
  const { buyer, isLoggedIn, loading: authLoading } = useBuyer();
  const [queries, setQueries] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    productName: '', productDescription: '', quantity: 1,
    targetPrice: '', currency: 'GBP', category: '', imageUrl: '',
    notes: '', taggedSellerIds: []
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || !buyer) { navigate('/login/buyer'); return; }
    fetchAll();
    // Mark wishlist as seen — clears notification count
    fetch(getApiUrl('wishlist/buyer/mark-seen'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('buyerToken')}` }
    }).catch(() => {});
  }, [isLoggedIn, buyer, authLoading]);

  const token = () => localStorage.getItem('buyerToken');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [qRes, sRes] = await Promise.all([
        fetch(getApiUrl('wishlist/buyer'), { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(getApiUrl('wishlist/sellers'), { headers: { Authorization: `Bearer ${token()}` } })
      ]);
      if (qRes.ok) setQueries((await qRes.json()).queries || []);
      if (sRes.ok) setSellers((await sRes.json()).sellers || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const resetForm = () => setForm({ productName: '', productDescription: '', quantity: 1, targetPrice: '', currency: 'GBP', category: '', imageUrl: '', notes: '', taggedSellerIds: [] });

  const openCreate = () => { resetForm(); setEditingId(null); setShowForm(true); };
  const openEdit = (q) => {
    setForm({
      productName: q.productName, productDescription: q.productDescription || '',
      quantity: q.quantity, targetPrice: q.targetPrice || '', currency: q.currency || 'GBP',
      category: q.category || '', imageUrl: q.imageUrl || '', notes: q.notes || '',
      taggedSellerIds: q.taggedSellers?.map(s => s.sellerId) || []
    });
    setEditingId(q._id); setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.productName.trim()) return;
    setSubmitting(true);
    try {
      const url = editingId ? getApiUrl(`wishlist/buyer/${editingId}`) : getApiUrl('wishlist/buyer');
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form)
      });
      if (res.ok) { setShowForm(false); resetForm(); setEditingId(null); fetchAll(); }
      else alert('Failed to save query');
    } catch (e) { alert('Error saving query'); }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this query?')) return;
    await fetch(getApiUrl(`wishlist/buyer/${id}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    fetchAll();
  };

  const toggleSeller = (id) => {
    setForm(f => ({
      ...f,
      taggedSellerIds: f.taggedSellerIds.includes(id)
        ? f.taggedSellerIds.filter(x => x !== id)
        : [...f.taggedSellerIds, id]
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const data = new FormData();
      data.append('image', file);
      const res = await fetch(getApiUrl('wishlist/upload-image'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: data
      });
      const json = await res.json();
      if (res.ok && json.imageUrl) {
        setForm(f => ({ ...f, imageUrl: json.imageUrl }));
      } else {
        alert('Image upload failed: ' + (json.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Image upload failed');
    }
    setImageUploading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: '20px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: '700', color: '#1a1a1a' }}>
              <i className="fas fa-heart me-2" style={{ color: '#e74c3c' }}></i>My Wishlist & Queries
            </h2>
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: '13px' }}>Post product requests and get offers from sellers</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => navigate('/buyer/dashboard')} className="btn btn-outline-secondary btn-sm">
              <i className="fas fa-arrow-left me-1"></i>Dashboard
            </button>
            <button onClick={openCreate} className="btn btn-primary btn-sm">
              <i className="fas fa-plus me-1"></i>New Request
            </button>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
            onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div style={{ background: 'linear-gradient(135deg, #007bff, #0056b3)', padding: '16px 20px', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h5 style={{ margin: 0, color: '#fff', fontWeight: '700' }}>
                  <i className="fas fa-edit me-2"></i>{editingId ? 'Edit Request' : 'New Product Request'}
                </h5>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}>×</button>
              </div>
              <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Product Name *</label>
                  <input className="form-control" value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} placeholder="What product are you looking for?" required />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Description</label>
                  <textarea className="form-control" rows={3} value={form.productDescription} onChange={e => setForm(f => ({ ...f, productDescription: e.target.value }))} placeholder="Describe specifications, quality, packaging requirements..." />
                </div>
                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-semibold">Quantity</label>
                    <input type="number" className="form-control" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-semibold">Target Price / Unit</label>
                    <input type="number" className="form-control" step="0.01" value={form.targetPrice} onChange={e => setForm(f => ({ ...f, targetPrice: e.target.value }))} placeholder="0.00" />
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-6">
                    <label className="form-label fw-semibold">Currency</label>
                    <select className="form-select" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                      <option value="GBP">GBP (£)</option>
                      <option value="PKR">PKR (Rs)</option>
                      <option value="USD">USD ($)</option>
                      <option value="AED">AED (د.إ)</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label fw-semibold">Category</label>
                    <input className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Electronics" />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Reference Image</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageUpload}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageUploading}
                      style={{
                        padding: '8px 16px', borderRadius: '6px', border: '2px dashed #dee2e6',
                        background: '#f8f9fa', cursor: 'pointer', fontSize: '13px',
                        color: '#495057', display: 'flex', alignItems: 'center', gap: '8px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#007bff'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#dee2e6'}
                    >
                      {imageUploading
                        ? <><span className="spinner-border spinner-border-sm"></span> Uploading...</>
                        : <><i className="fas fa-cloud-upload-alt"></i> {form.imageUrl ? 'Change Image' : 'Upload Image from Device'}</>
                      }
                    </button>
                    {form.imageUrl && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={form.imageUrl} alt="Preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #dee2e6' }} />
                        <div style={{ flex: 1, fontSize: '11px', color: '#888', wordBreak: 'break-all' }}>{form.imageUrl}</div>
                        <button type="button" onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                          style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '16px' }}>×</button>
                      </div>
                    )}
                    <small className="text-muted">Max 5MB. JPG, PNG, WebP supported.</small>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Notes</label>
                  <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." />
                </div>

                {/* Tag Sellers */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-tag me-1 text-warning"></i>Tag Sellers (optional)
                  </label>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Select specific sellers to notify. Leave empty to show to all sellers.</p>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '6px', padding: '8px' }}>
                    {sellers.length === 0 ? <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>No verified sellers available</p> :
                      sellers.map(s => (
                        <label key={s._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px', cursor: 'pointer', borderRadius: '4px', background: form.taggedSellerIds.includes(s._id) ? '#e8f4fd' : 'transparent' }}>
                          <input type="checkbox" checked={form.taggedSellerIds.includes(s._id)} onChange={() => toggleSeller(s._id)} />
                          <span style={{ fontSize: '13px', fontWeight: '600' }}>{s.username}</span>
                          <span style={{ fontSize: '11px', color: '#888' }}>{s.city}, {s.country} · {s.productCategory}</span>
                        </label>
                      ))
                    }
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="fas fa-paper-plane me-1"></i>{editingId ? 'Update' : 'Submit Request'}</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Queries List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: '#fff', borderRadius: '10px', padding: '20px', border: '1px solid #e9ecef', animation: 'pulse 1.5s ease-in-out infinite' }}>
                <div style={{ height: '14px', background: '#e9ecef', borderRadius: '4px', width: '45%', marginBottom: '10px' }}></div>
                <div style={{ height: '10px', background: '#f0f0f0', borderRadius: '4px', width: '75%', marginBottom: '8px' }}></div>
                <div style={{ height: '10px', background: '#f0f0f0', borderRadius: '4px', width: '55%' }}></div>
              </div>
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
          </div>
        ) : queries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🛍️</div>
            <h5 style={{ color: '#495057' }}>No product requests yet</h5>
            <p style={{ color: '#888', marginBottom: '20px' }}>Post your first product request and get offers from sellers</p>
            <button onClick={openCreate} className="btn btn-primary"><i className="fas fa-plus me-1"></i>Create First Request</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {queries.map(q => (
              <div key={q._id} style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden', border: '1px solid #e9ecef' }}>
                <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <h6 style={{ margin: 0, fontWeight: '700', color: '#1a1a1a' }}>{q.productName}</h6>
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: STATUS_COLORS[q.status] + '22', color: STATUS_COLORS[q.status], border: `1px solid ${STATUS_COLORS[q.status]}44` }}>
                        {STATUS_LABELS[q.status]}
                      </span>
                    </div>
                    {q.productDescription && <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#555' }}>{q.productDescription}</p>}
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#888', flexWrap: 'wrap' }}>
                      <span><i className="fas fa-boxes me-1"></i>Qty: {q.quantity}</span>
                      {q.targetPrice && <span><i className="fas fa-tag me-1"></i>Budget: {q.currency} {q.targetPrice}/unit</span>}
                      {q.category && <span><i className="fas fa-folder me-1"></i>{q.category}</span>}
                      <span><i className="fas fa-clock me-1"></i>{new Date(q.createdAt).toLocaleDateString()}</span>
                    </div>
                    {q.taggedSellers?.length > 0 && (
                      <div style={{ marginTop: '6px', fontSize: '11px', color: '#007bff' }}>
                        <i className="fas fa-tag me-1"></i>Tagged: {q.taggedSellers.map(s => s.username).join(', ')}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => setExpandedId(expandedId === q._id ? null : q._id)} className="btn btn-outline-info btn-sm">
                      <i className={`fas fa-chevron-${expandedId === q._id ? 'up' : 'down'}`}></i>
                      {q.responses?.length > 0 && <span className="badge bg-info ms-1">{q.responses.length}</span>}
                    </button>
                    <button onClick={() => openEdit(q)} className="btn btn-outline-primary btn-sm"><i className="fas fa-edit"></i></button>
                    <button onClick={() => handleDelete(q._id)} className="btn btn-outline-danger btn-sm"><i className="fas fa-trash"></i></button>
                  </div>
                </div>

                {/* Seller Responses */}
                {expandedId === q._id && (
                  <div style={{ borderTop: '1px solid #e9ecef', padding: '14px 16px', background: '#f8f9fa' }}>
                    <h6 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: '#495057' }}>
                      <i className="fas fa-reply me-1"></i>Seller Responses ({q.responses?.length || 0})
                    </h6>
                    {!q.responses?.length ? (
                      <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>No responses yet. Sellers will respond here.</p>
                    ) : (
                      q.responses.map((r, i) => (
                        <div key={i} style={{ background: '#fff', borderRadius: '8px', padding: '12px', marginBottom: '8px', border: '1px solid #dee2e6' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontWeight: '700', fontSize: '13px' }}>{r.sellerUsername}</span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {r.offerPrice && <span style={{ fontSize: '13px', fontWeight: '700', color: '#28a745' }}>{q.currency} {r.offerPrice}/unit</span>}
                              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: '#e8f5e9', color: '#28a745' }}>{r.status}</span>
                            </div>
                          </div>
                          {r.message && <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#555' }}>{r.message}</p>}
                          {r.sellerWhatsapp && (
                            <a href={`https://wa.me/${r.sellerWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${r.sellerUsername}, I'm interested in your offer for "${q.productName}"`)}`}
                              target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm" style={{ fontSize: '11px' }}>
                              <i className="fab fa-whatsapp me-1"></i>Contact on WhatsApp
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerWishlist;
