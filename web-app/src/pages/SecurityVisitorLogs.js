import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tabs,
  Tab,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Alert,
  Menu,
  ListItemIcon
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Logout as LogoutIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  QrCodeScanner as ScannerIcon,
  Person as PersonIcon,
  DirectionsCar as CarIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccessTime as ActiveIcon,
  TimerOff as ExpiredIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
  QrCodeScanner as QrCodeScannerIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

// Dashboard Theme Colors (from Login.js)
const themeColors = {
  primary: '#166534',
  primaryLight: '#22c55e',
  primaryDark: '#14532d',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  background: '#f3f5f7',
  cardBackground: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: 'rgba(15, 23, 42, 0.08)'
};

const SecurityVisitorLogs = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [scanInProgress, setScanInProgress] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    approved: 0,
    scanned: 0,
    notScanned: 0,
    expired: 0
  });
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);

  const abortRef = useRef(null);
  const { getCurrentUser, logout: contextLogout } = useAuth();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const logout = useCallback(() => {
    contextLogout();
    navigate('/login');
  }, [contextLogout, navigate]);

  // Profile menu handlers
  const handleProfileMenuOpen = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileAnchorEl(null);
  };

  // Create a stable fetch function
  const fetchVisitors = useCallback(async (isMounted = true) => {
    if (!currentUser || currentUser.role !== 'security') return;

    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (isMounted) {
        setLoading(true);
        setError(null);
      }

      const params = new URLSearchParams();
      params.append('page', (page + 1).toString());
      params.append('limit', rowsPerPage.toString());

      if (searchTerm.trim()) params.append('visitorName', searchTerm.trim());
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFilter) params.append('date', dateFilter);

      // Tab-specific filtering - UPDATED FOR 3 TABS ONLY
      switch(selectedTab) {
        case 1: // Approved visitors
          params.append('status', 'approved');
          break;
        case 2: // Pending Approval
          params.append('status', 'pending');
          break;
        default: // All Visitors
          // No additional filter for all visitors
          break;
      }

      const response = await axios.get('/api/visitors', {
        params,
        signal: controller.signal
      });

      if (isMounted) {
        if (response.data.success) {
          const visitorsData = response.data.data || [];
          setVisitors(visitorsData);
          setTotal(response.data.count || visitorsData.length);
          
          // Calculate stats
          const now = new Date();
          const statsData = {
            total: visitorsData.length,
            active: visitorsData.filter(v => v.status === 'active').length,
            pending: visitorsData.filter(v => v.status === 'pending').length,
            approved: visitorsData.filter(v => v.status === 'approved').length,
            scanned: visitorsData.filter(v => v.actualEntry).length,
            notScanned: visitorsData.filter(v => v.status === 'approved' && !v.actualEntry).length,
            expired: visitorsData.filter(v => {
              if (v.status === 'completed') return true;
              if (v.expectedDeparture) {
                return new Date(v.expectedDeparture) < now;
              }
              return false;
            }).length
          };
          setStats(statsData);
        } else {
          throw new Error(response.data.error || 'Failed to fetch visitors');
        }
      }
    } catch (error) {
      if (isMounted) {
        if (axios.isCancel(error)) {
          // Silently handle canceled requests
          return;
        }
        
        console.error('Error fetching visitors:', error);
        setError(error.message || 'Failed to load visitor data');
        
        if (error.response) {
          const status = error.response.status;
          if (status === 401 || status === 403) {
            toast.error('Session expired. Please login again.');
            logout();
            navigate('/login');
          } else {
            toast.error(`Error ${status}: ${error.response.data?.error || 'Failed to fetch logs'}`);
          }
        } else if (error.request) {
          toast.error('No response from server. Check your connection.');
        } else {
          toast.error('Failed to fetch visitor logs');
        }
        
        setVisitors([]);
        setTotal(0);
        setStats({
          total: 0,
          active: 0,
          pending: 0,
          approved: 0,
          scanned: 0,
          notScanned: 0,
          expired: 0
        });
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, [page, rowsPerPage, searchTerm, statusFilter, dateFilter, selectedTab, currentUser, logout, navigate]);

  // Effect for initial load
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'security') {
      navigate('/login');
      return;
    }

    let isMounted = true;
    
    const timer = setTimeout(() => {
      if (isMounted) {
        fetchVisitors(isMounted);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect for filter changes
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'security') return;

    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        setPage(0); // Reset to first page when filters change
        fetchVisitors(isMounted);
      }
    }, 500); // Debounce search

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, dateFilter, selectedTab]);

  // Effect for pagination changes
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'security') return;

    let isMounted = true;
    if (isMounted) {
      fetchVisitors(isMounted);
    }

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('');
    // Page will be reset by the useEffect above
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/dashboard');
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
    // Page will be reset by the useEffect above
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchVisitors();
  };

  // Handle search button click
  const handleSearch = () => {
    // Trigger the search effect
    setPage(0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Get status chip
  const getStatusChip = (visitor) => {
    const now = new Date();
    const departureDate = visitor.expectedDeparture ? new Date(visitor.expectedDeparture) : null;
    
    if (visitor.status === 'active') {
      if (visitor.residentEntryConfirmedAt) {
        return (
          <Chip 
            label="RESIDENT CONFIRMED" 
            sx={{ 
              bgcolor: `${themeColors.info}20`,
              color: themeColors.info,
              border: `1px solid ${themeColors.info}40`,
              fontWeight: 600
            }} 
            size="small" 
            icon={<CheckCircleIcon />} 
          />
        );
      }

      return (
        <Chip 
          label="ACTIVE NOW" 
          sx={{ 
            bgcolor: `${themeColors.success}20`,
            color: themeColors.success,
            border: `1px solid ${themeColors.success}40`,
            fontWeight: 600
          }} 
          size="small" 
          icon={<ActiveIcon />} 
        />
      );
    } else if (visitor.status === 'completed') {
      return (
        <Chip 
          label="COMPLETED" 
          sx={{ 
            bgcolor: `${themeColors.textSecondary}20`,
            color: themeColors.textSecondary,
            border: `1px solid ${themeColors.textSecondary}40`,
            fontWeight: 600
          }} 
          size="small" 
        />
      );
    } else if (visitor.status === 'approved') {
      if (visitor.actualEntry) {
        return (
          <Chip 
            label="ENTERED" 
            sx={{ 
              bgcolor: `${themeColors.info}20`,
              color: themeColors.info,
              border: `1px solid ${themeColors.info}40`,
              fontWeight: 600
            }} 
            size="small" 
          />
        );
      } else if (departureDate && departureDate < now) {
        return (
          <Chip 
            label="EXPIRED" 
            sx={{ 
              bgcolor: `${themeColors.warning}20`,
              color: themeColors.warning,
              border: `1px solid ${themeColors.warning}40`,
              fontWeight: 600
            }} 
            size="small" 
            icon={<ExpiredIcon />} 
          />
        );
      } else {
        return (
          <Chip 
            label="APPROVED" 
            sx={{ 
              bgcolor: `${themeColors.primary}20`,
              color: themeColors.primary,
              border: `1px solid ${themeColors.primary}40`,
              fontWeight: 600
            }} 
            size="small" 
            icon={<CheckCircleIcon />} 
          />
        );
      }
    } else if (visitor.status === 'pending') {
      return (
        <Chip 
          label="PENDING" 
          sx={{ 
            bgcolor: `${themeColors.warning}20`,
            color: themeColors.warning,
            border: `1px solid ${themeColors.warning}40`,
            fontWeight: 600
          }} 
          size="small" 
        />
      );
    } else if (visitor.status === 'rejected') {
      return (
        <Chip 
          label="REJECTED" 
          sx={{ 
            bgcolor: `${themeColors.error}20`,
            color: themeColors.error,
            border: `1px solid ${themeColors.error}40`,
            fontWeight: 600
          }} 
          size="small" 
          icon={<CancelIcon />} 
        />
      );
    }
    
    return (
      <Chip 
        label={visitor.status || 'UNKNOWN'} 
        sx={{ 
          bgcolor: `${themeColors.textSecondary}20`,
          color: themeColors.textSecondary,
          border: `1px solid ${themeColors.textSecondary}40`,
          fontWeight: 600
        }} 
        size="small" 
      />
    );
  };

  // Get scan status
  const getScanStatus = (visitor) => {
    if (visitor.actualEntry) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon sx={{ color: themeColors.success }} fontSize="small" />
            <Typography variant="body2" sx={{ color: themeColors.success }}>
              Scanned at {formatDate(visitor.actualEntry)}
            </Typography>
          </Box>
          {visitor.residentEntryConfirmedAt && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon sx={{ color: themeColors.info }} fontSize="small" />
              <Typography variant="body2" sx={{ color: themeColors.info }}>
                Resident confirmed at {formatDate(visitor.residentEntryConfirmedAt)}
              </Typography>
            </Box>
          )}
          {visitor.residentDepartureConfirmedAt ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon sx={{ color: themeColors.warning }} fontSize="small" />
              <Typography variant="body2" sx={{ color: themeColors.warning }}>
                Departure confirmed at {formatDate(visitor.residentDepartureConfirmedAt)}
              </Typography>
            </Box>
          ) : visitor.status === 'active' ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon sx={{ color: themeColors.warning }} fontSize="small" />
              <Typography variant="body2" sx={{ color: themeColors.warning }}>
                Awaiting resident departure confirmation
              </Typography>
            </Box>
          ) : null}
        </Box>
      );
    } else if (visitor.status === 'approved') {
      const now = new Date();
      const departureDate = visitor.expectedDeparture ? new Date(visitor.expectedDeparture) : null;
      
      if (departureDate && departureDate < now) {
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CancelIcon sx={{ color: themeColors.warning }} fontSize="small" />
            <Typography variant="body2" sx={{ color: themeColors.warning }}>
              QR Expired
            </Typography>
          </Box>
        );
      }
      
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon sx={{ color: themeColors.info }} fontSize="small" />
          <Typography variant="body2" sx={{ color: themeColors.info }}>
            Not Scanned Yet
          </Typography>
        </Box>
      );
    }
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CancelIcon sx={{ color: themeColors.error }} fontSize="small" />
        <Typography variant="body2" sx={{ color: themeColors.error }}>
          {visitor.status === 'pending' ? 'Pending Approval' : 'Not Approved'}
        </Typography>
      </Box>
    );
  };

  // Handle view details
  const handleViewDetails = (visitor) => {
    setSelectedVisitor(visitor);
    setViewDialogOpen(true);
  };

  // Handle export to Excel
  const handleExportExcel = () => {
    if (visitors.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      const data = visitors.map(visitor => ({
        'Visitor Name': visitor.visitorName || 'N/A',
        'Visitor Phone': visitor.visitorPhone || 'N/A',
        'Resident Name': visitor.residentId ? `${visitor.residentId.firstName || ''} ${visitor.residentId.lastName || ''}`.trim() : 'N/A',
        'House Number': visitor.residentId?.houseNumber || 'N/A',
        'Purpose': visitor.purpose || 'N/A',
        'Vehicle Number': visitor.vehicleNumber || 'N/A',
        'Expected Arrival': formatDate(visitor.expectedArrival),
        'Expected Departure': formatDate(visitor.expectedDeparture),
        'Actual Entry': formatDate(visitor.actualEntry),
        'Actual Exit': formatDate(visitor.actualExit),
        'Status': visitor.status || 'N/A',
        'Scan Status': visitor.actualEntry ? 'Scanned' : 'Not Scanned',
        'QR Status': visitor.qrCodeVisible ? 'Visible' : 'Hidden',
        'Approved By': visitor.approvedBy ? `${visitor.approvedBy.firstName || ''} ${visitor.approvedBy.lastName || ''}`.trim() : 'N/A',
        'Approval Time': formatDate(visitor.approvedAt),
        'Created At': formatDate(visitor.createdAt)
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Visitor Logs');
      
      const fileName = `visitor_logs_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success(`Exported ${data.length} records`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  // Handle print visitor pass
  const handlePrintPass = (visitor) => {
    if (!visitor.qrCode || !visitor.qrCodeVisible) {
      toast.error('QR code not available for printing');
      return;
    }

    try {
      const printWindow = window.open('', '_blank');
      const now = new Date();
      const departureDate = new Date(visitor.expectedDeparture);
      const isExpired = now > departureDate;
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Visitor Pass - ${visitor.visitorName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
            }
            .pass-container { 
              border: 3px solid ${isExpired ? themeColors.error : themeColors.success}; 
              padding: 20px; 
              max-width: 400px; 
              margin: 0 auto; 
              text-align: center;
              border-radius: 10px;
            }
            .header { 
              background: ${isExpired ? themeColors.error : themeColors.success}; 
              color: white; 
              padding: 10px; 
              margin: -20px -20px 20px -20px;
              border-radius: 7px 7px 0 0;
            }
            .qr-code { 
              max-width: 200px; 
              margin: 20px auto; 
              padding: 10px;
              border: 2px solid #ddd;
              background: white;
            }
            .status-badge {
              display: inline-block;
              padding: 5px 10px;
              border-radius: 20px;
              background: ${isExpired ? '#ffebee' : '#e8f5e9'};
              color: ${isExpired ? themeColors.error : themeColors.success};
              font-weight: bold;
              margin: 10px 0;
            }
            .info-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 5px 0; 
              padding-bottom: 5px;
              border-bottom: 1px solid #eee;
            }
            .info-label { font-weight: bold; color: #666; }
            .info-value { color: #2d3748; }
            .footer { 
              margin-top: 20px; 
              font-size: 12px; 
              color: #777; 
              border-top: 1px solid #eee;
              padding-top: 10px;
            }
            @media print {
              body { padding: 0; }
              .pass-container { border: 2px solid #000; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="pass-container">
            <div class="header">
              <h2>VISITOR PASS</h2>
              <div class="status-badge">
                ${isExpired ? 'EXPIRED' : 'VALID'}
              </div>
            </div>
            
            <img src="${visitor.qrCode}" alt="QR Code" class="qr-code">
            
            <div style="text-align: left; margin-top: 20px;">
              <div class="info-row">
                <span class="info-label">Visitor:</span>
                <span>${visitor.visitorName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Phone:</span>
                <span>${visitor.visitorPhone}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Resident:</span>
                <span>${visitor.residentId?.firstName || ''} ${visitor.residentId?.lastName || ''}</span>
              </div>
              <div class="info-row">
                <span class="info-label">House:</span>
                <span>${visitor.residentId?.houseNumber || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Purpose:</span>
                <span>${visitor.purpose}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Arrival:</span>
                <span>${formatDate(visitor.expectedArrival)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Departure:</span>
                <span>${formatDate(visitor.expectedDeparture)}</span>
              </div>
              ${visitor.actualEntry ? `
              <div class="info-row">
                <span class="info-label">Entry Time:</span>
                <span>${formatDate(visitor.actualEntry)}</span>
              </div>
              ` : ''}
              ${visitor.actualExit ? `
              <div class="info-row">
                <span class="info-label">Exit Time:</span>
                <span>${formatDate(visitor.actualExit)}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="footer">
              Generated by VIMS Security • ${new Date().toLocaleDateString()}
              <br>
              Valid only with QR code scan at gate
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: ${themeColors.primary}; color: white; border: none; border-radius: 5px; cursor: pointer;">
              Print Pass
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; background: ${themeColors.error}; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
              Close
            </button>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to open print window');
    }
  };

  const handleSecurityScanAction = async (visitor) => {
    if (!visitor) return;

    const scanValue = visitor.qrToken || visitor.qrCode;
    if (!scanValue) {
      toast.error('Unable to process this visitor scan');
      return;
    }

    setScanInProgress(true);
    try {
      const response = await axios.post('/api/visitors/scan-action', { scanValue });
      if (response.data.success) {
        toast.success(response.data.message || 'Visitor scan action completed');
        fetchVisitors();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to process visitor scan action');
    } finally {
      setScanInProgress(false);
    }
  };

  // Get title based on selected tab - UPDATED FOR 3 TABS
  const getTitle = () => {
    switch(selectedTab) {
      case 0: return 'All Visitors';
      case 1: return 'Approved Visitors';
      case 2: return 'Pending Approval Requests';
      default: return 'Visitor Logs';
    }
  };

  // Get empty state message - UPDATED FOR 3 TABS
  const getEmptyStateMessage = () => {
    if (error) return 'Failed to load data';
    
    switch(selectedTab) {
      case 1: return 'No approved visitors found';
      case 2: return 'No pending approval requests';
      default: return 'No visitor records found';
    }
  };

  // Define recent activity
  const recentActivities = [
    { message: 'John Doe entered at 14:30', time: '2 min ago', user: 'Gate Scanner', type: 'Entry' },
    { message: 'Jane Smith exited at 14:25', time: '7 min ago', user: 'Gate Scanner', type: 'Exit' },
    { message: 'QR code expired for Visitor #123', time: '15 min ago', user: 'System', type: 'Expired' },
    { message: 'New visitor approved by Security', time: '25 min ago', user: 'Security Officer', type: 'Approval' }
  ];

  // Redirect if not authorized
  if (!currentUser || currentUser.role !== 'security') {
    navigate('/login');
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `
          radial-gradient(circle at top left, rgba(34,197,94,0.06), transparent 24%),
          radial-gradient(circle at top right, rgba(14,165,233,0.05), transparent 20%),
          ${themeColors.background}
        `
      }}
    >
      {/* Top Navigation Bar */}
      <AppBar
        position="sticky"
        sx={{
          bgcolor: 'rgba(255,255,255,0.92)',
          color: themeColors.textPrimary,
          backdropFilter: 'blur(14px)',
          boxShadow: '0 6px 24px rgba(15, 23, 42, 0.06)',
          borderBottom: `1px solid ${themeColors.border}`
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={handleBack}
            aria-label="back"
            sx={{ 
              mr: 2,
              color: themeColors.primary,
              borderRadius: 2.5,
              bgcolor: 'rgba(34, 197, 94, 0.14)',
              '&:hover': {
                bgcolor: 'rgba(34, 197, 94, 0.24)'
              }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <ScannerIcon sx={{ 
              mr: 2, 
              color: themeColors.primary,
              fontSize: 28 
            }} />
            <Typography variant="h6" sx={{ 
              fontWeight: 700,
              color: themeColors.textPrimary
            }}>
              Security Visitor Logs
            </Typography>
          </Box>
          
          <IconButton
            color="inherit"
            onClick={handleRefresh}
            title="Refresh data"
            disabled={loading}
            sx={{ 
              mr: 1,
              color: themeColors.textPrimary,
              '&:hover': {
                bgcolor: themeColors.primary + '10'
              }
            }}
          >
            {loading ? <CircularProgress size={24} sx={{ color: themeColors.primary }} /> : <RefreshIcon />}
          </IconButton>
          
          {/* User Profile Menu */}
          <IconButton
            edge="end"
            color="inherit"
            onClick={handleProfileMenuOpen}
            sx={{ 
              ml: 1,
              '&:hover': {
                transform: 'scale(1.05)',
                transition: 'transform 0.2s'
              }
            }}
          >
            <Avatar 
              sx={{ 
                width: 40, 
                height: 40, 
                bgcolor: themeColors.primary,
                fontSize: '1rem',
                fontWeight: 600,
                boxShadow: `0 2px 8px ${themeColors.primary}40`
              }}
            >
              {currentUser?.firstName?.charAt(0)}
              {currentUser?.lastName?.charAt(0)}
            </Avatar>
          </IconButton>

          {/* Profile Dropdown Menu */}
          <Menu
            anchorEl={profileAnchorEl}
            open={Boolean(profileAnchorEl)}
            onClose={handleProfileMenuClose}
            PaperProps={{
              sx: {
                width: 240,
                mt: 1.5,
                borderRadius: 2,
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                border: `1px solid ${themeColors.border}`
              }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disabled sx={{ opacity: 1, py: 1.5 }}>
              <ListItemIcon>
                <Avatar sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: themeColors.primary,
                  fontSize: '0.9rem'
                }}>
                  {currentUser?.firstName?.charAt(0)}
                  {currentUser?.lastName?.charAt(0)}
                </Avatar>
              </ListItemIcon>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: themeColors.textPrimary }}>
                  {currentUser?.firstName} {currentUser?.lastName}
                </Typography>
                <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                  {currentUser?.role} • Security Officer
                </Typography>
              </Box>
            </MenuItem>
            
            <Divider sx={{ my: 1 }} />
            
            <MenuItem 
              component={RouterLink}
              to="/dashboard"
              onClick={handleProfileMenuClose}
              sx={{ py: 1.5 }}
            >
              <ListItemIcon>
                <QrCodeScannerIcon fontSize="small" sx={{ color: themeColors.primary }} />
              </ListItemIcon>
              <Typography variant="body2">Dashboard</Typography>
            </MenuItem>
            
            <MenuItem 
              component={RouterLink}
              to="/profile"
              onClick={handleProfileMenuClose}
              sx={{ py: 1.5 }}
            >
              <ListItemIcon>
                <SettingsIcon fontSize="small" sx={{ color: themeColors.primary }} />
              </ListItemIcon>
              <Typography variant="body2">Profile Settings</Typography>
            </MenuItem>
            
            <Divider sx={{ my: 1 }} />
            
            <MenuItem 
              onClick={logout}
              sx={{ 
                py: 1.5,
                color: themeColors.error,
                '&:hover': {
                  bgcolor: themeColors.error + '10'
                }
              }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" sx={{ color: themeColors.error }} />
              </ListItemIcon>
              <Typography variant="body2">Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper
          sx={{
            mb: 3,
            p: { xs: 2.5, md: 3 },
            borderRadius: '22px',
            color: '#fff',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)',
            boxShadow: '0 18px 40px rgba(22, 101, 52, 0.35)'
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Visitor Logs & Tracking
          </Typography>
          <Typography sx={{ mt: 0.6, color: 'rgba(255,255,255,0.9)' }}>
            Monitor scans, entries/exits, and visitor QR validity in one place.
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            Security Officer: {currentUser?.firstName} {currentUser?.lastName}
          </Typography>
        </Paper>

        {/* Error Alert */}
        {error && !loading && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              borderRadius: 2,
              bgcolor: themeColors.error + '15',
              border: `1px solid ${themeColors.error}30`
            }}
            onClose={() => setError(null)}
            icon={<ErrorIcon />}
          >
            {error}
            <Button 
              size="small" 
              onClick={handleRefresh} 
              sx={{ ml: 2 }}
            >
              Retry
            </Button>
          </Alert>
        )}

        {/* Header */}
        <Box sx={{ mb: 4 }}>
          {/* Stats Cards - UPDATED: Removed Active and Expired stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: 'Total Visitors', value: loading ? '-' : stats.total, helper: 'all records', gradient: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)', shadow: '0 14px 34px rgba(29,78,216,0.34)' },
              { label: 'Scanned Today', value: loading ? '-' : stats.scanned, helper: 'entry logs', gradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', shadow: '0 14px 34px rgba(22,163,74,0.34)' },
              { label: 'Pending Approval', value: loading ? '-' : stats.pending, helper: 'for security review', gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', shadow: '0 14px 34px rgba(220,38,38,0.34)' }
            ].map((stat) => (
              <Grid item xs={6} sm={4} key={stat.label}>
                <Card
                  sx={{
                    borderRadius: '20px',
                    background: stat.gradient,
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.14)',
                    boxShadow: stat.shadow
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', p: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#fff' }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.84)' }}>
                      ↗ {stat.helper}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Filters */}
          <Paper sx={{ 
            p: 2, 
            mb: 3,
            borderRadius: '20px',
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
            border: `1px solid ${themeColors.border}`,
            bgcolor: themeColors.cardBackground
          }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Search visitors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: themeColors.textSecondary }} />
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      '&.Mui-focused': {
                        borderColor: themeColors.primary,
                        boxShadow: `0 0 0 3px ${themeColors.primary}20`
                      }
                    }
                  }}
                  InputLabelProps={{
                    sx: {
                      color: themeColors.textSecondary,
                      '&.Mui-focused': { color: themeColors.primary }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth disabled={loading}>
                  <InputLabel sx={{
                    color: themeColors.textSecondary,
                    '&.Mui-focused': { color: themeColors.primary }
                  }}>
                    Status
                  </InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{
                      borderRadius: 2,
                      bgcolor: '#f8fafc',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: themeColors.border
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: themeColors.primary
                      }
                    }}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
             <Grid item xs={12} sm={3}>
  <TextField
    fullWidth
    label="Date"
    type="date"
    value={dateFilter}
    onChange={(e) => setDateFilter(e.target.value)}
    disabled={loading}
    sx={{
      '& .MuiOutlinedInput-root': {
        borderRadius: 2,
        bgcolor: '#f8fafc'
      }
    }}
    InputLabelProps={{
      shrink: true,
      sx: {
        color: themeColors.textSecondary,
        '&.Mui-focused': { color: themeColors.primary }
      }
    }}
  />
</Grid>
              <Grid item xs={12} sm={2}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleSearch}
                    startIcon={<FilterIcon />}
                    disabled={loading}
                    fullWidth
                    sx={{ 
                      bgcolor: themeColors.primary,
                      borderRadius: 2.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: themeColors.primaryDark,
                        transform: 'translateY(-2px)',
                        boxShadow: `0 8px 25px ${themeColors.primary}40`
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {loading ? 'Loading...' : 'Filter'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleClearFilters}
                    disabled={loading}
                    fullWidth
                    sx={{
                      borderRadius: 2.5,
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: themeColors.border,
                      color: themeColors.textPrimary,
                      '&:hover': {
                        borderColor: themeColors.primary,
                        bgcolor: themeColors.primary + '08'
                      }
                    }}
                  >
                    Clear
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Box>

        {/* Tabs - UPDATED TO ONLY 3 TABS */}
        <Paper sx={{ 
          mb: 3, 
          borderRadius: '20px',
          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
          border: `1px solid ${themeColors.border}`,
          bgcolor: themeColors.cardBackground
        }}>
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                color: themeColors.textSecondary,
                '&.Mui-selected': {
                  color: themeColors.primary,
                  fontWeight: 600
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: themeColors.primary,
                height: 3
              }
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScannerIcon />
                  All Visitors
                  <Badge
                    badgeContent={loading ? '...' : stats.total}
                    color="primary"
                    sx={{ ml: 1 }}
                  />
                </Box>
              }
              disabled={loading}
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon />
                  Approved Visitors
                  <Badge
                    badgeContent={loading ? '...' : stats.approved}
                    color="primary"
                    sx={{ ml: 1 }}
                  />
                </Box>
              }
              disabled={loading}
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon />
                  Pending Approval
                  <Badge
                    badgeContent={loading ? '...' : stats.pending}
                    color="warning"
                    sx={{ ml: 1 }}
                  />
                </Box>
              }
              disabled={loading}
            />
          </Tabs>
        </Paper>

        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600,
            color: themeColors.textPrimary
          }}>
            {getTitle()} ({loading ? '...' : visitors.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={loading}
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 600,
                borderColor: themeColors.border,
                color: themeColors.textPrimary,
                '&:hover': {
                  borderColor: themeColors.primary,
                  bgcolor: themeColors.primary + '08'
                }
              }}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExportExcel}
              disabled={loading || visitors.length === 0}
              sx={{ 
                bgcolor: themeColors.primary,
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: themeColors.primaryDark,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 25px ${themeColors.primary}40`
                },
                transition: 'all 0.3s ease'
              }}
            >
              Export Excel
            </Button>
          </Box>
        </Box>

        {/* Visitors Table */}
        <TableContainer component={Paper} sx={{ 
          borderRadius: '20px',
          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
          border: `1px solid ${themeColors.border}`,
          bgcolor: themeColors.cardBackground
        }}>
          <Table>
            <TableHead>
              <TableRow sx={{ 
                bgcolor: 'rgba(22, 163, 74, 0.08)',
                '& th': {
                  fontWeight: 600,
                  color: themeColors.textPrimary,
                  borderColor: themeColors.border
                }
              }}>
                <TableCell>Visitor</TableCell>
                <TableCell>Resident</TableCell>
                <TableCell>Purpose</TableCell>
                <TableCell>Arrival Time</TableCell>
                <TableCell>Scan Status</TableCell>
                <TableCell>QR Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && visitors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress sx={{ color: themeColors.primary }} />
                    <Typography sx={{ mt: 2, color: themeColors.textPrimary }}>
                      Loading visitor logs...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <ErrorIcon sx={{ fontSize: 48, color: themeColors.error, mb: 2 }} />
                    <Typography variant="h6" sx={{ color: themeColors.error }}>
                      Failed to Load Data
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: themeColors.textSecondary,
                      mt: 1, 
                      mb: 2 
                    }}>
                      {error}
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={handleRefresh}
                      startIcon={<RefreshIcon />}
                      sx={{ 
                        bgcolor: themeColors.primary,
                        borderRadius: 2.5,
                        textTransform: 'none',
                        '&:hover': {
                          bgcolor: themeColors.primaryDark
                        }
                      }}
                    >
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={30} sx={{ color: themeColors.primary }} />
                    <Typography sx={{ mt: 2, color: themeColors.textPrimary }}>
                      Loading...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : visitors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <ScannerIcon sx={{ 
                      fontSize: 48, 
                      color: themeColors.textSecondary, 
                      mb: 2,
                      opacity: 0.5 
                    }} />
                    <Typography variant="h6" sx={{ color: themeColors.textPrimary }}>
                      No visitors found
                    </Typography>
                    <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                      {getEmptyStateMessage()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                visitors.map((visitor) => (
                  <TableRow 
                    key={visitor._id || visitor.id} 
                    hover
                    sx={{ 
                      '&:hover': {
                        bgcolor: themeColors.primary + '05'
                      },
                      '& td': {
                        borderColor: themeColors.border
                      }
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ 
                          bgcolor: themeColors.primary,
                          boxShadow: `0 2px 8px ${themeColors.primary}40`
                        }}>
                          {visitor.visitorName?.charAt(0) || 'V'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ 
                            fontWeight: 500,
                            color: themeColors.textPrimary
                          }}>
                            {visitor.visitorName || 'Unknown Visitor'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                            {visitor.visitorPhone || 'No phone'}
                          </Typography>
                          {visitor.vehicleNumber && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              <CarIcon fontSize="small" sx={{ color: themeColors.textSecondary }} />
                              <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                                {visitor.vehicleNumber}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {visitor.residentId ? (
                        <Box>
                          <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                            {visitor.residentId.firstName} {visitor.residentId.lastName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                            House {visitor.residentId.houseNumber}
                          </Typography>
                        </Box>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                        {visitor.purpose || 'No purpose specified'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                        {formatDate(visitor.expectedArrival)}
                      </Typography>
                      {visitor.actualEntry && (
                        <Typography variant="caption" sx={{ 
                          color: themeColors.success, 
                          display: 'block' 
                        }}>
                          Entered: {formatDate(visitor.actualEntry)}
                        </Typography>
                      )}
                      {visitor.actualExit && (
                        <Typography variant="caption" sx={{ 
                          color: themeColors.info, 
                          display: 'block' 
                        }}>
                          Exited: {formatDate(visitor.actualExit)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {getScanStatus(visitor)}
                    </TableCell>
                    <TableCell>
                      {getStatusChip(visitor)}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(visitor)}
                          title="View Details"
                          sx={{
                            color: themeColors.textSecondary,
                            '&:hover': {
                              color: themeColors.primary,
                              bgcolor: themeColors.primary + '10'
                            }
                          }}
                        >
                          <ViewIcon />
                        </IconButton>

                        {visitor.status === 'approved' && !visitor.actualEntry && (
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleSecurityScanAction(visitor)}
                            title="Log Entry"
                            disabled={scanInProgress}
                            sx={{
                              color: themeColors.textSecondary,
                              '&:hover': {
                                color: themeColors.primary,
                                bgcolor: themeColors.primary + '10'
                              }
                            }}
                          >
                            <QrCodeScannerIcon />
                          </IconButton>
                        )}

                        {visitor.status === 'active' && (
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleSecurityScanAction(visitor)}
                            title={visitor.residentDepartureConfirmedAt ? 'Log Exit' : 'Awaiting resident departure confirmation'}
                            disabled={scanInProgress || !visitor.residentDepartureConfirmedAt}
                            sx={{
                              color: themeColors.textSecondary,
                              '&:hover': {
                                color: visitor.residentDepartureConfirmedAt ? themeColors.success : themeColors.warning,
                                bgcolor: visitor.residentDepartureConfirmedAt ? themeColors.success + '10' : themeColors.warning + '10'
                              }
                            }}
                          >
                            <CarIcon />
                          </IconButton>
                        )}

                        {visitor.qrCodeVisible && visitor.qrCode && (
                          <IconButton
                            size="small"
                            onClick={() => handlePrintPass(visitor)}
                            title="Print Pass"
                            sx={{
                              color: themeColors.textSecondary,
                              '&:hover': {
                                color: themeColors.primary,
                                bgcolor: themeColors.primary + '10'
                              }
                            }}
                          >
                            <PrintIcon />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination - only show if not loading and has data */}
        {!loading && !error && total > 0 && (
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              const newRowsPerPage = parseInt(e.target.value, 10);
              setRowsPerPage(newRowsPerPage);
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
            disabled={loading}
            sx={{ 
              border: `1px solid ${themeColors.border}`,
              borderRadius: '0 0 8px 8px',
              mt: -1
            }}
          />
        )}

        {/* View Details Dialog */}
        <Dialog
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '18px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              border: `1px solid ${themeColors.border}`
            }
          }}
        >
          <DialogTitle sx={{ 
            fontWeight: 600,
            color: themeColors.textPrimary,
            borderBottom: `1px solid ${themeColors.border}`,
            pb: 2
          }}>
            Visitor Details
          </DialogTitle>
          <DialogContent>
            {selectedVisitor && (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" sx={{ color: themeColors.textSecondary }}>
                    Visitor Name
                  </Typography>
                  <Typography variant="body1" gutterBottom sx={{ color: themeColors.textPrimary }}>
                    {selectedVisitor.visitorName}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" sx={{ color: themeColors.textSecondary }}>
                    Phone Number
                  </Typography>
                  <Typography variant="body1" gutterBottom sx={{ color: themeColors.textPrimary }}>
                    {selectedVisitor.visitorPhone}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ color: themeColors.textSecondary }}>
                    Purpose
                  </Typography>
                  <Typography variant="body1" gutterBottom sx={{ color: themeColors.textPrimary }}>
                    {selectedVisitor.purpose}
                  </Typography>
                </Grid>
                {selectedVisitor.vehicleNumber && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ color: themeColors.textSecondary }}>
                      Vehicle Number
                    </Typography>
                    <Typography variant="body1" gutterBottom sx={{ color: themeColors.textPrimary }}>
                      {selectedVisitor.vehicleNumber}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" sx={{ color: themeColors.textSecondary }}>
                    Expected Arrival
                  </Typography>
                  <Typography variant="body1" gutterBottom sx={{ color: themeColors.textPrimary }}>
                    {formatDate(selectedVisitor.expectedArrival)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" sx={{ color: themeColors.textSecondary }}>
                    Expected Departure
                  </Typography>
                  <Typography variant="body1" gutterBottom sx={{ color: themeColors.textPrimary }}>
                    {formatDate(selectedVisitor.expectedDeparture)}
                  </Typography>
                </Grid>
                {selectedVisitor.actualEntry && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ color: themeColors.textSecondary }}>
                      Actual Entry
                    </Typography>
                    <Typography variant="body1" gutterBottom sx={{ color: themeColors.textPrimary }}>
                      {formatDate(selectedVisitor.actualEntry)}
                    </Typography>
                  </Grid>
                )}
                {selectedVisitor.actualExit && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ color: themeColors.textSecondary }}>
                      Actual Exit
                    </Typography>
                    <Typography variant="body1" gutterBottom sx={{ color: themeColors.textPrimary }}>
                      {formatDate(selectedVisitor.actualExit)}
                    </Typography>
                  </Grid>
                )}
                {selectedVisitor.residentEntryConfirmedAt && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ color: themeColors.textSecondary }}>
                      Resident Confirmation
                    </Typography>
                    <Typography variant="body1" gutterBottom sx={{ color: themeColors.textPrimary }}>
                      {formatDate(selectedVisitor.residentEntryConfirmedAt)}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ color: themeColors.textSecondary }}>
                    Resident Information
                  </Typography>
                  {selectedVisitor.residentId && (
                    <Typography variant="body1" sx={{ color: themeColors.textPrimary }}>
                      {selectedVisitor.residentId.firstName} {selectedVisitor.residentId.lastName}
                      {selectedVisitor.residentId.houseNumber && 
                        ` • House ${selectedVisitor.residentId.houseNumber}`}
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ color: themeColors.textSecondary }}>
                    Status
                  </Typography>
                  {getStatusChip(selectedVisitor)}
                </Grid>
                {selectedVisitor.qrCode && selectedVisitor.qrCodeVisible && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" sx={{ color: themeColors.textSecondary }} gutterBottom>
                      QR Code
                    </Typography>
                    <Box sx={{ textAlign: 'center' }}>
                      <img
                        src={selectedVisitor.qrCode}
                        alt="Visitor QR Code"
                        style={{ maxWidth: '200px', border: `1px solid ${themeColors.border}`, padding: '10px' }}
                      />
                      <Button
                        variant="outlined"
                        startIcon={<PrintIcon />}
                        onClick={() => handlePrintPass(selectedVisitor)}
                        sx={{ 
                          mt: 2,
                          borderRadius: 2.5,
                          textTransform: 'none',
                          fontWeight: 700,
                          borderColor: themeColors.border,
                          color: themeColors.textPrimary,
                          '&:hover': {
                            borderColor: themeColors.primary,
                            bgcolor: themeColors.primary + '08'
                          }
                        }}
                      >
                        Print Visitor Pass
                      </Button>
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button 
              onClick={() => setViewDialogOpen(false)}
              sx={{
                color: themeColors.textSecondary,
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 700,
                '&:hover': {
                  bgcolor: themeColors.primary + '08'
                }
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Recent Activity Section */}
        <Paper sx={{ 
          p: 3, 
          mt: 3, 
          borderRadius: '20px',
          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
          border: `1px solid ${themeColors.border}`,
          bgcolor: themeColors.cardBackground
        }}>
          <Typography variant="h6" gutterBottom sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            fontWeight: 600,
            color: themeColors.textPrimary
          }}>
            <ActiveIcon sx={{ color: themeColors.primary }} />
            Recent Activity
          </Typography>
          {recentActivities.length > 0 ? (
            <List>
              {recentActivities.map((update, index) => (
                <ListItem key={index} sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: themeColors.primary }}>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={update.message}
                    secondary={`${update.time} • ${update.user}`}
                    primaryTypographyProps={{ 
                      variant: 'body2',
                      color: themeColors.textPrimary
                    }}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      color: themeColors.textSecondary
                    }}
                  />
                  <ListItemSecondaryAction>
                    <Chip 
                      label={update.type} 
                      size="small" 
                      sx={{ 
                        bgcolor: `${themeColors.primary}20`,
                        color: themeColors.primary,
                        border: `1px solid ${themeColors.primary}40`,
                        fontWeight: 500
                      }} 
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                No recent activity
              </Typography>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default SecurityVisitorLogs;