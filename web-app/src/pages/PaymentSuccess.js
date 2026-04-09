import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Paper, 
  Typography, 
  Button, 
  CircularProgress,
  Grid,
  Divider
} from '@mui/material';
import { 
  CheckCircle as SuccessIcon,
  Receipt as ReceiptIcon,
  Home as HomeIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://vims-backend.onrender.com/api';

const PaymentSuccess = () => {
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  const paymentId = new URLSearchParams(location.search).get('payment_id');
  
  const verifyPayment = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/payments/verify-paymongo-payment/${paymentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setPaymentStatus(response.data.status);
        setPaymentDetails(response.data.payment);
      }
    } catch (error) {
      console.error('Verification error:', error);
    } finally {
      setLoading(false);
    }
  }, [paymentId]);
  
  useEffect(() => {
    if (paymentId) {
      verifyPayment();
    } else {
      setLoading(false);
    }
  }, [paymentId, verifyPayment]);
  
  const handleGoToPayments = () => {
    navigate('/payments');
  };
  
  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };
  
  const themeColors = {
    primary: '#166534',
    primaryDark: '#14532d',
    primaryLight: '#22c55e',
    success: '#10b981',
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
              Payment Result
            </Typography>
          </Box>
          {loading ? (
            <CircularProgress size={60} sx={{ color: themeColors.primary, mb: 3 }} />
          ) : paymentStatus === 'paid' ? (
            <>
              <SuccessIcon sx={{ fontSize: 80, color: themeColors.success, mb: 2 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: themeColors.textPrimary }}>
                Payment Successful!
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>
                Your payment has been processed successfully.
              </Typography>
              
              {paymentDetails && (
                <Paper sx={{ p: 2, mb: 4, bgcolor: '#f0fdf4', borderRadius: 2.5, border: `1px solid ${themeColors.border}` }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                    Payment Summary
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">Invoice:</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>{paymentDetails.invoiceNumber}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">Amount:</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: themeColors.success }}>
                        {formatCurrency(paymentDetails.amount)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">Payment Method:</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ textTransform: 'uppercase' }}>
                        {paymentDetails.paymentMethod || 'Online'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              )}
              
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  onClick={handleGoToPayments}
                  startIcon={<HistoryIcon />}
                  sx={{ 
                    bgcolor: themeColors.primary,
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: 700,
                    '&:hover': { bgcolor: themeColors.primaryDark }
                  }}
                >
                  View My Payments
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
            </>
          ) : (
            <>
              <Typography variant="h6" gutterBottom color="warning.main" sx={{ fontWeight: 600 }}>
                Processing Payment
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Your payment is being processed. Please check your payments page for updates.
              </Typography>
              <CircularProgress size={40} sx={{ mb: 3 }} />
              <Button
                variant="contained"
                onClick={handleGoToPayments}
                startIcon={<ReceiptIcon />}
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, bgcolor: themeColors.primary, '&:hover': { bgcolor: themeColors.primaryDark } }}
              >
                View My Payments
              </Button>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default PaymentSuccess;