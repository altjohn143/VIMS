import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  Divider,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  ListItemIcon,
  Avatar,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Warning as WarningIcon,
  Print as PrintIcon,
  ArrowBack as ArrowBackIcon,
  Logout as LogoutIcon,
  QrCode as QrCodeIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  CloudUpload as UploadIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';

// QRPh QR code image - place your downloaded QR code in src/assets/qrph.png
import qrphImage from '../assets/qrph.jpg';

const Payments = () => {
  const themeColors = {
    primary: '#007A18',
    primaryDark: '#003D07',
    primaryLight: '#00D084',
    success: '#00D084',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#007A18',
    background: '#f3f5f7',
    cardBackground: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    border: 'rgba(15, 23, 42, 0.08)'
  };

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ 
    totalPaid: 0, 
    totalPending: 0, 
    pendingCount: 0, 
    overdueCount: 0, 
    overdueAmount: 0,
    creditBalance: 0
  });
  const [currentDues, setCurrentDues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [uploadedReceipt, setUploadedReceipt] = useState(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(false);
  const [selectedDescriptionPayment, setSelectedDescriptionPayment] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [expandedTransactions, setExpandedTransactions] = useState({});

  const { getCurrentUser, logout } = useAuth();
  const navigate = useNavigate();
  const user = getCurrentUser();

  const hasActivePaymentAttempt = useCallback((payment) => (
    payment?.status === 'paid' ||
    (payment?.status === 'pending' && !!(payment?.paymentMethod || payment?.referenceNumber || payment?.transactionId))
  ), []);

  const showExistingPaymentAttemptToast = useCallback(() => {
    toast.error('This invoice already has a pending or completed payment. Please wait for verification or refresh the payment list.');
  }, []);

  // Define fetchData with useCallback to prevent infinite loops
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        toast.error('Please login again');
        navigate('/login');
        return;
      }
      
      console.log('Fetching current dues...');
      const duesResponse = await axios.get('/api/payments/current-dues');
      if (duesResponse.data.success) {
        setCurrentDues(duesResponse.data.data);
      }
      
      console.log('Fetching payment history...');
      const paymentsResponse = await axios.get('/api/payments/my');
      if (paymentsResponse.data.success) {
        setPayments(paymentsResponse.data.data);
        setSummary(paymentsResponse.data.summary);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(error.response?.data?.error || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Now useEffect with proper dependency
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(0);
  }, [activeTab]);

  useEffect(() => {
    const visibleCount = activeTab === 0
      ? payments.length
      : payments.filter(p => p.status === (activeTab === 1 ? 'pending' : 'paid')).length;

    if (page > 0 && page * rowsPerPage >= visibleCount) {
      setPage(Math.max(0, Math.ceil(visibleCount / rowsPerPage) - 1));
    }
  }, [activeTab, page, payments, rowsPerPage]);

  const handlePayClick = useCallback((payment) => {
    if (hasActivePaymentAttempt(payment)) {
      showExistingPaymentAttemptToast();
      fetchData();
      return;
    }

    setSelectedPayment(payment);
    setPaymentMethodOpen(true);
  }, [fetchData, hasActivePaymentAttempt, showExistingPaymentAttemptToast]);

  const handleQRPhPayment = useCallback(() => {
    if (hasActivePaymentAttempt(selectedPayment)) {
      setPaymentMethodOpen(false);
      showExistingPaymentAttemptToast();
      fetchData();
      return;
    }

    setPaymentMethodOpen(false);
    setPaymentAmount(String(selectedPayment?.amount || ''));
    setQrDialogOpen(true);
  }, [fetchData, hasActivePaymentAttempt, selectedPayment, showExistingPaymentAttemptToast]);

  const handleCashPayment = useCallback(async () => {
    if (processing || hasActivePaymentAttempt(selectedPayment)) {
      showExistingPaymentAttemptToast();
      fetchData();
      return;
    }

    setPaymentMethodOpen(false);
    setProcessing(true);
    try {
        const response = await axios.post(`/api/payments/${selectedPayment._id}/pay`, {
        paymentMethod: 'cash'
      });
      
      if (response.data.success) {
        toast.success('Cash payment selected. Please pay at the admin office.');
        setCashDialogOpen(true);
        fetchData();
      } else {
        toast.error(response.data?.error || 'Failed to process cash payment');
      }
    } catch (error) {
      console.error('Cash payment error:', error);
      toast.error(error.response?.data?.error || 'Failed to process cash payment');
    } finally {
      setProcessing(false);
    }
  }, [fetchData, hasActivePaymentAttempt, processing, selectedPayment, showExistingPaymentAttemptToast]);

  const handleApplyCredit = useCallback(async () => {
    if (processing || !selectedPayment || Number(summary.creditBalance || 0) <= 0) return;
    setProcessing(true);
    try {
      const response = await axios.put(`/api/payments/${selectedPayment._id}/apply-credit`);
      if (response.data.success) {
        toast.success('Available credit applied to this invoice.');
        setPaymentMethodOpen(false);
        fetchData();
      } else {
        toast.error(response.data?.error || 'Could not apply credit');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not apply credit');
    } finally {
      setProcessing(false);
    }
  }, [fetchData, processing, selectedPayment, summary.creditBalance]);

  const handleUploadReceipt = useCallback(async () => {
    if (processing) return;

    if (!referenceNumber.trim()) {
      toast.error('Please enter your reference number');
      return;
    }

    const enteredAmount = Number(paymentAmount);
    if (!Number.isFinite(enteredAmount) || enteredAmount <= 0) {
      toast.error('Please enter the amount you paid');
      return;
    }

    if (enteredAmount > Number(selectedPayment?.amount || 0)) {
      toast.error('Amount paid cannot exceed the invoice balance');
      return;
    }
    
    if (!uploadedReceipt) {
      toast.error('Please upload your payment receipt/screenshot');
      return;
    }
    
    setProcessing(true);
    try {
      const latestPaymentResponse = await axios.get(`/api/payments/${selectedPayment._id}`);
      const latestPayment = latestPaymentResponse.data?.data;
      if (!latestPaymentResponse.data?.success || hasActivePaymentAttempt(latestPayment)) {
        setQrDialogOpen(false);
        showExistingPaymentAttemptToast();
        fetchData();
        return;
      }

      const formData = new FormData();
      formData.append('referenceNumber', referenceNumber);
      formData.append('receipt', uploadedReceipt);
      formData.append('paymentId', selectedPayment._id);
      formData.append('amount', enteredAmount);
      
        const response = await axios.post('/api/payments/upload-qrph-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        toast.success('Payment receipt submitted! Admin will verify your payment within 24 hours.');
        setQrDialogOpen(false);
        setReferenceNumber('');
        setPaymentAmount('');
        setUploadedReceipt(null);
        fetchData();
      } else {
        toast.error(response.data?.error || 'Failed to submit payment');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error || 'Failed to submit payment');
    } finally {
      setProcessing(false);
    }
  }, [fetchData, hasActivePaymentAttempt, paymentAmount, processing, referenceNumber, selectedPayment, showExistingPaymentAttemptToast, uploadedReceipt]);

  const formatDate = useCallback((date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount || 0);
  }, []);

  const handlePrintReceipt = useCallback(() => {
    if (!receiptData) return;

    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    const paymentMethod = (receiptData.paymentMethod || 'QRPh').toUpperCase();
    const remainingBalance = Number(receiptData.remainingBalance || 0);

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - VIMS</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 32px 16px; background: #f1f5f3; color: #17221c; font-family: Arial, Helvetica, sans-serif; }
            .receipt { max-width: 680px; margin: 0 auto; background: #fff; border: 1px solid #d7e2db; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 24px rgba(18, 51, 31, .08); }
            .header { padding: 28px 36px 22px; text-align: center; background: #087f2e; color: #fff; }
            .brand { margin: 0; font-size: 12px; letter-spacing: 2px; font-weight: 700; }
            .title { margin: 10px 0 4px; font-size: 28px; font-weight: 700; }
            .subtitle { margin: 0; font-size: 13px; opacity: .9; }
            .content { padding: 28px 36px 24px; }
            .status { display: inline-block; padding: 6px 12px; border-radius: 999px; background: #e4f5e8; color: #087f2e; font-size: 12px; font-weight: 700; letter-spacing: .5px; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 32px; margin: 24px 0; }
            .label { display: block; margin-bottom: 5px; color: #6a786f; font-size: 11px; text-transform: uppercase; letter-spacing: .7px; }
            .value { display: block; font-size: 14px; font-weight: 600; word-break: break-word; }
            .summary { margin-top: 8px; padding: 20px; border: 1px solid #d7e2db; border-radius: 8px; background: #f7fbf8; }
            .summary-row { display: flex; justify-content: space-between; gap: 20px; padding: 8px 0; font-size: 14px; }
            .summary-row.total { border-top: 1px solid #c9d9ce; margin-top: 8px; padding-top: 16px; color: #087f2e; font-size: 21px; font-weight: 700; }
            .description { margin: 22px 0 0; color: #536159; font-size: 13px; line-height: 1.5; }
            .footer { padding: 18px 36px 24px; border-top: 1px dashed #c9d9ce; text-align: center; color: #6a786f; font-size: 11px; line-height: 1.5; }
            .actions { text-align: center; margin: 18px auto 0; }
            button { border: 0; border-radius: 6px; padding: 10px 18px; margin: 0 4px; background: #087f2e; color: #fff; font-weight: 700; cursor: pointer; }
            button.secondary { background: #e7ede9; color: #26362d; }
            @media print {
              body { padding: 0; background: #fff; }
              .receipt { max-width: none; border: 0; border-radius: 0; box-shadow: none; }
              .actions { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <header class="header">
              <p class="brand">WESTVILLE CASIMIRO HOMES</p>
              <h1 class="title">Payment Receipt</h1>
              <p class="subtitle">Village Information Management System</p>
            </header>
            <main class="content">
              <span class="status">PAYMENT CONFIRMED</span>
              <section class="meta">
                <div><span class="label">Receipt Number</span><span class="value">${escapeHtml(receiptData.receiptNumber || 'N/A')}</span></div>
                <div><span class="label">Invoice Number</span><span class="value">${escapeHtml(receiptData.invoiceNumber || 'N/A')}</span></div>
                <div><span class="label">Payment Date</span><span class="value">${escapeHtml(formatDate(receiptData.paymentDate))}</span></div>
                <div><span class="label">Payment Method</span><span class="value">${escapeHtml(paymentMethod)}</span></div>
              </section>
              <section class="summary">
                <div class="summary-row"><span>Payment applied</span><strong>${escapeHtml(formatCurrency(receiptData.amount))}</strong></div>
                ${remainingBalance > 0 ? `<div class="summary-row"><span>Remaining balance</span><strong>${escapeHtml(formatCurrency(remainingBalance))}</strong></div>` : ''}
                <div class="summary-row total"><span>Total paid</span><span>${escapeHtml(formatCurrency(receiptData.amount))}</span></div>
              </section>
              <p class="description"><strong>Description:</strong> ${escapeHtml(receiptData.description || 'Association dues payment')}</p>
            </main>
            <footer class="footer">This is a system-generated receipt.<br />Thank you for your payment.</footer>
          </div>
          <div class="actions">
            <button onclick="window.print()">Print Receipt</button>
            <button class="secondary" onclick="window.close()">Close</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [formatDate, formatCurrency, receiptData]);

  const handleBack = useCallback(() => navigate('/dashboard'), [navigate]);
  
  const handleLogout = useCallback(() => { 
    logout(); 
    navigate('/login'); 
  }, [logout, navigate]);
  
  const handleProfileMenuOpen = useCallback((e) => setProfileAnchorEl(e.currentTarget), []);
  const handleProfileMenuClose = useCallback(() => setProfileAnchorEl(null), []);

  const getStatusChip = useCallback((status, dueDate) => {
    if (status === 'paid') {
      return <Chip icon={<CheckCircleIcon />} label="Paid" color="success" size="small" />;
    }
    if (dueDate && new Date() > new Date(dueDate)) {
      return <Chip icon={<WarningIcon />} label="Overdue" color="error" size="small" />;
    }
    return <Chip icon={<PendingIcon />} label="Pending" color="warning" size="small" />;
  }, []);

  const getDescriptionPreview = useCallback((payment) => {
    const text = payment?.description || 'No description';
    return text.length > 45 ? `${text.slice(0, 45)}...` : text;
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress sx={{ color: themeColors.primary }} />
      </Box>
    );
  }

  const filteredPayments = activeTab === 0 
    ? payments 
    : payments.filter(p => p.status === (activeTab === 1 ? 'pending' : 'paid'));
  const paginatedPayments = filteredPayments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
      {/* Navigation Bar */}
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
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Payments & Dues
          </Typography>
          <IconButton onClick={handleProfileMenuOpen}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: themeColors.primary }}>
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </Avatar>
          </IconButton>
          <Menu anchorEl={profileAnchorEl} open={Boolean(profileAnchorEl)} onClose={handleProfileMenuClose}>
            <MenuItem component={RouterLink} to="/profile" onClick={handleProfileMenuClose}>
              <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
              Profile Settings
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header Banner */}
        <Paper sx={{ 
          p: { xs: 2.5, md: 3 }, 
          mb: 4, 
          borderRadius: '22px', 
          background: `linear-gradient(135deg, ${themeColors.primaryLight}, ${themeColors.primary} 60%, ${themeColors.primaryDark})`, 
          color: 'white',
          boxShadow: '0 18px 40px rgba(0, 122, 24, 0.35)',
          animation: 'fadeUpSoft .45s ease-out'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PaymentIcon sx={{ fontSize: 48 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>Payments & Dues</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Pay using QRPh - Scan with GCash, PayMaya, or any banking app
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            {
              value: formatCurrency(summary.totalPaid),
              label: 'Total Paid',
              helper: 'settled payments',
              icon: <CheckCircleIcon sx={{ color: 'rgba(255,255,255,0.22)', fontSize: 42 }} />,
              gradient: 'linear-gradient(135deg, #003D07 0%, #007A18 52%, #00D084 100%)',
              shadow: '0 14px 34px rgba(0,208,132,0.34)'
            },
            {
              value: formatCurrency(summary.totalPending),
              label: 'Pending Balance',
              helper: `${summary.pendingCount || 0} pending invoices`,
              icon: <PendingIcon sx={{ color: 'rgba(255,255,255,0.22)', fontSize: 42 }} />,
              gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
              shadow: '0 14px 34px rgba(14,165,233,0.34)'
            },
            {
              value: formatCurrency(summary.overdueAmount),
              label: 'Overdue Amount',
              helper: `${summary.overdueCount || 0} overdue invoices`,
              icon: <WarningIcon sx={{ color: 'rgba(255,255,255,0.22)', fontSize: 42 }} />,
              gradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              shadow: '0 14px 34px rgba(220,38,38,0.34)'
            },
            {
              value: formatCurrency(summary.creditBalance),
              label: 'Available Credit',
              helper: 'applies to future dues',
              icon: <HistoryIcon sx={{ color: 'rgba(255,255,255,0.22)', fontSize: 42 }} />,
              gradient: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
              shadow: '0 14px 34px rgba(29,78,216,0.34)'
            }
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
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff' }}>
                      {stat.value}
                    </Typography>
                    {stat.icon}
                  </Box>
                  <Typography sx={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>
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

        {/* Current Month Dues Banner */}
        {currentDues && currentDues.status !== 'paid' && (
          <Paper
            sx={{
              p: 3,
              mb: 4,
              borderRadius: '20px',
              border: `1px solid ${themeColors.border}`,
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
              bgcolor: '#fff'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: themeColors.warning }}>
                  Current Month Dues
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {currentDues.description}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, mt: 1 }}>
                  {formatCurrency(currentDues.amount)}
                </Typography>
                {!!currentDues.paidAmount && (
                  <Typography variant="caption" color="textSecondary" display="block">
                    Paid so far: {formatCurrency(currentDues.paidAmount)}
                  </Typography>
                )}
                {!!currentDues.penaltyAmount && (
                  <Typography variant="caption" color="error" display="block">
                    Overdue penalty: {formatCurrency(currentDues.penaltyAmount)}
                  </Typography>
                )}
                <Typography variant="caption" color="textSecondary">
                  Due Date: {formatDate(currentDues.dueDate)}
                </Typography>
                {currentDues.inclusions?.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {currentDues.inclusions.map((item) => (
                      <Typography key={item} variant="body2" sx={{ color: themeColors.textSecondary, fontSize: 12, lineHeight: 1.5 }}>
                        • {item}
                      </Typography>
                    ))}
                  </Box>
                )}
                {currentDues.rejectionReason && (
                  <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                    Previous payment rejected: {currentDues.rejectionReason}
                  </Alert>
                )}
              </Box>
              <Button
                variant="contained"
                startIcon={<QrCodeIcon />}
                onClick={() => handlePayClick(currentDues)}
                sx={{
                  bgcolor: themeColors.success,
                  '&:hover': { bgcolor: '#0da271' },
                  px: 4,
                  py: 1.5,
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 700
                }}
              >
                Pay Now
              </Button>
            </Box>
          </Paper>
        )}

        {/* Payment History Table */}
        <Paper
          sx={{
            p: 3,
            borderRadius: '20px',
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)'
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Payment History</Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<HistoryIcon />}
              onClick={fetchData}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
            >
              Refresh
            </Button>
          </Box>

          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
            <Tab label={`All (${payments.length})`} />
            <Tab label={`Pending (${payments.filter(p => p.status === 'pending').length})`} />
            <Tab label={`Paid (${payments.filter(p => p.status === 'paid').length})`} />
          </Tabs>

          {filteredPayments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <ReceiptIcon sx={{ fontSize: 64, color: themeColors.textSecondary, opacity: 0.5, mb: 2 }} />
              <Typography variant="body1" color="textSecondary">No payment records found</Typography>
            </Box>
          ) : (
            <>
            <TableContainer sx={{ borderRadius: 2.5, border: `1px solid ${themeColors.border}` }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(0, 208, 132, 0.08)' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Invoice #</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Balance</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Paid</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Payment Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedPayments.map((payment) => (
                    <TableRow key={payment._id} hover sx={{ '&:hover': { backgroundColor: 'rgba(0, 208, 132, 0.04)' } }}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {payment.invoiceNumber}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 170, maxWidth: 220 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 190,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {getDescriptionPreview(payment)}
                        </Typography>
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<VisibilityIcon />}
                          onClick={() => setSelectedDescriptionPayment(payment)}
                          sx={{
                            mt: 0.5,
                            p: 0,
                            minWidth: 0,
                            textTransform: 'none',
                            fontWeight: 700,
                            color: themeColors.primary
                          }}
                        >
                          View Details
                        </Button>
                        {false && payment.inclusions?.length > 0 && (
                          <Box sx={{ mt: 0.5 }}>
                            {payment.inclusions.map((item) => (
                              <Typography key={item} variant="caption" color="textSecondary" display="block">
                                • {item}
                              </Typography>
                            ))}
                          </Box>
                        )}
                        {false && payment.notes && (
                          <Typography variant="caption" color="textSecondary">{payment.notes}</Typography>
                        )}
                        {payment.paymentHistory?.length > 0 && (
                          <Box sx={{ mt: 1.25 }}>
                            <Button size="small" onClick={() => setExpandedTransactions((current) => ({ ...current, [payment._id]: !current[payment._id] }))}
                              sx={{ p: 0, minWidth: 0, textTransform: 'none', fontWeight: 800, color: themeColors.textPrimary }}>
                              Transactions ({payment.paymentHistory.length}) {expandedTransactions[payment._id] ? '- Hide' : '+ Show'}
                            </Button>
                            {expandedTransactions[payment._id] && payment.paymentHistory.map((transaction, index) => {
                              const transactionAmount = Number(transaction.amount || 0) + Number(transaction.creditedAmount || 0);
                              const isRejected = String(transaction.notes || '').toLowerCase().includes('rejected');
                              return (
                                <Box
                                  key={transaction._id || `${payment._id}-${index}`}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'space-between',
                                    gap: 1,
                                    p: 1,
                                    mb: 0.75,
                                    borderRadius: 2,
                                    bgcolor: 'rgba(15, 23, 42, 0.035)',
                                    border: `1px solid ${themeColors.border}`
                                  }}
                                >
                                  <Box>
                                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 800 }}>
                                      {formatCurrency(transactionAmount)}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                                      {formatDate(transaction.verifiedAt)} • {(transaction.paymentMethod || 'payment').toUpperCase()}
                                    </Typography>
                                    {!!transaction.referenceNumber && (
                                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                                        Ref: {transaction.referenceNumber}
                                      </Typography>
                                    )}
                                    {!!transaction.receiptNumber && (
                                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                                        Receipt: {transaction.receiptNumber}
                                      </Typography>
                                    )}
                                    {!!transaction.creditedAmount && (
                                      <Typography variant="caption" sx={{ display: 'block', color: themeColors.primary, fontWeight: 700 }}>
                                        Credit added: {formatCurrency(transaction.creditedAmount)}
                                      </Typography>
                                    )}
                                  </Box>
                                  <Chip
                                    size="small"
                                    color={isRejected ? 'error' : 'success'}
                                    label={isRejected ? 'Rejected' : 'Confirmed'}
                                    sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700 }}
                                  />
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(payment.amount)}
                        </Typography>
                        {!!payment.penaltyAmount && (
                          <Typography variant="caption" color="error">
                            +{formatCurrency(payment.penaltyAmount)} penalty
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="textSecondary">
                          {formatCurrency(payment.paidAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(payment.dueDate)}</TableCell>
                      <TableCell>{payment.paymentDate ? formatDate(payment.paymentDate) : '-'}</TableCell>
                      <TableCell>{getStatusChip(payment.status, payment.dueDate)}</TableCell>
                      <TableCell align="center">
                        {payment.rejectionReason && (
                          <Alert severity="error" sx={{ mb: 1, textAlign: 'left', borderRadius: 2 }}>
                            Rejected: {payment.rejectionReason}
                          </Alert>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                          {payment.status === 'pending' && (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handlePayClick(payment)}
                              sx={{ bgcolor: themeColors.primary, fontSize: '0.7rem', borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                            >
                              Pay
                            </Button>
                          )}
                          {(payment.receiptNumber || payment.paymentHistory?.some(transaction => transaction.receiptNumber)) && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              const latestReceipt = payment.paymentHistory?.[payment.paymentHistory.length - 1];
                              setReceiptData({
                                receiptNumber: latestReceipt?.receiptNumber || payment.receiptNumber,
                                amount: latestReceipt?.amount || payment.paidAmount || payment.amount,
                                paymentDate: payment.paymentDate,
                                paymentMethod: latestReceipt?.paymentMethod || payment.paymentMethod,
                                invoiceNumber: payment.invoiceNumber,
                                description: payment.description,
                                remainingBalance: payment.status === 'pending' ? payment.amount : 0
                              });
                              setReceiptDialogOpen(true);
                            }}
                          >
                            <ReceiptIcon />
                          </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filteredPayments.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25]}
            />
            </>
          )}
        </Paper>

        {/* Payment Description Details Dialog */}
        <Dialog
          open={Boolean(selectedDescriptionPayment)}
          onClose={() => setSelectedDescriptionPayment(null)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: '18px' } }}
        >
          <DialogTitle sx={{ fontWeight: 600, color: themeColors.textPrimary }}>
            Payment Details
          </DialogTitle>
          <DialogContent>
            {selectedDescriptionPayment && (
              <Box>
                <Paper sx={{ p: 2, bgcolor: themeColors.background, borderRadius: 2, mb: 2 }}>
                  <Typography><strong>Invoice:</strong> {selectedDescriptionPayment.invoiceNumber}</Typography>
                  <Typography><strong>Balance:</strong> {formatCurrency(selectedDescriptionPayment.amount)}</Typography>
                  <Typography><strong>Paid so far:</strong> {formatCurrency(selectedDescriptionPayment.paidAmount)}</Typography>
                  <Typography><strong>Penalty:</strong> {formatCurrency(selectedDescriptionPayment.penaltyAmount)}</Typography>
                  <Typography><strong>Due Date:</strong> {formatDate(selectedDescriptionPayment.dueDate)}</Typography>
                  <Typography><strong>Status:</strong> {selectedDescriptionPayment.status}</Typography>
                </Paper>

                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                  Description
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                  {selectedDescriptionPayment.description || 'No description'}
                </Typography>

                {selectedDescriptionPayment.inclusions?.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                      Inclusions
                    </Typography>
                    {selectedDescriptionPayment.inclusions.map((item) => (
                      <Typography key={item} variant="body2" color="textSecondary" sx={{ display: 'block' }}>
                        - {item}
                      </Typography>
                    ))}
                  </Box>
                )}

                {selectedDescriptionPayment.notes && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                      Notes
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedDescriptionPayment.notes}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button onClick={() => setSelectedDescriptionPayment(null)} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Payment Method Selection Dialog */}
        <Dialog open={paymentMethodOpen} onClose={() => setPaymentMethodOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '18px' } }}>
          <DialogTitle sx={{ fontWeight: 600, color: themeColors.textPrimary }}>
            Select Payment Method
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Balance due: <strong>{formatCurrency(selectedPayment?.amount)}</strong>
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {Number(summary.creditBalance || 0) > 0 && (
                <Grid item xs={12}>
                  <Button fullWidth variant="outlined" onClick={handleApplyCredit} disabled={processing}
                    sx={{ py: 1.5, justifyContent: 'flex-start', borderColor: themeColors.primary, color: themeColors.primary, borderRadius: 2.5, textTransform: 'none' }}>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography sx={{ fontWeight: 700 }}>Use available credit</Typography>
                      <Typography variant="body2">Apply up to {formatCurrency(Math.min(Number(summary.creditBalance), Number(selectedPayment?.amount || 0)))} from your credit balance</Typography>
                    </Box>
                  </Button>
                </Grid>
              )}
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<QrCodeIcon />}
                  onClick={handleQRPhPayment}
                  sx={{ 
                    py: 2, 
                    justifyContent: 'flex-start', 
                    bgcolor: themeColors.primary,
                    '&:hover': { bgcolor: themeColors.primaryDark },
                    borderRadius: 2.5,
                    textTransform: 'none'
                  }}
                >
                  <Box sx={{ ml: 2, textAlign: 'left' }}>
                    <Typography variant="subtitle1">QRPh</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      Scan with GCash, PayMaya, or any bank app
                    </Typography>
                  </Box>
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Typography component="span" sx={{ fontSize: 24, lineHeight: 1 }}>₱</Typography>}
                  onClick={handleCashPayment}
                  sx={{ 
                    py: 2, 
                    justifyContent: 'flex-start',
                    borderColor: themeColors.border,
                    color: themeColors.textPrimary,
                    borderRadius: 2.5,
                    textTransform: 'none'
                  }}
                >
                  <Box sx={{ ml: 2, textAlign: 'left' }}>
                    <Typography variant="subtitle1">Cash</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Pay at the admin office
                    </Typography>
                  </Box>
                </Button>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentMethodOpen(false)} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          </DialogActions>
        </Dialog>

        {/* QRPh Payment Dialog */}
        <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '18px' } }}>
          <DialogTitle sx={{ fontWeight: 600, color: themeColors.textPrimary, borderBottom: `1px solid ${themeColors.border}` }}>
            Pay with QRPh
          </DialogTitle>
          <DialogContent>
            <Box sx={{ textAlign: 'center', py: 3 }}>
              {/* QR Code Image */}
              <Box sx={{ 
                p: 2, 
                bgcolor: 'white', 
                display: 'inline-block', 
                borderRadius: 2,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                mb: 2
              }}>
                <img 
                  src={qrphImage} 
                  alt="QRPh Payment Code" 
                  style={{ width: '220px', height: '250px' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/220x220?text=QR+Code';
                  }}
                />
              </Box>
              
              <Typography variant="h6" sx={{ fontWeight: 700, color: themeColors.textPrimary, mb: 1 }}>
                {formatCurrency(selectedPayment?.amount)}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                You may pay the full balance or a partial amount. The admin will verify the receipt amount before it is deducted.
              </Typography>
              
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>How to pay:</Typography>
                <Typography variant="caption" component="div">
                  1. Open GCash, PayMaya, or any banking app<br/>
                  2. Tap "Scan to Pay" or "QR Payment"<br/>
                  3. Scan the QR code above<br/>
                  4. Enter the amount you are paying, up to {formatCurrency(selectedPayment?.amount)}<br/>
                  5. Complete the payment and save the reference number
                </Typography>
              </Alert>

              <TextField
                fullWidth
                label="Payment Reference Number"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Enter the reference number from your payment app"
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ReceiptIcon sx={{ color: themeColors.textSecondary }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                type="number"
                label="Amount Paid"
                value={paymentAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  const max = Number(selectedPayment?.amount || 0);
                  setPaymentAmount(value === '' ? '' : String(Math.min(Number(value), max)));
                }}
                inputProps={{ min: 1, max: selectedPayment?.amount || undefined, step: '0.01' }}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography component="span" sx={{ color: themeColors.textSecondary, fontSize: 24, lineHeight: 1 }}>₱</Typography>
                    </InputAdornment>
                  ),
                }}
              />
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => document.getElementById('receipt-upload').click()}
                sx={{ mb: 2, borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
              >
                Upload Receipt/Screenshot
              </Button>
              
              <input
                id="receipt-upload"
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={(e) => setUploadedReceipt(e.target.files[0])}
              />
              
              {uploadedReceipt && (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  File selected: {uploadedReceipt.name}
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button onClick={() => setQrDialogOpen(false)} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
              <Button 
              variant="contained" 
              onClick={handleUploadReceipt}
              disabled={!referenceNumber || !paymentAmount || !uploadedReceipt || processing}
              sx={{ bgcolor: themeColors.success, borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
            >
              {processing ? <CircularProgress size={20} /> : 'Submit Payment'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Cash Payment Confirmation Dialog */}
        <Dialog open={cashDialogOpen} onClose={() => setCashDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '18px' } }}>
          <DialogTitle sx={{ fontWeight: 600, color: themeColors.textPrimary }}>
            Cash Payment Selected
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              Please visit the admin office to complete your cash payment.
            </Alert>
            <Typography variant="body2" color="textSecondary">
              Your payment will be marked as pending until confirmed by the admin.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCashDialogOpen(false)} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Receipt Dialog */}
        <Dialog open={receiptDialogOpen} onClose={() => setReceiptDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '18px' } }}>
          <DialogTitle sx={{ bgcolor: themeColors.primary, color: 'white', fontWeight: 600 }}>
            Payment Receipt
          </DialogTitle>
          <DialogContent>
            <div id="receipt-content">
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: themeColors.primary }}>
                  WESTVILLE CASIMIRO HOMES
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Village Information Management System
                </Typography>
                <Divider sx={{ my: 2 }} />
              </Box>
              
              {receiptData && (
                <Box>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">Receipt Number:</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{receiptData.receiptNumber}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">Invoice Number:</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">{receiptData.invoiceNumber}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">Payment Date:</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">{formatDate(receiptData.paymentDate)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">Payment Method:</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                        {receiptData.paymentMethod || 'QRPh'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>Amount Paid:</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: themeColors.success }}>
                        {formatCurrency(receiptData.amount)}
                      </Typography>
                    </Grid>
                    {!!receiptData.remainingBalance && (
                      <>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="textSecondary">Remaining Balance:</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: themeColors.warning }}>
                            {formatCurrency(receiptData.remainingBalance)}
                          </Typography>
                        </Grid>
                      </>
                    )}
                    <Grid item xs={12}>
                      <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
                        Description: {receiptData.description}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
              
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" align="center" display="block" color="textSecondary">
                This is a system-generated receipt. Thank you for your payment!
              </Typography>
            </div>
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: `1px solid ${themeColors.border}` }}>
            <Button onClick={() => setReceiptDialogOpen(false)} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>Close</Button>
            <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrintReceipt} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, bgcolor: themeColors.primary, '&:hover': { bgcolor: themeColors.primaryDark } }}>
              Print Receipt
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Payments;

