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
  AttachMoney as CashIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';

// QRPh QR code image - place your downloaded QR code in src/assets/qrph.png
import qrphImage from '../assets/qrph.jpg';

const Payments = () => {
  const themeColors = {
    primary: '#2224be',
    primaryDark: '#1a1c9e',
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

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ 
    totalPaid: 0, 
    totalPending: 0, 
    pendingCount: 0, 
    overdueCount: 0, 
    overdueAmount: 0 
  });
  const [currentDues, setCurrentDues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [uploadedReceipt, setUploadedReceipt] = useState(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(false);

  const { getCurrentUser, logout } = useAuth();
  const navigate = useNavigate();
  const user = getCurrentUser();

  // Define fetchData with useCallback to prevent infinite loops
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Please login again');
        navigate('/login');
        return;
      }
      
      console.log('Fetching current dues...');
      const duesResponse = await axios.get('/payments/current-dues');
      if (duesResponse.data.success) {
        setCurrentDues(duesResponse.data.data);
      }
      
      console.log('Fetching payment history...');
      const paymentsResponse = await axios.get('/payments/my');
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

  const handlePayClick = useCallback((payment) => {
    setSelectedPayment(payment);
    setPaymentMethodOpen(true);
  }, []);

  const handleQRPhPayment = useCallback(() => {
    setPaymentMethodOpen(false);
    setQrDialogOpen(true);
  }, []);

  const handleCashPayment = useCallback(async () => {
    setPaymentMethodOpen(false);
    setProcessing(true);
    try {
      const response = await axios.post(`/payments/${selectedPayment._id}/pay`, {
        paymentMethod: 'cash'
      });
      
      if (response.data.success) {
        toast.success('Cash payment selected. Please pay at the admin office.');
        setCashDialogOpen(true);
        fetchData();
      }
    } catch (error) {
      console.error('Cash payment error:', error);
      toast.error(error.response?.data?.error || 'Failed to process cash payment');
    } finally {
      setProcessing(false);
    }
  }, [selectedPayment, fetchData]);

  const handleUploadReceipt = useCallback(async () => {
    if (!referenceNumber.trim()) {
      toast.error('Please enter your reference number');
      return;
    }
    
    if (!uploadedReceipt) {
      toast.error('Please upload your payment receipt/screenshot');
      return;
    }
    
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('referenceNumber', referenceNumber);
      formData.append('receipt', uploadedReceipt);
      formData.append('paymentId', selectedPayment._id);
      formData.append('amount', selectedPayment.amount);
      
      const response = await axios.post('/payments/upload-qrph-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        toast.success('Payment receipt submitted! Admin will verify your payment within 24 hours.');
        setQrDialogOpen(false);
        setReferenceNumber('');
        setUploadedReceipt(null);
        fetchData();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error || 'Failed to submit payment');
    } finally {
      setProcessing(false);
    }
  }, [referenceNumber, uploadedReceipt, selectedPayment, fetchData]);

  const handlePrintReceipt = useCallback(() => {
    const printContent = document.getElementById('receipt-content');
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - VIMS</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
            .receipt { 
              max-width: 400px; 
              margin: 0 auto; 
              border: 1px solid #ddd; 
              padding: 20px; 
              border-radius: 8px;
              background: white;
            }
            .header { text-align: center; margin-bottom: 20px; }
            .header h2 { color: #2224be; margin: 0; }
            .divider { border-top: 1px dashed #ddd; margin: 15px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .total { font-weight: bold; font-size: 1.2em; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #666; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${printContent.innerHTML}
          </div>
          <div style="text-align: center; margin-top: 20px;" class="no-print">
            <button onclick="window.print()" style="padding: 10px 20px; margin: 5px; cursor: pointer;">Print</button>
            <button onclick="window.close()" style="padding: 10px 20px; margin: 5px; cursor: pointer;">Close</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, []);

  const handleBack = useCallback(() => navigate(-1), [navigate]);
  
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

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: themeColors.background }}>
      {/* Navigation Bar */}
      <AppBar position="static" sx={{ bgcolor: themeColors.primary, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={handleBack} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Payments & Dues
          </Typography>
          <IconButton color="inherit" onClick={handleProfileMenuOpen}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(255,255,255,0.2)' }}>
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
          p: 3, 
          mb: 4, 
          borderRadius: 3, 
          background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.primaryDark})`, 
          color: 'white' 
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
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="body2" color="textSecondary">Total Paid</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: themeColors.success }}>
                  {formatCurrency(summary.totalPaid)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="body2" color="textSecondary">Pending Balance</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: themeColors.warning }}>
                  {formatCurrency(summary.totalPending)}
                </Typography>
                <Typography variant="caption" color="textSecondary">{summary.pendingCount} pending invoices</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="body2" color="textSecondary">Overdue Amount</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: themeColors.error }}>
                  {formatCurrency(summary.overdueAmount)}
                </Typography>
                <Typography variant="caption" color="textSecondary">{summary.overdueCount} overdue invoices</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 3, border: `1px solid ${themeColors.border}` }}>
              <CardContent>
                <Typography variant="body2" color="textSecondary">Collection Rate</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: themeColors.info }}>
                  {summary.totalPaid > 0 
                    ? `${((summary.totalPaid / (summary.totalPaid + summary.totalPending)) * 100).toFixed(1)}%`
                    : '0%'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Current Month Dues Banner */}
        {currentDues && currentDues.status !== 'paid' && (
          <Paper sx={{ p: 3, mb: 4, borderRadius: 3, border: `2px solid ${themeColors.warning}`, bgcolor: '#fffbeb' }}>
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
                <Typography variant="caption" color="textSecondary">
                  Due Date: {formatDate(currentDues.dueDate)}
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<QrCodeIcon />}
                onClick={() => handlePayClick(currentDues)}
                sx={{ bgcolor: themeColors.success, '&:hover': { bgcolor: '#0da271' }, px: 4, py: 1.5 }}
              >
                Pay Now
              </Button>
            </Box>
          </Paper>
        )}

        {/* Payment History Table */}
        <Paper sx={{ p: 3, borderRadius: 3, border: `1px solid ${themeColors.border}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Payment History</Typography>
            <Button variant="outlined" size="small" startIcon={<HistoryIcon />} onClick={fetchData}>
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
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: themeColors.background }}>
                    <TableCell sx={{ fontWeight: 600 }}>Invoice #</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Payment Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment._id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {payment.invoiceNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{payment.description}</Typography>
                        {payment.notes && (
                          <Typography variant="caption" color="textSecondary">{payment.notes}</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(payment.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(payment.dueDate)}</TableCell>
                      <TableCell>{payment.paymentDate ? formatDate(payment.paymentDate) : '-'}</TableCell>
                      <TableCell>{getStatusChip(payment.status, payment.dueDate)}</TableCell>
                      <TableCell align="center">
                        {payment.status === 'pending' ? (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handlePayClick(payment)}
                            sx={{ bgcolor: themeColors.primary, fontSize: '0.7rem' }}
                          >
                            Pay
                          </Button>
                        ) : payment.receiptNumber && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              setReceiptData({
                                receiptNumber: payment.receiptNumber,
                                amount: payment.amount,
                                paymentDate: payment.paymentDate,
                                paymentMethod: payment.paymentMethod,
                                invoiceNumber: payment.invoiceNumber,
                                description: payment.description
                              });
                              setReceiptDialogOpen(true);
                            }}
                          >
                            <ReceiptIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Payment Method Selection Dialog */}
        <Dialog open={paymentMethodOpen} onClose={() => setPaymentMethodOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 600, color: themeColors.textPrimary }}>
            Select Payment Method
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Amount to pay: <strong>{formatCurrency(selectedPayment?.amount)}</strong>
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
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
                    '&:hover': { bgcolor: themeColors.primaryDark }
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
                  startIcon={<CashIcon />}
                  onClick={handleCashPayment}
                  sx={{ 
                    py: 2, 
                    justifyContent: 'flex-start',
                    borderColor: themeColors.border,
                    color: themeColors.textPrimary
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
            <Button onClick={() => setPaymentMethodOpen(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>

        {/* QRPh Payment Dialog */}
        <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="sm" fullWidth>
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
                  style={{ width: '220px', height: '220px' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/220x220?text=QR+Code';
                  }}
                />
              </Box>
              
              <Typography variant="h6" sx={{ fontWeight: 700, color: themeColors.textPrimary, mb: 1 }}>
                {formatCurrency(selectedPayment?.amount)}
              </Typography>
              
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>How to pay:</Typography>
                <Typography variant="caption" component="div">
                  1. Open GCash, PayMaya, or any banking app<br/>
                  2. Tap "Scan to Pay" or "QR Payment"<br/>
                  3. Scan the QR code above<br/>
                  4. Enter amount: {formatCurrency(selectedPayment?.amount)}<br/>
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
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => document.getElementById('receipt-upload').click()}
                sx={{ mb: 2 }}
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
            <Button onClick={() => setQrDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleUploadReceipt}
              disabled={!referenceNumber || !uploadedReceipt || processing}
              sx={{ bgcolor: themeColors.success }}
            >
              {processing ? <CircularProgress size={20} /> : 'Submit Payment'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Cash Payment Confirmation Dialog */}
        <Dialog open={cashDialogOpen} onClose={() => setCashDialogOpen(false)} maxWidth="xs" fullWidth>
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
            <Button onClick={() => setCashDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Receipt Dialog */}
        <Dialog open={receiptDialogOpen} onClose={() => setReceiptDialogOpen(false)} maxWidth="sm" fullWidth>
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
            <Button onClick={() => setReceiptDialogOpen(false)}>Close</Button>
            <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrintReceipt}>
              Print Receipt
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Payments;