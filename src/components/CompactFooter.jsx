import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

// MUI-compatible link that uses react-router
const FooterLink = ({ to, children }) => (
  <Box
    component={Link}
    to={to}
    sx={{
      display: 'block',
      color: 'rgba(255,255,255,0.75)',
      textDecoration: 'none',
      fontSize: '0.875rem',
      transition: 'all 0.2s ease',
      '&:hover': { color: '#ff9900', transform: 'translateX(5px)' },
    }}
  >
    {children}
  </Box>
);

// Section heading with orange underline
const SectionHeading = ({ children }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#fff', mb: 0.5 }}>
      {children}
    </Typography>
    <Box sx={{ width: 36, height: 3, background: '#ff9900', borderRadius: 1 }} />
  </Box>
);

const CompactFooter = () => (
  <Box
    component="footer"
    sx={{
      background: 'linear-gradient(135deg, #232f3e 0%, #1a252f 100%)',
      borderTop: '3px solid #ff9900',
      boxShadow: '0 -2px 12px rgba(255,153,0,0.2)',
      color: '#fff',
      mt: 'auto',
      flexShrink: 0,
      width: '100%',
    }}
  >
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 }, px: { xs: 2, md: 4 } }}>

      {/* ── Main grid ── */}
      <Grid container spacing={{ xs: 3, md: 4 }}>

        {/* About */}
        <Grid item xs={12} sm={6} md={3}>
          <SectionHeading>About Us</SectionHeading>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}>
            Your trusted wholesale marketplace connecting suppliers with global retailers.
          </Typography>
        </Grid>

        {/* Quick Links */}
        <Grid item xs={12} sm={6} md={3}>
          <SectionHeading>Quick Links</SectionHeading>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FooterLink to="/">Home</FooterLink>
            <FooterLink to="/about-us">About Us</FooterLink>
            <FooterLink to="/basket">Basket</FooterLink>
            <FooterLink to="/join-now">Join Now</FooterLink>
          </Box>
        </Grid>

        {/* Legal */}
        <Grid item xs={12} sm={6} md={3}>
          <SectionHeading>Legal</SectionHeading>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FooterLink to="/terms-of-service">Terms of Service</FooterLink>
            <FooterLink to="/privacy-policy">Privacy Policy</FooterLink>
            <FooterLink to="/help-center">Help Center</FooterLink>
            <FooterLink to="/faq">FAQ</FooterLink>
          </Box>
        </Grid>

        {/* Contact */}
        <Grid item xs={12} sm={6} md={3}>
          <SectionHeading>Contact</SectionHeading>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
            {[
              { icon: 'fa-envelope', text: 'poundlandwholesale@gmail.com' },
              { icon: 'fa-phone',   text: '+92 304 4928000' },
              { icon: 'fa-phone',   text: '+92 303 4928000' },
              { icon: 'fa-map-marker-alt', text: 'London, United Kingdom' },
            ].map(({ icon, text }) => (
              <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <i className={`fas ${icon}`} style={{ color: '#ff9900', fontSize: '13px', width: 16, flexShrink: 0 }} />
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem' }}>
                  {text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Grid>
      </Grid>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', my: { xs: 2, md: 3 } }} />

      {/* ── Bottom bar ── */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
      }}>
        {/* Social icons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mr: 0.5 }}>
            Follow Us:
          </Typography>
          {[
            { href: 'https://www.facebook.com/share/1AfLdYF6NU/', icon: 'fa-facebook-f', label: 'Facebook', hover: '#1877f2' },
            { href: 'https://x.com/PoundlandW47056', icon: 'fa-x-twitter', label: 'X (Twitter)', hover: '#000' },
            { href: 'https://www.instagram.com/poundlandwholesale/', icon: 'fa-instagram', label: 'Instagram', hover: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' },
          ].map(({ href, icon, label, hover }) => (
            <Tooltip key={label} title={`Follow us on ${label}`}>
              <IconButton
                component="a"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{
                  color: 'rgba(255,255,255,0.8)',
                  background: 'rgba(255,255,255,0.1)',
                  width: 36, height: 36,
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    background: hover,
                    color: '#fff',
                    transform: 'translateY(-3px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  },
                }}
              >
                <i className={`fab ${icon}`} style={{ fontSize: '15px' }} />
              </IconButton>
            </Tooltip>
          ))}
        </Box>

        {/* Copyright */}
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', textAlign: { xs: 'center', sm: 'right' } }}>
          © {new Date().getFullYear()} PoundlandWholesale.com. All rights reserved.
        </Typography>
      </Box>
    </Container>
  </Box>
);

export default CompactFooter;
