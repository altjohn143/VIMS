import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import villageLogo from '../assets/village-logo.png';

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
  NotificationsNone as NotificationsIcon,
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
  ChevronRight as ChevronRightIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  QrCodeScanner as QrCodeScannerIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  PersonAddAlt1 as PersonAddAlt1Icon,
  Campaign as CampaignIcon,
  ReportProblemOutlined as ReportProblemOutlinedIcon,
  ArrowOutward as ArrowOutwardIcon,
  Apartment as ApartmentIcon
} from '@mui/icons-material';
import axios from 'axios';

const themeColors = {
  primary: '#166534',
  primaryDark: '#14532d',
  primaryLight: '#22c55e',
  primarySoft: '#dcfce7',
  sidebar: '#146c34',
  sidebarDark: '#0f5a2a',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#0ea5e9',
  background: '#f3f5f7',
  cardBackground: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: 'rgba(15, 23, 42, 0.08)',
  muted: '#e5e7eb'
};

const APPBAR_HEIGHT = 72;
const SIDEBAR_WIDTH = 260;
const MINI_SIDEBAR_WIDTH = 82;

const screenFade = {
  '@keyframes screenFadeIn': {
    from: { opacity: 0, transform: 'translateY(14px)' },
    to: { opacity: 1, transform: 'translateY(0)' }
  },
  '@keyframes slideUpSoft': {
    from: { opacity: 0, transform: 'translateY(18px)' },
    to: { opacity: 1, transform: 'translateY(0)' }
  },
  '@keyframes cardPop': {
    from: { opacity: 0, transform: 'translateY(16px) scale(0.985)' },
    to: { opacity: 1, transform: 'translateY(0) scale(1)' }
  }
};

const statCardStyles = [
  {
    bg: 'linear-gradient(135deg, #2349d8 0%, #243fb8 100%)',
    light: 'rgba(255,255,255,0.16)',
    icon: <GroupIcon sx={{ fontSize: 56 }} />,
    accent: '#dbeafe'
  },
  {
    bg: 'linear-gradient(135deg, #18a34a 0%, #17803d 100%)',
    light: 'rgba(255,255,255,0.16)',
    icon: <VerifiedUserIcon sx={{ fontSize: 56 }} />,
    accent: '#dcfce7'
  },
  {
    bg: 'linear-gradient(135deg, #0986c8 0%, #0d6997 100%)',
    light: 'rgba(255,255,255,0.14)',
    icon: <ReceiptIcon sx={{ fontSize: 56 }} />,
    accent: '#dbeafe'
  },
  {
    bg: 'linear-gradient(135deg, #e02424 0%, #b91c1c 100%)',
    light: 'rgba(255,255,255,0.14)',
    icon: <ReportProblemOutlinedIcon sx={{ fontSize: 56 }} />,
    accent: '#fee2e2'
  }
];
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [remainingSessionMs, setRemainingSessionMs] = useState(SESSION_TIMEOUT_MS);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
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

  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  useEffect(() => {
    const getRemaining = () => {
      const lastActivityAt = Number(localStorage.getItem('lastActivityAt') || 0);
      if (!lastActivityAt) return SESSION_TIMEOUT_MS;
      return Math.max(0, SESSION_TIMEOUT_MS - (Date.now() - lastActivityAt));
    };

    setRemainingSessionMs(getRemaining());
    const intervalId = window.setInterval(() => {
      const remaining = getRemaining();
      setRemainingSessionMs(remaining);
      if (remaining <= 0) {
        handleLogout();
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [handleLogout]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const [countRes, listRes] = await Promise.all([
          axios.get('/api/notifications/unread-count'),
          axios.get('/api/notifications')
        ]);
        if (countRes.data?.success) setUnreadCount(countRes.data.count || 0);
        if (listRes.data?.success) {
          const feed = (listRes.data.data || []).slice(0, 4).map((n) => ({
            text: n.title,
            time: new Date(n.createdAt).toLocaleString()
          }));
          setRecentActivities(feed);
        }
      } catch (error) {
        setUnreadCount(0);
      }
    };
    loadNotifications();
  }, []);

  const handleProfileMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleProfileMenuClose = () => setAnchorEl(null);
  const handleSidebarToggle = () => setSidebarOpen((prev) => !prev);
  const handleCloseSidebar = () => setSidebarOpen(false);
  const handleSectionToggle = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
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
      subtitle: 'Your community tools and services in one place',
      icon: <HomeIcon />,
      color: '#1e88e5',
      features: {
        dashboard: [{ title: 'Dashboard', icon: <DashboardIcon />, link: '/dashboard' }],
        visitors: [{ title: 'Generate Visitor Pass', icon: <QrCodeIcon />, link: '/visitors' }],
        services: [{ title: 'Service Requests', icon: <BuildIcon />, link: '/service-requests' }],
        payments: [{ title: 'Pay Dues', icon: <PaymentIcon />, link: '/payments' }],
        community: [{ title: 'Announcements', icon: <AnnouncementIcon />, link: '/announcements' }],
        settings: [{ title: 'Profile Settings', icon: <SettingsIcon />, link: '/profile' }]
      },
      stats: [
        { label: 'Pending Visitors', value: '3', helper: '+1 today' },
        { label: 'Due Amount', value: '₱1,500', helper: 'due this month' },
        { label: 'Active Requests', value: '2', helper: 'in progress' },
        { label: 'Unread Alerts', value: '5', helper: 'check updates' }
      ]
    },
    admin: {
      title: 'Dashboard',
      subtitle: 'Casimiro Westville Homes',
      icon: <AdminIcon />,
      color: '#166534',
      features: {
        dashboard: [{ title: 'Dashboard', icon: <DashboardIcon />, link: '/dashboard' }],
        visitors: [{ title: 'Visitor Management', icon: <PeopleIcon />, link: '/admin/visitor-management' }],
        users: [
          { title: 'User Management', icon: <GroupIcon />, link: '/admin/users' },
          { title: 'Approval Requests', icon: <VerifiedUserIcon />, link: '/admin/approvals' }
        ],
        services: [{ title: 'Service Requests', icon: <BuildIcon />, link: '/admin/service-requests' }],
        finance: [
          { title: 'Payment Management', icon: <ReceiptIcon />, link: '/admin/payments' },
          { title: 'Financial Reports', icon: <PaymentIcon />, link: '/admin/payments' }
        ],
        announcements: [{ title: 'Create Announcements', icon: <AnnouncementIcon />, link: '/admin/announcements' }],
        settings: [
          { title: 'System Settings', icon: <SettingsIcon />, link: '/admin/settings' },
          { title: 'Verification Queue', icon: <VerifiedUserIcon />, link: '/admin/verifications' },
          { title: 'Reports Center', icon: <ReceiptIcon />, link: '/admin/reports' }
        ]
      },
      stats: [
        { label: 'Total Residents', value: '45', helper: '+2 vs. last month' },
        { label: 'Pending Approvals', value: '3', helper: '-1 since yesterday' },
        { label: 'Monthly Collection', value: '₱45K', helper: '+11% vs. last month' },
        { label: 'Active Issues', value: '7', helper: '+2 this week' }
      ]
    },
    security: {
      title: 'Security Dashboard',
      subtitle: 'Monitor visitors and on-site activity',
      icon: <SecurityIcon />,
      color: '#1565c0',
      features: {
        dashboard: [{ title: 'Dashboard', icon: <DashboardIcon />, link: '/dashboard' }],
        scanner: [{ title: 'QR Code Scanner', icon: <ScannerIcon />, link: '/security/scanner' }],
        visitors: [
          { title: 'Visitor Approvals', icon: <CheckCircleIcon />, link: '/security/visitor-approval' },
          { title: 'Visitor Logs', icon: <HistoryIcon />, link: '/security/visitor-logs' }
        ],
        patrol: [{ title: 'Patrol Schedule', icon: <AssignmentIcon />, link: '/security/schedule' }],
        services: [{ title: 'Service Requests', icon: <BuildIcon />, link: '/security/service-requests' }],
        incidents: [{ title: 'Incident Reports', icon: <AssignmentIcon />, link: '/security/incidents' }],
        settings: [
          { title: 'Profile Settings', icon: <SettingsIcon />, link: '/profile' },
          { title: 'Notifications', icon: <NotificationsIcon />, link: '/notifications' }
        ]
      },
      stats: [
        { label: 'Visitors Today', value: '12', helper: 'active movement' },
        { label: 'Active on Premises', value: '3', helper: 'currently inside' },
        { label: 'Pending Checkouts', value: '2', helper: 'for review' },
        { label: 'Alerts Today', value: '1', helper: 'needs attention' }
      ]
    }
  };

  const config = roleConfig[user.role] || roleConfig.resident;

  const sessionMinutes = Math.floor(remainingSessionMs / 60000);
  const sessionSeconds = Math.floor((remainingSessionMs % 60000) / 1000);

  const accountInfo = [
    { label: 'Name', value: `${user.firstName} ${user.lastName}` },
    { label: 'Email', value: user.email },
    { label: 'Phone', value: user.phone || 'Not provided' },
    {
      label: 'Role',
      value: (
        <Chip
          label={user.role}
          size="small"
          sx={{
            bgcolor: config.color,
            color: 'white',
            textTransform: 'capitalize',
            fontWeight: 700,
            borderRadius: '999px'
          }}
        />
      )
    },
    {
      label: 'Account Status',
      value: (
        <Chip
          label={user.isApproved ? 'Approved' : 'Pending Approval'}
          size="small"
          sx={{
            bgcolor: user.isApproved ? themeColors.success : themeColors.warning,
            color: 'white',
            fontWeight: 700,
            borderRadius: '999px'
          }}
        />
      )
    }
  ];

  const pendingApprovals = [
    { name: 'Carlos Mendoza', detail: 'Unit 3A • New Resident', date: 'Apr 2' },
    { name: 'Ana Reyes', detail: 'Unit 11C • Renovation Permit', date: 'Apr 1' },
    { name: 'James Lim', detail: 'Unit 7B • New Resident', date: 'Mar 31' }
  ];

  const quickActions = [
    {
      title: user.role === 'admin' ? 'Add New Resident' : 'Open Dashboard',
      subtitle: user.role === 'admin' ? 'Register a homeowner' : 'Go to main view',
      icon: <PersonAddAlt1Icon />,
      link: user.role === 'admin' ? '/admin/users' : '/dashboard'
    },
    {
      title: user.role === 'admin' ? 'Post Announcement' : 'View Announcements',
      subtitle: user.role === 'admin' ? 'Notify all residents' : 'Community updates',
      icon: <CampaignIcon />,
      link: user.role === 'admin' ? '/admin/announcements' : '/announcements'
    },
    {
      title: user.role === 'admin' ? 'Issue Visitor Access' : 'Visitor Pass',
      subtitle: user.role === 'admin' ? 'Grant temporary access' : 'Generate a visitor pass',
      icon: <QrCodeIcon />,
      link: user.role === 'admin' ? '/admin/visitor-management' : '/visitors'
    },
    {
      title: user.role === 'admin' ? 'Report an Issue' : 'Submit Request',
      subtitle: user.role === 'admin' ? 'Track active concerns' : 'Create a service request',
      icon: <BuildIcon />,
      link: user.role === 'admin' ? '/admin/service-requests' : '/service-requests'
    }
  ];

  const getSectionLabel = (section) => {
    const customLabels = {
      dashboard: 'Dashboard',
      visitors: 'Visitors',
      users: 'Users',
      services: 'Services',
      finance: 'Finance',
      announcements: 'Announcements',
      settings: 'Settings',
      scanner: 'Scanner',
      patrol: 'Patrol',
      incidents: 'Incidents',
      payments: 'Payments',
      community: 'Community'
    };
    return customLabels[section] || section.charAt(0).toUpperCase() + section.slice(1);
  };

  const getSectionIcon = (section, items) => {
    if (section === 'dashboard') return <DashboardIcon />;
    return items[0]?.icon || <ChevronRightIcon />;
  };

  const sidebarNav = (
    <Box
      sx={{
        width: sidebarOpen ? SIDEBAR_WIDTH : MINI_SIDEBAR_WIDTH,
        height: '100%',
        bgcolor: themeColors.sidebar,
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: 'linear-gradient(180deg, #166534 0%, #146c34 60%, #115e31 100%)'
      }}
    >
      <Box
        sx={{
          pt: `calc(${APPBAR_HEIGHT}px + 6px)`,
          px: sidebarOpen ? 2.25 : 1.25,
          pb: 2,
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        {sidebarOpen ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '14px',
                bgcolor: 'rgba(255,255,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
              }}
            >
              <Box
                component="img"
                src={villageLogo}
                alt="Village Logo"
                sx={{
                  width: '82%',
                  height: '82%',
                  objectFit: 'contain'
                }}
              />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  lineHeight: 1.1,
                  color: 'white',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Casimiro Westville
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.73rem',
                  color: 'rgba(255,255,255,0.72)',
                  fontWeight: 500
                }}
              >
                Homes • Admin Panel
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: '14px',
                bgcolor: 'rgba(255,255,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              <Box
                component="img"
                src={villageLogo}
                alt="Village Logo"
                sx={{
                  width: '80%',
                  height: '80%',
                  objectFit: 'contain'
                }}
              />
            </Box>
          </Box>
        )}
      </Box>

      <Box sx={{ px: sidebarOpen ? 2 : 1, py: 2 }}>
        {sidebarOpen ? (
          <Paper
            elevation={0}
            sx={{
              bgcolor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '18px',
              p: 1.5,
              color: 'white'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Avatar
                sx={{
                  width: 42,
                  height: 42,
                  bgcolor: 'rgba(255,255,255,0.18)',
                  fontWeight: 800
                }}
              >
                {user.firstName?.charAt(0)}
                {user.lastName?.charAt(0)}
              </Avatar>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    lineHeight: 1.1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {user.firstName} {user.lastName}
                </Typography>
                <Chip
                  label={user.role === 'admin' ? 'ADMIN' : user.role.toUpperCase()}
                  size="small"
                  sx={{
                    mt: 0.75,
                    height: 22,
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    bgcolor: '#d9f99d',
                    color: '#14532d',
                    borderRadius: '999px'
                  }}
                />
              </Box>
            </Box>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Avatar
              sx={{
                width: 42,
                height: 42,
                bgcolor: 'rgba(255,255,255,0.16)',
                fontWeight: 800
              }}
            >
              {user.firstName?.charAt(0)}
            </Avatar>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          px: sidebarOpen ? 1.25 : 0.75,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {Object.entries(config.features).map(([section, items]) => {
            const currentIcon = getSectionIcon(section, items);
            const sectionLabel = getSectionLabel(section);
            const hasChildren = items.length > 1;

            if (!sidebarOpen) {
              return (
                <ListItemButton
                  key={section}
                  component={RouterLink}
                  to={items[0].link}
                  onClick={() => {
                    if (isMobile) setSidebarOpen(false);
                  }}
                  sx={{
                    minHeight: 48,
                    justifyContent: 'center',
                    borderRadius: '14px',
                    color: 'rgba(255,255,255,0.88)',
                    '&:hover': {
                      bgcolor: 'rgba(255,255,255,0.10)'
                    }
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 'unset',
                      color: 'inherit'
                    }}
                  >
                    {currentIcon}
                  </ListItemIcon>
                </ListItemButton>
              );
            }

            return (
              <Box key={section}>
                {hasChildren ? (
                  <>
                    <ListItemButton
                      onClick={() => handleSectionToggle(section)}
                      sx={{
                        minHeight: 46,
                        borderRadius: '14px',
                        px: 1.5,
                        color: 'rgba(255,255,255,0.92)',
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.10)'
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>{currentIcon}</ListItemIcon>
                      <ListItemText
                        primary={sectionLabel}
                        primaryTypographyProps={{
                          fontSize: '0.93rem',
                          fontWeight: 700
                        }}
                      />
                      {expandedSections[section] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </ListItemButton>

                    <Collapse in={expandedSections[section]} timeout="auto" unmountOnExit>
                      <List disablePadding sx={{ mt: 0.5, mb: 0.5 }}>
                        {items.map((item, index) => (
                          <ListItemButton
                            key={index}
                            component={RouterLink}
                            to={item.link}
                            onClick={() => {
                              if (isMobile) setSidebarOpen(false);
                            }}
                            sx={{
                              ml: 1,
                              mr: 0.5,
                              minHeight: 42,
                              borderRadius: '12px',
                              px: 1.5,
                              color: 'rgba(255,255,255,0.82)',
                              '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.08)'
                              }
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}>{item.icon}</ListItemIcon>
                            <ListItemText
                              primary={item.title}
                              primaryTypographyProps={{
                                fontSize: '0.86rem',
                                fontWeight: 600
                              }}
                            />
                          </ListItemButton>
                        ))}
                      </List>
                    </Collapse>
                  </>
                ) : (
                  <ListItemButton
                    component={RouterLink}
                    to={items[0].link}
                    onClick={() => {
                      if (isMobile) setSidebarOpen(false);
                    }}
                    sx={{
                      minHeight: 48,
                      borderRadius: '14px',
                      px: 1.5,
                      color: section === 'dashboard' ? 'white' : 'rgba(255,255,255,0.9)',
                      bgcolor: section === 'dashboard' ? 'rgba(255,255,255,0.14)' : 'transparent',
                      boxShadow: section === 'dashboard' ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.10)'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>{currentIcon}</ListItemIcon>
                    <ListItemText
                      primary={sectionLabel}
                      primaryTypographyProps={{
                        fontSize: '0.93rem',
                        fontWeight: 700
                      }}
                    />
                    {section === 'dashboard' ? null : <KeyboardArrowRightIcon sx={{ opacity: 0.5 }} />}
                  </ListItemButton>
                )}
              </Box>
            );
          })}
        </List>
      </Box>

      <Box sx={{ px: sidebarOpen ? 1.75 : 1, pb: 2, pt: 1.5 }}>
        {sidebarOpen ? (
          <>
            <Paper
              elevation={0}
              sx={{
                bgcolor: 'rgba(255,255,255,0.10)',
                borderRadius: '14px',
                color: 'white',
                px: 1.5,
                py: 1.2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 1,
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 18, color: '#a7f3d0' }} />
              <Typography sx={{ fontSize: '0.84rem', fontWeight: 700 }}>System OK</Typography>
            </Paper>

            <Button
              onClick={handleLogout}
              fullWidth
              startIcon={<LogoutIcon />}
              sx={{
                justifyContent: 'flex-start',
                color: 'rgba(255,255,255,0.72)',
                borderRadius: '14px',
                px: 1.5,
                py: 1.15,
                textTransform: 'none',
                fontWeight: 700,
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.08)'
                }
              }}
            >
              Sign out
            </Button>
          </>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <IconButton
              sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' } }}
            >
              <CheckCircleIcon />
            </IconButton>
            <IconButton
              onClick={handleLogout}
              sx={{ color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
            >
              <LogoutIcon />
            </IconButton>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <Box sx={screenFade} />

      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(14px)',
          boxShadow: '0 6px 24px rgba(15, 23, 42, 0.06)',
          borderBottom: `1px solid ${themeColors.border}`,
          color: themeColors.textPrimary
        }}
      >
        <Toolbar sx={{ minHeight: `${APPBAR_HEIGHT}px !important`, px: { xs: 2, md: 3 } }}>
          <IconButton
            edge="start"
            onClick={handleSidebarToggle}
            sx={{
              mr: 1.5,
              color: themeColors.textPrimary,
              bgcolor: 'rgba(15,23,42,0.04)',
              border: `1px solid ${themeColors.border}`,
              '&:hover': { bgcolor: 'rgba(15,23,42,0.08)' }
            }}
          >
            {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexGrow: 1, minWidth: 0 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '12px',
                bgcolor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: '1px solid rgba(15,23,42,0.06)'
              }}
            >
              <Box
                component="img"
                src={villageLogo}
                alt="Village Logo"
                sx={{
                  width: '78%',
                  height: '78%',
                  objectFit: 'contain'
                }}
              />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1rem', md: '1.15rem' },
                  lineHeight: 1.1,
                  color: themeColors.textPrimary
                }}
              >
                {config.title}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.76rem',
                  color: themeColors.textSecondary,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {config.subtitle}
              </Typography>
            </Box>
          </Box>

          <Chip
            label={`Session ${sessionMinutes}:${String(sessionSeconds).padStart(2, '0')}`}
            size="small"
            sx={{
              mr: 2,
              fontWeight: 600,
              bgcolor: remainingSessionMs <= 5 * 60 * 1000 ? themeColors.warning : themeColors.info,
              color: 'white'
            }}
          />

          <IconButton component={RouterLink} to="/notifications" sx={{ mr: 2, color: themeColors.textPrimary, '&:hover': { bgcolor: themeColors.primary + '10' } }}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <Button
            onClick={handleProfileMenuOpen}
            sx={{
              textTransform: 'none',
              color: themeColors.textPrimary,
              borderRadius: '16px',
              px: 1,
              py: 0.5,
              minWidth: 0,
              border: `1px solid ${themeColors.border}`,
              bgcolor: 'rgba(255,255,255,0.75)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,1)',
                transform: 'translateY(-1px)'
              },
              transition: 'all 0.25s ease'
            }}
          >
            <Avatar
              sx={{
                width: 38,
                height: 38,
                mr: 1.1,
                bgcolor: themeColors.primary,
                fontWeight: 800,
                boxShadow: '0 6px 18px rgba(22,101,52,0.22)'
              }}
            >
              {user.firstName?.charAt(0)}
              {user.lastName?.charAt(0)}
            </Avatar>

            {!isMobile && (
              <Box sx={{ textAlign: 'left', mr: 0.5 }}>
                <Typography sx={{ fontSize: '0.92rem', fontWeight: 800, lineHeight: 1.1 }}>
                  {user.firstName} {user.lastName}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.73rem',
                    color: user.isApproved ? themeColors.success : themeColors.warning,
                    fontWeight: 700,
                    lineHeight: 1.1
                  }}
                >
                  ● {user.isApproved ? 'Approved' : 'Pending Approval'}
                </Typography>
              </Box>
            )}

            {!isMobile && <ExpandMoreIcon sx={{ color: themeColors.textSecondary }} />}
          </Button>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            PaperProps={{
              sx: {
                width: 260,
                mt: 1.5,
                borderRadius: 3,
                boxShadow: '0 18px 44px rgba(15,23,42,0.14)',
                border: `1px solid ${themeColors.border}`,
                overflow: 'hidden'
              }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disabled sx={{ opacity: 1, py: 1.75 }}>
              <ListItemIcon>
                <Avatar sx={{ width: 36, height: 36, bgcolor: themeColors.primary }}>
                  {user.firstName?.charAt(0)}
                  {user.lastName?.charAt(0)}
                </Avatar>
              </ListItemIcon>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800, color: themeColors.textPrimary }}>
                  {user.firstName} {user.lastName}
                </Typography>
                <Typography variant="caption" sx={{ color: themeColors.textSecondary, fontWeight: 600 }}>
                  {user.role} • {user.houseNumber || 'No house'}
                </Typography>
              </Box>
            </MenuItem>

            <Divider />

            <MenuItem component={RouterLink} to="/dashboard" onClick={handleProfileMenuClose} sx={{ py: 1.5 }}>
              <ListItemIcon>
                <QrCodeScannerIcon fontSize="small" sx={{ color: themeColors.primary }} />
              </ListItemIcon>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Dashboard</Typography>
            </MenuItem>

            <MenuItem component={RouterLink} to="/profile" onClick={handleProfileMenuClose} sx={{ py: 1.5 }}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" sx={{ color: themeColors.primary }} />
              </ListItemIcon>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Profile Settings</Typography>
            </MenuItem>

            <Divider />

            <MenuItem
              onClick={handleLogout}
              sx={{
                py: 1.5,
                color: themeColors.error,
                '&:hover': { bgcolor: 'rgba(239,68,68,0.06)' }
              }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" sx={{ color: themeColors.error }} />
              </ListItemIcon>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={sidebarOpen}
        onClose={handleCloseSidebar}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: sidebarOpen ? SIDEBAR_WIDTH : MINI_SIDEBAR_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: sidebarOpen ? SIDEBAR_WIDTH : MINI_SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            borderRight: 'none',
            overflowX: 'hidden',
            boxShadow: sidebarOpen ? '12px 0 32px rgba(15, 23, 42, 0.08)' : 'none',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen
            })
          }
        }}
      >
        {sidebarNav}
      </Drawer>

      <Box
        component="main"
        sx={{
          ...screenFade,
          flexGrow: 1,
          minHeight: '100vh',
          ml: { xs: 0, md: sidebarOpen ? `${SIDEBAR_WIDTH}px` : `${MINI_SIDEBAR_WIDTH}px` },
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen
          }),
          background: `
            radial-gradient(circle at top left, rgba(34,197,94,0.06), transparent 24%),
            radial-gradient(circle at top right, rgba(14,165,233,0.05), transparent 20%),
            ${themeColors.background}
          `
        }}
      >
        <Toolbar sx={{ minHeight: `${APPBAR_HEIGHT}px !important` }} />

        <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
          <Box
            sx={{
              animation: 'screenFadeIn 0.55s ease',
              borderRadius: '24px'
            }}
          >
            <Grid container spacing={2.25}>
              <Grid item xs={12}>
                <Paper
                  sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '22px',
                    minHeight: { xs: 220, md: 240 },
                    backgroundColor: '#0f172a',
                    border: `1px solid ${themeColors.border}`,
                    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)'
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url("https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1600&q=80")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />

                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(90deg, rgba(2,6,23,0.82) 0%, rgba(2,6,23,0.65) 38%, rgba(2,6,23,0.18) 68%, rgba(2,6,23,0.08) 100%)'
                    }}
                  />

                  <Grid container sx={{ position: 'relative', zIndex: 1, minHeight: { xs: 220, md: 240 } }}>
                    <Grid item xs={12} md={6.5}>
                      <Box
                        sx={{
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          p: { xs: 2.5, md: 3.5 },
                          color: 'white',
                          animation: 'slideUpSoft 0.65s ease'
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            color: '#4ade80',
                            textTransform: 'uppercase',
                            mb: 1.2
                          }}
                        >
                          Casimiro Westville Homes • Cavite
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: { xs: '1.75rem', md: '2.25rem' },
                            fontWeight: 900,
                            lineHeight: 1.05,
                            mb: 1
                          }}
                        >
                          Good morning, {user.firstName || 'Administrator'}
                        </Typography>

                        <Typography
                          sx={{
                            color: 'rgba(255,255,255,0.78)',
                            fontWeight: 500,
                            maxWidth: 520,
                            fontSize: { xs: '0.92rem', md: '1rem' }
                          }}
                        >
                          {new Date().toLocaleDateString(undefined, {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}{' '}
                          • Your community is running smoothly today.
                        </Typography>
                      </Box>
                    </Grid>

                    <Grid item xs={12} md={5.5}>
                      <Grid container sx={{ height: '100%' }}>
                        {config.stats.slice(0, 4).map((stat, index) => (
                          <Grid item xs={6} key={index}>
                            <Box
                              sx={{
                                height: '100%',
                                p: 2.5,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                borderLeft: { md: '1px solid rgba(255,255,255,0.10)' },
                                borderTop: {
                                  xs: index > 1 ? '1px solid rgba(255,255,255,0.10)' : 'none',
                                  md: index > 1 ? '1px solid rgba(255,255,255,0.10)' : 'none'
                                },
                                background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                                backdropFilter: 'blur(8px)'
                              }}
                            >
                              <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>
                                {stat.value}
                              </Typography>
                              <Typography sx={{ mt: 0.8, fontSize: '0.86rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                                {stat.label}
                              </Typography>
                              <Typography sx={{ mt: 1, fontSize: '0.76rem', color: '#86efac', fontWeight: 700 }}>
                                ↗ {stat.helper}
                              </Typography>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {config.stats.slice(0, 4).map((stat, index) => {
                const style = statCardStyles[index % statCardStyles.length];
                return (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <Card
                      sx={{
                        position: 'relative',
                        overflow: 'hidden',
                        minHeight: 166,
                        borderRadius: '20px',
                        color: 'white',
                        background: style.bg,
                        boxShadow: '0 16px 28px rgba(15,23,42,0.10)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        animation: `cardPop ${0.35 + index * 0.08}s ease`,
                        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 24px 40px rgba(15,23,42,0.16)'
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          width: 180,
                          height: 180,
                          borderRadius: '50%',
                          top: -72,
                          right: -52,
                          bgcolor: style.light
                        },
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          width: 90,
                          height: 90,
                          borderRadius: '50%',
                          top: 22,
                          right: 28,
                          bgcolor: 'rgba(255,255,255,0.06)'
                        }
                      }}
                    >
                      <CardContent
                        sx={{
                          position: 'relative',
                          zIndex: 1,
                          p: 2.25,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', opacity: 0.18 }}>
                          {style.icon}
                        </Box>

                        <Box>
                          <Typography sx={{ fontSize: '2.1rem', fontWeight: 900, lineHeight: 1 }}>
                            {stat.value}
                          </Typography>
                          <Typography sx={{ mt: 0.7, fontSize: '0.94rem', fontWeight: 700 }}>
                            {stat.label}
                          </Typography>
                          <Typography sx={{ mt: 1.2, fontSize: '0.78rem', color: style.accent, fontWeight: 700 }}>
                            ↗ {stat.helper}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}

              <Grid item xs={12} md={8.5}>
                <Paper
                  sx={{
                    borderRadius: '20px',
                    border: `1px solid ${themeColors.border}`,
                    boxShadow: '0 12px 26px rgba(15,23,42,0.06)',
                    overflow: 'hidden',
                    animation: 'slideUpSoft 0.65s ease'
                  }}
                >
                  <Box
                    sx={{
                      px: 2.5,
                      py: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      bgcolor: 'white'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '1.06rem', fontWeight: 900, color: themeColors.textPrimary }}>
                        Pending Approvals
                      </Typography>
                      <Chip
                        label="3 new"
                        size="small"
                        sx={{
                          bgcolor: themeColors.primarySoft,
                          color: themeColors.primary,
                          fontWeight: 800,
                          borderRadius: '999px'
                        }}
                      />
                    </Box>

                    <Button
                      component={RouterLink}
                      to={user.role === 'admin' ? '/admin/approvals' : '/dashboard'}
                      endIcon={<ArrowOutwardIcon />}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 800,
                        color: themeColors.primary
                      }}
                    >
                      View all
                    </Button>
                  </Box>

                  <Divider />

                  <Box sx={{ p: 1.5 }}>
                    {pendingApprovals.map((item, index) => (
                      <Box key={index}>
                        <Box
                          sx={{
                            px: 1,
                            py: 1.4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            flexWrap: { xs: 'wrap', sm: 'nowrap' }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                            <Avatar
                              sx={{
                                width: 42,
                                height: 42,
                                bgcolor: index % 2 === 0 ? '#fed7aa' : '#ddd6fe',
                                color: '#1f2937',
                                fontWeight: 800
                              }}
                            >
                              {item.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                            </Avatar>

                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 800, color: themeColors.textPrimary }}>
                                {item.name}
                              </Typography>
                              <Typography sx={{ fontSize: '0.84rem', color: themeColors.textSecondary, fontWeight: 500 }}>
                                {item.detail}
                              </Typography>
                            </Box>
                          </Box>

                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              ml: 'auto',
                              flexWrap: 'wrap'
                            }}
                          >
                            <Typography sx={{ fontSize: '0.82rem', color: themeColors.textSecondary, fontWeight: 600, mr: 1 }}>
                              {item.date}
                            </Typography>

                            <Button
                              size="small"
                              variant="contained"
                              sx={{
                                textTransform: 'none',
                                minWidth: 94,
                                borderRadius: '12px',
                                fontWeight: 800,
                                bgcolor: themeColors.primary,
                                boxShadow: '0 8px 18px rgba(22,101,52,0.20)',
                                '&:hover': {
                                  bgcolor: themeColors.primaryDark,
                                  transform: 'translateY(-1px)'
                                },
                                transition: 'all 0.2s ease'
                              }}
                            >
                              Approve
                            </Button>

                            <Button
                              size="small"
                              variant="outlined"
                              sx={{
                                textTransform: 'none',
                                minWidth: 88,
                                borderRadius: '12px',
                                fontWeight: 800,
                                color: '#94a3b8',
                                borderColor: '#e2e8f0',
                                '&:hover': {
                                  borderColor: '#cbd5e1',
                                  bgcolor: '#f8fafc'
                                }
                              }}
                            >
                              Decline
                            </Button>
                          </Box>
                        </Box>

                        {index < pendingApprovals.length - 1 && <Divider sx={{ mx: 1 }} />}
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={3.5}>
                <Paper
                  sx={{
                    borderRadius: '20px',
                    border: `1px solid ${themeColors.border}`,
                    boxShadow: '0 12px 26px rgba(15,23,42,0.06)',
                    overflow: 'hidden',
                    animation: 'slideUpSoft 0.75s ease'
                  }}
                >
                  <Box
                    sx={{
                      px: 2.25,
                      py: 2,
                      bgcolor: 'white'
                    }}
                  >
                    <Typography sx={{ fontSize: '1.06rem', fontWeight: 900, color: themeColors.textPrimary }}>
                      Quick Actions
                    </Typography>
                  </Box>

                  <Divider />

                  <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.15 }}>
                    {quickActions.map((action, index) => (
                      <Paper
                        key={index}
                        component={RouterLink}
                        to={action.link}
                        elevation={0}
                        sx={{
                          textDecoration: 'none',
                          px: 1.5,
                          py: 1.4,
                          borderRadius: '16px',
                          border: '1px solid rgba(15,23,42,0.06)',
                          bgcolor: '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.25,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            bgcolor: '#f0fdf4',
                            borderColor: 'rgba(34,197,94,0.18)',
                            boxShadow: '0 10px 20px rgba(15,23,42,0.05)'
                          }
                        }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '12px',
                            bgcolor: '#ecfdf5',
                            color: themeColors.primary,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          {action.icon}
                        </Box>

                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                          <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: themeColors.textPrimary }}>
                            {action.title}
                          </Typography>
                          <Typography sx={{ fontSize: '0.8rem', color: themeColors.textSecondary, fontWeight: 500 }}>
                            {action.subtitle}
                          </Typography>
                        </Box>

                        <KeyboardArrowRightIcon sx={{ color: '#cbd5e1' }} />
                      </Paper>
                    ))}
                  </Box>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper
                  sx={{
                    borderRadius: '20px',
                    border: `1px solid ${themeColors.border}`,
                    boxShadow: '0 12px 26px rgba(15,23,42,0.06)',
                    overflow: 'hidden',
                    animation: 'slideUpSoft 0.8s ease'
                  }}
                >
                  <Box sx={{ px: 2.25, py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NotificationsIcon sx={{ color: themeColors.primary }} />
                    <Typography sx={{ fontSize: '1.05rem', fontWeight: 900, color: themeColors.textPrimary }}>
                      Recent Activities
                    </Typography>
                  </Box>

                  <Divider />

                  <List sx={{ px: 1.5, py: 1 }}>
                    {recentActivities.map((activity, index) => (
                      <React.Fragment key={index}>
                        <ListItem sx={{ borderRadius: '14px', py: 1.2 }}>
                          <ListItemIcon sx={{ minWidth: 42 }}>
                            <Box
                              sx={{
                                width: 34,
                                height: 34,
                                borderRadius: '10px',
                                bgcolor: '#ecfdf5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: themeColors.primary
                              }}
                            >
                              <NotificationsIcon sx={{ fontSize: 18 }} />
                            </Box>
                          </ListItemIcon>
                          <ListItemText
                            primary={activity.text}
                            secondary={activity.time}
                            primaryTypographyProps={{
                              variant: 'body2',
                              sx: { color: themeColors.textPrimary, fontWeight: 700 }
                            }}
                            secondaryTypographyProps={{
                              variant: 'caption',
                              sx: { color: themeColors.textSecondary, fontWeight: 500 }
                            }}
                          />
                        </ListItem>
                        {index < recentActivities.length - 1 && <Divider sx={{ mx: 1 }} />}
                      </React.Fragment>
                    ))}
                  </List>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper
                  sx={{
                    borderRadius: '20px',
                    border: `1px solid ${themeColors.border}`,
                    boxShadow: '0 12px 26px rgba(15,23,42,0.06)',
                    overflow: 'hidden',
                    animation: 'slideUpSoft 0.9s ease'
                  }}
                >
                  <Box sx={{ px: 2.25, py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccountCircleIcon sx={{ color: themeColors.primary }} />
                    <Typography sx={{ fontSize: '1.05rem', fontWeight: 900, color: themeColors.textPrimary }}>
                      Account Information
                    </Typography>
                  </Box>

                  <Divider />

                  <List sx={{ px: 2, py: 1 }}>
                    {accountInfo.map((info, index) => (
                      <React.Fragment key={index}>
                        <ListItem sx={{ px: 0, py: 1.3, alignItems: 'flex-start' }}>
                          <ListItemText
                            primary={info.label}
                            secondary={info.value}
                            primaryTypographyProps={{
                              variant: 'body2',
                              sx: { color: themeColors.textSecondary, fontWeight: 700, mb: 0.5 }
                            }}
                            secondaryTypographyProps={{
                              component: 'div',
                              sx: {
                                color: themeColors.textPrimary,
                                fontWeight: 700
                              }
                            }}
                          />
                        </ListItem>
                        {index < accountInfo.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>

                  <Box sx={{ px: 2, pb: 2 }}>
                    <Button
                      variant="contained"
                      component={RouterLink}
                      to="/profile"
                      startIcon={<SettingsIcon />}
                      sx={{
                        textTransform: 'none',
                        borderRadius: '14px',
                        fontWeight: 800,
                        px: 2,
                        py: 1.2,
                        bgcolor: themeColors.primary,
                        boxShadow: '0 12px 22px rgba(22,101,52,0.18)',
                        '&:hover': {
                          bgcolor: themeColors.primaryDark,
                          transform: 'translateY(-1px)'
                        },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Update Profile
                    </Button>
                  </Box>
                </Paper>
              </Grid>

              {isMobile && !sidebarOpen && (
                <Grid item xs={12}>
                  <Paper
                    sx={{
                      p: 2.5,
                      mt: 1,
                      borderRadius: '20px',
                      boxShadow: '0 12px 26px rgba(15,23,42,0.06)',
                      border: `1px solid ${themeColors.border}`,
                      backgroundColor: themeColors.cardBackground
                    }}
                  >
                    <Typography sx={{ fontSize: '1.05rem', fontWeight: 900, color: themeColors.textPrimary }}>
                      Quick Access
                    </Typography>
                    <Typography sx={{ color: themeColors.textSecondary, mt: 0.6, mb: 2, fontWeight: 500 }}>
                      Tap the menu icon to access all tools and sections.
                    </Typography>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleSidebarToggle}
                      startIcon={<MenuIcon />}
                      sx={{
                        textTransform: 'none',
                        bgcolor: themeColors.primary,
                        borderRadius: '14px',
                        py: 1.4,
                        fontWeight: 800,
                        '&:hover': { bgcolor: themeColors.primaryDark }
                      }}
                    >
                      Open Menu
                    </Button>
                  </Paper>
                </Grid>
              )}

              <Grid item xs={12}>
                <Box
                  sx={{
                    mt: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    color: themeColors.textSecondary,
                    textAlign: 'center'
                  }}
                >
                  <ApartmentIcon sx={{ fontSize: 18 }} />
                  <Typography sx={{ fontSize: '0.84rem', fontWeight: 600 }}>
                    VIMS • {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Access • Version 2.0
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </Box>
    </>
  );
};

export default Dashboard;