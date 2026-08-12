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
  TablePagination,
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
  CircularProgress,
  Alert
} from '@mui/material';
import {
  QrCode as QrCodeIcon,
  PersonAdd as PersonAddIcon,
  Cancel as CancelIcon,
  History as HistoryIcon,
  ArrowBack as ArrowBackIcon,
  Logout as LogoutIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  ExitToApp as ExitToAppIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import villageLogo from '../assets/village-logo.png';

const MAX_VISITOR_STAY_MS = 3 * 24 * 60 * 60 * 1000;

const VisitorManagement = () => {
  // Unified theme colors aligned with Dashboard/Login
  const themeColors = {
    primary: '#166534',
    primaryLight: '#22c55e',
    primaryDark: '#14532d',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#0ea5e9',
    background: '#f3f5f7',
    cardBackground: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    border: 'rgba(15, 23, 42, 0.08)'
  };

  const [visitors, setVisitors] = useState([]);
  const [allVisitors, setAllVisitors] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyMode, setHistoryMode] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [confirmingVisitorId, setConfirmingVisitorId] = useState(null);
  const [confirmingAction, setConfirmingAction] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [cancellingVisitorId, setCancellingVisitorId] = useState(null);
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

  const handleBack = () => navigate('/dashboard');

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

  const validateVisitWindow = ({ expectedArrival, expectedDeparture }) => {
    const arrivalDate = new Date(expectedArrival);
    const departureDate = new Date(expectedDeparture);

    if (!expectedArrival || !expectedDeparture || Number.isNaN(arrivalDate.getTime()) || Number.isNaN(departureDate.getTime())) {
      return 'Please provide valid expected arrival and departure dates';
    }

    if (departureDate <= arrivalDate) {
      return 'Expected departure must be after expected arrival';
    }

    if (departureDate.getTime() - arrivalDate.getTime() > MAX_VISITOR_STAY_MS) {
      return 'Visitors cannot stay more than 3 days in the village';
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

    const visitWindowError = validateVisitWindow(formData);
    if (visitWindowError) {
      toast.error(visitWindowError);
      return;
    }
    
    setLoading(true);

    try {
      const payload = {
        ...formData,
        numberOfCompanions: parseInt(formData.numberOfCompanions, 10) || 0
      };

      const response = await axios.post('/api/visitors', payload);
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

  const getVisitorQrStatus = (visitor) => {
    if (!visitor) return 'Unknown';
    if (visitor.status === 'pending') return 'Pending';
    if (visitor.status === 'approved') return 'Approved';
    if (visitor.status === 'active') {
      if (visitor.actualExit) return 'Exited';
      if (visitor.residentDepartureConfirmedAt) return 'Departed';
      if (visitor.residentEntryConfirmedAt) return 'Arrived';
      if (visitor.actualEntry) return 'Entered';
      return 'Active';
    }
    if (visitor.status === 'completed') return 'Exited';
    if (visitor.status === 'rejected') return 'Rejected';
    if (visitor.status === 'cancelled') return 'Cancelled';
    return visitor.status ? visitor.status.charAt(0).toUpperCase() + visitor.status.slice(1) : 'Unknown';
  };

  const getStatusChip = (status, visitor) => {
    const qrStatus = visitor?.qrStatus || getVisitorQrStatus(visitor || { status });
    const progress = visitor?.scanProgress || {};
    const total = Math.max(1, Number(progress.groupSize || visitor?.numberOfCompanions || 0));
    const statusConfig = {
      pending: { label: 'Pending', color: 'warning' },
      approved: { label: 'Approved', color: 'success' },
      entered: { label: 'Entered', color: 'info' },
      arrived: { label: 'Arrived', color: 'success' },
      departed: { label: 'Departed', color: 'warning' },
      exited: { label: 'Exited', color: 'default' },
      active: { label: 'Active', color: 'info' },
      completed: { label: 'Completed', color: 'default' },
      rejected: { label: 'Rejected', color: 'error' },
      cancelled: { label: 'Cancelled', color: 'error' }
    };

    const config = statusConfig[qrStatus.toLowerCase()] || { label: qrStatus, color: 'default' };
    const countByStatus = {
      entered: progress.entryScanCount ?? (visitor?.actualEntry ? total : 0),
      arrived: progress.residentArrivalConfirmCount ?? (visitor?.residentEntryConfirmedAt ? total : 0),
      departed: progress.residentDepartureConfirmCount ?? (visitor?.residentDepartureConfirmedAt ? total : 0),
      exited: visitor?.status === 'completed' ? (progress.exitScanCount || total) : progress.exitScanCount,
      completed: visitor?.status === 'completed' ? (progress.exitScanCount || total) : progress.exitScanCount,
    };
    const normalizedStatus = qrStatus.toLowerCase();
    const shouldShowCount = ['entered', 'arrived', 'departed', 'exited', 'completed'].includes(normalizedStatus);
    const count = Number(countByStatus[normalizedStatus] || 0);
    return <Chip label={shouldShowCount ? `${config.label} ${count}/${total}` : config.label} color={config.color} size="small" />;
  };

  const getResidentConfirmationProgress = (visitor) => {
    const progress = visitor?.scanProgress || {};
    const total = Math.max(1, Number(progress.groupSize || visitor?.numberOfCompanions || 0));
    return {
      total,
      entered: Number(progress.entryScanCount ?? (visitor?.actualEntry ? total : 0)),
      arrived: Number(progress.residentArrivalConfirmCount ?? (visitor?.residentEntryConfirmedAt ? total : 0)),
      departed: Number(progress.residentDepartureConfirmCount ?? (visitor?.residentDepartureConfirmedAt ? total : 0))
    };
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

  const handleResidentConfirmation = async (visitor, action) => {
    if (!visitor || !visitor.qrToken) {
      toast.error(`Unable to confirm ${action} for this visitor`);
      return;
    }

    setConfirmingVisitorId(visitor._id);
    setConfirmingAction(action);
    setConfirmError('');

    try {
      const response = await axios.post('/api/visitors/confirm-arrival', {
        scanValue: visitor.qrToken,
        action
      });

      if (response.data.success) {
        toast.success(response.data.message || `Visitor ${action} confirmed successfully`);
        fetchMyVisitors();
        fetchAllVisitors();
      }
    } catch (error) {
      const message = error.response?.data?.error || `Failed to confirm visitor ${action}`;
      setConfirmError(message);
      toast.error(message);
    } finally {
      setConfirmingAction('');
      setConfirmingVisitorId(null);
    }
  };

  const handleCancelRequest = async (visitorId) => {
    if (cancellingVisitorId) return;
    if (!window.confirm('Are you sure you want to cancel this visitor request?')) return;

    setCancellingVisitorId(visitorId);
    try {
      const response = await axios.put(`/api/visitors/${visitorId}/status`, { status: 'cancelled' });
      if (response.data?.success) {
        toast.success('Visitor request cancelled');
        await Promise.all([fetchMyVisitors(), fetchAllVisitors()]);
      } else {
        toast.error(response.data?.error || 'Failed to cancel visitor request');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel visitor request');
    } finally {
      setCancellingVisitorId(null);
    }
  };

  const handleViewQRCode = async (visitorId, isExpired = false) => {
    try {
      const response = await axios.get(`/api/visitors/${visitorId}/qr`);
      if (response.data.success) {
        const { qrCodeUrl, visitor, residentName, residentHouse } = response.data.data;

        const qrStatus = visitor.qrStatus || getVisitorQrStatus(visitor);
        const modal = window.open('', 'QR Code', 'width=500,height=600');
        const now = new Date();
        const departureDate = new Date(visitor.expectedDeparture);
        const isExpired = now > departureDate;
        const hasLeft = visitor.actualExit && visitor.status === 'completed';
        
        let validityStatus = '';
        if (isExpired) {
          validityStatus = '❌ EXPIRED';
        } else if (qrStatus === 'Exited' || qrStatus === 'Departed') {
          validityStatus = '✅ ' + qrStatus.toUpperCase();
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
                ${visitor.residentEntryConfirmedAt ? `
                <div class="info-row">
                  <span class="info-label">Resident Confirmed:</span>
                  <span class="info-value">${new Date(visitor.residentEntryConfirmedAt).toLocaleString()}</span>
                </div>
                ` : ''}
                ${visitor.residentDepartureConfirmedAt ? `
                <div class="info-row">
                  <span class="info-label">Departure Confirmed:</span>
                  <span class="info-value">${new Date(visitor.residentDepartureConfirmedAt).toLocaleString()}</span>
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
                    qrStatus === 'Approved' ? themeColors.success : 
                    qrStatus === 'Entered' ? themeColors.info : 
                    qrStatus === 'Arrived' ? themeColors.success : 
                    qrStatus === 'Departed' ? themeColors.warning : 
                    qrStatus === 'Exited' ? '#718096' : 
                    qrStatus === 'pending' ? themeColors.warning : 
                    qrStatus === 'rejected' ? themeColors.error : '#4a5568'
                  }">
                    ${qrStatus.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap; margin-top:20px;">
                <button class="print-btn" onclick="window.print()">Print QR Code</button>
                <a class="print-btn" download="visitor_qr_${visitor._id}.png" href="${qrCodeUrl}">Download QR Code</a>
                <button class="print-btn" onclick="shareQrCode()">Share QR Code</button>
              </div>
              <script>
                function dataURLtoFile(dataurl, filename) {
                  const arr = dataurl.split(',');
                  const mime = arr[0].match(/:(.*?);/)[1];
                  const bstr = atob(arr[1]);
                  let n = bstr.length;
                  const u8arr = new Uint8Array(n);
                  while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                  }
                  return new File([u8arr], filename, { type: mime });
                }

                async function shareQrCode() {
                  if (!navigator.share) {
                    alert('Sharing is not supported in this browser. Please download the QR code instead.');
                    return;
                  }

                  try {
                    const file = dataURLtoFile('${qrCodeUrl}', 'visitor_qr_${visitor._id}.png');
                    await navigator.share({
                      files: [file],
                      title: 'Visitor QR Code',
                      text: 'Visitor pass for ${visitor.visitorName} at ${residentName}',
                    });
                  } catch (error) {
                    console.error('Share failed:', error);
                    alert('Unable to share the QR code. Please try downloading it.');
                  }
                }
              </script>
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

  const filteredVisitors = useMemo(() => {
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
  }, [allVisitors, historyMode, selectedTab, visitors]);
  const paginatedVisitors = useMemo(
    () => filteredVisitors.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredVisitors, page, rowsPerPage]
  );

  useEffect(() => {
    setPage(0);
  }, [historyMode, selectedTab]);

  useEffect(() => {
    if (page > 0 && page * rowsPerPage >= filteredVisitors.length) {
      setPage(Math.max(0, Math.ceil(filteredVisitors.length / rowsPerPage) - 1));
    }
  }, [filteredVisitors.length, page, rowsPerPage]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: themeColors.background,
        py: 0,
        px: 0,
        '@keyframes fadeUpSoft': {
          from: { opacity: 0, transform: 'translateY(14px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*': { animation: 'none !important', transition: 'none !important' }
        }
      }}
    >
      {/* TOP NAVIGATION BAR */}
      <AppBar
        position="static"
        sx={{
          bgcolor: '#ffffff',
          color: themeColors.textPrimary,
          boxShadow: '0 6px 20px rgba(15,23,42,0.06)',
          borderBottom: `1px solid ${themeColors.border}`
        }}
      >
        <Toolbar sx={{ minHeight: '72px', px: { xs: 2, md: 3 } }}>
          <IconButton
            edge="start"
            onClick={handleBack}
            sx={{
              mr: 2,
              color: themeColors.textPrimary,
              bgcolor: 'rgba(22,101,52,0.06)',
              borderRadius: 2,
              '&:hover': { bgcolor: 'rgba(22,101,52,0.14)' }
            }}
          >
            <ArrowBackIcon />
          </IconButton>

          {/* App title & logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, flexGrow: 1, minWidth: 0 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: '#ecfdf3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${themeColors.border}`,
                overflow: 'hidden',
              }}
            >
              <Box
                component="img"
                src={villageLogo}
                alt="Casimiro Westville Homes"
                sx={{ width: '82%', height: '82%', objectFit: 'contain' }}
              />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  lineHeight: 1.1,
                  color: themeColors.textPrimary
                }}
              >
                Casimiro Westville Homes
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  color: themeColors.textSecondary,
                  fontWeight: 600
                }}
              >
                {historyMode ? 'Visitor History' : 'Visitor Management'}
              </Typography>
            </Box>
          </Box>

          {/* User Profile Menu */}
          <IconButton
            edge="end"
            onClick={handleProfileMenuOpen}
            sx={{ ml: 1, mr: 0 }}
          >
            <Avatar 
              sx={{ 
                width: 36, 
                height: 36, 
                bgcolor: themeColors.primary,
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
                boxShadow: '0 18px 40px rgba(15,23,42,0.16)',
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
            {confirmError && (
              <Box sx={{ mt: 2, maxWidth: 560 }}>
                <Alert severity="error">{confirmError}</Alert>
              </Box>
            )}
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
                transition: 'all 0.3s ease',
                animation: 'fadeUpSoft 0.5s ease'
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
              {historyMode ? 'All Visitor Passes' : 'My Visitor Passes'} ({filteredVisitors.length})
            </Typography>
          </Box>

          {filteredVisitors.length === 0 ? (
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
            <>
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
                  {paginatedVisitors.map((visitor) => {
                    const expired = isQRExpired(visitor);
                    const left = isVisitorLeft(visitor);
                    const qrValid = isQRValid(visitor);
                    const confirmationProgress = getResidentConfirmationProgress(visitor);
                    const isConfirmingArrival = confirmingVisitorId === visitor._id && confirmingAction === 'arrival';
                    const isConfirmingDeparture = confirmingVisitorId === visitor._id && confirmingAction === 'departure';
                    const canConfirmArrival = visitor.status === 'active' && confirmationProgress.arrived < confirmationProgress.entered;
                    const canConfirmDeparture = visitor.status === 'active' && confirmationProgress.departed < confirmationProgress.arrived;
                    
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography sx={{ color: themeColors.textPrimary, fontWeight: 600 }}>
                              {visitor.numberOfCompanions || 0}
                            </Typography>
                            {['approved', 'active', 'completed'].includes(visitor.status) && (
                              <>
                                <Chip
                                  label={`Arrived ${confirmationProgress.arrived}/${confirmationProgress.total}`}
                                  size="small"
                                  color={confirmationProgress.arrived >= confirmationProgress.total ? 'success' : 'default'}
                                  variant="outlined"
                                />
                                <Chip
                                  label={`Departed ${confirmationProgress.departed}/${confirmationProgress.total}`}
                                  size="small"
                                  color={confirmationProgress.departed >= confirmationProgress.total ? 'success' : 'default'}
                                  variant="outlined"
                                />
                              </>
                            )}
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
                        
                        <TableCell>{getStatusChip(visitor.status, visitor)}</TableCell>
                        
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
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
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
                            
                            {canConfirmArrival && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                startIcon={isConfirmingArrival ? <CircularProgress size={16} sx={{ color: themeColors.success }} /> : <CheckCircleIcon />}
                                onClick={() => handleResidentConfirmation(visitor, 'arrival')}
                                title={isConfirmingArrival ? 'Confirming arrival...' : 'Confirm Visitor Arrival'}
                                disabled={Boolean(confirmingAction)}
                                sx={{
                                  borderRadius: 2,
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  '&:hover': {
                                    backgroundColor: themeColors.success + '20'
                                  }
                                }}
                              >
                                Confirm Household {confirmationProgress.arrived + 1}/{confirmationProgress.total}
                              </Button>
                            )}

                            {canConfirmDeparture && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="warning"
                                startIcon={isConfirmingDeparture ? <CircularProgress size={16} sx={{ color: themeColors.warning }} /> : <ExitToAppIcon />}
                                onClick={() => handleResidentConfirmation(visitor, 'departure')}
                                title={isConfirmingDeparture ? 'Confirming departure...' : 'Confirm Visitor Departure'}
                                disabled={Boolean(confirmingAction)}
                                sx={{
                                  borderRadius: 2,
                                  textTransform: 'none',
                                  fontWeight: 700,
                                  '&:hover': {
                                    backgroundColor: themeColors.warning + '20'
                                  }
                                }}
                              >
                                Confirm Departure {confirmationProgress.departed + 1}/{confirmationProgress.total}
                              </Button>
                            )}

                            {/* Cancel Button - Only for pending */}
                            {visitor.status === 'pending' && (
                              <IconButton 
                                size="small" 
                                color="error" 
                                title="Cancel Request"
                                onClick={() => handleCancelRequest(visitor._id)}
                                disabled={cancellingVisitorId === visitor._id}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: themeColors.error + '20'
                                  }
                                }}
                              >
                                {cancellingVisitorId === visitor._id ? <CircularProgress size={18} color="error" /> : <CancelIcon />}
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
            <TablePagination
              component="div"
              count={filteredVisitors.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25]}
            />
            </>
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
                    helperText="Visitor stay is limited to 3 days maximum."
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
                    helperText="Must be after arrival and within 3 days."
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
