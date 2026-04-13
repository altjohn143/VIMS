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

  const getVerificationLabel = (status) => {
    const labels = {
      pending_upload: 'Pending Upload',
      queued_ai: 'Queued for AI',
      ai_processing: 'AI Processing',
      ai_flagged: 'AI Flagged',
      manual_review: 'Manual Review',
      approved: 'Approved',
      rejected: 'Rejected'
    };
    return labels[status] || 'Unknown';
  };

  const getVerificationColor = (status) => {
    if (status === 'approved') return themeColors.success;
    if (status === 'rejected' || status === 'ai_flagged') return themeColors.error;
    return themeColors.warning;
  };

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
      const serverMessage = error.response?.data?.error || error.response?.data?.message;
      toast.error(serverMessage || 'Failed to approve user');
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
          <IconButton edge="start" onClick={handleBack} sx={{ mr: 2, color: themeColors.textPrimary, bgcolor: 'rgba(15,23,42,0.04)', border: `1px solid ${themeColors.border}`, '&:hover': { bgcolor: 'rgba(15,23,42,0.08)' } }}>
            <ArrowBackIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800 }}>
            Pending Approvals
          </Typography>
          <Button
            onClick={() => navigate('/admin/verifications')}
            sx={{ mr: 1, color: themeColors.primary, borderRadius: '12px', textTransform: 'none', fontWeight: 700, '&:hover': { backgroundColor: themeColors.primary + '10' } }}
          >
            Verification Queue
          </Button>

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
        <Paper sx={{
          p: 3,
          mb: 4, 
          borderRadius: '20px',
          color: 'white',
          background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.primaryDark} 100%)`,
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 16px 36px rgba(22,101,52,0.24)',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          animation: 'fadeUpSoft 0.45s ease'
        }}>
          <VerifiedIcon sx={{ 
            fontSize: 48, 
            color: '#d9f99d',
            backgroundColor: 'rgba(255,255,255,0.15)',
            p: 1,
            borderRadius: 2
          }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: 'white' }}>
              Resident Approvals
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.86)', fontWeight: 600 }}>
              Review and approve new resident registrations
            </Typography>
          </Box>
        </Paper>

        {pendingUsers.length === 0 ? (
          <Paper sx={{ 
            p: 5, 
            textAlign: 'center', 
            borderRadius: '20px',
            backgroundColor: themeColors.cardBackground,
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 12px 26px rgba(15,23,42,0.06)'
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
              borderRadius: '20px',
              backgroundColor: themeColors.cardBackground,
              border: `1px solid ${themeColors.border}`,
              overflow: 'hidden',
              boxShadow: '0 12px 26px rgba(15,23,42,0.06)',
              animation: 'fadeUpSoft 0.58s ease'
            }}
          >
            <Table>
              <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Resident</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Contact</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>House Number</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: themeColors.textPrimary }}>Verification</TableCell>
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
                      '&:hover': { backgroundColor: '#f8fafc' },
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
                          fontWeight: 700,
                          borderRadius: '999px'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getVerificationLabel(user.verificationStatus)}
                        size="small"
                        sx={{
                          backgroundColor: getVerificationColor(user.verificationStatus) + '15',
                          color: getVerificationColor(user.verificationStatus),
                          fontWeight: 600
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
                        <Tooltip title={user.canApprove ? 'Approve' : 'Cannot approve until ID is verified'}>
                          <span>
                            <IconButton 
                            size="small"
                            onClick={() => handleApprove(user._id)}
                            disabled={!user.canApprove || processing}
                            sx={{ 
                              color: themeColors.success,
                              '&:hover': { backgroundColor: themeColors.success + '15' },
                              '&.Mui-disabled': { color: themeColors.textSecondary }
                            }}
                          >
                            <ApproveIcon />
                          </IconButton>
                          </span>
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
            borderRadius: '20px',
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
                      Verification: <span style={{ color: getVerificationColor(selectedUser.verificationStatus), fontWeight: 600 }}>{getVerificationLabel(selectedUser.verificationStatus)}</span>
                    </Typography>
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
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { backgroundColor: themeColors.primary + '08' },
                  borderRadius: '10px'
                }}
              >
                Close
              </Button>
              <Button 
                variant="contained" 
                color="success"
                onClick={() => handleApprove(selectedUser._id)}
                disabled={processing || !selectedUser.canApprove}
                startIcon={processing ? <CircularProgress size={20} /> : <ApproveIcon />}
                sx={{ 
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 700,
                  bgcolor: themeColors.success,
                  '&:hover': { bgcolor: themeColors.success + 'dd' }
                }}
              >
                {selectedUser.canApprove ? 'Approve Resident' : 'Awaiting Verified ID'}
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
            borderRadius: '20px',
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
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { backgroundColor: themeColors.primary + '08' },
              borderRadius: '10px'
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
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 700,
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