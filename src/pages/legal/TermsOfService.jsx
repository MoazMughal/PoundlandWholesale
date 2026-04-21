import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ScrollToTop from '../../components/ScrollToTop';

const Section = ({ num, title, children }) => (
  <Box sx={{ mb: 3.5 }}>
    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#1f2937' }}>{num}. {title}</Typography>
    {children}
  </Box>
);

const TermsOfService = () => (
  <Box sx={{ background: '#f8f9fa', minHeight: '100vh', py: { xs: 3, md: 5 } }}>
    <Container maxWidth="md">
      <Card elevation={2} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Typography variant="h3" sx={{ textAlign: 'center', fontWeight: 800, mb: 1, fontSize: { xs: '1.8rem', md: '2.2rem' } }}>
            Terms of Service
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'center', color: '#6b7280', mb: 4 }}>
            Last updated: {new Date().toLocaleDateString()}
          </Typography>

          <Divider sx={{ mb: 4 }} />

          <Section num="1" title="Acceptance of Terms">
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8 }}>
              By accessing and using PoundlandWholesale.com ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
            </Typography>
          </Section>

          <Section num="2" title="Description of Service">
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              PoundlandWholesale.com is a B2B marketplace platform that connects wholesale suppliers with buyers. We provide a platform for:
            </Typography>
            {['Product listings and catalog management', 'Supplier verification and communication', 'Order management and tracking', 'Payment processing facilitation'].map(item => (
              <Typography key={item} variant="body2" sx={{ color: '#555', pl: 2, mb: 0.5 }}>• {item}</Typography>
            ))}
          </Section>

          <Section num="3" title="User Accounts">
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>To access certain features, you must create an account. You are responsible for:</Typography>
            {['Maintaining the confidentiality of your account credentials', 'All activities that occur under your account', 'Providing accurate and complete information', 'Updating your information as necessary'].map(item => (
              <Typography key={item} variant="body2" sx={{ color: '#555', pl: 2, mb: 0.5 }}>• {item}</Typography>
            ))}
          </Section>

          <Section num="4" title="Prohibited Uses">
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>You may not use our service:</Typography>
            {['For any unlawful purpose or to solicit others to unlawful acts', 'To violate any international, federal, provincial, or state regulations', 'To infringe upon intellectual property rights', 'To harass, abuse, insult, harm, or discriminate', 'To submit false or misleading information'].map(item => (
              <Typography key={item} variant="body2" sx={{ color: '#555', pl: 2, mb: 0.5 }}>• {item}</Typography>
            ))}
          </Section>

          <Section num="5" title="Products and Services">
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8 }}>
              All products and services are subject to availability. We reserve the right to discontinue any product at any time. Prices are subject to change without notice.
            </Typography>
          </Section>

          <Section num="6" title="Payment Terms">
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8 }}>
              Payment processing is handled through secure third-party providers. By making a purchase, you agree to provide current, complete, and accurate purchase and account information.
            </Typography>
          </Section>

          <Section num="7" title="Limitation of Liability">
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8 }}>
              PoundlandWholesale.com shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
            </Typography>
          </Section>

          <Section num="8" title="Governing Law">
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8 }}>
              These Terms shall be interpreted and governed by the laws of Pakistan, without regard to its conflict of law provisions.
            </Typography>
          </Section>

          <Section num="9" title="Contact Information">
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>If you have any questions about these Terms of Service, please contact us:</Typography>
            {['Email: support@poundlandwholesale.com', 'Phone: +92 301 6611011', 'Address: Karachi, Pakistan'].map(item => (
              <Typography key={item} variant="body2" sx={{ color: '#555', pl: 2, mb: 0.5 }}>• {item}</Typography>
            ))}
          </Section>

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button component={Link} to="/" variant="contained"
              sx={{ background: '#667eea', '&:hover': { background: '#5a67d8' }, borderRadius: 2, fontWeight: 700, px: 4 }}>
              Back to Home
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
    <ScrollToTop />
  </Box>
);

export default TermsOfService;
