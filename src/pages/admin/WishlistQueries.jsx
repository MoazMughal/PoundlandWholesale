import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../utils/api';

const STATUS_COLORS = { open: '#28a745', in_progress: '#007bff', fulfilled: '#6f42c1', closed: '#6c757d' };

const AdminWishlistQueries = () => {
  const navigate = useNavigate();
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [total, setTotal] = useState(0);

  const token = () => localStorage.getItem('adminToken');

  useEffect(() => { fetchQueries(); }, [filter]);

  const fetchQueries = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await fetch(getApiUrl(`wishlist/admin${params}`), { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) {
        const data = await res.json();
        setQueries(data.queries || []);
        setTotal(data.total || 0);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: '700' }}>
              <i className="fas fa-heart me-2" style={{ color: '#e74c3c' }}></i>Buyer Wishlist & Queries
            </h2>
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: '13px' }}>All buyer product requests and seller responses — {total} total</p>
          </div>
          <button onClick={() => navigate('/admin/dashboard')} className="btn btn-outline-secondary btn-sm">
            <i className="fas fa-arrow-left me-1"></i>Dashboard
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total', value: queries.length, color: '#495057' },
            { label: 'Open', value: queries.filter(q => q.status === 'open').length, color: '#28a745' },
            { label: 'In Progress', value: queries.filter(q => q.status === 'in_progress').length, color: '#007bff' },
            { label: 'Fulfilled', value: queries.filter(q => q.status === 'fulfilled').length, color: '#6f42c1' },
            { label: 'With Responses', value: queries.filter(q => q.responses?.length > 0).length, color: '#ff6600' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: '10px', padding: '14px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#888' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {[['all', 'All'], ['open', 'Open'], ['in_progress', 'In Progress'], ['fulfilled', 'Fulfilled'], ['closed', 'Closed']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              style={{ padding: '5px 14px', borderRadius: '20px', border: '1px solid #dee2e6', fontSize: '12px', fontWeight: '600', cursor: 'pointer', background: filter === val ? '#343a40' : '#fff', color: filter === val ? '#fff' : '#495057' }}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
        ) : queries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '12px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
            <h5>No queries found</h5>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {queries.map(q => (
              <div key={q._id} style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #e9ecef', overflow: 'hidden' }}>
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <h6 style={{ margin: 0, fontWeight: '700' }}>{q.productName}</h6>
                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: (STATUS_COLORS[q.status] || '#888') + '22', color: STATUS_COLORS[q.status] || '#888', border: `1px solid ${STATUS_COLORS[q.status] || '#888'}44` }}>{q.status}</span>
                        {q.responses?.length > 0 && <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: '#fff3e0', color: '#ff6600', border: '1px solid #ff660044' }}>{q.responses.length} response{q.responses.length > 1 ? 's' : ''}</span>}
                      </div>

                      {/* Buyer info */}
                      <div style={{ background: '#f8f9fa', borderRadius: '6px', padding: '8px 12px', marginBottom: '8px', fontSize: '12px' }}>
                        <span style={{ fontWeight: '700', color: '#007bff' }}><i className="fas fa-user me-1"></i>Buyer: </span>
                        <span>{q.buyerName}</span>
                        {q.buyerEmail && <span style={{ color: '#888', marginLeft: '8px' }}>{q.buyerEmail}</span>}
                        {q.buyerWhatsapp && <span style={{ color: '#25d366', marginLeft: '8px' }}><i className="fab fa-whatsapp me-1"></i>{q.buyerWhatsapp}</span>}
                      </div>

                      <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#888', flexWrap: 'wrap' }}>
                        <span><i className="fas fa-boxes me-1"></i>Qty: {q.quantity}</span>
                        {q.targetPrice && <span><i className="fas fa-tag me-1"></i>Budget: {q.currency} {q.targetPrice}/unit</span>}
                        {q.category && <span><i className="fas fa-folder me-1"></i>{q.category}</span>}
                        <span><i className="fas fa-clock me-1"></i>{new Date(q.createdAt).toLocaleDateString()}</span>
                      </div>

                      {q.taggedSellers?.length > 0 && (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#ff6600' }}>
                          <i className="fas fa-tag me-1"></i>Tagged sellers: {q.taggedSellers.map(s => s.username).join(', ')}
                        </div>
                      )}
                    </div>
                    <button onClick={() => setExpandedId(expandedId === q._id ? null : q._id)} className="btn btn-outline-secondary btn-sm">
                      <i className={`fas fa-chevron-${expandedId === q._id ? 'up' : 'down'}`}></i>
                      {q.responses?.length > 0 && <span className="badge bg-secondary ms-1">{q.responses.length}</span>}
                    </button>
                  </div>

                  {q.productDescription && <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#555' }}>{q.productDescription}</p>}
                </div>

                {/* Seller Responses */}
                {expandedId === q._id && (
                  <div style={{ borderTop: '1px solid #e9ecef', padding: '14px 16px', background: '#f8f9fa' }}>
                    <h6 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: '#495057' }}>
                      <i className="fas fa-store me-1"></i>Seller Responses ({q.responses?.length || 0})
                    </h6>
                    {!q.responses?.length ? (
                      <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>No seller responses yet</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                        {q.responses.map((r, i) => (
                          <div key={i} style={{ background: '#fff', borderRadius: '8px', padding: '12px', border: '1px solid #dee2e6' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ fontWeight: '700', fontSize: '13px', color: '#28a745' }}>{r.sellerUsername}</span>
                              {r.offerPrice && <span style={{ fontWeight: '700', fontSize: '13px', color: '#28a745' }}>{q.currency} {r.offerPrice}/unit</span>}
                            </div>
                            {r.sellerWhatsapp && <div style={{ fontSize: '11px', color: '#25d366', marginBottom: '4px' }}><i className="fab fa-whatsapp me-1"></i>{r.sellerWhatsapp}</div>}
                            {r.message && <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#555' }}>{r.message}</p>}
                            <div style={{ fontSize: '10px', color: '#888' }}>{new Date(r.respondedAt).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
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

export default AdminWishlistQueries;
