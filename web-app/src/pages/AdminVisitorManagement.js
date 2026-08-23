import React, { useState, useEffect, useCallback } from 'react';
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
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem as SelectMenuItem,
  AppBar,
  Toolbar,
  InputAdornment
} from '@mui/material';
import {
  People as PeopleIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  BarChart as ChartIcon,
  ArrowBack as ArrowBackIcon,
  Logout as LogoutIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getBackendApiUrl } from '../utils/api';

const AdminVisitorManagement = () => {
  // Dashboard Theme Colors
  const themeColors = {
    primary: '#007A18',
    primaryLight: '#00D084',
    primaryDark: '#003D07',
    success: '#00D084',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#007A18',
    background: '#f3f5f7',
    cardBackground: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    border: 'rgba(15, 23, 42, 0.08)'
  };

  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportDateError, setExportDateError] = useState('');
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const [decisionAction, setDecisionAction] = useState('approve');
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionReasonError, setDecisionReasonError] = useState('');

  const { getCurrentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Add back button handler
  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Wrap fetchVisitors in useCallback to prevent infinite re-renders
  const buildActiveFilters = useCallback((overrides = {}) => {
    const filters = {};
    const nextSearch = Object.prototype.hasOwnProperty.call(overrides, 'searchTerm') ? overrides.searchTerm : searchTerm;
    const nextStatus = Object.prototype.hasOwnProperty.call(overrides, 'statusFilter') ? overrides.statusFilter : statusFilter;
    const nextDate = Object.prototype.hasOwnProperty.call(overrides, 'dateFilter') ? overrides.dateFilter : dateFilter;

    if (nextSearch?.trim()) filters.visitorName = nextSearch.trim();
    if (nextStatus && nextStatus !== 'all') filters.status = nextStatus;
    if (nextDate) filters.date = nextDate;
    return filters;
  }, [searchTerm, statusFilter, dateFilter]);

  const fetchVisitors = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...filters
      };
      
      const response = await axios.get('/api/visitors/admin/all', { params });
      
      if (response.data.success) {
        setVisitors(response.data.data);
        setTotal(response.data.count);
      }
    } catch (error) {
      toast.error('Failed to fetch visitors');
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get('/api/visitors/admin/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    
    fetchVisitors();
    fetchStats();
  }, [fetchVisitors, fetchStats, getCurrentUser, navigate]);

  const handleSearch = () => {
    setPage(0);
    fetchVisitors(buildActiveFilters());
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('');
    fetchVisitors(buildActiveFilters({ searchTerm: '', statusFilter: 'all', dateFilter: '' }));
  };

  const handleMenuOpen = (event, visitor) => {
    setAnchorEl(event.currentTarget);
    setSelectedVisitor(visitor);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const canChangeVisitorStatus = (visitor) => visitor?.status === 'pending';

  const handleViewDetails = () => {
    setViewDialogOpen(true);
    handleMenuClose();
  };

  const openDecisionDialog = (action) => {
    if (!canChangeVisitorStatus(selectedVisitor)) {
      toast.error('This visitor status can no longer be changed');
      handleMenuClose();
      return;
    }

    setDecisionAction(action);
    setDecisionReason('');
    setDecisionReasonError('');
    setDecisionDialogOpen(true);
    handleMenuClose();
  };

  const closeDecisionDialog = () => {
    setDecisionDialogOpen(false);
    setDecisionReason('');
    setDecisionReasonError('');
  };

  const handleDecisionSubmit = async () => {
    if (!selectedVisitor) return;

    const trimmedReason = decisionReason.trim();
    if (!trimmedReason) {
      setDecisionReasonError('Reason is required');
      return;
    }

    try {
      const response = await axios.put(`/api/visitors/admin/${selectedVisitor._id}/override`, {
        action: decisionAction,
        reason: trimmedReason,
        notes: `${decisionAction === 'approve' ? 'Approval' : 'Rejection'} reason: ${trimmedReason}`
      });

      if (response.data.success) {
        toast.success(`Visitor ${decisionAction === 'approve' ? 'approved' : 'rejected'}`);
        closeDecisionDialog();
        fetchVisitors(buildActiveFilters());
        fetchStats();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || `Failed to ${decisionAction} visitor`);
      console.error(`Error ${decisionAction}ing visitor:`, error);
    }
  };

  const handleExport = async (fileFormat = 'pdf') => {
    setExportDateError('');
    if (exportStartDate && exportEndDate && new Date(exportStartDate) > new Date(exportEndDate)) {
      setExportDateError('Start Date cannot be after End Date');
      return;
    }

    setExportLoading(true);
    try {
      const timezoneOffset = new Date().getTimezoneOffset();
      const params = new URLSearchParams({
        format: fileFormat,
        timezoneOffset: String(timezoneOffset)
      });

      if (exportStartDate) params.set('startDate', exportStartDate);
      if (exportEndDate) params.set('endDate', exportEndDate);

      const response = await fetch(getBackendApiUrl(`/api/visitors/admin/export?${params.toString()}`), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const text = await response.text();
        let message = 'Export failed';
        try {
          const errorData = JSON.parse(text);
          message = errorData.error || message;
        } catch {
          message = text || message;
        }
        throw new Error(message);
      }

      const expectedType = fileFormat === 'pdf' ? 'application/pdf' : 'text/csv';
      if (!response.headers.get('content-type')?.includes(expectedType)) {
        const text = await response.text();
        throw new Error(text || `Export failed: invalid ${fileFormat.toUpperCase()} response`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const exportTime = new Date();
      const timestamp = exportTime.toISOString().replace(/[:.]/g, '-').split('Z')[0];
      a.href = url;
      a.download = `VIMS_Visitors_Export_${timestamp}.${fileFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Visitors exported to ${fileFormat.toUpperCase()}`);
      setExportDialogOpen(false);
    } catch (error) {
      toast.error(error.message || `Failed to export ${fileFormat.toUpperCase()}`);
      console.error('Error exporting data:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      case 'active': return 'info';
      case 'completed': return 'primary';
      default: return 'default';
    }
  };

  const getVisitorStatusLabel = (visitor) => {
    const label = visitor?.qrStatus || visitor?.status || 'pending';
    const normalizedStatus = String(label).toLowerCase();
    const progress = visitor?.scanProgress || {};
    const total = Math.max(1, Number(progress.groupSize || visitor?.numberOfCompanions || 0));
    const countByStatus = {
      entered: progress.entryScanCount ?? (visitor?.actualEntry ? total : 0),
      arrived: progress.residentArrivalConfirmCount ?? (visitor?.residentEntryConfirmedAt ? total : 0),
      departed: progress.residentDepartureConfirmCount ?? (visitor?.residentDepartureConfirmedAt ? total : 0),
      exited: visitor?.status === 'completed' ? (progress.exitScanCount || total) : progress.exitScanCount,
      completed: visitor?.status === 'completed' ? (progress.exitScanCount || total) : progress.exitScanCount,
    };
    const shouldShowCount = ['entered', 'arrived', 'departed', 'exited', 'completed'].includes(normalizedStatus);
    const count = Number(countByStatus[normalizedStatus] || 0);
    return shouldShowCount ? `${label} ${count}/${total}` : label;
  };

  if (loading && !visitors.length) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: themeColors.background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `
          radial-gradient(circle at top left, rgba(34,197,94,0.06), transparent 24%),
          radial-gradient(circle at top right, rgba(14,165,233,0.05), transparent 20%),
          ${themeColors.background}
        `,
        '@keyframes fadeUpSoft': {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        },
        '@keyframes screenFadeIn': {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        }
      }}
    >
      {/* TOP NAVIGATION BAR */}
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
          <IconButton edge="start" onClick={handleBack} sx={{ mr: 2, color: themeColors.textPrimary, bgcolor: 'rgba(15,23,42,0.04)', border: `1px solid ${themeColors.border}`, '&:hover': { bgcolor: 'rgba(15,23,42,0.08)' } }}>
            <ArrowBackIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800 }}>
            Admin Visitor Management
          </Typography>

          <Button 
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{
              color: themeColors.error,
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': {
                backgroundColor: 'rgba(239,68,68,0.08)'
              }
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4, animation: 'screenFadeIn 0.55s ease' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ 
                bgcolor: themeColors.primary,
                boxShadow: `0 10px 22px ${themeColors.primary}40`
              }}>
                <SecurityIcon />
              </Avatar>
              <Box>
                <Typography variant="h4" component="h1" sx={{ 
                  fontWeight: 700,
                  color: themeColors.textPrimary,
                  background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.primaryLight})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Visitor Management
                </Typography>
                <Typography variant="body1" sx={{ color: themeColors.textSecondary }}>
                  Manage and oversee all visitor activities
                </Typography>
              </Box>
            </Box>
            
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
              sx={{ 
                display: { xs: 'none', sm: 'flex' },
                  borderRadius: '12px',
                borderColor: themeColors.primary,
                color: themeColors.primary,
                  textTransform: 'none',
                  fontWeight: 700,
                '&:hover': {
                  borderColor: themeColors.primaryDark,
                  backgroundColor: themeColors.primary + '08'
                }
              }}
            >
              Back to Dashboard
            </Button>
          </Box>

          {/* Stats Cards */}
          {stats && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '20px', 
                  color: 'white',
                  background: 'linear-gradient(135deg, #2349d8 0%, #243fb8 100%)',
                  boxShadow: '0 16px 28px rgba(15,23,42,0.10)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  animation: 'fadeUpSoft 0.45s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 18px 34px rgba(15,23,42,0.12)'
                  },
                  transition: 'all 0.3s ease',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    top: -38,
                    right: -28,
                    bgcolor: 'rgba(255,255,255,0.14)'
                  }
                }}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 700,
                      mb: 1 
                    }}>
                      {stats.totals?.totalVisitors || 0}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.86)' }}>Total Visitors</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '20px', 
                  color: 'white',
                  background: 'linear-gradient(135deg, #00A85A 0%, #17803d 100%)',
                  boxShadow: '0 16px 28px rgba(15,23,42,0.10)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  animation: 'fadeUpSoft 0.52s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 18px 34px rgba(15,23,42,0.12)'
                  },
                  transition: 'all 0.3s ease',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    top: -38,
                    right: -28,
                    bgcolor: 'rgba(255,255,255,0.14)'
                  }
                }}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Typography variant="h4" sx={{ 

                      fontWeight: 700,
                      mb: 1 
                    }}>
                      {stats.totals?.pendingVisitors || 0}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.86)' }}>Pending</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '20px', 
                  color: 'white',
                  background: 'linear-gradient(135deg, #0986c8 0%, #0d6997 100%)',
                  boxShadow: '0 16px 28px rgba(15,23,42,0.10)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  animation: 'fadeUpSoft 0.59s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 18px 34px rgba(15,23,42,0.12)'
                  },
                  transition: 'all 0.3s ease',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    top: -38,
                    right: -28,
                    bgcolor: 'rgba(255,255,255,0.14)'
                  }
                }}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 700,
                      mb: 1 
                    }}>
                      {stats.totals?.approvedVisitors || 0}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.86)' }}>Approved</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ 
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '20px', 
                  color: 'white',
                  background: 'linear-gradient(135deg, #e02424 0%, #b91c1c 100%)',
                  boxShadow: '0 16px 28px rgba(15,23,42,0.10)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  animation: 'fadeUpSoft 0.66s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 18px 34px rgba(15,23,42,0.12)'
                  },
                  transition: 'all 0.3s ease',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    top: -38,
                    right: -28,
                    bgcolor: 'rgba(255,255,255,0.14)'
                  }
                }}>
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 700,
                      mb: 1 
                    }}>
                      {stats.totals?.activeVisitors || 0}
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.86)' }}>Active Now</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Filters */}
          <Paper sx={{ 
            p: 3, 
            mb: 3, 
            borderRadius: '20px', 
            boxShadow: '0 12px 26px rgba(15,23,42,0.06)',
            border: `1px solid ${themeColors.border}`,
            backgroundColor: themeColors.cardBackground,
            animation: 'fadeUpSoft 0.7s ease'
          }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Search by name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: themeColors.textSecondary }} />
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
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{
                      borderRadius: 2,
                      backgroundColor: '#f8fafc',
                      '&.Mui-focused': {
                        borderColor: themeColors.primary,
                        boxShadow: `0 0 0 3px ${themeColors.primary}20`
                      }
                    }}
                  >
                    <SelectMenuItem value="all">All Status</SelectMenuItem>
                    <SelectMenuItem value="pending">Pending</SelectMenuItem>
                    <SelectMenuItem value="approved">Approved</SelectMenuItem>
                    <SelectMenuItem value="rejected">Rejected</SelectMenuItem>
                    <SelectMenuItem value="active">Active</SelectMenuItem>
                    <SelectMenuItem value="completed">Completed</SelectMenuItem>
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
              <Grid item xs={12} sm={2}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleSearch}
                    startIcon={<FilterIcon />}
                    fullWidth
                    sx={{ 
                      borderRadius: '12px',
                      bgcolor: themeColors.primary,
                      '&:hover': {
                        bgcolor: themeColors.primaryDark
                      },
                      fontWeight: 600
                    }}
                  >
                    Filter
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleClearFilters}
                    fullWidth
                    sx={{ 
                      borderRadius: '12px',
                      borderColor: themeColors.border,
                      color: themeColors.textPrimary,
                      textTransform: 'none',
                      '&:hover': {
                        borderColor: themeColors.primary,
                        backgroundColor: themeColors.primary + '08'
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

        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" sx={{ color: themeColors.textPrimary, fontWeight: 800 }}>
            Visitor List ({total} total)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                fetchVisitors();
                fetchStats();
              }}
              sx={{ 
                borderRadius: '12px',
                borderColor: themeColors.border,
                color: themeColors.textPrimary,
                textTransform: 'none',
                fontWeight: 700,
                '&:hover': {
                  borderColor: themeColors.primary,
                  backgroundColor: themeColors.primary + '08'
                }
              }}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => setExportDialogOpen(true)}
              sx={{ 
                borderRadius: '12px',
                borderColor: themeColors.border,
                color: themeColors.textPrimary,
                textTransform: 'none',
                fontWeight: 700,
                '&:hover': {
                  borderColor: themeColors.primary,
                  backgroundColor: themeColors.primary + '08'
                }
              }}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<ChartIcon />}
              onClick={() => navigate('/dashboard/admin/visitor-reports')}
              sx={{ 
                borderRadius: '12px',
                bgcolor: themeColors.primary,
                '&:hover': {
                  bgcolor: themeColors.primaryDark
                },
                fontWeight: 700,
                textTransform: 'none'
              }}
            >
              Reports
            </Button>
          </Box>
        </Box>

        {/* Visitors Table */}
        <TableContainer component={Paper} sx={{ 
          borderRadius: '20px', 
          boxShadow: '0 12px 26px rgba(15,23,42,0.06)',
          border: `1px solid ${themeColors.border}`,
          backgroundColor: themeColors.cardBackground,
          overflow: 'hidden',
          animation: 'fadeUpSoft 0.82s ease'
        }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 600, color: themeColors.textPrimary }}>Visitor Name</TableCell>
                <TableCell sx={{ fontWeight: 600, color: themeColors.textPrimary }}>Resident</TableCell>
                <TableCell sx={{ fontWeight: 600, color: themeColors.textPrimary }}>Purpose</TableCell>
                <TableCell sx={{ fontWeight: 600, color: themeColors.textPrimary }}>Arrival</TableCell>
                <TableCell sx={{ fontWeight: 600, color: themeColors.textPrimary }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, color: themeColors.textPrimary }}>Approved By</TableCell>
                <TableCell sx={{ fontWeight: 600, color: themeColors.textPrimary }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visitors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <PeopleIcon sx={{ fontSize: 64, mb: 2, color: themeColors.textSecondary }} />
                    <Typography variant="body1" sx={{ color: themeColors.textSecondary }}>
                      No visitors found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                visitors.map((visitor) => (
                  <TableRow 
                    key={visitor._id} 
                    hover
                    sx={{ 
                      '&:hover': { backgroundColor: '#f8fafc' },
                      borderBottom: `1px solid ${themeColors.border}`
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="600" sx={{ color: themeColors.textPrimary }}>
                        {visitor.visitorName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                        {visitor.visitorPhone}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {visitor.residentId ? (
                        <>
                          <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                            {visitor.residentId.firstName} {visitor.residentId.lastName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                            House {visitor.residentId.houseNumber}
                          </Typography>
                        </>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                        {visitor.purpose}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: themeColors.textPrimary }}>
                      {formatDate(visitor.expectedArrival)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getVisitorStatusLabel(visitor)}
                        size="small"
                        color={getStatusColor(visitor.status)}
                      />
                    </TableCell>
                    <TableCell>
                      {visitor.approvedBy ? (
                        <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                          {visitor.approvedBy.firstName} ({visitor.approvedBy.role})
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                          Not approved
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, visitor)}
                        sx={{
                          '&:hover': {
                            backgroundColor: themeColors.primary + '20'
                          }
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          sx={{
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              color: themeColors.textPrimary
            }
          }}
        />

        {/* View Details Dialog */}
        <Dialog
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '20px',
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
            Visitor Details
          </DialogTitle>
          <DialogContent>
            {selectedVisitor && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
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
                    Phone
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
                <Grid item xs={12}>
                  <Divider sx={{ my: 2, borderColor: themeColors.border }} />
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
              </Grid>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button 
              onClick={() => setViewDialogOpen(false)}
              sx={{
                color: themeColors.textSecondary,
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
                '&:hover': {
                  backgroundColor: themeColors.primary + '08'
                }
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Export Dialog */}
        <Dialog
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '20px',
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
            Export Visitor Data
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
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
                  label="End Date"
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
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
              <Grid item xs={12}>
      {exportDateError ? (
        <Alert severity="error" sx={{ borderRadius: '12px' }}>
          {exportDateError}
        </Alert>
      ) : (
                <Alert severity="info" sx={{ 
                  borderRadius: '12px',
                  backgroundColor: themeColors.info + '15',
                  border: `1px solid ${themeColors.info}30`
                }}>
                  Leave dates empty to export all visitor records. Choose PDF for a formatted report or CSV for spreadsheet import.
                </Alert>
      )}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button 
              onClick={() => setExportDialogOpen(false)}
              sx={{
                color: themeColors.textSecondary,
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
                '&:hover': {
                  backgroundColor: themeColors.primary + '08'
                }
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => handleExport('csv')}
              disabled={exportLoading}
              startIcon={exportLoading ? <CircularProgress size={20} /> : <DownloadIcon />}
              sx={{ 
                borderRadius: '12px',
                bgcolor: themeColors.primaryDark,
                '&:hover': {
                  bgcolor: themeColors.primary
                },
                fontWeight: 700,
                textTransform: 'none'
              }}
            >
              {exportLoading ? 'Exporting...' : 'Export CSV'}
            </Button>
            <Button
              variant="contained"
              onClick={() => handleExport('pdf')}
              disabled={exportLoading}
              startIcon={exportLoading ? <CircularProgress size={20} /> : <DownloadIcon />}
              sx={{ 
                borderRadius: '12px',
                bgcolor: themeColors.primary,
                '&:hover': {
                  bgcolor: themeColors.primaryDark
                },
                fontWeight: 700,
                textTransform: 'none'
              }}
            >
              {exportLoading ? 'Exporting...' : 'Export PDF'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Visitor Decision Dialog */}
        <Dialog
          open={decisionDialogOpen}
          onClose={closeDecisionDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
            }
          }}
        >
          <DialogTitle sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: decisionAction === 'approve' ? themeColors.success : themeColors.error
          }}>
            {decisionAction === 'approve' ? (
              <ApproveIcon sx={{ color: themeColors.success }} />
            ) : (
              <RejectIcon sx={{ color: themeColors.error }} />
            )}
            {decisionAction === 'approve' ? 'Approve Visitor' : 'Reject Visitor'}
          </DialogTitle>
          <DialogContent>
            {selectedVisitor && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {selectedVisitor.visitorName} - {selectedVisitor.purpose}
              </Alert>
            )}
            <TextField
              label="Reason"
              value={decisionReason}
              onChange={(event) => {
                setDecisionReason(event.target.value);
                if (decisionReasonError) setDecisionReasonError('');
              }}
              error={Boolean(decisionReasonError)}
              helperText={decisionReasonError || 'Required for visitor approvals and rejections.'}
              fullWidth
              multiline
              minRows={3}
              autoFocus
              required
            />
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button onClick={closeDecisionDialog}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleDecisionSubmit}
              disabled={!decisionReason.trim()}
              sx={{
                bgcolor: decisionAction === 'approve' ? themeColors.success : themeColors.error,
                '&:hover': {
                  bgcolor: decisionAction === 'approve' ? '#00A85A' : '#dc2626'
                }
              }}
            >
              {decisionAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
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
          <MenuItem onClick={handleViewDetails}>
            <ListItemIcon>
              <ViewIcon fontSize="small" />
            </ListItemIcon>
            View Details
          </MenuItem>
          <Divider />
          
          <MenuItem
            onClick={() => openDecisionDialog('approve')}
            disabled={!canChangeVisitorStatus(selectedVisitor)}
          >
            <ListItemIcon>
              <ApproveIcon fontSize="small" sx={{ color: themeColors.success }} />
            </ListItemIcon>
            Approve
          </MenuItem>
          <MenuItem
            onClick={() => openDecisionDialog('reject')}
            disabled={!canChangeVisitorStatus(selectedVisitor)}
          >
            <ListItemIcon>
              <RejectIcon fontSize="small" sx={{ color: themeColors.error }} />
            </ListItemIcon>
            Reject
          </MenuItem>
        </Menu>
      </Container>
    </Box>
  );
};

export default AdminVisitorManagement;
