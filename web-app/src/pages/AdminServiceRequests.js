import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  AppBar,
  Toolbar,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  Tabs,
  Tab,
  InputAdornment,
  LinearProgress,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Build as BuildIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Work as WorkIcon,
  ArrowBack as ArrowBackIcon,
  Logout as LogoutIcon,
  MoreVert as MoreVertIcon,
  RateReview as ReviewIcon,
  Search as SearchIcon,
  Star as StarIcon,
  Cancel as CancelIcon,
  Settings as SettingsIcon,
  QrCodeScanner as QrCodeScannerIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ReportToolbar from '../components/ReportToolbar';

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

const AdminServiceRequests = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openProcessDialog, setOpenProcessDialog] = useState(false);
  const [openCompleteDialog, setOpenCompleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [stats, setStats] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const [processForm, setProcessForm] = useState({
    status: 'under-review',
    adminNotes: '',
    assignedTo: '',
    estimatedCompletion: ''
  });

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Emergency categories that require immediate security response
  const emergencyCategories = useMemo(() => ['security'], []);
  const emergencyKeywords = useMemo(() => ['fire', 'emergency', 'alert', 'danger', 'urgent'], []);

  // Function to get staff members suitable for a specific category
  const getStaffForCategory = (category) => {
    if (category === 'security') {
      return staffMembers.filter(staff => staff.role === 'security');
    }
    return staffMembers.filter(staff => staff.role !== 'security');
  };

  // Function to check if request is emergency
  const isEmergency = useCallback((request) => {
    if (!request) return false;
    const titleLower = request.title?.toLowerCase() || '';
    const descLower = request.description?.toLowerCase() || '';
    const combined = titleLower + ' ' + descLower;
    
    return emergencyCategories.includes(request.category) || 
           emergencyKeywords.some(keyword => combined.includes(keyword));
  }, [emergencyCategories, emergencyKeywords]);

  // Function to call 911
  const call911 = useCallback(() => {
    // Create a tel link to call 911
    window.location.href = 'tel:911';
    toast.success('Initiating emergency call to 911');
  }, []);

  const { getCurrentUser, logout: contextLogout } = useAuth();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const categories = useMemo(() => ['plumbing', 'electrical', 'carpentry', 'cleaning', 'gardening', 'security', 'other'], []);
  const priorities = useMemo(() => ['low', 'medium', 'high', 'urgent'], []);

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

 useEffect(() => {
  const fetchInitialData = async () => {
    if (user?.role === 'admin') {
      try {
        setFetching(true);

        const requestsResponse = await axios.get('/api/service-requests');
        if (requestsResponse.data.success) {
         const allRequests = requestsResponse.data.data || [];
setRequests(allRequests);
setFilteredRequests(allRequests);

          const pendingCount = allRequests.filter(req => 
            req.status === 'pending' || req.status === 'under-review'
          ).length;
          
          const underReviewCount = allRequests.filter(req => 
            req.status === 'under-review'
          ).length;
          
          const assignedCount = allRequests.filter(req => 
            req.status === 'assigned'
          ).length;
          
          const inProgressCount = allRequests.filter(req => 
            req.status === 'in-progress'
          ).length;
          
          const completedCount = allRequests.filter(req => 
            req.status === 'completed'
          ).length;
          
          const urgentCount = allRequests.filter(req => 
            req.priority === 'urgent'
          ).length;
          
          const ratedRequests = allRequests.filter(req => req.rating);
          const averageRating = ratedRequests.length > 0 
            ? ratedRequests.reduce((sum, req) => sum + req.rating, 0) / ratedRequests.length 
            : 0;
          
          setStats({
            totalRequests: allRequests.length,
            pendingRequests: pendingCount,
            underReviewRequests: underReviewCount,
            assignedRequests: assignedCount,
            inProgressRequests: inProgressCount,
            completedRequests: completedCount,
            urgentRequests: urgentCount,
            averageRating: averageRating
          });
        }

        const staffResponse = await axios.get('/api/service-requests/admin/staff');
        if (staffResponse.data.success) {
          setStaffMembers(staffResponse.data.data || []);
        }

        const statsResponse = await axios.get('/api/service-requests/admin/dashboard');
        if (statsResponse.data.success) {
          setStats(prev => ({
            ...prev,
            ...statsResponse.data.data
          }));
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to fetch data');
      } finally {
        setFetching(false);
      }
    }
  };

  if (user?.role === 'admin') {
    fetchInitialData();
  }
}, [user?.role]);

useEffect(() => {
  if (requests.length > 0) {
    let filtered = [...requests];

    if (activeTab && activeTab !== 'all') {
      filtered = filtered.filter(request => request.status === activeTab);
    }

    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(request => request.category === categoryFilter);
    }

    if (priorityFilter && priorityFilter !== 'all') {
      filtered = filtered.filter(request => request.priority === priorityFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(request => {
        const residentName = request.residentId 
          ? `${request.residentId.firstName || ''} ${request.residentId.lastName || ''}`.toLowerCase()
          : '';
        
        const title = request.title ? request.title.toLowerCase() : '';
        const description = request.description ? request.description.toLowerCase() : '';
        const houseNumber = request.residentId?.houseNumber ? request.residentId.houseNumber.toLowerCase() : '';
        
        return title.includes(query) ||
               description.includes(query) ||
               residentName.includes(query) ||
               houseNumber.includes(query);
      });
    }
    
    setFilteredRequests(filtered);
  }
}, [requests, activeTab, categoryFilter, priorityFilter, searchQuery]);

  const fetchAllRequests = useCallback(async () => {
    setFetching(true);
    try {
      const response = await axios.get('/api/service-requests');
      
      if (response.data.success) {
      const allRequests = response.data.data || [];
      setRequests(allRequests);
      setFilteredRequests(allRequests);

        const pendingCount = allRequests.filter(req => 
          req.status === 'pending' || req.status === 'under-review'
        ).length;
        
        const underReviewCount = allRequests.filter(req => 
          req.status === 'under-review'
        ).length;
        
        const assignedCount = allRequests.filter(req => 
          req.status === 'assigned'
        ).length;
        
        const inProgressCount = allRequests.filter(req => 
          req.status === 'in-progress'
        ).length;
        
        const completedCount = allRequests.filter(req => 
          req.status === 'completed'
        ).length;
        
        const urgentCount = allRequests.filter(req => 
          req.priority === 'urgent'
        ).length;
        
        const ratedRequests = allRequests.filter(req => req.rating);
        const averageRating = ratedRequests.length > 0 
          ? ratedRequests.reduce((sum, req) => sum + req.rating, 0) / ratedRequests.length 
          : 0;
        
        setStats(prev => ({
          ...prev,
          totalRequests: allRequests.length,
          pendingRequests: pendingCount,
          underReviewRequests: underReviewCount,
          assignedRequests: assignedCount,
          inProgressRequests: inProgressCount,
          completedRequests: completedCount,
          urgentRequests: urgentCount,
          averageRating: averageRating
        }));
      }
      } catch (error) {
    console.error('Failed to fetch service requests:', error);
    toast.error('Failed to fetch service requests');
  } finally {
    setFetching(false);
    }
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await axios.get('/api/service-requests/admin/dashboard');
      if (response.data.success) {
        setStats(prev => ({
          ...prev,
          ...response.data.data
        }));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  }, []);

  const handleBack = useCallback(() => navigate(-1), [navigate]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  }, []);

  const formatShortDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  }, []);

  const handleExportXlsx = useCallback(() => {
    if (!filteredRequests.length) {
      toast.error('No records to export');
      return;
    }

    const rows = filteredRequests.map((request) => ({
      ID: request._id ? request._id.toString().slice(-6) : 'N/A',
      Resident: `${request.residentId?.firstName || ''} ${request.residentId?.lastName || ''}`.trim() || 'N/A',
      House: request.residentId?.houseNumber || 'N/A',
      Category: request.category || 'N/A',
      Priority: request.priority || 'N/A',
      Status: request.status || 'N/A',
      AssignedTo: request.assignedTo
        ? `${request.assignedTo.firstName || ''} ${request.assignedTo.lastName || ''}`.trim()
        : 'Unassigned',
      CreatedAt: formatDate(request.createdAt),
      UpdatedAt: formatDate(request.updatedAt),
      Title: request.title || 'N/A',
      Description: request.description || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Service Requests');
    XLSX.writeFile(wb, `admin_service_requests_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel exported successfully');
  }, [filteredRequests, formatDate]);

  const handleExportPdf = useCallback(async () => {
    try {
      const response = await fetch('/api/serviceRequests/export?format=pdf', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VIMS_Service_Requests_Export_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export PDF');
    }
  }, []);

  const handleMenuOpen = useCallback((event, request) => {
    setAnchorEl(event.currentTarget);
    setSelectedRequest(request);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleOpenProcess = useCallback(() => {
    if (!selectedRequest) return;
    
    setProcessForm({
      status: selectedRequest.status === 'pending' ? 'under-review' : selectedRequest.status,
      adminNotes: selectedRequest.adminNotes || '',
      assignedTo: selectedRequest.assignedTo?._id || '',
      estimatedCompletion: selectedRequest.estimatedCompletion 
        ? new Date(selectedRequest.estimatedCompletion).toISOString().split('T')[0] 
        : ''
    });
    setOpenProcessDialog(true);
    handleMenuClose();
  }, [selectedRequest, handleMenuClose]);

  const handleProcessSubmit = useCallback(async () => {
    if (!selectedRequest?._id) return;
    
    try {
      setLoading(true);
      
      // Check if this is an emergency
      const emergency = isEmergency(selectedRequest);
      
      // Auto-assign to security for emergency + call 911
      let assignedStaffId = processForm.assignedTo;
      
      if (emergency) {
        // Get first available security personnel
        const securityStaff = staffMembers.filter(staff => staff.role === 'security');
        if (securityStaff.length > 0) {
          assignedStaffId = securityStaff[0]._id;
          // Call 911 immediately for emergency
          setTimeout(() => call911(), 500);
        }
      }
      
      // Determine which endpoint to call based on the action
      let response;
      if (assignedStaffId && processForm.status === 'assigned') {
        // Assign to staff
        response = await axios.put(`/api/service-requests/${selectedRequest._id}/assign-staff`, {
          assignedTo: assignedStaffId,
          adminNotes: emergency ? `[EMERGENCY] ${processForm.adminNotes}` : processForm.adminNotes
        });
      } else {
        // Review/update status
        response = await axios.put(`/api/service-requests/${selectedRequest._id}/review`, {
          status: processForm.status,
          adminNotes: emergency ? `[EMERGENCY] ${processForm.adminNotes}` : processForm.adminNotes,
          estimatedCompletion: processForm.estimatedCompletion
        });
      }
      
      if (response.data.success) {
        if (emergency) {
          toast.success('🚨 Emergency detected! Security assigned & 911 called');
        } else {
          toast.success('Request processed successfully');
        }
        setOpenProcessDialog(false);
        fetchAllRequests();
        fetchDashboardStats();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  }, [selectedRequest, processForm, fetchAllRequests, fetchDashboardStats, staffMembers, isEmergency, call911]);

  const handleUpdateStatus = useCallback(async (status) => {
    if (!selectedRequest?._id) return;
    
    try {
      setLoading(true);
      const response = await axios.put(`/api/service-requests/${selectedRequest._id}/status`, { status });
      
      if (response.data.success) {
        toast.success(`Request status updated to ${status}`);
        fetchAllRequests();
        fetchDashboardStats();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  }, [selectedRequest, fetchAllRequests, fetchDashboardStats]);

  const handleViewCompleteDetails = useCallback((request) => {
    setSelectedRequest(request);
    setOpenCompleteDialog(true);
    handleMenuClose();
  }, [handleMenuClose]);

  const getPriorityChip = useCallback((priority) => {
    const colors = {
      low: themeColors.success,
      medium: themeColors.warning,
      high: themeColors.error,
      urgent: themeColors.error
    };
    const color = colors[priority] || themeColors.textSecondary;
    const label = priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Unknown';
    return (
      <Chip 
        label={label} 
        sx={{ 
          bgcolor: `${color}20`,
          color: color,
          border: `1px solid ${color}40`,
          fontWeight: 600
        }} 
        size="small" 
      />
    );
  }, []);

  const getStatusChip = useCallback((status) => {
    const statusConfig = {
      pending: { 
        label: 'Pending', 
        color: themeColors.warning, 
        icon: <PendingIcon /> 
      },
      assigned: { 
        label: 'Assigned', 
        color: themeColors.primary, 
        icon: <AssignmentIcon /> 
      },
      'in-progress': { 
        label: 'In Progress', 
        color: themeColors.info, 
        icon: <WorkIcon /> 
      },
      completed: { 
        label: 'Completed', 
        color: themeColors.success, 
        icon: <CheckCircleIcon /> 
      },
      cancelled: { 
        label: 'Cancelled', 
        color: themeColors.error, 
        icon: <CancelIcon /> 
      },
      rejected: { 
        label: 'Rejected', 
        color: themeColors.error, 
        icon: <CancelIcon /> 
      }
    };
    
    const config = statusConfig[status] || { 
      label: status || 'Unknown', 
      color: themeColors.textSecondary, 
      icon: null 
    };
    
    return (
      <Chip 
        icon={config.icon} 
        label={config.label} 
        sx={{ 
          bgcolor: `${config.color}20`,
          color: config.color,
          border: `1px solid ${config.color}40`,
          fontWeight: 600
        }} 
        size="small" 
      />
    );
  }, []);

  const getCategoryChip = useCallback((category) => {
    const label = category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Unknown';
    return (
      <Chip 
        label={label} 
        sx={{ 
          bgcolor: `${themeColors.primary}10`,
          color: themeColors.primary,
          border: `1px solid ${themeColors.primary}20`,
          fontWeight: 500
        }} 
        size="small" 
        variant="outlined" 
      />
    );
  }, []);

  const tabCounts = useMemo(() => {
    return {
      pending: requests.filter(r => r.status === 'pending').length,
      'under-review': requests.filter(r => r.status === 'under-review').length,
      assigned: requests.filter(r => r.status === 'assigned').length,
      'in-progress': requests.filter(r => r.status === 'in-progress').length,
      completed: requests.filter(r => r.status === 'completed').length
    };
  }, [requests]);

  if (!user || user.role !== 'admin') {
    return (
      <Container>
        <Typography>Access Denied</Typography>
      </Container>
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
          from: { opacity: 0, transform: 'translateY(14px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        }
      }}
    >
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
            <AdminIcon sx={{ 
              mr: 2, 
              color: themeColors.primary,
              fontSize: 28 
            }} />
            <Typography variant="h6" sx={{ 
              fontWeight: 700,
              color: themeColors.textPrimary
            }}>
              Admin - Service Requests Management
            </Typography>
          </Box>

          <Button
            onClick={() => navigate('/admin/archived-service-requests')}
            variant="outlined"
            sx={{
              mr: 2,
              color: themeColors.warning,
              borderColor: themeColors.warning,
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { bgcolor: themeColors.warning + '10' }
            }}
          >
            Archived
          </Button>

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
              {user.firstName?.charAt(0)}
              {user.lastName?.charAt(0)}
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
                  {user.firstName?.charAt(0)}
                  {user.lastName?.charAt(0)}
                </Avatar>
              </ListItemIcon>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: themeColors.textPrimary }}>
                  {user.firstName} {user.lastName}
                </Typography>
                <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                  {user.role} • Administrator
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

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Paper
          sx={{
            mb: 3,
            p: { xs: 2.5, md: 3 },
            borderRadius: '22px',
            color: '#fff',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)',
            boxShadow: '0 18px 40px rgba(22, 101, 52, 0.35)',
            animation: 'fadeUpSoft .45s ease-out'
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
            Service Requests Management
          </Typography>
          <Typography variant="body1" sx={{ mt: 0.6, color: 'rgba(255,255,255,0.9)' }}>
            Review, assign, and complete resident requests with full status visibility.
          </Typography>
        </Paper>

        {/* Stats Dashboard */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            {
              value: stats.totalRequests || 0,
              label: 'Total Requests',
              helper: 'all submitted requests',
              icon: <AssignmentIcon sx={{ color: 'rgba(255,255,255,0.22)', fontSize: 44 }} />,
              gradient: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
              shadow: '0 14px 34px rgba(29, 78, 216, 0.34)'
            },
            {
              value: stats.pendingRequests || 0,
              label: 'Pending Review',
              helper: 'needs admin action',
              icon: <ReviewIcon sx={{ color: 'rgba(255,255,255,0.22)', fontSize: 44 }} />,
              gradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              shadow: '0 14px 34px rgba(22, 163, 74, 0.34)'
            },
            {
              value: stats.urgentRequests || 0,
              label: 'Urgent Priority',
              helper: 'pending + under review',
              icon: <CancelIcon sx={{ color: 'rgba(255,255,255,0.22)', fontSize: 44 }} />,
              gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
              shadow: '0 14px 34px rgba(14, 165, 233, 0.34)'
            },
            { 
              value: stats.averageRating?.toFixed(1) || 0, 
              label: 'Avg. Rating', 
              helper: 'service quality',
              icon: <StarIcon sx={{ color: 'rgba(255,255,255,0.22)', fontSize: 44 }} />,
              gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              shadow: '0 14px 34px rgba(220, 38, 38, 0.34)'
            }
          ].map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ 
                borderRadius: '20px',
                boxShadow: stat.shadow,
                border: '1px solid rgba(255,255,255,0.14)',
                background: stat.gradient,
                color: '#fff',
                overflow: 'hidden',
                position: 'relative',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  filter: 'brightness(1.02)'
                },
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: -28,
                  right: -18,
                  width: 116,
                  height: 116,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.12)'
                }
              }}>
                <CardContent sx={{ p: 2.6, position: 'relative', zIndex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h3" sx={{ 
                      fontWeight: 700,
                      color: '#fff',
                      fontFeatureSettings: '"tnum"'
                    }}>
                      {stat.value}
                    </Typography>
                    <Box sx={{ mt: -0.5 }}>{stat.icon}</Box>
                  </Box>
                  <Typography variant="body2" sx={{ 
                    color: 'rgba(255,255,255,0.95)',
                    fontWeight: 700
                  }}>
                    {stat.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.84)', display: 'block', mt: 0.6 }}>
                    ↗ {stat.helper}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Filter Section */}
        <Paper sx={{ 
          p: 3, 
          mb: 3, 
          borderRadius: '20px',
          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
          border: `1px solid ${themeColors.border}`,
          backgroundColor: themeColors.cardBackground
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              color: themeColors.textPrimary
            }}>
              Service Requests Management
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <ReportToolbar onExportXlsx={handleExportXlsx} onExportPdf={handleExportPdf} />
              <Button
                startIcon={<BuildIcon />}
                variant="outlined"
                onClick={fetchAllRequests}
                disabled={fetching}
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
                {fetching ? 'Refreshing...' : 'Refresh All'}
              </Button>
            </Box>
          </Box>

          {/* Search and Filter Controls */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search by resident name, title, description, or house number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                size="small"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ 
                  color: themeColors.textSecondary,
                  '&.Mui-focused': { color: themeColors.primary }
                }}>
                  Category
                </InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Category"
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
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel sx={{ 
                  color: themeColors.textSecondary,
                  '&.Mui-focused': { color: themeColors.primary }
                }}>
                  Priority
                </InputLabel>
                <Select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  label="Priority"
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
                  <MenuItem value="all">All Priorities</MenuItem>
                  {priorities.map(priority => (
                    <MenuItem key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Status Filter Tabs */}
          <Paper sx={{ 
            mb: 2, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: `1px solid ${themeColors.border}`,
            borderRadius: 2.5,
            overflow: 'hidden'
          }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ 
                borderBottom: `1px solid ${themeColors.border}`,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  minHeight: 48,
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
              <Tab value="all" label={`All (${requests.length})`} />
              <Tab value="pending" label={`Pending (${tabCounts.pending})`} />
              <Tab value="under-review" label={`Under Review (${tabCounts['under-review']})`} />
              <Tab value="assigned" label={`Assigned (${tabCounts.assigned})`} />
              <Tab value="in-progress" label={`In Progress (${tabCounts['in-progress']})`} />
              <Tab value="completed" label={`Completed (${tabCounts.completed})`} />
            </Tabs>
          </Paper>

          {fetching && (
            <LinearProgress 
              sx={{ 
                mb: 2, 
                height: 4,
                borderRadius: 2,
                bgcolor: themeColors.border,
                '& .MuiLinearProgress-bar': {
                  bgcolor: themeColors.primary
                }
              }} 
            />
          )}
        </Paper>

        {/* Requests Table */}
        <Paper sx={{ 
          p: 3, 
          borderRadius: '20px',
          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
          border: `1px solid ${themeColors.border}`,
          backgroundColor: themeColors.cardBackground
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              color: themeColors.textPrimary
            }}>
              Service Requests ({filteredRequests.length})
              {filteredRequests.length !== requests.length && (
                <Typography component="span" variant="caption" color={themeColors.textSecondary} sx={{ ml: 1 }}>
                  (filtered from {requests.length} total)
                </Typography>
              )}
            </Typography>
          </Box>

          {filteredRequests.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <BuildIcon sx={{ 
                fontSize: 64, 
                color: themeColors.textSecondary, 
                mb: 2,
                opacity: 0.5 
              }} />
              <Typography variant="h6" gutterBottom sx={{ color: themeColors.textPrimary }}>
                No service requests found
              </Typography>
              <Typography variant="body2" color={themeColors.textSecondary} sx={{ mb: 3 }}>
                {requests.length === 0 
                  ? "No service requests have been submitted yet."
                  : "No requests match your current filters."}
              </Typography>
              {(searchQuery || categoryFilter !== 'all' || priorityFilter !== 'all' || activeTab !== 'all') && (
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setPriorityFilter('all');
                    setActiveTab('all');
                  }}
                  sx={{
                    borderColor: themeColors.border,
                    color: themeColors.textPrimary,
                    '&:hover': {
                      borderColor: themeColors.primary,
                      bgcolor: themeColors.primary + '08'
                    }
                  }}
                >
                  Clear All Filters
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer sx={{ borderRadius: 2.5, border: `1px solid ${themeColors.border}` }}>
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
                    <TableCell sx={{ width: '70px' }}>ID</TableCell>
                    <TableCell>Resident</TableCell>
                    <TableCell>Request Details</TableCell>
                    <TableCell sx={{ width: '100px' }}>Category</TableCell>
                    <TableCell sx={{ width: '100px' }}>Priority</TableCell>
                    <TableCell sx={{ width: '120px' }}>Status</TableCell>
                    <TableCell>Assigned To</TableCell>
                    <TableCell sx={{ width: '140px' }}>Submitted</TableCell>
                    <TableCell sx={{ width: '80px' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow 
                      key={request._id} 
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
                        <Typography variant="caption" sx={{ 
                          fontFamily: 'monospace',
                          color: themeColors.textSecondary,
                          bgcolor: '#f8fafc',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1
                        }}>
                          #{request._id ? request._id.toString().slice(-6) : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ 
                            width: 32, 
                            height: 32, 
                            bgcolor: themeColors.primary,
                            fontSize: '0.9rem',
                            fontWeight: 500 
                          }}>
                            {request.residentId?.firstName?.charAt(0) || 'R'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: themeColors.textPrimary }}>
                              {request.residentId?.firstName || ''} {request.residentId?.lastName || ''}
                            </Typography>
                            <Typography variant="caption" color={themeColors.textSecondary} display="block">
                              {request.residentId?.houseNumber || 'No house'}
                            </Typography>
                            <Typography variant="caption" color={themeColors.textSecondary}>
                              {request.residentId?.phone || 'No phone'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, color: themeColors.textPrimary }}>
                          {request.title || 'No title'}
                        </Typography>
                        <Typography variant="body2" color={themeColors.textSecondary} sx={{ mb: 0.5 }}>
                          {request.description && request.description.length > 80 
                            ? `${request.description.substring(0, 80)}...` 
                            : request.description || 'No description'}
                        </Typography>
                        {request.location && (
                          <Typography variant="caption" color={themeColors.textSecondary} display="block">
                            📍 {request.location}
                          </Typography>
                        )}
                        {request.rating && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <StarIcon sx={{ fontSize: 14, color: '#ffb74d' }} />
                            <Typography variant="caption">{request.rating}/5</Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {isEmergency(request) && (
                            <Chip 
                              label="🚨 EMERGENCY" 
                              sx={{ 
                                bgcolor: themeColors.error,
                                color: 'white',
                                fontWeight: 700,
                                animation: 'pulse 2s infinite'
                              }} 
                              size="small" 
                            />
                          )}
                          <Chip 
                            label={request.category || 'Unknown'} 
                            sx={{ 
                              bgcolor: `${themeColors.primary}10`,
                              color: themeColors.primary,
                              border: `1px solid ${themeColors.primary}20`,
                              fontWeight: 500
                            }} 
                            size="small" 
                          />
                        </Box>
                      </TableCell>
                      <TableCell>{getPriorityChip(request.priority)}</TableCell>
                      <TableCell>{getStatusChip(request.status)}</TableCell>
                      <TableCell>
                        {request.assignedTo ? (
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: themeColors.textPrimary }}>
                              {request.assignedTo.firstName} {request.assignedTo.lastName}
                            </Typography>
                            <Typography variant="caption" color={themeColors.textSecondary}>
                              {request.assignedTo.role}
                            </Typography>
                            {request.assignedAt && (
                              <Typography variant="caption" color={themeColors.textSecondary} display="block">
                                {formatShortDate(request.assignedAt)}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color={themeColors.textSecondary} fontStyle="italic">
                            Not assigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" display="block" sx={{ color: themeColors.textPrimary }}>
                          {formatDate(request.createdAt)}
                        </Typography>
                        {request.completedAt && (
                          <Typography variant="caption" color={themeColors.success} display="block">
                            Completed: {formatShortDate(request.completedAt)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, request)}
                          aria-label="actions"
                          sx={{
                            color: themeColors.textSecondary,
                            '&:hover': {
                              color: themeColors.primary,
                              bgcolor: themeColors.primary + '10'
                            }
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              border: `1px solid ${themeColors.border}`
            }
          }}
        >
          <MenuItem onClick={() => selectedRequest && handleViewCompleteDetails(selectedRequest)} sx={{ py: 1.5 }}>
            <ReviewIcon sx={{ mr: 1, color: themeColors.primary }} /> 
            View Details
          </MenuItem>
          {selectedRequest && ['pending', 'under-review', 'assigned'].includes(selectedRequest.status) && (
            <MenuItem onClick={handleOpenProcess} sx={{ py: 1.5 }}>
              <ReviewIcon sx={{ mr: 1, color: themeColors.info }} /> 
              Process Request
            </MenuItem>
          )}
          {selectedRequest?.status === 'assigned' && (
            <MenuItem onClick={() => handleUpdateStatus('in-progress')} sx={{ py: 1.5 }}>
              <WorkIcon sx={{ mr: 1, color: themeColors.warning }} /> 
              Mark as In Progress
            </MenuItem>
          )}
          {selectedRequest?.status === 'in-progress' && (
            <MenuItem onClick={() => handleUpdateStatus('completed')} sx={{ py: 1.5 }}>
              <CheckCircleIcon sx={{ mr: 1, color: themeColors.success }} /> 
              Mark as Completed
            </MenuItem>
          )}
        </Menu>

        {/* Process Request Dialog */}
        <Dialog 
          open={openProcessDialog} 
          onClose={() => setOpenProcessDialog(false)} 
          maxWidth="sm" 
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
            pb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            {isEmergency(selectedRequest) && (
              <Box sx={{ color: themeColors.error, fontSize: '1.5rem' }}>🚨</Box>
            )}
            Process Service Request
          </DialogTitle>
          <DialogContent>
            {isEmergency(selectedRequest) && (
              <Box sx={{
                bgcolor: themeColors.error + '15',
                border: `2px solid ${themeColors.error}`,
                borderRadius: 2,
                p: 2,
                mb: 2,
                mt: 2
              }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: themeColors.error }}>
                  🚨 EMERGENCY DETECTED
                </Typography>
                <Typography variant="caption" sx={{ color: themeColors.error }}>
                  This request will be automatically assigned to security personnel and 911 will be called.
                </Typography>
              </Box>
            )}
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel sx={{
                  color: themeColors.textSecondary,
                  '&.Mui-focused': { color: themeColors.primary }
                }}>
                  Action
                </InputLabel>
                <Select
                  value={processForm.status}
                  onChange={(e) => setProcessForm(prev => ({...prev, status: e.target.value}))}
                  label="Action"
                  sx={{
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: themeColors.border
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: themeColors.primary
                    }
                  }}
                >
                  <MenuItem value="under-review">Mark as Under Review</MenuItem>
                  <MenuItem value="assigned">Assign to Staff</MenuItem>
                  <MenuItem value="rejected">Reject Request</MenuItem>
                  <MenuItem value="cancelled">Cancel Request</MenuItem>
                </Select>
              </FormControl>
              
              {processForm.status === 'assigned' && !isEmergency(selectedRequest) && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 600, color: themeColors.textPrimary }}>
                    Suggested Staff (by category):
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    {getStaffForCategory(selectedRequest.category).slice(0, 3).map((staff) => (
                      <Chip
                        key={staff._id}
                        label={`${staff.firstName} ${staff.lastName} (${staff.role})`}
                        onClick={() => setProcessForm(prev => ({...prev, assignedTo: staff._id}))}
                        variant={processForm.assignedTo === staff._id ? "filled" : "outlined"}
                        color={processForm.assignedTo === staff._id ? "primary" : "default"}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                  <FormControl fullWidth margin="normal">
                    <InputLabel sx={{
                      color: themeColors.textSecondary,
                      '&.Mui-focused': { color: themeColors.primary }
                    }}>
                      Staff Member *
                    </InputLabel>
                    <Select
                      value={processForm.assignedTo}
                      onChange={(e) => setProcessForm(prev => ({...prev, assignedTo: e.target.value}))}
                      label="Staff Member *"
                      sx={{
                        borderRadius: 2,
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: themeColors.border
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: themeColors.primary
                        }
                      }}
                    >
                      <MenuItem value="">Select staff member</MenuItem>
                      {staffMembers.map((staff) => (
                        <MenuItem key={staff._id} value={staff._id}>
                          {staff.firstName} {staff.lastName} ({staff.role})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </>
              )}

              {isEmergency(selectedRequest) && processForm.status === 'assigned' && (
                <Box sx={{
                  bgcolor: themeColors.success + '15',
                  border: `1px solid ${themeColors.success}`,
                  borderRadius: 2,
                  p: 2,
                  mt: 2
                }}>
                  <Typography variant="caption" sx={{ color: themeColors.success, fontWeight: 600 }}>
                    ✓ Security personnel will be automatically assigned
                  </Typography>
                </Box>
              )}
              
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Admin Notes"
                value={processForm.adminNotes}
                onChange={(e) => setProcessForm(prev => ({...prev, adminNotes: e.target.value}))}
                margin="normal"
                placeholder="Add notes or instructions..."
                InputLabelProps={{
                  sx: {
                    color: themeColors.textSecondary,
                    '&.Mui-focused': { color: themeColors.primary }
                  }
                }}
                InputProps={{
                  sx: {
                    borderRadius: 2,
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: themeColors.primary
                    }
                  }
                }}
              />
              
              <TextField
                fullWidth
                label="Estimated Completion Date"
                type="date"
                value={processForm.estimatedCompletion}
                onChange={(e) => setProcessForm(prev => ({...prev, estimatedCompletion: e.target.value}))}
                margin="normal"
                InputLabelProps={{ 
                  shrink: true,
                  sx: {
                    color: themeColors.textSecondary,
                    '&.Mui-focused': { color: themeColors.primary }
                  }
                }}
                InputProps={{
                  sx: {
                    borderRadius: 2,
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: themeColors.primary
                    }
                  }
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button 
              onClick={() => setOpenProcessDialog(false)}
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
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={handleProcessSubmit} 
              disabled={loading || (processForm.status === 'assigned' && !processForm.assignedTo)}
              sx={{ 
                bgcolor: themeColors.primary,
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                '&:hover': {
                  bgcolor: themeColors.primaryDark,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 25px ${themeColors.primary}40`
                },
                transition: 'all 0.3s ease',
                '&.Mui-disabled': {
                  bgcolor: themeColors.textSecondary + '30',
                  color: themeColors.textSecondary
                }
              }}
            >
              {loading ? 'Processing...' : 'Process Request'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Complete Details Dialog */}
        <Dialog 
          open={openCompleteDialog} 
          onClose={() => setOpenCompleteDialog(false)} 
          maxWidth="lg" 
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
            Request Details - #{selectedRequest?._id ? selectedRequest._id.toString().slice(-6) : 'N/A'}
          </DialogTitle>
          <DialogContent>
            {selectedRequest && (
              <Grid container spacing={3} sx={{ mt: 1 }}>
                {/* Header Section */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h5" gutterBottom sx={{ color: themeColors.textPrimary }}>
                        {selectedRequest.title || 'No Title'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        {getPriorityChip(selectedRequest.priority)}
                        {getStatusChip(selectedRequest.status)}
                        {getCategoryChip(selectedRequest.category)}
                      </Box>
                    </Box>
                    {selectedRequest.rating && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <StarIcon sx={{ color: '#ffb74d' }} />
                        <Typography variant="h6" sx={{ color: themeColors.textPrimary }}>
                          {selectedRequest.rating}/5
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Typography variant="body2" color={themeColors.textSecondary}>
                    Created: {formatDate(selectedRequest.createdAt)}
                    {selectedRequest.updatedAt && ` • Last Updated: ${formatDate(selectedRequest.updatedAt)}`}
                  </Typography>
                </Grid>

                {/* Description Section */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom sx={{ 
                    fontWeight: 600,
                    color: themeColors.textPrimary 
                  }}>
                    Description
                  </Typography>
                  <Paper variant="outlined" sx={{ 
                    p: 3, 
                    bgcolor: '#f8fafc',
                    borderRadius: 2,
                    borderColor: themeColors.border
                  }}>
                    <Typography sx={{ color: themeColors.textPrimary }}>
                      {selectedRequest.description || 'No description'}
                    </Typography>
                  </Paper>
                </Grid>

                {/* Details Grid */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom sx={{ 
                    fontWeight: 600,
                    color: themeColors.textPrimary 
                  }}>
                    Resident Information
                  </Typography>
                  <Paper variant="outlined" sx={{ 
                    p: 2, 
                    bgcolor: '#f8fafc',
                    borderRadius: 2,
                    borderColor: themeColors.border
                  }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                          <strong>Name:</strong> {selectedRequest.residentId?.firstName || ''} {selectedRequest.residentId?.lastName || ''}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                          <strong>House:</strong> {selectedRequest.residentId?.houseNumber || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                          <strong>Phone:</strong> {selectedRequest.residentId?.phone || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                          <strong>Email:</strong> {selectedRequest.residentId?.email || 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom sx={{ 
                    fontWeight: 600,
                    color: themeColors.textPrimary 
                  }}>
                    Request Details
                  </Typography>
                  <Paper variant="outlined" sx={{ 
                    p: 2, 
                    bgcolor: '#f8fafc',
                    borderRadius: 2,
                    borderColor: themeColors.border
                  }}>
                    <Grid container spacing={2}>
                      {selectedRequest.location && (
                        <Grid item xs={12}>
                          <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                            <strong>Location:</strong> {selectedRequest.location}
                          </Typography>
                        </Grid>
                      )}
                      {selectedRequest.estimatedCost > 0 && (
                        <Grid item xs={12}>
                          <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                            <strong>Estimated Cost:</strong> ₱{selectedRequest.estimatedCost}
                          </Typography>
                        </Grid>
                      )}
                      {selectedRequest.estimatedCompletion && (
                        <Grid item xs={12}>
                          <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                            <strong>Est. Completion:</strong> {formatDate(selectedRequest.estimatedCompletion)}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                </Grid>

                {/* Assignment Section */}
                {selectedRequest.assignedTo && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom sx={{ 
                      fontWeight: 600,
                      color: themeColors.textPrimary 
                    }}>
                      Assignment Details
                    </Typography>
                    <Paper variant="outlined" sx={{ 
                      p: 2, 
                      bgcolor: '#f8fafc',
                      borderRadius: 2,
                      borderColor: themeColors.border
                    }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                            <strong>Assigned To:</strong> {selectedRequest.assignedTo.firstName} {selectedRequest.assignedTo.lastName}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                            <strong>Role:</strong> {selectedRequest.assignedTo.role}
                          </Typography>
                        </Grid>
                        {selectedRequest.assignedAt && (
                          <Grid item xs={12}>
                            <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                              <strong>Assigned On:</strong> {formatDate(selectedRequest.assignedAt)}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Paper>
                  </Grid>
                )}

                {/* Completion Section */}
                {selectedRequest.completedAt && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom sx={{ 
                      fontWeight: 600,
                      color: themeColors.textPrimary 
                    }}>
                      Completion Details
                    </Typography>
                    <Paper variant="outlined" sx={{ 
                      p: 2, 
                      bgcolor: '#f8fafc',
                      borderRadius: 2,
                      borderColor: themeColors.border
                    }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                            <strong>Completed On:</strong> {formatDate(selectedRequest.completedAt)}
                          </Typography>
                        </Grid>
                        {selectedRequest.completedBy && (
                          <Grid item xs={12}>
                            <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                              <strong>Completed By:</strong> {selectedRequest.completedBy.firstName} {selectedRequest.completedBy.lastName}
                            </Typography>
                          </Grid>
                        )}
                        {selectedRequest.rating && (
                          <Grid item xs={12}>
                            <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                              <strong>Rating:</strong> {selectedRequest.rating}/5
                            </Typography>
                          </Grid>
                        )}
                        {selectedRequest.feedback && (
                          <Grid item xs={12}>
                            <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                              <strong>Feedback:</strong> {selectedRequest.feedback}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Paper>
                  </Grid>
                )}

                {/* Admin Notes */}
                {selectedRequest.adminNotes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom sx={{ 
                      fontWeight: 600,
                      color: themeColors.textPrimary 
                    }}>
                      Admin Notes
                    </Typography>
                    <Paper variant="outlined" sx={{ 
                      p: 2, 
                      bgcolor: themeColors.info + '10',
                      borderRadius: 2,
                      borderColor: themeColors.info + '30'
                    }}>
                      <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                        {selectedRequest.adminNotes}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button 
              onClick={() => setOpenCompleteDialog(false)}
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
      </Container>
    </Box>
  );
};

export default AdminServiceRequests;