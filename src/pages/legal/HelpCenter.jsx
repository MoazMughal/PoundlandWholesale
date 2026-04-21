import { useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import ScrollToTop from '../../components/ScrollToTop';

const helpCategories = {
  'getting-started': {
    title: 'Getting Started', icon: '🚀',
    articles: [
      { title: 'How to create an account', content: 'Visit our registration page and choose between Buyer or Supplier account. Fill in your business details and verify your email address.' },
      { title: 'Account verification process', content: 'After registration, upload your business documents. Our team will review and verify your account within 24-48 hours.' },
      { title: 'Setting up your profile', content: 'Complete your business profile with accurate information, add your logo, and provide detailed business description.' },
    ]
  },
  'buying': {
    title: 'For Buyers', icon: '🛒',
    articles: [
      { title: 'How to find suppliers', content: 'Use our search function to find products and suppliers. Filter by location, price, minimum order quantity, and ratings.' },
      { title: 'Contacting suppliers', content: 'Click on any product to view supplier details. Use our messaging system or WhatsApp integration to communicate directly.' },
      { title: 'Placing orders', content: 'Negotiate terms with suppliers, agree on pricing and delivery, then place your order through our secure platform.' },
    ]
  },
  'selling': {
    title: 'For Suppliers', icon: '🏪',
    articles: [
      { title: 'Adding products', content: 'Go to your dashboard and click "Add Product". Fill in product details, upload high-quality images, and set competitive prices.' },
      { title: 'Managing inventory', content: 'Keep your inventory updated. Set stock levels and enable notifications for low stock alerts.' },
      { title: 'Handling inquiries', content: 'Respond to buyer inquiries promptly. Use our messaging system to negotiate terms and close deals.' },
    ]
  },
  'payments': {
    title: 'Payments & Billing', icon: '💳',
    articles: [
      { title: 'Payment methods', content: 'We accept bank transfers, JazzCash, EasyPaisa, and credit/debit cards. All payments are processed securely.' },
      { title: 'Subscription plans', content: 'Choose from our flexible subscription plans. Basic plan is free, Premium plans offer additional features and priority support.' },
      { title: 'Refund policy', content: 'Refunds are processed within 7-14 business days. Contact support for refund requests with valid reasons.' },
    ]
  },
  'technical': {
    title: 'Technical Support', icon: '⚙️',
    articles: [
      { title: 'Troubleshooting login issues', content: 'Clear your browser cache, check your internet connection, or reset your password if you cannot log in.' },
      { title: 'Mobile app usage', content: 'Download our mobile app from Google Play Store or Apple App Store for better mobile experience.' },
      { title: 'Browser compatibility', content: 'Our platform works best on Chrome, Firefox, Safari, and Edge. Ensure JavaScript is enabled.' },
    ]
  },
};

const HelpCenter = () => {
  const [active, setActive] = useState('getting-started');
  const [search, setSearch] = useState('');
  const cat = helpCategories[active];

  return (
    <Box sx={{ background: '#f8f9fa', minHeight: '100vh', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg">
        <Typography variant="h3" sx={{ textAlign: 'center', fontWeight: 800, mb: 4, fontSize: { xs: '1.8rem', md: '2.4rem' } }}>
          Help Center
        </Typography>

        <Grid container spacing={3}>
          {/* Sidebar */}
          <Grid item xs={12} md={3}>
            <Card elevation={2} sx={{ borderRadius: 3, mb: 2 }}>
              <CardContent sx={{ p: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, px: 2, py: 1.5, borderBottom: '1px solid #e5e7eb' }}>
                  Categories
                </Typography>
                <List disablePadding>
                  {Object.entries(helpCategories).map(([key, c]) => (
                    <ListItemButton key={key} selected={active === key} onClick={() => setActive(key)}
                      sx={{ '&.Mui-selected': { background: '#e0e7ff', color: '#4338ca', fontWeight: 700 }, borderRadius: 0 }}>
                      <Typography sx={{ mr: 1 }}>{c.icon}</Typography>
                      <ListItemText primary={c.title} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active === key ? 700 : 400 }} />
                    </ListItemButton>
                  ))}
                </List>
              </CardContent>
            </Card>


          </Grid>

          {/* Main content */}
          <Grid item xs={12} md={9}>
            <Card elevation={2} sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 2, borderBottom: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: '12px 12px 0 0' }}>
                  <Typography sx={{ fontSize: '1.4rem' }}>{cat.icon}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{cat.title}</Typography>
                </Box>
                <Box sx={{ p: 3 }}>
                  {cat.articles.map((article, i) => (
                    <Box key={i}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#4338ca', mb: 0.5 }}>{article.title}</Typography>
                      <Typography variant="body2" sx={{ color: '#555', lineHeight: 1.8 }}>{article.content}</Typography>
                      {i < cat.articles.length - 1 && <Divider sx={{ my: 2.5 }} />}
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Search */}
            <Card elevation={2} sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Search Help Articles</Typography>
                <TextField
                  fullWidth size="small"
                  placeholder="Search for help articles..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#9ca3af' }} /></InputAdornment>
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button component={Link} to="/" variant="contained"
            sx={{ background: '#667eea', '&:hover': { background: '#5a67d8' }, borderRadius: 2, fontWeight: 700, px: 4 }}>
            Back to Home
          </Button>
        </Box>
      </Container>
      <ScrollToTop />
    </Box>
  );
};

export default HelpCenter;
