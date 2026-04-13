import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  Button, 
  Box,
  Alert
} from '@mui/material';
import { 
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon
} from '@mui/icons-material';

const PaymentCancelled = () => {
  const [countdown, setCountdown] = useState(10);
  const navigate = useNavigate();
  const location = useLocation();
  const paymentId = new URLSearchParams(location.search).get('payment_id');
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/payments');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [navigate]);
  
  const handleRetry = () => {
    if (paymentId) {
      navigate(`/payments`);
    } else {
      navigate('/payments');
    }
  };
  
  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };
  
  const themeColors = {
    primary: '#166534',
    primaryDark: '#14532d',
    primaryLight: '#22c55e',
    error: '#ef4444',
    background: '#f3f5f7',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    border: 'rgba(15, 23, 42, 0.08)'
  };
  
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
      <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
        <Paper
          sx={{
            p: 4,
            borderRadius: '22px',
            textAlign: 'center',
            width: '100%',
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 16px 36px rgba(15, 23, 42, 0.10)',
            bgcolor: themeColors.cardBackground || '#fff'
          }}
        >
          <Box
            sx={{
              mb: 2.5,
              py: 1.8,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)',
              color: '#fff'
            }}
          >
            <Typography sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
              Payment Status
            </Typography>
          </Box>
          <CancelIcon sx={{ fontSize: 80, color: themeColors.error, mb: 2 }} />
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
            Payment Cancelled
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>
            You cancelled the payment process. No charges were made to your account.
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            Redirecting back to payments in {countdown} seconds...
          </Alert>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={handleRetry}
              startIcon={<RefreshIcon />}
              sx={{ 
                bgcolor: themeColors.primary,
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 700,
                '&:hover': { bgcolor: themeColors.primaryDark }
              }}
            >
              Try Again
            </Button>
            <Button
              variant="outlined"
              onClick={handleGoToDashboard}
              startIcon={<HomeIcon />}
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 700
              }}
            >
              Back to Dashboard
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default PaymentCancelled;