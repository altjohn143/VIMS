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
    primary: '#2224be',
    success: '#10b981',
    error: '#ef4444',
    background: '#f8fafc',
    textPrimary: '#1e293b',
    textSecondary: '#64748b'
  };
  
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: themeColors.background }}>
      <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
        <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center', width: '100%' }}>
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
                <LinearProgress sx={{ mt: 3, borderRadius: 2 }} />
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
                  '&:hover': { bgcolor: '#1a1c9e' }
                }}
              >
                Try Again
              </Button>
              <Button 
                variant="outlined" 
                onClick={handleGoBack}
                startIcon={<ArrowBackIcon />}
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