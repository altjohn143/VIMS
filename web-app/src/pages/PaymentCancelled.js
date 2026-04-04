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
    primary: '#2224be',
    error: '#ef4444',
    background: '#f8fafc',
    textPrimary: '#1e293b',
    textSecondary: '#64748b'
  };
  
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: themeColors.background }}>
      <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
        <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center', width: '100%' }}>
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
                '&:hover': { bgcolor: '#1a1c9e' }
              }}
            >
              Try Again
            </Button>
            <Button
              variant="outlined"
              onClick={handleGoToDashboard}
              startIcon={<HomeIcon />}
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