import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import ScrollToTop from '../../components/ScrollToTop';

const POTENTIAL = {
  starter:     { monthly: 1200,  annual: 2500  },
  growing:     { monthly: 3800,  annual: 8500  },
  established: { monthly: 12000, annual: 25000 },
  enterprise:  { monthly: 35000, annual: 75000 },
};

const OptionCard = ({ selected, onClick, color, children }) => (
  <Card variant="outlined" onClick={onClick} sx={{
    cursor: 'pointer', height: '100%', transition: 'all 0.2s',
    borderColor: selected ? color : '#e5e7eb',
    borderWidth: selected ? 2 : 1,
    background: selected ? `${color}10` : '#fff',
    '&:hover': { borderColor: color, background: `${color}08`, transform: 'translateY(-2px)', boxShadow: 2 },
  }}>
    <CardContent sx={{ p: 1.5, textAlign: 'center', '&:last-child': { pb: 1.5 } }}>
      {children}
    </CardContent>
  </Card>
);

const JoinNow = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState('buyer');
  const [assessment, setAssessment] = useState({ experience: '', monthlyVolume: '', challenges: [] });

  const handleTypeSelect = type => {
    navigate(type === 'buyer' ? '/register/buyer' : '/register/supplier');
  };

  const toggleChallenge = c => setAssessment(p => ({
    ...p,
    challenges: p.challenges.includes(c) ? p.challenges.filter(x => x !== c) : [...p.challenges, c],
  }));

  const pot = POTENTIAL[assessment.monthlyVolume] || POTENTIAL.starter;

  const PATHS = [
    {
      type: 'buyer', icon: '🛒', color: '#667eea', gradient: 'linear-gradient(135deg,#667eea,#764ba2)',
      title: 'I Want to Buy Products',
      desc: "Source products from verified suppliers for your Amazon FBA or retail store.",
      stats: [['500+','Suppliers'],['250%','Avg Markup'],['3 Days','Response']],
      btn: 'Start as Buyer',
      perks: ['Access 10,000+ products','Profit calculator included','Direct supplier contact'],
    },
    {
      type: 'supplier', icon: '🏪', color: '#10b981', gradient: 'linear-gradient(135deg,#10b981,#059669)',
      title: 'I Want to Sell Products',
      desc: "Connect with Amazon sellers and retailers worldwide. List for free.",
      stats: [['2000+','Buyers'],['Global','Reach'],['Free','Listing']],
      btn: 'Start as Supplier',
      perks: ['Free product listing','Global buyer network','Secure payments'],
    },
  ];

  const EXP = [
    { v:'beginner',     l:'Just Starting',    d:'New to wholesale',   icon:'🌱' },
    { v:'intermediate', l:'Some Experience',   d:'6 months – 2 years', icon:'📈' },
    { v:'advanced',     l:'Experienced',       d:'2+ years',           icon:'🏆' },
  ];

  const VOL = [
    { v:'starter',     l:'$1K – $5K',   d:'Testing the market' },
    { v:'growing',     l:'$5K – $20K',  d:'Scaling up'         },
    { v:'established', l:'$20K – $50K', d:'Established seller' },
    { v:'enterprise',  l:'$50K+',       d:'Enterprise level'   },
  ];

  const CHALLENGES = [
    'Finding reliable suppliers','Getting competitive prices',
    'Quality assurance','Fast shipping times',
    'Communication barriers','Minimum order quantities',
  ];

  const BENEFITS = [
    { icon:'🔍', title:'Verified Suppliers',   desc:'Every supplier is vetted and quality-checked before listing.' },
    { icon:'💰', title:'Profit Calculator',    desc:'See your potential profit before placing any order.' },
    { icon:'🌍', title:'Global Reach',         desc:'Connect with buyers and sellers from 50+ countries.' },
    { icon:'🛡️', title:'Secure Transactions', desc:'All payments and data are protected with SSL encryption.' },
  ];

  return (
    <Box sx={{ background: 'linear-gradient(180deg,#f0f4ff 0%,#f8f9fa 100%)', minHeight: '100vh' }}>

      {/* Hero banner */}
      <Box sx={{ background: 'linear-gradient(135deg,#232f3e 0%,#1a252f 100%)', py: { xs: 4, md: 6 }, textAlign: 'center', color: '#fff', borderBottom: '3px solid #ff9900' }}>
        <Container maxWidth="md">
          <Chip label="🚀 Join 2,000+ Successful Traders" sx={{ mb: 2, background: 'rgba(255,153,0,0.25)', color: '#ffb84d', fontWeight: 700, border: '1px solid rgba(255,153,0,0.5)', fontSize: '0.85rem' }} />
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 1.5, fontSize: { xs: '1.8rem', md: '2.6rem' }, color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            Start Your Wholesale Journey
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 400, maxWidth: 560, mx: 'auto', lineHeight: 1.6 }}>
            Connect with verified suppliers and buyers on the UK's leading wholesale marketplace
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>

        {/* Progress bar */}
        <Box sx={{ maxWidth: 520, mx: 'auto', mb: 5 }}>
          <LinearProgress variant="determinate" value={(step / 3) * 100}
            sx={{ height: 8, borderRadius: 4, mb: 1.5, background: '#e5e7eb', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#667eea,#764ba2)', borderRadius: 4 } }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            {['Choose Path','Assessment','Your Potential'].map((label, i) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Avatar sx={{ width: 22, height: 22, fontSize: '0.7rem', fontWeight: 800, background: step > i ? '#667eea' : step === i + 1 ? '#667eea' : '#d1d5db', color: '#fff' }}>
                  {step > i + 1 ? '✓' : i + 1}
                </Avatar>
                <Typography variant="caption" sx={{ fontWeight: step >= i + 1 ? 700 : 400, color: step >= i + 1 ? '#667eea' : '#9ca3af', display: { xs: 'none', sm: 'block' } }}>
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* ── STEP 1: Choose path ── */}
        {step === 1 && (
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, textAlign: 'center', mb: 1 }}>
              How do you want to use PoundlandWholesale?
            </Typography>
            <Typography variant="body1" sx={{ textAlign: 'center', color: '#6b7280', mb: 5 }}>
              Choose your role to get a personalised experience
            </Typography>

            <Grid container spacing={4} justifyContent="center">
              {PATHS.map(p => (
                <Grid item xs={12} sm={6} key={p.type}>
                  <Card elevation={0} sx={{
                    borderRadius: 4, border: '2px solid #e5e7eb', height: '100%',
                    transition: 'all 0.3s', cursor: 'pointer',
                    '&:hover': { borderColor: p.color, transform: 'translateY(-6px)', boxShadow: `0 16px 40px ${p.color}30` },
                  }} onClick={() => handleTypeSelect(p.type)}>
                    <CardContent sx={{ p: 0 }}>
                      {/* Gradient header */}
                      <Box sx={{ background: p.gradient, p: 3, textAlign: 'center', borderRadius: '14px 14px 0 0' }}>
                        <Typography sx={{ fontSize: '3rem', mb: 1, lineHeight: 1 }}>{p.icon}</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', mb: 0.5, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{p.title}</Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>{p.desc}</Typography>
                      </Box>

                      <Box sx={{ p: 3 }}>
                        {/* Stats */}
                        <Grid container spacing={1} sx={{ mb: 3 }}>
                          {p.stats.map(([val, label]) => (
                            <Grid item xs={4} key={label} sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" sx={{ fontWeight: 800, color: p.color }}>{val}</Typography>
                              <Typography variant="caption" sx={{ color: '#9ca3af' }}>{label}</Typography>
                            </Grid>
                          ))}
                        </Grid>

                        <Divider sx={{ mb: 2 }} />

                        {/* Perks */}
                        <Box sx={{ mb: 3 }}>
                          {p.perks.map(perk => (
                            <Box key={perk} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
                              <Box sx={{ width: 18, height: 18, borderRadius: '50%', background: `${p.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: p.color, fontWeight: 800 }}>✓</Box>
                              <Typography variant="body2" sx={{ color: '#374151' }}>{perk}</Typography>
                            </Box>
                          ))}
                        </Box>

                        <Button variant="contained" fullWidth size="large"
                          sx={{ background: p.gradient, borderRadius: 2, fontWeight: 700, py: 1.2, boxShadow: `0 4px 14px ${p.color}40`, '&:hover': { filter: 'brightness(0.92)' } }}>
                          {p.btn} →
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Benefits strip */}
            <Box sx={{ mt: 6 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center', mb: 3 }}>Why Join PoundlandWholesale?</Typography>
              <Grid container spacing={2}>
                {BENEFITS.map(b => (
                  <Grid item xs={12} sm={6} md={3} key={b.title}>
                    <Card elevation={1} sx={{ borderRadius: 3, textAlign: 'center', p: 2, height: '100%' }}>
                      <Typography sx={{ fontSize: '2rem', mb: 1 }}>{b.icon}</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>{b.title}</Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280', lineHeight: 1.6 }}>{b.desc}</Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        )}

        {/* ── STEP 2: Assessment ── */}
        {step === 2 && (
          <Box sx={{ maxWidth: 680, mx: 'auto' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, textAlign: 'center', mb: 1 }}>Tell Us About Your Business</Typography>
            <Typography variant="body1" sx={{ textAlign: 'center', color: '#6b7280', mb: 4 }}>Help us personalise your experience and show your potential</Typography>

            <Card elevation={2} sx={{ borderRadius: 4, p: { xs: 2.5, md: 4 } }}>
              {/* Experience */}
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>What's your experience level?</Typography>
              <Grid container spacing={1.5} sx={{ mb: 4 }}>
                {EXP.map(o => (
                  <Grid item xs={4} key={o.v}>
                    <OptionCard selected={assessment.experience === o.v} onClick={() => setAssessment(p => ({ ...p, experience: o.v }))} color="#667eea">
                      <Typography sx={{ fontSize: '1.5rem', mb: 0.5 }}>{o.icon}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{o.l}</Typography>
                      <Typography variant="caption" sx={{ color: '#9ca3af' }}>{o.d}</Typography>
                    </OptionCard>
                  </Grid>
                ))}
              </Grid>

              {/* Volume */}
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Monthly volume target</Typography>
              <Grid container spacing={1.5} sx={{ mb: 4 }}>
                {VOL.map(o => (
                  <Grid item xs={6} key={o.v}>
                    <OptionCard selected={assessment.monthlyVolume === o.v} onClick={() => setAssessment(p => ({ ...p, monthlyVolume: o.v }))} color="#10b981">
                      <Typography variant="body1" sx={{ fontWeight: 800, color: '#10b981' }}>{o.l}</Typography>
                      <Typography variant="caption" sx={{ color: '#9ca3af' }}>{o.d}</Typography>
                    </OptionCard>
                  </Grid>
                ))}
              </Grid>

              {/* Challenges */}
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Main challenges (select all that apply)</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 4 }}>
                {CHALLENGES.map(c => (
                  <Chip key={c} label={c} onClick={() => toggleChallenge(c)} clickable
                    variant={assessment.challenges.includes(c) ? 'filled' : 'outlined'}
                    sx={{
                      borderColor: '#f59e0b',
                      background: assessment.challenges.includes(c) ? '#f59e0b' : 'transparent',
                      color: assessment.challenges.includes(c) ? '#fff' : '#374151',
                      fontWeight: 600, fontSize: '0.8rem',
                      '&:hover': { background: assessment.challenges.includes(c) ? '#e08e00' : '#fff7ed' },
                    }} />
                ))}
              </Box>

              <Button variant="contained" fullWidth size="large"
                disabled={!assessment.experience || !assessment.monthlyVolume}
                onClick={() => setStep(3)}
                sx={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: 2, fontWeight: 700, py: 1.5, fontSize: '1rem', '&:hover': { filter: 'brightness(0.92)' } }}>
                Show My Potential →
              </Button>
            </Card>
          </Box>
        )}

        {/* ── STEP 3: Potential ── */}
        {step === 3 && (
          <Box sx={{ maxWidth: 700, mx: 'auto' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, textAlign: 'center', mb: 1 }}>Your Business Potential 🎯</Typography>
            <Typography variant="body1" sx={{ textAlign: 'center', color: '#6b7280', mb: 4 }}>Based on your profile and our platform data</Typography>

            {/* Earnings */}
            <Card elevation={4} sx={{ borderRadius: 4, background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', color: '#fff', mb: 4 }}>
              <CardContent sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, opacity: 0.9 }}>Estimated Earning Potential</Typography>
                <Grid container spacing={3}>
                  <Grid item xs={6}>
                    <Box sx={{ background: 'rgba(255,255,255,0.15)', borderRadius: 3, py: 2.5 }}>
                      <Typography variant="h3" sx={{ fontWeight: 800 }}>${pot.monthly.toLocaleString()}</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>Monthly Potential</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ background: 'rgba(255,255,255,0.15)', borderRadius: 3, py: 2.5 }}>
                      <Typography variant="h3" sx={{ fontWeight: 800 }}>${pot.annual.toLocaleString()}</Typography>
                      <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>Annual Potential</Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Typography variant="caption" sx={{ opacity: 0.65, mt: 2.5, display: 'block' }}>
                  *Based on average performance of similar profiles on our platform
                </Typography>
              </CardContent>
            </Card>

            {/* Benefits */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {BENEFITS.map(b => (
                <Grid item xs={12} sm={6} key={b.title}>
                  <Card elevation={1} sx={{ borderRadius: 3, p: 2, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Typography sx={{ fontSize: '1.8rem', lineHeight: 1 }}>{b.icon}</Typography>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.3 }}>{b.title}</Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280', lineHeight: 1.6 }}>{b.desc}</Typography>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* CTA */}
            <Card elevation={2} sx={{ borderRadius: 4, p: { xs: 3, md: 4 }, textAlign: 'center', background: '#f0f4ff', border: '1px solid #c7d2fe' }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Ready to get started?</Typography>
              <Typography variant="body2" sx={{ color: '#6b7280', mb: 3 }}>Join thousands of successful traders on PoundlandWholesale</Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button component={Link} to="/register/buyer" variant="contained" size="large"
                  sx={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: 2, fontWeight: 700, px: 4, '&:hover': { filter: 'brightness(0.92)' } }}>
                  🚀 Get Started Now
                </Button>
                <Button variant="outlined" size="large" onClick={() => setStep(1)}
                  sx={{ borderColor: '#9ca3af', color: '#6b7280', borderRadius: 2, fontWeight: 700, px: 3 }}>
                  ← Start Over
                </Button>
              </Box>
              <Typography variant="caption" sx={{ display: 'block', color: '#9ca3af', mt: 2 }}>
                🔒 100% Free to join · No hidden fees · Cancel anytime
              </Typography>
            </Card>
          </Box>
        )}

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button component={Link} to="/" variant="text" sx={{ color: '#9ca3af', fontWeight: 600 }}>
            ← Back to Home
          </Button>
        </Box>
      </Container>
      <ScrollToTop />
    </Box>
  );
};

export default JoinNow;
