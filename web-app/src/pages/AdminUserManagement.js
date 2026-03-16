import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Avatar,
  Tooltip,
  AppBar,
  Toolbar,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Tab,
  Tabs
} from '@mui/material';
import {
  Person as PersonIcon,
  Home as HomeIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  CheckCircle as ApproveIcon,
  Visibility as ViewIcon,
  ArrowBack as ArrowBackIcon,
  VerifiedUser as VerifiedIcon,
  Logout as LogoutIcon,
  Search as SearchIcon,
  Security as SecurityIcon,
  AdminPanelSettings as AdminIcon,
  Group as GroupIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminUserManagement = () => {
  const themeColors = {
    primary: '#2224be',
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

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    residents: 0,
    admin: 0,
    security: 0,
    approved: 0,
    pending: 0,
    active: 0,
    inactive: 0
  });
  
  const { getCurrentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Filter users based on all criteria
  const filterUsers = useCallback((usersList, search, role, status, approval, tab) => {
    let filtered = [...usersList];

    // Search filter
    if (search) {
      const query = search.toLowerCase();
      filtered = filtered.filter(user => 
        user.firstName?.toLowerCase().includes(query) ||
        user.lastName?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone?.includes(query) ||
        user.houseNumber?.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (role !== 'all') {
      filtered = filtered.filter(user => user.role === role);
    }

    // Status filter (active/inactive)
    if (status !== 'all') {
      const isActive = status === 'active';
      filtered = filtered.filter(user => user.isActive === isActive);
    }

    // Approval filter
    if (approval !== 'all') {
      const isApproved = approval === 'approved';
      filtered = filtered.filter(user => user.isApproved === isApproved);
    }

    // Tab filter (quick filters)
    if (tab === 1) { // Residents only
      filtered = filtered.filter(user => user.role === 'resident');
    } else if (tab === 2) { // Pending approval
      filtered = filtered.filter(user => user.role === 'resident' && !user.isApproved);
    } else if (tab === 3) { // Admin & Security
      filtered = filtered.filter(user => ['admin', 'security'].includes(user.role));
    } else if (tab === 4) { // Inactive
      filtered = filtered.filter(user => !user.isActive);
    }

    setFilteredUsers(filtered);
  }, []);

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get('http://localhost:5000/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        const allUsers = response.data.data || [];
        setUsers(allUsers);
        filterUsers(allUsers, searchQuery, roleFilter, statusFilter, approvalFilter, activeTab);
        
        // Calculate stats
        const newStats = {
          total: allUsers.length,
          residents: allUsers.filter(u => u.role === 'resident').length,
          admin: allUsers.filter(u => u.role === 'admin').length,
          security: allUsers.filter(u => u.role === 'security').length,
          approved: allUsers.filter(u => u.isApproved).length,
          pending: allUsers.filter(u => !u.isApproved).length,
          active: allUsers.filter(u => u.isActive).length,
          inactive: allUsers.filter(u => !u.isActive).length
        };
        setStats(newStats);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [filterUsers, searchQuery, roleFilter, statusFilter, approvalFilter, activeTab]); // Added all dependencies

  // Handle search and filter changes
  useEffect(() => {
    filterUsers(users, searchQuery, roleFilter, statusFilter, approvalFilter, activeTab);
  }, [searchQuery, roleFilter, statusFilter, approvalFilter, activeTab, users, filterUsers]);

  // Initial fetch
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchUsers();
  }, [getCurrentUser, navigate, fetchUsers]); // Added fetchUsers dependency

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.delete(`http://localhost:5000/api/users/${selectedUser._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        data: { reason: deleteReason }
      });
      
      if (response.data.success) {
        toast.success(`User ${selectedUser.firstName} ${selectedUser.lastName} deleted successfully`);
        setUsers(prev => prev.filter(user => user._id !== selectedUser._id));
        setDeleteDialogOpen(false);
        setDetailsOpen(false);
        setSelectedUser(null);
        setDeleteReason('');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.error || 'Failed to delete user');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      const newStatus = !user.isActive;
      
      const response = await axios.put(`http://localhost:5000/api/users/${user._id}/status`, 
        { isActive: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
        setUsers(prev => prev.map(u => 
          u._id === user._id ? { ...u, isActive: newStatus } : u
        ));
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error(error.response?.data?.error || 'Failed to update user status');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleApproval = async (user) => {
    if (user.role !== 'resident') {
      toast.error('Only residents can be approved/rejected');
      return;
    }
    
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      
      if (user.isApproved) {
        // If already approved, we need to unapprove - but we don't have a route for that
        // So we'll show a message
        toast.error('To unapprove a user, please contact support or use database directly');
        return;
      }
      
      const response = await axios.put(`http://localhost:5000/api/users/${user._id}/approve`, 
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        toast.success(`User approved successfully`);
        setUsers(prev => prev.map(u => 
          u._id === user._id ? { ...u, isApproved: true } : u
        ));
      }
    } catch (error) {
      console.error('Error toggling approval:', error);
      toast.error(error.response?.data?.error || 'Failed to update approval status');
    } finally {
      setProcessing(false);
    }
  };

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setDetailsOpen(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return <AdminIcon sx={{ color: themeColors.primary }} />;
      case 'security': return <SecurityIcon sx={{ color: themeColors.success }} />;
      default: return <PersonIcon sx={{ color: themeColors.info }} />;
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return themeColors.primary;
      case 'security': return themeColors.success;
      default: return themeColors.info;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && users.length === 0) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: themeColors.background
      }}>
        <CircularProgress sx={{ color: themeColors.primary }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: themeColors.background }}>
      {/* Top Navigation */}
      <AppBar position="static" sx={{ bgcolor: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <Toolbar>
          <IconButton edge="start" onClick={handleBack} sx={{ mr: 2, color: themeColors.textPrimary }}>
            <ArrowBackIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <GroupIcon sx={{ mr: 2, color: themeColors.primary }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
              User Management
            </Typography>
          </Box>

          <Button 
            color="inherit" 
            onClick={fetchUsers}
            startIcon={<RefreshIcon />}
            sx={{ mr: 2, color: themeColors.textPrimary }}
          >
            Refresh
          </Button>

          <Button 
            color="inherit" 
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{ color: themeColors.textPrimary }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={1.5}>
            <Card sx={{ borderRadius: 2, bgcolor: themeColors.primary + '10' }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: themeColors.primary, fontWeight: 700 }}>
                  {stats.total}
                </Typography>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                  Total Users
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={1.5}>
            <Card sx={{ borderRadius: 2, bgcolor: themeColors.info + '10' }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: themeColors.info, fontWeight: 700 }}>
                  {stats.residents}
                </Typography>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                  Residents
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={1.5}>
            <Card sx={{ borderRadius: 2, bgcolor: themeColors.primary + '10' }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: themeColors.primary, fontWeight: 700 }}>
                  {stats.admin}
                </Typography>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                  Admins
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={1.5}>
            <Card sx={{ borderRadius: 2, bgcolor: themeColors.success + '10' }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: themeColors.success, fontWeight: 700 }}>
                  {stats.security}
                </Typography>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                  Security
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={1.5}>
            <Card sx={{ borderRadius: 2, bgcolor: themeColors.success + '10' }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: themeColors.success, fontWeight: 700 }}>
                  {stats.approved}
                </Typography>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                  Approved
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={1.5}>
            <Card sx={{ borderRadius: 2, bgcolor: themeColors.warning + '10' }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: themeColors.warning, fontWeight: 700 }}>
                  {stats.pending}
                </Typography>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                  Pending
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={1.5}>
            <Card sx={{ borderRadius: 2, bgcolor: themeColors.success + '10' }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: themeColors.success, fontWeight: 700 }}>
                  {stats.active}
                </Typography>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                  Active
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={1.5}>
            <Card sx={{ borderRadius: 2, bgcolor: themeColors.error + '10' }}>
              <CardContent>
                <Typography variant="h4" sx={{ color: themeColors.error, fontWeight: 700 }}>
                  {stats.inactive}
                </Typography>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                  Inactive
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters and Search */}
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search by name, email, phone, or house..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: themeColors.textSecondary }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2 }
                }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  label="Role"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">All Roles</MenuItem>
                  <MenuItem value="resident">Resident</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="security">Security</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Approval</InputLabel>
                <Select
                  value={approvalFilter}
                  onChange={(e) => setApprovalFilter(e.target.value)}
                  label="Approval"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                  setApprovalFilter('all');
                  setActiveTab(0);
                }}
                sx={{ borderRadius: 2 }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ mt: 3, borderBottom: `1px solid ${themeColors.border}` }}
          >
            <Tab label={`All (${stats.total})`} />
            <Tab label={`Residents (${stats.residents})`} />
            <Tab label={`Pending (${stats.pending})`} />
            <Tab label={`Staff (${stats.admin + stats.security})`} />
            <Tab label={`Inactive (${stats.inactive})`} />
          </Tabs>
        </Paper>

        {/* Users Table */}
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: themeColors.primary + '08' }}>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>House</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Approval</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                      <GroupIcon sx={{ fontSize: 48, color: themeColors.textSecondary, opacity: 0.5, mb: 2 }} />
                      <Typography color="textSecondary">No users found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: getRoleColor(user.role) }}>
                            {user.firstName?.charAt(0)}
                            {user.lastName?.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {user.firstName} {user.lastName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              @{user.email?.split('@')[0]}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{user.email}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {user.phone || 'No phone'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<HomeIcon />}
                          label={user.houseNumber || 'N/A'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getRoleIcon(user.role)}
                          label={user.role}
                          size="small"
                          sx={{
                            bgcolor: getRoleColor(user.role) + '15',
                            color: getRoleColor(user.role),
                            fontWeight: 600,
                            textTransform: 'capitalize'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={user.isActive ? <LockOpenIcon /> : <LockIcon />}
                          label={user.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{
                            bgcolor: user.isActive ? themeColors.success + '15' : themeColors.error + '15',
                            color: user.isActive ? themeColors.success : themeColors.error,
                            fontWeight: 600
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {user.role === 'resident' ? (
                          <Chip
                            icon={<VerifiedIcon />}
                            label={user.isApproved ? 'Approved' : 'Pending'}
                            size="small"
                            sx={{
                              bgcolor: user.isApproved ? themeColors.success + '15' : themeColors.warning + '15',
                              color: user.isApproved ? themeColors.success : themeColors.warning,
                              fontWeight: 600
                            }}
                          />
                        ) : (
                          <Chip
                            label="Pre-approved"
                            size="small"
                            sx={{
                              bgcolor: themeColors.info + '15',
                              color: themeColors.info,
                              fontWeight: 600
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {formatDate(user.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => handleViewDetails(user)}
                              sx={{ color: themeColors.info }}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          
                          {user.role === 'resident' && !user.isApproved && (
                            <Tooltip title="Approve">
                              <IconButton
                                size="small"
                                onClick={() => handleToggleApproval(user)}
                                sx={{ color: themeColors.success }}
                              >
                                <ApproveIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          <Tooltip title={user.isActive ? 'Deactivate' : 'Activate'}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleStatus(user)}
                              sx={{ color: user.isActive ? themeColors.error : themeColors.success }}
                            >
                              {user.isActive ? <BlockIcon /> : <LockOpenIcon />}
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Delete User">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedUser(user);
                                setDeleteDialogOpen(true);
                              }}
                              sx={{ color: themeColors.error }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* User Details Dialog */}
        <Dialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          {selectedUser && (
            <>
              <DialogTitle sx={{ borderBottom: `1px solid ${themeColors.border}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 56, height: 56, bgcolor: getRoleColor(selectedUser.role) }}>
                    {selectedUser.firstName?.charAt(0)}
                    {selectedUser.lastName?.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {selectedUser.email}
                    </Typography>
                  </Box>
                </Box>
              </DialogTitle>
              <DialogContent sx={{ pt: 3 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: themeColors.background, borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 2, color: themeColors.primary, fontWeight: 600 }}>
                        Personal Information
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <PersonIcon sx={{ color: themeColors.textSecondary }} />
                          <Typography variant="body2">
                            {selectedUser.firstName} {selectedUser.lastName}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <EmailIcon sx={{ color: themeColors.textSecondary }} />
                          <Typography variant="body2">{selectedUser.email}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <PhoneIcon sx={{ color: themeColors.textSecondary }} />
                          <Typography variant="body2">{selectedUser.phone || 'Not provided'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <HomeIcon sx={{ color: themeColors.textSecondary }} />
                          <Typography variant="body2">{selectedUser.houseNumber || 'Not assigned'}</Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: themeColors.background, borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 2, color: themeColors.primary, fontWeight: 600 }}>
                        Account Details
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">Role:</Typography>
                          <Chip
                            icon={getRoleIcon(selectedUser.role)}
                            label={selectedUser.role}
                            size="small"
                            sx={{
                              bgcolor: getRoleColor(selectedUser.role) + '15',
                              color: getRoleColor(selectedUser.role),
                              fontWeight: 600
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">Status:</Typography>
                          <Chip
                            icon={selectedUser.isActive ? <LockOpenIcon /> : <LockIcon />}
                            label={selectedUser.isActive ? 'Active' : 'Inactive'}
                            size="small"
                            sx={{
                              bgcolor: selectedUser.isActive ? themeColors.success + '15' : themeColors.error + '15',
                              color: selectedUser.isActive ? themeColors.success : themeColors.error
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">Approval:</Typography>
                          <Chip
                            icon={<VerifiedIcon />}
                            label={selectedUser.isApproved ? 'Approved' : 'Pending'}
                            size="small"
                            sx={{
                              bgcolor: selectedUser.isApproved ? themeColors.success + '15' : themeColors.warning + '15',
                              color: selectedUser.isApproved ? themeColors.success : themeColors.warning
                            }}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">Member since:</Typography>
                          <Typography variant="body2">{formatDate(selectedUser.createdAt)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="textSecondary">Last updated:</Typography>
                          <Typography variant="body2">{formatDate(selectedUser.updatedAt)}</Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Emergency Contact */}
                  {selectedUser.emergencyContact?.name && (
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2, bgcolor: themeColors.background, borderRadius: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: themeColors.primary, fontWeight: 600 }}>
                          Emergency Contact
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 4 }}>
                          <Box>
                            <Typography variant="body2" color="textSecondary">Name:</Typography>
                            <Typography variant="body2">{selectedUser.emergencyContact.name}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="body2" color="textSecondary">Phone:</Typography>
                            <Typography variant="body2">{selectedUser.emergencyContact.phone}</Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  )}

                  {/* Vehicles */}
                  {selectedUser.vehicles?.length > 0 && (
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2, bgcolor: themeColors.background, borderRadius: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: themeColors.primary, fontWeight: 600 }}>
                          Registered Vehicles ({selectedUser.vehicles.length})
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {selectedUser.vehicles.map((vehicle, index) => (
                            <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                              <Chip
                                label={vehicle.plateNumber}
                                size="small"
                                sx={{ bgcolor: themeColors.primary + '15', color: themeColors.primary }}
                              />
                              <Typography variant="body2">
                                {vehicle.make} {vehicle.model} ({vehicle.color})
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Paper>
                    </Grid>
                  )}

                  {/* Family Members */}
                  {selectedUser.familyMembers?.length > 0 && (
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2, bgcolor: themeColors.background, borderRadius: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: themeColors.primary, fontWeight: 600 }}>
                          Family Members ({selectedUser.familyMembers.length})
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {selectedUser.familyMembers.map((member, index) => (
                            <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{member.name}</Typography>
                              <Chip label={member.relationship} size="small" variant="outlined" />
                              <Typography variant="caption" color="textSecondary">{member.age} yrs</Typography>
                              <Typography variant="caption">{member.phone}</Typography>
                            </Box>
                          ))}
                        </Box>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </DialogContent>
              <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
                <Button onClick={() => setDetailsOpen(false)}>Close</Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => {
                    setDetailsOpen(false);
                    setDeleteDialogOpen(true);
                  }}
                  startIcon={<DeleteIcon />}
                >
                  Delete User
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => !processing && setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          <DialogTitle sx={{ color: themeColors.error, fontWeight: 600 }}>
            Delete User Account
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
              This action cannot be undone. The user will be permanently deleted from the system.
            </Alert>
            
            {selectedUser && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  You are about to delete:
                </Typography>
                <Paper sx={{ p: 2, bgcolor: themeColors.background, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: getRoleColor(selectedUser.role) }}>
                      {selectedUser.firstName?.charAt(0)}
                      {selectedUser.lastName?.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {selectedUser.email} • {selectedUser.role}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Box>
            )}

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Reason for deletion (optional)"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Provide a reason for deleting this user..."
              disabled={processing}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button 
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteReason('');
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteUser}
              disabled={processing}
              startIcon={processing ? <CircularProgress size={20} /> : <DeleteIcon />}
            >
              {processing ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default AdminUserManagement;