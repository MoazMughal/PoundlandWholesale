import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import ScrollToTop from '../components/ScrollToTop';

const WA = '923044928000';

// ── Reusable contact info row ──────────────────────────────────────────────
const InfoRow = ({ icon, label, value, href }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2.5 }}>
    <Avatar sx={{ width: 40, height: 40, background: 'rgba(255,153,0,0.15)', color: '#ff9900', fontSize: '1.1rem', flexShrink: 0 }}>
      {icon}
    </Avatar>
    <Box>
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      {href ? (
        <Box component="a" href={href} target={href.startsWith('http') ? '_blank' : undefined}
          rel="noopener noreferrer"
          sx={{ display: 'block', color: '#ffb84d', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500, '&:hover': { color: '#ff9900' } }}>
          {value}
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{value}</Typography>
      )}
    </Box>
  </Box>
);

// ── Stat card ──────────────────────────────────────────────────────────────
const StatCard = ({ value, label, icon }) => (
  <Box sx={{ textAlign: 'center', p: 2 }}>
    <Typography sx={{ fontSize: '1.8rem', mb: 0.5 }}>{icon}</Typography>
    <Typography variant="h4" sx={{ fontWeight: 800, color: '#ff9900', lineHeight: 1 }}>{value}</Typography>
    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{label}</Typography>
  </Box>
);

// ── Feature card ───────────────────────────────────────────────────────────
const FeatureCard = ({ icon, title, desc, color }) => (
  <Card elevation={0} sx={{ borderRadius: 3, height: '100%', border: `1px solid ${color}30`, background: `${color}08`, transition: 'all 0.25s', '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 32px ${color}20`, border: `1px solid ${color}60` } }}>
    <CardContent sx={{ p: 3, textAlign: 'center' }}>
      <Box sx={{ width: 60, height: 60, borderRadius: '50%', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2, fontSize: '1.8rem' }}>
        {icon}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#1f2937' }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: '#6b7280', lineHeight: 1.7 }}>{desc}</Typography>
    </CardContent>
  </Card>
);

// ── Main component ─────────────────────────────────────────────────────────
const AboutUs = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Auto-fill from logged-in user
  useEffect(() => {
    try {
      const buyerRaw  = localStorage.getItem('buyerData')  || localStorage.getItem('buyer');
      const sellerRaw = localStorage.getItem('sellerData') || localStorage.getItem('seller');
      if (buyerRaw) {
        const b = JSON.parse(buyerRaw);
        const name = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.name || b.username || '';
        setForm(p => ({ ...p, name: name || p.name, email: b.email || p.email }));
      } else if (sellerRaw) {
        const s = JSON.parse(sellerRaw);
        setForm(p => ({ ...p, name: s.businessName || s.username || s.name || p.name, email: s.email || p.email }));
      }
    } catch {}
  }, []);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      alert('Please fill in all required fields.');
      return;
    }
    setSending(true);
    const msg = [
      '📩 *New Contact Form Message*',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      `👤 *Name:*    ${form.name}`,
      `📧 *Email:*   ${form.email}`,
      `📌 *Subject:* ${form.subject}`,
      '',
      '💬 *Message:*',
      form.message,
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━',
      '_Sent from PoundlandWholesale.com Contact Form_',
    ].join('\n');
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank');
    setForm({ name: '', email: '', subject: '', message: '' });
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 5000);
  };

  const features = [
    { icon: '📦', title: '10,000+ Products',    desc: 'Wide range across multiple categories at competitive wholesale prices.',  color: '#f46709' },
    { icon: '✅', title: 'Verified Suppliers',  desc: 'Every supplier is vetted and quality-checked before listing on our platform.', color: '#10b981' },
    { icon: '💰', title: 'Profit Calculator',   desc: 'See your potential profit margins before placing any order.',              color: '#667eea' },
    { icon: '🌍', title: 'Global Reach',        desc: 'Connect with buyers and sellers from over 50 countries worldwide.',        color: '#f59e0b' },
  ];

  const stats = [
    { value: '10K+', label: 'Products',    icon: '📦' },
    { value: '500+', label: 'Suppliers',   icon: '🏪' },
    { value: '2K+',  label: 'Buyers',      icon: '🛒' },
    { value: '50+',  label: 'Countries',   icon: '🌍' },
  ];

  const socials = [
    { href: 'https://www.facebook.com/share/1AfLdYF6NU/', icon: 'fab fa-facebook-f', color: '#1877f2', label: 'Facebook' },
    { href: 'https://x.com/PoundlandW47056',              icon: 'fab fa-x-twitter',  color: '#000',    label: 'X' },
    { href: 'https://www.instagram.com/poundlandwholesale/', icon: 'fab fa-instagram', color: '#e1306c', label: 'Instagram' },
  ];

  return (
    <Box sx={{ background: '#f8fafc', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <Box sx={{ background: 'linear-gradient(135deg, #f46709 0%, #764ba2 100%)', py: { xs: 6, md: 9 }, textAlign: 'center', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        {/* decorative circles */}
        <Box sx={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <Box sx={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <Container maxWidth="md" sx={{ position: 'relative' }}>
          <Chip label="🏆 UK's Trusted Wholesale Platform" sx={{ mb: 2.5, background: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.3)' }} />
          <Typography variant="h2" sx={{ fontWeight: 900, mb: 2, fontSize: { xs: '2rem', md: '3rem' }, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
            About PoundlandWholesale
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 400, mb: 5, maxWidth: 560, mx: 'auto', lineHeight: 1.7 }}>
            Your trusted partner for wholesale products to Ecommerce Platforms
          </Typography>
          {/* Stats */}
          <Grid container justifyContent="center" sx={{ maxWidth: 560, mx: 'auto', background: 'rgba(255,255,255,0.12)', borderRadius: 3, backdropFilter: 'blur(8px)' }}>
            {stats.map(s => (
              <Grid item xs={6} sm={3} key={s.label}>
                <StatCard {...s} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>

        {/* ── Mission ── */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Chip label="Our Story" sx={{ mb: 2, background: '#f4670915', color: '#f46709', fontWeight: 700, border: '1px solid #f4670930' }} />
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, color: '#1f2937', fontSize: { xs: '1.8rem', md: '2.4rem' } }}>
            Our Mission
          </Typography>
          <Typography variant="body1" sx={{ lineHeight: 1.9, color: '#555', maxWidth: 720, mx: 'auto', mb: 2 }}>
            We connect wholesale suppliers with Amazon sellers and ecommerce stores, providing high-quality products at competitive prices.
            Our platform makes it easy to find trending products, calculate profits, and grow your e-commerce business.
          </Typography>
          <Typography variant="body1" sx={{ lineHeight: 1.9, color: '#555', maxWidth: 720, mx: 'auto' }}>
            With thousands of products across multiple categories, we help entrepreneurs build successful Amazon FBA businesses
            by offering verified suppliers, transparent pricing, and detailed profit calculations.
          </Typography>
        </Box>

        {/* ── Features ── */}
        <Grid container spacing={3} sx={{ mb: 8 }}>
          {features.map(f => (
            <Grid item xs={12} sm={6} md={3} key={f.title}>
              <FeatureCard {...f} />
            </Grid>
          ))}
        </Grid>

        {/* ── Get In Touch ── */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Chip label="Contact Us" sx={{ mb: 2, background: '#66 7eea15', color: '#667eea', fontWeight: 700, border: '1px solid #667eea30' }} />
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#1f2937', fontSize: { xs: '1.8rem', md: '2.4rem' } }}>
              Get In Touch
            </Typography>
            <Typography variant="body1" sx={{ color: '#6b7280', mt: 1 }}>
              We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </Typography>
          </Box>

          <Grid container spacing={4}>

            {/* ── Left: Contact info ── */}
            <Grid item xs={12} md={5}>
              <Card elevation={0} sx={{ borderRadius: 4, background: 'linear-gradient(135deg, #232f3e 0%, #1a252f 100%)', height: '100%', p: { xs: 3, md: 4 } }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mb: 3 }}>Contact Information</Typography>

                <InfoRow icon="📧" label="Email"     href="mailto:poundlandwholesale@gmail.com" value="poundlandwholesale@gmail.com" />
                <InfoRow icon="📱" label="Phone"     href="tel:+923044928000"  value="+92 304 4928000" />
                <InfoRow icon="📱" label="Phone"     href="tel:+923034928000"  value="+92 303 4928000" />
                <InfoRow icon="💬" label="WhatsApp"  href={`https://wa.me/${WA}`} value="+92 304 4928000" />
                <InfoRow icon="📍" label="Location"  value="London, United Kingdom" />

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', my: 3 }} />

                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, mb: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Follow Us
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  {socials.map(s => (
                    <Box key={s.href} component="a" href={s.href} target="_blank" rel="noopener noreferrer"
                      title={s.label}
                      sx={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '1rem', transition: 'all 0.2s', '&:hover': { background: s.color, color: '#fff', transform: 'translateY(-3px)', boxShadow: `0 4px 12px ${s.color}60` } }}>
                      <i className={s.icon} />
                    </Box>
                  ))}
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', my: 3 }} />

                {/* Map */}
                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Find Us
                </Typography>
                <Box sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', height: 200 }}>
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3619.2!2d67.0!3d24.86!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDUxJzM2LjAiTiA2N8KwMDAnMDAuMCJF!5e0!3m2!1sen!2s!4v1234567890"
                    width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade" title="Location map"
                  />
                </Box>
              </Card>
            </Grid>

            {/* ── Right: Form ── */}
            <Grid item xs={12} md={7}>
              <Card elevation={2} sx={{ borderRadius: 4, height: '100%' }}>
                <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, color: '#1f2937' }}>Send us a Message</Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>
                    Fill in the form below and we'll get back to you via WhatsApp.
                  </Typography>

                  {sent && (
                    <Box sx={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 2, p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '1.2rem' }}>✅</Typography>
                      <Typography variant="body2" sx={{ color: '#065f46', fontWeight: 600 }}>
                        WhatsApp opened with your message! We'll respond shortly.
                      </Typography>
                    </Box>
                  )}

                  <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          name="name" label="Your Name" value={form.name}
                          onChange={handleChange} required fullWidth
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          name="email" label="Your Email" type="email" value={form.email}
                          onChange={handleChange} required fullWidth
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      </Grid>
                    </Grid>

                    <TextField
                      name="subject" label="Subject" value={form.subject}
                      onChange={handleChange} required fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />

                    <TextField
                      name="message" label="Your Message" value={form.message}
                      onChange={handleChange} required fullWidth multiline rows={6}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />

                    <Button
                      type="submit" variant="contained" size="large" disabled={sending}
                      sx={{
                        background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
                        '&:hover': { filter: 'brightness(0.92)' },
                        borderRadius: 2, fontWeight: 700, py: 1.6, fontSize: '1rem',
                        boxShadow: '0 4px 14px rgba(37,211,102,0.35)',
                      }}
                    >
                      <i className="fab fa-whatsapp" style={{ marginRight: 10, fontSize: '1.2rem' }} />
                      {sending ? 'Opening WhatsApp...' : 'Send via WhatsApp'}
                    </Button>

                    <Typography variant="caption" sx={{ color: '#9ca3af', textAlign: 'center' }}>
                      Clicking "Send" opens WhatsApp with your message pre-filled to our team
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* ── Back to home ── */}
        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Button component={Link} to="/" variant="outlined"
            sx={{ borderColor: '#f46709', color: '#f46709', borderRadius: 2, fontWeight: 700, px: 5, py: 1.2, '&:hover': { background: '#f4670910', borderColor: '#f46709' } }}>
            ← Back to Home
          </Button>
        </Box>
      </Container>
      <ScrollToTop />
    </Box>
  );
};

export default AboutUs;
