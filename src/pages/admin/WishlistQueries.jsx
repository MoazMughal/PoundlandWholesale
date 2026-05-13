import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../utils/api';

const STATUS_COLORS = { open: '#28a745', in_progress: '#007bff', fulfilled: '#6f42c1', closed: '#6c757d' };
const STATUS_LABELS = { open: 'Open', in_progress: 'In Progress', fulfilled: 'Fulfilled', closed: 'Closed' };

const AdminWishlistQueries = () => {
  const navigate = useNavigate();
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [senderFilter, setSenderFilter] = useState('all'); // 'all' | 'buyer' | 'guest'
  const [expandedId, setExpandedId] = useState(null);
  const [total, setTotal] = useState(0);

  const token = () => localStorage.getItem('adminToken');

  useEffect(() => { fetchQueries(); }, [statusFilter, senderFilter]);

  const fetchQueries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (senderFilter !== 'all') params.set('senderType', senderFilter);
      const res = await fetch(getApiUrl(`wishlist/admin?${params}`), {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQueries(data.queries || []);
        setTotal(data.total || 0);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const buyerCount = queries.filter(q => !q.senderType || q.senderType === 'buyer').length;
  const guestCount = queries.filter(q => q.senderType === 'guest').length;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: '700' }}>
              <i className="fas fa-heart me-2" style={{ color: '#e74c3c' }}></i>Wishlist & Demands
            </h2>
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: '13px' }}>
              All product requests — {total} total
            </p>
          </div>
          <button onClick={() => navigate('/admin/dashboard')} className="btn btn-outline-secondary btn-sm">
            <i className="fas fa-arrow-left me-1"></i>Dashboard
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total', value: queries.length, color: '#495057' },
            { label: 'Buyers', value: buyerCount, color: '#007bff' },
            { label: 'Guests', value: guestCount, color: '#fd7e14' },
            { label: 'Open', value: queries.filter(q => q.status === 'open').length, color: '#28a745' },
            { label: 'In Progress', value: queries.filter(q => q.status === 'in_progress').length, color: '#6f42c1' },
            { label: 'With Responses', value: queries.filter(q => q.responses?.length > 0).length, color: '#e74c3c' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: '10px', padding: '14px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '800', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#888' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters row */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Status filter */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[['all', 'All Status'], ['open', 'Open'], ['in_progress', 'In Progress'], ['fulfilled', 'Fulfilled'], ['closed', 'Closed']].map(([val, label]) => (
              <button key={val} onClick={() => setStatusFilter(val)}
                style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid #dee2e6', fontSize: '12px', fontWeight: '600', cursor: 'pointer', background: statusFilter === val ? '#343a40' : '#fff', color: statusFilter === val ? '#fff' : '#495057' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '24px', background: '#dee2e6', flexShrink: 0 }} />

          {/* Sender type filter */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              ['all', 'All Senders', '#495057'],
              ['buyer', '👤 Buyers', '#007bff'],
              ['guest', '🙋 Guests', '#fd7e14'],
            ].map(([val, label, color]) => (
              <button key={val} onClick={() => setSenderFilter(val)}
                style={{
                  padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                  border: `1px solid ${senderFilter === val ? color : '#dee2e6'}`,
                  background: senderFilter === val ? color : '#fff',
                  color: senderFilter === val ? '#fff' : '#495057'
                }}>
                {label}
              </button>
            ))}
          </div>
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
            {queries.map(q => {
              const isGuest = q.senderType === 'guest';
              return (
                <div key={q._id} style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: `1px solid ${isGuest ? '#fed7aa' : '#e9ecef'}`, overflow: 'hidden' }}>
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>

                        {/* Title row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          {q.imageUrl && (
                            <img src={q.imageUrl} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6, border: '1px solid #eee', flexShrink: 0 }} onError={e => e.target.style.display='none'} />
                          )}
                          <h6 style={{ margin: 0, fontWeight: '700', fontSize: '0.95rem', color: '#1f2937' }}>{q.productName}</h6>
                          {/* Sender type badge */}
                          <span style={{
                            fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px',
                            background: isGuest ? '#fff7ed' : '#eff6ff',
                            color: isGuest ? '#c2410c' : '#1d4ed8',
                            border: `1px solid ${isGuest ? '#fed7aa' : '#bfdbfe'}`,
                            whiteSpace: 'nowrap'
                          }}>
                            {isGuest ? '🙋 Guest' : '👤 Buyer'}
                          </span>
                          {/* Status badge */}
                          <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: (STATUS_COLORS[q.status] || '#888') + '22', color: STATUS_COLORS[q.status] || '#888', border: `1px solid ${STATUS_COLORS[q.status] || '#888'}44`, whiteSpace: 'nowrap' }}>
                            {STATUS_LABELS[q.status] || q.status}
                          </span>
                          {q.responses?.length > 0 && (
                            <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: '#fff3e0', color: '#ff6600', border: '1px solid #ff660044', whiteSpace: 'nowrap' }}>
                              {q.responses.length} response{q.responses.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Sender info */}
                        <div style={{ background: isGuest ? '#fff7ed' : '#f0f9ff', borderRadius: '6px', padding: '8px 12px', marginBottom: '8px', fontSize: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{ fontWeight: '700', color: isGuest ? '#c2410c' : '#1d4ed8' }}>
                            <i className={`fas fa-${isGuest ? 'user-clock' : 'user'} me-1`}></i>
                            {isGuest ? 'Guest' : 'Buyer'}:
                          </span>
                          <span style={{ fontWeight: '600', color: '#1f2937' }}>{q.buyerName || '—'}</span>
                          {q.buyerEmail && (
                            <span style={{ color: '#6b7280' }}>
                              <i className="fas fa-envelope me-1"></i>{q.buyerEmail}
                            </span>
                          )}
                          {q.buyerWhatsapp && (
                            <span style={{ color: '#25d366' }}>
                              <i className="fab fa-whatsapp me-1"></i>{q.buyerWhatsapp}
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#888', flexWrap: 'wrap' }}>
                          <span><i className="fas fa-boxes me-1"></i>Qty: <strong style={{ color: '#111' }}>{q.quantity}</strong></span>
                          {q.targetPrice && <span><i className="fas fa-tag me-1"></i>Budget: <strong style={{ color: '#059669' }}>{q.currency} {q.targetPrice}/unit</strong></span>}
                          {q.category && <span><i className="fas fa-folder me-1"></i>{q.category}</span>}
                          <span><i className="fas fa-clock me-1"></i>{new Date(q.createdAt).toLocaleDateString()}</span>
                        </div>

                        {q.notes && <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#888', fontStyle: 'italic' }}>"{q.notes}"</p>}
                        {q.taggedSellers?.length > 0 && (
                          <div style={{ marginTop: '6px', fontSize: '11px', color: '#ff6600' }}>
                            <i className="fas fa-tag me-1"></i>Tagged: {q.taggedSellers.map(s => s.username).join(', ')}
                          </div>
                        )}
                      </div>

                      <button onClick={() => setExpandedId(expandedId === q._id ? null : q._id)} className="btn btn-outline-secondary btn-sm" style={{ flexShrink: 0 }}>
                        <i className={`fas fa-chevron-${expandedId === q._id ? 'up' : 'down'}`}></i>
                        {q.responses?.length > 0 && <span className="badge bg-secondary ms-1">{q.responses.length}</span>}
                      </button>
                    </div>
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWishlistQueries;
