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
import ReportToolbar from '../components/ReportToolbar';

const AdminUserManagement = () => {
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
    moveOut: 0,
    active: 0,
    inactive: 0
  });
  const [moveOutDialogOpen, setMoveOutDialogOpen] = useState(false);
  const [moveOutAction, setMoveOutAction] = useState('approve'); // approve | deny
  const [moveOutNotes, setMoveOutNotes] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createProcessing, setCreateProcessing] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'security',
    assignedPhases: '',
    assignedAreas: '',
    patrolSchedule: ''
  });
  const [securityAssignments, setSecurityAssignments] = useState([]);
  const [assignmentEditMode, setAssignmentEditMode] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    assignedPhases: '',
    assignedAreas: '',
    patrolSchedule: ''
  });
  const [assignmentProcessing, setAssignmentProcessing] = useState(false);
  
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
    } else if (tab === 3) { // Move-out requests
      filtered = filtered.filter(user => user.role === 'resident' && user.moveOutStatus === 'pending');
    } else if (tab === 4) { // Admin & Security
      filtered = filtered.filter(user => ['admin', 'security'].includes(user.role));
    } else if (tab === 5) { // Inactive
      filtered = filtered.filter(user => !user.isActive);
    }

    setFilteredUsers(filtered);
  }, []);

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get('/api/users', {
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
          moveOut: allUsers.filter(u => u.role === 'resident' && u.moveOutStatus === 'pending').length,
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

  const loadSecurityAssignments = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/patrols/assignments', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data.success) {
        setSecurityAssignments(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading security assignments:', error);
    }
  }, []);

  useEffect(() => {
    if (selectedUser?.role === 'security') {
      setAssignmentForm({
        assignedPhases: (selectedUser.assignedPhases || []).join(', '),
        assignedAreas: (selectedUser.assignedAreas || []).join(', '),
        patrolSchedule: selectedUser.patrolSchedule || ''
      });
    } else {
      setAssignmentForm({ assignedPhases: '', assignedAreas: '', patrolSchedule: '' });
      setAssignmentEditMode(false);
    }
  }, [selectedUser]);

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
    loadSecurityAssignments();
  }, [getCurrentUser, navigate, fetchUsers, loadSecurityAssignments]); // Added fetchUsers dependency

  const handleArchiveUser = async () => {
    if (!selectedUser) return;
    
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.delete(`/api/users/${selectedUser._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        data: { reason: deleteReason }
      });
      
      if (response.data.success) {
        toast.success(`User ${selectedUser.firstName} ${selectedUser.lastName} archived successfully`);
        setUsers(prev => prev.filter(user => user._id !== selectedUser._id));
        setDeleteDialogOpen(false);
        setDetailsOpen(false);
        setSelectedUser(null);
        setDeleteReason('');
      }
    } catch (error) {
      console.error('Error archiving user:', error);
      toast.error(error.response?.data?.error || 'Failed to archive user');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      const newStatus = !user.isActive;
      
      const response = await axios.put(`/api/users/${user._id}/status`, 
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
      
      const response = await axios.put(`/api/users/${user._id}/approve`, 
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

  const resetNewUserForm = () => {
    setNewUserForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      role: 'security',
      assignedPhases: '',
      assignedAreas: '',
      patrolSchedule: ''
    });
  };

  const handleCreateUser = async () => {
    const { firstName, lastName, email, phone, password, role, assignedPhases, assignedAreas, patrolSchedule } = newUserForm;
    if (!firstName || !lastName || !email || !phone || !password || !role) {
      toast.error('Please complete all required fields');
      return;
    }

    try {
      setCreateProcessing(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/users',
        {
          firstName,
          lastName,
          email,
          phone,
          password,
          role,
          assignedPhases: assignedPhases
            .split(',')
            .map((value) => Number(value.trim()))
            .filter((value) => Number.isInteger(value) && value > 0),
          assignedAreas: assignedAreas
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          patrolSchedule
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        toast.success('User created successfully');
        setCreateDialogOpen(false);
        resetNewUserForm();
        fetchUsers();
        loadSecurityAssignments();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.error || 'Failed to create user');
    } finally {
      setCreateProcessing(false);
    }
  };

  const handleStartAssignmentEdit = () => {
    setAssignmentEditMode(true);
  };

  const handleCancelAssignmentEdit = () => {
    if (selectedUser?.role === 'security') {
      setAssignmentForm({
        assignedPhases: (selectedUser.assignedPhases || []).join(', '),
        assignedAreas: (selectedUser.assignedAreas || []).join(', '),
        patrolSchedule: selectedUser.patrolSchedule || ''
      });
    } else {
      setAssignmentForm({ assignedPhases: '', assignedAreas: '', patrolSchedule: '' });
    }
    setAssignmentEditMode(false);
  };

  const handleSaveAssignmentUpdate = async () => {
    if (!selectedUser || selectedUser.role !== 'security') {
      toast.error('Only security users can have patrol assignments updated');
      return;
    }

    try {
      setAssignmentProcessing(true);
      const token = localStorage.getItem('token');
      const payload = {
        assignedPhases: assignmentForm.assignedPhases
          .split(',')
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isInteger(value) && value > 0),
        assignedAreas: assignmentForm.assignedAreas
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        patrolSchedule: assignmentForm.patrolSchedule
      };

      const response = await axios.put(
        `/api/patrols/assign/${selectedUser._id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        const updatedUser = response.data.data;
        toast.success('Security patrol assignment updated');
        setSelectedUser((prev) => prev ? { ...prev, ...updatedUser } : prev);
        setUsers((prev) => prev.map((user) => (user._id === updatedUser._id ? { ...user, ...updatedUser } : user)));
        setAssignmentEditMode(false);
        loadSecurityAssignments();
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error(error.response?.data?.error || 'Failed to update assignment');
    } finally {
      setAssignmentProcessing(false);
    }
  };

  const openMoveOutDialog = (user, action) => {
    setSelectedUser(user);
    setMoveOutAction(action);
    setMoveOutNotes(action === 'approve' ? 'Move-out approved by admin' : 'Move-out request denied');
    setMoveOutDialogOpen(true);
  };

  const submitMoveOutDecision = async () => {
    if (!selectedUser) return;
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      const url =
        moveOutAction === 'approve'
          ? `/api/users/${selectedUser._id}/move-out/approve`
          : `/api/users/${selectedUser._id}/move-out/deny`;
      const body = { notes: moveOutNotes };
      const res = await axios.put(url, body, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.success) {
        toast.success(res.data.message || `Move-out ${moveOutAction}d`);
        setMoveOutDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast.error(res.data?.error || 'Failed to update move-out');
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to update move-out');
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

  const handleExportPdf = async () => {
    try {
      const response = await fetch('/api/users/export?format=pdf', {
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
      a.download = `VIMS_Users_Export_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export PDF');
    }
  };

  const handleExportXlsx = async () => {
    try {
      const response = await fetch('/api/users/export?format=csv', {
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
      a.download = `VIMS_Users_Export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export CSV');
    }
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
        background: `
          radial-gradient(circle at top left, rgba(34,197,94,0.06), transparent 24%),
          radial-gradient(circle at top right, rgba(14,165,233,0.05), transparent 20%),
          ${themeColors.background}
        `
      }}>
        <CircularProgress sx={{ color: themeColors.primary }} />
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
          from: { opacity: 0, transform: 'translateY(14px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        }
      }}
    >
      {/* Top Navigation */}
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
              '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.24)' }
            }}
          >
            <ArrowBackIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <GroupIcon sx={{ mr: 2, color: themeColors.primary }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
              User Management
            </Typography>
          </Box>

          <Button 
            onClick={fetchUsers}
            startIcon={<RefreshIcon />}
            sx={{
              mr: 2,
              color: themeColors.primary,
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: 'rgba(34, 197, 94, 0.12)',
              '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.22)' }
            }}
          >
            Refresh
          </Button>

          <Button
            onClick={() => setCreateDialogOpen(true)}
            variant="contained"
            sx={{
              mr: 2,
              bgcolor: themeColors.primary,
              color: '#fff',
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { bgcolor: themeColors.primaryDark }
            }}
          >
            New Staff
          </Button>

          <Button
            onClick={() => navigate('/admin/archived-users')}
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
            Archived Users
          </Button>

          <Button 
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{
              color: themeColors.primary,
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: 'rgba(34, 197, 94, 0.12)',
              '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.22)' }
            }}
          >
            Logout
          </Button>
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
            User Management
          </Typography>
          <Typography variant="body1" sx={{ mt: 0.6, color: 'rgba(255,255,255,0.9)' }}>
            Manage members, approvals, and account status from one admin view.
          </Typography>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { value: stats.total, label: 'Total Users', helper: 'all accounts', icon: <GroupIcon sx={{ color: 'rgba(255,255,255,0.22)', fontSize: 40 }} />, gradient: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)', shadow: '0 14px 34px rgba(29,78,216,0.34)' },
            { value: stats.residents, label: 'Residents', helper: 'community members', icon: <HomeIcon sx={{ color: 'rgba(255,255,255,0.22)', fontSize: 40 }} />, gradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', shadow: '0 14px 34px rgba(22,163,74,0.34)' },
            { value: stats.admin + stats.security, label: 'Staff', helper: 'admins + security', icon: <SecurityIcon sx={{ color: 'rgba(255,255,255,0.22)', fontSize: 40 }} />, gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)', shadow: '0 14px 34px rgba(14,165,233,0.34)' },
            { value: stats.pending, label: 'Pending', helper: 'for approval', icon: <ApproveIcon sx={{ color: 'rgba(255,255,255,0.22)', fontSize: 40 }} />, gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', shadow: '0 14px 34px rgba(220,38,38,0.34)' }
          ].map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  borderRadius: '20px',
                  boxShadow: stat.shadow,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: stat.gradient,
                  color: '#fff',
                  overflow: 'hidden',
                  position: 'relative',
                  transition: 'transform 0.3s ease',
                  '&:hover': { transform: 'translateY(-4px)', filter: 'brightness(1.02)' },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: -20,
                    right: -14,
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.12)'
                  }
                }}
              >
                <CardContent sx={{ p: 2.5, position: 'relative', zIndex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: '#fff' }}>
                      {stat.value}
                    </Typography>
                    {stat.icon}
                  </Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>
                    {stat.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.84)', display: 'block', mt: 0.4 }}>
                    ↗ {stat.helper}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {securityAssignments.length > 0 && (
          <Paper
            sx={{
              p: 3,
              mb: 3,
              borderRadius: '20px',
              border: `1px solid ${themeColors.border}`,
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)'
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              Security Patrol Assignments
            </Typography>
            <Grid container spacing={2}>
              {securityAssignments.map((officer) => (
                <Grid item xs={12} md={6} key={officer._id}>
                  <Paper sx={{ p: 2, borderRadius: '18px', backgroundColor: '#f8fafc' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                      {officer.firstName} {officer.lastName}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      Email: {officer.email}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      Phases: {officer.assignedPhases?.join(', ') || 'None'}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      Areas: {officer.assignedAreas?.join(', ') || 'None'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                      Schedule: {officer.patrolSchedule || 'Not set'}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {/* Filters and Search */}
        <Paper
          sx={{
            p: 3,
            mb: 3,
            borderRadius: '20px',
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)'
          }}
        >
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
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
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
            <Tab label={`Move-out (${stats.moveOut})`} />
            <Tab label={`Staff (${stats.admin + stats.security})`} />
            <Tab label={`Inactive (${stats.inactive})`} />
          </Tabs>
        </Paper>

        {/* Export Toolbar */}
        <Box sx={{ mt: 2, mb: 2 }}>
          <ReportToolbar onExportXlsx={handleExportXlsx} onExportPdf={handleExportPdf} />
        </Box>

        {/* Users Table */}
        <Paper
          sx={{
            borderRadius: '20px',
            overflow: 'hidden',
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)'
          }}
        >
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'rgba(22, 163, 74, 0.08)' }}>
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
                    <TableRow key={user._id} hover sx={{ '&:hover': { backgroundColor: 'rgba(22, 163, 74, 0.04)' } }}>
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

                          {user.role === 'resident' && user.moveOutStatus === 'pending' && (
                            <>
                              <Tooltip title="Approve move-out">
                                <IconButton
                                  size="small"
                                  onClick={() => openMoveOutDialog(user, 'approve')}
                                  sx={{ color: themeColors.success }}
                                >
                                  <ApproveIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Deny move-out">
                                <IconButton
                                  size="small"
                                  onClick={() => openMoveOutDialog(user, 'deny')}
                                  sx={{ color: themeColors.warning }}
                                >
                                  <BlockIcon />
                                </IconButton>
                              </Tooltip>
                            </>
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
                          
                          <Tooltip title="Archive User">
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
          PaperProps={{ sx: { borderRadius: '18px' } }}
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
                        {selectedUser.role === 'security' && (
                          <Box sx={{ mt: 2, px: 2, py: 1.5, bgcolor: '#f8fafc', borderRadius: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, color: themeColors.primary, fontWeight: 600 }}>
                              Patrol Assignment
                            </Typography>
                            {assignmentEditMode ? (
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField
                                  fullWidth
                                  label="Assigned Phases"
                                  value={assignmentForm.assignedPhases}
                                  onChange={(e) => setAssignmentForm((prev) => ({ ...prev, assignedPhases: e.target.value }))}
                                  helperText="Comma-separated phase numbers, e.g. 1,2"
                                />
                                <TextField
                                  fullWidth
                                  label="Assigned Areas"
                                  value={assignmentForm.assignedAreas}
                                  onChange={(e) => setAssignmentForm((prev) => ({ ...prev, assignedAreas: e.target.value }))}
                                  helperText="Comma-separated area names, e.g. Phase 1,Phase 2"
                                />
                                <TextField
                                  fullWidth
                                  label="Patrol Schedule"
                                  value={assignmentForm.patrolSchedule}
                                  onChange={(e) => setAssignmentForm((prev) => ({ ...prev, patrolSchedule: e.target.value }))}
                                  helperText="Example: Mon/Wed/Fri 6am-10am"
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                  <Button
                                    onClick={handleCancelAssignmentEdit}
                                    disabled={assignmentProcessing}
                                    sx={{ textTransform: 'none' }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="contained"
                                    onClick={handleSaveAssignmentUpdate}
                                    disabled={assignmentProcessing}
                                    sx={{ textTransform: 'none', fontWeight: 700 }}
                                  >
                                    {assignmentProcessing ? 'Saving…' : 'Save Assignment'}
                                  </Button>
                                </Box>
                              </Box>
                            ) : (
                              <>
                                <Typography variant="body2" sx={{ mb: 0.5 }}>
                                  Phases: {selectedUser.assignedPhases?.join(', ') || 'None'}
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 0.5 }}>
                                  Areas: {selectedUser.assignedAreas?.join(', ') || 'None'}
                                </Typography>
                                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                                  Schedule: {selectedUser.patrolSchedule || 'Not set'}
                                </Typography>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={handleStartAssignmentEdit}
                                  sx={{ mt: 2, textTransform: 'none', borderRadius: 2.5 }}
                                >
                                  Edit Assignment
                                </Button>
                              </>
                            )}
                          </Box>
                        )}
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
                <Button onClick={() => setDetailsOpen(false)} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>Close</Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => {
                    setDetailsOpen(false);
                    setDeleteDialogOpen(true);
                  }}
                  startIcon={<DeleteIcon />}
                  sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
                >
                  Archive User
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        <Dialog
        open={createDialogOpen}
        onClose={() => !createProcessing && setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '18px' } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Create Admin / Security User</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: themeColors.textSecondary, mb: 2 }}>
            Add a new staff account with optional patrol assignments for security officers.
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={newUserForm.firstName}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, firstName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={newUserForm.lastName}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, lastName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={newUserForm.phone}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, password: e.target.value }))}
                helperText="Must be at least 12 chars with uppercase, lowercase, number, and symbol"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={newUserForm.role}
                  label="Role"
                  onChange={(e) => setNewUserForm((prev) => ({ ...prev, role: e.target.value }))}
                >
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="security">Security</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {newUserForm.role === 'security' && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Assigned Phases"
                    value={newUserForm.assignedPhases}
                    onChange={(e) => setNewUserForm((prev) => ({ ...prev, assignedPhases: e.target.value }))}
                    helperText="Comma-separated phase numbers, e.g. 1,2"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Assigned Areas"
                    value={newUserForm.assignedAreas}
                    onChange={(e) => setNewUserForm((prev) => ({ ...prev, assignedAreas: e.target.value }))}
                    helperText="Comma-separated area names, e.g. Phase 1,Phase 2"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Patrol Schedule"
                    value={newUserForm.patrolSchedule}
                    onChange={(e) => setNewUserForm((prev) => ({ ...prev, patrolSchedule: e.target.value }))}
                    helperText="Example: Mon/Wed/Fri 6am-10am"
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: `1px solid ${themeColors.border}` }}>
          <Button
            onClick={() => {
              setCreateDialogOpen(false);
              resetNewUserForm();
            }}
            disabled={createProcessing}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateUser}
            disabled={createProcessing}
            sx={{ textTransform: 'none', fontWeight: 800 }}
          >
            {createProcessing ? 'Creating…' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Archive Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => !processing && setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: '18px' } }}
        >
          <DialogTitle sx={{ color: themeColors.error, fontWeight: 600 }}>
            Archive User Account
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
              This user will be archived and can be restored later if needed. The user will no longer have access to the system.
            </Alert>
            
            {selectedUser && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  You are about to archive:
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
              label="Reason for archiving (optional)"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Provide a reason for archiving this user..."
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
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleArchiveUser}
              disabled={processing}
              startIcon={processing ? <CircularProgress size={20} /> : <DeleteIcon />}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
            >
              {processing ? 'Archiving...' : 'Archive User'}
            </Button>
          </DialogActions>
        </Dialog>

      {/* Move-out Approve/Deny Dialog */}
      <Dialog
        open={moveOutDialogOpen}
        onClose={() => !processing && setMoveOutDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {moveOutAction === 'approve' ? 'Approve move-out' : 'Deny move-out'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: themeColors.textSecondary, mb: 2 }}>
            Resident: <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong> • House {selectedUser?.houseNumber || 'N/A'}
          </Typography>
          <TextField
            fullWidth
            label="Notes (optional)"
            value={moveOutNotes}
            onChange={(e) => setMoveOutNotes(e.target.value)}
            multiline
            minRows={3}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setMoveOutDialogOpen(false)} disabled={processing} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={submitMoveOutDecision}
            disabled={processing}
            variant="contained"
            color={moveOutAction === 'approve' ? 'success' : 'warning'}
            sx={{ textTransform: 'none', fontWeight: 800 }}
          >
            {processing ? 'Processing…' : (moveOutAction === 'approve' ? 'Approve' : 'Deny')}
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </Box>
  );
};

export default AdminUserManagement;