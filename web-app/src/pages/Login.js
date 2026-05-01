import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Container, Box, TextField, Button, Typography, Paper,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, InputAdornment, Divider, Grid,
  Card, CardContent, Chip, Avatar,
  Drawer, List, ListItemButton, ListItemText
} from '@mui/material';
import {
  Visibility, VisibilityOff, Security as SecurityIcon,
  Email as EmailIcon, Key as KeyIcon,
  AdminPanelSettings as AdminIcon, Home as HomeIcon,
  ArrowBack as ArrowBackIcon, Shield as ShieldIcon,
  Map as MapIcon, AccessTime as TimeIcon,
  Facebook as FacebookIcon, Instagram as InstagramIcon,
  YouTube as YouTubeIcon, LinkedIn as LinkedInIcon,
  Phone as PhoneIcon, LocationOn as LocationIcon,
  Star as StarIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  dark: '#0a0a0a',
  primary: '#1a1a2e',
  light: '#16213e',
  accent: '#e94560',
  bg: '#0f0f0f',
  glass: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
};

const API_URL = process.env.REACT_APP_API_URL || '[vims-backend.onrender.com](https://vims-backend.onrender.com/api)';

const noRedErrorFieldSx = {
  '& .MuiFormLabel-root': { color: 'rgba(255, 255, 255, 0.5)' },
  '& .MuiFormLabel-root.Mui-focused': { color: T.accent },
  '& .MuiFormLabel-root.Mui-error': { color: 'rgba(255, 255, 255, 0.5)' },
  '& .MuiFormHelperText-root.Mui-error': { color: 'rgba(255, 255, 255, 0.4)' },
  '& .MuiOutlinedInput-root': {
    color: '#fff',
    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
    '&.Mui-focused fieldset': { borderColor: T.accent },
  },
  '& .MuiOutlinedInput-root.Mui-error fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' },
  '& .MuiOutlinedInput-root.Mui-error:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.25)' },
  '& .MuiOutlinedInput-root.Mui-error.Mui-focused fieldset': { borderColor: T.accent },
  '& .MuiInputAdornment-root .MuiSvgIcon-root': { color: 'rgba(255, 255, 255, 0.4)' },
};

const ROLES = [
  { key: 'admin', label: 'ADMIN', description: 'Manages the system, resident records, and community information.', icon: <AdminIcon sx={{ fontSize: 40, color: T.accent }} />, bgImage: '[images.unsplash.com](https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80)' },
  { key: 'resident', label: 'RESIDENT', description: 'Access personal information, community updates, and services.', icon: <HomeIcon sx={{ fontSize: 40, color: T.accent }} />, bgImage: '[images.unsplash.com](https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80)' },
  { key: 'security', label: 'SECURITY', description: 'Monitors entries and helps keep the community safe.', icon: <ShieldIcon sx={{ fontSize: 40, color: T.accent }} />, bgImage: '[images.unsplash.com](https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80)' },
];

// ─── SHARED BACK BUTTON ───────────────────────────────────────────────────────
const BackBtn = ({ onClose }) => (
  <Button startIcon={<ArrowBackIcon />} onClick={onClose}
    sx={{ position: 'absolute', top: 20, left: 20, zIndex: 10, color: 'white', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 2, textTransform: 'none', '&:hover': { backgroundColor: 'rgba(0,0,0,0.5)' } }}>
    Back to Home
  </Button>
);

// ─── SHARED HERO ──────────────────────────────────────────────────────────────
const PageHero = ({ title, subtitle, onClose }) => (
  <Box sx={{ position: 'relative', height: { xs: 260, md: 360 }, backgroundImage: 'url([images.unsplash.com](https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=1400&q=80)', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', '&::after': { content: '""', position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(20,50,5,0.65) 0%, rgba(20,50,5,0.80) 100%)' } }}>
    <BackBtn onClose={onClose} />
    <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center', px: 3 }}>
      <Typography sx={{ fontSize: { xs: '2rem', md: '3rem' }, fontWeight: 900, color: 'white', textTransform: 'uppercase', lineHeight: 1.1, textShadow: '0 2px 20px rgba(0,0,0,0.5)', mb: 1.5 }}>{title}</Typography>
      {subtitle && <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: { xs: '0.85rem', md: '1rem' }, maxWidth: 600, mx: 'auto', lineHeight: 1.7 }}>{subtitle}</Typography>}
    </Box>
  </Box>
);

// ─── SHARED FOOTER ────────────────────────────────────────────────────────────
const PageFooter = () => (
  <Box sx={{ backgroundColor: '#0f5a2a', py: { xs: 4, md: 6 }, px: { xs: 3, md: 8 } }}>
    <Grid container spacing={4}>
      {[
        { title: 'About Westville', links: ['Brand History', 'Vision & Mission', 'Core Values', 'Community News'] },
        { title: 'Resident Services', links: ['Service Requests', 'Visitor Management', 'Announcements', 'Pay Dues'] },
        { title: "Homebuyer's Guide", links: ['Available Lots', 'House Models', 'Virtual Tour', 'Book Appointment'] },
        { title: 'Support', links: ['Contact Us', 'FAQs', 'Security Office', 'Emergency Hotline'] },
      ].map((col) => (
        <Grid item xs={6} md={3} key={col.title}>
          <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.85rem', mb: 1.5 }}>{col.title}</Typography>
          {col.links.map((l) => <Typography key={l} sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', mb: 0.8, cursor: 'pointer', '&:hover': { color: '#7CDB6B' } }}>{l}</Typography>)}
        </Grid>
      ))}
    </Grid>
    <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
      <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>© {new Date().getFullYear()} Westville Casimiro Homes. All rights reserved.</Typography>
      <Box sx={{ display: 'flex', gap: 3 }}>
        {['Privacy Policy', 'Terms and Conditions', 'Sitemap'].map((i) => <Typography key={i} sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', cursor: 'pointer', '&:hover': { color: 'white' } }}>{i}</Typography>)}
      </Box>
    </Box>
  </Box>
);

// ─── SCROLL REVEAL ─────────────────────────────────────────────────────────────
const Reveal = ({ children, sx = {}, delayMs = 0 }) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      ref={ref}
      sx={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0px)' : 'translateY(16px)',
        transition: `opacity 700ms ease ${delayMs}ms, transform 700ms ease ${delayMs}ms`,
        willChange: 'opacity, transform',
        ...sx
      }}
    >
      {children}
    </Box>
  );
};

const MiniCalendar = ({ currentDate, onPrevMonth, onNextMonth, compact = false, showFooter = false, onClose }) => {
  const yr = currentDate.getFullYear();
  const mo = currentDate.getMonth();
  const first = new Date(yr, mo, 1).getDay();
  const days = new Date(yr, mo + 1, 0).getDate();
  const td = new Date();

  const cells = [];
  for (let i = 0; i < first; i++) cells.push(<Box key={`e${i}`} />);
  for (let d = 1; d <= days; d++) {
    const isT = d === td.getDate() && mo === td.getMonth() && yr === td.getFullYear();
    cells.push(
      <Box
        key={d}
        sx={{
          textAlign: 'center',
          py: compact ? '5px' : '8px',
          borderRadius: '50%',
          backgroundColor: isT ? '#0f5a2a' : 'transparent',
          color: isT ? 'white' : '#333',
          fontSize: compact ? '0.78rem' : '0.85rem',
          fontWeight: isT ? (compact ? 700 : 800) : (compact ? 400 : 500),
          cursor: compact ? 'pointer' : 'default',
          '&:hover': { backgroundColor: isT ? '#0b3d1f' : '#e8f5e9' },
        }}
      >
        {d}
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <IconButton size="small" onClick={onPrevMonth}>
          <ArrowBackIcon fontSize="small" sx={{ color: '#0f5a2a' }} />
        </IconButton>
        <Typography sx={{ fontWeight: compact ? 700 : 800, color: '#0f5a2a', fontSize: compact ? '0.9rem' : '1rem' }}>
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Typography>
        <IconButton size="small" onClick={onNextMonth}>
          <ArrowBackIcon fontSize="small" sx={{ color: '#0f5a2a', transform: 'rotate(180deg)' }} />
        </IconButton>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <Typography key={d} sx={{ textAlign: 'center', fontSize: compact ? '0.68rem' : '0.72rem', fontWeight: compact ? 700 : 800, color: '#888' }}>{d}</Typography>
        ))}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {cells}
      </Box>
      {showFooter && (
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: '0.72rem', color: '#888' }}>
            Today: {new Date().toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Typography>
          <Button size="small" onClick={onClose} sx={{ color: '#0f5a2a', fontSize: '0.72rem', textTransform: 'none', fontWeight: 600 }}>Close</Button>
        </Box>
      )}
    </Box>
  );
};

const ANNOUNCEMENTS = [
  { id: 1, category: 'Security', date: 'March 10, 2026', title: 'Enhanced Gate Security Protocol Starting April 2026', body: 'Effective April 1, 2026, all visitors must present a valid government-issued ID and be registered in our VIMS visitor portal before entry. Homeowners are requested to pre-register expected visitors through the resident portal. QR code stickers will also be distributed for faster vehicle entry.', color: '#ef4444' },
  { id: 2, category: 'Maintenance', date: 'March 8, 2026', title: 'Scheduled Water Service Interruption – March 15, 2026', body: 'Water service will be temporarily interrupted on March 15, 2026 from 8:00 AM to 5:00 PM due to scheduled maintenance of the main water line on Casimiro Street. All residents are advised to store sufficient water. We apologize for the inconvenience.', color: '#f59e0b' },
  { id: 3, category: 'Community', date: 'March 5, 2026', title: 'Westville Clean-Up Drive – March 22, 2026', body: 'Join us for our quarterly community clean-up drive on March 22, 2026 at 7:00 AM. Meet at the main clubhouse. Gloves, garbage bags, and refreshments will be provided. All residents and their families are encouraged to participate. Let us keep our community clean and beautiful!', color: '#2f8f46' },
  { id: 4, category: 'HOA', date: 'February 28, 2026', title: 'HOA General Assembly – April 5, 2026', body: 'The Homeowners Association General Assembly will be held on April 5, 2026 at 3:00 PM at the Westville Clubhouse. Topics include annual financial report, proposed community improvements, and election of new board members. All homeowners are strongly encouraged to attend.', color: '#3b82f6' },
  { id: 5, category: 'Event', date: 'February 20, 2026', title: 'Westville Summer Sports Fest – April 12–13, 2026', body: 'Get ready for our annual Summer Sports Fest! Events include basketball, volleyball, badminton, and swimming competitions. Registration is open from March 1–31, 2026. Contact the HOA office or message our official Facebook page to register your team. Prizes await the winners!', color: '#8b5cf6' },
  { id: 6, category: 'Advisory', date: 'February 15, 2026', title: 'Reminder: No Loud Noise After 10:00 PM', body: 'As a reminder to all residents, the community noise ordinance prohibits loud music, parties, and other disruptive activities after 10:00 PM on weekdays and 11:00 PM on weekends. Violations may result in fines as stipulated in the Deed of Restrictions. Thank you for your cooperation.', color: '#64748b' },
];

const OFFICIALS = [
  { name: 'Eduardo M. Santos', position: 'HOA President', description: 'Leads the Homeowners Association in promoting community welfare, overseeing governance, and representing residents in all official matters.', avatar: 'ES' },
  { name: 'Maria Luisa R. Cruz', position: 'HOA Vice President', description: 'Assists the HOA President and oversees community programs, including environmental projects and resident welfare initiatives.', avatar: 'MC' },
  { name: 'Jose Antonio B. Reyes', position: 'HOA Secretary', description: 'Manages official correspondence, maintains community records, and handles documentation for all HOA meetings and resolutions.', avatar: 'JR' },
  { name: 'Cynthia L. Flores', position: 'HOA Treasurer', description: 'Oversees the collection of HOA dues, manages community funds, and prepares financial reports for the general assembly.', avatar: 'CF' },
  { name: 'Roberto D. Mercado', position: 'Security Committee Head', description: 'Coordinates all security operations including guard schedules, CCTV monitoring, visitor management, and emergency response.', avatar: 'RM' },
  { name: 'Angelica P. Torres', position: 'Facilities & Maintenance Head', description: 'Oversees maintenance of community facilities, roads, drainage, landscaping, and common areas within the village.', avatar: 'AT' },
  { name: 'Dennis F. Garcia', position: 'Community Relations Officer', description: 'Handles resident concerns, mediates disputes, and organizes community events and programs to strengthen neighborly bonds.', avatar: 'DG' },
  { name: 'Patricia V. Lim', position: 'IT & Systems Coordinator', description: 'Manages the Village Information Management System (VIMS), resident portal, and all digital infrastructure of the community.', avatar: 'PL' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: CONTACT
// ═══════════════════════════════════════════════════════════════════════════════
const ContactPage = ({ onClose }) => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.subject.trim()) e.subject = 'Subject is required';
    if (!form.message.trim()) e.message = 'Message is required';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSent(true);
  };

  const contactFieldSx = {
    '& .MuiFormLabel-root.Mui-error': { color: '#475569' },
    '& .MuiFormHelperText-root.Mui-error': { color: '#64748b' },
    '& .MuiOutlinedInput-root.Mui-error fieldset': { borderColor: 'rgba(15, 23, 42, 0.24)' },
    '& .MuiOutlinedInput-root.Mui-error:hover fieldset': { borderColor: 'rgba(15, 23, 42, 0.35)' },
    '& .MuiOutlinedInput-root.Mui-error.Mui-focused fieldset': { borderColor: '#0f5a2a' },
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f9f9f9' }}>
      <PageHero title="Contact Us" subtitle="Have a question, concern, or suggestion? We'd love to hear from you. Reach out to the Westville Casimiro Homes administration." onClose={onClose} />

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        <Grid container spacing={5}>

          {/* Contact Info */}
          <Grid item xs={12} md={5}>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f5a2a', mb: 3 }}>Get in Touch</Typography>
            {[
              { icon: <LocationIcon sx={{ color: '#0f5a2a' }} />, label: 'Address', value: 'Westville Casimiro Homes, Casimiro Avenue, Paranaque City, Metro Manila, Philippines' },
              { icon: <PhoneIcon sx={{ color: '#0f5a2a' }} />, label: 'Phone', value: '+63 (02) 8123-4567\n+63 917 123 4567 (Mobile)' },
              { icon: <EmailIcon sx={{ color: '#0f5a2a' }} />, label: 'Email', value: 'admin@westvillecasimiro.com\nsecurity@westvillecasimiro.com' },
              { icon: <TimeIcon sx={{ color: '#0f5a2a' }} />, label: 'Office Hours', value: 'Monday – Friday: 8:00 AM – 5:00 PM\nSaturday: 8:00 AM – 12:00 PM' },
            ].map((item) => (
              <Box key={item.label} sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 2, backgroundColor: '#f6faf7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid rgba(45,80,22,0.15)` }}>
                  {item.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem', mb: 0.3 }}>{item.label}</Typography>
                  <Typography sx={{ color: '#555', fontSize: '0.82rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{item.value}</Typography>
                </Box>
              </Box>
            ))}

            <Box sx={{ mt: 3, p: 3, backgroundColor: '#0f5a2a', borderRadius: 3 }}>
              <Typography sx={{ color: 'white', fontWeight: 700, mb: 1 }}>Emergency Hotline</Typography>
              <Typography sx={{ color: '#7CDB6B', fontSize: '1.4rem', fontWeight: 900 }}>+63 917 911 0000</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', mt: 0.5 }}>Available 24/7 for security emergencies</Typography>
            </Box>

            <Box sx={{ mt: 3, display: 'flex', gap: 1.5 }}>
              {[<FacebookIcon />, <InstagramIcon />, <YouTubeIcon />, <LinkedInIcon />].map((icon, i) => (
                <Box key={i} sx={{ width: 40, height: 40, borderRadius: 2, backgroundColor: '#0f5a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', '&:hover': { backgroundColor: '#0b3d1f' } }}>
                  {icon}
                </Box>
              ))}
            </Box>
          </Grid>

          {/* Contact Form */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
              {sent ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Box sx={{ width: 72, height: 72, borderRadius: '50%', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                    <StarIcon sx={{ color: '#10b981', fontSize: 36 }} />
                  </Box>
                  <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f5a2a', mb: 1 }}>Message Sent!</Typography>
                  <Typography sx={{ color: '#666', mb: 3 }}>Thank you for reaching out. Our team will get back to you within 1–2 business days.</Typography>
                  <Button variant="contained" onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                    sx={{ backgroundColor: '#0f5a2a', borderRadius: 2, textTransform: 'none' }}>Send Another Message</Button>
                </Box>
              ) : (
                <>
                  <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f5a2a', mb: 0.5 }}>Send Us a Message</Typography>
                  <Typography sx={{ color: '#888', fontSize: '0.85rem', mb: 3 }}>Fill out the form below and we'll respond as soon as possible.</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField sx={contactFieldSx} fullWidth label="Full Name" value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: '' }); }}
                        error={!!errors.name} helperText={errors.name} InputProps={{ sx: { borderRadius: 2 } }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField sx={contactFieldSx} fullWidth label="Email Address" value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: '' }); }}
                        error={!!errors.email} helperText={errors.email} InputProps={{ sx: { borderRadius: 2 } }} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField sx={contactFieldSx} fullWidth label="Subject" value={form.subject} onChange={e => { setForm({ ...form, subject: e.target.value }); setErrors({ ...errors, subject: '' }); }}
                        error={!!errors.subject} helperText={errors.subject} InputProps={{ sx: { borderRadius: 2 } }} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField sx={contactFieldSx} fullWidth label="Message" multiline rows={5} value={form.message} onChange={e => { setForm({ ...form, message: e.target.value }); setErrors({ ...errors, message: '' }); }}
                        error={!!errors.message} helperText={errors.message} InputProps={{ sx: { borderRadius: 2 } }} />
                    </Grid>
                    <Grid item xs={12}>
                      <Button fullWidth variant="contained" onClick={handleSubmit}
                        sx={{ backgroundColor: '#0f5a2a', py: 1.5, borderRadius: 2, fontWeight: 700, fontSize: '0.95rem', textTransform: 'none', '&:hover': { backgroundColor: '#0b3d1f' }, boxShadow: '0 4px 14px rgba(45,80,22,0.35)' }}>
                        Send Message
                      </Button>
                    </Grid>
                  </Grid>
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
      <PageFooter />
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: ABOUT US
// ═══════════════════════════════════════════════════════════════════════════════
const AboutUsPage = ({ onClose }) => (
  <Box sx={{ minHeight: '100vh', backgroundColor: '#fff' }}>
    <PageHero title="YOUR DREAM LIFE AWAITS IN WESTVILLE HOMES" subtitle="Standing the test of time, Westville has grown from an innovative real estate developer into a strong name in the industry." onClose={onClose} />

    {/* Vision */}
    <Box sx={{ backgroundColor: '#f6faf7', py: { xs: 6, md: 10 } }}>
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box component="img" src="[images.unsplash.com](https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=700&q=80)" alt="Vision" sx={{ width: '100%', borderRadius: 3, boxShadow: '0 12px 40px rgba(0,0,0,0.15)', height: { xs: 260, md: 380 }, objectFit: 'cover' }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: '#0f5a2a', mb: 3, textTransform: 'uppercase' }}>VISION</Typography>
            <Typography sx={{ color: '#333', lineHeight: 1.8, mb: 2 }}>Westville Casimiro Homes is a premier residential community committed to delivering beautifully designed, affordable homes within a safe, well-planned, and sustainable environment in Paranaque City.</Typography>
            <Typography sx={{ color: '#333', lineHeight: 1.8, mb: 2 }}>The Westville life inspires memories created within dream-like homes and moments nurtured in its exclusive amenities. Each home carries the distinct character of its surroundings and lush landscapes.</Typography>
            <Typography sx={{ color: '#333', lineHeight: 1.8 }}>More than places of residence, Westville homes serve as sanctuaries for Filipino families — a convergence of nature's serenity and urban convenience.</Typography>
          </Grid>
        </Grid>
      </Container>
    </Box>

    {/* Mission */}
    <Box sx={{ backgroundColor: '#fff', py: { xs: 6, md: 10 } }}>
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center" direction={{ xs: 'column-reverse', md: 'row' }}>
          <Grid item xs={12} md={6}>
            <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: '#0f5a2a', mb: 3, textTransform: 'uppercase' }}>MISSION</Typography>
            <Typography sx={{ color: '#333', lineHeight: 1.8, mb: 2 }}>For years, we have built quality homes, well-planned communities, and safe living spaces across Paranaque City. These spaces elevate lives and are perfect for families who seek security, comfort, and a sense of belonging.</Typography>
            <Typography sx={{ color: '#333', lineHeight: 1.8, mb: 2 }}>Westville Casimiro Homes is dedicated to providing residents with modern facilities, responsive management, and a thriving community where every member feels valued and heard.</Typography>
            <Typography sx={{ color: '#333', lineHeight: 1.8 }}>We continuously innovate through our Village Information Management System (VIMS), ensuring transparent governance, efficient visitor management, and accessible resident services.</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box component="img" src="[images.unsplash.com](https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=700&q=80)" alt="Mission" sx={{ width: '100%', borderRadius: 3, boxShadow: '0 12px 40px rgba(0,0,0,0.15)', height: { xs: 260, md: 380 }, objectFit: 'cover' }} />
          </Grid>
        </Grid>
      </Container>
    </Box>

    {/* Core Values */}
    <Box sx={{ backgroundColor: '#f6faf7', py: { xs: 6, md: 10 } }}>
      <Container maxWidth="lg">
        <Typography sx={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, color: '#0f5a2a', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 6 }}>OUR CORE VALUES</Typography>
        <Grid container spacing={4}>
          {[
            { title: 'Community', desc: 'We foster a strong sense of belonging, nurturing relationships and building a vibrant, inclusive neighborhood for all residents.', img: '[images.unsplash.com](https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80)' },
            { title: 'Safety & Security', desc: 'We prioritize every resident\'s safety through 24/7 security, controlled access, and vigilant community monitoring.', img: '[images.unsplash.com](https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80)' },
            { title: 'Sustainability', desc: 'We are committed to green living — maintaining clean surroundings, preserving green spaces, and promoting eco-friendly practices.', img: '[images.unsplash.com](https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80)' },
            { title: 'Transparency', desc: 'We uphold honest communication with all homeowners, ensuring fair governance and accessible community information.', img: '[images.unsplash.com](https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80)' },
          ].map((val) => (
            <Grid item xs={12} sm={6} md={3} key={val.title}>
              <Box sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.1)', backgroundColor: 'white', height: '100%', transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-6px)' } }}>
                <Box component="img" src={val.img} alt={val.title} sx={{ width: '100%', height: 180, objectFit: 'cover' }} />
                <Box sx={{ p: 3 }}>
                  <Typography sx={{ fontWeight: 800, color: '#0f5a2a', fontSize: '1.05rem', mb: 1 }}>{val.title}</Typography>
                  <Typography sx={{ color: '#555', fontSize: '0.85rem', lineHeight: 1.6 }}>{val.desc}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>

    {/* Stats */}
    <Box sx={{ backgroundColor: '#0f5a2a', py: { xs: 5, md: 7 } }}>
      <Container maxWidth="lg">
        <Grid container spacing={4} justifyContent="center">
          {[['500+', 'Homeowners'], ['24/7', 'Security Monitoring'], ['10+', 'Years of Service'], ['100%', 'Committed to Excellence']].map(([n, l]) => (
            <Grid item xs={6} md={3} key={l} sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 900, color: '#7CDB6B' }}>{n}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', fontWeight: 600 }}>{l}</Typography>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>

    {/* Social */}
    <Box sx={{ backgroundColor: '#f9f9f9', py: { xs: 5, md: 7 }, textAlign: 'center' }}>
      <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f5a2a', letterSpacing: '0.1em', textTransform: 'uppercase', mb: 3 }}>Catch the Latest on Our Social Media</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        {[<FacebookIcon />, <InstagramIcon />, <YouTubeIcon />, <LinkedInIcon />].map((icon, i) => (
          <Box key={i} sx={{ width: 48, height: 48, borderRadius: 2, backgroundColor: '#0f5a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', '&:hover': { backgroundColor: '#0b3d1f' } }}>{icon}</Box>
        ))}
      </Box>
    </Box>  
    <PageFooter />
  </Box>
);

// ═══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const LandingPage = ({ onRoleSelect, onBrowseLots }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const calendarRef = useRef(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const homeRef = useRef(null);
  const announcementRef = useRef(null);
  const officialsRef = useRef(null);
  const contactRef = useRef(null);
  const aboutRef = useRef(null);
  const calendarSectionRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (calendarRef.current && !calendarRef.current.contains(e.target)) setShowCalendar(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const scrollTo = (ref) => {
    const el = ref?.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const navItem = (label, onClick) => (
    <Typography key={label} onClick={onClick}
      sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', '&:hover': { color: '#7CDB6B' }, transition: 'color 0.2s' }}>
      {label}
    </Typography>
  );

  const handleNavKey = (key) => {
    switch (key) {
      case 'home': scrollTo(homeRef); break;
      case 'announcement': scrollTo(announcementRef); break;
      case 'officials': scrollTo(officialsRef); break;
      case 'contact': scrollTo(contactRef); break;
      case 'about': scrollTo(aboutRef); break;
      case 'calendar': scrollTo(calendarSectionRef); break;
      default: break;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        '@keyframes fadeUpSoft': {
          from: { opacity: 0, transform: 'translateY(14px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '@keyframes fadeIn': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        '@keyframes glowPulse': {
          '0%, 100%': { opacity: 0.42 },
          '50%': { opacity: 0.72 },
        },
        '@keyframes heroZoom': {
          from: { transform: 'scale(1.02)' },
          to: { transform: 'scale(1.10)' },
        },
        '@keyframes floatY': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        '@keyframes cardPop': {
          from: { opacity: 0, transform: 'translateY(12px) scale(0.985)' },
          to: { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*': { animation: 'none !important', transition: 'none !important' },
        },
      }}
    >

      {/* BG */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: { xs: '54%', md: '45%' },
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url([images.unsplash.com](https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=1600&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            filter: 'saturate(1.08) contrast(1.04)',
            animation: 'heroZoom 18s ease-in-out infinite alternate',
            transformOrigin: 'center',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(
              to bottom,
              rgba(11, 61, 31, 0.55) 0%,
              rgba(11, 61, 31, 0.78) 55%,
              rgba(11, 61, 31, 0.92) 88%,
              #0b3d1f 100%
            )`,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 18% 12%, rgba(47, 143, 70, 0.22), transparent 42%),
                         radial-gradient(circle at 82% 18%, rgba(124, 219, 107, 0.18), transparent 44%)`,
            animation: 'glowPulse 7.5s ease-in-out infinite',
          }}
        />
      </Box>

      {/* NAVBAR */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2, md: 5 },
          py: 1.75,
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          bgcolor: 'rgba(11, 61, 31, 0.38)',
          backdropFilter: 'blur(12px)',
          animation: 'fadeUpSoft 0.55s ease',
        }}
      >

        {/* Logo */}
        <Box onClick={() => window.location.reload()} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '14px',
              background: `linear-gradient(135deg, #2f8f46, #0f5a2a)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.22)',
              boxShadow: '0 10px 24px rgba(0,0,0,0.22)',
            }}
          >
            <HomeIcon sx={{ fontSize: 22, color: 'white' }} />
          </Box>
          <Box>
            <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.1 }}>WESTVILLE CASIMIRO</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', letterSpacing: '0.05em' }}>HOMES</Typography>
          </Box>
        </Box>

        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={onBrowseLots}
            sx={{
              borderColor: 'rgba(255,255,255,0.30)',
              color: 'rgba(255,255,255,0.92)',
              borderRadius: 999,
              px: 1.6,
              py: 0.75,
              fontWeight: 700,
              fontSize: '0.72rem',
              textTransform: 'none',
              '&:hover': { borderColor: '#7CDB6B', color: '#7CDB6B', bgcolor: 'rgba(124, 219, 107, 0.12)' },
              '&:active': { transform: 'translateY(1px) scale(0.99)' },
              transition: 'transform 0.15s ease',
            }}
          >
            View Map
          </Button>
          <IconButton
            onClick={() => setMobileNavOpen(true)}
            sx={{
              color: 'white',
              bgcolor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' },
              '&:active': { transform: 'translateY(1px) scale(0.98)' },
              transition: 'transform 0.15s ease',
            }}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        {/* Nav */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3, alignItems: 'center' }}>
          {navItem('HOME', () => scrollTo(homeRef))}
          {navItem('ANNOUNCEMENT', () => scrollTo(announcementRef))}
          {navItem('OFFICIALS', () => scrollTo(officialsRef))}
          {navItem('CONTACT', () => scrollTo(contactRef))}
          {navItem('ABOUT US', () => scrollTo(aboutRef))}

          {/* Calendar */}
          <Box ref={calendarRef} sx={{ position: 'relative' }}>
            <Typography onClick={() => setShowCalendar(!showCalendar)}
              sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', '&:hover': { color: '#7CDB6B' }, transition: 'color 0.2s' }}>
              CALENDAR
            </Typography>

            {showCalendar && (
              <Box sx={{ position: 'absolute', top: '160%', right: 0, width: 280, backgroundColor: 'white', borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', p: 2, zIndex: 999, border: '1px solid rgba(45,80,22,0.15)' }}>
                <MiniCalendar
                  currentDate={currentDate}
                  compact
                  showFooter
                  onClose={() => setShowCalendar(false)}
                  onPrevMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  onNextMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Drawer
        anchor="right"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        PaperProps={{
          sx: {
            width: 320,
            bgcolor: 'rgba(11, 61, 31, 0.92)',
            backdropFilter: 'blur(14px)',
            color: 'white',
            borderLeft: '1px solid rgba(255,255,255,0.12)',
          },
        }}
      >
        <Box sx={{ p: 2.25, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: '0.06em' }}>Menu</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', mt: 0.5 }}>
            Westville Casimiro Homes
          </Typography>
        </Box>
        <List sx={{ p: 1.25 }}>
          {[
            { label: 'Home', key: 'home' },
            { label: 'Announcements', key: 'announcement' },
            { label: 'Officials', key: 'officials' },
            { label: 'Contact', key: 'contact' },
            { label: 'About Us', key: 'about' },
          ].map((i) => (
            <ListItemButton
              key={i.key}
              onClick={() => {
                setMobileNavOpen(false);
                handleNavKey(i.key);
              }}
              sx={{
                borderRadius: 2,
                mb: 0.75,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              <ListItemText
                primary={i.label}
                primaryTypographyProps={{ fontWeight: 700, fontSize: '0.95rem' }}
              />
            </ListItemButton>
          ))}
        </List>
        <Box sx={{ p: 2.25, mt: 'auto', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<MapIcon />}
            onClick={() => {
              setMobileNavOpen(false);
              onBrowseLots();
            }}
            sx={{
              borderColor: 'rgba(255,255,255,0.30)',
              color: 'rgba(255,255,255,0.92)',
              borderRadius: 2.5,
              py: 1.1,
              fontWeight: 800,
              textTransform: 'none',
              '&:hover': { borderColor: '#7CDB6B', color: '#7CDB6B', bgcolor: 'rgba(124, 219, 107, 0.12)' },
              '&:active': { transform: 'translateY(1px) scale(0.99)' },
              transition: 'transform 0.15s ease',
            }}
          >
            Browse Lots
          </Button>
        </Box>
      </Drawer>

      {/* HERO */}
      <Box
        ref={homeRef}
        sx={{
          position: 'relative',
          zIndex: 5,
          px: { xs: 3, md: 6 },
          pt: { xs: 4, md: 6 },
          pb: { xs: 3, md: 2 },
          maxWidth: 760,
          animation: 'fadeUpSoft 0.75s ease',
        }}
      >
        <Typography sx={{ fontSize: { xs: '2.2rem', md: '3.2rem' }, fontWeight: 900, color: 'white', lineHeight: 1.1, textTransform: 'uppercase', textShadow: '0 2px 20px rgba(0,0,0,0.5)', mb: 2 }}>
          YOUR DREAM LIFE AWAITS<br />IN WESTVILLE HOMES
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', mb: 3, maxWidth: 500, lineHeight: 1.6 }}>
          Standing the test of time, Westville has grown from an innovative real estate developer into a strong name in the industry, continuously building quality homes and vibrant communities.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="contained"
            onClick={() => scrollTo(aboutRef)}
            sx={{
              bgcolor: '#7CDB6B',
              color: '#0b3d1f',
              borderRadius: 999,
              px: 2.4,
              py: 1.1,
              fontWeight: 900,
              textTransform: 'none',
              boxShadow: '0 14px 34px rgba(0,0,0,0.28)',
              '&:hover': { bgcolor: '#8CF07B', transform: 'translateY(-1px)' },
              '&:active': { transform: 'translateY(1px) scale(0.99)' },
              transition: 'transform 0.2s ease, background-color 0.2s ease',
            }}
          >
            Read more
          </Button>
          <Button
            variant="outlined"
            onClick={onBrowseLots}
            sx={{
              borderColor: 'rgba(255,255,255,0.40)',
              color: 'rgba(255,255,255,0.92)',
              borderRadius: 999,
              px: 2.2,
              py: 1.05,
              fontWeight: 900,
              textTransform: 'none',
              '&:hover': { borderColor: '#7CDB6B', color: '#7CDB6B', bgcolor: 'rgba(124, 219, 107, 0.12)' },
              '&:active': { transform: 'translateY(1px) scale(0.99)' },
              transition: 'transform 0.15s ease',
            }}
          >
            View map
          </Button>
          <Box
            sx={{
              ml: { xs: 0, md: 1 },
              display: { xs: 'none', md: 'flex' },
              gap: 1.25,
              alignItems: 'center',
              px: 1.5,
              py: 1,
              borderRadius: 999,
              bgcolor: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.14)',
              animation: 'floatY 6s ease-in-out infinite',
            }}
          >
            {[
              { k: '200+', l: 'Total lots' },
              { k: '45', l: 'Active residents' },
              { k: '98%', l: 'Collection rate' },
            ].map((s) => (
              <Box key={s.l} sx={{ minWidth: 98, textAlign: 'center' }}>
                <Typography sx={{ color: 'white', fontWeight: 900, lineHeight: 1, fontSize: '1.05rem' }}>
                  {s.k}
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.70)', fontSize: '0.72rem', fontWeight: 700, mt: 0.25 }}>
                  {s.l}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ROLE CARDS */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 5,
          backgroundColor: '#ffffff',
          mt: 'auto',
          pt: { xs: 5, md: 6 },
          pb: { xs: 5, md: 6 },
          px: { xs: 2, md: 6 },
          boxShadow: '0 -18px 44px rgba(15, 23, 42, 0.06)',
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Box sx={{ textAlign: 'center', mb: 3.5, animation: 'fadeUpSoft 0.8s ease' }}>
            <Typography sx={{ color: '#7CDB6B', fontWeight: 900, fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Community Portal
            </Typography>
            <Typography sx={{ color: '#0f5a2a', fontWeight: 900, fontSize: { xs: '1.35rem', md: '1.65rem' }, mt: 0.8 }}>
              Who are you logging in as?
            </Typography>
            <Typography sx={{ color: 'rgba(15, 23, 42, 0.72)', fontWeight: 600, fontSize: '0.9rem', mt: 0.6 }}>
              Select your role to access your personalized dashboard and community features.
            </Typography>
          </Box>

          <Grid container spacing={3} justifyContent="center">
            {ROLES.map((role) => (
              <Grid item xs={12} sm={4} key={role.key}>
                <Card
                  onClick={() => onRoleSelect(role.key)}
                  sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    backgroundColor: 'white',
                    boxShadow: '0 10px 42px rgba(0,0,0,0.28)',
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                    animation: 'cardPop 0.6s ease both',
                    '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 18px 62px rgba(0,0,0,0.40)' },
                    '&:active': { transform: 'translateY(-4px)' },
                  }}
                >
                  <Box sx={{ height: 160, backgroundImage: `url(${role.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                    <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(2,6,23,0.08), rgba(2,6,23,0.38))' }} />
                    <Box sx={{ position: 'absolute', bottom: -24, left: '50%', transform: 'translateX(-50%)', width: 56, height: 56, borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 24px rgba(0,0,0,0.22)', border: '3px solid #e8f5e9' }}>{role.icon}</Box>
                  </Box>
                  <CardContent sx={{ pt: 5, pb: 3, textAlign: 'center', px: 3 }}>
                    <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f5a2a', letterSpacing: '0.08em', mb: 1 }}>{role.label}</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#555', mb: 2.5, lineHeight: 1.5 }}>{role.description}</Typography>
                    <Button variant="contained" onClick={(e) => { e.stopPropagation(); onRoleSelect(role.key); }}
                    sx={{
                      backgroundColor: '#0f5a2a',
                      color: 'white',
                      borderRadius: 999,
                      px: 3,
                      py: 0.9,
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      textTransform: 'none',
                      boxShadow: '0 10px 20px rgba(15,90,42,0.30)',
                      '&:hover': { backgroundColor: '#0b3d1f', transform: 'translateY(-1px)' },
                      '&:active': { transform: 'translateY(1px) scale(0.99)' },
                      transition: 'transform 0.15s ease, background-color 0.15s ease',
                    }}>
                      Click here
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Browse Lots */}
          <Box sx={{ mt: 4, borderTop: '1px solid rgba(15, 23, 42, 0.12)', pt: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2, px: { xs: 0, md: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 52, height: 52, borderRadius: 2, backgroundColor: 'rgba(15, 90, 42, 0.08)', border: '1.5px solid rgba(15, 90, 42, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapIcon sx={{ fontSize: 26, color: '#7CDB6B' }} />
              </Box>
              <Box>
                <Typography sx={{ color: '#0f5a2a', fontWeight: 700, fontSize: '1rem' }}>Not a resident yet?</Typography>
                <Typography sx={{ color: 'rgba(15, 23, 42, 0.64)', fontSize: '0.84rem', fontWeight: 600 }}>
                  Browse available lots on the interactive village map — no account needed.
                </Typography>
              </Box>
            </Box>
            <Button variant="outlined" startIcon={<MapIcon />} onClick={onBrowseLots}
              sx={{
                borderColor: '#0f5a2a',
                color: '#0f5a2a',
                borderRadius: 999,
                px: 3,
                py: 1.05,
                fontWeight: 900,
                fontSize: '0.85rem',
                textTransform: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                '&:hover': { backgroundColor: 'rgba(15, 90, 42, 0.06)', borderColor: '#0b3d1f' },
                '&:active': { transform: 'translateY(1px) scale(0.99)' },
                transition: 'transform 0.15s ease',
              }}>
              Browse Available Lots
            </Button>
          </Box>

          <Box sx={{ mt: { xs: 5, md: 6 }, mx: { xs: -2, md: -6 }, px: { xs: 2, md: 6 }, py: { xs: 3, md: 3.5 }, background: 'linear-gradient(135deg, #1f5f33 0%, #2f7a43 100%)' }}>
            <Grid container spacing={2} justifyContent="center">
              {[
                { k: '200+', l: 'TOTAL LOTS', icon: <MapIcon sx={{ fontSize: 16 }} /> },
                { k: '45', l: 'ACTIVE RESIDENTS', icon: <HomeIcon sx={{ fontSize: 16 }} /> },
                { k: '98%', l: 'COLLECTION RATE', icon: <SecurityIcon sx={{ fontSize: 16 }} /> },
                { k: '4.9', l: 'COMMUNITY RATING', icon: <StarIcon sx={{ fontSize: 16 }} /> },
              ].map((s) => (
                <Grid item xs={6} md={3} key={s.l}>
                  <Box sx={{ textAlign: 'center', color: 'white' }}>
                    <Box sx={{ width: 28, height: 28, mx: 'auto', borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)' }}>
                      {s.icon}
                    </Box>
                    <Typography sx={{ mt: 0.8, fontWeight: 900, fontSize: { xs: '1.5rem', md: '1.7rem' }, lineHeight: 1 }}>{s.k}</Typography>
                    <Typography sx={{ mt: 0.3, fontWeight: 800, color: 'rgba(255,255,255,0.78)', fontSize: '0.66rem', letterSpacing: '0.07em' }}>{s.l}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box sx={{ mt: 0, mx: { xs: -2, md: -6 }, px: { xs: 2, md: 6 }, py: { xs: 4, md: 5 }, backgroundColor: '#d9e8b6' }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={6}>
                <Typography sx={{ color: '#9bb558', fontWeight: 900, fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  What we offer
                </Typography>
                <Typography sx={{ color: '#0f172a', fontWeight: 900, fontSize: { xs: '1.75rem', md: '2rem' }, lineHeight: 1.05, mt: 1 }}>
                  A Complete Community
                  <br />
                  Living Experience
                </Typography>
                <Typography sx={{ color: 'rgba(15, 23, 42, 0.62)', fontWeight: 700, fontSize: '0.84rem', mt: 1.2, maxWidth: 460, lineHeight: 1.6 }}>
                  Casimiro Westville Homes is designed to provide everything your family needs - from modern utilities to lush green spaces and a strong, secure community.
                </Typography>

                <Box sx={{ mt: 2.2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.1 }}>
                  {[
                    { label: 'High-Speed Internet' },
                    { label: 'Water & Utilities' },
                    { label: 'Waste Management' },
                    { label: 'Maintenance Team' },
                    { label: 'Parks & Greenery' },
                    { label: 'Visitor Parking' },
                  ].map((f) => (
                    <Box key={f.label} sx={{ backgroundColor: '#f6f8ee', borderRadius: 1.5, border: '1px solid rgba(15, 90, 42, 0.10)', px: 1.15, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: 'rgba(15, 90, 42, 0.12)', color: '#0f5a2a', fontSize: '0.65rem', fontWeight: 900, display: 'grid', placeItems: 'center' }}>+</Box>
                      <Typography sx={{ color: '#1f2937', fontWeight: 700, fontSize: '0.72rem' }}>{f.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ maxWidth: 430, ml: { xs: 0, md: 'auto' } }}>
                  <Box component="img" src="[images.unsplash.com](https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=900&q=80)" alt="Model house" sx={{ width: '100%', height: { xs: 170, md: 210 }, objectFit: 'cover', borderRadius: 3, boxShadow: '0 16px 32px rgba(0,0,0,0.18)' }} />
                  <Box sx={{ mt: 1.3, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.1 }}>
                    <Box component="img" src="[images.unsplash.com](https://images.unsplash.com/photo-1448630360428-65456885c650?w=600&q=80)" alt="Park" sx={{ width: '100%', height: 88, objectFit: 'cover', borderRadius: 2.4, boxShadow: '0 10px 24px rgba(0,0,0,0.14)' }} />
                    <Box component="img" src="[images.unsplash.com](https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=80)" alt="Community homes" sx={{ width: '100%', height: 88, objectFit: 'cover', borderRadius: 2.4, boxShadow: '0 10px 24px rgba(0,0,0,0.14)' }} />
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ mt: { xs: 5, md: 7 } }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: 2 }}>
              <Box>
                <Typography sx={{ color: '#7CDB6B', fontWeight: 900, fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  Stay informed
                </Typography>
                <Typography sx={{ color: '#0f172a', fontWeight: 900, fontSize: { xs: '1.25rem', md: '1.45rem' }, mt: 0.8 }}>
                  Latest announcements
                </Typography>
              </Box>
              <Button
                variant="text"
                onClick={() => scrollTo(announcementRef)}
                sx={{ color: '#0f5a2a', fontWeight: 900, textTransform: 'none', '&:hover': { bgcolor: 'rgba(15, 90, 42, 0.06)' } }}
              >
                View all
              </Button>
            </Box>

            <Grid container spacing={2.5}>
              {ANNOUNCEMENTS.slice(0, 3).map((ann) => (
                <Grid item xs={12} md={4} key={ann.id}>
                  <Card
                    onClick={() => scrollTo(announcementRef)}
                    sx={{
                      borderRadius: 3,
                      bgcolor: 'rgba(255,255,255,0.95)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      cursor: 'pointer',
                      transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                      boxShadow: '0 10px 28px rgba(0,0,0,0.22)',
                      '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 16px 40px rgba(0,0,0,0.30)' },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
                        <Chip
                          label={ann.category}
                          size="small"
                          sx={{
                            bgcolor: ann.color + '1A',
                            color: ann.color,
                            fontWeight: 900,
                            fontSize: '0.7rem',
                          }}
                        />
                        <Typography sx={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>{ann.date}</Typography>
                      </Box>
                      <Typography sx={{ color: '#0f172a', fontWeight: 900, fontSize: '0.95rem', lineHeight: 1.35 }}>
                        {ann.title}
                      </Typography>
                      <Typography
                        sx={{
                          mt: 1.1,
                          color: '#475569',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          lineHeight: 1.6,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {ann.body}
                      </Typography>
                      <Typography sx={{ mt: 1.6, color: '#0f5a2a', fontWeight: 900, fontSize: '0.8rem' }}>
                        Read more →
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      </Box>

      {/* CONTENT SECTIONS (scrollable) */}
      <Box sx={{ backgroundColor: '#f6faf7' }}>
        {/* Announcements */}
        <Box ref={announcementRef} sx={{ py: { xs: 6, md: 10 } }}>
          <Container maxWidth="lg">
            <Reveal>
              <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f5a2a', textTransform: 'uppercase', mb: 1 }}>
                Announcements
              </Typography>
              <Typography sx={{ color: '#556', mb: 4, maxWidth: 760, lineHeight: 1.8 }}>
                Stay updated with the latest advisories, maintenance schedules, and community events.
              </Typography>
            </Reveal>
            <Grid container spacing={3}>
              {ANNOUNCEMENTS.slice(0, 4).map((ann, idx) => (
                <Grid item xs={12} md={6} key={ann.id}>
                  <Reveal delayMs={idx * 80}>
                    <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderLeft: `5px solid ${ann.color}` }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Chip label={ann.category} size="small" sx={{ backgroundColor: ann.color + '20', color: ann.color, fontWeight: 700, fontSize: '0.7rem' }} />
                          <Typography sx={{ fontSize: '0.75rem', color: '#888' }}>{ann.date}</Typography>
                        </Box>
                        <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.95rem', mb: 1, lineHeight: 1.4 }}>{ann.title}</Typography>
                        <Typography sx={{ color: '#666', fontSize: '0.82rem', lineHeight: 1.7 }}>{ann.body}</Typography>
                      </CardContent>
                    </Card>
                  </Reveal>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Officials */}
        <Box ref={officialsRef} sx={{ py: { xs: 6, md: 10 }, backgroundColor: '#fff' }}>
          <Container maxWidth="lg">
            <Reveal>
              <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f5a2a', textTransform: 'uppercase', mb: 1 }}>
                Community Officials
              </Typography>
              <Typography sx={{ color: '#556', mb: 4, maxWidth: 760, lineHeight: 1.8 }}>
                Meet the leaders who help keep Westville organized, safe, and thriving.
              </Typography>
            </Reveal>
            <Grid container spacing={3}>
              {OFFICIALS.map((official, idx) => (
                <Grid item xs={12} sm={6} md={3} key={official.name}>
                  <Reveal delayMs={idx * 60}>
                    <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center', overflow: 'hidden', height: '100%' }}>
                      <Box sx={{ backgroundColor: '#0f5a2a', pt: 4, pb: 6, position: 'relative' }}>
                        <Avatar sx={{ width: 80, height: 80, mx: 'auto', backgroundColor: '#7CDB6B', color: '#0b3d1f', fontSize: '1.4rem', fontWeight: 900, border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                          {official.avatar}
                        </Avatar>
                      </Box>
                      <Box sx={{ mt: -4, position: 'relative', zIndex: 2, px: 2, pb: 3 }}>
                        <Box sx={{ backgroundColor: 'white', borderRadius: 3, p: 2.5, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                          <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem', mb: 0.5 }}>{official.name}</Typography>
                          <Typography sx={{ color: '#0f5a2a', fontSize: '0.78rem', fontWeight: 700, mb: 1.5 }}>{official.position}</Typography>
                          <Typography sx={{ color: '#666', fontSize: '0.76rem', lineHeight: 1.6 }}>{official.description}</Typography>
                        </Box>
                      </Box>
                    </Card>
                  </Reveal>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        {/* Contact */}
        <Box ref={contactRef} sx={{ py: { xs: 6, md: 10 } }}>
          <Container maxWidth="lg">
            <Reveal>
              <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f5a2a', textTransform: 'uppercase', mb: 1 }}>
                Contact Us
              </Typography>
              <Typography sx={{ color: '#556', mb: 5, maxWidth: 760, lineHeight: 1.8 }}>
                Questions or concerns? Reach out to the Westville Casimiro Homes administration.
              </Typography>
            </Reveal>
            <Reveal delayMs={80}>
              <ContactPage onClose={() => {}} />
            </Reveal>
          </Container>
        </Box>

        {/* About */}
        <Box ref={aboutRef} sx={{ py: { xs: 6, md: 10 }, backgroundColor: '#fff' }}>
          <Container maxWidth="lg">
            <Reveal>
              <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f5a2a', textTransform: 'uppercase', mb: 1 }}>
                About Us
              </Typography>
              <Typography sx={{ color: '#556', mb: 5, maxWidth: 760, lineHeight: 1.8 }}>
                Learn more about Westville Casimiro Homes, our mission, and what we value as a community.
              </Typography>
            </Reveal>
            <Reveal delayMs={80}>
              <AboutUsPage onClose={() => {}} />
            </Reveal>
          </Container>
        </Box>

        {/* Calendar (inline) */}
        <Box ref={calendarSectionRef} sx={{ py: { xs: 6, md: 10 }, backgroundColor: '#f6faf7' }}>
          <Container maxWidth="lg">
            <Reveal>
              <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f5a2a', textTransform: 'uppercase', mb: 1 }}>
                Calendar
              </Typography>
              <Typography sx={{ color: '#556', mb: 4, maxWidth: 760, lineHeight: 1.8 }}>
                Quick view of the current month.
              </Typography>
            </Reveal>
            <Reveal delayMs={80} sx={{ maxWidth: 420 }}>
              <Box sx={{ backgroundColor: 'white', borderRadius: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.10)', p: 2, border: '1px solid rgba(45,80,22,0.15)' }}>
                <MiniCalendar
                  currentDate={currentDate}
                  onPrevMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  onNextMonth={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                />
              </Box>
            </Reveal>
          </Container>
        </Box>

        <PageFooter />
      </Box>
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PARALLAX LOGIN PAGE - NEW PREMIUM DESIGN
// ═══════════════════════════════════════════════════════════════════════════════
const Login = () => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  // Mouse parallax effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const storedAttempts = parseInt(localStorage.getItem('loginAttempts') || '0');
    const lockTime = localStorage.getItem('lockTime');
    if (storedAttempts >= 3 && lockTime) {
      const elapsed = Date.now() - parseInt(lockTime);
      if (elapsed < 5 * 60 * 1000) { setIsLocked(true); startLockTimer(Math.ceil((5 * 60 * 1000 - elapsed) / 1000)); }
      else { localStorage.removeItem('loginAttempts'); localStorage.removeItem('lockTime'); }
    } else { setLoginAttempts(storedAttempts); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startLockTimer = (s) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setLockTimer(s);
    timerRef.current = setInterval(() => {
      setLockTimer(p => { if (p <= 1) { clearInterval(timerRef.current); setIsLocked(false); localStorage.removeItem('loginAttempts'); localStorage.removeItem('lockTime'); return null; } return p - 1; });
    }, 1000);
  };

  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' }); };

  const validate = () => {
    const e = {};
    if (!formData.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Email is invalid';
    if (!formData.password) e.password = 'Password is required';
    else if (formData.password.length < 6) e.password = 'Password must be at least 6 characters';
    return e;
  };

  const handleLoginFailed = () => {
    const n = loginAttempts + 1; setLoginAttempts(n); localStorage.setItem('loginAttempts', n.toString());
    if (n >= 3) { setIsLocked(true); localStorage.setItem('lockTime', Date.now().toString()); startLockTimer(300); setErrors({ submit: 'Too many failed attempts. Account locked for 5 minutes.' }); }
    else setErrors({ submit: `Invalid credentials. Attempt ${n} of 3.` });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) { setErrors({ submit: `Account locked. Try again in ${formatTime(lockTimer)}` }); return; }
    const ve = validate();
    if (Object.keys(ve).length > 0) { setErrors(ve); return; }
    const result = await login(formData.email, formData.password, selectedRole);
    if (result.success) { localStorage.removeItem('loginAttempts'); localStorage.removeItem('lockTime'); setLoginAttempts(0); setTimeout(() => navigate('/dashboard'), 100); }
    else handleLoginFailed();
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      alert('Please enter your email address');
      return;
    }

    setForgotLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email.toLowerCase() })
      });

      const data = await response.json();
      alert(data.message || 'If your email is registered, you will receive a password reset link.');
      setShowForgotPassword(false);
    } catch (error) {
      alert('Failed to send reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const formatTime = (s) => { if (!s) return '0:00'; return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`; };
  const roleInfo = ROLES.find(r => r.key === selectedRole);

  if (!selectedRole) return <LandingPage onRoleSelect={setSelectedRole} onBrowseLots={() => navigate('/lots')} />;

  return (
    <Box
      ref={containerRef}
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: T.dark,
        
        // Keyframe animations
        '@keyframes float': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(2deg)' },
        },
        '@keyframes floatReverse': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(20px) rotate(-2deg)' },
        },
        '@keyframes pulse': {
          '0%, 100%': { opacity: 0.4, transform: 'scale(1)' },
          '50%': { opacity: 0.7, transform: 'scale(1.05)' },
        },
        '@keyframes slideUp': {
          from: { opacity: 0, transform: 'translateY(40px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '@keyframes fadeIn': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        '@keyframes glowPulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(233, 69, 96, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(233, 69, 96, 0.6)' },
        },
        '@keyframes borderGlow': {
          '0%, 100%': { borderColor: 'rgba(255, 255, 255, 0.08)' },
          '50%': { borderColor: 'rgba(233, 69, 96, 0.3)' },
        },
        '@keyframes shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        '@keyframes orbit': {
          from: { transform: 'rotate(0deg) translateX(150px) rotate(0deg)' },
          to: { transform: 'rotate(360deg) translateX(150px) rotate(-360deg)' },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*': { animation: 'none !important', transition: 'none !important' },
        },
      }}
    >
      {/* Background Hero Image with Parallax */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url([images.unsplash.com](https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: `translate(${mousePosition.x * -20}px, ${mousePosition.y * -20}px) scale(1.1)`,
          transition: 'transform 0.15s ease-out',
          filter: 'brightness(0.3) saturate(0.8)',
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg, 
              rgba(10, 10, 10, 0.95) 0%, 
              rgba(26, 26, 46, 0.85) 50%, 
              rgba(10, 10, 10, 0.95) 100%)`,
          }
        }}
      />

      {/* Floating Geometric Elements - Layer 1 (slowest) */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          border: '1px solid rgba(233, 69, 96, 0.15)',
          transform: `translate(${mousePosition.x * -10}px, ${mousePosition.y * -10}px)`,
          transition: 'transform 0.3s ease-out',
          animation: 'float 8s ease-in-out infinite',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '15%',
          right: '10%',
          width: 200,
          height: 200,
          borderRadius: '30%',
          background: 'linear-gradient(135deg, rgba(233, 69, 96, 0.08), transparent)',
          transform: `translate(${mousePosition.x * -15}px, ${mousePosition.y * -15}px)`,
          transition: 'transform 0.25s ease-out',
          animation: 'floatReverse 10s ease-in-out infinite',
        }}
      />

      {/* Floating Elements - Layer 2 (medium speed) */}
      <Box
        sx={{
          position: 'absolute',
          top: '25%',
          right: '15%',
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(233, 69, 96, 0.1) 0%, transparent 70%)',
          transform: `translate(${mousePosition.x * -25}px, ${mousePosition.y * -25}px)`,
          transition: 'transform 0.2s ease-out',
          animation: 'pulse 6s ease-in-out infinite',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '30%',
          left: '12%',
          width: 100,
          height: 100,
          background: 'linear-gradient(45deg, rgba(255, 255, 255, 0.03), rgba(233, 69, 96, 0.05))',
          borderRadius: 3,
          transform: `translate(${mousePosition.x * -30}px, ${mousePosition.y * -30}px) rotate(45deg)`,
          transition: 'transform 0.2s ease-out',
          animation: 'float 7s ease-in-out infinite 1s',
        }}
      />

      {/* Grid Pattern Overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          transform: `translate(${mousePosition.x * -5}px, ${mousePosition.y * -5}px)`,
          transition: 'transform 0.4s ease-out',
          opacity: 0.5,
        }}
      />

      {/* Accent Light Beams */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: '20%',
          width: '2px',
          height: '100%',
          background: 'linear-gradient(to bottom, transparent, rgba(233, 69, 96, 0.2), transparent)',
          opacity: 0.3,
          animation: 'pulse 4s ease-in-out infinite',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: '30%',
          width: '1px',
          height: '100%',
          background: 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.1), transparent)',
          opacity: 0.4,
          animation: 'pulse 5s ease-in-out infinite 2s',
        }}
      />

      {/* Orbiting Particle */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: T.accent,
          boxShadow: '0 0 20px rgba(233, 69, 96, 0.6)',
          animation: 'orbit 20s linear infinite',
        }}
      />

      {/* Main Content Container */}
      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 10, py: 4 }}>
        
        {/* Back Button */}
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => { setSelectedRole(null); setErrors({}); setFormData({ email: '', password: '' }); }}
          sx={{
            color: 'rgba(255,255,255,0.7)',
            mb: 4,
            borderRadius: 999,
            textTransform: 'none',
            fontWeight: 600,
            px: 2.5,
            py: 1,
            bgcolor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.6s ease 0.1s both',
            transition: 'all 0.3s ease',
            '&:hover': { 
              color: 'white', 
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderColor: 'rgba(255,255,255,0.15)',
              transform: 'translateX(-4px)',
            },
            '&:active': { transform: 'translateX(-2px) scale(0.98)' },
          }}
        >
          Back to Home
        </Button>

        {/* Role Badge */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            mb: 4,
            animation: 'slideUp 0.7s ease 0.2s both',
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '20px',
              background: `linear-gradient(135deg, ${T.primary}, ${T.light})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '200%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                animation: 'shimmer 3s infinite',
              }
            }}
          >
            {React.cloneElement(roleInfo.icon, { sx: { fontSize: 30, color: 'white' } })}
          </Box>
          <Box>
            <Typography sx={{ 
              color: 'rgba(255,255,255,0.5)', 
              fontSize: '0.7rem', 
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}>
              WESTVILLE CASIMIRO HOMES
            </Typography>
            <Typography sx={{ 
              color: 'white', 
              fontWeight: 800, 
              fontSize: '1.5rem',
              letterSpacing: '-0.02em',
            }}>
              {roleInfo.label} Login
            </Typography>
          </Box>
        </Box>

        {/* Glassmorphism Login Card */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            p: { xs: 3.5, md: 5 },
            background: T.glass,
            backdropFilter: 'blur(40px)',
            border: `1px solid ${T.glassBorder}`,
            boxShadow: `
              0 32px 64px rgba(0, 0, 0, 0.4),
              0 0 0 1px rgba(255, 255, 255, 0.05) inset,
              0 1px 0 rgba(255, 255, 255, 0.1) inset
            `,
            animation: 'slideUp 0.8s ease 0.3s both, borderGlow 4s ease-in-out infinite',
            position: 'relative',
            overflow: 'hidden',
            transform: `translate(${mousePosition.x * 5}px, ${mousePosition.y * 5}px)`,
            transition: 'transform 0.15s ease-out',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
            },
          }}
        >
          {/* Accent Corner Glow */}
          <Box
            sx={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${T.accent}20, transparent 70%)`,
              filter: 'blur(40px)',
            }}
          />

          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 800, 
              color: T.textPrimary, 
              mb: 0.5,
              letterSpacing: '-0.02em',
            }}
          >
            Welcome back
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: T.textSecondary, 
              mb: 4,
              fontSize: '0.9rem',
            }}
          >
            Sign in to access your {roleInfo.label.toLowerCase()} dashboard
          </Typography>

          {/* Alerts */}
          {isLocked && (
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 3, 
                borderRadius: 3,
                bgcolor: 'rgba(233, 69, 96, 0.1)',
                border: '1px solid rgba(233, 69, 96, 0.2)',
                color: 'white',
                '& .MuiAlert-icon': { color: T.accent },
              }} 
              icon={<SecurityIcon />}
            >
              Account locked. Try again in {formatTime(lockTimer)}
            </Alert>
          )}
          {errors.submit && (
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 3, 
                borderRadius: 3,
                bgcolor: 'rgba(233, 69, 96, 0.1)',
                border: '1px solid rgba(233, 69, 96, 0.2)',
                color: 'white',
                '& .MuiAlert-icon': { color: T.accent },
              }}
            >
              {errors.submit}
            </Alert>
          )}
          {errors.submit?.includes('pending admin approval') && (
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 3, 
                borderRadius: 3,
                bgcolor: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid rgba(255, 193, 7, 0.2)',
                color: 'white',
              }} 
              icon={<TimeIcon sx={{ color: '#ffc107' }} />}
            >
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>Account Pending Approval</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>Your registration is awaiting admin approval.</Typography>
            </Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              sx={noRedErrorFieldSx}
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              margin="normal"
              InputLabelProps={{ sx: { fontWeight: 600 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 20 }} />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 3,
                  bgcolor: 'rgba(255, 255, 255, 0.03)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                  },
                  '&.Mui-focused': {
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    boxShadow: `0 0 0 2px ${T.accent}30`,
                  },
                }
              }}
            />
            <TextField
              sx={noRedErrorFieldSx}
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              margin="normal"
              InputLabelProps={{ sx: { fontWeight: 600 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <KeyIcon sx={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.4)',
                        transition: 'all 0.2s ease',
                        '&:hover': { color: 'rgba(255, 255, 255, 0.7)' },
                        '&:active': { transform: 'scale(0.95)' },
                      }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 3,
                  bgcolor: 'rgba(255, 255, 255, 0.03)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                  },
                  '&.Mui-focused': {
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    boxShadow: `0 0 0 2px ${T.accent}30`,
                  },
                }
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, mb: 3 }}>
              <Button 
                size="small" 
                onClick={() => setShowForgotPassword(true)} 
                sx={{ 
                  color: T.textSecondary, 
                  textTransform: 'none', 
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  transition: 'color 0.2s ease',
                  '&:hover': { color: T.accent, bgcolor: 'transparent' },
                }}
              >
                Forgot Password?
              </Button>
            </Box>

            {/* Submit Button with Glow Effect */}
            <Button 
              type="submit" 
              fullWidth 
              variant="contained" 
              disabled={loading || isLocked}
              sx={{
                background: `linear-gradient(135deg, ${T.accent}, #c73d54)`,
                py: 1.75,
                borderRadius: 3,
                fontWeight: 800,
                fontSize: '1rem',
                textTransform: 'none',
                letterSpacing: '0.02em',
                boxShadow: `0 20px 40px ${T.accent}40`,
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: '-100%',
                  width: '200%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                  animation: 'shimmer 2s infinite',
                },
                '&:hover': { 
                  transform: 'translateY(-2px)',
                  boxShadow: `0 25px 50px ${T.accent}50`,
                },
                '&:active': { 
                  transform: 'translateY(0px) scale(0.99)',
                },
                '&.Mui-disabled': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.3)',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: 'white' }} />
              ) : (
                `Sign In as ${roleInfo.label}`
              )}
            </Button>

            {/* Register Link for Residents */}
            {selectedRole === 'resident' && (
              <>
                <Divider sx={{ my: 3.5 }}>
                  <Typography variant="caption" sx={{ color: T.textSecondary, px: 2 }}>
                    Don't have an account?
                  </Typography>
                </Divider>
                <Button 
                  component={Link} 
                  to="/register" 
                  fullWidth 
                  variant="outlined"
                  sx={{ 
                    borderColor: 'rgba(255, 255, 255, 0.15)', 
                    color: T.textPrimary, 
                    py: 1.5, 
                    borderRadius: 3, 
                    fontWeight: 700, 
                    textTransform: 'none',
                    transition: 'all 0.3s ease',
                    '&:hover': { 
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderColor: T.accent,
                      color: T.accent,
                    },
                  }}
                >
                  Register as Resident
                </Button>
              </>
            )}
          </Box>
        </Paper>

        {/* Footer */}
        <Typography 
          sx={{ 
            textAlign: 'center', 
            mt: 4, 
            color: 'rgba(255,255,255,0.3)', 
            fontSize: '0.75rem',
            animation: 'fadeIn 1s ease 0.8s both',
          }}
        >
          © {new Date().getFullYear()} Westville Casimiro Homes. All rights reserved.
        </Typography>
      </Container>

      {/* Forgot Password Dialog */}
      <Dialog 
        open={showForgotPassword} 
        onClose={() => setShowForgotPassword(false)} 
        PaperProps={{ 
          sx: { 
            borderRadius: 4,
            bgcolor: T.primary,
            border: `1px solid ${T.glassBorder}`,
            backdropFilter: 'blur(20px)',
            boxShadow: '0 32px 64px rgba(0, 0, 0, 0.5)',
          } 
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: T.textPrimary }}>Reset Password</DialogTitle>
        <DialogContent sx={{ p: 3, pt: 1 }}>
          <Typography variant="body2" sx={{ mb: 3, color: T.textSecondary }}>
            Enter your email and we'll send you a reset link.
          </Typography>
          <TextField 
            sx={noRedErrorFieldSx} 
            fullWidth 
            label="Email Address" 
            type="email" 
            name="email" 
            value={formData.email} 
            onChange={handleChange}
            InputProps={{ 
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon sx={{ color: 'rgba(255, 255, 255, 0.4)' }} fontSize="small" />
                </InputAdornment>
              ), 
              sx: { borderRadius: 3 } 
            }} 
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={() => setShowForgotPassword(false)}
            sx={{ 
              color: T.textSecondary, 
              fontWeight: 600,
              '&:hover': { color: T.textPrimary },
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleForgotPassword} 
            variant="contained" 
            disabled={forgotLoading}
            sx={{ 
              background: `linear-gradient(135deg, ${T.accent}, #c73d54)`,
              borderRadius: 2,
              fontWeight: 700,
              px: 3,
              '&:hover': { 
                boxShadow: `0 10px 30px ${T.accent}40`,
              },
            }}
          >
            {forgotLoading ? <CircularProgress size={20} color="inherit" /> : 'Send Reset Link'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login;
