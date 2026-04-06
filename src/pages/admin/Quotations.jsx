import { useState, useEffect } from 'react';
import { getApiUrl } from '../../utils/api';
import { getImageUrl } from '../../utils/imageImports';

const statusColors = {
  pending: '#fbbf24',
  viewed: '#3b82f6',
  responded: '#10b981',
  closed: '#6b7280'
};

// ---- Product Views sub-component ----
const SORT_OPTIONS = [
  { value: 'views_desc', label: '👁 Most Views' },
  { value: 'views_asc',  label: '👁 Least Views' },
  { value: 'price_asc',  label: '£ Price: Low → High' },
  { value: 'price_desc', label: '£ Price: High → Low' },
  { value: 'name_asc',   label: 'A → Z' },
  { value: 'name_desc',  label: 'Z → A' },
];

const ProductViewsTab = ({ viewsData, totalViews, viewsLoading, onRefresh }) => {
  const [expanded, setExpanded] = useState(null);
  const [sort, setSort] = useState('views_desc');

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

  // max views from the original desc-sorted data for the bar
  const maxViews = [...viewsData].reduce((m, p) => Math.max(m, p.viewCount || 0), 1);

  return (
    <>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{
          background: 'white', borderRadius: '8px', padding: '14px 20px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)', borderTop: '3px solid #6366f1',
          minWidth: '140px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#6366f1' }}>{totalViews}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Views</div>
        </div>
        <div style={{
          background: 'white', borderRadius: '8px', padding: '14px 20px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)', borderTop: '3px solid #10b981',
          minWidth: '140px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#10b981' }}>{viewsData.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Products Viewed</div>
        </div>
        <button onClick={onRefresh}
          style={{
            padding: '10px 16px', fontSize: '0.8rem', fontWeight: '600',
            background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px',
            cursor: 'pointer', color: '#374151', alignSelf: 'center'
          }}>
          <i className="fas fa-sync-alt me-1"></i>Refresh
        </button>

        {/* Sort control */}
        <div style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
            <i className="fas fa-sort me-1"></i>Sort by:
          </span>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{
              fontSize: '0.78rem', padding: '6px 10px',
              border: '1px solid #d1d5db', borderRadius: '6px',
              background: 'white', cursor: 'pointer', color: '#374151'
            }}>
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {viewsLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <i className="fas fa-spinner fa-spin me-2"></i>Loading product views...
        </div>
      ) : viewsData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <i className="fas fa-eye-slash" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block' }}></i>
          No product views recorded yet.
          <br /><span style={{ fontSize: '0.8rem' }}>Views are tracked when buyers open a product detail page.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sorted.map((p, idx) => {
            const isOpen = expanded === p._id;
            const maxViews = viewsData[0]?.viewCount || 1;
            const imgSrc = getProductImage(p);
            return (
              <div key={p._id} style={{
                background: 'white', borderRadius: '10px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                border: isOpen ? '1px solid #6366f1' : '1px solid #e5e7eb',
                overflow: 'hidden'
              }}>
                {/* Product row */}
                <div
                  onClick={() => toggle(p._id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 16px', cursor: 'pointer',
                    background: isOpen ? '#f5f3ff' : 'white'
                  }}>

                  {/* Product image */}
                  <div style={{
                    width: '52px', height: '52px', flexShrink: 0,
                    borderRadius: '8px', overflow: 'hidden',
                    background: '#f3f4f6', border: '1px solid #e5e7eb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={p.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                      />
                    ) : null}
                    <div style={{
                      display: imgSrc ? 'none' : 'flex',
                      width: '100%', height: '100%',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem', color: '#d1d5db'
                    }}>
                      <i className="fas fa-box"></i>
                    </div>
                  </div>

                  {/* Rank badge overlaid on image area */}
                  <div style={{ position: 'relative', marginLeft: '-52px', marginRight: '4px', alignSelf: 'flex-start' }}>
                    <span style={{
                      background: idx < 3 ? ['#f59e0b','#9ca3af','#b45309'][idx] : '#e5e7eb',
                      color: idx < 3 ? 'white' : '#6b7280',
                      borderRadius: '6px', padding: '1px 5px',
                      fontSize: '0.65rem', fontWeight: '800'
                    }}>
                      {idx < 3 ? ['🥇','🥈','🥉'][idx] : `#${idx + 1}`}
                    </span>
                  </div>

                  {/* Name + category */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{p.category} · £{parseFloat(p.price || 0).toFixed(2)}</div>
                  </div>

                  {/* View bar + count */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px' }}>
                    <div style={{ flex: 1, height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '3px', background: '#6366f1',
                        width: `${Math.min(100, (p.viewCount / maxViews) * 100)}%`
                      }} />
                    </div>
                    <span style={{ fontWeight: '800', color: '#6366f1', fontSize: '0.85rem', minWidth: '28px' }}>
                      {p.viewCount}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>views</span>
                  </div>

                  {/* Viewers count badge */}
                  {p.viewers?.length > 0 && (
                    <span style={{
                      background: '#ede9fe', color: '#6366f1', borderRadius: '12px',
                      padding: '2px 8px', fontSize: '0.7rem', fontWeight: '700', whiteSpace: 'nowrap'
                    }}>
                      <i className="fas fa-users me-1"></i>{p.viewers.length} viewer{p.viewers.length !== 1 ? 's' : ''}
                    </span>
                  )}

                  {/* Expand arrow */}
                  <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}
                    style={{ color: '#9ca3af', fontSize: '0.75rem', marginLeft: '4px' }} />
                </div>

                {/* Expanded buyer list */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #e5e7eb', padding: '12px 16px', background: '#fafafa' }}>
                    {!p.viewers || p.viewers.length === 0 ? (
                      <div style={{ color: '#9ca3af', fontSize: '0.8rem', textAlign: 'center', padding: '8px' }}>
                        No buyer details recorded for this product yet.
                        <br /><span style={{ fontSize: '0.72rem' }}>Only logged-in buyers are identified; guests show as "Guest".</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                          Recent viewers (last {p.viewers.length}):
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                          <thead>
                            <tr style={{ background: '#f3f4f6' }}>
                              {['Type', 'Name', 'Email', 'Viewed At'].map(h => (
                                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: '700', color: '#6b7280' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {p.viewers.map((v, vi) => {
                              const type = v.viewerType || 'guest';
                              const typeStyle = {
                                buyer:  { bg: '#dbeafe', color: '#1d4ed8', icon: 'fa-user',       label: 'Buyer'  },
                                seller: { bg: '#d1fae5', color: '#065f46', icon: 'fa-store',      label: 'Seller' },
                                guest:  { bg: '#f3f4f6', color: '#6b7280', icon: 'fa-user-slash', label: 'Guest'  },
                              }[type] || { bg: '#f3f4f6', color: '#6b7280', icon: 'fa-user-slash', label: 'Guest' };
                              return (
                                <tr key={vi} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                  <td style={{ padding: '6px 10px' }}>
                                    <span style={{
                                      background: typeStyle.bg, color: typeStyle.color,
                                      borderRadius: '10px', padding: '2px 8px',
                                      fontSize: '0.7rem', fontWeight: '700'
                                    }}>
                                      <i className={`fas ${typeStyle.icon} me-1`}></i>{typeStyle.label}
                                    </span>
                                  </td>
                                  <td style={{ padding: '6px 10px', fontWeight: '600' }}>
                                    {v.buyerName === 'Guest'
                                      ? <span style={{ color: '#9ca3af' }}>Guest</span>
                                      : <><i className="fas fa-user-circle me-1" style={{ color: typeStyle.color }}></i>{v.buyerName}</>
                                    }
                                  </td>
                                  <td style={{ padding: '6px 10px', color: '#6b7280' }}>{v.buyerEmail || '—'}</td>
                                  <td style={{ padding: '6px 10px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                                    {new Date(v.viewedAt).toLocaleDateString()} {new Date(v.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {p.viewCount > p.viewers.length && (
                          <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '6px', textAlign: 'right' }}>
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

const SearchAnalyticsTab = ({ data, loading, sort, setSort, onRefresh }) => {
  const [view, setView] = useState('top'); // 'top' | 'recent'
  const [expandedQuery, setExpandedQuery] = useState(null);

  const sorted = [...(data.topQueries || [])].sort((a, b) => {
    switch (sort) {
      case 'count_asc':  return a.count - b.count;
      case 'recent':     return new Date(b.lastSearched) - new Date(a.lastSearched);
      case 'az':         return a._id.localeCompare(b._id);
      default:           return b.count - a.count;
    }
  });

  const maxCount = data.topQueries?.[0]?.count || 1;

  return (
    <>
      {/* Summary + controls */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{
          background: 'white', borderRadius: '8px', padding: '14px 20px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)', borderTop: '3px solid #f59e0b',
          minWidth: '140px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f59e0b' }}>{data.totalSearches}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Searches</div>
        </div>
        <div style={{
          background: 'white', borderRadius: '8px', padding: '14px 20px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)', borderTop: '3px solid #10b981',
          minWidth: '140px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#10b981' }}>{data.topQueries?.length || 0}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Unique Queries</div>
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: '4px', alignSelf: 'center' }}>
          {[['top','Top Queries'],['recent','Recent']].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              style={{
                padding: '7px 14px', fontSize: '0.78rem', fontWeight: '600',
                border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer',
                background: view === v ? '#f59e0b' : 'white',
                color: view === v ? 'white' : '#374151'
              }}>{label}</button>
          ))}
        </div>

        {/* Sort */}
        {view === 'top' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
              <i className="fas fa-sort me-1"></i>Sort:
            </span>
            <select value={sort} onChange={e => setSort(e.target.value)}
              style={{ fontSize: '0.78rem', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white', cursor: 'pointer' }}>
              {SEARCH_SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}

        <button onClick={onRefresh}
          style={{
            padding: '10px 16px', fontSize: '0.8rem', fontWeight: '600',
            background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px',
            cursor: 'pointer', color: '#374151', alignSelf: 'center'
          }}>
          <i className="fas fa-sync-alt me-1"></i>Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <i className="fas fa-spinner fa-spin me-2"></i>Loading search data...
        </div>
      ) : data.totalSearches === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          <i className="fas fa-search" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block' }}></i>
          No searches recorded yet.
          <br /><span style={{ fontSize: '0.8rem' }}>Searches are tracked when buyers type in the Amazon's Choice page.</span>
        </div>
      ) : view === 'top' ? (
        /* Top queries list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sorted.map((q, idx) => {
            const isOpen = expandedQuery === q._id;
            const uniqueBuyers = [...new Map((q.buyers || []).map(b => [b.email || b.name, b])).values()];
            return (
              <div key={q._id} style={{
                background: 'white', borderRadius: '10px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                border: isOpen ? '1px solid #f59e0b' : '1px solid #e5e7eb',
                overflow: 'hidden'
              }}>
                <div onClick={() => setExpandedQuery(prev => prev === q._id ? null : q._id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', background: isOpen ? '#fffbeb' : 'white' }}>

                  {/* Rank */}
                  <span style={{ fontSize: '0.9rem', minWidth: '28px', textAlign: 'center', fontWeight: '800', color: '#9ca3af' }}>
                    {idx < 3 ? ['🥇','🥈','🥉'][idx] : `#${idx + 1}`}
                  </span>

                  {/* Query text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1f2937' }}>
                      <i className="fas fa-search me-2" style={{ color: '#f59e0b', fontSize: '0.75rem' }}></i>
                      {q._id}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '2px' }}>
                      Last searched: {new Date(q.lastSearched).toLocaleDateString()} · avg {Math.round(q.avgResults || 0)} results
                    </div>
                  </div>

                  {/* Count bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px' }}>
                    <div style={{ flex: 1, height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: '3px', background: '#f59e0b',
                        width: `${Math.min(100, (q.count / maxCount) * 100)}%`
                      }} />
                    </div>
                    <span style={{ fontWeight: '800', color: '#f59e0b', fontSize: '0.85rem', minWidth: '24px' }}>{q.count}</span>
                    <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>times</span>
                  </div>

                  {/* Buyers badge */}
                  {uniqueBuyers.length > 0 && (
                    <span style={{
                      background: '#fef3c7', color: '#92400e', borderRadius: '12px',
                      padding: '2px 8px', fontSize: '0.7rem', fontWeight: '700', whiteSpace: 'nowrap'
                    }}>
                      <i className="fas fa-users me-1"></i>{uniqueBuyers.length} buyer{uniqueBuyers.length !== 1 ? 's' : ''}
                    </span>
                  )}

                  <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}
                    style={{ color: '#9ca3af', fontSize: '0.75rem' }} />
                </div>

                {/* Expanded buyer list */}
                {isOpen && uniqueBuyers.length > 0 && (
                  <div style={{ borderTop: '1px solid #e5e7eb', padding: '12px 16px', background: '#fafafa' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                      Buyers who searched this:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {uniqueBuyers.map((b, bi) => (
                        <span key={bi} style={{
                          background: 'white', border: '1px solid #e5e7eb', borderRadius: '20px',
                          padding: '4px 10px', fontSize: '0.75rem', color: '#374151'
                        }}>
                          {b.name === 'Guest'
                            ? <span style={{ color: '#9ca3af' }}>Guest</span>
                            : <><i className="fas fa-user-circle me-1" style={{ color: '#f59e0b' }}></i>{b.name}{b.email ? ` (${b.email})` : ''}</>
                          }
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Recent searches table */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['Time', 'Search Query', 'Source', 'Buyer / Seller', 'Email', 'Results'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '700', color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recent.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                  <td style={{ padding: '8px 12px', color: '#9ca3af', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                    {new Date(r.searchedAt).toLocaleDateString()} {new Date(r.searchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: '700' }}>
                    <i className="fas fa-search me-2" style={{ color: '#f59e0b', fontSize: '0.7rem' }}></i>{r.query}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {r.page === 'seller-products'
                      ? <span style={{ background: '#d1fae5', color: '#065f46', borderRadius: '10px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: '700' }}><i className="fas fa-store me-1"></i>Seller</span>
                      : <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: '10px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: '700' }}><i className="fas fa-user me-1"></i>Buyer</span>
                    }
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {r.buyerName === 'Guest'
                      ? <span style={{ color: '#9ca3af' }}>Guest</span>
                      : <><i className="fas fa-user-circle me-1" style={{ color: '#f59e0b' }}></i>{r.buyerName}</>
                    }
                  </td>
                  <td style={{ padding: '8px 12px', color: '#6b7280' }}>{r.buyerEmail || '—'}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700', color: '#6b7280' }}>{r.resultsCount || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

const AdminEngagement = () => {
  // --- Quotations state ---
  const [quotations, setQuotations] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // --- Product Views state ---
  const [activeTab, setActiveTab] = useState('quotations');
  const [viewsData, setViewsData] = useState([]);
  const [totalViews, setTotalViews] = useState(0);
  const [viewsLoading, setViewsLoading] = useState(false);

  // --- Search Analytics state ---
  const [searchData, setSearchData] = useState({ topQueries: [], recent: [], totalSearches: 0 });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchSort, setSearchSort] = useState('count_desc');

  const fetchSearchLogs = async () => {
    setSearchLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(getApiUrl('products/admin/search-logs'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setSearchData({ topQueries: data.topQueries || [], recent: data.recent || [], totalSearches: data.totalSearches || 0 });
    } catch (err) {
      console.error('Error fetching search logs:', err);
    } finally {
      setSearchLoading(false);
    }
  };

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

  const fetchProductViews = async () => {
    setViewsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(getApiUrl('products/admin/product-views?limit=100'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setViewsData(data.products || []);
        setTotalViews(data.totalViews || 0);
      }
    } catch (err) {
      console.error('Error fetching product views:', err);
    } finally {
      setViewsLoading(false);
    }
  };

  useEffect(() => { fetchQuotations(); }, [filter, page]);

  useEffect(() => {
    if (activeTab === 'views') fetchProductViews();
    if (activeTab === 'searches') fetchSearchLogs();
  }, [activeTab]);

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
        <i className="fas fa-chart-bar me-2 text-warning"></i>User Analytics
      </h2>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '24px', borderBottom: '2px solid #e5e7eb' }}>
        <button
          onClick={() => setActiveTab('quotations')}
          style={{
            padding: '10px 20px', fontSize: '0.85rem', fontWeight: '600',
            border: 'none', cursor: 'pointer', background: 'transparent',
            borderBottom: activeTab === 'quotations' ? '2px solid #ff9900' : '2px solid transparent',
            color: activeTab === 'quotations' ? '#ff9900' : '#6b7280',
            marginBottom: '-2px'
          }}>
          <i className="fas fa-paper-plane me-2"></i>Buyer Quotations
        </button>
        <button
          onClick={() => setActiveTab('views')}
          style={{
            padding: '10px 20px', fontSize: '0.85rem', fontWeight: '600',
            border: 'none', cursor: 'pointer', background: 'transparent',
            borderBottom: activeTab === 'views' ? '2px solid #6366f1' : '2px solid transparent',
            color: activeTab === 'views' ? '#6366f1' : '#6b7280',
            marginBottom: '-2px'
          }}>
          <i className="fas fa-eye me-2"></i>Product Views
          {totalViews > 0 && (
            <span style={{
              marginLeft: '6px', background: '#6366f1', color: 'white',
              borderRadius: '10px', padding: '1px 7px', fontSize: '0.7rem'
            }}>{totalViews}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('searches')}
          style={{
            padding: '10px 20px', fontSize: '0.85rem', fontWeight: '600',
            border: 'none', cursor: 'pointer', background: 'transparent',
            borderBottom: activeTab === 'searches' ? '2px solid #f59e0b' : '2px solid transparent',
            color: activeTab === 'searches' ? '#f59e0b' : '#6b7280',
            marginBottom: '-2px'
          }}>
          <i className="fas fa-search me-2"></i>Search Analytics
          {searchData.totalSearches > 0 && (
            <span style={{
              marginLeft: '6px', background: '#f59e0b', color: 'white',
              borderRadius: '10px', padding: '1px 7px', fontSize: '0.7rem'
            }}>{searchData.totalSearches}</span>
          )}
        </button>
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
        </>
      )}

      {/* ===== PRODUCT VIEWS TAB ===== */}
      {activeTab === 'views' && (
        <ProductViewsTab
          viewsData={viewsData}
          totalViews={totalViews}
          viewsLoading={viewsLoading}
          onRefresh={fetchProductViews}
        />
      )}

      {/* ===== SEARCH ANALYTICS TAB ===== */}
      {activeTab === 'searches' && (
        <SearchAnalyticsTab
          data={searchData}
          loading={searchLoading}
          sort={searchSort}
          setSort={setSearchSort}
          onRefresh={fetchSearchLogs}
        />
      )}
    </div>
  );
};

export default AdminEngagement;
