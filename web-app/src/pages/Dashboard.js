import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
  AppBar,
  Toolbar,
  Button,
  IconButton,
  Drawer,
  Menu,
  MenuItem,
  Badge,
  useTheme,
  useMediaQuery,
  Collapse,
  ListItemButton,
  CircularProgress
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Home as HomeIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  AdminPanelSettings as AdminIcon,
  Notifications as NotificationsIcon,
  QrCode as QrCodeIcon,
  Payment as PaymentIcon,
  Build as BuildIcon,
  Announcement as AnnouncementIcon,
  CheckCircle as CheckCircleIcon,
  Menu as MenuIcon,
  AccountCircle as AccountCircleIcon,
  Settings as SettingsIcon,
  Dashboard as DashboardIcon,
  Scanner as ScannerIcon,
  History as HistoryIcon,
  Assignment as AssignmentIcon,
  Receipt as ReceiptIcon,
  Group as GroupIcon,
  VerifiedUser as VerifiedUserIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  QrCodeScanner as QrCodeScannerIcon
} from '@mui/icons-material';

const themeColors = {
  primary: '#2224be',
  primaryLight: '#2224be',
  primaryDark: '#2224be',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  background: '#f8fafc',
  cardBackground: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  border: 'rgba(99, 102, 241, 0.1)'
};

const APPBAR_HEIGHT = 64;

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const { logout, getCurrentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const checkAuth = () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }
      setUser(currentUser);
      setLoading(false);
    };
    checkAuth();
  }, [getCurrentUser, navigate, location]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfileMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleProfileMenuClose = () => setAnchorEl(null);
  const handleSidebarToggle = () => setSidebarOpen(!sidebarOpen);
  const handleCloseSidebar = () => setSidebarOpen(false);
  const handleSectionToggle = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress sx={{ color: themeColors.primary }} />
        </Box>
      </Container>
    );
  }

  const roleConfig = {
    resident: {
      title: 'Resident Dashboard',
      icon: <HomeIcon />,
      color: '#1e88e5',
      features: {
        visitors: [{ title: 'Generate Visitor Pass', icon: <QrCodeIcon />, link: '/visitors' }],
        services: [{ title: 'Service Requests', icon: <BuildIcon />, link: '/service-requests' }],
        payments: [{ title: 'Pay Dues', icon: <PaymentIcon />, link: '/payments' }],
        community: [{ title: 'Announcements', icon: <AnnouncementIcon />, link: '/announcements' }],
        settings: [{ title: 'Profile Settings', icon: <SettingsIcon />, link: '/profile' }]
      },
      stats: [
        { label: 'Pending Visitors', value: '3' },
        { label: 'Due Amount', value: '₱1,500' },
        { label: 'Active Requests', value: '2' },
        { label: 'Unread Alerts', value: '5' }
      ]
    },
    admin: {
      title: 'Admin Dashboard',
      icon: <AdminIcon />,
      color: '#1976d2',
      features: {
        visitors: [{ title: 'Visitor Management', icon: <PeopleIcon />, link: '/admin/visitor-management' }],
        users: [
          { title: 'User Management', icon: <GroupIcon />, link: '/admin/users' },
          { title: 'Approval Requests', icon: <VerifiedUserIcon />, link: '/admin/approvals' }
        ],
        services: [{ title: 'Service Requests', icon: <BuildIcon />, link: '/admin/service-requests' }],
        finance: [
          { title: 'Payment Management', icon: <ReceiptIcon />, link: '/admin/payments' },
          { title: 'Financial Reports', icon: <ReceiptIcon />, link: '/admin/payments' }
        ],
        announcements: [{ title: 'Create Announcements', icon: <AnnouncementIcon />, link: '/admin/announcements' }],
        settings: [{ title: 'System Settings', icon: <SettingsIcon />, link: '/admin/settings' }]
      },
      stats: [
        { label: 'Total Residents', value: '45' },
        { label: 'Pending Approvals', value: '3' },
        { label: 'Monthly Collection', value: '₱45,000' },
        { label: 'Active Issues', value: '7' }
      ]
    },
    security: {
      title: 'Security Dashboard',
      icon: <SecurityIcon />,
      color: '#1565c0',
      features: {
        scanner: [{ title: 'QR Code Scanner', icon: <ScannerIcon />, link: '/security/scanner' }],
        visitors: [
          { title: 'Visitor Approvals', icon: <CheckCircleIcon />, link: '/security/visitor-approval' },
          { title: 'Visitor Logs', icon: <HistoryIcon />, link: '/security/visitor-logs' }
        ],
        patrol: [{ title: 'Patrol Schedule', icon: <AssignmentIcon />, link: '/security/schedule' }],
        services: [{ title: 'Service Requests', icon: <BuildIcon />, link: '/security/service-requests' }],
        incidents: [{ title: 'Incident Reports', icon: <AssignmentIcon />, link: '/security/incidents' }],
        settings: [{ title: 'Profile Settings', icon: <SettingsIcon />, link: '/profile' }]
      },
      stats: [
        { label: 'Visitors Today', value: '12' },
        { label: 'Active on Premises', value: '3' },
        { label: 'Pending Checkouts', value: '2' },
        { label: 'Alerts Today', value: '1' }
      ]
    }
  };

  const config = roleConfig[user.role] || roleConfig.resident;

  const recentActivities = [
    { text: 'New visitor pass generated', time: '10 min ago' },
    { text: 'Monthly dues payment received', time: '1 hour ago' },
    { text: 'Service request completed', time: '2 hours ago' },
    { text: 'Community meeting announced', time: '3 hours ago' }
  ];

  const accountInfo = [
    { label: 'Name', value: `${user.firstName} ${user.lastName}` },
    { label: 'Email', value: user.email },
    { label: 'Phone', value: user.phone || 'Not provided' },
    {
      label: 'Role',
      value: <Chip label={user.role} size="small" sx={{ bgcolor: config.color, color: 'white', textTransform: 'capitalize', fontWeight: 600 }} />
    },
    {
      label: 'Account Status',
      value: <Chip label={user.isApproved ? 'Approved' : 'Pending Approval'} size="small"
        sx={{ bgcolor: user.isApproved ? themeColors.success : themeColors.warning, color: 'white', fontWeight: 500 }} />
    }
  ];

  // ─── MINI SIDEBAR ────────────────────────────────────────────────────────────
  const miniSidebar = (
    <Box sx={{
      width: 64,
      height: '100%',
      bgcolor: '#1e293b',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      pt: `${APPBAR_HEIGHT}px`,
      pb: 2,
      overflowY: 'auto',
      overflowX: 'hidden'
    }}>
      <Avatar sx={{
        width: 40, height: 40, bgcolor: themeColors.primary, color: 'white',
        mt: 2, mb: 2, fontSize: '1rem', fontWeight: 600,
        boxShadow: `0 2px 8px ${themeColors.primary}40`
      }}>
        {user.firstName?.charAt(0)}
      </Avatar>

      <Divider sx={{ width: '70%', bgcolor: '#374151', mb: 2 }} />

      <IconButton
        component={RouterLink}
        to="/dashboard"
        sx={{ color: 'white', mb: 2, '&:hover': { bgcolor: '#374151', color: themeColors.primary } }}
        title="Dashboard"
      >
        <DashboardIcon />
      </IconButton>

      {Object.entries(config.features).slice(1, 4).map(([section, items]) => (
        <React.Fragment key={section}>
          {items.slice(0, 1).map((item, index) => (
            <IconButton
              key={index}
              component={RouterLink}
              to={item.link}
              sx={{ color: 'white', mb: 1, '&:hover': { bgcolor: '#374151', color: themeColors.primary } }}
              title={item.title}
            >
              {item.icon}
            </IconButton>
          ))}
        </React.Fragment>
      ))}

      <Box sx={{ flexGrow: 1 }} />
      <IconButton
        onClick={handleSidebarToggle}
        sx={{ color: 'white', '&:hover': { bgcolor: '#374151', color: themeColors.primary } }}
        title="Expand Menu"
      >
        <ChevronRightIcon />
      </IconButton>
    </Box>
  );

  // ─── FULL SIDEBAR ─────────────────────────────────────────────────────────────
  const fullSidebar = (
    <Box sx={{
      width: 280,
      height: '100%',
      bgcolor: '#1e293b',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      pt: `${APPBAR_HEIGHT}px`
    }}>
      {/* Sidebar Header */}
      <Box sx={{ p: 3, borderBottom: '1px solid #374151', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Avatar sx={{
            width: 48, height: 48, bgcolor: themeColors.primary, color: 'white',
            fontSize: '1.2rem', fontWeight: 600, boxShadow: `0 2px 8px ${themeColors.primary}40`
          }}>
            {user.firstName?.charAt(0)}
            {user.lastName?.charAt(0)}
          </Avatar>
          <IconButton onClick={handleCloseSidebar} sx={{ color: 'white', '&:hover': { bgcolor: '#374151' } }}>
            <ChevronLeftIcon />
          </IconButton>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
          {user.firstName} {user.lastName}
        </Typography>
        <Chip
          label={user.role.toUpperCase()}
          size="small"
          sx={{ bgcolor: themeColors.primary, color: 'white', mt: 0.5, fontWeight: 'bold', fontSize: '0.7rem' }}
        />
        {user.houseNumber && (
          <Typography variant="caption" sx={{ mt: 0.5, color: '#94a3b8', display: 'block' }}>
            House {user.houseNumber}
          </Typography>
        )}
      </Box>

      {/* Scrollable Nav */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', p: 2 }}>
        {Object.entries(config.features).map(([section, items]) => (
          <Box key={section} sx={{ mb: 1 }}>
            {items.length > 1 ? (
              <>
                <ListItemButton
                  onClick={() => handleSectionToggle(section)}
                  sx={{
                    color: 'white', borderRadius: 1, mb: 0.5, px: 2, py: 1,
                    '&:hover': { bgcolor: '#374151', color: themeColors.primary }
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                    {items[0].icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={section.charAt(0).toUpperCase() + section.slice(1)}
                    primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 'medium' }}
                  />
                  {expandedSections[section] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </ListItemButton>
                <Collapse in={expandedSections[section]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {items.map((item, index) => (
                      <ListItem
                        key={index}
                        component={RouterLink}
                        to={item.link}
                        sx={{
                          color: 'white', borderRadius: 1, mb: 0.5, pl: 4, py: 1,
                          '&:hover': { bgcolor: '#374151', color: themeColors.primary },
                          textDecoration: 'none'
                        }}
                        onClick={() => { if (isMobile) setSidebarOpen(false); }}
                      >
                        <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.title} primaryTypographyProps={{ fontSize: '0.85rem' }} />
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </>
            ) : (
              <ListItem
                component={RouterLink}
                to={items[0].link}
                sx={{
                  color: 'white', borderRadius: 1, mb: 0.5, px: 2, py: 1,
                  '&:hover': { bgcolor: '#374151', color: themeColors.primary },
                  textDecoration: 'none'
                }}
                onClick={() => { if (isMobile) setSidebarOpen(false); }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{items[0].icon}</ListItemIcon>
                <ListItemText
                  primary={section.charAt(0).toUpperCase() + section.slice(1)}
                  primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 'medium' }}
                />
              </ListItem>
            )}
          </Box>
        ))}
      </Box>

      {/* Footer — pinned to bottom */}
      <Box sx={{ p: 2, borderTop: '1px solid #374151', flexShrink: 0 }}>
        <Chip
          icon={<CheckCircleIcon />}
          label="System OK"
          size="small"
          sx={{ bgcolor: themeColors.primary, color: 'white', fontSize: '0.7rem', width: '100%', mb: 1 }}
        />
        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', textAlign: 'center' }}>
          VIMS v2.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      {/* TOP NAV BAR */}
      <AppBar position="fixed" sx={{
        zIndex: theme.zIndex.drawer + 1,
        bgcolor: 'white',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        borderBottom: `1px solid ${themeColors.border}`
      }}>
        <Toolbar>
          <IconButton
            edge="start"
            onClick={handleSidebarToggle}
            sx={{ mr: 2, color: themeColors.textPrimary, '&:hover': { bgcolor: themeColors.primary + '10' } }}
          >
            {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>

          <Typography variant="h6" sx={{
            flexGrow: 1, fontWeight: 700, color: themeColors.textPrimary,
            background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.primaryLight})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Dashboard
          </Typography>

          <IconButton sx={{ mr: 2, color: themeColors.textPrimary, '&:hover': { bgcolor: themeColors.primary + '10' } }}>
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton edge="end" onClick={handleProfileMenuOpen} sx={{ ml: 1, '&:hover': { transform: 'scale(1.05)', transition: 'transform 0.2s' } }}>
            <Avatar sx={{ width: 40, height: 40, bgcolor: themeColors.primary, fontSize: '1rem', fontWeight: 600, boxShadow: `0 2px 8px ${themeColors.primary}40` }}>
              {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            PaperProps={{ sx: { width: 240, mt: 1.5, borderRadius: 2, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', border: `1px solid ${themeColors.border}` } }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disabled sx={{ opacity: 1, py: 1.5 }}>
              <ListItemIcon>
                <Avatar sx={{ width: 32, height: 32, bgcolor: themeColors.primary, fontSize: '0.9rem' }}>
                  {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                </Avatar>
              </ListItemIcon>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: themeColors.textPrimary }}>
                  {user.firstName} {user.lastName}
                </Typography>
                <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                  {user.role} • {user.houseNumber || 'No house'}
                </Typography>
              </Box>
            </MenuItem>
            <Divider sx={{ my: 1 }} />
            <MenuItem component={RouterLink} to="/dashboard" onClick={handleProfileMenuClose} sx={{ py: 1.5 }}>
              <ListItemIcon><QrCodeScannerIcon fontSize="small" sx={{ color: themeColors.primary }} /></ListItemIcon>
              <Typography variant="body2">Dashboard</Typography>
            </MenuItem>
            <MenuItem component={RouterLink} to="/profile" onClick={handleProfileMenuClose} sx={{ py: 1.5 }}>
              <ListItemIcon><SettingsIcon fontSize="small" sx={{ color: themeColors.primary }} /></ListItemIcon>
              <Typography variant="body2">Profile Settings</Typography>
            </MenuItem>
            <Divider sx={{ my: 1 }} />
            <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: themeColors.error, '&:hover': { bgcolor: themeColors.error + '10' } }}>
              <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: themeColors.error }} /></ListItemIcon>
              <Typography variant="body2">Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* SIDEBAR DRAWER */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={sidebarOpen}
        onClose={handleCloseSidebar}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: sidebarOpen ? 280 : 64,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: sidebarOpen ? 280 : 64,
            boxSizing: 'border-box',
            bgcolor: '#1e293b',
            borderRight: '1px solid #374151',
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        {sidebarOpen ? fullSidebar : miniSidebar}
      </Drawer>

      {/* MAIN CONTENT */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          ml: { xs: 0, md: sidebarOpen ? '280px' : '64px' },
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          backgroundColor: themeColors.background,
          minHeight: '100vh'
        }}
      >
        <Toolbar />

        <Container maxWidth="lg" sx={{ py: 4 }}>
          {/* HEADER */}
          <Paper sx={{
            p: 3, mb: 4, bgcolor: themeColors.primary, color: 'white', borderRadius: 3,
            boxShadow: '0 8px 30px rgba(34, 36, 190, 0.3)',
            border: `1px solid ${themeColors.primary}40`,
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 40px rgba(34, 36, 190, 0.4)' }
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'white', color: themeColors.primary, width: 56, height: 56, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {config.icon}
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{config.title}</Typography>
                  <Typography sx={{ opacity: 0.9, mt: 0.5 }}>
                    Welcome back, {user.firstName} {user.lastName}
                    {user.houseNumber && ` • House ${user.houseNumber}`}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* STATS */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {config.stats.map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card sx={{
                  height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                  border: `1px solid ${themeColors.border}`, backgroundColor: themeColors.cardBackground,
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }
                }}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, color: themeColors.primary, fontFeatureSettings: '"tnum"' }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: themeColors.textSecondary, fontWeight: 500 }}>
                      {stat.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* WELCOME MESSAGE */}
          <Paper sx={{
            p: 3, mb: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            border: `1px solid ${themeColors.border}`, backgroundColor: themeColors.cardBackground
          }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: themeColors.textPrimary }}>
              Welcome to VIMS
            </Typography>
            <Typography variant="body1" sx={{ color: themeColors.textSecondary, mb: 2 }}>
              {user.role === 'resident' && 'Manage your visitor passes, service requests, and community payments all in one place. Use the menu on the left to access all features.'}
              {user.role === 'admin' && 'Monitor system activities, manage users, and oversee all community operations. Expand the sidebar to access all admin tools.'}
              {user.role === 'security' && 'Handle visitor approvals, monitor security logs, and manage on-site activities. Click the menu icon to access security tools.'}
            </Typography>
            <Button
              variant="outlined"
              sx={{
                mt: 2, borderColor: themeColors.border, color: themeColors.textPrimary, fontWeight: 500,
                '&:hover': { borderColor: themeColors.primary, bgcolor: themeColors.primary + '08' }
              }}
              onClick={sidebarOpen ? handleCloseSidebar : handleSidebarToggle}
              startIcon={sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            >
              {sidebarOpen ? 'Hide Quick Actions' : 'Show Quick Actions'}
            </Button>
          </Paper>

          {/* ACTIVITIES + ACCOUNT INFO */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: `1px solid ${themeColors.border}`, backgroundColor: themeColors.cardBackground }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, color: themeColors.textPrimary }}>
                  <NotificationsIcon sx={{ color: themeColors.primary }} />
                  Recent Activities
                </Typography>
                <List>
                  {recentActivities.map((activity, index) => (
                    <React.Fragment key={index}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          <NotificationsIcon sx={{ color: themeColors.primary }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={activity.text}
                          secondary={activity.time}
                          primaryTypographyProps={{ variant: 'body2', color: themeColors.textPrimary }}
                          secondaryTypographyProps={{ variant: 'caption', color: themeColors.textSecondary }}
                        />
                      </ListItem>
                      {index < recentActivities.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: `1px solid ${themeColors.border}`, backgroundColor: themeColors.cardBackground }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, color: themeColors.textPrimary }}>
                  <AccountCircleIcon sx={{ color: themeColors.primary }} />
                  Account Information
                </Typography>
                <List>
                  {accountInfo.map((info, index) => (
                    <React.Fragment key={index}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemText
                          primary={info.label}
                          secondary={info.value}
                          primaryTypographyProps={{ variant: 'body2', color: themeColors.textPrimary, fontWeight: 500 }}
                          secondaryTypographyProps={{ component: 'div', sx: { mt: 0.5 } }}
                        />
                      </ListItem>
                      {index < accountInfo.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    size="small"
                    component={RouterLink}
                    to="/profile"
                    startIcon={<SettingsIcon />}
                    sx={{
                      bgcolor: themeColors.primary, borderRadius: 2, fontWeight: 600,
                      '&:hover': { bgcolor: themeColors.primaryDark, transform: 'translateY(-2px)', boxShadow: `0 8px 25px ${themeColors.primary}40` },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Update Profile
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* QUICK LINKS for mobile */}
          {isMobile && !sidebarOpen && (
            <Paper sx={{ p: 3, mt: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: `1px solid ${themeColors.border}`, backgroundColor: themeColors.cardBackground }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: themeColors.textPrimary }}>
                Quick Access
              </Typography>
              <Typography variant="body2" sx={{ color: themeColors.textSecondary, mb: 2 }}>
                Tap the menu icon in the top left to access all features
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={handleSidebarToggle}
                startIcon={<MenuIcon />}
                sx={{
                  bgcolor: themeColors.primary, borderRadius: 2, fontWeight: 600, py: 1.5,
                  '&:hover': { bgcolor: themeColors.primaryDark, transform: 'translateY(-2px)', boxShadow: `0 8px 25px ${themeColors.primary}40` },
                  transition: 'all 0.3s ease'
                }}
              >
                Open Menu
              </Button>
            </Paper>
          )}

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
              VIMS • {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Access • Version 2.0
            </Typography>
          </Box>
        </Container>
      </Box>
    </>
  );
};

export default Dashboard;