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
  // Palette tuned to match your screenshot’s green overlay + navbar
  dark: '#0b3d1f',      // deepest green (hero overlay / nav depth)
  primary: '#0f5a2a',   // main green (sections)
  light: '#2f8f46',     // mid green (hero / highlights)
  accent: '#7CDB6B',    // bright CTA green
  bg: '#f6faf7',        // clean off-white background
};

const ROLES = [
  { key: 'admin', label: 'ADMIN', description: 'Manages the system, resident records, and community information.', icon: <AdminIcon sx={{ fontSize: 40, color: T.primary }} />, bgImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80' },
  { key: 'resident', label: 'RESIDENT', description: 'Access personal information, community updates, and services.', icon: <HomeIcon sx={{ fontSize: 40, color: T.primary }} />, bgImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80' },
  { key: 'security', label: 'SECURITY', description: 'Monitors entries and helps keep the community safe.', icon: <ShieldIcon sx={{ fontSize: 40, color: T.primary }} />, bgImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
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
  <Box sx={{ position: 'relative', height: { xs: 260, md: 360 }, backgroundImage: 'url(https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=1400&q=80)', backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', '&::after': { content: '""', position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(20,50,5,0.65) 0%, rgba(20,50,5,0.80) 100%)' } }}>
    <BackBtn onClose={onClose} />
    <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center', px: 3 }}>
      <Typography sx={{ fontSize: { xs: '2rem', md: '3rem' }, fontWeight: 900, color: 'white', textTransform: 'uppercase', lineHeight: 1.1, textShadow: '0 2px 20px rgba(0,0,0,0.5)', mb: 1.5 }}>{title}</Typography>
      {subtitle && <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: { xs: '0.85rem', md: '1rem' }, maxWidth: 600, mx: 'auto', lineHeight: 1.7 }}>{subtitle}</Typography>}
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

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: HOME
// ═══════════════════════════════════════════════════════════════════════════════
const HomePage = ({ onClose, onRoleSelect, onBrowseLots }) => (
  <Box sx={{ minHeight: '100vh', backgroundColor: T.bg }}>
    <PageHero title="Welcome to Westville" subtitle="Your dream community in Paranaque City — where families thrive, safety is guaranteed, and every home tells a story." onClose={onClose} />

    {/* Quick Links */}
    <Box sx={{ backgroundColor: T.primary, py: 4 }}>
      <Container maxWidth="lg">
        <Grid container spacing={3} justifyContent="center">
          {[
            { label: 'Login as Admin', icon: <AdminIcon />, role: 'admin' },
            { label: 'Login as Resident', icon: <HomeIcon />, role: 'resident' },
            { label: 'Login as Security', icon: <ShieldIcon />, role: 'security' },
          ].map((item) => (
            <Grid item xs={12} sm={4} key={item.role}>
              <Button fullWidth variant="outlined" startIcon={item.icon} onClick={() => { onClose(); onRoleSelect(item.role); }}
                sx={{ borderColor: 'rgba(255,255,255,0.4)', color: 'white', borderRadius: 2, py: 1.5, fontWeight: 600, textTransform: 'none', fontSize: '0.9rem', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: T.accent, color: T.accent } }}>
                {item.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>

    {/* About Summary */}
    <Box sx={{ py: { xs: 6, md: 10 } }}>
      <Container maxWidth="lg">
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box component="img" src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=700&q=80" alt="Westville" sx={{ width: '100%', borderRadius: 3, boxShadow: '0 12px 40px rgba(0,0,0,0.15)', height: { xs: 240, md: 360 }, objectFit: 'cover' }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: T.primary, mb: 2, textTransform: 'uppercase' }}>A Community You Can Call Home</Typography>
            <Typography sx={{ color: '#444', lineHeight: 1.8, mb: 2 }}>Westville Casimiro Homes is a premier gated residential community located in Paranaque City, designed to provide families with a safe, comfortable, and thriving environment.</Typography>
            <Typography sx={{ color: '#444', lineHeight: 1.8, mb: 3 }}>Our community is managed through our Village Information Management System (VIMS) — ensuring transparent governance, efficient visitor management, and seamless resident services.</Typography>
            <Grid container spacing={2}>
              {[['500+', 'Homeowners'], ['24/7', 'Security'], ['10+', 'Years'], ['100%', 'Dedicated']].map(([n, l]) => (
                <Grid item xs={6} key={l}>
                  <Box sx={{ textAlign: 'center', p: 2, backgroundColor: T.bg, borderRadius: 2, border: `1px solid rgba(45,80,22,0.15)` }}>
                    <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: T.primary }}>{n}</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>{l}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>

    {/* Browse Lots CTA */}
    <Box sx={{ backgroundColor: T.primary, py: { xs: 5, md: 7 }, textAlign: 'center' }}>
      <Typography sx={{ color: 'white', fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 900, mb: 2 }}>Interested in a Home at Westville?</Typography>
      <Typography sx={{ color: 'rgba(255,255,255,0.75)', mb: 4, fontSize: '0.95rem' }}>Browse available lots on our interactive village map — no account needed.</Typography>
      <Button variant="contained" startIcon={<MapIcon />} onClick={() => { onClose(); onBrowseLots(); }}
        sx={{ backgroundColor: T.accent, color: T.dark, fontWeight: 700, px: 4, py: 1.5, borderRadius: 5, fontSize: '0.9rem', textTransform: 'none', '&:hover': { backgroundColor: '#b8e05a' } }}>
        Browse Available Lots
      </Button>
    </Box>
    <PageFooter />
  </Box>
);

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════════════════════
const ANNOUNCEMENTS = [
  { id: 1, category: 'Security', date: 'March 10, 2026', title: 'Enhanced Gate Security Protocol Starting April 2026', body: 'Effective April 1, 2026, all visitors must present a valid government-issued ID and be registered in our VIMS visitor portal before entry. Homeowners are requested to pre-register expected visitors through the resident portal. QR code stickers will also be distributed for faster vehicle entry.', color: '#ef4444' },
  { id: 2, category: 'Maintenance', date: 'March 8, 2026', title: 'Scheduled Water Service Interruption – March 15, 2026', body: 'Water service will be temporarily interrupted on March 15, 2026 from 8:00 AM to 5:00 PM due to scheduled maintenance of the main water line on Casimiro Street. All residents are advised to store sufficient water. We apologize for the inconvenience.', color: '#f59e0b' },
  { id: 3, category: 'Community', date: 'March 5, 2026', title: 'Westville Clean-Up Drive – March 22, 2026', body: 'Join us for our quarterly community clean-up drive on March 22, 2026 at 7:00 AM. Meet at the main clubhouse. Gloves, garbage bags, and refreshments will be provided. All residents and their families are encouraged to participate. Let us keep our community clean and beautiful!', color: T.light },
  { id: 4, category: 'HOA', date: 'February 28, 2026', title: 'HOA General Assembly – April 5, 2026', body: 'The Homeowners Association General Assembly will be held on April 5, 2026 at 3:00 PM at the Westville Clubhouse. Topics include annual financial report, proposed community improvements, and election of new board members. All homeowners are strongly encouraged to attend.', color: '#3b82f6' },
  { id: 5, category: 'Event', date: 'February 20, 2026', title: 'Westville Summer Sports Fest – April 12–13, 2026', body: 'Get ready for our annual Summer Sports Fest! Events include basketball, volleyball, badminton, and swimming competitions. Registration is open from March 1–31, 2026. Contact the HOA office or message our official Facebook page to register your team. Prizes await the winners!', color: '#8b5cf6' },
  { id: 6, category: 'Advisory', date: 'February 15, 2026', title: 'Reminder: No Loud Noise After 10:00 PM', body: 'As a reminder to all residents, the community noise ordinance prohibits loud music, parties, and other disruptive activities after 10:00 PM on weekdays and 11:00 PM on weekends. Violations may result in fines as stipulated in the Deed of Restrictions. Thank you for your cooperation.', color: '#64748b' },
];

const AnnouncementPage = ({ onClose }) => {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('All');
  const categories = ['All', 'Security', 'Maintenance', 'Community', 'HOA', 'Event', 'Advisory'];
  const filtered = filter === 'All' ? ANNOUNCEMENTS : ANNOUNCEMENTS.filter(a => a.category === filter);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f9f9f9' }}>
      <PageHero title="Announcements" subtitle="Stay updated with the latest news, advisories, and events from Westville Casimiro Homes." onClose={onClose} />

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}>
        {/* Filter chips */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 4 }}>
          {categories.map(c => (
            <Chip key={c} label={c} onClick={() => setFilter(c)}
              sx={{ fontWeight: 600, cursor: 'pointer', backgroundColor: filter === c ? T.primary : 'white', color: filter === c ? 'white' : T.primary, border: `1px solid ${T.primary}`, '&:hover': { backgroundColor: filter === c ? T.dark : '#e8f5e9' } }} />
          ))}
        </Box>

        <Grid container spacing={3}>
          {filtered.map((ann) => (
            <Grid item xs={12} md={6} key={ann.id}>
              <Card onClick={() => setSelected(ann)} sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'all 0.25s', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 10px 32px rgba(0,0,0,0.14)' }, borderLeft: `5px solid ${ann.color}` }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip label={ann.category} size="small" sx={{ backgroundColor: ann.color + '20', color: ann.color, fontWeight: 700, fontSize: '0.7rem' }} />
                    <Typography sx={{ fontSize: '0.75rem', color: '#888' }}>{ann.date}</Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem', mb: 1, lineHeight: 1.4 }}>{ann.title}</Typography>
                  <Typography sx={{ color: '#666', fontSize: '0.82rem', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ann.body}</Typography>
                  <Typography sx={{ color: T.primary, fontSize: '0.78rem', fontWeight: 600, mt: 1.5, cursor: 'pointer' }}>Read more →</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        {selected && <>
          <Box sx={{ backgroundColor: selected.color, p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Chip label={selected.category} size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 700, mb: 1 }} />
                <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.4 }}>{selected.title}</Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem', mt: 0.5 }}>{selected.date}</Typography>
              </Box>
              <IconButton onClick={() => setSelected(null)} sx={{ color: 'white', mt: -1, mr: -1 }}><ArrowBackIcon /></IconButton>
            </Box>
          </Box>
          <DialogContent sx={{ p: 3 }}>
            <Typography sx={{ color: '#444', lineHeight: 1.8, fontSize: '0.92rem' }}>{selected.body}</Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setSelected(null)} variant="contained" sx={{ backgroundColor: T.primary, borderRadius: 2, textTransform: 'none' }}>Close</Button>
          </DialogActions>
        </>}
      </Dialog>

      <PageFooter />
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: OFFICIALS
// ═══════════════════════════════════════════════════════════════════════════════
const OFFICIALS = [
  { name: 'Eduardo M. Santos', position: 'HOA President', description: 'Leads the Homeowners Association in promoting community welfare, overseeing governance, and representing residents in all official matters.', avatar: 'ES', dept: 'Executive Board' },
  { name: 'Maria Luisa R. Cruz', position: 'HOA Vice President', description: 'Assists the HOA President and oversees community programs, including environmental projects and resident welfare initiatives.', avatar: 'MC', dept: 'Executive Board' },
  { name: 'Jose Antonio B. Reyes', position: 'HOA Secretary', description: 'Manages official correspondence, maintains community records, and handles documentation for all HOA meetings and resolutions.', avatar: 'JR', dept: 'Executive Board' },
  { name: 'Cynthia L. Flores', position: 'HOA Treasurer', description: 'Oversees the collection of HOA dues, manages community funds, and prepares financial reports for the general assembly.', avatar: 'CF', dept: 'Executive Board' },
  { name: 'Roberto D. Mercado', position: 'Security Committee Head', description: 'Coordinates all security operations including guard schedules, CCTV monitoring, visitor management, and emergency response.', avatar: 'RM', dept: 'Security Committee' },
  { name: 'Angelica P. Torres', position: 'Facilities & Maintenance Head', description: 'Oversees maintenance of community facilities, roads, drainage, landscaping, and common areas within the village.', avatar: 'AT', dept: 'Maintenance Committee' },
  { name: 'Dennis F. Garcia', position: 'Community Relations Officer', description: 'Handles resident concerns, mediates disputes, and organizes community events and programs to strengthen neighborly bonds.', avatar: 'DG', dept: 'Community Relations' },
  { name: 'Patricia V. Lim', position: 'IT & Systems Coordinator', description: 'Manages the Village Information Management System (VIMS), resident portal, and all digital infrastructure of the community.', avatar: 'PL', dept: 'IT Committee' },
];

const OfficialsPage = ({ onClose }) => {
  const depts = [...new Set(OFFICIALS.map(o => o.dept))];
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: T.bg }}>
      <PageHero title="Community Officials" subtitle="Meet the dedicated leaders of Westville Casimiro Homes who work tirelessly to serve and protect our community." onClose={onClose} />

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        {depts.map(dept => (
          <Box key={dept} sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box sx={{ width: 4, height: 32, backgroundColor: T.primary, borderRadius: 2 }} />
              <Typography sx={{ fontSize: '1.2rem', fontWeight: 800, color: T.primary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dept}</Typography>
            </Box>
            <Grid container spacing={3}>
              {OFFICIALS.filter(o => o.dept === dept).map((official) => (
                <Grid item xs={12} sm={6} md={3} key={official.name}>
                  <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center', p: 0, overflow: 'hidden', transition: 'transform 0.25s', '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 12px 36px rgba(0,0,0,0.14)' } }}>
                    <Box sx={{ backgroundColor: T.primary, pt: 4, pb: 6, position: 'relative' }}>
                      <Avatar sx={{ width: 80, height: 80, mx: 'auto', backgroundColor: T.accent, color: T.dark, fontSize: '1.4rem', fontWeight: 900, border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                        {official.avatar}
                      </Avatar>
                    </Box>
                    <Box sx={{ mt: -4, position: 'relative', zIndex: 2, px: 2, pb: 3 }}>
                      <Box sx={{ backgroundColor: 'white', borderRadius: 3, p: 2.5, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
                        <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem', mb: 0.5 }}>{official.name}</Typography>
                        <Typography sx={{ color: T.primary, fontSize: '0.78rem', fontWeight: 600, mb: 1.5 }}>{official.position}</Typography>
                        <Typography sx={{ color: '#666', fontSize: '0.76rem', lineHeight: 1.5 }}>{official.description}</Typography>
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        ))}
      </Container>
      <PageFooter />
    </Box>
  );
};

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

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f9f9f9' }}>
      <PageHero title="Contact Us" subtitle="Have a question, concern, or suggestion? We'd love to hear from you. Reach out to the Westville Casimiro Homes administration." onClose={onClose} />

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
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
                      <TextField fullWidth label="Full Name" value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: '' }); }}
                        error={!!errors.name} helperText={errors.name} InputProps={{ sx: { borderRadius: 2 } }} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField fullWidth label="Email Address" value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setErrors({ ...errors, email: '' }); }}
                        error={!!errors.email} helperText={errors.email} InputProps={{ sx: { borderRadius: 2 } }} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth label="Subject" value={form.subject} onChange={e => { setForm({ ...form, subject: e.target.value }); setErrors({ ...errors, subject: '' }); }}
                        error={!!errors.subject} helperText={errors.subject} InputProps={{ sx: { borderRadius: 2 } }} />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth label="Message" multiline rows={5} value={form.message} onChange={e => { setForm({ ...form, message: e.target.value }); setErrors({ ...errors, message: '' }); }}
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
    <PageFooter />
  </Box>
);

// ═══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const LandingPage = ({ onRoleSelect, onBrowseLots }) => {
  const [page, setPage] = useState(null); // 'home' | 'announcement' | 'officials' | 'contact' | 'about'
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const calendarRef = useRef(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (calendarRef.current && !calendarRef.current.contains(e.target)) setShowCalendar(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Route to sub-pages
  if (page === 'home') return <HomePage onClose={() => setPage(null)} onRoleSelect={onRoleSelect} onBrowseLots={onBrowseLots} />;
  if (page === 'announcement') return <AnnouncementPage onClose={() => setPage(null)} />;
  if (page === 'officials') return <OfficialsPage onClose={() => setPage(null)} />;
  if (page === 'contact') return <ContactPage onClose={() => setPage(null)} />;
  if (page === 'about') return <AboutUsPage onClose={() => setPage(null)} />;

  const navItem = (label, key) => (
    <Typography
      key={key}
      onClick={() => setPage(key)}
      sx={{
        color: 'rgba(255,255,255,0.88)',
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        cursor: 'pointer',
        '&:hover': { color: T.accent },
        transition: 'color 0.2s'
      }}
    >
      {label}
    </Typography>
  );

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
          bottom: { xs: '54%', md: '45%' },
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=1600&q=80)',
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
            // overlay aligned with screenshot: dark green wash + readable text
            background: `linear-gradient(
              to bottom,
              rgba(11, 61, 31, 0.55) 0%,
              rgba(11, 61, 31, 0.78) 55%,
              rgba(11, 61, 31, 0.92) 88%,
              ${T.dark} 100%
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
              background: `linear-gradient(135deg, ${T.light}, ${T.primary})`,
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
          {navItem('HOME', 'home')}
          {navItem('ANNOUNCEMENT', 'announcement')}
          {navItem('OFFICIALS', 'officials')}
          {navItem('CONTACT', 'contact')}
          {navItem('ABOUT US', 'about')}

          {/* Calendar */}
          <Box ref={calendarRef} sx={{ position: 'relative' }}>
            <Typography onClick={() => setShowCalendar(!showCalendar)}
              sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer', '&:hover': { color: T.accent }, transition: 'color 0.2s' }}>
              CALENDAR
            </Typography>

            {showCalendar && (
              <Box sx={{ position: 'absolute', top: '160%', right: 0, width: 280, backgroundColor: 'white', borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.25)', p: 2, zIndex: 999, border: '1px solid rgba(45,80,22,0.15)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <IconButton size="small" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
                    <ArrowBackIcon fontSize="small" sx={{ color: T.primary }} />
                  </IconButton>
                  <Typography sx={{ fontWeight: 700, color: T.primary, fontSize: '0.9rem' }}>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</Typography>
                  <IconButton size="small" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
                    <ArrowBackIcon fontSize="small" sx={{ color: T.primary, transform: 'rotate(180deg)' }} />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <Typography key={d} sx={{ textAlign: 'center', fontSize: '0.68rem', fontWeight: 700, color: '#888' }}>{d}</Typography>)}
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                  {(() => {
                    const yr = currentDate.getFullYear(), mo = currentDate.getMonth();
                    const first = new Date(yr, mo, 1).getDay();
                    const days = new Date(yr, mo + 1, 0).getDate();
                    const td = new Date();
                    const cells = [];
                    for (let i = 0; i < first; i++) cells.push(<Box key={`e${i}`} />);
                    for (let d = 1; d <= days; d++) {
                      const isT = d === td.getDate() && mo === td.getMonth() && yr === td.getFullYear();
                      cells.push(<Box key={d} sx={{ textAlign: 'center', py: '5px', borderRadius: '50%', backgroundColor: isT ? T.primary : 'transparent', color: isT ? 'white' : '#333', fontSize: '0.78rem', fontWeight: isT ? 700 : 400, cursor: 'pointer', '&:hover': { backgroundColor: isT ? T.dark : '#e8f5e9' } }}>{d}</Box>);
                    }
                    return cells;
                  })()}
                </Box>
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '0.72rem', color: '#888' }}>Today: {new Date().toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}</Typography>
                  <Button size="small" onClick={() => setShowCalendar(false)} sx={{ color: T.primary, fontSize: '0.72rem', textTransform: 'none', fontWeight: 600 }}>Close</Button>
                </Box>
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
                setPage(i.key);
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
          Your Dream Life<br />Awaits In Westville Homes
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', mb: 3, maxWidth: 500, lineHeight: 1.6 }}>
          Standing the test of time, Westville has grown from an innovative real estate developer into a strong name in the industry, continuously building quality homes and vibrant communities.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="contained"
            onClick={() => setPage('about')}
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
            <Typography sx={{ color: 'white', fontWeight: 900, fontSize: { xs: '1.35rem', md: '1.65rem' }, mt: 0.8 }}>
              Who are you logging in as?
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontWeight: 600, fontSize: '0.9rem', mt: 0.6 }}>
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
                      boxShadow: '0 10px 20px rgba(15,90,42,0.30)',
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
          <Box sx={{ mt: 4, borderTop: '1px solid rgba(255,255,255,0.12)', pt: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2, px: { xs: 0, md: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 52, height: 52, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapIcon sx={{ fontSize: 26, color: T.accent }} />
              </Box>
              <Box>
                <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>Not a resident yet?</Typography>
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

          {/* Extra sections to match a professional landing */}
          <Box sx={{ mt: { xs: 5, md: 7 } }}>
            <Grid container spacing={2.5}>
              {[
                { k: '200+', l: 'Total lots', sub: 'across the village' },
                { k: '45', l: 'Active residents', sub: 'currently registered' },
                { k: '98%', l: 'Collection rate', sub: 'monthly dues' },
                { k: '4.9', l: 'Community rating', sub: 'resident feedback' },
              ].map((s) => (
                <Grid item xs={6} md={3} key={s.l}>
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      p: 2.25,
                      bgcolor: '#ffffff',
                      border: '1px solid rgba(15, 23, 42, 0.08)',
                      boxShadow: '0 14px 32px rgba(15, 23, 42, 0.06)',
                      color: '#0f172a',
                      animation: 'fadeUpSoft 0.85s ease',
                    }}
                  >
                    <Typography sx={{ fontWeight: 900, fontSize: '1.55rem', lineHeight: 1, color: T.dark }}>{s.k}</Typography>
                    <Typography sx={{ mt: 0.75, fontWeight: 900, color: '#0f172a', fontSize: '0.9rem' }}>{s.l}</Typography>
                    <Typography sx={{ mt: 0.35, fontWeight: 700, color: 'rgba(15, 23, 42, 0.60)', fontSize: '0.78rem' }}>{s.sub}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box sx={{ mt: { xs: 5, md: 7 } }}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 4,
                p: { xs: 2.5, md: 3.25 },
                bgcolor: '#ffffff',
                border: '1px solid rgba(15, 23, 42, 0.08)',
                boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)',
              }}
            >
              <Typography sx={{ color: T.accent, fontWeight: 900, fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                What we offer
              </Typography>
              <Typography sx={{ color: '#0f172a', fontWeight: 900, fontSize: { xs: '1.25rem', md: '1.45rem' }, mt: 1 }}>
                A complete community living experience
              </Typography>
              <Typography sx={{ color: 'rgba(15, 23, 42, 0.62)', fontWeight: 700, fontSize: '0.9rem', mt: 0.8, maxWidth: 880 }}>
                Our Village Information Management System (VIMS) gives residents and staff a smooth, secure way to manage day-to-day community services.
              </Typography>

              <Box sx={{ mt: 2.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {[
                  { label: 'Visitor Management' },
                  { label: 'Service Requests' },
                  { label: 'Announcements' },
                  { label: 'Payments & Dues' },
                  { label: 'Verification & Approvals' },
                  { label: 'Reports & Scheduling' },
                ].map((f) => (
                  <Chip
                    key={f.label}
                    label={f.label}
                    sx={{
                      bgcolor: 'rgba(15, 90, 42, 0.06)',
                      color: T.dark,
                      fontWeight: 800,
                      border: '1px solid rgba(15, 90, 42, 0.10)',
                      borderRadius: 999,
                      '& .MuiChip-label': { px: 1.1, py: 0.1 },
                      transition: 'transform 0.2s ease, background-color 0.2s ease',
                      '&:hover': { bgcolor: 'rgba(124, 219, 107, 0.20)', transform: 'translateY(-1px)' },
                    }}
                  />
                ))}
              </Box>
            </Paper>
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
                onClick={() => setPage('announcement')}
                sx={{ color: T.primary, fontWeight: 900, textTransform: 'none', '&:hover': { bgcolor: 'rgba(15, 90, 42, 0.06)' } }}
              >
                View all
              </Button>
            </Box>

            <Grid container spacing={2.5}>
              {ANNOUNCEMENTS.slice(0, 3).map((ann) => (
                <Grid item xs={12} md={4} key={ann.id}>
                  <Card
                    onClick={() => setPage('announcement')}
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
    </Box>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN
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
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const themeColors = { primary: T.primary, primaryDark: T.dark, textPrimary: '#1e293b', textSecondary: '#64748b' };

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
    const result = await login(formData.email, formData.password);
    if (result.success) { localStorage.removeItem('loginAttempts'); localStorage.removeItem('lockTime'); setLoginAttempts(0); setTimeout(() => navigate('/dashboard'), 100); }
    else handleLoginFailed();
  };

  const formatTime = (s) => { if (!s) return '0:00'; return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`; };
  const roleInfo = ROLES.find(r => r.key === selectedRole);

  if (!selectedRole) return <LandingPage onRoleSelect={setSelectedRole} onBrowseLots={() => navigate('/lots')} />;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        // login background aligned with screenshot's deep green
        background: `radial-gradient(circle at 18% 12%, rgba(47,143,70,0.35), transparent 55%),
                     radial-gradient(circle at 82% 18%, rgba(124,219,107,0.22), transparent 60%),
                     linear-gradient(135deg, ${T.dark} 0%, ${T.primary} 55%, #137d3a 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
        position: 'relative',
        overflow: 'hidden',
        '@keyframes fadeUpSoft': {
          from: { opacity: 0, transform: 'translateY(14px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*': { animation: 'none !important', transition: 'none !important' },
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -110,
          right: -120,
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.045)',
          filter: 'blur(0px)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -170,
          left: -120,
          width: 520,
          height: 520,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.035)',
        },
      }}
    >
      <Container maxWidth="sm">
        <Button startIcon={<ArrowBackIcon />} onClick={() => { setSelectedRole(null); setErrors({}); setFormData({ email: '', password: '' }); }}
          sx={{
            color: 'rgba(255,255,255,0.86)',
            mb: 3,
            borderRadius: 999,
            textTransform: 'none',
            fontWeight: 800,
            px: 2,
            py: 0.9,
            bgcolor: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            '&:hover': { color: 'white', backgroundColor: 'rgba(255,255,255,0.10)' },
            '&:active': { transform: 'translateY(1px) scale(0.99)' },
            transition: 'transform 0.15s ease',
          }}>
          Back to Home
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.3)' }}>
            {React.cloneElement(roleInfo.icon, { sx: { fontSize: 28, color: 'white' } })}
          </Box>
          <Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', letterSpacing: '0.12em' }}>WESTVILLE CASIMIRO HOMES</Typography>
            <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '1.3rem' }}>{roleInfo.label} Login</Typography>
          </Box>
        </Box>

        <Paper
          sx={{
            borderRadius: 4,
            boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.16)',
            p: { xs: 3, md: 4 },
            backgroundColor: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            animation: 'fadeUpSoft 0.6s ease',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, color: themeColors.textPrimary, mb: 0.5 }}>Welcome back</Typography>
          <Typography variant="body2" sx={{ color: themeColors.textSecondary, mb: 3 }}>Sign in to your {roleInfo.label.toLowerCase()} account</Typography>

          {isLocked && <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }} icon={<SecurityIcon />}>Account locked. Try again in {formatTime(lockTimer)}</Alert>}
          {errors.submit && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{errors.submit}</Alert>}
          {errors.submit?.includes('pending admin approval') && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }} icon={<TimeIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Account Pending Approval</Typography>
              <Typography variant="caption">Your registration is awaiting admin approval.</Typography>
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
              margin="normal"
              InputLabelProps={{ sx: { fontWeight: 700 } }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: themeColors.textSecondary, fontSize: 20 }} /></InputAdornment>,
                sx: {
                  borderRadius: 3,
                  bgcolor: '#ffffff',
                  boxShadow: '0 10px 22px rgba(15, 23, 42, 0.05)',
                }
              }}
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              margin="normal"
              InputLabelProps={{ sx: { fontWeight: 700 } }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><KeyIcon sx={{ color: themeColors.textSecondary, fontSize: 20 }} /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                      sx={{ '&:active': { transform: 'scale(0.96)' }, transition: 'transform 0.12s ease' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 3,
                  bgcolor: '#ffffff',
                  boxShadow: '0 10px 22px rgba(15, 23, 42, 0.05)',
                }
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5, mb: 2 }}>
              <Button size="small" onClick={() => setShowForgotPassword(true)} sx={{ color: themeColors.primary, textTransform: 'none', fontSize: '0.8rem' }}>Forgot Password?</Button>
            </Box>
            <Button type="submit" fullWidth variant="contained" disabled={loading || isLocked}
              sx={{
                backgroundColor: themeColors.primary,
                '&:hover': { backgroundColor: themeColors.primaryDark, transform: 'translateY(-1px)' },
                '&:active': { transform: 'translateY(1px) scale(0.99)' },
                py: 1.5,
                borderRadius: 999,
                fontWeight: 900,
                fontSize: '1rem',
                textTransform: 'none',
                boxShadow: '0 16px 34px rgba(15, 90, 42, 0.28)',
                transition: 'transform 0.15s ease, background-color 0.15s ease',
              }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : `Sign In as ${roleInfo.label}`}
            </Button>

            {selectedRole === 'resident' && (
              <>
                <Divider sx={{ my: 2.5 }}><Typography variant="caption" sx={{ color: themeColors.textSecondary }}>Don't have an account?</Typography></Divider>
                <Button component={Link} to="/register" fullWidth variant="outlined"
                  sx={{ borderColor: themeColors.primary, color: themeColors.primary, py: 1.2, borderRadius: 2, fontWeight: 600, textTransform: 'none', '&:hover': { backgroundColor: themeColors.primary + '0a' } }}>
                  Register as Resident
                </Button>
              </>
            )}
          </Box>
        </Paper>

        <Typography sx={{ textAlign: 'center', mt: 3, color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
          © {new Date().getFullYear()} Westville Casimiro Homes. All rights reserved.
        </Typography>
      </Container>

      <Dialog open={showForgotPassword} onClose={() => setShowForgotPassword(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Reset Password</DialogTitle>
        <DialogContent sx={{ p: 3, pt: 1 }}>
          <Typography variant="body2" sx={{ mb: 2, color: themeColors.textSecondary }}>Enter your email and we'll send you a reset link.</Typography>
          <TextField fullWidth label="Email Address" type="email" name="email" value={formData.email} onChange={handleChange}
            InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" /></InputAdornment>, sx: { borderRadius: 2 } }} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowForgotPassword(false)}>Cancel</Button>
          <Button onClick={() => { alert(`Password reset link sent to ${formData.email}`); setShowForgotPassword(false); }} variant="contained" sx={{ backgroundColor: themeColors.primary, borderRadius: 2 }}>Send Reset Link</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login;