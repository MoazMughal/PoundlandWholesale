import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../../utils/api';
import { getImageUrl } from '../../utils/imageImports';

const statusColors = {
  pending: '#fbbf24',
  viewed: '#3b82f6',
  responded: '#10b981',
  closed: '#6b7280'
};

// ── User-type filter pill group ──────────────────────────────────────────────
const USER_TYPES = [
  { value: 'all',    label: 'All',    color: '#6366f1' },
  { value: 'buyer',  label: 'Buyers', color: '#1d4ed8' },
  { value: 'seller', label: 'Sellers',color: '#065f46' },
  { value: 'guest',  label: 'Guests', color: '#6b7280' },
];

const UserTypeFilter = ({ value, onChange }) => (
  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
    <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Filter:</span>
    {USER_TYPES.map(t => (
      <button key={t.value} onClick={() => onChange(t.value)}
        style={{
          padding: '4px 12px', fontSize: '0.75rem', fontWeight: '700',
          borderRadius: '20px', border: `1.5px solid ${t.color}`,
          background: value === t.value ? t.color : 'white',
          color: value === t.value ? 'white' : t.color,
          cursor: 'pointer', transition: 'all 0.15s ease'
        }}>
        {t.label}
      </button>
    ))}
  </div>
);

// ---- Product Views sub-component ----
const SORT_OPTIONS = [
  { value: 'views_desc', label: '👁 Most Views' },
  { value: 'views_asc',  label: '👁 Least Views' },
  { value: 'price_asc',  label: '£ Price: Low → High' },
  { value: 'price_desc', label: '£ Price: High → Low' },
  { value: 'name_asc',   label: 'A → Z' },
  { value: 'name_desc',  label: 'Z → A' },
];

const ProductViewsTab = ({ viewerTypeFilter, onViewerTypeChange, onRefresh }) => {
  const [expanded, setExpanded] = useState(null);
  const [sort, setSort] = useState('views_desc');
  const [viewsData, setViewsData] = useState([]);
  const [totalViews, setTotalViews] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchViews = async (type) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const url = type === 'all'
        ? getApiUrl('products/admin/product-views?limit=100')
        : getApiUrl(`products/admin/product-views-filtered?limit=100&viewerType=${type}`);
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) { setViewsData(data.products || []); setTotalViews(data.totalViews || 0); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchViews(viewerTypeFilter); }, [viewerTypeFilter]);

  const toggle = (id) => setExpanded(prev => prev === id ? null : id);

  const getProductImage = (p) => {
    const raw = p.images?.[0] || p.image || null;
    return raw ? getImageUrl(raw, { width: 60, height: 60, quality: 'auto' }) : null;
  };

  const sorted = [...viewsData].sort((a, b) => {
    switch (sort) {
      case 'views_asc':  return (a.viewCount || 0) - (b.viewCount || 0);
      case 'views_desc': return (b.viewCount || 0) - (a.viewCount || 0);
      case 'price_asc':  return (a.price || 0) - (b.price || 0);
      case 'price_desc': return (b.price || 0) - (a.price || 0);
      case 'name_asc':   return (a.name || '').localeCompare(b.name || '');
      case 'name_desc':  return (b.name || '').localeCompare(a.name || '');
      default:           return 0;
    }
  });

  const maxViews = viewsData.reduce((m, p) => Math.max(m, p.viewCount || 0), 1);

  // Per-type counts from viewers array
  const countByType = (viewers, type) => viewers?.filter(v => (v.viewerType || 'guest') === type).length || 0;

  return (
    <>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Summary cards */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '14px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', borderTop: '3px solid #6366f1', minWidth: '130px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#6366f1' }}>{totalViews}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {viewerTypeFilter === 'all' ? 'Total Views' : `${USER_TYPES.find(t=>t.value===viewerTypeFilter)?.label} Views`}
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '8px', padding: '14px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', borderTop: '3px solid #10b981', minWidth: '130px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#10b981' }}>{viewsData.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Products Viewed</div>
        </div>

        {/* User type filter */}
        <UserTypeFilter value={viewerTypeFilter} onChange={onViewerTypeChange} />

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', color: '#6b7280', whiteSpace: 'nowrap' }}>Sort:</span>
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ fontSize: '0.78rem', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <button onClick={() => fetchViews(viewerTypeFilter)}
          style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: '600', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', color: '#374151' }}>
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading product views...</div>
      ) : viewsData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>👁</div>
          No product views recorded{viewerTypeFilter !== 'all' ? ` for ${viewerTypeFilter}s` : ''} yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sorted.map((p, idx) => {
            const isOpen = expanded === p._id;
            const imgSrc = getProductImage(p);
            const buyerViews  = countByType(p.viewers, 'buyer');
            const sellerViews = countByType(p.viewers, 'seller');
            const guestViews  = countByType(p.viewers, 'guest');
            return (
              <div key={p._id} style={{ background: 'white', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: isOpen ? '1px solid #6366f1' : '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div onClick={() => toggle(p._id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', cursor: 'pointer', background: isOpen ? '#f5f3ff' : 'white' }}>
                  {/* Image */}
                  <div style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 8, overflow: 'hidden', background: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {imgSrc ? <img src={imgSrc} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} /> : <span style={{ fontSize: '1.2rem', color: '#d1d5db' }}>📦</span>}
                  </div>
                  {/* Rank */}
                  <span style={{ background: idx < 3 ? ['#f59e0b','#9ca3af','#b45309'][idx] : '#e5e7eb', color: idx < 3 ? 'white' : '#6b7280', borderRadius: 6, padding: '1px 5px', fontSize: '0.65rem', fontWeight: 800 }}>
                    {idx < 3 ? ['🥇','🥈','🥉'][idx] : `#${idx+1}`}
                  </span>
                  {/* Name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{p.category} · £{parseFloat(p.price||0).toFixed(2)}</div>
                  </div>
                  {/* Bar + count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 130 }}>
                    <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: '#6366f1', width: `${Math.min(100,(p.viewCount/maxViews)*100)}%` }} />
                    </div>
                    <span style={{ fontWeight: 800, color: '#6366f1', fontSize: '0.85rem', minWidth: 28 }}>{p.viewCount}</span>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>views</span>
                  </div>
                  {/* Type breakdown badges */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                    {buyerViews  > 0 && <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 12, padding: '2px 7px', fontSize: '0.68rem', fontWeight: 700 }}>👤 {buyerViews}B</span>}
                    {sellerViews > 0 && <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 12, padding: '2px 7px', fontSize: '0.68rem', fontWeight: 700 }}>🏪 {sellerViews}S</span>}
                    {guestViews  > 0 && <span style={{ background: '#f3f4f6', color: '#6b7280', borderRadius: 12, padding: '2px 7px', fontSize: '0.68rem', fontWeight: 700 }}>👻 {guestViews}G</span>}
                  </div>
                  <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {/* Expanded viewer list */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #e5e7eb', padding: '12px 16px', background: '#fafafa' }}>
                    {!p.viewers || p.viewers.length === 0 ? (
                      <div style={{ color: '#9ca3af', fontSize: '0.8rem', textAlign: 'center', padding: 8 }}>No viewer details recorded yet.</div>
                    ) : (
                      <>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                          Recent viewers ({p.viewers.length}):
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                          <thead>
                            <tr style={{ background: '#f3f4f6' }}>
                              {['Type','Name','Email','Viewed At'].map(h => (
                                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#6b7280' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {p.viewers.map((v, vi) => {
                              const type = v.viewerType || 'guest';
                              const ts = { buyer: { bg:'#dbeafe',color:'#1d4ed8',label:'Buyer' }, seller: { bg:'#d1fae5',color:'#065f46',label:'Seller' }, guest: { bg:'#f3f4f6',color:'#6b7280',label:'Guest' } }[type] || { bg:'#f3f4f6',color:'#6b7280',label:'Guest' };
                              return (
                                <tr key={vi} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                  <td style={{ padding: '6px 10px' }}>
                                    <span style={{ background: ts.bg, color: ts.color, borderRadius: 10, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{ts.label}</span>
                                  </td>
                                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>{v.buyerName === 'Guest' ? <span style={{ color: '#9ca3af' }}>Guest</span> : v.buyerName}</td>
                                  <td style={{ padding: '6px 10px', color: '#6b7280' }}>{v.buyerEmail || '—'}</td>
                                  <td style={{ padding: '6px 10px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                                    {new Date(v.viewedAt).toLocaleDateString()} {new Date(v.viewedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {p.viewCount > p.viewers.length && (
                          <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 6, textAlign: 'right' }}>
                            Showing last {p.viewers.length} of {p.viewCount} total views
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

// ---- Search Analytics sub-component ----
const SEARCH_SORT_OPTIONS = [
  { value: 'count_desc', label: '🔥 Most Searched' },
  { value: 'count_asc',  label: '📉 Least Searched' },
  { value: 'recent',     label: '🕐 Most Recent' },
  { value: 'az',         label: 'A → Z' },
];

const SearchAnalyticsTab = ({ searchTypeFilter, onSearchTypeChange }) => {
  const [view, setView] = useState('top');
  const [sort, setSort] = useState('count_desc');
  const [expandedQuery, setExpandedQuery] = useState(null);
  const [data, setData] = useState({ topQueries: [], recent: [], totalSearches: 0 });
  const [loading, setLoading] = useState(false);

  const fetchData = async (type) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const url = type === 'all'
        ? getApiUrl('products/admin/search-logs')
        : getApiUrl(`products/admin/search-logs-filtered?viewerType=${type}`);
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const d = await res.json();
      if (res.ok) setData({ topQueries: d.topQueries || [], recent: d.recent || [], totalSearches: d.totalSearches || 0 });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(searchTypeFilter); }, [searchTypeFilter]);

  const sorted = [...(data.topQueries || [])].sort((a, b) => {
    switch (sort) {
      case 'count_asc': return a.count - b.count;
      case 'recent':    return new Date(b.lastSearched) - new Date(a.lastSearched);
      case 'az':        return a._id.localeCompare(b._id);
      default:          return b.count - a.count;
    }
  });

  const maxCount = data.topQueries?.[0]?.count || 1;

  return (
    <>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ background: 'white', borderRadius: '8px', padding: '14px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', borderTop: '3px solid #f59e0b', minWidth: '130px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f59e0b' }}>{data.totalSearches}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {searchTypeFilter === 'all' ? 'Total Searches' : `${USER_TYPES.find(t=>t.value===searchTypeFilter)?.label} Searches`}
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: '8px', padding: '14px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', borderTop: '3px solid #10b981', minWidth: '130px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#10b981' }}>{data.topQueries?.length || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Unique Queries</div>
        </div>
        <UserTypeFilter value={searchTypeFilter} onChange={onSearchTypeChange} />
        <div style={{ display: 'flex', gap: '4px' }}>
          {[['top','Top'],['recent','Recent']].map(([v,label]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: '600', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', background: view===v ? '#f59e0b' : 'white', color: view===v ? 'white' : '#374151' }}>
              {label}
            </button>
          ))}
        </div>
        {view === 'top' && (
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ fontSize: '0.78rem', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>
            {SEARCH_SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        <button onClick={() => fetchData(searchTypeFilter)}
          style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: '600', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', color: '#374151' }}>
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading search data...</div>
      ) : data.totalSearches === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔍</div>
          No searches recorded{searchTypeFilter !== 'all' ? ` for ${searchTypeFilter}s` : ''} yet.
        </div>
      ) : view === 'top' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sorted.map((q, idx) => {
            const isOpen = expandedQuery === q._id;
            const uniqueUsers = [...new Map((q.users||[]).map(u=>[(u.email||u.name),u])).values()];
            const sellerCount = uniqueUsers.filter(u => u.page === 'seller-products').length;
            const buyerCount  = uniqueUsers.filter(u => u.page !== 'seller-products' && u.name !== 'Guest').length;
            const guestCount  = uniqueUsers.filter(u => u.name === 'Guest').length;
            return (
              <div key={q._id} style={{ background: 'white', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: isOpen ? '1px solid #f59e0b' : '1px solid #e5e7eb', overflow: 'hidden' }}>
                <div onClick={() => setExpandedQuery(prev => prev===q._id ? null : q._id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', background: isOpen ? '#fffbeb' : 'white' }}>
                  <span style={{ fontSize: '0.9rem', minWidth: 28, textAlign: 'center', fontWeight: 800, color: '#9ca3af' }}>
                    {idx < 3 ? ['🥇','🥈','🥉'][idx] : `#${idx+1}`}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1f2937' }}>🔍 {q._id}</div>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 2 }}>
                      Last: {new Date(q.lastSearched).toLocaleDateString()} · avg {Math.round(q.avgResults||0)} results
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 130 }}>
                    <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: '#f59e0b', width: `${Math.min(100,(q.count/maxCount)*100)}%` }} />
                    </div>
                    <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: '0.85rem', minWidth: 24 }}>{q.count}</span>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>×</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {buyerCount  > 0 && <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 12, padding: '2px 7px', fontSize: '0.68rem', fontWeight: 700 }}>👤{buyerCount}B</span>}
                    {sellerCount > 0 && <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: 12, padding: '2px 7px', fontSize: '0.68rem', fontWeight: 700 }}>🏪{sellerCount}S</span>}
                    {guestCount  > 0 && <span style={{ background: '#f3f4f6', color: '#6b7280', borderRadius: 12, padding: '2px 7px', fontSize: '0.68rem', fontWeight: 700 }}>👻{guestCount}G</span>}
                  </div>
                  <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{isOpen ? '▲' : '▼'}</span>
                </div>
                {isOpen && uniqueUsers.length > 0 && (
                  <div style={{ borderTop: '1px solid #e5e7eb', padding: '12px 16px', background: '#fafafa' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: 8 }}>Users who searched this:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {uniqueUsers.map((u, ui) => {
                        const isSeller = u.page === 'seller-products';
                        const isGuest  = u.name === 'Guest';
                        return (
                          <span key={ui} style={{ background: 'white', border: `1px solid ${isSeller?'#a7f3d0':isGuest?'#e5e7eb':'#bfdbfe'}`, borderRadius: 20, padding: '4px 10px', fontSize: '0.75rem', color: '#374151', display: 'flex', alignItems: 'center', gap: 5 }}>
                            {isGuest ? <><span>👻</span><span style={{ color: '#9ca3af' }}>Guest</span></>
                              : isSeller ? <><span>🏪</span><span style={{ color: '#065f46', fontWeight: 600 }}>{u.name}</span>{u.email && <span style={{ color: '#9ca3af' }}>({u.email})</span>}</>
                              : <><span>👤</span><span>{u.name}</span>{u.email && <span style={{ color: '#9ca3af' }}>({u.email})</span>}</>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['Time','Query','Type','User','Email','Results'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recent.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background='white'}>
                  <td style={{ padding: '8px 12px', color: '#9ca3af', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                    {new Date(r.searchedAt).toLocaleDateString()} {new Date(r.searchedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 700 }}>🔍 {r.query}</td>
                  <td style={{ padding: '8px 12px' }}>
                    {r.page==='seller-products'
                      ? <span style={{ background:'#d1fae5',color:'#065f46',borderRadius:10,padding:'2px 8px',fontSize:'0.7rem',fontWeight:700 }}>🏪 Seller</span>
                      : r.buyerName==='Guest'
                        ? <span style={{ background:'#f3f4f6',color:'#6b7280',borderRadius:10,padding:'2px 8px',fontSize:'0.7rem',fontWeight:700 }}>� Guest</span>
                        : <span style={{ background:'#dbeafe',color:'#1d4ed8',borderRadius:10,padding:'2px 8px',fontSize:'0.7rem',fontWeight:700 }}>👤 Buyer</span>}
                  </td>
                  <td style={{ padding: '8px 12px' }}>{r.buyerName==='Guest' ? <span style={{ color:'#9ca3af' }}>Guest</span> : r.buyerName}</td>
                  <td style={{ padding: '8px 12px', color: '#6b7280' }}>{r.buyerEmail||'—'}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#6b7280' }}>{r.resultsCount||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

// ---- Site Visitors sub-component ────────────────────────────────────────────
const SiteVisitorsTab = () => {
  const [data, setData] = useState({ totalVisits: 0, byType: [], daily: [], topPages: [], recent: [] });
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchData = async (d, t) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({ days: d });
      if (t !== 'all') params.append('type', t);
      const res = await fetch(getApiUrl(`products/admin/site-visits?${params}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok) setData(json);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(days, typeFilter); }, [days, typeFilter]);

  const byTypeMap = Object.fromEntries((data.byType||[]).map(t => [t._id, t.count]));
  const buyers  = byTypeMap.buyer  || 0;
  const sellers = byTypeMap.seller || 0;
  const guests  = byTypeMap.guest  || 0;

  return (
    <>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ background: 'white', borderRadius: '8px', padding: '14px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', borderTop: '3px solid #8b5cf6', minWidth: '130px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#8b5cf6' }}>{data.totalVisits}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Visits ({days}d)</div>
        </div>
        <div style={{ background: 'white', borderRadius: '8px', padding: '14px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', borderTop: '3px solid #1d4ed8', minWidth: '110px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1d4ed8' }}>{buyers}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>👤 Buyers</div>
        </div>
        <div style={{ background: 'white', borderRadius: '8px', padding: '14px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', borderTop: '3px solid #065f46', minWidth: '110px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#065f46' }}>{sellers}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>🏪 Sellers</div>
        </div>
        <div style={{ background: 'white', borderRadius: '8px', padding: '14px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', borderTop: '3px solid #6b7280', minWidth: '110px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#6b7280' }}>{guests}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>👻 Guests</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Period:</span>
          {[7,30,90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{ padding: '5px 12px', fontSize: '0.75rem', fontWeight: 700, borderRadius: 20, border: '1.5px solid #8b5cf6', background: days===d ? '#8b5cf6' : 'white', color: days===d ? 'white' : '#8b5cf6', cursor: 'pointer' }}>
              {d}d
            </button>
          ))}
        </div>
        <UserTypeFilter value={typeFilter} onChange={setTypeFilter} />
        <button onClick={() => fetchData(days, typeFilter)}
          style={{ padding: '10px 16px', fontSize: '0.8rem', fontWeight: '600', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', color: '#374151' }}>
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading visitor data...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Daily chart */}
          <div style={{ background: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, color: '#374151' }}>📈 Daily Visits</div>
            {data.daily.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '0.8rem' }}>No data yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {data.daily.slice(-14).map(d => {
                  const max = Math.max(...data.daily.map(x => x.count), 1);
                  return (
                    <div key={d._id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem' }}>
                      <span style={{ color: '#9ca3af', minWidth: 70 }}>{d._id}</span>
                      <div style={{ flex: 1, height: 14, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: `${(d.buyers/max)*100}%`, background: '#3b82f6', height: '100%' }} title={`Buyers: ${d.buyers}`} />
                        <div style={{ width: `${(d.sellers/max)*100}%`, background: '#10b981', height: '100%' }} title={`Sellers: ${d.sellers}`} />
                        <div style={{ width: `${(d.guests/max)*100}%`, background: '#d1d5db', height: '100%' }} title={`Guests: ${d.guests}`} />
                      </div>
                      <span style={{ fontWeight: 700, color: '#374151', minWidth: 24 }}>{d.count}</span>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: '0.7rem' }}>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#3b82f6', borderRadius: 2, marginRight: 4 }}></span>Buyers</span>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#10b981', borderRadius: 2, marginRight: 4 }}></span>Sellers</span>
                  <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#d1d5db', borderRadius: 2, marginRight: 4 }}></span>Guests</span>
                </div>
              </div>
            )}
          </div>

          {/* Top pages with per-type breakdown */}
          <div style={{ background: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, color: '#374151' }}>📄 Page Visits</div>
            {data.topPages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '0.8rem' }}>No data yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.topPages.map((p, i) => {
                  const max = data.topPages[0]?.total || 1;
                  const label = p._id === '/' ? '🏠 Home (Amazon\'s Choice)' : p._id || '/';
                  return (
                    <div key={p._id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', marginBottom: 4 }}>
                        <span style={{ color: '#9ca3af', minWidth: 20, fontWeight: 700 }}>#{i+1}</span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#374151', fontWeight: 600 }}>{label}</span>
                        <span style={{ fontWeight: 800, color: '#8b5cf6', minWidth: 28, textAlign: 'right' }}>{p.total}</span>
                        <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>visits</span>
                      </div>
                      {/* Stacked bar */}
                      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: '#f3f4f6', marginLeft: 28 }}>
                        {p.buyers  > 0 && <div style={{ width: `${(p.buyers /max)*100}%`, background: '#3b82f6' }} title={`Buyers: ${p.buyers}`} />}
                        {p.sellers > 0 && <div style={{ width: `${(p.sellers/max)*100}%`, background: '#10b981' }} title={`Sellers: ${p.sellers}`} />}
                        {p.guests  > 0 && <div style={{ width: `${(p.guests /max)*100}%`, background: '#d1d5db' }} title={`Guests: ${p.guests}`} />}
                      </div>
                      {/* Per-type counts */}
                      <div style={{ display: 'flex', gap: 10, marginLeft: 28, marginTop: 3, fontSize: '0.68rem', color: '#6b7280' }}>
                        {p.buyers  > 0 && <span style={{ color: '#1d4ed8' }}>👤 {p.buyers}B</span>}
                        {p.sellers > 0 && <span style={{ color: '#065f46' }}>🏪 {p.sellers}S</span>}
                        {p.guests  > 0 && <span style={{ color: '#6b7280' }}>👻 {p.guests}G</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent visitors */}
          <div style={{ background: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', gridColumn: '1 / -1' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, color: '#374151' }}>🕐 Recent Visitors</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    {['Time','Type','Name','Email','Page'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recent.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>No visitors recorded yet</td></tr>
                  ) : data.recent.map((v, i) => {
                    const ts = { buyer:{bg:'#dbeafe',color:'#1d4ed8',label:'👤 Buyer'}, seller:{bg:'#d1fae5',color:'#065f46',label:'🏪 Seller'}, guest:{bg:'#f3f4f6',color:'#6b7280',label:'👻 Guest'} }[v.visitorType] || {bg:'#f3f4f6',color:'#6b7280',label:'Guest'};
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}
                        onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                        onMouseLeave={e => e.currentTarget.style.background='white'}>
                        <td style={{ padding: '7px 12px', color: '#9ca3af', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
                          {new Date(v.visitedAt).toLocaleDateString()} {new Date(v.visitedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                        </td>
                        <td style={{ padding: '7px 12px' }}>
                          <span style={{ background: ts.bg, color: ts.color, borderRadius: 10, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{ts.label}</span>
                        </td>
                        <td style={{ padding: '7px 12px', fontWeight: 600 }}>{v.visitorName==='Guest' ? <span style={{ color:'#9ca3af' }}>Guest</span> : v.visitorName}</td>
                        <td style={{ padding: '7px 12px', color: '#6b7280' }}>{v.visitorEmail||'—'}</td>
                        <td style={{ padding: '7px 12px', color: '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.page||'/'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const AdminEngagement = () => {
  const navigate = useNavigate();
  // --- Quotations state ---
  const [quotations, setQuotations] = useState([]);
  const [stats, setStats] = useState({});
  const [senderStats, setSenderStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [senderFilter, setSenderFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // --- Tab + user-type filters ---
  const [activeTab, setActiveTab] = useState('quotations');
  const [viewerTypeFilter, setViewerTypeFilter] = useState('all');
  const [searchTypeFilter, setSearchTypeFilter] = useState('all');

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({ page, limit: 50 });
      if (filter !== 'all') params.append('status', filter);
      if (senderFilter !== 'all') params.append('senderType', senderFilter);
      const res = await fetch(getApiUrl(`sellers/admin/quotations?${params}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setQuotations(data.quotations || []);
        setStats(data.stats || {});
        setSenderStats(data.senderStats || {});
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (err) { console.error('Error fetching quotations:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchQuotations(); }, [filter, senderFilter, page]);

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
    { label: 'Closed', value: stats.closed || 0, color: '#6b7280' },
    { label: '👤 Buyers', value: senderStats.buyer || 0, color: '#1d4ed8' },
    { label: '👻 Guests', value: senderStats.guest || 0, color: '#9ca3af' },
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => navigate('/admin/dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', fontSize: '0.8rem', fontWeight: '600',
            background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px',
            cursor: 'pointer', color: '#374151'
          }}>
          ← Dashboard
        </button>
        <h2 style={{ fontSize: '1.3rem', fontWeight: '700', margin: 0, color: '#1f2937' }}>
          <i className="fas fa-chart-bar me-2 text-warning"></i>User Analytics
        </h2>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', flexWrap: 'wrap' }}>
        {[
          { key: 'quotations', label: '📨 Quotations',     color: '#ff9900' },
          { key: 'views',      label: '👁 Product Views',  color: '#6366f1' },
          { key: 'searches',   label: '🔍 Searches',       color: '#f59e0b' },
          { key: 'visitors',   label: '🌐 Site Visitors',  color: '#8b5cf6' },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              padding: '10px 18px', fontSize: '0.85rem', fontWeight: '600',
              border: 'none', cursor: 'pointer', background: 'transparent',
              borderBottom: activeTab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
              color: activeTab === t.key ? t.color : '#6b7280',
              marginBottom: '-2px', whiteSpace: 'nowrap'
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== QUOTATIONS TAB ===== */}
      {activeTab === 'quotations' && (
        <>
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

          {/* Status filter tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
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

          {/* Sender type filter */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Sender:</span>
            {[
              { value: 'all',   label: 'All',    color: '#6366f1' },
              { value: 'buyer', label: '👤 Buyers', color: '#1d4ed8' },
              { value: 'guest', label: '👻 Guests', color: '#6b7280' },
            ].map(t => (
              <button key={t.value} onClick={() => { setSenderFilter(t.value); setPage(1); }}
                style={{
                  padding: '5px 14px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '20px',
                  border: `1.5px solid ${t.color}`,
                  background: senderFilter === t.value ? t.color : 'white',
                  color: senderFilter === t.value ? 'white' : t.color,
                  cursor: 'pointer'
                }}>
                {t.label}
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
                    {['Date', 'Type', 'Product', 'Seller', 'Buyer / Guest', 'Phone', 'Email', 'Qty', 'Price', 'Message', 'Status', 'Action'].map(h => (
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
                      <td style={{ padding: '10px 12px' }}>
                        {(q.senderType === 'buyer' || (!q.senderType && q.buyerName && q.buyerName !== 'Guest'))
                          ? <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 10, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>👤 Buyer</span>
                          : <span style={{ background: '#f3f4f6', color: '#6b7280', borderRadius: 10, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>👻 Guest</span>}
                      </td>
                      <td style={{ padding: '10px 12px', maxWidth: '150px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '600' }} title={q.productName}>
                          {q.productName}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: '600', color: '#059669' }}>{q.sellerUsername}</td>
                      <td style={{ padding: '10px 12px', fontWeight: '600' }}>
                        {q.buyerName || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Unknown</span>}
                      </td>
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
        </>
      )}

      {/* ===== PRODUCT VIEWS TAB ===== */}
      {activeTab === 'views' && (
        <ProductViewsTab
          viewerTypeFilter={viewerTypeFilter}
          onViewerTypeChange={setViewerTypeFilter}
        />
      )}

      {/* ===== SEARCH ANALYTICS TAB ===== */}
      {activeTab === 'searches' && (
        <SearchAnalyticsTab
          searchTypeFilter={searchTypeFilter}
          onSearchTypeChange={setSearchTypeFilter}
        />
      )}

      {/* ===== SITE VISITORS TAB ===== */}
      {activeTab === 'visitors' && <SiteVisitorsTab />}
    </div>
  );
};

export default AdminEngagement;
