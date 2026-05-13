import { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api';

const STATUS_COLORS = { open: '#28a745', in_progress: '#007bff', fulfilled: '#6f42c1', closed: '#6c757d' };
const STATUS_LABELS = { open: 'Open', in_progress: 'In Progress', fulfilled: 'Fulfilled', closed: 'Closed' };

const WishlistQueries = () => {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [senderFilter, setSenderFilter] = useState('all'); // 'all' | 'buyer' | 'guest'
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { fetchQueries(); }, [statusFilter]);

  const fetchQueries = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await fetch(getApiUrl(`wishlist/public${params}`));
      if (res.ok) {
        const data = await res.json();
        setQueries(data.queries || []);
        setTotal(data.total || 0);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const displayed = senderFilter === 'all'
    ? queries
    : senderFilter === 'guest'
      ? queries.filter(q => q.senderType === 'guest')
      : queries.filter(q => !q.senderType || q.senderType === 'buyer');

  const buyerCount = queries.filter(q => !q.senderType || q.senderType === 'buyer').length;
  const guestCount = queries.filter(q => q.senderType === 'guest').length;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Page Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 4px', fontWeight: '800', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.6rem' }}>💜</span> Wishlist & Demands
          </h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
            Products buyers are looking for — {total} open requests. Sellers can respond from their dashboard.
          </p>
        </div>

        {/* Filters + Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {/* Status filters */}
          {[['all', 'All'], ['open', 'Open'], ['in_progress', 'In Progress'], ['fulfilled', 'Fulfilled']].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              style={{ padding: '4px 12px', borderRadius: '20px', border: '1px solid #dee2e6', fontSize: '12px', fontWeight: '600', cursor: 'pointer', background: statusFilter === val ? '#ff6600' : '#fff', color: statusFilter === val ? '#fff' : '#495057', whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}

          <div style={{ width: '1px', height: '20px', background: '#dee2e6', flexShrink: 0 }} />

          {/* Sender type filters */}
          {[
            ['all', 'All Senders', '#495057'],
            ['buyer', `👤 Buyers (${buyerCount})`, '#1d4ed8'],
            ['guest', `🙋 Guests (${guestCount})`, '#c2410c'],
          ].map(([val, label, color]) => (
            <button key={val} onClick={() => setSenderFilter(val)}
              style={{
                padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                border: `1px solid ${senderFilter === val ? color : '#dee2e6'}`,
                background: senderFilter === val ? color : '#fff',
                color: senderFilter === val ? '#fff' : '#495057',
                whiteSpace: 'nowrap'
              }}>
              {label}
            </button>
          ))}

          <div style={{ width: '1px', height: '20px', background: '#dee2e6', flexShrink: 0 }} />

          {/* Stats */}
          {[
            { label: 'Open', value: queries.filter(q => q.status === 'open').length, color: '#28a745' },
            { label: 'In Progress', value: queries.filter(q => q.status === 'in_progress').length, color: '#007bff' },
            { label: 'With Offers', value: queries.filter(q => q.responsesCount > 0).length, color: '#ff6600' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: s.color }}>{s.value}</span>
              <span style={{ fontSize: '11px', color: '#888' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #f3f4f6', borderTopColor: '#ff6600', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: '#888' }}>Loading requests...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '12px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
            <h5 style={{ color: '#374151' }}>No requests found</h5>
            <p style={{ color: '#888', fontSize: '0.85rem' }}>Check back later for new buyer demands.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {displayed.map(q => {
              const isGuest = q.senderType === 'guest';
              return (
                <div key={q._id} style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: `1px solid ${isGuest ? '#fed7aa' : '#e9ecef'}`, overflow: 'hidden' }}>
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>

                        {/* Title + badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          {q.imageUrl && (
                            <img src={q.imageUrl} alt="" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6, border: '1px solid #eee', flexShrink: 0 }} onError={e => e.target.style.display='none'} />
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

                          <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: (STATUS_COLORS[q.status] || '#888') + '22', color: STATUS_COLORS[q.status] || '#888', border: `1px solid ${STATUS_COLORS[q.status] || '#888'}44`, whiteSpace: 'nowrap' }}>
                            {STATUS_LABELS[q.status] || q.status}
                          </span>
                          {q.responsesCount > 0 && (
                            <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: '#fff3e0', color: '#ff6600', border: '1px solid #ff660044', whiteSpace: 'nowrap' }}>
                              {q.responsesCount} offer{q.responsesCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Sender name */}
                        {q.buyerName && (
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            background: isGuest ? '#fff7ed' : '#eff6ff',
                            border: `1px solid ${isGuest ? '#fed7aa' : '#bfdbfe'}`,
                            borderRadius: '6px', padding: '4px 10px', marginBottom: '8px', fontSize: '12px'
                          }}>
                            <i className={`fas fa-${isGuest ? 'user-clock' : 'user'}`} style={{ color: isGuest ? '#c2410c' : '#1d4ed8', fontSize: '10px' }}></i>
                            <span style={{ fontWeight: '700', color: isGuest ? '#c2410c' : '#1d4ed8' }}>
                              {isGuest ? 'Guest' : 'Buyer'}:
                            </span>
                            <span style={{ color: '#1f2937', fontWeight: '600' }}>{q.buyerName}</span>
                          </div>
                        )}

                        {/* Details row */}
                        <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#6b7280', flexWrap: 'wrap' }}>
                          <span>📦 Qty: <strong style={{ color: '#111' }}>{q.quantity}</strong></span>
                          {q.targetPrice && <span>💰 Budget: <strong style={{ color: '#059669' }}>{q.currency} {q.targetPrice}/unit</strong></span>}
                          {q.category && <span>📂 {q.category}</span>}
                          <span>🕐 {new Date(q.createdAt).toLocaleDateString()}</span>
                        </div>

                        {q.productDescription && (
                          <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#555', lineHeight: 1.4 }}>{q.productDescription}</p>
                        )}
                        {q.notes && (
                          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#888', fontStyle: 'italic' }}>"{q.notes}"</p>
                        )}
                      </div>

                      {q.responsesCount > 0 && (
                        <button
                          onClick={() => setExpandedId(expandedId === q._id ? null : q._id)}
                          style={{ padding: '5px 12px', fontSize: '12px', fontWeight: '600', border: '1px solid #dee2e6', borderRadius: '6px', background: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', color: '#374151', flexShrink: 0 }}
                        >
                          {expandedId === q._id ? '▲ Hide' : `▼ ${q.responsesCount} offer${q.responsesCount > 1 ? 's' : ''}`}
                        </button>
                      )}
                    </div>
                  </div>

                  {expandedId === q._id && (
                    <div style={{ borderTop: '1px solid #e9ecef', padding: '12px 16px', background: '#f8f9fa', fontSize: '13px', color: '#555' }}>
                      <i className="fas fa-store" style={{ marginRight: 6, color: '#ff6600' }}></i>
                      {q.responsesCount} seller{q.responsesCount > 1 ? 's have' : ' has'} responded to this request.
                      {' '}If you're a seller, log in to your dashboard to respond.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* CTA for sellers */}
        <div style={{ marginTop: '32px', background: 'linear-gradient(135deg, #ff6600, #ff9900)', borderRadius: '12px', padding: '20px 24px', color: '#fff', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 8px', fontWeight: '800' }}>Are you a seller?</h4>
          <p style={{ margin: '0 0 14px', fontSize: '0.9rem', opacity: 0.9 }}>
            Log in to your seller dashboard to respond to these buyer requests and grow your business.
          </p>
          <a href="/login/supplier" style={{ display: 'inline-block', padding: '8px 24px', background: '#fff', color: '#ff6600', borderRadius: '8px', fontWeight: '700', textDecoration: 'none', fontSize: '0.9rem' }}>
            Seller Login →
          </a>
        </div>
      </div>
    </div>
  );
};

export default WishlistQueries;
