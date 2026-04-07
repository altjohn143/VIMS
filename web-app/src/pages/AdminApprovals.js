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
  Toolbar
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Home as HomeIcon,
  Email as EmailIcon,
  VerifiedUser as VerifiedIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminApprovals = () => {
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

  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const { getCurrentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Define fetchPendingApprovals with useCallback
  const fetchPendingApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get('/api/users/pending-approvals', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setPendingUsers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed

  // Check authentication and fetch data
  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        navigate('/login');
        return;
      }
      await fetchPendingApprovals();
    };
    
    checkAuthAndFetch();
  }, [getCurrentUser, navigate, fetchPendingApprovals]); // Added all dependencies

  const handleApprove = async (userId) => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.put(`/api/users/${userId}/approve`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        toast.success('User approved successfully');
        setPendingUsers(prev => prev.filter(user => user._id !== userId));
        setDetailsOpen(false);
      }
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error(error.response?.data?.error || 'Failed to approve user');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    try {
      setProcessing(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.delete(`/api/users/${selectedUser._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        data: { reason: rejectReason }
      });
      
      if (response.data.success) {
        toast.success('User rejected successfully');
        setPendingUsers(prev => prev.filter(user => user._id !== selectedUser._id));
        setRejectDialogOpen(false);
        setDetailsOpen(false);
        setSelectedUser(null);
        setRejectReason('');
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error(error.response?.data?.error || 'Failed to reject user');
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

  if (loading) {
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
      <AppBar position="static" sx={{ bgcolor: themeColors.primary, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Pending Approvals
          </Typography>
          <Button
            color="inherit"
            onClick={() => navigate('/admin/verifications')}
            sx={{ mr: 1 }}
          >
            Verification Queue
          </Button>

          <Button 
            color="inherit" 
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Paper sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 3, 
          backgroundColor: themeColors.cardBackground,
          border: `1px solid ${themeColors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <VerifiedIcon sx={{ 
            fontSize: 48, 
            color: themeColors.primary,
            backgroundColor: themeColors.primary + '15',
            p: 1,
            borderRadius: 2
          }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
              Resident Approvals
            </Typography>
            <Typography variant="body1" sx={{ color: themeColors.textSecondary }}>
              Review and approve new resident registrations
            </Typography>
          </Box>
        </Paper>

        {pendingUsers.length === 0 ? (
          <Paper sx={{ 
            p: 5, 
            textAlign: 'center', 
            borderRadius: 3,
            backgroundColor: themeColors.cardBackground,
            border: `1px solid ${themeColors.border}`
          }}>
            <VerifiedIcon sx={{ fontSize: 64, color: themeColors.success, opacity: 0.5, mb: 2 }} />
            <Typography variant="h6" sx={{ color: themeColors.textPrimary, mb: 1 }}>
              No Pending Approvals
            </Typography>
            <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
              All resident registrations have been processed
            </Typography>
          </Paper>
        ) : (
          <TableContainer 
            component={Paper} 
            sx={{ 
              borderRadius: 3,
              backgroundColor: themeColors.cardBackground,
              border: `1px solid ${themeColors.border}`,
              overflow: 'hidden'
            }}
          >
            <Table>
              <TableHead sx={{ backgroundColor: themeColors.primary + '08' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Resident</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Contact</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>House Number</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Registered</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }} align="center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow 
                    key={user._id}
                    sx={{ 
                      '&:hover': { backgroundColor: themeColors.primary + '04' },
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: themeColors.primary, color: 'white' }}>
                          {user.firstName?.charAt(0)}
                          {user.lastName?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: themeColors.textPrimary }}>
                            {user.firstName} {user.lastName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                            @{user.email.split('@')[0]}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                        {user.email}
                      </Typography>
                      <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                        {user.phone}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        icon={<HomeIcon />}
                        label={user.houseNumber || 'N/A'}
                        size="small"
                        sx={{ 
                          backgroundColor: themeColors.primary + '10',
                          color: themeColors.primary,
                          fontWeight: 500
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                        {new Date(user.createdAt).toLocaleTimeString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="View Details">
                          <IconButton 
                            size="small"
                            onClick={() => handleViewDetails(user)}
                            sx={{ 
                              color: themeColors.info,
                              '&:hover': { backgroundColor: themeColors.info + '15' }
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Approve">
                          <IconButton 
                            size="small"
                            onClick={() => handleApprove(user._id)}
                            sx={{ 
                              color: themeColors.success,
                              '&:hover': { backgroundColor: themeColors.success + '15' }
                            }}
                          >
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reject">
                          <IconButton 
                            size="small"
                            onClick={() => {
                              setSelectedUser(user);
                              setRejectDialogOpen(true);
                            }}
                            sx={{ 
                              color: themeColors.error,
                              '&:hover': { backgroundColor: themeColors.error + '15' }
                            }}
                          >
                            <RejectIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>

      {/* User Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            backgroundColor: themeColors.cardBackground
          }
        }}
      >
        {selectedUser && (
          <>
            <DialogTitle sx={{ 
              fontWeight: 600, 
              color: themeColors.textPrimary,
              borderBottom: `1px solid ${themeColors.border}`,
              pb: 2
            }}>
              Resident Details
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Avatar 
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    bgcolor: themeColors.primary, 
                    color: 'white',
                    fontSize: '2rem',
                    margin: '0 auto',
                    mb: 2
                  }}
                >
                  {selectedUser.firstName?.charAt(0)}
                  {selectedUser.lastName?.charAt(0)}
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 600, color: themeColors.textPrimary }}>
                  {selectedUser.firstName} {selectedUser.lastName}
                </Typography>
                <Chip 
                  label="Pending Approval"
                  size="small"
                  sx={{ 
                    mt: 1,
                    backgroundColor: themeColors.warning + '15',
                    color: themeColors.warning,
                    fontWeight: 600
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Paper sx={{ p: 2, backgroundColor: themeColors.background, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: themeColors.textPrimary, mb: 1 }}>
                    <PersonIcon sx={{ color: themeColors.primary }} />
                    Personal Information
                  </Typography>
                  <Box sx={{ pl: 4 }}>
                    <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                      Full Name: <span style={{ color: themeColors.textPrimary, fontWeight: 500 }}>{selectedUser.firstName} {selectedUser.lastName}</span>
                    </Typography>
                    <Typography variant="body2" sx={{ color: themeColors.textSecondary, mt: 0.5 }}>
                      Role: <span style={{ color: themeColors.textPrimary, fontWeight: 500, textTransform: 'capitalize' }}>{selectedUser.role}</span>
                    </Typography>
                  </Box>
                </Paper>

                <Paper sx={{ p: 2, backgroundColor: themeColors.background, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: themeColors.textPrimary, mb: 1 }}>
                    <HomeIcon sx={{ color: themeColors.primary }} />
                    Residence Information
                  </Typography>
                  <Box sx={{ pl: 4 }}>
                    <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                      House Number: <span style={{ color: themeColors.textPrimary, fontWeight: 500 }}>{selectedUser.houseNumber || 'N/A'}</span>
                    </Typography>
                  </Box>
                </Paper>

                <Paper sx={{ p: 2, backgroundColor: themeColors.background, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: themeColors.textPrimary, mb: 1 }}>
                    <EmailIcon sx={{ color: themeColors.primary }} />
                    Contact Information
                  </Typography>
                  <Box sx={{ pl: 4 }}>
                    <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                      Email: <span style={{ color: themeColors.textPrimary, fontWeight: 500 }}>{selectedUser.email}</span>
                    </Typography>
                    <Typography variant="body2" sx={{ color: themeColors.textSecondary, mt: 0.5 }}>
                      Phone: <span style={{ color: themeColors.textPrimary, fontWeight: 500 }}>{selectedUser.phone}</span>
                    </Typography>
                  </Box>
                </Paper>

                <Paper sx={{ p: 2, backgroundColor: themeColors.background, borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: themeColors.textPrimary, mb: 1 }}>
                    <VerifiedIcon sx={{ color: themeColors.primary }} />
                    Registration Details
                  </Typography>
                  <Box sx={{ pl: 4 }}>
                    <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                      Registered on: <span style={{ color: themeColors.textPrimary, fontWeight: 500 }}>{new Date(selectedUser.createdAt).toLocaleString()}</span>
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 2, borderTop: `1px solid ${themeColors.border}` }}>
              <Button 
                onClick={() => setDetailsOpen(false)}
                sx={{ 
                  color: themeColors.textSecondary,
                  '&:hover': { backgroundColor: themeColors.primary + '08' },
                  borderRadius: 2
                }}
              >
                Close
              </Button>
              <Button 
                variant="contained" 
                color="success"
                onClick={() => handleApprove(selectedUser._id)}
                disabled={processing}
                startIcon={processing ? <CircularProgress size={20} /> : <ApproveIcon />}
                sx={{ 
                  borderRadius: 2,
                  bgcolor: themeColors.success,
                  '&:hover': { bgcolor: themeColors.success + 'dd' }
                }}
              >
                Approve Resident
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Reject Dialog */}
      <Dialog 
        open={rejectDialogOpen} 
        onClose={() => !processing && setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
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
          Reject Registration
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            This action cannot be undone. The resident will be permanently removed.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason for Rejection (Optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Provide a reason for rejecting this registration..."
            disabled={processing}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: themeColors.background
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2, borderTop: `1px solid ${themeColors.border}` }}>
          <Button 
            onClick={() => {
              setRejectDialogOpen(false);
              setRejectReason('');
            }}
            disabled={processing}
            sx={{ 
              color: themeColors.textSecondary,
              '&:hover': { backgroundColor: themeColors.primary + '08' },
              borderRadius: 2
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleReject}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : <RejectIcon />}
            sx={{ 
              borderRadius: 2,
              bgcolor: themeColors.error,
              '&:hover': { bgcolor: themeColors.error + 'dd' }
            }}
          >
            Reject Registration
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminApprovals;