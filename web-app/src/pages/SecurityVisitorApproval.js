import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  HourglassEmpty as PendingIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
  Logout as LogoutIcon,
  Phone as PhoneIcon,
  DirectionsCar as CarIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const SecurityVisitorApproval = () => {
  // Dashboard Theme Colors from Login
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

  const [pendingVisitors, setPendingVisitors] = useState([]);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [openApproveDialog, setOpenApproveDialog] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [securityNotes, setSecurityNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { getCurrentUser, logout } = useAuth();
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    hasFetched.current = false;
    
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    if (currentUser.role !== 'security') {
      navigate('/dashboard');
      return;
    }

    if (!hasFetched.current) {
      fetchPendingVisitors();
      hasFetched.current = true;
    }
    
    return () => {
      isMounted.current = false;
    };
  }, [getCurrentUser, navigate]);

  const fetchPendingVisitors = async () => {
    if (!isMounted.current) return;
    
    setFetchLoading(true);
    setError(null);
    
    try {
      const response = await axios.get('/api/visitors/pending');
      
      if (!isMounted.current) return;
      
      if (response.data?.success === true) {
        setPendingVisitors(response.data.data || []);
      } else {
        const errorMsg = response.data?.error || 'Server returned unsuccessful response';
        setError(errorMsg);
        setPendingVisitors([]);
      }
      
    } catch (error) {
      if (!isMounted.current) return;
      
      let errorMsg = 'Network error';
      if (error.response) {
        errorMsg = error.response.data?.error || `Server error ${error.response.status}`;
      } else if (error.request) {
        errorMsg = 'No response from server';
      } else {
        errorMsg = error.message;
      }
      
      setError(errorMsg);
      setPendingVisitors([]);
    } finally {
      if (isMounted.current) {
        setFetchLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    await fetchPendingVisitors();
    toast.success('Visitors refreshed');
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleApprove = async () => {
    if (!selectedVisitor) return;
    
    setLoading(true);
    try {
      const response = await axios.put(`/api/visitors/${selectedVisitor._id}/approve`, {
        securityNotes
      });
      
      if (response.data.success) {
        toast.success('Visitor approved successfully!');
        setOpenApproveDialog(false);
        setSecurityNotes('');
        await fetchPendingVisitors();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve visitor');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVisitor) return;
    
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.put(`/api/visitors/${selectedVisitor._id}/reject`, {
        rejectionReason
      });
      
      if (response.data.success) {
        toast.success('Visitor request rejected');
        setOpenRejectDialog(false);
        setRejectionReason('');
        await fetchPendingVisitors();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject visitor');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const currentUser = getCurrentUser();

  if (!currentUser) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: themeColors.background,
          display: 'flex',
          flexDirection: 'column'
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
              sx={{
                mr: 2,
                color: themeColors.primary,
                borderRadius: 2.5,
                bgcolor: 'rgba(34, 197, 94, 0.14)',
                '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.24)' }
              }}
              onClick={handleBack}
              aria-label="back"
            >
              <ArrowBackIcon />
            </IconButton>
            
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
              Visitor Approval
            </Typography>
            
            <Button 
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
              sx={{
                color: themeColors.primary,
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: 'rgba(34, 197, 94, 0.12)',
                '&:hover': {
                  backgroundColor: 'rgba(34, 197, 94, 0.22)'
                }
              }}
            >
              Logout
            </Button>
          </Toolbar>
        </AppBar>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (currentUser.role !== 'security') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: themeColors.background,
          display: 'flex',
          flexDirection: 'column'
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
              sx={{
                mr: 2,
                color: themeColors.primary,
                borderRadius: 2.5,
                bgcolor: 'rgba(34, 197, 94, 0.14)',
                '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.24)' }
              }}
              onClick={handleBack}
              aria-label="back"
            >
              <ArrowBackIcon />
            </IconButton>
            
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
              Visitor Approval
            </Typography>
            
            <Button 
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
              sx={{
                color: themeColors.primary,
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 700,
                bgcolor: 'rgba(34, 197, 94, 0.12)',
                '&:hover': {
                  backgroundColor: 'rgba(34, 197, 94, 0.22)'
                }
              }}
            >
              Logout
            </Button>
          </Toolbar>
        </AppBar>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Paper sx={{ 
            p: 8, 
            textAlign: 'center', 
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: `1px solid ${themeColors.border}`,
            backgroundColor: themeColors.cardBackground
          }}>
            <SecurityIcon sx={{ fontSize: 64, color: themeColors.error, mb: 2 }} />
            <Typography variant="h6" gutterBottom sx={{ color: themeColors.textPrimary, fontWeight: 600 }}>
              Access Denied
            </Typography>
            <Typography variant="body2" sx={{ color: themeColors.textSecondary, mb: 3 }}>
              You don't have permission to access this page.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/dashboard')}
              sx={{ 
                borderRadius: 2,
                bgcolor: themeColors.primary,
                '&:hover': {
                  bgcolor: themeColors.primaryDark
                },
                fontWeight: 600
              }}
            >
              Go to Dashboard
            </Button>
          </Paper>
        </Box>
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
        `
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
            sx={{
              mr: 2,
              color: themeColors.primary,
              borderRadius: 2.5,
              bgcolor: 'rgba(34, 197, 94, 0.14)',
              '&:hover': { bgcolor: 'rgba(34, 197, 94, 0.24)' }
            }}
            onClick={handleBack}
            aria-label="back"
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Visitor Approval
          </Typography>
          
          <Button 
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{
              color: themeColors.primary,
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: 'rgba(34, 197, 94, 0.12)',
              '&:hover': {
                backgroundColor: 'rgba(34, 197, 94, 0.22)'
              }
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Paper
          sx={{
            mb: 4,
            p: { xs: 2.5, md: 3 },
            borderRadius: '22px',
            color: '#fff',
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)',
            boxShadow: '0 18px 40px rgba(22, 101, 52, 0.35)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.18)' }}>
              <SecurityIcon sx={{ color: '#bef264' }} />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: '#fff' }}>
                Visitor Approval
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                Approve or reject visitor requests
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                Logged in as: {currentUser?.firstName} {currentUser?.lastName}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              icon={<PendingIcon />}
              label={`${pendingVisitors.length} Pending Requests`}
              color="warning"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={fetchLoading || loading}
              size="small"
              sx={{ 
                borderRadius: 2.5,
                borderColor: 'rgba(255,255,255,0.35)',
                color: '#fff',
                textTransform: 'none',
                fontWeight: 700,
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.65)',
                  backgroundColor: 'rgba(255,255,255,0.12)'
                }
              }}
            >
              {fetchLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            {error && (
              <Chip 
                label={`Error: ${error}`}
                color="error"
                size="small"
                onDelete={() => setError(null)}
                sx={{ fontWeight: 600 }}
              />
            )}
          </Box>
        </Paper>

        {/* Pending Visitors List */}
        <Grid container spacing={3}>
          {fetchLoading ? (
            <Grid item xs={12}>
              <Paper sx={{ 
                p: 8, 
                textAlign: 'center', 
                borderRadius: '20px',
                boxShadow: '0 12px 30px rgba(15,23,42,0.08)',
                border: `1px solid ${themeColors.border}`,
                backgroundColor: themeColors.cardBackground
              }}>
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ color: themeColors.textPrimary, fontWeight: 600 }}>
                  Loading visitor requests...
                </Typography>
              </Paper>
            </Grid>
          ) : error ? (
            <Grid item xs={12}>
              <Paper sx={{ 
                p: 8, 
                textAlign: 'center', 
                borderRadius: '20px',
                boxShadow: '0 12px 30px rgba(15,23,42,0.08)',
                border: `1px solid ${themeColors.border}`,
                backgroundColor: themeColors.cardBackground
              }}>
                <SecurityIcon sx={{ fontSize: 64, color: themeColors.error, mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ color: themeColors.error, fontWeight: 600 }}>
                  Error Loading Visitors
                </Typography>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary, mb: 3 }}>
                  {error}
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={handleRefresh}
                  startIcon={<RefreshIcon />}
                  sx={{ 
                    borderRadius: 2,
                    bgcolor: themeColors.primary,
                    '&:hover': {
                      bgcolor: themeColors.primaryDark
                    },
                    fontWeight: 600
                  }}
                >
                  Try Again
                </Button>
              </Paper>
            </Grid>
          ) : pendingVisitors.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ 
                p: 8, 
                textAlign: 'center', 
                borderRadius: '20px',
                boxShadow: '0 12px 30px rgba(15,23,42,0.08)',
                border: `1px solid ${themeColors.border}`,
                backgroundColor: themeColors.cardBackground
              }}>
                <SecurityIcon sx={{ fontSize: 64, color: themeColors.textSecondary, mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ color: themeColors.textPrimary, fontWeight: 600 }}>
                  No pending visitor requests
                </Typography>
                <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                  All visitor requests have been processed
                </Typography>
              </Paper>
            </Grid>
          ) : (
            pendingVisitors.map((visitor) => (
              <Grid item xs={12} md={6} key={visitor._id}>
                <Card sx={{ 
                  borderRadius: '20px',
                  boxShadow: '0 12px 30px rgba(15,23,42,0.08)',
                  border: `1px solid ${themeColors.border}`,
                  backgroundColor: themeColors.cardBackground,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
                  },
                  transition: 'all 0.3s ease'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" gutterBottom sx={{ color: themeColors.textPrimary, fontWeight: 600 }}>
                          {visitor.visitorName}
                        </Typography>
                        <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
                          Visiting: {visitor.residentId?.firstName} {visitor.residentId?.lastName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                          House: {visitor.residentId?.houseNumber}
                        </Typography>
                      </Box>
                      <Chip 
                        label="PENDING" 
                        color="warning" 
                        size="small"
                        icon={<PendingIcon />}
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>

                    <Divider sx={{ my: 2, borderColor: themeColors.border }} />

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: themeColors.textSecondary, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PhoneIcon fontSize="small" />
                          Phone
                        </Typography>
                        <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                          {visitor.visitorPhone}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: themeColors.textSecondary, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CarIcon fontSize="small" />
                          Vehicle
                        </Typography>
                        <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                          {visitor.vehicleNumber || 'Not specified'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" sx={{ color: themeColors.textSecondary, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <DescriptionIcon fontSize="small" />
                          Purpose
                        </Typography>
                        <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                          {visitor.purpose}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                          Arrival
                        </Typography>
                        <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                          {formatDate(visitor.expectedArrival)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                          Departure
                        </Typography>
                        <Typography variant="body2" sx={{ color: themeColors.textPrimary }}>
                          {formatDate(visitor.expectedDeparture)}
                        </Typography>
                      </Grid>
                    </Grid>

                    <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<ApproveIcon />}
                        fullWidth
                        onClick={() => {
                          setSelectedVisitor(visitor);
                          setOpenApproveDialog(true);
                        }}
                        sx={{ 
                          borderRadius: 2.5,
                          bgcolor: themeColors.success,
                          textTransform: 'none',
                          '&:hover': {
                            bgcolor: '#0da271'
                          },
                          fontWeight: 600
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<RejectIcon />}
                        fullWidth
                        onClick={() => {
                          setSelectedVisitor(visitor);
                          setOpenRejectDialog(true);
                        }}
                        sx={{ 
                          borderRadius: 2.5,
                          borderColor: themeColors.error,
                          color: themeColors.error,
                          textTransform: 'none',
                          '&:hover': {
                            borderColor: themeColors.error,
                            backgroundColor: themeColors.error + '08'
                          },
                          fontWeight: 600
                        }}
                      >
                        Reject
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>

        {/* Approve Dialog */}
        <Dialog 
          open={openApproveDialog} 
          onClose={() => setOpenApproveDialog(false)}
          PaperProps={{
            sx: {
              borderRadius: '18px',
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
            Approve Visitor Request
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" gutterBottom sx={{ color: themeColors.textPrimary }}>
              Approving visitor: <strong>{selectedVisitor?.visitorName}</strong>
            </Typography>
            <Typography variant="body2" sx={{ color: themeColors.textSecondary, gutterBottom: 2 }}>
              Visiting: {selectedVisitor?.residentId?.firstName} {selectedVisitor?.residentId?.lastName}
            </Typography>
            
            <TextField
              fullWidth
              label="Security Notes (Optional)"
              multiline
              rows={3}
              value={securityNotes}
              onChange={(e) => setSecurityNotes(e.target.value)}
              margin="normal"
              placeholder="Add any notes for security records..."
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
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button 
              onClick={() => setOpenApproveDialog(false)}
              sx={{
                color: themeColors.textSecondary,
                '&:hover': {
                  backgroundColor: themeColors.primary + '08'
                },
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 700
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="success"
              onClick={handleApprove}
              disabled={loading}
              sx={{ 
                borderRadius: 2.5,
                bgcolor: themeColors.success,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: '#0da271'
                },
                fontWeight: 600
              }}
            >
              {loading ? <CircularProgress size={20} /> : 'Approve Visitor'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog 
          open={openRejectDialog} 
          onClose={() => setOpenRejectDialog(false)}
          PaperProps={{
            sx: {
              borderRadius: '18px',
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
            Reject Visitor Request
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" gutterBottom sx={{ color: themeColors.textPrimary }}>
              Rejecting visitor: <strong>{selectedVisitor?.visitorName}</strong>
            </Typography>
            <Typography variant="body2" sx={{ color: themeColors.textSecondary, gutterBottom: 2 }}>
              Visiting: {selectedVisitor?.residentId?.firstName} {selectedVisitor?.residentId?.lastName}
            </Typography>
            
            <TextField
              fullWidth
              label="Rejection Reason *"
              multiline
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              margin="normal"
              required
              placeholder="Please provide a reason for rejection..."
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
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button 
              onClick={() => setOpenRejectDialog(false)}
              sx={{
                color: themeColors.textSecondary,
                '&:hover': {
                  backgroundColor: themeColors.primary + '08'
                },
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 700
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="error"
              onClick={handleReject}
              disabled={loading || !rejectionReason.trim()}
              sx={{ 
                borderRadius: 2.5,
                bgcolor: themeColors.error,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: '#dc2626'
                },
                fontWeight: 600
              }}
            >
              {loading ? <CircularProgress size={20} /> : 'Reject Visitor'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default SecurityVisitorApproval;