import { useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ScrollToTop from '../../components/ScrollToTop';

const faqData = [
  {
    category: 'General', icon: '🌐',
    questions: [
      { q: 'What is PoundlandWholesale.com?', a: "PoundlandWholesale.com is the UK's premier B2B marketplace connecting verified wholesale suppliers with genuine buyers. We provide a secure platform for wholesale trading with features like supplier verification, secure payments, and direct communication." },
      { q: 'How do I get started?', a: 'Simply create an account by choosing between Buyer or Supplier registration. Complete your profile, verify your business documents, and start exploring our marketplace.' },
      { q: 'Is it free to use?', a: 'Basic membership is free for both buyers and suppliers. We also offer premium plans with additional features like priority listing, advanced analytics, and dedicated support.' },
    ]
  },
  {
    category: 'For Buyers', icon: '🛒',
    questions: [
      { q: 'How do I find reliable suppliers?', a: 'All our suppliers are verified through a rigorous process. Look for verified badges, check ratings and reviews, and use our advanced filters to find suppliers that match your requirements.' },
      { q: 'What is the minimum order quantity?', a: 'Minimum order quantities vary by supplier and product. This information is clearly displayed on each product listing. You can also negotiate with suppliers for flexible quantities.' },
      { q: 'How do I contact suppliers?', a: 'You can contact suppliers through our secure messaging system, WhatsApp integration, or direct phone calls. Contact details are available after account verification.' },
    ]
  },
  {
    category: 'For Suppliers', icon: '🏪',
    questions: [
      { q: 'How do I list my products?', a: 'After account verification, go to your dashboard and click "Add Product". Fill in detailed product information, upload high-quality images, and set competitive prices.' },
      { q: 'What are the listing fees?', a: 'Basic product listing is free. Premium listings with enhanced visibility and features are available through our subscription plans starting from Rs. 2,000/month.' },
      { q: 'How do I get more visibility?', a: 'Maintain high-quality product listings, respond quickly to inquiries, maintain good ratings, and consider upgrading to premium plans for enhanced visibility.' },
    ]
  },
  {
    category: 'Payments & Security', icon: '🔒',
    questions: [
      { q: 'What payment methods do you accept?', a: 'We accept bank transfers, JazzCash, EasyPaisa, credit/debit cards, and other popular payment methods. All transactions are secured with SSL encryption.' },
      { q: 'Is my business information secure?', a: 'Yes, we use industry-standard security measures to protect your data. We never share your information with third parties without your consent.' },
      { q: 'What if I have a dispute?', a: "We have a dedicated dispute resolution team. Contact our support team with details, and we'll help mediate and resolve the issue fairly." },
    ]
  },
  {
    category: 'Technical Support', icon: '⚙️',
    questions: [
      { q: "I'm having trouble logging in. What should I do?", a: 'Try clearing your browser cache, check your internet connection, or use the "Forgot Password" option. If issues persist, contact our technical support team.' },
      { q: 'Do you have a mobile app?', a: 'Yes, our mobile app is available on Google Play Store and Apple App Store. Search for "PoundlandWholesale" to download.' },
      { q: 'Which browsers are supported?', a: 'Our platform works best on Chrome, Firefox, Safari, and Edge. Ensure your browser is updated and JavaScript is enabled for optimal experience.' },
    ]
  },
];

const FAQ = () => {
  const [expanded, setExpanded] = useState(false);
  const toggle = panel => (_, isExpanded) => setExpanded(isExpanded ? panel : false);

  return (
    <Box sx={{ background: '#f8f9fa', minHeight: '100vh', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, fontSize: { xs: '1.8rem', md: '2.4rem' } }}>
            Frequently Asked Questions
          </Typography>
          <Typography variant="body1" sx={{ color: '#6b7280' }}>
            Find answers to the most common questions about our platform
          </Typography>
        </Box>

        {/* FAQ sections */}
        {faqData.map((section, si) => (
          <Box key={si} sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Typography sx={{ fontSize: '1.4rem' }}>{section.icon}</Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1f2937' }}>{section.category}</Typography>
              <Chip label={`${section.questions.length} questions`} size="small" sx={{ ml: 'auto', background: '#e0e7ff', color: '#4338ca', fontWeight: 600 }} />
            </Box>

            {section.questions.map((faq, qi) => {
              const key = `${si}-${qi}`;
              return (
                <Accordion key={key} expanded={expanded === key} onChange={toggle(key)}
                  elevation={1} sx={{ mb: 1, borderRadius: '8px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}
                    sx={{ fontWeight: 600, '&.Mui-expanded': { background: '#f0f4ff' } }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>{faq.q}</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ background: '#fafafa', borderTop: '1px solid #e5e7eb' }}>
                    <Typography variant="body2" sx={{ color: '#555', lineHeight: 1.8 }}>{faq.a}</Typography>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        ))}

        {/* Still have questions */}
        <Card elevation={2} sx={{ borderRadius: 3, background: 'linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)', mt: 4 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Still have questions?</Typography>
            <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>Visit our Help Center for more information</Typography>
            <Button component={Link} to="/help-center" variant="contained"
              sx={{ background: '#667eea', '&:hover': { background: '#5a67d8' }, borderRadius: 2, fontWeight: 700, mr: 2 }}>
              Help Center
            </Button>
            <Button component={Link} to="/" variant="outlined"
              sx={{ borderColor: '#667eea', color: '#667eea', borderRadius: 2, fontWeight: 700 }}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </Container>
      <ScrollToTop />
    </Box>
  );
};

export default FAQ;
