import React, { useState, useEffect } from 'react';
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
  Avatar
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
  AccountBalanceWallet as WalletIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  CreditCard as CreditCardIcon,
  AttachMoney as CashIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const Payments = () => {
  const themeColors = {
    primary: '#2224be',
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
  const [summary, setSummary] = useState({ totalPaid: 0, totalPending: 0, pendingCount: 0, overdueCount: 0, overdueAmount: 0 });
  const [currentDues, setCurrentDues] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [paymentMethodsOpen, setPaymentMethodsOpen] = useState(false);
  // Remove unused anchorEl
  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const { getCurrentUser, logout } = useAuth();
  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch current dues
      const duesResponse = await axios.get('/api/payments/current-dues', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (duesResponse.data.success) {
        setCurrentDues(duesResponse.data.data);
      }
      
      // Fetch all payments
      const paymentsResponse = await axios.get('/api/payments/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (paymentsResponse.data.success) {
        setPayments(paymentsResponse.data.data);
        setSummary(paymentsResponse.data.summary);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handlePayClick = (payment) => {
    setSelectedPayment(payment);
    setPaymentMethodsOpen(true);
  };

const handlePaymentMethodSelect = async (method) => {
  setSelectedMethod(method);
  setPaymentMethodsOpen(false);
  
  // For GCash and PayMaya, redirect to PayMongo
  if (method === 'gcash' || method === 'paymaya') {
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/payments/${selectedPayment._id}/pay`,
        { paymentMethod: method },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success && response.data.requiresRedirect) {
        // Redirect to payment redirect page
        navigate(`/payment-redirect?payment_id=${selectedPayment._id}&method=${method}`);
      } else if (response.data.success && !response.data.requiresRedirect) {
        setPaymentDialogOpen(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to initialize payment');
    } finally {
      setProcessing(false);
    }
  } else {
    // For cash payments
    setPaymentDialogOpen(true);
  }
};

  const confirmPayment = async () => {
    if (!selectedPayment) return;
    
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/payments/${selectedPayment._id}/pay`,
        { paymentMethod: selectedMethod },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        
        // Show receipt if available
        if (response.data.data.receipt) {
          setReceiptData(response.data.data.receipt);
          setReceiptDialogOpen(true);
        }
        
        // Refresh data
        fetchData();
        setPaymentDialogOpen(false);
        setSelectedPayment(null);
        setSelectedMethod(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    const printContent = document.getElementById('receipt-content');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .receipt { max-width: 400px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
            .header { text-align: center; margin-bottom: 20px; }
            .divider { border-top: 1px dashed #ddd; margin: 15px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .total { font-weight: bold; font-size: 1.2em; margin-top: 10px; }
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
            <button onclick="window.print()">Print</button>
            <button onclick="window.close()">Close</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleBack = () => navigate(-1);
  const handleLogout = () => { logout(); navigate('/login'); };
  const handleProfileMenuOpen = (e) => setProfileAnchorEl(e.currentTarget);
  const handleProfileMenuClose = () => setProfileAnchorEl(null);

  const getStatusChip = (status, dueDate) => {
    if (status === 'paid') {
      return <Chip icon={<CheckCircleIcon />} label="Paid" color="success" size="small" />;
    }
    if (dueDate && new Date() > new Date(dueDate)) {
      return <Chip icon={<WarningIcon />} label="Overdue" color="error" size="small" />;
    }
    return <Chip icon={<PendingIcon />} label="Pending" color="warning" size="small" />;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
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
        {/* Header */}
        <Paper sx={{ p: 3, mb: 4, borderRadius: 3, background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.primaryDark})`, color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PaymentIcon sx={{ fontSize: 48 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>Payments & Dues</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>Manage your association dues and payments</Typography>
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

        {/* Current Month Dues */}
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
                onClick={() => handlePayClick(currentDues)}
                sx={{ bgcolor: themeColors.success, '&:hover': { bgcolor: '#0da271' } }}
              >
                Pay Now
              </Button>
            </Box>
          </Paper>
        )}

        {/* Payment History */}
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
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Payment Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
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

        {/* Payment Methods Dialog */}
        <Dialog open={paymentMethodsOpen} onClose={() => setPaymentMethodsOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Select Payment Method</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<WalletIcon />}
                  onClick={() => handlePaymentMethodSelect('gcash')}
                  sx={{ py: 2, justifyContent: 'flex-start', borderColor: themeColors.primary }}
                >
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="subtitle1">GCash</Typography>
                    <Typography variant="caption" color="textSecondary">Pay via GCash wallet</Typography>
                  </Box>
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<CreditCardIcon />}
                  onClick={() => handlePaymentMethodSelect('paymaya')}
                  sx={{ py: 2, justifyContent: 'flex-start', borderColor: themeColors.primary }}
                >
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="subtitle1">PayMaya</Typography>
                    <Typography variant="caption" color="textSecondary">Pay via PayMaya wallet</Typography>
                  </Box>
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<CashIcon />}
                  onClick={() => handlePaymentMethodSelect('cash')}
                  sx={{ py: 2, justifyContent: 'flex-start', borderColor: themeColors.primary }}
                >
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="subtitle1">Cash</Typography>
                    <Typography variant="caption" color="textSecondary">Pay at admin office</Typography>
                  </Box>
                </Button>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentMethodsOpen(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>

        {/* Confirm Payment Dialog */}
        <Dialog open={paymentDialogOpen} onClose={() => !processing && setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Confirm Payment</DialogTitle>
          <DialogContent>
            {selectedPayment && (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  You are about to pay via <strong>{selectedMethod?.toUpperCase()}</strong>
                </Alert>
                <Paper sx={{ p: 2, bgcolor: themeColors.background }}>
                  <Typography variant="subtitle2">Invoice: {selectedPayment.invoiceNumber}</Typography>
                  <Typography variant="subtitle2">Description: {selectedPayment.description}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Amount: {formatCurrency(selectedPayment.amount)}
                  </Typography>
                </Paper>
                {selectedMethod === 'cash' && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Cash payments must be made at the admin office. Your payment will be marked as pending until confirmed by admin.
                  </Alert>
                )}
                {(selectedMethod === 'gcash' || selectedMethod === 'paymaya') && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    You will be redirected to {selectedMethod?.toUpperCase()} to complete your payment.
                  </Alert>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentDialogOpen(false)} disabled={processing}>Cancel</Button>
            <Button
              variant="contained"
              onClick={confirmPayment}
              disabled={processing}
              sx={{ bgcolor: themeColors.success }}
            >
              {processing ? <CircularProgress size={20} /> : 'Confirm Payment'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Receipt Dialog */}
        <Dialog open={receiptDialogOpen} onClose={() => setReceiptDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ bgcolor: themeColors.primary, color: 'white' }}>
            Payment Receipt
          </DialogTitle>
          <DialogContent>
            <div id="receipt-content">
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h6">WESTVILLE CASIMIRO HOMES</Typography>
                <Typography variant="caption" color="textSecondary">Village Information Management System</Typography>
                <Divider sx={{ my: 2 }} />
              </Box>
              
              {receiptData && (
                <Box>
                  <Grid container spacing={1}>
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
                      <Typography variant="body2" sx={{ textTransform: 'uppercase' }}>{receiptData.paymentMethod}</Typography>
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
          <DialogActions>
            <Button onClick={() => setReceiptDialogOpen(false)}>Close</Button>
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrintReceipt}>Print</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default Payments;