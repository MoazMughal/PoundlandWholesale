import { useState, useEffect } from 'react';
import { getApiUrl } from '../../utils/api';

const statusColors = {
  pending: '#fbbf24',
  viewed: '#3b82f6',
  responded: '#10b981',
  closed: '#6b7280'
};

const AdminQuotations = () => {
  const [quotations, setQuotations] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({ page, limit: 50 });
      if (filter !== 'all') params.append('status', filter);
      const res = await fetch(getApiUrl(`sellers/admin/quotations?${params}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setQuotations(data.quotations || []);
        setStats(data.stats || {});
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuotations(); }, [filter, page]);

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(getApiUrl(`sellers/admin/quotations/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      fetchQuotations();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const statCards = [
    { label: 'Total', value: total, color: '#6366f1' },
    { label: 'Pending', value: stats.pending || 0, color: '#fbbf24' },
    { label: 'Viewed', value: stats.viewed || 0, color: '#3b82f6' },
    { label: 'Responded', value: stats.responded || 0, color: '#10b981' },
    { label: 'Closed', value: stats.closed || 0, color: '#6b7280' }
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '20px', color: '#1f2937' }}>
        <i className="fas fa-paper-plane me-2 text-warning"></i>Buyer Quotations
      </h2>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {statCards.map(s => (
          <div key={s.label} style={{
            background: 'white', borderRadius: '8px', padding: '12px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)', textAlign: 'center',
            borderTop: `3px solid ${s.color}`
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: '800', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['all', 'pending', 'viewed', 'responded', 'closed'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            style={{
              padding: '6px 14px', fontSize: '0.75rem', fontWeight: '600', borderRadius: '20px',
              border: 'none', cursor: 'pointer', textTransform: 'capitalize',
              background: filter === f ? '#ff9900' : '#f3f4f6',
              color: filter === f ? 'white' : '#374151'
            }}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <i className="fas fa-spinner fa-spin me-2"></i>Loading quotations...
        </div>
      ) : quotations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block' }}></i>
          No quotations found
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['Date', 'Product', 'Seller', 'Buyer', 'Phone', 'Email', 'Qty', 'Price', 'Message', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quotations.map(q => (
                <tr key={q._id} style={{ borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#6b7280' }}>
                    {new Date(q.submittedAt).toLocaleDateString()}<br />
                    <span style={{ fontSize: '0.7rem' }}>{new Date(q.submittedAt).toLocaleTimeString()}</span>
                  </td>
                  <td style={{ padding: '10px 12px', maxWidth: '150px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '600' }} title={q.productName}>
                      {q.productName}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: '600', color: '#059669' }}>{q.sellerUsername}</td>
                  <td style={{ padding: '10px 12px', fontWeight: '600' }}>{q.buyerName}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <a href={`https://wa.me/${q.buyerPhone?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: '#25d366', textDecoration: 'none' }}>
                      <i className="fab fa-whatsapp me-1"></i>{q.buyerPhone}
                    </a>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{q.buyerEmail || '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700' }}>{q.quantity}</td>
                  <td style={{ padding: '10px 12px', fontWeight: '700', color: '#059669' }}>
                    {q.sellerPrice ? `£${parseFloat(q.sellerPrice).toFixed(2)}` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', maxWidth: '150px', color: '#6b7280' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={q.message}>
                      {q.message || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      background: statusColors[q.status] + '22',
                      color: statusColors[q.status],
                      border: `1px solid ${statusColors[q.status]}`,
                      padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '700',
                      textTransform: 'capitalize'
                    }}>
                      {q.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <select value={q.status} onChange={e => updateStatus(q._id, e.target.value)}
                      style={{ fontSize: '0.7rem', padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}>
                      <option value="pending">Pending</option>
                      <option value="viewed">Viewed</option>
                      <option value="responded">Responded</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '6px 12px', fontSize: '0.8rem', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', background: 'white' }}>
            ← Prev
          </button>
          <span style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#6b7280' }}>
            Page {page} of {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '6px 12px', fontSize: '0.8rem', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', background: 'white' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminQuotations;
