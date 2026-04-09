import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Avatar,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  VerifiedUser as VerifiedIcon,
  Logout as LogoutIcon,
  AccessTime as TimeIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from '../config/axios';

const PendingApproval = () => {
  const { logout, getCurrentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [pendingStatus, setPendingStatus] = useState(null);

  const themeColors = {
    primary: '#2224be',
    warning: '#f59e0b',
    textSecondary: '#64748b',
    background: '#f8fafc'
  };

  const email = useMemo(() => {
    const fromState = location.state?.email;
    const fromStorage = localStorage.getItem('pendingApprovalEmail');
    return (fromState || fromStorage || user?.email || '').toLowerCase();
  }, [location.state, user?.email]);

  useEffect(() => {
    // Poll quickly so UI updates within seconds after ID upload/admin action.
    let stopped = false;
    const run = async () => {
      if (stopped) return;
      await fetchStatus();
    };
    run();
    const id = window.setInterval(run, 8000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const fetchStatus = async () => {
    if (!email) return;
    setStatusError('');
    try {
      const res = await axios.post('/api/auth/pending-status', { email });
      if (res.data?.success) setPendingStatus(res.data.data);
    } catch (e) {
      setStatusError(e?.response?.data?.error || 'Failed to check status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCheckStatus = () => {
    setStatusLoading(true);
    fetchStatus();
  };

  const handleContactAdmin = () => {
    window.location.href = 'mailto:admin@vims.com?subject=Account%20Approval%20Inquiry';
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a3a0a 0%, #2d5016 50%, #4a7a20 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -150,
          left: -100,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
        },
      }}
    >
      <Container maxWidth="sm">
        <Paper
          sx={{
            p: 4,
            borderRadius: 4,
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            backgroundColor: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.15)',
            position: 'relative',
            zIndex: 10
          }}
        >
          {/* Icon */}
          <Avatar
            sx={{
              width: 100,
              height: 100,
              bgcolor: themeColors.warning + '20',
              color: themeColors.warning,
              margin: '0 auto',
              mb: 2,
              border: '4px solid rgba(245, 158, 11, 0.2)'
            }}
          >
            <TimeIcon sx={{ fontSize: 50 }} />
          </Avatar>

          {/* Title */}
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b', mb: 1 }}>
            Pending Approval
          </Typography>

          {/* Welcome Message */}
          <Typography variant="body1" sx={{ color: '#64748b', mb: 3 }}>
            Hello <strong>{user?.firstName} {user?.lastName}</strong>!
          </Typography>

          {/* Live status */}
          <Box sx={{ mb: 3 }}>
            {statusLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
                <CircularProgress size={18} />
                <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                  Checking status…
                </Typography>
              </Box>
            ) : statusError ? (
              <Typography variant="caption" sx={{ color: '#ef4444' }}>
                {statusError}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Chip
                  size="small"
                  icon={<VerifiedIcon fontSize="small" />}
                  label={`Documents: ${pendingStatus?.documents?.status || 'pending_upload'}`}
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  size="small"
                  icon={<TimeIcon fontSize="small" />}
                  label={`Account: ${pendingStatus?.isApproved ? 'approved' : 'pending admin'}`}
                  sx={{ fontWeight: 700 }}
                />
              </Box>
            )}
          </Box>

          {/* Main Message */}
          <Typography variant="body2" sx={{ color: '#64748b', mb: 4, lineHeight: 1.8 }}>
            Your registration is submitted. Your uploaded ID can be verified automatically, but your
            account still requires final admin approval before you can log in.
          </Typography>

          {/* User Info Card */}
          <Card sx={{ 
            mb: 4, 
            borderRadius: 3,
            backgroundColor: themeColors.background,
            border: '1px solid rgba(0,0,0,0.05)',
            textAlign: 'left'
          }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ 
                color: themeColors.warning, 
                fontWeight: 700, 
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <VerifiedIcon fontSize="small" />
                Registration Details
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <EmailIcon sx={{ color: themeColors.textSecondary, fontSize: 20 }} />
                  <Typography variant="body2" sx={{ color: '#1e293b' }}>
                    {user?.email}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <PhoneIcon sx={{ color: themeColors.textSecondary, fontSize: 20 }} />
                  <Typography variant="body2" sx={{ color: '#1e293b' }}>
                    {user?.phone || 'Not provided'}
                  </Typography>
                </Box>
                
                {user?.houseNumber && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <HomeIcon sx={{ color: themeColors.textSecondary, fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#1e293b' }}>
                      House {user.houseNumber}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Info Box - What happens next */}
          <Box
            sx={{
              p: 2.5,
              backgroundColor: themeColors.warning + '08',
              borderRadius: 2,
              border: `1px solid ${themeColors.warning}20`,
              mb: 3,
              textAlign: 'left'
            }}
          >
            <Typography variant="subtitle2" sx={{ color: themeColors.warning, fontWeight: 700, mb: 1.5 }}>
              📋 What happens next?
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Typography variant="caption" sx={{ color: themeColors.warning, fontWeight: 700 }}>1.</Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  An admin will review your registration details
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Typography variant="caption" sx={{ color: themeColors.warning, fontWeight: 700 }}>2.</Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  You'll be able to login once your account is approved
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Typography variant="caption" sx={{ color: themeColors.warning, fontWeight: 700 }}>3.</Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  This usually takes 1-2 business days
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
              sx={{
                borderColor: themeColors.textSecondary,
                color: themeColors.textSecondary,
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                py: 1,
                '&:hover': {
                  borderColor: themeColors.primary,
                  backgroundColor: themeColors.primary + '08'
                }
              }}
            >
              Logout
            </Button>
            
            <Button
              variant="contained"
              onClick={handleCheckStatus}
              startIcon={<VerifiedIcon />}
              sx={{
                bgcolor: themeColors.primary,
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                py: 1,
                '&:hover': {
                  bgcolor: themeColors.primary + 'dd'
                }
              }}
            >
              Check Status
            </Button>

            {pendingStatus?.isApproved && (
              <Button
                variant="contained"
                onClick={() => navigate('/login')}
                sx={{
                  bgcolor: '#10b981',
                  borderRadius: 2,
                  textTransform: 'none',
                  px: 3,
                  py: 1,
                  '&:hover': { bgcolor: '#0ea371' }
                }}
              >
                Go to Login
              </Button>
            )}
          </Box>

          {/* Contact Admin Link */}
          <Button
            onClick={handleContactAdmin}
            sx={{
              mt: 3,
              color: themeColors.textSecondary,
              fontSize: '0.8rem',
              textTransform: 'none',
              '&:hover': {
                color: themeColors.primary,
                backgroundColor: 'transparent'
              }
            }}
          >
            Need help? Contact admin
          </Button>

          {/* Footer */}
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
            VIMS • Resident Registration System
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default PendingApproval;