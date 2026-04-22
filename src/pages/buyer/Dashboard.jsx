import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBuyer } from '../../context/BuyerContext';
import { getApiUrl } from '../../utils/api';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import '../../styles/BuyerDashboard.css';

const statusColor = {
  pending:   { bg: '#fef3c7', color: '#92400e' },
  viewed:    { bg: '#dbeafe', color: '#1e40af' },
  responded: { bg: '#d1fae5', color: '#065f46' },
  closed:    { bg: '#f3f4f6', color: '#374151' },
};

const BuyerDashboard = () => {
  const { buyer, isLoggedIn, loading: authLoading, logout } = useBuyer();
  const [stats, setStats]           = useState({ totalOrders: 0, totalFavorites: 0, status: 'active', memberSince: null, lastLogin: null });
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [showAll, setShowAll]       = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return;
      if (!isLoggedIn || !buyer) { navigate('/login/buyer'); return; }

      const token = localStorage.getItem('buyerToken');
      if (!token) { navigate('/login/buyer'); return; }

      try {
        // Profile
        const profileRes = await fetch(getApiUrl('buyer/profile'), { headers: { Authorization: `Bearer ${token}` } });
        if (profileRes.ok) {
          const d = await profileRes.json();
          localStorage.setItem('buyerData', JSON.stringify(d.buyer));
        } else if (profileRes.status === 401) {
          localStorage.removeItem('buyerToken');
          localStorage.removeItem('buyerData');
          navigate('/login/buyer');
          return;
        }

        // Stats
        const statsRes = await fetch(getApiUrl('buyer/dashboard/stats'), { headers: { Authorization: `Bearer ${token}` } });
        if (statsRes.ok) { const d = await statsRes.json(); setStats(d.stats); }

        // Quotations sent by this buyer (by email)
        const email = buyer?.email;
        if (email) {
          const qRes = await fetch(getApiUrl(`sellers/admin/quotations?limit=200`), {
            headers: { Authorization: `Bearer ${token}` }
          });
          // Fallback: fetch public quotations by buyer email
          // Try buyer-specific endpoint first
          const buyerQRes = await fetch(getApiUrl(`buyer/quotations`), {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (buyerQRes.ok) {
            const d = await buyerQRes.json();
            setQuotations(d.quotations || []);
          }
        }
      } catch (err) {
        console.error('Error fetching buyer data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authLoading, isLoggedIn, buyer, navigate]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: '2rem', mb: 1 }}>⏳</Typography>
          <Typography variant="h6">Loading...</Typography>
        </Box>
      </Box>
    );
  }

  const filtered = quotations.filter(q =>
    !search ||
    q.productName?.toLowerCase().includes(search.toLowerCase()) ||
    q.sellerUsername?.toLowerCase().includes(search.toLowerCase()) ||
    q.sku?.toLowerCase().includes(search.toLowerCase())
  );
  const displayed = showAll ? filtered : filtered.slice(0, 5);

  const statCards = [
    { icon: '📨', label: 'Quotations Sent', value: quotations.length, color: '#667eea' },
    { icon: '⏳', label: 'Pending',          value: quotations.filter(q => q.status === 'pending').length,   color: '#f59e0b' },
    { icon: '✅', label: 'Responded',        value: quotations.filter(q => q.status === 'responded').length, color: '#10b981' },
    { icon: '📊', label: 'Account Status',   value: stats.status === 'active' ? 'Active' : 'Inactive',       color: stats.status === 'active' ? '#10b981' : '#dc2626', isText: true },
  ];

  return (
    <Box sx={{ background: '#f8fafc', minHeight: '100vh', pb: 6 }}>

      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', py: { xs: 3, md: 4 }, mb: 4 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#fff', mb: 0.5, fontSize: { xs: '1.4rem', md: '1.8rem' } }}>
                👋 Welcome, {buyer?.name || buyer?.firstName || buyer?.username || 'Buyer'}!
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>{buyer?.email}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button onClick={() => navigate('/')} variant="outlined"
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', borderRadius: 2, fontWeight: 600, '&:hover': { background: 'rgba(255,255,255,0.1)', borderColor: '#fff' } }}>
                🏠 Home
              </Button>
              <Button onClick={() => navigate('/buyer/edit-profile')} variant="outlined"
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)', borderRadius: 2, fontWeight: 600, '&:hover': { background: 'rgba(255,255,255,0.1)', borderColor: '#fff' } }}>
                ✏️ Edit Profile
              </Button>
              <Button onClick={logout} variant="contained"
                sx={{ background: '#dc2626', '&:hover': { background: '#b91c1c' }, borderRadius: 2, fontWeight: 600 }}>
                Logout
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg">

        {/* Stat cards */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {statCards.map(s => (
            <Grid item xs={6} sm={3} key={s.label}>
              <Card elevation={1} sx={{ borderRadius: 3, textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
                <CardContent sx={{ py: 2.5 }}>
                  <Typography sx={{ fontSize: '1.8rem', mb: 0.5 }}>{s.icon}</Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, display: 'block', mb: 0.5 }}>{s.label}</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: s.color, fontSize: s.isText ? '1rem' : '1.6rem' }}>
                    {s.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Quick actions */}
        <Card elevation={1} sx={{ borderRadius: 3, mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5, color: '#1f2937' }}>🚀 Quick Actions</Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              {[
                { label: '❤️ My Wishlist', path: '/buyer/wishlist', color: '#e74c3c' },
                { label: '🏆 Browse Products', path: '/', color: '#ff9900' },
                { label: '🛒 My Basket', path: '/basket', color: '#667eea' },
              ].map(a => (
                <Button key={a.label} variant="contained" onClick={() => navigate(a.path)}
                  sx={{ background: a.color, '&:hover': { background: a.color, filter: 'brightness(0.9)' }, borderRadius: 2, fontWeight: 700, px: 3 }}>
                  {a.label}
                </Button>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* Account info */}
        <Card elevation={1} sx={{ borderRadius: 3, mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1f2937' }}>👤 Account Information</Typography>
            <Grid container spacing={2}>
              {[
                { label: 'Email',        value: buyer?.email },
                { label: 'User Type',    value: buyer?.userType || 'Buyer' },
                { label: 'Member Since', value: stats.memberSince ? new Date(stats.memberSince).toLocaleDateString() : 'N/A' },
                { label: 'Last Login',   value: stats.lastLogin   ? new Date(stats.lastLogin).toLocaleString()   : 'N/A' },
              ].map(f => (
                <Grid item xs={12} sm={6} md={3} key={f.label}>
                  <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, display: 'block' }}>{f.label}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#111827', mt: 0.3 }}>{f.value}</Typography>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* ── My Quotations ── */}
        <Card elevation={1} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1f2937' }}>
                📨 My Quotations ({quotations.length})
              </Typography>
              <TextField
                size="small" placeholder="Search product, seller, SKU..."
                value={search} onChange={e => setSearch(e.target.value)}
                sx={{ minWidth: 240, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#9ca3af' }} /></InputAdornment> }}
              />
            </Box>

            {filtered.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, color: '#6b7280' }}>
                <Typography sx={{ fontSize: '3rem', mb: 1.5 }}>📭</Typography>
                <Typography variant="h6" sx={{ mb: 1 }}>No quotations yet</Typography>
                <Typography variant="body2" sx={{ mb: 3 }}>
                  Add products to your basket and proceed to checkout to send quotations to sellers.
                </Typography>
                <Button variant="contained" onClick={() => navigate('/')}
                  sx={{ background: '#667eea', '&:hover': { background: '#5a67d8' }, borderRadius: 2, fontWeight: 700 }}>
                  Browse Products
                </Button>
              </Box>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      {['Date', 'Product', 'SKU', 'Seller', 'Qty', 'Price', 'Status'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map(q => {
                      const sc = statusColor[q.status] || statusColor.pending;
                      return (
                        <tr key={q._id} style={{ borderBottom: '1px solid #f3f4f6' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                          onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                          <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                            {new Date(q.submittedAt).toLocaleDateString()}<br />
                            <span style={{ fontSize: '0.7rem' }}>{new Date(q.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td style={{ padding: '10px 12px', maxWidth: 200 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={q.productName}>
                              {q.productName}
                            </Typography>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', background: '#f3f4f6', px: 0.8, py: 0.3, borderRadius: 1, color: '#374151' }}>
                              {q.sku || q.productSku || '—'}
                            </Typography>
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 600, color: '#059669' }}>{q.sellerUsername}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>{q.quantity}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#059669' }}>
                            {q.sellerPrice ? `£${parseFloat(q.sellerPrice).toFixed(2)}` : '—'}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ padding: '3px 10px', background: sc.bg, color: sc.color, borderRadius: 12, fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize' }}>
                              {q.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length > 5 && (
                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Button variant="text" onClick={() => setShowAll(p => !p)}
                      sx={{ color: '#667eea', fontWeight: 700, fontSize: '0.85rem' }}>
                      {showAll ? '▲ Show Less' : `▼ See More (${filtered.length - 5} more)`}
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

      </Container>
    </Box>
  );
};

export default BuyerDashboard;
