import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  MenuItem,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  AppBar,
  Toolbar,
  Tabs,
  Tab,
  Badge,
  Menu,
  ListItemIcon,
  Divider,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  QrCode as QrCodeIcon,
  PersonAdd as PersonAddIcon,
  Cancel as CancelIcon,
  History as HistoryIcon,
  Print as PrintIcon,
  ArrowBack as ArrowBackIcon,
  Logout as LogoutIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  ExitToApp as ExitToAppIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Phone as PhoneIcon,
  Map as MapIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

const VisitorManagement = () => {
  // Dashboard Theme Colors from Login
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

  const [visitors, setVisitors] = useState([]);
  const [allVisitors, setAllVisitors] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyMode, setHistoryMode] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [formData, setFormData] = useState({
    visitorName: '',
    visitorPhone: '',
    vehicleNumber: '',
    purpose: '',
    expectedArrival: '',
    expectedDeparture: '',
    numberOfCompanions: '0',
    specialNotes: ''
  });
  const [formErrors, setFormErrors] = useState({
    visitorName: '',
    visitorPhone: ''
  });
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const { getCurrentUser, logout } = useAuth();
  const user = getCurrentUser();
  const navigate = useNavigate();

  const handleBack = () => navigate(-1);

  // Profile menu handlers
  const handleProfileMenuOpen = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (user?.role === 'resident') {
      const fetchData = async () => {
        try {
          await Promise.all([
            fetchMyVisitors(),
            fetchAllVisitors()
          ]);
        } catch (error) {
          console.error('Failed to fetch visitor data:', error);
          toast.error('Failed to load visitor data');
        }
      };
      
      fetchData();
    }
  }, [user]);

  // Calculate stats dynamically from visitors data using useMemo
  const stats = useMemo(() => {
    if (visitors && visitors.length > 0) {
      const today = new Date().toDateString();
      
      const todayVisitors = visitors.filter(v => {
        const arrivalDate = new Date(v.expectedArrival).toDateString();
        return arrivalDate === today;
      }).length;

      const activeVisitors = visitors.filter(v => 
        ['approved', 'active'].includes(v.status)
      ).length;

      const pendingVisitors = visitors.filter(v => 
        v.status === 'pending'
      ).length;

      return {
        totalVisitors: visitors.length,
        todayVisitors: todayVisitors,
        activeVisitors: activeVisitors,
        pendingVisitors: pendingVisitors
      };
    }
    return {
      totalVisitors: 0,
      todayVisitors: 0,
      activeVisitors: 0,
      pendingVisitors: 0
    };
  }, [visitors]);

  const fetchMyVisitors = async () => {
    try {
      const response = await axios.get('/api/visitors/my');
      if (response.data.success) setVisitors(response.data.data);
    } catch (error) {
      console.error('Failed to fetch visitors:', error);
    }
  };

  const fetchAllVisitors = async () => {
    try {
      const response = await axios.get('/api/visitors/history');
      if (response.data.success) setAllVisitors(response.data.data);
    } catch (error) {
      console.error('Failed to fetch all visitors:', error);
    }
  };

  const validateName = (name) => {
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!name.trim()) {
      return 'Name is required';
    }
    if (!nameRegex.test(name)) {
      return 'Name can only contain letters and spaces';
    }
    if (name.length < 2) {
      return 'Name must be at least 2 characters long';
    }
    return '';
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^\d{10}$/;
    if (!phone.trim()) {
      return 'Phone number is required';
    }
    if (!phoneRegex.test(phone)) {
      return 'Phone number must be exactly 10 digits';
    }
    return '';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    let error = '';
    if (name === 'visitorName') {
      const filteredValue = value.replace(/[^A-Za-z\s]/g, '');
      setFormData(prev => ({ ...prev, [name]: filteredValue }));
      error = validateName(filteredValue);
    } else if (name === 'visitorPhone') {
      const filteredValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: filteredValue }));
      error = validatePhone(filteredValue);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    setFormErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const nameError = validateName(formData.visitorName);
    const phoneError = validatePhone(formData.visitorPhone);
    
    setFormErrors({
      visitorName: nameError,
      visitorPhone: phoneError
    });
    
    if (nameError || phoneError) {
      toast.error('Please fix the form errors before submitting');
      return;
    }
    
    setLoading(true);

    try {
      const response = await axios.post('/api/visitors', formData);
      if (response.data.success) {
        toast.success('Visitor pass created successfully!');
        setOpenDialog(false);
        setFormData({
          visitorName: '',
          visitorPhone: '',
          vehicleNumber: '',
          purpose: '',
          expectedArrival: '',
          expectedDeparture: '',
          numberOfCompanions: '0',
          specialNotes: ''
        });
        setFormErrors({
          visitorName: '',
          visitorPhone: ''
        });
        fetchMyVisitors();
        fetchAllVisitors();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create visitor pass');
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      pending: { label: 'Pending', color: 'warning' },
      approved: { label: 'Approved', color: 'success' },
      rejected: { label: 'Rejected', color: 'error' },
      active: { label: 'Active', color: 'info' },
      completed: { label: 'Completed', color: 'default' },
      cancelled: { label: 'Cancelled', color: 'error' }
    };

    const config = statusConfig[status] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const isQRValid = (visitor) => {
    return ['approved', 'active', 'completed'].includes(visitor.status);
  };

  const isQRExpired = (visitor) => {
    const now = new Date();
    const departureDate = new Date(visitor.expectedDeparture);
    return now > departureDate;
  };

  const isVisitorLeft = (visitor) => {
    return visitor.actualExit && visitor.status === 'completed';
  };

  const handleViewQRCode = async (visitorId, isExpired = false) => {
    try {
      const response = await axios.get(`/api/visitors/${visitorId}/qr`);
      if (response.data.success) {
        const { qrCodeUrl, visitor, residentName, residentHouse } = response.data.data;

        const modal = window.open('', 'QR Code', 'width=500,height=600');
        const now = new Date();
        const departureDate = new Date(visitor.expectedDeparture);
        const isExpired = now > departureDate;
        const hasLeft = visitor.actualExit && visitor.status === 'completed';
        
        let validityStatus = '';
        if (isExpired) {
          validityStatus = '❌ EXPIRED';
        } else if (hasLeft) {
          validityStatus = '✅ USED (Visitor has left)';
        } else {
          validityStatus = '✅ VALID';
        }

        modal.document.write(`
          <html>
            <head>
              <title>Visitor QR Code</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 20px; 
                  background: ${isExpired ? '#fff5f5' : hasLeft ? '#f0fff4' : '#f8fafc'};
                }
                .header { 
                  margin-bottom: 20px; 
                  padding: 15px;
                  background: ${isExpired ? '#fed7d7' : hasLeft ? '#c6f6d5' : '#e2e8f0'};
                  border-radius: 8px;
                }
                .validity-badge {
                  display: inline-block;
                  padding: 6px 12px;
                  border-radius: 20px;
                  font-weight: bold;
                  margin: 10px 0;
                  background: ${isExpired ? '#feb2b2' : hasLeft ? '#9ae6b4' : themeColors.primary + '30'};
                  color: ${isExpired ? '#742a2a' : hasLeft ? '#22543d' : themeColors.primary};
                }
                .qr-code { 
                  max-width: 300px; 
                  margin: 20px auto; 
                  border: 3px solid ${isExpired ? '#fc8181' : hasLeft ? '#68d391' : themeColors.primary}; 
                  padding: 15px; 
                  background: white;
                  border-radius: 8px;
                  position: relative;
                }
                .qr-expired-overlay {
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  background: rgba(254, 215, 215, 0.9);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 24px;
                  font-weight: bold;
                  color: #742a2a;
                }
                .visitor-info { 
                  background: #f5f5f5; 
                  padding: 15px; 
                  border-radius: 5px; 
                  margin-top: 20px; 
                  text-align: left;
                }
                .info-row {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 8px;
                  padding-bottom: 8px;
                  border-bottom: 1px solid #e2e8f0;
                }
                .info-label {
                  font-weight: bold;
                  color: #4a5568;
                }
                .info-value {
                  color: #2d3748;
                }
                .print-btn { 
                  margin-top: 20px; 
                  padding: 12px 24px; 
                  background: ${themeColors.primary}; 
                  color: white; 
                  border: none; 
                  border-radius: 5px; 
                  cursor: pointer;
                  font-size: 16px;
                  font-weight: bold;
                }
                .print-btn:hover {
                  background: ${themeColors.primaryDark};
                }
                .watermark {
                  color: #a0aec0;
                  font-size: 12px;
                  margin-top: 20px;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h2>Visitor QR Code</h2>
                <div class="validity-badge">${validityStatus}</div>
                <p>${isExpired ? 'This QR code has expired' : hasLeft ? 'Visitor has completed their visit' : 'Show this QR code at the gate'}</p>
              </div>
              
              <div class="qr-code">
                <img src="${qrCodeUrl}" alt="Visitor QR Code" style="width: 100%; ${isExpired || hasLeft ? 'opacity: 0.5;' : ''}">
                ${isExpired || hasLeft ? '<div class="qr-expired-overlay">' + (isExpired ? 'EXPIRED' : 'USED') + '</div>' : ''}
              </div>
              
              <div class="visitor-info">
                <div class="info-row">
                  <span class="info-label">Visitor:</span>
                  <span class="info-value">${visitor.visitorName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Resident:</span>
                  <span class="info-value">${residentName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">House:</span>
                  <span class="info-value">${residentHouse}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Valid Until:</span>
                  <span class="info-value">${new Date(visitor.expectedDeparture).toLocaleString()}</span>
                </div>
                ${visitor.actualEntry ? `
                <div class="info-row">
                  <span class="info-label">Entry Time:</span>
                  <span class="info-value">${new Date(visitor.actualEntry).toLocaleString()}</span>
                </div>
                ` : ''}
                ${visitor.actualExit ? `
                <div class="info-row">
                  <span class="info-label">Exit Time:</span>
                  <span class="info-value">${new Date(visitor.actualExit).toLocaleString()}</span>
                </div>
                ` : ''}
                <div class="info-row">
                  <span class="info-label">Status:</span>
                  <span class="info-value" style="font-weight: bold; color: ${
                    visitor.status === 'approved' ? themeColors.success : 
                    visitor.status === 'active' ? themeColors.info : 
                    visitor.status === 'completed' ? '#718096' : 
                    visitor.status === 'pending' ? themeColors.warning : 
                    visitor.status === 'rejected' ? themeColors.error : '#4a5568'
                  }">
                    ${visitor.status.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <button class="print-btn" onclick="window.print()">Print QR Code</button>
              
              <div class="watermark">
                Generated on ${new Date().toLocaleDateString()} | VIMS Visitor System
              </div>
            </body>
          </html>
        `);
        modal.document.close();
      }
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('QR code not available. Visitor request is not approved yet.');
      } else {
        toast.error('Failed to load QR code');
      }
    }
  };

  const toggleHistoryMode = () => {
    setHistoryMode(!historyMode);
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const getFilteredVisitors = () => {
    if (historyMode) {
      return allVisitors;
    }
    
    switch(selectedTab) {
      case 0:
        return visitors.filter(v => ['pending', 'approved', 'active'].includes(v.status));
      case 1:
        return visitors.filter(v => v.status === 'completed');
      case 2:
        return visitors.filter(v => v.status === 'rejected');
      default:
        return visitors;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: themeColors.background,
        py: 0,
        px: 0
      }}
    >
      {/* TOP NAVIGATION BAR */}
      <AppBar position="static" sx={{ bgcolor: themeColors.primary, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <Toolbar sx={{ minHeight: '64px' }}>
          <IconButton edge="start" color="inherit" onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {historyMode ? 'Visitor History' : 'Visitor Management'}
          </Typography>

          {/* User Profile Menu */}
          <IconButton
            edge="end"
            color="inherit"
            onClick={handleProfileMenuOpen}
            sx={{ ml: 1, mr: 0 }}
          >
            <Avatar 
              sx={{ 
                width: 36, 
                height: 36, 
                bgcolor: 'rgba(255,255,255,0.3)',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </Avatar>
          </IconButton>

          {/* Profile Dropdown Menu */}
          <Menu
            anchorEl={profileAnchorEl}
            open={Boolean(profileAnchorEl)}
            onClose={handleProfileMenuClose}
            PaperProps={{
              sx: {
                width: 200,
                mt: 1.5,
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                border: `1px solid ${themeColors.border}`
              }
            }}
          >
            <MenuItem disabled>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                {user.firstName} {user.lastName}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem component={RouterLink} to="/profile" onClick={handleProfileMenuClose}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              Profile Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom sx={{ 
              fontWeight: 700,
              color: themeColors.textPrimary,
              background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.primaryLight})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {historyMode ? 'Visitor History' : 'Visitor Management'}
            </Typography>
            <Typography variant="body1" sx={{ color: themeColors.textSecondary }}>
              {historyMode ? 'View all your previous visitor passes' : 'Manage visitor passes and access permissions'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant={historyMode ? "contained" : "outlined"}
              startIcon={<HistoryIcon />}
              onClick={toggleHistoryMode}
              color="primary"
              sx={{ 
                borderRadius: 2,
                bgcolor: historyMode ? themeColors.primary : 'transparent',
                borderColor: themeColors.primary,
                '&:hover': {
                  bgcolor: historyMode ? themeColors.primaryDark : themeColors.primary + '08',
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 25px ${themeColors.primary}40`
                },
                transition: 'all 0.3s ease'
              }}
            >
              {historyMode ? 'Back to Current' : 'View History'}
            </Button>
            
            {!historyMode && (
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => setOpenDialog(true)}
                disabled={user?.role !== 'resident'}
                sx={{ 
                  borderRadius: 2,
                  bgcolor: themeColors.primary,
                  '&:hover': {
                    bgcolor: themeColors.primaryDark,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 25px ${themeColors.primary}40`
                  },
                  transition: 'all 0.3s ease',
                  fontWeight: 600
                }}
              >
                Create Visitor Pass
              </Button>
            )}
          </Box>
        </Box>

        {/* Stats Section - Only show in current mode */}
        {!historyMode && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                borderRadius: 3, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: `1px solid ${themeColors.border}`,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
                },
                transition: 'all 0.3s ease'
              }}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Typography variant="h3" sx={{ 
                    fontWeight: 700,
                    mb: 1 
                  }}>
                    {stats.totalVisitors || 0}
                  </Typography>
                  <Typography sx={{ color: themeColors.textSecondary }}>Total Visitors</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                borderRadius: 3, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: `1px solid ${themeColors.border}`,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
                },
                transition: 'all 0.3s ease'
              }}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Typography variant="h3" sx={{ 
                    fontWeight: 700,
                    mb: 1 
                  }}>
                    {stats.todayVisitors || 0}
                  </Typography>
                  <Typography sx={{ color: themeColors.textSecondary }}>Today's Visitors</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                borderRadius: 3, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: `1px solid ${themeColors.border}`,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
                },
                transition: 'all 0.3s ease'
              }}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Typography variant="h3" sx={{ 
                    fontWeight: 700,
                    mb: 1 
                  }}>
                    {stats.activeVisitors || 0}
                  </Typography>
                  <Typography sx={{ color: themeColors.textSecondary }}>Active Now</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                borderRadius: 3, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: `1px solid ${themeColors.border}`,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
                },
                transition: 'all 0.3s ease'
              }}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Typography variant="h3" sx={{ 
                    fontWeight: 700,
                    mb: 1 
                  }}>
                    {stats.pendingVisitors || 0}
                  </Typography>
                  <Typography sx={{ color: themeColors.textSecondary }}>Pending Approval</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tabs for filtering - Only in current mode */}
        {!historyMode && (
          <Paper sx={{ 
            mb: 3, 
            borderRadius: 3, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: `1px solid ${themeColors.border}`,
            overflow: 'hidden'
          }}>
            <Tabs 
              value={selectedTab} 
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem'
                }
              }}
            >
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon fontSize="small" />
                    Active
                    <Badge 
                      badgeContent={visitors.filter(v => ['pending', 'approved', 'active'].includes(v.status)).length} 
                      color="primary" 
                      sx={{ ml: 1 }}
                    />
                  </Box>
                } 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon fontSize="small" />
                    Completed
                    <Badge 
                      badgeContent={visitors.filter(v => v.status === 'completed').length} 
                      color="success" 
                      sx={{ ml: 1 }}
                    />
                  </Box>
                } 
              />
              <Tab 
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CancelIcon fontSize="small" />
                    Rejected
                    <Badge 
                      badgeContent={visitors.filter(v => v.status === 'rejected').length} 
                      color="error" 
                      sx={{ ml: 1 }}
                    />
                  </Box>
                } 
              />
            </Tabs>
          </Paper>
        )}

        {/* Visitor List */}
        <Paper sx={{ 
          p: 3, 
          borderRadius: 3, 
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: `1px solid ${themeColors.border}`,
          backgroundColor: themeColors.cardBackground
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6" sx={{ color: themeColors.textPrimary, fontWeight: 600 }}>
              {historyMode ? 'All Visitor Passes' : 'My Visitor Passes'} ({getFilteredVisitors().length})
            </Typography>
          </Box>

          {getFilteredVisitors().length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              {historyMode ? (
                <>
                  <HistoryIcon sx={{ fontSize: 64, mb: 2, color: themeColors.textSecondary }} />
                  <Typography variant="h6" gutterBottom sx={{ color: themeColors.textPrimary }}>
                    No Visitor History
                  </Typography>
                  <Typography sx={{ color: themeColors.textSecondary, mb: 3 }}>
                    You haven't created any visitor passes yet.
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => setOpenDialog(true)}
                    sx={{ 
                      borderRadius: 2,
                      borderColor: themeColors.primary,
                      color: themeColors.primary,
                      '&:hover': {
                        borderColor: themeColors.primaryDark,
                        backgroundColor: themeColors.primary + '08'
                      }
                    }}
                  >
                    Create Your First Pass
                  </Button>
                </>
              ) : (
                <>
                  <QrCodeIcon sx={{ fontSize: 64, mb: 2, color: themeColors.textSecondary }} />
                  <Typography variant="h6" gutterBottom sx={{ color: themeColors.textPrimary }}>
                    No visitor passes found
                  </Typography>
                  <Typography sx={{ color: themeColors.textSecondary, mb: 3 }}>
                    {selectedTab === 0 
                      ? "You don't have any active visitor passes."
                      : selectedTab === 1
                      ? "You don't have any completed visitor passes."
                      : "You don't have any rejected visitor passes."
                    }
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => setOpenDialog(true)}
                    sx={{ 
                      borderRadius: 2,
                      bgcolor: themeColors.primary,
                      '&:hover': {
                        bgcolor: themeColors.primaryDark
                      }
                    }}
                  >
                    Create New Pass
                  </Button>
                </>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: themeColors.background }}>
                    <TableCell sx={{ fontWeight: 600, color: themeColors.textPrimary }}>Visitor Name</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: themeColors.textPrimary }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: themeColors.textPrimary }}>Companions</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: themeColors.textPrimary }}>Purpose</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: themeColors.textPrimary }}>Arrival Time</TableCell>
                    {historyMode && <TableCell sx={{ fontWeight: 600, color: themeColors.textPrimary }}>Exit Time</TableCell>}
                    <TableCell sx={{ fontWeight: 600, color: themeColors.textPrimary }}>Status</TableCell>
                    {historyMode && <TableCell sx={{ fontWeight: 600, color: themeColors.textPrimary }}>Validity</TableCell>}
                    <TableCell sx={{ fontWeight: 600, color: themeColors.textPrimary }}>Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {getFilteredVisitors().map((visitor) => {
                    const expired = isQRExpired(visitor);
                    const left = isVisitorLeft(visitor);
                    const qrValid = isQRValid(visitor);
                    
                    return (
                      <TableRow 
                        key={visitor._id} 
                        hover
                        sx={{ 
                          '&:hover': { backgroundColor: themeColors.background + '80' },
                          borderBottom: `1px solid ${themeColors.border}`
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ 
                              bgcolor: expired ? themeColors.error : left ? themeColors.success : themeColors.primary,
                              color: 'white'
                            }}>
                              {visitor.visitorName.charAt(0)}
                            </Avatar>
                            <Box>
                              <Typography fontWeight="600" sx={{ color: themeColors.textPrimary }}>
                                {visitor.visitorName}
                              </Typography>

                              {visitor.vehicleNumber && (
                                <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                                  Vehicle: {visitor.vehicleNumber}
                                </Typography>
                              )}

                              <Typography variant="caption" sx={{ color: themeColors.textSecondary, display: 'block' }}>
                                Created: {formatDate(visitor.createdAt)}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        <TableCell sx={{ color: themeColors.textPrimary }}>{visitor.visitorPhone}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ color: themeColors.textPrimary, fontWeight: 600 }}>
                              {visitor.numberOfCompanions || 0}
                            </Typography>
                            {visitor.specialNotes && (
                              <Chip 
                                label="Special" 
                                size="small" 
                                color="warning"
                                variant="outlined"
                                title={visitor.specialNotes}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: themeColors.textPrimary }}>{visitor.purpose}</TableCell>
                        <TableCell sx={{ color: themeColors.textPrimary }}>{formatDate(visitor.expectedArrival)}</TableCell>
                        
                        {historyMode && (
                          <TableCell>
                            {visitor.actualExit 
                              ? formatDate(visitor.actualExit)
                              : expired 
                                ? <Chip label="Expired" size="small" color="warning" />
                                : <Chip label="Not Used" size="small" color="default" />
                            }
                          </TableCell>
                        )}
                        
                        <TableCell>{getStatusChip(visitor.status)}</TableCell>
                        
                        {historyMode && (
                          <TableCell>
                            {expired ? (
                              <Chip 
                                icon={<CancelIcon />} 
                                label="Expired" 
                                size="small" 
                                color="error" 
                                variant="outlined"
                              />
                            ) : left ? (
                              <Chip 
                                icon={<ExitToAppIcon />} 
                                label="Used" 
                                size="small" 
                                color="success" 
                                variant="outlined"
                              />
                            ) : (
                              <Chip 
                                icon={<CheckCircleIcon />} 
                                label="Valid" 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                            )}
                          </TableCell>
                        )}
                        
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {/* QR Code Button - Show for all approved/active/completed */}
                            {qrValid && (
                              <IconButton
                                size="small"
                                color={expired || left ? "default" : "primary"}
                                onClick={() => handleViewQRCode(visitor._id, expired || left)}
                                title={expired ? "View Expired QR" : left ? "View Used QR" : "View QR Code"}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: themeColors.primary + '20'
                                  }
                                }}
                              >
                                <QrCodeIcon />
                              </IconButton>
                            )}
                            
                            {/* View Details Button */}
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => handleViewQRCode(visitor._id)}
                              title="View Details"
                              sx={{
                                '&:hover': {
                                  backgroundColor: themeColors.info + '20'
                                }
                              }}
                            >
                              <VisibilityIcon />
                            </IconButton>
                            
                            {/* Print Button - Only for valid QR codes */}
                            {qrValid && !expired && !left && (
                              <IconButton 
                                size="small" 
                                color="primary" 
                                title="Print"
                                sx={{
                                  '&:hover': {
                                    backgroundColor: themeColors.primary + '20'
                                  }
                                }}
                              >
                                <PrintIcon />
                              </IconButton>
                            )}
                            
                            {/* Cancel Button - Only for pending */}
                            {visitor.status === 'pending' && (
                              <IconButton 
                                size="small" 
                                color="error" 
                                title="Cancel Request"
                                sx={{
                                  '&:hover': {
                                    backgroundColor: themeColors.error + '20'
                                  }
                                }}
                              >
                                <CancelIcon />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Summary for History Mode */}
        {historyMode && allVisitors.length > 0 && (
          <Paper sx={{ 
            p: 3, 
            mt: 3, 
            borderRadius: 3, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: `1px solid ${themeColors.border}`,
            backgroundColor: themeColors.background
          }}>
            <Typography variant="h6" gutterBottom sx={{ color: themeColors.textPrimary, fontWeight: 600 }}>
              History Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>Total Passes</Typography>
                <Typography variant="h5" sx={{ color: themeColors.textPrimary, fontWeight: 700 }}>
                  {allVisitors.length}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>Completed</Typography>
                <Typography variant="h5" sx={{ color: themeColors.success, fontWeight: 700 }}>
                  {allVisitors.filter(v => v.status === 'completed').length}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>Expired</Typography>
                <Typography variant="h5" sx={{ color: themeColors.warning, fontWeight: 700 }}>
                  {allVisitors.filter(v => isQRExpired(v)).length}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>Rejected</Typography>
                <Typography variant="h5" sx={{ color: themeColors.error, fontWeight: 700 }}>
                  {allVisitors.filter(v => v.status === 'rejected').length}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Create Visitor Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={() => setOpenDialog(false)} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              backgroundColor: themeColors.cardBackground
            }
          }}
        >
          <DialogTitle sx={{ 
            fontWeight: 600, 
            color: themeColors.textPrimary,
            borderBottom: `1px solid ${themeColors.border}`,
            pb: 2
          }}>
            Create Visitor Pass
          </DialogTitle>

          <form onSubmit={handleSubmit}>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Visitor Name"
                    name="visitorName"
                    value={formData.visitorName}
                    onChange={handleInputChange}
                    required
                    margin="normal"
                    error={!!formErrors.visitorName}
                    helperText={formErrors.visitorName || "Letters and spaces only"}
                    inputProps={{
                      pattern: "[A-Za-z\\s]+",
                      title: "Only letters and spaces are allowed"
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon fontSize="small" />
                        </InputAdornment>
                      ),
                      sx: {
                        borderRadius: 2,
                        backgroundColor: '#f8fafc',
                        '&.Mui-focused': {
                          borderColor: themeColors.primary,
                          boxShadow: `0 0 0 3px ${themeColors.primary}20`
                        }
                      }
                    }}
                    InputLabelProps={{
                      sx: {
                        color: themeColors.textSecondary,
                        '&.Mui-focused': {
                          color: themeColors.primary
                        }
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Visitor Phone"
                    name="visitorPhone"
                    value={formData.visitorPhone}
                    onChange={handleInputChange}
                    required
                    margin="normal"
                    error={!!formErrors.visitorPhone}
                    helperText={formErrors.visitorPhone || "10 digits only"}
                    inputProps={{
                      inputMode: "numeric",
                      pattern: "\\d{10}",
                      title: "Please enter exactly 10 digits"
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon fontSize="small" />
                        </InputAdornment>
                      ),
                      sx: {
                        borderRadius: 2,
                        backgroundColor: '#f8fafc',
                        '&.Mui-focused': {
                          borderColor: themeColors.primary,
                          boxShadow: `0 0 0 3px ${themeColors.primary}20`
                        }
                      }
                    }}
                    InputLabelProps={{
                      sx: {
                        color: themeColors.textSecondary,
                        '&.Mui-focused': {
                          color: themeColors.primary
                        }
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Vehicle Number (Optional)"
                    name="vehicleNumber"
                    value={formData.vehicleNumber}
                    onChange={handleInputChange}
                    margin="normal"
                    InputProps={{
                      sx: {
                        borderRadius: 2,
                        backgroundColor: '#f8fafc',
                        '&.Mui-focused': {
                          borderColor: themeColors.primary,
                          boxShadow: `0 0 0 3px ${themeColors.primary}20`
                        }
                      }
                    }}
                    InputLabelProps={{
                      sx: {
                        color: themeColors.textSecondary,
                        '&.Mui-focused': {
                          color: themeColors.primary
                        }
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Purpose of Visit"
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    required
                    multiline
                    rows={2}
                    margin="normal"
                    InputProps={{
                      sx: {
                        borderRadius: 2,
                        backgroundColor: '#f8fafc',
                        '&.Mui-focused': {
                          borderColor: themeColors.primary,
                          boxShadow: `0 0 0 3px ${themeColors.primary}20`
                        }
                      }
                    }}
                    InputLabelProps={{
                      sx: {
                        color: themeColors.textSecondary,
                        '&.Mui-focused': {
                          color: themeColors.primary
                        }
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Expected Arrival"
                    name="expectedArrival"
                    type="datetime-local"
                    value={formData.expectedArrival}
                    onChange={handleInputChange}
                    required
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      sx: {
                        borderRadius: 2,
                        backgroundColor: '#f8fafc',
                        '&.Mui-focused': {
                          borderColor: themeColors.primary,
                          boxShadow: `0 0 0 3px ${themeColors.primary}20`
                        }
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Expected Departure"
                    name="expectedDeparture"
                    type="datetime-local"
                    value={formData.expectedDeparture}
                    onChange={handleInputChange}
                    required
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      sx: {
                        borderRadius: 2,
                        backgroundColor: '#f8fafc',
                        '&.Mui-focused': {
                          borderColor: themeColors.primary,
                          boxShadow: `0 0 0 3px ${themeColors.primary}20`
                        }
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Number of Companions"
                    name="numberOfCompanions"
                    type="number"
                    value={formData.numberOfCompanions}
                    onChange={handleInputChange}
                    required
                    margin="normal"
                    inputProps={{
                      min: "0",
                      max: "99",
                      step: "1"
                    }}
                    helperText="How many companions will visit with this person?"
                    InputProps={{
                      sx: {
                        borderRadius: 2,
                        backgroundColor: '#f8fafc',
                        '&.Mui-focused': {
                          borderColor: themeColors.primary,
                          boxShadow: `0 0 0 3px ${themeColors.primary}20`
                        }
                      }
                    }}
                    InputLabelProps={{
                      sx: {
                        color: themeColors.textSecondary,
                        '&.Mui-focused': {
                          color: themeColors.primary
                        }
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Special Notes (Optional)"
                    name="specialNotes"
                    value={formData.specialNotes}
                    onChange={handleInputChange}
                    multiline
                    rows={3}
                    margin="normal"
                    placeholder="e.g., Senior citizen, PWD with mobility device, hearing impaired, etc."
                    helperText="Mention if visitor is Senior/PWD and any special devices or accommodations needed"
                    InputProps={{
                      sx: {
                        borderRadius: 2,
                        backgroundColor: '#f8fafc',
                        '&.Mui-focused': {
                          borderColor: themeColors.primary,
                          boxShadow: `0 0 0 3px ${themeColors.primary}20`
                        }
                      }
                    }}
                    InputLabelProps={{
                      sx: {
                        color: themeColors.textSecondary,
                        '&.Mui-focused': {
                          color: themeColors.primary
                        }
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </DialogContent>

            <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
              <Button 
                onClick={() => setOpenDialog(false)}
                sx={{
                  color: themeColors.textSecondary,
                  '&:hover': {
                    backgroundColor: themeColors.primary + '08'
                  },
                  borderRadius: 2
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                disabled={loading} 
                sx={{ 
                  borderRadius: 2,
                  bgcolor: themeColors.primary,
                  '&:hover': {
                    bgcolor: themeColors.primaryDark
                  },
                  fontWeight: 600
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Pass'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Container>
    </Box>
  );
};

export default VisitorManagement;