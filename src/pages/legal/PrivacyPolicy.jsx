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

const BulletList = ({ items }) => (
  <Box sx={{ pl: 2 }}>
    {items.map(item => (
      <Typography key={item} variant="body2" sx={{ color: '#555', mb: 0.5 }}>• {item}</Typography>
    ))}
  </Box>
);

const PrivacyPolicy = () => (
  <Box sx={{ background: '#f8f9fa', minHeight: '100vh', py: { xs: 3, md: 5 } }}>
    <Container maxWidth="md">
      <Card elevation={2} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Typography variant="h3" sx={{ textAlign: 'center', fontWeight: 800, mb: 1, fontSize: { xs: '1.8rem', md: '2.2rem' } }}>
            Privacy Policy
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'center', color: '#6b7280', mb: 4 }}>
            Last updated: {new Date().toLocaleDateString()}
          </Typography>
          <Divider sx={{ mb: 4 }} />

          <Section num="1" title="Information We Collect">
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>We collect information you provide directly to us, such as when you:</Typography>
            <BulletList items={['Create an account', 'Make a purchase or transaction', 'Contact us for support', 'Subscribe to our newsletter']} />
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8, mt: 1 }}>This may include your name, email address, phone number, business information, and payment details.</Typography>
          </Section>

          <Section num="2" title="How We Use Your Information">
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>We use the information we collect to:</Typography>
            <BulletList items={['Provide, maintain, and improve our services', 'Process transactions and send related information', 'Send technical notices and support messages', 'Communicate with you about products, services, and events', 'Monitor and analyze trends and usage', 'Detect, investigate, and prevent fraudulent transactions']} />
          </Section>

          <Section num="3" title="Information Sharing">
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>We do not sell, trade, or otherwise transfer your personal information to third parties except:</Typography>
            <BulletList items={['With your consent', 'To trusted service providers who assist us in operating our platform', 'When required by law or to protect our rights', 'In connection with a merger, acquisition, or sale of assets']} />
          </Section>

          <Section num="4" title="Data Security">
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8 }}>
              We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
            </Typography>
          </Section>

          <Section num="5" title="Cookies and Tracking">
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>We use cookies and similar tracking technologies to:</Typography>
            <BulletList items={['Remember your preferences and settings', 'Analyze site traffic and usage patterns', 'Provide personalized content and advertisements', 'Improve our services']} />
          </Section>

          <Section num="6" title="Your Rights">
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>You have the right to:</Typography>
            <BulletList items={['Access and update your personal information', 'Request deletion of your data', 'Opt-out of marketing communications', 'Request a copy of your data']} />
          </Section>

          <Section num="7" title="Children's Privacy">
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8 }}>
              Our service is not intended for children under 18. We do not knowingly collect personal information from children under 18.
            </Typography>
          </Section>

          <Section num="8" title="Changes to Privacy Policy">
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8 }}>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
            </Typography>
          </Section>

          <Section num="9" title="Contact Us">
            <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>If you have any questions about this Privacy Policy, please contact us:</Typography>
            <BulletList items={['Email: privacy@poundlandwholesale.com', 'Phone: +92 301 6611011', 'Address: Karachi, Pakistan']} />
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

export default PrivacyPolicy;
