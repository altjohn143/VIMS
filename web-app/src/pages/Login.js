import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import villageLogo from '../assets/village-logo.png';
import bgImage from '../assets/Westville.png';
import heroBg from '../assets/roof.png';
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
  // Palette tuned to match your screenshot’s green overlay + navbar
  dark: '#0b3d1f',      // deepest green (hero overlay / nav depth)
  primary: '#0f5a2a',   // main green (sections)
  light: '#2f8f46',     // mid green (hero / highlights)
  accent: '#7CDB6B',    // bright CTA green
  bg: '#f6faf7',        // clean off-white background
};

const API_URL = process.env.REACT_APP_API_URL || 'https://vims-backend.onrender.com/api';

const noRedErrorFieldSx = {
  '& .MuiFormLabel-root.Mui-error': { color: '#475569' },
  '& .MuiFormHelperText-root.Mui-error': { color: '#64748b' },
  '& .MuiOutlinedInput-root.Mui-error fieldset': { borderColor: 'rgba(15, 23, 42, 0.24)' },
  '& .MuiOutlinedInput-root.Mui-error:hover fieldset': { borderColor: 'rgba(15, 23, 42, 0.35)' },
  '& .MuiOutlinedInput-root.Mui-error.Mui-focused fieldset': { borderColor: T.primary },
};

const ROLES = [
  { key: 'admin', label: 'ADMIN', description: 'Manages the system, resident records, and community information.', icon: <AdminIcon sx={{ fontSize: 40, color: T.primary }} />, bgImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80' },
  { key: 'resident', label: 'RESIDENT', description: 'Access personal information, community updates, and services.', icon: <HomeIcon sx={{ fontSize: 40, color: T.primary }} />, bgImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80' },
  { key: 'security', label: 'SECURITY', description: 'Monitors entries and helps keep the community safe.', icon: <ShieldIcon sx={{ fontSize: 40, color: T.primary }} />, bgImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
];

// ─── SHARED BACK BUTTON ───────────────────────────────────────────────────────
const BackBtn = ({ onClose }) => (
  <Button startIcon={<ArrowBackIcon />} onClick={onClose}
    sx={{ position: 'absolute', top: { xs: 18, md: 28 }, left: { xs: 18, md: 30 }, zIndex: 10, color: 'white', backgroundColor: 'rgba(3, 18, 10, 0.28)', borderRadius: 999, px: 1.6, py: 0.9, textTransform: 'none', fontWeight: 800, fontSize: { xs: '0.9rem', md: '1rem' }, backdropFilter: 'blur(10px)', '&:hover': { backgroundColor: 'rgba(3, 18, 10, 0.44)', transform: 'translateX(-2px)' }, '&:active': { transform: 'translateX(-1px) scale(0.98)' }, transition: 'all 0.18s ease' }}>
    Back to Home
  </Button>
);

// ─── SHARED HERO ──────────────────────────────────────────────────────────────
const PageHero = ({ title, subtitle, onClose }) => (
  <Box sx={{ position: 'relative', minHeight: { xs: 330, md: 452 }, backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center 45%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', '&::before': { content: '""', position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(3, 24, 13, 0.72) 0%, rgba(11, 61, 31, 0.66) 44%, rgba(3, 24, 13, 0.44) 100%)' }, '&::after': { content: '""', position: 'absolute', inset: 0, background: 'radial-gradient(circle at 22% 16%, rgba(124,219,107,0.16), transparent 34%), linear-gradient(180deg, rgba(3,18,10,0.18) 0%, rgba(3,18,10,0.42) 100%)' } }}>
    <BackBtn onClose={onClose} />
    <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center', px: 3, pt: { xs: 4, md: 2 }, animation: 'fadeUpSoft 0.7s ease' }}>
      <Typography sx={{ fontSize: { xs: '2.65rem', md: '4rem' }, fontWeight: 950, color: 'white', textTransform: 'uppercase', lineHeight: 0.98, letterSpacing: { xs: '0.02em', md: '0.04em' }, textShadow: '0 18px 40px rgba(0,0,0,0.42)', mb: 2 }}>{title}</Typography>
      {subtitle && <Typography sx={{ color: 'rgba(255,255,255,0.88)', fontSize: { xs: '1rem', md: '1.25rem' }, maxWidth: 760, mx: 'auto', lineHeight: 1.65, fontWeight: 700, textShadow: '0 10px 24px rgba(0,0,0,0.35)' }}>{subtitle}</Typography>}
    </Box>
  </Box>
);

// ─── SHARED FOOTER ────────────────────────────────────────────────────────────
const PageFooter = () => (
  <Box sx={{ backgroundColor: T.primary, py: { xs: 4, md: 6 }, px: { xs: 3, md: 8 } }}>
    <Grid container spacing={4}>
      {[
        { title: 'About Westville', links: ['Brand History', 'Vision & Mission', 'Core Values', 'Community News'] },
        { title: 'Resident Services', links: ['Service Requests', 'Visitor Management', 'Announcements', 'Pay Dues'] },
        { title: "Homebuyer's Guide", links: ['Available Lots', 'House Models', 'Virtual Tour', 'Book Appointment'] },
        { title: 'Support', links: ['Contact Us', 'FAQs', 'Security Office', 'Emergency Hotline'] },
      ].map((col) => (
        <Grid item xs={6} md={3} key={col.title}>
          <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.85rem', mb: 1.5 }}>{col.title}</Typography>
          {col.links.map((l) => <Typography key={l} sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', mb: 0.8, cursor: 'pointer', '&:hover': { color: T.accent } }}>{l}</Typography>)}
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
          backgroundColor: isT ? T.primary : 'transparent',
          color: isT ? 'white' : '#333',
          fontSize: compact ? '0.78rem' : '0.85rem',
          fontWeight: isT ? (compact ? 700 : 800) : (compact ? 400 : 500),
          cursor: compact ? 'pointer' : 'default',
          '&:hover': { backgroundColor: isT ? T.dark : '#e8f5e9' },
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
          <ArrowBackIcon fontSize="small" sx={{ color: T.primary }} />
        </IconButton>
        <Typography sx={{ fontWeight: compact ? 700 : 800, color: T.primary, fontSize: compact ? '0.9rem' : '1rem' }}>
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Typography>
        <IconButton size="small" onClick={onNextMonth}>
          <ArrowBackIcon fontSize="small" sx={{ color: T.primary, transform: 'rotate(180deg)' }} />
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
          <Button size="small" onClick={onClose} sx={{ color: T.primary, fontSize: '0.72rem', textTransform: 'none', fontWeight: 600 }}>Close</Button>
        </Box>
      )}
    </Box>
  );
};

const ANNOUNCEMENTS = [
  { id: 1, category: 'Security', date: 'March 10, 2026', title: 'Enhanced Gate Security Protocol Starting April 2026', body: 'Effective April 1, 2026, all visitors must present a valid government-issued ID and be registered in our VIMS visitor portal before entry. Homeowners are requested to pre-register expected visitors through the resident portal. QR code stickers will also be distributed for faster vehicle entry.', color: '#ef4444' },
  { id: 2, category: 'Maintenance', date: 'March 8, 2026', title: 'Scheduled Water Service Interruption – March 15, 2026', body: 'Water service will be temporarily interrupted on March 15, 2026 from 8:00 AM to 5:00 PM due to scheduled maintenance of the main water line on Casimiro Street. All residents are advised to store sufficient water. We apologize for the inconvenience.', color: '#f59e0b' },
  { id: 3, category: 'Community', date: 'March 5, 2026', title: 'Westville Clean-Up Drive – March 22, 2026', body: 'Join us for our quarterly community clean-up drive on March 22, 2026 at 7:00 AM. Meet at the main clubhouse. Gloves, garbage bags, and refreshments will be provided. All residents and their families are encouraged to participate. Let us keep our community clean and beautiful!', color: T.light },
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
const ContactPage = ({ onClose, embedded = false }) => {
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

  const content = (
    <Grid container spacing={5}>

          {/* Contact Info */}
          <Grid item xs={12} md={5}>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: T.primary, mb: 3 }}>Get in Touch</Typography>
            {[
              { icon: <LocationIcon sx={{ color: T.primary }} />, label: 'Address', value: 'Westville Casimiro Homes, Casimiro Avenue, Paranaque City, Metro Manila, Philippines' },
              { icon: <PhoneIcon sx={{ color: T.primary }} />, label: 'Phone', value: '+63 (02) 8123-4567\n+63 917 123 4567 (Mobile)' },
              { icon: <EmailIcon sx={{ color: T.primary }} />, label: 'Email', value: 'admin@westvillecasimiro.com\nsecurity@westvillecasimiro.com' },
              { icon: <TimeIcon sx={{ color: T.primary }} />, label: 'Office Hours', value: 'Monday – Friday: 8:00 AM – 5:00 PM\nSaturday: 8:00 AM – 12:00 PM' },
            ].map((item) => (
              <Box key={item.label} sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 2, backgroundColor: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid rgba(45,80,22,0.15)` }}>
                  {item.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem', mb: 0.3 }}>{item.label}</Typography>
                  <Typography sx={{ color: '#555', fontSize: '0.82rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{item.value}</Typography>
                </Box>
              </Box>
            ))}

            <Box sx={{ mt: 3, p: 3, backgroundColor: T.primary, borderRadius: 3 }}>
              <Typography sx={{ color: 'white', fontWeight: 700, mb: 1 }}>Emergency Hotline</Typography>
              <Typography sx={{ color: T.accent, fontSize: '1.4rem', fontWeight: 900 }}>+63 917 911 0000</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', mt: 0.5 }}>Available 24/7 for security emergencies</Typography>
            </Box>

            <Box sx={{ mt: 3, display: 'flex', gap: 1.5 }}>
              {[<FacebookIcon />, <InstagramIcon />, <YouTubeIcon />, <LinkedInIcon />].map((icon, i) => (
                <Box key={i} sx={{ width: 40, height: 40, borderRadius: 2, backgroundColor: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', '&:hover': { backgroundColor: T.dark } }}>
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
                  <Typography sx={{ fontSize: '1.4rem', fontWeight: 800, color: T.primary, mb: 1 }}>Message Sent!</Typography>
                  <Typography sx={{ color: '#666', mb: 3 }}>Thank you for reaching out. Our team will get back to you within 1–2 business days.</Typography>
                  <Button variant="contained" onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                    sx={{ backgroundColor: T.primary, borderRadius: 2, textTransform: 'none' }}>Send Another Message</Button>
                </Box>
              ) : (
                <>
                  <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: T.primary, mb: 0.5 }}>Send Us a Message</Typography>
                  <Typography sx={{ color: '#888', fontSize: '0.85rem', mb: 3 }}>Fill out the form below and we'll respond as soon as possible.</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField sx={noRedErrorFieldSx} fullWidth label="Full Name" value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: '' }); }}
                        error={!!errors.name} helperText={errors.name} InputProps={{ sx: { borderRadius: 2 } }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField sx={noRedErrorFieldSx} fullWidth label="Email Address" value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: '' }); }}
                        error={!!errors.email} helperText={errors.email} InputProps={{ sx: { borderRadius: 2 } }} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField sx={noRedErrorFieldSx} fullWidth label="Subject" value={form.subject} onChange={e => { setForm({ ...form, subject: e.target.value }); setErrors({ ...errors, subject: '' }); }}
                        error={!!errors.subject} helperText={errors.subject} InputProps={{ sx: { borderRadius: 2 } }} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField sx={noRedErrorFieldSx} fullWidth label="Message" multiline rows={5} value={form.message} onChange={e => { setForm({ ...form, message: e.target.value }); setErrors({ ...errors, message: '' }); }}
                        error={!!errors.message} helperText={errors.message} InputProps={{ sx: { borderRadius: 2 } }} />
                    </Grid>
                    <Grid item xs={12}>
                      <Button fullWidth variant="contained" onClick={handleSubmit}
                        sx={{ backgroundColor: T.primary, py: 1.5, borderRadius: 2, fontWeight: 700, fontSize: '0.95rem', textTransform: 'none', '&:hover': { backgroundColor: T.dark }, boxShadow: '0 4px 14px rgba(45,80,22,0.35)' }}>
                        Send Message
                      </Button>
                    </Grid>
                  </Grid>
                </>
              )}
            </Paper>
          </Grid>
    </Grid>
  );

  if (embedded) return content;

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f9f9f9' }}>
      <PageHero title="Contact Us" subtitle="Have a question, concern, or suggestion? We'd love to hear from you. Reach out to the Westville Casimiro Homes administration." onClose={onClose} />
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        {content}
      </Container>
      <PageFooter />
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: ABOUT US
// ═══════════════════════════════════════════════════════════════════════════════
const AboutUsPage = ({ onClose, embedded = false }) => {
  const content = (
    <>
    {/* Vision */}
    <Box sx={{ backgroundColor: T.bg, py: { xs: 6, md: 10 } }}>
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box component="img" src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=700&q=80" alt="Vision" sx={{ width: '100%', borderRadius: 3, boxShadow: '0 12px 40px rgba(0,0,0,0.15)', height: { xs: 260, md: 380 }, objectFit: 'cover' }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: T.primary, mb: 3, textTransform: 'uppercase' }}>VISION</Typography>
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
            <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: T.primary, mb: 3, textTransform: 'uppercase' }}>MISSION</Typography>
            <Typography sx={{ color: '#333', lineHeight: 1.8, mb: 2 }}>For years, we have built quality homes, well-planned communities, and safe living spaces across Paranaque City. These spaces elevate lives and are perfect for families who seek security, comfort, and a sense of belonging.</Typography>
            <Typography sx={{ color: '#333', lineHeight: 1.8, mb: 2 }}>Westville Casimiro Homes is dedicated to providing residents with modern facilities, responsive management, and a thriving community where every member feels valued and heard.</Typography>
            <Typography sx={{ color: '#333', lineHeight: 1.8 }}>We continuously innovate through our Village Information Management System (VIMS), ensuring transparent governance, efficient visitor management, and accessible resident services.</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box component="img" src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=700&q=80" alt="Mission" sx={{ width: '100%', borderRadius: 3, boxShadow: '0 12px 40px rgba(0,0,0,0.15)', height: { xs: 260, md: 380 }, objectFit: 'cover' }} />
          </Grid>
        </Grid>
      </Container>
    </Box>
    
    {/* Core Values */}
    <Box sx={{ backgroundColor: T.bg, py: { xs: 6, md: 10 } }}>
      <Container maxWidth="lg">
        <Typography sx={{ textAlign: 'center', fontSize: '2rem', fontWeight: 900, color: T.primary, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 6 }}>OUR CORE VALUES</Typography>
        <Grid container spacing={4}>
          {[
            { title: 'Community', desc: 'We foster a strong sense of belonging, nurturing relationships and building a vibrant, inclusive neighborhood for all residents.', img: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80' },
            { title: 'Safety & Security', desc: 'We prioritize every resident\'s safety through 24/7 security, controlled access, and vigilant community monitoring.', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
            { title: 'Sustainability', desc: 'We are committed to green living — maintaining clean surroundings, preserving green spaces, and promoting eco-friendly practices.', img: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80' },
            { title: 'Transparency', desc: 'We uphold honest communication with all homeowners, ensuring fair governance and accessible community information.', img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80' },
          ].map((val) => (
            <Grid item xs={12} sm={6} md={3} key={val.title}>
              <Box sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.1)', backgroundColor: 'white', height: '100%', transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-6px)' } }}>
                <Box component="img" src={val.img} alt={val.title} sx={{ width: '100%', height: 180, objectFit: 'cover' }} />
                <Box sx={{ p: 3 }}>
                  <Typography sx={{ fontWeight: 800, color: T.primary, fontSize: '1.05rem', mb: 1 }}>{val.title}</Typography>
                  <Typography sx={{ color: '#555', fontSize: '0.85rem', lineHeight: 1.6 }}>{val.desc}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>

    {/* Stats */}
    <Box sx={{ backgroundColor: T.primary, py: { xs: 5, md: 7 } }}>
      <Container maxWidth="lg">
        <Grid container spacing={4} justifyContent="center">
          {[['500+', 'Homeowners'], ['24/7', 'Security Monitoring'], ['10+', 'Years of Service'], ['100%', 'Committed to Excellence']].map(([n, l]) => (
            <Grid item xs={6} md={3} key={l} sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: { xs: '2rem', md: '2.8rem' }, fontWeight: 900, color: T.accent }}>{n}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', fontWeight: 600 }}>{l}</Typography>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>

    {/* Social */}
    <Box sx={{ backgroundColor: '#f9f9f9', py: { xs: 5, md: 7 }, textAlign: 'center' }}>
      <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: T.primary, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 3 }}>Catch the Latest on Our Social Media</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        {[<FacebookIcon />, <InstagramIcon />, <YouTubeIcon />, <LinkedInIcon />].map((icon, i) => (
          <Box key={i} sx={{ width: 48, height: 48, borderRadius: 2, backgroundColor: T.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', '&:hover': { backgroundColor: T.dark } }}>{icon}</Box>
        ))}
      </Box>
    </Box>
    </>
  );

  if (embedded) return content;

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#fff' }}>
      <PageHero title="YOUR DREAM LIFE AWAITS IN WESTVILLE HOMES" subtitle="Standing the test of time, Westville has grown from an innovative real estate developer into a strong name in the industry." onClose={onClose} />
      {content}
      <PageFooter />
    </Box>
  );
};

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
      sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', '&:hover': { color: T.accent }, transition: 'color 0.2s' }}>
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
        // White page background (requested). Hero keeps its own image/overlay.
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
          height: { xs: 620, md: 680 },
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${heroBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 38%',
            filter: 'saturate(1.08) contrast(1.04)',
            animation: 'heroZoom 18s ease-in-out infinite alternate',
            transformOrigin: 'center',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(
                90deg,
                rgba(2, 26, 13, 0.88) 0%,
                rgba(8, 55, 28, 0.78) 38%,
                rgba(12, 76, 38, 0.64) 68%,
                rgba(6, 36, 18, 0.56) 100%
              ),
              url(${heroBg})
            `,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundBlendMode: 'overlay',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 18% 12%, rgba(47, 143, 70, 0.22), transparent 42%),
                         radial-gradient(circle at 82% 18%, rgba(124, 219, 107, 0.18), transparent 44%),
                         linear-gradient(180deg, rgba(4, 34, 17, 0.24) 0%, rgba(3, 20, 10, 0.46) 100%)`,
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
            component="img"
            src={villageLogo}
            alt="Westville Logo"
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              objectFit: 'cover',
              border: '1px solid rgba(255,255,255,0.25)',
              boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
            }}
          />
          <Box>
            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.85rem', lineHeight: 1 }}>
              WESTVILLE CASIMIRO
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
              HOMES
            </Typography>
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
              '&:hover': { borderColor: T.accent, color: T.accent, bgcolor: 'rgba(124, 219, 107, 0.12)' },
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
              sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', '&:hover': { color: T.accent }, transition: 'color 0.2s' }}>
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
              '&:hover': { borderColor: T.accent, color: T.accent, bgcolor: 'rgba(124, 219, 107, 0.12)' },
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
          pt: { xs: 5, md: 8 },
          pb: { xs: 5, md: 7 },
          maxWidth: 760,
          animation: 'fadeUpSoft 0.75s ease',
        }}
      >
        <Typography sx={{ color: T.accent, fontSize: '0.72rem', fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', mb: 1.2 }}>
          Paranaque City, Metro Manila
        </Typography>
        <Typography sx={{ fontFamily: 'Georgia, serif', fontSize: { xs: '2.45rem', md: '4rem' }, fontWeight: 900, color: 'white', lineHeight: 0.94, textTransform: 'uppercase', textShadow: '0 5px 26px rgba(0,0,0,0.72)', mb: 2 }}>
          YOUR DREAM LIFE AWAITS<br />IN WESTVILLE HOMES
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.94)', fontSize: '0.92rem', mb: 3, maxWidth: 560, lineHeight: 1.65, fontWeight: 700, textShadow: '0 3px 14px rgba(0,0,0,0.62)' }}>
          Standing the test of time, Westville has grown from an innovative real estate developer into a strong name in the industry, continuously building quality homes and vibrant communities.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="contained"
            onClick={() => scrollTo(aboutRef)}
            sx={{
              bgcolor: T.accent,
              color: T.dark,
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
              '&:hover': { borderColor: T.accent, color: T.accent, bgcolor: 'rgba(124, 219, 107, 0.12)' },
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
          // White section to match screenshot’s clean layout
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
            <Typography sx={{ color: T.accent, fontWeight: 900, fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Community Portal
            </Typography>
            <Typography sx={{ color: T.primary, fontWeight: 900, fontSize: { xs: '1.35rem', md: '1.65rem' }, mt: 0.8 }}>
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
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    boxShadow: '0 12px 36px rgba(15,23,42,0.12)',
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                    animation: 'cardPop 0.6s ease both',
                    '&:hover': { transform: 'translateY(-8px)', boxShadow: '0 20px 54px rgba(15,23,42,0.18)' },
                    '&:active': { transform: 'translateY(-4px)' },
                  }}
                >
                  <Box sx={{ height: 160, backgroundImage: `url(${role.bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                    <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(2,6,23,0.08), rgba(2,6,23,0.38))' }} />
                    <Box sx={{ position: 'absolute', bottom: -24, left: '50%', transform: 'translateX(-50%)', width: 56, height: 56, borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 24px rgba(0,0,0,0.22)', border: '3px solid #e8f5e9' }}>{role.icon}</Box>
                  </Box>
                  <CardContent sx={{ pt: 5, pb: 3, textAlign: 'center', px: 3 }}>
                    <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: T.primary, letterSpacing: '0.08em', mb: 1 }}>{role.label}</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#555', mb: 2.5, lineHeight: 1.5 }}>{role.description}</Typography>
                    <Button variant="contained" onClick={(e) => { e.stopPropagation(); onRoleSelect(role.key); }}
                    sx={{
                      backgroundColor: T.primary,
                      color: 'white',
                      borderRadius: 999,
                      px: 3,
                      py: 0.9,
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      textTransform: 'none',
                      boxShadow: '0 10px 20px rgba(15,90,42,0.22)',
                      '&:hover': { backgroundColor: T.dark, transform: 'translateY(-1px)' },
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
                <MapIcon sx={{ fontSize: 26, color: T.accent }} />
              </Box>
              <Box>
                <Typography sx={{ color: T.primary, fontWeight: 700, fontSize: '1rem' }}>Not a resident yet?</Typography>
                <Typography sx={{ color: 'rgba(15, 23, 42, 0.64)', fontSize: '0.84rem', fontWeight: 600 }}>
                  Browse available lots on the interactive village map — no account needed.
                </Typography>
              </Box>
            </Box>
            <Button variant="outlined" startIcon={<MapIcon />} onClick={onBrowseLots}
              sx={{
                borderColor: T.primary,
                color: T.primary,
                borderRadius: 999,
                px: 3,
                py: 1.05,
                fontWeight: 900,
                fontSize: '0.85rem',
                textTransform: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                '&:hover': { backgroundColor: 'rgba(15, 90, 42, 0.06)', borderColor: T.dark },
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
                      <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: 'rgba(15, 90, 42, 0.12)', color: T.primary, fontSize: '0.65rem', fontWeight: 900, display: 'grid', placeItems: 'center' }}>+</Box>
                      <Typography sx={{ color: '#1f2937', fontWeight: 700, fontSize: '0.72rem' }}>{f.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ maxWidth: 430, ml: { xs: 0, md: 'auto' } }}>
                  <Box component="img" src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=900&q=80" alt="Model house" sx={{ width: '100%', height: { xs: 170, md: 210 }, objectFit: 'cover', borderRadius: 3, boxShadow: '0 16px 32px rgba(0,0,0,0.18)' }} />
                  <Box sx={{ mt: 1.3, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.1 }}>
                    <Box component="img" src="https://images.unsplash.com/photo-1448630360428-65456885c650?w=600&q=80" alt="Park" sx={{ width: '100%', height: 88, objectFit: 'cover', borderRadius: 2.4, boxShadow: '0 10px 24px rgba(0,0,0,0.14)' }} />
                    <Box component="img" src="https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=80" alt="Community homes" sx={{ width: '100%', height: 88, objectFit: 'cover', borderRadius: 2.4, boxShadow: '0 10px 24px rgba(0,0,0,0.14)' }} />
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ mt: { xs: 5, md: 7 } }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: 2 }}>
              <Box>
                <Typography sx={{ color: T.accent, fontWeight: 900, fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  Stay informed
                </Typography>
                <Typography sx={{ color: '#0f172a', fontWeight: 900, fontSize: { xs: '1.25rem', md: '1.45rem' }, mt: 0.8 }}>
                  Latest announcements
                </Typography>
              </Box>
              <Button
                variant="text"
                onClick={() => scrollTo(announcementRef)}
                sx={{ color: T.primary, fontWeight: 900, textTransform: 'none', '&:hover': { bgcolor: 'rgba(15, 90, 42, 0.06)' } }}
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
                      boxShadow: '0 12px 32px rgba(15,23,42,0.10)',
                      '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 18px 44px rgba(15,23,42,0.16)' },
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
                      <Typography sx={{ mt: 1.6, color: T.primary, fontWeight: 900, fontSize: '0.8rem' }}>
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
      <Box sx={{ backgroundColor: T.bg }}>
        {/* Announcements */}
        <Box ref={announcementRef} sx={{ py: { xs: 6, md: 10 } }}>
          <Container maxWidth="lg">
            <Reveal>
              <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: T.primary, textTransform: 'uppercase', mb: 1 }}>
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
              <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: T.primary, textTransform: 'uppercase', mb: 1 }}>
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
                      <Box sx={{ backgroundColor: T.primary, pt: 4, pb: 6, position: 'relative' }}>
                        <Avatar sx={{ width: 80, height: 80, mx: 'auto', backgroundColor: T.accent, color: T.dark, fontSize: '1.4rem', fontWeight: 900, border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                          {official.avatar}
                        </Avatar>
                      </Box>
                      <Box sx={{ mt: -4, position: 'relative', zIndex: 2, px: 2, pb: 3 }}>
                        <Box sx={{ backgroundColor: 'white', borderRadius: 3, p: 2.5, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                          <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem', mb: 0.5 }}>{official.name}</Typography>
                          <Typography sx={{ color: T.primary, fontSize: '0.78rem', fontWeight: 700, mb: 1.5 }}>{official.position}</Typography>
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
              <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: T.primary, textTransform: 'uppercase', mb: 1 }}>
                Contact Us
              </Typography>
              <Typography sx={{ color: '#556', mb: 5, maxWidth: 760, lineHeight: 1.8 }}>
                Questions or concerns? Reach out to the Westville Casimiro Homes administration.
              </Typography>
            </Reveal>
            <Reveal delayMs={80}>
              <ContactPage onClose={() => {}} embedded />
            </Reveal>
          </Container>
        </Box>

        {/* About */}
        <Box ref={aboutRef} sx={{ backgroundColor: '#fff' }}>
          <Container maxWidth="lg" sx={{ pt: { xs: 6, md: 10 } }}>
            <Reveal>
              <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: T.primary, textTransform: 'uppercase', mb: 1 }}>
                About Us
              </Typography>
              <Typography sx={{ color: '#556', mb: 5, maxWidth: 760, lineHeight: 1.8 }}>
                Learn more about Westville Casimiro Homes, our mission, and what we value as a community.
              </Typography>
            </Reveal>
          </Container>
          <Reveal delayMs={80}>
            <AboutUsPage onClose={() => {}} embedded />
          </Reveal>
        </Box>

        <Box sx={{ backgroundColor: '#0b5d91', color: 'white', px: { xs: 2, md: 6 }, py: 1, fontSize: '0.72rem', fontWeight: 700 }}>
          This is a temporary development preview, and these links are not for public use. Publish your site to secure sharing or use an invite link.
        </Box>

        {/* Calendar (inline) */}
        <Box ref={calendarSectionRef} sx={{ py: { xs: 6, md: 10 }, backgroundColor: T.bg }}>
          <Container maxWidth="lg">
            <Reveal>
              <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: T.primary, textTransform: 'uppercase', mb: 1 }}>
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
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const hubColors = {
    deep: '#061b10',
    forest: '#0b3d1f',
    green: '#166534',
    lime: '#86efac',
    softLime: '#dcfce7',
    textDark: '#0f172a',
    textMuted: '#64748b',
    border: 'rgba(255,255,255,0.16)'
  };

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

  useEffect(() => {
    const handleMouseMove = (event) => {
      const x = (event.clientX - window.innerWidth / 2) / window.innerWidth;
      const y = (event.clientY - window.innerHeight / 2) / window.innerHeight;
      setMouse({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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

  const inputSx = {
    ...noRedErrorFieldSx,
    '& .MuiInputLabel-root': {
      color: 'rgba(255,255,255,0.64)',
      fontWeight: 700
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: hubColors.lime
    },
    '& .MuiInputBase-input': {
      color: 'white',
      fontWeight: 700
    },
    '& .MuiFormHelperText-root': {
      color: 'rgba(255,255,255,0.62)',
      fontWeight: 600
    },
    '& .MuiOutlinedInput-root': {
      borderRadius: '16px',
      background: 'rgba(255,255,255,0.075)',
      backdropFilter: 'blur(16px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
      transition: 'transform 0.2s ease, background-color 0.2s ease',
      '& fieldset': {
        borderColor: 'rgba(255,255,255,0.14)'
      },
      '&:hover': {
        background: 'rgba(255,255,255,0.095)',
        transform: 'translateY(-1px)'
      },
      '&:hover fieldset': {
        borderColor: 'rgba(134,239,172,0.42)'
      },
      '&.Mui-focused fieldset': {
        borderColor: hubColors.lime,
        borderWidth: 1.5
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, md: 3 },
        py: { xs: 3, md: 5 },
        background: hubColors.deep,
        '@keyframes fadeUpSoft': {
          from: { opacity: 0, transform: 'translateY(18px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '@keyframes floatSoft': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        '@keyframes glowPulse': {
          '0%, 100%': { opacity: 0.42 },
          '50%': { opacity: 0.72 },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*': { animation: 'none !important', transition: 'none !important' },
        },
      }}
    >
              <Box
          sx={{
            position: 'absolute',
            inset: -24,
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: `translate(${mouse.x * 14}px, ${mouse.y * 14}px) scale(1.06)`,
            filter: 'brightness(0.75)',
            transition: 'transform 180ms ease-out'
          }}
        />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(90deg, rgba(2,6,23,0.92) 0%, rgba(6,27,16,0.86) 42%, rgba(6,27,16,0.66) 100%),
                       radial-gradient(circle at 16% 12%, rgba(134,239,172,0.24), transparent 30%),
                       radial-gradient(circle at 86% 20%, rgba(34,197,94,0.18), transparent 32%)`,
          animation: 'glowPulse 7s ease-in-out infinite'
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.16,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
          transform: `translate(${mouse.x * -8}px, ${mouse.y * -8}px)`,
          transition: 'transform 180ms ease-out'
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          bottom: '9%',
          right: '8%',
          width: 240,
          height: 240,
          borderRadius: '999px',
          border: '1px solid rgba(255,255,255,0.13)',
          background: 'radial-gradient(circle, rgba(34,197,94,0.22), rgba(255,255,255,0.035), transparent 72%)',
          transform: `translate(${mouse.x * -38}px, ${mouse.y * -38}px)`,
          animation: 'floatSoft 8s ease-in-out infinite',
          display: { xs: 'none', md: 'block' }
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
        <Grid container spacing={{ xs: 3, md: 5 }} alignItems="center" justifyContent="center">
          <Grid item xs={12} md={6.4}>
            <Box sx={{ color: 'white', animation: 'fadeUpSoft 0.65s ease' }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => { setSelectedRole(null); setErrors({}); setFormData({ email: '', password: '' }); }}
                sx={{
                  mb: 3,
                  color: 'rgba(255,255,255,0.88)',
                  borderRadius: '14px',
                  textTransform: 'none',
                  fontWeight: 900,
                  px: 1.6,
                  py: 0.9,
                  bgcolor: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(12px)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.12)',
                    transform: 'translateX(-2px)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                Back to Home
              </Button>

              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.35,
                  py: 0.8,
                  borderRadius: '999px',
                  bgcolor: 'rgba(134,239,172,0.12)',
                  border: '1px solid rgba(134,239,172,0.20)',
                  color: hubColors.lime,
                  fontSize: '0.76rem',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  mb: 2
                }}
              >
                <HomeIcon sx={{ fontSize: 16 }} />
                Westville Community Hub
              </Box>

              <Typography
                sx={{
                  fontSize: { xs: '2.5rem', md: '4rem' },
                  lineHeight: 0.96,
                  fontWeight: 950,
                  letterSpacing: '-0.06em',
                  maxWidth: 620,
                  textShadow: '0 22px 50px rgba(0,0,0,0.42)'
                }}
              >
                Casimiro Westville Homes.
              </Typography>

              <Typography
                sx={{
                  mt: 2.3,
                  color: 'rgba(255,255,255,0.74)',
                  fontSize: { xs: '0.98rem', md: '1.05rem' },
                  lineHeight: 1.75,
                  maxWidth: 560,
                  fontWeight: 500
                }}
              >
                Access your {roleInfo.label.toLowerCase()} portal, manage community services, monitor updates, and stay connected with Casimiro Westville Homes.
              </Typography>

              <Grid container spacing={1.4} sx={{ mt: 3.2, maxWidth: 560 }}>
                {[
                  { value: '24/7', label: 'Community access' },
                  { value: 'Secure', label: 'Role-based portal' },
                  { value: 'Live', label: 'Village updates' },
                ].map((item) => (
                  <Grid item xs={12} sm={4} key={item.label}>
                    <Box
                      sx={{
                        p: 1.6,
                        borderRadius: '18px',
                        bgcolor: 'rgba(255,255,255,0.075)',
                        border: '1px solid rgba(255,255,255,0.11)',
                        backdropFilter: 'blur(14px)'
                      }}
                    >
                      <Typography sx={{ color: 'white', fontWeight: 950, fontSize: '1.15rem', lineHeight: 1 }}>
                        {item.value}
                      </Typography>
                      <Typography sx={{ mt: 0.55, color: 'rgba(255,255,255,0.62)', fontWeight: 700, fontSize: '0.76rem' }}>
                        {item.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>

          <Grid item xs={12} md={5.6}>
            <Paper
              sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: { xs: '26px', md: '32px' },
                p: { xs: 2.4, sm: 3, md: 3.5 },
                background: 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.075))',
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: '0 32px 90px rgba(0,0,0,0.42)',
                backdropFilter: 'blur(28px)',
                animation: 'fadeUpSoft 0.8s ease',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  background: 'radial-gradient(circle at top right, rgba(134,239,172,0.18), transparent 36%)',
                  pointerEvents: 'none'
                }
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, mb: 2.4 }}>
                  <Box
                    sx={{
                      width: 54,
                      height: 54,
                      borderRadius: '18px',
                      background: 'linear-gradient(135deg, rgba(134,239,172,0.95), rgba(34,197,94,0.86))',
                      color: '#052e16',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 14px 34px rgba(34,197,94,0.24)',
                      border: '1px solid rgba(255,255,255,0.28)'
                    }}
                  >
                  <Box
                      component="img"
                      src={villageLogo}
                      alt="Westville Logo"
                      sx={{
                        width: 54,
                        height: 54,
                        borderRadius: '16px',
                        objectFit: 'cover',
                        border: '1px solid rgba(255,255,255,0.25)',
                        boxShadow: '0 10px 24px rgba(0,0,0,0.3)'
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.58)', fontSize: '0.74rem', letterSpacing: '0.12em', fontWeight: 900, textTransform: 'uppercase' }}>
                      {roleInfo.label} Access
                    </Typography>
                    <Typography sx={{ color: 'white', fontWeight: 950, fontSize: { xs: '1.6rem', md: '1.85rem' }, lineHeight: 1.05 }}>
                      Sign in securely
                    </Typography>
                  </Box>
                </Box>

                <Typography sx={{ color: 'rgba(255,255,255,0.66)', fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.6, mb: 2.6 }}>
                  Continue to your personalized dashboard and manage your community tools.
                </Typography>

                {isLocked && (
                  <Alert
                    severity="warning"
                    sx={{
                      mb: 2,
                      borderRadius: '16px',
                      bgcolor: 'rgba(245,158,11,0.14)',
                      color: '#fde68a',
                      border: '1px solid rgba(245,158,11,0.22)',
                      '& .MuiAlert-icon': { color: '#fbbf24' }
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
                      mb: 2,
                      borderRadius: '16px',
                      bgcolor: 'rgba(245,158,11,0.14)',
                      color: '#fde68a',
                      border: '1px solid rgba(245,158,11,0.22)',
                      '& .MuiAlert-icon': { color: '#fbbf24' }
                    }}
                  >
                    {errors.submit}
                  </Alert>
                )}
                {errors.submit?.includes('pending admin approval') && (
                  <Alert
                    severity="warning"
                    sx={{
                      mb: 2,
                      borderRadius: '16px',
                      bgcolor: 'rgba(245,158,11,0.14)',
                      color: '#fde68a',
                      border: '1px solid rgba(245,158,11,0.22)',
                      '& .MuiAlert-icon': { color: '#fbbf24' }
                    }}
                    icon={<TimeIcon />}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 800, mb: 0.5 }}>Account Pending Approval</Typography>
                    <Typography variant="caption">Your registration is awaiting admin approval.</Typography>
                  </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit}>
                  <TextField
                    sx={inputSx}
                    fullWidth
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    error={!!errors.email}
                    helperText={errors.email}
                    margin="normal"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: 'rgba(255,255,255,0.58)', fontSize: 20 }} /></InputAdornment>,
                    }}
                  />
                  <TextField
                    sx={inputSx}
                    fullWidth
                    label="Password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    error={!!errors.password}
                    helperText={errors.password}
                    margin="normal"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><KeyIcon sx={{ color: 'rgba(255,255,255,0.58)', fontSize: 20 }} /></InputAdornment>,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                            sx={{ color: 'rgba(255,255,255,0.68)', '&:hover': { color: hubColors.lime }, '&:active': { transform: 'scale(0.96)' }, transition: 'all 0.15s ease' }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, mt: 1.2, mb: 2.2 }}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', fontWeight: 700 }}>
                      Protected community portal
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setShowForgotPassword(true)}
                      sx={{
                        color: hubColors.lime,
                        textTransform: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 900,
                        borderRadius: '999px',
                        '&:hover': { bgcolor: 'rgba(134,239,172,0.10)' }
                      }}
                    >
                      Forgot Password?
                    </Button>
                  </Box>

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading || isLocked}
                    sx={{
                      background: 'linear-gradient(135deg, #86efac 0%, #22c55e 52%, #16a34a 100%)',
                      color: '#052e16',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #bbf7d0 0%, #4ade80 52%, #22c55e 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 18px 44px rgba(34,197,94,0.28)'
                      },
                      '&:active': { transform: 'translateY(1px) scale(0.99)' },
                      py: 1.55,
                      borderRadius: '16px',
                      fontWeight: 950,
                      fontSize: '1rem',
                      textTransform: 'none',
                      boxShadow: '0 16px 34px rgba(34,197,94,0.22)',
                      transition: 'all 0.18s ease'
                    }}
                  >
                    {loading ? <CircularProgress size={22} color="inherit" /> : `Enter ${roleInfo.label} Portal`}
                  </Button>

                  {selectedRole === 'resident' && (
                    <>
                      <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.13)' }}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.52)', fontWeight: 800 }}>New to the community portal?</Typography>
                      </Divider>
                      <Button
                        component={Link}
                        to="/register"
                        fullWidth
                        variant="outlined"
                        sx={{
                          borderColor: 'rgba(134,239,172,0.36)',
                          color: hubColors.lime,
                          py: 1.25,
                          borderRadius: '16px',
                          fontWeight: 900,
                          textTransform: 'none',
                          '&:hover': {
                            backgroundColor: 'rgba(134,239,172,0.10)',
                            borderColor: hubColors.lime,
                            transform: 'translateY(-1px)'
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Register as Resident
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            </Paper>

            <Typography sx={{ textAlign: 'center', mt: 2.8, color: 'rgba(255,255,255,0.48)', fontSize: '0.78rem', fontWeight: 600 }}>
              © {new Date().getFullYear()} Westville Casimiro Homes. All rights reserved.
            </Typography>
          </Grid>
        </Grid>
      </Container>

      <Dialog
        open={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        PaperProps={{
          sx: {
            borderRadius: '24px',
            overflow: 'hidden',
            background: '#f8fafc',
            boxShadow: '0 24px 70px rgba(15,23,42,0.24)'
          }
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 950,
            color: 'white',
            background: 'linear-gradient(135deg, #0f172a 0%, #14532d 100%)',
            p: 2.5
          }}
        >
          Reset Password
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body2" sx={{ mb: 2, color: hubColors.textMuted, fontWeight: 600 }}>Enter your email and we'll send you a reset link.</Typography>
          <TextField
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '14px',
                backgroundColor: 'white'
              }
            }}
            fullWidth
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" /></InputAdornment> }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc', borderTop: '1px solid rgba(15,23,42,0.08)' }}>
          <Button onClick={() => setShowForgotPassword(false)} sx={{ textTransform: 'none', fontWeight: 800, borderRadius: '12px', color: hubColors.textMuted }}>Cancel</Button>
          <Button
            onClick={handleForgotPassword}
            variant="contained"
            sx={{ backgroundColor: hubColors.green, borderRadius: '12px', textTransform: 'none', fontWeight: 900, '&:hover': { bgcolor: hubColors.forest } }}
            disabled={forgotLoading}
          >
            {forgotLoading ? <CircularProgress size={20} color="inherit" /> : 'Send Reset Link'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login;
