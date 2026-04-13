import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Paper, 
  Typography, 
  CircularProgress, 
  Button, 
  Alert,
  LinearProgress
} from '@mui/material';
import { 
  Payment as PaymentIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://vims-backend.onrender.com/api';

const PaymentRedirect = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();
  const location = useLocation();
  
  const paymentId = new URLSearchParams(location.search).get('payment_id');
  const paymentMethod = new URLSearchParams(location.search).get('method');
  
  const initPayMongoPayment = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${API_URL}/payments/create-paymongo-session`,
        { paymentId, paymentMethod },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success && response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      } else {
        setError(response.data.error || 'Failed to create payment session');
        setLoading(false);
      }
    } catch (error) {
      console.error('Payment init error:', error);
      setError(error.response?.data?.error || 'Failed to initialize payment');
      setLoading(false);
    }
  }, [paymentId, paymentMethod]);
  
  useEffect(() => {
    if (paymentId && paymentMethod) {
      initPayMongoPayment();
    } else {
      setError('Missing payment information');
      setLoading(false);
    }
  }, [paymentId, paymentMethod, initPayMongoPayment]);
  
  useEffect(() => {
    let timer;
    if (error && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (error && countdown === 0) {
      navigate('/payments');
    }
    return () => clearTimeout(timer);
  }, [error, countdown, navigate]);
  
  const handleGoBack = () => {
    navigate('/payments');
  };
  
  const handleRetry = () => {
    setLoading(true);
    setError(null);
    initPayMongoPayment();
  };
  
  const themeColors = {
    primary: '#166534',
    primaryDark: '#14532d',
    primaryLight: '#22c55e',
    success: '#10b981',
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
            bgcolor: '#fff'
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
              Secure Payment
            </Typography>
          </Box>
          {loading ? (
            <>
              <Box sx={{ mb: 3 }}>
                <PaymentIcon sx={{ fontSize: 60, color: themeColors.primary, mb: 2 }} />
                <CircularProgress size={50} sx={{ color: themeColors.primary, mb: 2 }} />
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: themeColors.textPrimary }}>
                  Redirecting to PayMongo...
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Please wait while we prepare your secure payment.
                </Typography>
                <LinearProgress
                  sx={{
                    mt: 3,
                    borderRadius: 2,
                    bgcolor: 'rgba(22, 163, 74, 0.12)',
                    '& .MuiLinearProgress-bar': { bgcolor: themeColors.primary }
                  }}
                />
              </Box>
            </>
          ) : error ? (
            <>
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Redirecting back to payments in {countdown} seconds...
              </Typography>
              <Button 
                variant="contained" 
                onClick={handleRetry}
                sx={{ 
                  mr: 2,
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
                onClick={handleGoBack}
                startIcon={<ArrowBackIcon />}
                sx={{
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 700
                }}
              >
                Back to Payments
              </Button>
            </>
          ) : null}
        </Paper>
      </Container>
    </Box>
  );
};

export default PaymentRedirect;