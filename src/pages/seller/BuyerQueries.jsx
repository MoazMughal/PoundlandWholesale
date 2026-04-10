import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeller } from '../../context/SellerContext';
import { getApiUrl } from '../../utils/api';

const STATUS_COLORS = { open: '#28a745', in_progress: '#007bff', fulfilled: '#6f42c1', closed: '#6c757d' };

const SellerBuyerQueries = () => {
  const navigate = useNavigate();
  const { seller, isLoggedIn, loading: authLoading, authResolved } = useSeller();
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);
  const [responseForm, setResponseForm] = useState({ message: '', offerPrice: '', status: 'interested' });
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!authResolved || authLoading) return;
    if (!isLoggedIn || !seller) { navigate('/login/supplier'); return; }
    fetchQueries();
    // Mark queries as seen — clears notification count
    fetch(getApiUrl('wishlist/seller/mark-seen'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('sellerToken')}` }
    }).catch(() => {});
  }, [isLoggedIn, seller, authResolved, authLoading]);

  const token = () => localStorage.getItem('sellerToken');

  const fetchQueries = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('wishlist/seller'), { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setQueries((await res.json()).queries || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleRespond = async (queryId) => {
    if (!responseForm.message.trim() && !responseForm.offerPrice) {
      alert('Please enter a message or offer price');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(getApiUrl(`wishlist/seller/respond/${queryId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(responseForm)
      });
      if (res.ok) {
        setRespondingId(null);
        setResponseForm({ message: '', offerPrice: '', status: 'interested' });
        fetchQueries();
      } else alert('Failed to send response');
    } catch (e) { alert('Error sending response'); }
    setSubmitting(false);
  };

  const myResponse = (q) => q.responses?.find(r => r.sellerId === seller?._id || r.sellerUsername === seller?.username);
  const isTagged = (q) => q.taggedSellers?.some(s => s.sellerId === seller?._id || s.username === seller?.username);

  const filtered = queries.filter(q => {
    if (filter === 'tagged') return isTagged(q);
    if (filter === 'responded') return !!myResponse(q);
    if (filter === 'pending') return !myResponse(q);
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: '20px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: '700', color: '#1a1a1a' }}>
              <i className="fas fa-inbox me-2" style={{ color: '#007bff' }}></i>Buyer Queries & Demands
            </h2>
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: '13px' }}>Respond to buyer product requests and send offers</p>
          </div>
          <button onClick={() => navigate('/seller/dashboard')} className="btn btn-outline-secondary btn-sm">
            <i className="fas fa-arrow-left me-1"></i>Dashboard
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total Queries', value: queries.length, color: '#007bff', icon: 'fa-list' },
            { label: 'Tagged to Me', value: queries.filter(isTagged).length, color: '#ff6600', icon: 'fa-tag' },
            { label: 'Responded', value: queries.filter(q => !!myResponse(q)).length, color: '#28a745', icon: 'fa-check' },
            { label: 'Pending', value: queries.filter(q => !myResponse(q)).length, color: '#ffc107', icon: 'fa-clock' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: '10px', padding: '14px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', textAlign: 'center', border: `2px solid ${s.color}22` }}>
              <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: '20px', marginBottom: '6px', display: 'block' }}></i>
              <div style={{ fontSize: '22px', fontWeight: '800', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#888' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {[['all', 'All'], ['tagged', 'Tagged to Me'], ['pending', 'Not Responded'], ['responded', 'Responded']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              style={{ padding: '5px 14px', borderRadius: '20px', border: '1px solid #dee2e6', fontSize: '12px', fontWeight: '600', cursor: 'pointer', background: filter === val ? '#007bff' : '#fff', color: filter === val ? '#fff' : '#495057' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Queries */}
        {loading ? (
          // Skeleton cards — page is already visible, data loading silently
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: '#fff', borderRadius: '10px', padding: '20px', border: '1px solid #e9ecef', animation: 'pulse 1.5s ease-in-out infinite' }}>
                <div style={{ height: '14px', background: '#e9ecef', borderRadius: '4px', width: '40%', marginBottom: '10px' }}></div>
                <div style={{ height: '10px', background: '#f0f0f0', borderRadius: '4px', width: '70%', marginBottom: '8px' }}></div>
                <div style={{ height: '10px', background: '#f0f0f0', borderRadius: '4px', width: '50%' }}></div>
              </div>
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
            <h5 style={{ color: '#495057' }}>No queries found</h5>
            <p style={{ color: '#888' }}>Buyer product requests will appear here</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filtered.map(q => {
              const myResp = myResponse(q);
              const tagged = isTagged(q);
              return (
                <div key={q._id} style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: `1px solid ${tagged ? '#ff660033' : '#e9ecef'}`, overflow: 'hidden' }}>
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <h6 style={{ margin: 0, fontWeight: '700' }}>{q.productName}</h6>
                          <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: (STATUS_COLORS[q.status] || '#888') + '22', color: STATUS_COLORS[q.status] || '#888', border: `1px solid ${STATUS_COLORS[q.status] || '#888'}44` }}>{q.status}</span>
                          {tagged && <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: '#fff3e0', color: '#ff6600', border: '1px solid #ff660044' }}>Tagged to You</span>}
                          {myResp && <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px', background: '#e8f5e9', color: '#28a745', border: '1px solid #28a74544' }}>Responded</span>}
                        </div>
                        {q.productDescription && <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#555' }}>{q.productDescription}</p>}
                        <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#888', flexWrap: 'wrap' }}>
                          <span><i className="fas fa-user me-1"></i>{q.buyerName}</span>
                          <span><i className="fas fa-boxes me-1"></i>Qty: {q.quantity}</span>
                          {q.targetPrice && <span><i className="fas fa-tag me-1"></i>Budget: {q.currency} {q.targetPrice}/unit</span>}
                          {q.category && <span><i className="fas fa-folder me-1"></i>{q.category}</span>}
                          <span><i className="fas fa-clock me-1"></i>{new Date(q.createdAt).toLocaleDateString()}</span>
                        </div>
                        {q.notes && <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#777', fontStyle: 'italic' }}>Note: {q.notes}</p>}
                        {q.imageUrl && <a href={q.imageUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#007bff' }}><i className="fas fa-image me-1"></i>View Reference Image</a>}
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {!myResp ? (
                          <button onClick={() => { setRespondingId(q._id); setResponseForm({ message: '', offerPrice: '', status: 'interested' }); }}
                            className="btn btn-success btn-sm"><i className="fas fa-reply me-1"></i>Respond</button>
                        ) : (
                          <button onClick={() => { setRespondingId(q._id); setResponseForm({ message: myResp.message || '', offerPrice: myResp.offerPrice || '', status: myResp.status }); }}
                            className="btn btn-outline-primary btn-sm"><i className="fas fa-edit me-1"></i>Edit Response</button>
                        )}
                      </div>
                    </div>

                    {/* My existing response */}
                    {myResp && (
                      <div style={{ marginTop: '12px', background: '#f0fff4', borderRadius: '8px', padding: '10px 14px', border: '1px solid #c3e6cb' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#28a745', marginBottom: '4px' }}>Your Response:</div>
                        {myResp.message && <p style={{ margin: '0 0 4px', fontSize: '13px' }}>{myResp.message}</p>}
                        {myResp.offerPrice && <span style={{ fontSize: '13px', fontWeight: '700', color: '#28a745' }}>Offer: {q.currency} {myResp.offerPrice}/unit</span>}
                      </div>
                    )}

                    {/* Response form */}
                    {respondingId === q._id && (
                      <div style={{ marginTop: '12px', background: '#f8f9fa', borderRadius: '8px', padding: '14px', border: '1px solid #dee2e6' }}>
                        <h6 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px' }}>Send Response</h6>
                        <div className="mb-2">
                          <textarea className="form-control form-control-sm" rows={3} placeholder="Your message to the buyer..." value={responseForm.message} onChange={e => setResponseForm(f => ({ ...f, message: e.target.value }))} />
                        </div>
                        <div className="row mb-2">
                          <div className="col-6">
                            <input type="number" className="form-control form-control-sm" placeholder={`Offer price (${q.currency})`} step="0.01" value={responseForm.offerPrice} onChange={e => setResponseForm(f => ({ ...f, offerPrice: e.target.value }))} />
                          </div>
                          <div className="col-6">
                            <select className="form-select form-select-sm" value={responseForm.status} onChange={e => setResponseForm(f => ({ ...f, status: e.target.value }))}>
                              <option value="interested">Interested</option>
                              <option value="offer_sent">Offer Sent</option>
                              <option value="not_available">Not Available</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => setRespondingId(null)} className="btn btn-outline-secondary btn-sm">Cancel</button>
                          <button onClick={() => handleRespond(q._id)} className="btn btn-success btn-sm" disabled={submitting}>
                            {submitting ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="fas fa-paper-plane me-1"></i>}
                            Send Response
                          </button>
                          {q.buyerWhatsapp && (
                            <a href={`https://wa.me/${q.buyerWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${q.buyerName}, I can supply "${q.productName}". ${responseForm.message}`)}`}
                              target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm" style={{ background: '#25d366', borderColor: '#25d366' }}>
                              <i className="fab fa-whatsapp me-1"></i>WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerBuyerQueries;
