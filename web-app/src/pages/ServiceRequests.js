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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  AppBar,
  Toolbar,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Menu,
  InputAdornment,
  LinearProgress,
  Switch,
  FormControlLabel,
  Avatar,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Build as BuildIcon,
  Add as AddIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Work as WorkIcon,
  Star as StarIcon,
  Chat as ChatIcon,
  ArrowBack as ArrowBackIcon,
  Logout as LogoutIcon,
  Cancel as CancelIcon,
  RateReview as ReviewIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  LocationOn as LocationIcon,
  Settings as SettingsIcon,
  QrCodeScanner as QrCodeScannerIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

// Dashboard Theme Colors (from Login.js)
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

const ServiceRequests = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    inProgressRequests: 0,
    completedRequests: 0,
    averageRating: 0
  });

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const [useDifferentLocation, setUseDifferentLocation] = useState(false);

  const { getCurrentUser, logout: contextLogout } = useAuth();
  const user = getCurrentUser();
  const navigate = useNavigate();

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

  // Define categories with their automatic priorities
  const categories = useMemo(() => [
    { value: 'plumbing', label: 'Plumbing', priority: 'urgent', icon: '💧' },
    { value: 'electrical', label: 'Electrical', priority: 'urgent', icon: '⚡' },
    { value: 'carpentry', label: 'Carpentry', priority: 'medium', icon: '🔨' },
    { value: 'cleaning', label: 'Cleaning', priority: 'low', icon: '🧹' },
    { value: 'gardening', label: 'Gardening', priority: 'low', icon: '🌿' },
    { value: 'security', label: 'Security', priority: 'urgent', icon: '🚨' }
  ], []);

  const priorityLabels = useMemo(() => ({
    low: { label: 'Low', color: themeColors.success },
    medium: { label: 'Medium', color: themeColors.warning },
    high: { label: 'High', color: themeColors.error },
    urgent: { label: 'Urgent', color: themeColors.error }
  }), []);

  // Initial form data - location starts empty
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    priority: '',
    location: '',
    alternateLocation: ''
  });

  // Get priority based on category
  const getPriorityByCategory = (category) => {
    const categoryObj = categories.find(c => c.value === category);
    return categoryObj ? categoryObj.priority : 'medium';
  };

  // Handle opening the dialog - ensures user data is loaded
  const handleOpenDialog = () => {
    if (!user) {
      toast.error('User information not available. Please try again.');
      return;
    }
    
    const userAddress = user.houseNumber || `${user.firstName} ${user.lastName}'s Residence`;
    
    setFormData({
      category: '',
      title: '',
      description: '',
      priority: '',
      location: userAddress,
      alternateLocation: ''
    });
    setUseDifferentLocation(false);
    setOpenDialog(true);
  };

   const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate title
    if (!validateTitle(formData.title)) {
      toast.error('Title cannot contain numbers');
      return;
    }
    
    // Validate required fields
    if (!formData.category || !formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setLoading(true);

    try {
      const finalLocation = useDifferentLocation 
        ? formData.alternateLocation 
        : formData.location;

      const requestData = {
        category: formData.category,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        location: finalLocation
      };

      const response = await axios.post('/api/service-requests', requestData);

      if (response.data.success || response.status === 200) {
        toast.success('Service request submitted successfully!');
        setOpenDialog(false);
        
        // Reset form
        setFormData({
          category: '',
          title: '',
          description: '',
          priority: '',
          location: '',
          alternateLocation: ''
        });
        setUseDifferentLocation(false);
        
        fetchAllRequests();
      }
    } catch (error) {
      console.error('Submit error details:', error.response?.data);
      toast.error(error.response?.data?.error || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  // Handle category change - updates priority automatically
  const handleCategoryChange = (e) => {
    const category = e.target.value;
    const priority = getPriorityByCategory(category);
    
    setFormData(prev => ({
      ...prev,
      category: category,
      priority: priority
    }));
  };

  // Function to validate title (no numbers)
  const validateTitle = (title) => {
    const hasNumbers = /\d/.test(title);
    return !hasNumbers;
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    if (validateTitle(newTitle) || newTitle === '') {
      setFormData(prev => ({ ...prev, title: newTitle }));
    } else {
      toast.error('Title cannot contain numbers');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Fetch requests data
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setFetching(true);
      try {
        const requestsResponse = await axios.get('/api/service-requests/my');
        
        let requestsData = [];
        
        if (requestsResponse.data?.success && requestsResponse.data?.data) {
          requestsData = requestsResponse.data.data;
        } else if (Array.isArray(requestsResponse.data)) {
          requestsData = requestsResponse.data;
        } else if (requestsResponse.data?.data && Array.isArray(requestsResponse.data.data)) {
          requestsData = requestsResponse.data.data;
        }
        
        const userRequests = Array.isArray(requestsData) 
          ? requestsData.filter(request => {
              return request.residentId?._id === user._id || 
                     request.residentId?._id === user.id ||
                     request.userId === user._id ||
                     request.userId === user.id;
            })
          : [];
        
        setRequests(userRequests);
        setFilteredRequests(userRequests);
        
        const totalRequests = userRequests.length || 0;
        const pendingRequests = userRequests.filter(req => 
          req.status === 'pending' || req.status === 'under-review'
        ).length;
        const inProgressRequests = userRequests.filter(req => 
          req.status === 'assigned' || req.status === 'in-progress'
        ).length;
        const completedRequests = userRequests.filter(req => 
          req.status === 'completed'
        ).length;
        
        const ratedRequests = userRequests.filter(req => req.rating);
        const averageRating = ratedRequests.length > 0 
          ? ratedRequests.reduce((sum, req) => sum + req.rating, 0) / ratedRequests.length 
          : 0;
        
        setStats({
          totalRequests,
          pendingRequests,
          inProgressRequests,
          completedRequests,
          averageRating
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch service requests');
        setRequests([]);
        setFilteredRequests([]);
      } finally {
        setFetching(false);
        setInitialLoad(false);
      }
    };

    if (user && initialLoad) {
      fetchData();
    }
  }, [user, initialLoad]); 

  // Filter requests based on filters
  useEffect(() => {
    if (requests.length > 0) {
      let filtered = [...requests];
      
      if (activeTab && activeTab !== 'all') {
        if (activeTab === 'pending') {
          filtered = filtered.filter(request => 
            request.status === 'pending' || request.status === 'under-review'
          );
        } else if (activeTab === 'in-progress') {
          filtered = filtered.filter(request => 
            request.status === 'assigned' || request.status === 'in-progress'
          );
        } else {
          filtered = filtered.filter(request => request.status === activeTab);
        }
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
          const title = request.title ? request.title.toLowerCase() : '';
          const description = request.description ? request.description.toLowerCase() : '';
          const location = request.location ? request.location.toLowerCase() : '';
          
          return title.includes(query) ||
                 description.includes(query) ||
                 location.includes(query) ||
                 request.category?.includes(query);
        });
      }
      
      setFilteredRequests(filtered);
    } else {
      setFilteredRequests([]);
    }
  }, [requests, activeTab, categoryFilter, priorityFilter, searchQuery]);

  const fetchAllRequests = useCallback(async () => {
    if (!user) {
      toast.error('User not found. Please log in again.');
      navigate('/login');
      return;
    }
    
    setFetching(true);
    try {
      const response = await axios.get('/api/service-requests/my');
      
      let requestsData = [];
      
      if (response.data?.success && response.data?.data) {
        requestsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        requestsData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        requestsData = response.data.data;
      }
      
      const userRequests = Array.isArray(requestsData)
        ? requestsData.filter(request => {
            return request.residentId?._id === user._id || 
                   request.residentId?._id === user.id ||
                   request.userId === user._id ||
                   request.userId === user.id;
          })
        : [];
      
      setRequests(userRequests);
      setFilteredRequests(userRequests);
      
      const totalRequests = userRequests.length;
      const pendingRequests = userRequests.filter(req => 
        req.status === 'pending' || req.status === 'under-review'
      ).length;
      const inProgressRequests = userRequests.filter(req => 
        req.status === 'assigned' || req.status === 'in-progress'
      ).length;
      const completedRequests = userRequests.filter(req => 
        req.status === 'completed'
      ).length;
      
      const ratedRequests = userRequests.filter(req => req.rating);
      const averageRating = ratedRequests.length > 0 
        ? ratedRequests.reduce((sum, req) => sum + req.rating, 0) / ratedRequests.length 
        : 0;
      
      setStats({
        totalRequests,
        pendingRequests,
        inProgressRequests,
        completedRequests,
        averageRating
      });
      
      toast.success('Requests refreshed successfully!');
      
    } catch (error) {
      console.error('Failed to fetch service requests:', error);
      toast.error('Failed to fetch service requests');
    } finally {
      setFetching(false);
    }
  }, [user, navigate]); 

  const handleBack = () => navigate(-1);

  const handleMenuOpen = useCallback((event, request) => {
    setAnchorEl(event.currentTarget);
    setSelectedRequest(request);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleViewDetails = useCallback(() => {
    setOpenDetailsDialog(true);
    handleMenuClose();
  }, [handleMenuClose]);

  const handleRateService = async (requestId) => {
    // Check if already rated
    const request = requests.find(r => r._id === requestId);
    if (request?.rating) {
      toast.error('You have already rated this service');
      return;
    }
    
    const rating = prompt('Please rate the service (1-5):');
    if (rating && rating >= 1 && rating <= 5) {
      try {
        await axios.put(`/api/service-requests/${requestId}/rate`, { rating: parseInt(rating) });
        toast.success('Service rated successfully!');
        fetchAllRequests();
      } catch {
        toast.error('Failed to rate service');
      }
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (window.confirm('Are you sure you want to cancel this request?')) {
      try {
        await axios.put(`/api/service-requests/${requestId}/status`, { status: 'cancelled' });
        toast.success('Request cancelled successfully!');
        fetchAllRequests();
      } catch {
        toast.error('Failed to cancel request');
      }
    }
  };

  const handleAddComment = () => toast.success('Comment added! (Feature in development)');

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

  const getPriorityChip = useCallback((priority) => {
    const config = priorityLabels[priority] || { label: 'Unknown', color: 'default' };
    return (
      <Chip 
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
  }, [priorityLabels]);

  const getStatusChip = useCallback((status) => {
    const statusConfig = {
      pending: { 
        label: 'Pending', 
        color: themeColors.warning, 
        icon: <PendingIcon /> 
      },
      'under-review': { 
        label: 'Under Review', 
        color: themeColors.info, 
        icon: <ReviewIcon /> 
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
    const categoryObj = categories.find(c => c.value === category);
    const label = categoryObj?.label || (category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Unknown');
    const icon = categoryObj?.icon || '📋';
    
    return (
      <Chip 
        label={label} 
        icon={<span style={{ fontSize: '14px' }}>{icon}</span>}
        sx={{ 
          bgcolor: `${themeColors.primary}10`,
          color: themeColors.primary,
          border: `1px solid ${themeColors.primary}20`,
          fontWeight: 500
        }} 
        size="small" 
      />
    );
  }, [categories]);

  const getStatusStep = (status) => {
    switch(status) {
      case 'pending': return 0;
      case 'assigned': return 1;
      case 'in-progress': return 2;
      case 'completed': return 3;
      default: return 0;
    }
  };

  const tabCounts = useMemo(() => {
    return {
      pending: requests.filter(r => r.status === 'pending' || r.status === 'under-review').length,
      'in-progress': requests.filter(r => r.status === 'assigned' || r.status === 'in-progress').length,
      completed: requests.filter(r => r.status === 'completed').length,
      cancelled: requests.filter(r => r.status === 'cancelled' || r.status === 'rejected').length
    };
  }, [requests]);

  return (
    <Box sx={{ backgroundColor: themeColors.background, minHeight: '100vh' }}>
      <AppBar position="static" sx={{ 
        bgcolor: 'white',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        borderBottom: `1px solid ${themeColors.border}`
      }}>
        <Toolbar>
          <IconButton 
            edge="start" 
            color="inherit" 
            onClick={handleBack} 
            sx={{ 
              mr: 2,
              color: themeColors.textPrimary,
              '&:hover': {
                bgcolor: themeColors.primary + '10'
              }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <BuildIcon sx={{ 
              mr: 2, 
              color: themeColors.primary,
              fontSize: 28 
            }} />
            <Typography variant="h6" sx={{ 
              fontWeight: 700,
              color: themeColors.textPrimary,
              background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.primaryLight})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              My Service Requests
            </Typography>
          </Box>

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
                  {user.role} • {user.houseNumber || 'No house'}
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
        {/* Stats Dashboard */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { value: stats.totalRequests || 0, label: 'My Total Requests' },
            { value: stats.pendingRequests || 0, label: 'Pending Review'},
            { value: stats.inProgressRequests || 0, label: 'In Progress' },
            { 
              value: stats.averageRating?.toFixed(1) || 0, 
              label: 'My Average Rating', 
              icon: <StarIcon sx={{ color: '#ffb74d' }} />
            }
          ].map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ 
                borderRadius: 3, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                border: `1px solid ${themeColors.border}`,
                backgroundColor: themeColors.cardBackground,
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.08)'
                }
              }}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 1,
                    mb: 1 
                  }}>
                    <Typography variant="h3" sx={{ 
                      fontWeight: 700,
                      color: stat.color,
                      fontFeatureSettings: '"tnum"'
                    }}>
                      {stat.value}
                    </Typography>
                    {stat.icon}
                  </Box>
                  <Typography variant="body2" sx={{ 
                    color: themeColors.textSecondary,
                    fontWeight: 500
                  }}>
                    {stat.label}
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
          borderRadius: 3, 
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          border: `1px solid ${themeColors.border}`,
          backgroundColor: themeColors.cardBackground
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              color: themeColors.textPrimary
            }}>
              My Service Requests Management
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {user?.role === 'resident' && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenDialog}
                  disabled={!user}
                  sx={{ 
                    bgcolor: themeColors.primary,
                    borderRadius: 2,
                    fontWeight: 600,
                    px: 3,
                    '&:hover': {
                      bgcolor: themeColors.primaryDark,
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 25px ${themeColors.primary}40`
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  New Request
                </Button>
              )}
              <Button
                startIcon={<BuildIcon />}
                variant="outlined"
                onClick={fetchAllRequests}
                disabled={fetching}
                sx={{ 
                  borderRadius: 2,
                  fontWeight: 600,
                  borderColor: themeColors.border,
                  color: themeColors.textPrimary,
                  '&:hover': {
                    borderColor: themeColors.primary,
                    bgcolor: themeColors.primary + '08'
                  }
                }}
              >
                {fetching ? 'Refreshing...' : 'Refresh My Requests'}
              </Button>
            </Box>
          </Box>

          {/* Search and Filter Controls */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search my requests by title, description, location, or category..."
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
                    <MenuItem key={category.value} value={category.value}>
                      {category.icon} {category.label}
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
                  {Object.entries(priorityLabels).map(([value, config]) => (
                    <MenuItem key={value} value={value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 10, 
                          height: 10, 
                          borderRadius: '50%', 
                          bgcolor: config.color 
                        }} />
                        {config.label}
                      </Box>
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
            borderRadius: 2,
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
              <Tab value="all" label={`All My Requests (${requests.length})`} />
              <Tab value="pending" label={`Pending (${tabCounts.pending})`} />
              <Tab value="in-progress" label={`In Progress (${tabCounts['in-progress']})`} />
              <Tab value="completed" label={`Completed (${tabCounts.completed})`} />
              <Tab value="cancelled" label={`Cancelled/Rejected (${tabCounts.cancelled})`} />
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
          borderRadius: 3, 
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          border: `1px solid ${themeColors.border}`,
          backgroundColor: themeColors.cardBackground
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              color: themeColors.textPrimary
            }}>
              My Service Requests ({filteredRequests.length})
              {filteredRequests.length !== requests.length && (
                <Typography component="span" variant="caption" color={themeColors.textSecondary} sx={{ ml: 1 }}>
                  (filtered from {requests.length} total)
                </Typography>
              )}
            </Typography>
          </Box>

          {fetching ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <CircularProgress 
                size={48} 
                sx={{ 
                  mb: 2,
                  color: themeColors.primary 
                }} 
              />
              <Typography variant="h6" gutterBottom sx={{ color: themeColors.textPrimary }}>
                Loading your requests...
              </Typography>
            </Box>
          ) : filteredRequests.length === 0 ? (
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
                  ? "You haven't submitted any service requests yet."
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
            <TableContainer sx={{ borderRadius: 2, border: `1px solid ${themeColors.border}` }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ 
                    bgcolor: '#f8fafc',
                    '& th': {
                      fontWeight: 600,
                      color: themeColors.textPrimary,
                      borderColor: themeColors.border
                    }
                  }}>
                    <TableCell sx={{ width: '70px' }}>ID</TableCell>
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
                        <Typography variant="subtitle2" sx={{ 
                          fontWeight: 600, 
                          mb: 0.5,
                          color: themeColors.textPrimary
                        }}>
                          {request.title || 'No title'}
                        </Typography>
                        <Typography variant="body2" color={themeColors.textSecondary} sx={{ mb: 0.5 }}>
                          {request.description && request.description.length > 80 
                            ? `${request.description.substring(0, 80)}...` 
                            : request.description || 'No description'}
                        </Typography>
                        {request.location && (
                          <Typography variant="caption" color={themeColors.textSecondary} display="block">
                            <LocationIcon sx={{ 
                              fontSize: 12, 
                              verticalAlign: 'middle', 
                              mr: 0.5,
                              color: themeColors.primary 
                            }} />
                            {request.location}
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
                        {getCategoryChip(request.category)}
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
          <MenuItem onClick={handleViewDetails} sx={{ py: 1.5 }}>
            <VisibilityIcon sx={{ mr: 1, color: themeColors.primary }} /> 
            View Details
          </MenuItem>
          {selectedRequest?.status === 'completed' && !selectedRequest?.rating && (
            <MenuItem onClick={() => handleRateService(selectedRequest._id)} sx={{ py: 1.5 }}>
              <StarIcon sx={{ mr: 1, color: themeColors.warning }} /> 
              Rate Service
            </MenuItem>
          )}
          {['pending', 'assigned', 'in-progress'].includes(selectedRequest?.status) && (
            <MenuItem onClick={() => handleCancelRequest(selectedRequest._id)} sx={{ py: 1.5 }}>
              <CancelIcon sx={{ mr: 1, color: themeColors.error }} /> 
              Cancel Request
            </MenuItem>
          )}
          <MenuItem onClick={handleAddComment} sx={{ py: 1.5 }}>
            <ChatIcon sx={{ mr: 1, color: themeColors.info }} /> 
            Add Comment
          </MenuItem>
        </Menu>

        {/* New Request Dialog */}
        <Dialog 
          open={openDialog} 
          onClose={() => {
            setOpenDialog(false);
            setUseDifferentLocation(false);
            setFormData({
              category: '',
              title: '',
              description: '',
              priority: '',
              location: '',
              alternateLocation: ''
            });
          }} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
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
            Create Service Request
          </DialogTitle>
          <DialogContent>
            <Box component="form" sx={{ mt: 2 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel 
                  required
                  sx={{
                    color: themeColors.textSecondary,
                    '&.Mui-focused': { color: themeColors.primary }
                  }}
                >
                  Category
                </InputLabel>
                <Select 
                  name="category" 
                  value={formData.category} 
                  onChange={handleCategoryChange}
                  label="Category"
                  required
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
                  <MenuItem value="" disabled>Select a category</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.value} value={c.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{c.icon}</span>
                        {c.label} ({priorityLabels[c.priority]?.label} Priority)
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Title"
                name="title"
                fullWidth
                sx={{ mb: 2 }}
                value={formData.title}
                onChange={handleTitleChange}
                required
                helperText="Title cannot contain numbers"
                error={/\d/.test(formData.title)}
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
                label="Description"
                name="description"
                fullWidth
                multiline
                rows={3}
                sx={{ mb: 2 }}
                value={formData.description}
                onChange={handleInputChange}
                required
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

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel sx={{
                  color: themeColors.textSecondary,
                  '&.Mui-focused': { color: themeColors.primary }
                }}>
                  Priority (Auto-detected)
                </InputLabel>
                <Select 
                  name="priority" 
                  value={formData.priority} 
                  label="Priority (Auto-detected)"
                  disabled
                  sx={{
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: themeColors.border
                    }
                  }}
                >
                  <MenuItem value={formData.priority}>
                    {priorityLabels[formData.priority]?.label || 'Select a category first'}
                  </MenuItem>
                </Select>
                <Typography variant="caption" color={themeColors.textSecondary} sx={{ mt: 1 }}>
                  Priority is automatically determined based on the selected category
                </Typography>
              </FormControl>

              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={useDifferentLocation}
                      onChange={(e) => setUseDifferentLocation(e.target.checked)}
                      sx={{
                        color: themeColors.primary,
                        '&.Mui-checked': {
                          color: themeColors.primary
                        }
                      }}
                    />
                  }
                  label="Report from a different location"
                  sx={{ color: themeColors.textPrimary }}
                />
                
                {!useDifferentLocation ? (
                  <TextField
                    label="Location"
                    name="location"
                    fullWidth
                    value={formData.location}
                    disabled
                    sx={{ mt: 1 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationIcon sx={{ color: themeColors.textSecondary }} />
                        </InputAdornment>
                      ),
                      sx: {
                        borderRadius: 2,
                        bgcolor: '#f8fafc'
                      }
                    }}
                    InputLabelProps={{
                      sx: {
                        color: themeColors.textSecondary
                      }
                    }}
                    helperText="Using your registered address"
                  />
                ) : (
                  <TextField
                    label="Alternate Location"
                    name="alternateLocation"
                    fullWidth
                    value={formData.alternateLocation}
                    onChange={handleInputChange}
                    sx={{ mt: 1 }}
                    placeholder="Enter the address where service is needed"
                    required={useDifferentLocation}
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
                )}
              </Box>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button 
              onClick={() => {
                setOpenDialog(false);
                setUseDifferentLocation(false);
                setFormData({
                  category: '',
                  title: '',
                  description: '',
                  priority: '',
                  location: '',
                  alternateLocation: ''
                });
              }}
              sx={{
                color: themeColors.textSecondary,
                '&:hover': {
                  bgcolor: themeColors.primary + '08'
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained" 
              disabled={loading || !formData.category || !formData.title || !formData.description || (useDifferentLocation && !formData.alternateLocation)}
              sx={{ 
                bgcolor: themeColors.primary,
                borderRadius: 2,
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
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Details Dialog */}
        <Dialog 
          open={openDetailsDialog} 
          onClose={() => setOpenDetailsDialog(false)} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
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
            Service Request Details
          </DialogTitle>
          <DialogContent>
            {selectedRequest && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ color: themeColors.textPrimary }}>
                      {selectedRequest.title || 'No Title'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      {getPriorityChip(selectedRequest.priority)}
                      {getStatusChip(selectedRequest.status)}
                      {getCategoryChip(selectedRequest.category)}
                    </Box>
                    <Typography variant="body2" color={themeColors.textSecondary} gutterBottom>
                      Submitted: {formatDate(selectedRequest.createdAt)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom sx={{ 
                      color: themeColors.textPrimary,
                      fontWeight: 600 
                    }}>
                      Description:
                    </Typography>
                    <Paper variant="outlined" sx={{ 
                      p: 2, 
                      bgcolor: '#f8fafc',
                      borderRadius: 2,
                      borderColor: themeColors.border
                    }}>
                      <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                        {selectedRequest.description || 'No description'}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" sx={{ 
                      color: themeColors.textPrimary,
                      fontWeight: 600,
                      mb: 1 
                    }}>
                      Request Details:
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      {selectedRequest.location && (
                        <Typography variant="body2" sx={{ color: themeColors.textPrimary, mb: 1 }}>
                          <LocationIcon sx={{ verticalAlign: 'middle', mr: 1, fontSize: 16, color: themeColors.primary }} />
                          Location: {selectedRequest.location}
                        </Typography>
                      )}
                      {selectedRequest.estimatedCost > 0 && (
                        <Typography variant="body2" sx={{ color: themeColors.textPrimary, mb: 1 }}>
                          💰 Estimated Cost: ₱{selectedRequest.estimatedCost}
                        </Typography>
                      )}
                      {selectedRequest.estimatedCompletion && (
                        <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                          📅 Est. Completion: {formatDate(selectedRequest.estimatedCompletion)}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {selectedRequest.assignedTo && (
                      <>
                        <Typography variant="subtitle2" sx={{ 
                          color: themeColors.textPrimary,
                          fontWeight: 600,
                          mb: 1 
                        }}>
                          Assigned To:
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                            {selectedRequest.assignedTo.firstName} {selectedRequest.assignedTo.lastName}
                          </Typography>
                          <Typography variant="body2" color={themeColors.textSecondary}>
                            {selectedRequest.assignedTo.role}
                          </Typography>
                          {selectedRequest.assignedAt && (
                            <Typography variant="caption" color={themeColors.textSecondary}>
                              Assigned on: {formatShortDate(selectedRequest.assignedAt)}
                            </Typography>
                          )}
                        </Box>
                      </>
                    )}
                  </Grid>
                  {selectedRequest.adminNotes && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom sx={{ 
                        color: themeColors.textPrimary,
                        fontWeight: 600 
                      }}>
                        Admin Notes:
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
                  <Grid item xs={12}>
                    <Stepper 
                      activeStep={getStatusStep(selectedRequest.status)} 
                      sx={{ mt: 3 }}
                      connector={
                        <Box sx={{ 
                          flex: 1, 
                          height: 2, 
                          bgcolor: themeColors.border,
                          borderRadius: 1
                        }} />
                      }
                    >
                      {['Pending', 'Assigned', 'In Progress', 'Completed'].map((label, index) => (
                        <Step key={label}>
                          <StepLabel
                            sx={{
                              '& .MuiStepIcon-root': {
                                color: themeColors.border,
                                '&.Mui-active': {
                                  color: themeColors.primary
                                },
                                '&.Mui-completed': {
                                  color: themeColors.success
                                }
                              },
                              '& .MuiStepLabel-label': {
                                color: themeColors.textSecondary,
                                '&.Mui-active': {
                                  color: themeColors.textPrimary,
                                  fontWeight: 600
                                },
                                '&.Mui-completed': {
                                  color: themeColors.textPrimary
                                }
                              }
                            }}
                          >
                            {label}
                          </StepLabel>
                        </Step>
                      ))}
                    </Stepper>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button 
              onClick={() => setOpenDetailsDialog(false)}
              sx={{
                color: themeColors.textSecondary,
                '&:hover': {
                  bgcolor: themeColors.primary + '08'
                }
              }}
            >
              Close
            </Button>
            {selectedRequest?.status === 'completed' && !selectedRequest?.rating && (
              <Button 
                variant="contained" 
                onClick={() => handleRateService(selectedRequest._id)} 
                sx={{ 
                  bgcolor: themeColors.primary,
                  borderRadius: 2,
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: themeColors.primaryDark,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 25px ${themeColors.primary}40`
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Rate Service
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default ServiceRequests;